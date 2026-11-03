import {LoadProgress, confirmDownload, resolveSiteLinks, savedFilesButton} from './tool-ui.mjs';
import {ExampleRuntime, exampleResources, fetchOk, parseManifest, savedFiles, writeModuleFile} from './viewer-examples.mjs';
import {ViewerStreams} from './viewer-streams.mjs';
import {ensureBrowserIsolation, loadWasmBundle, openProgramStore, requireBrowserGraphics} from './wasm-cache.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('canvas');
const status = byId('status');
const progress = new LoadProgress(byId('loading'));

function fail(error) {
  console.error(error);
  progress.done();
  status.hidden = false;
  status.classList.add('error');
  status.textContent = (typeof error?.message === 'string' && error.message) || String(error || 'The viewer stopped.');
  document.body.dataset.state = 'error';
}

// RaisimServers on the local network, which serve.py hears; a browser cannot listen for their
// beacons itself.
class NetworkDiscovery {
  constructor(examples, base) {
    this.examples = examples;
    this.url = new URL('/__raisim/servers', base);
    this.lines = '';
    this.available = false;
    this.poll();
  }

  async poll() {
    try {
      const response = await fetch(this.url, {cache: 'no-store'});
      if (response.ok) {
        const servers = await response.json();
        this.available = true;
        this.lines = servers.map(({host, beacon}) => `${host}\t${beacon}`).join('\n');
      }
    } catch {}
    if (this.available) setTimeout(() => this.poll(), 2000);
  }

  network() { return this.available; }

  beacons() {
    return [this.examples.beacons(), this.lines].filter(Boolean).join('\n');
  }
}

function viewerArguments(search) {
  const parameters = new URLSearchParams(search);
  const args = [];
  if (['fast', 'balanced', 'high', 'ultra'].includes(parameters.get('quality'))) args.push('--render-quality', parameters.get('quality'));
  if (parameters.get('example')) args.push('--example', parameters.get('example'));
  else if (parameters.get('connect')) args.push('--connect', parameters.get('connect'));
  return args;
}

async function boot() {
  await ensureBrowserIsolation();
  requireBrowserGraphics();
  progress.stage('Checking the viewer version');
  const bundle = await loadWasmBundle(import.meta.url, globalThis, 'raisim-viewer', event => progress.update(event));
  progress.stage('Starting the viewer');
  const programs = openProgramStore(import.meta.url, 'raisim-viewer', bundle.version, globalThis,
                                    {onSaved: () => refreshSaved()});
  const {createRayraiWebGpu} = await import(bundle.graphicsUrl.href);
  const {default: create} = await import(bundle.moduleUrl.href);
  const manifestText = await (await fetchOk(new URL('./server-examples.tsv', import.meta.url), 'the example list')).text();
  let viewer, serverModule;
  let serverPrefetch = null;
  const titles = new Map(parseManifest(manifestText).map(({name, title}) => [name, title]));
  let refreshSaved = () => {};
  const resources = exampleResources(import.meta.url,
      request => confirmDownload({...request, title: titles.get(request.name) ?? request.name}),
      {onSaved: () => refreshSaved()});
  refreshSaved = savedFilesButton(byId('forget-assets'), savedFiles(resources, () => programs), byId('cache-status'));
  refreshSaved();
  const examples = new ExampleRuntime({
    manifestText,
    workerUrl: new URL('./server-example-worker.mjs', import.meta.url),
    module: () => serverModule ??= (async () => {
      const early = await serverPrefetch;
      serverPrefetch = null;
      const wasmModule = await early?.compiled.catch(() => null);
      if (wasmModule) return {moduleUrl: early.moduleUrl, wasmModule};
      const server = await loadWasmBundle(import.meta.url, globalThis, 'raisim-server-examples',
          event => progress.update(event));
      progress.stage('Compiling the server examples');
      const compiled = await WebAssembly.compile(server.wasmBinary);
      progress.done();
      return {moduleUrl: server.moduleUrl.href, wasmModule: compiled};
    })().catch(error => {
      serverModule = undefined;
      throw error;
    }),
    resources,
    viewerFiles: (path, bytes) => writeModuleFile(viewer, viewer._viewer_write_file, path, bytes),
    onProgress: progress,
  });
  // An example named in the address downloads and compiles while the viewer starts.
  const requested = new URLSearchParams(location.search).get('example');
  if (requested && examples.examples.some(example => example.name === requested)) {
    resources.prefetch(requested);
    serverPrefetch = loadWasmBundle(import.meta.url, globalThis, 'raisim-server-examples')
        .then(server => {
          const compiled = WebAssembly.compile(server.wasmBinary);
          compiled.catch(() => {});
          return {moduleUrl: server.moduleUrl.href, compiled};
        })
        .catch(() => null);
  }
  viewer = await create({
    canvas,
    thisProgram: '/viewer/rayrai_tcp_viewer',
    mainScriptUrlOrBlob: bundle.moduleUrl.href,
    wasmBinary: bundle.wasmBinary,
    createRayraiWebGpu: async (element, memory) => {
      const gpu = await createRayraiWebGpu(element, memory);
      gpu.savedPrograms = await programs;
      gpu.session.onError = fail;
      return gpu;
    },
    rayraiStreams: new ViewerStreams(examples),
    rayraiExamples: examples,
    rayraiDiscovery: new NetworkDiscovery(examples, import.meta.url),
    print: text => console.log(text),
    printErr: text => console.error(text),
    onAbort: () => fail(new Error('The viewer could not continue. Reload the page to restart.')),
    locateFile: file => new URL(file, import.meta.url).href,
  });
  progress.done();
  byId('cache-status').textContent = bundle.storage === 'reused' ? 'Using the simulator saved in this browser.' :
      bundle.storage === 'saved' ? 'Simulator saved in this browser for your next visit.' :
      'Simulator downloaded. Browser storage is unavailable.';
  globalThis.raisimViewer = Object.freeze({examples, discovery: viewer.rayraiDiscovery});
  document.body.dataset.state = 'running';
  canvas.focus();
  try {
    await viewer.callMain(viewerArguments(location.search));
  } catch (error) {
    if (!(error instanceof WebAssembly.Exception)) throw error;
    const [type, message] = viewer.getExceptionMessage(error);
    throw Error(`The viewer stopped: ${message || type}`);
  }
  document.body.dataset.state = 'closed';
}

resolveSiteLinks(import.meta.url);
boot().catch(fail);
