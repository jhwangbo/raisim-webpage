import {LoadProgress, confirmDownload, resolveSiteLinks, savedFilesButton} from './tool-ui.mjs';
import {exampleResources, fetchOk, parseManifest, savedFiles, writeModuleFile} from './viewer-examples.mjs';
import {limitPixelRatio, mouseFromTouch} from './touch-input.mjs';
import {ensureBrowserIsolation, loadWasmBundle, openProgramStore, requireBrowserGraphics} from './wasm-cache.mjs';

// Runs one of raisim2Lib's rayrai examples, named by ?example=, from its unchanged source. The
// example draws on this page's canvas through WebGPU and runs on the page's main thread, yielding
// once a frame.
const byId = id => document.getElementById(id);
const canvas = byId('canvas');
const status = byId('status');
const progress = new LoadProgress(byId('loading'));
limitPixelRatio();
mouseFromTouch(canvas);

function fail(error) {
  console.error(error);
  progress.done();
  status.hidden = false;
  status.classList.add('error');
  status.textContent = (typeof error?.message === 'string' && error.message) || String(error || 'The example stopped.');
  document.body.dataset.state = 'error';
}

async function boot() {
  await ensureBrowserIsolation();
  requireBrowserGraphics();
  const name = new URLSearchParams(location.search).get('example');
  const listed = await (await fetchOk(new URL('./rayrai-examples.tsv', import.meta.url), 'the example list')).text();
  const example = parseManifest(listed).find(entry => entry.name === name);
  if (!example) throw Error(name ? `There is no browser example named ${name}.` : 'Name an example with ?example=.');
  document.title = `RaiSim · ${example.title}`;
  canvas.setAttribute('aria-label', `${example.title}, drawn with Rayrai`);
  let refreshSaved = () => {};
  const resources = exampleResources(import.meta.url, request => confirmDownload({...request, title: example.title}),
                                     {onSaved: () => refreshSaved()});
  let programs = Promise.resolve(null);
  refreshSaved = savedFilesButton(byId('forget-assets'), savedFiles(resources, () => programs), byId('cache-status'));
  refreshSaved();
  // Asks for the example's assets now and downloads them while the simulator loads.
  resources.prefetch(name);
  progress.stage('Checking the simulator version');
  const bundle = await loadWasmBundle(import.meta.url, globalThis, 'raisim-rayrai-examples', event => progress.update(event));
  const files = await resources(name, progress);
  progress.stage(`Starting ${example.title}`);
  programs = openProgramStore(import.meta.url, 'raisim-rayrai-examples', bundle.version, globalThis,
                              {onSaved: () => refreshSaved()});
  programs.then(() => refreshSaved());
  const {createRayraiWebGpu} = await import(bundle.graphicsUrl.href);
  const {default: create} = await import(bundle.moduleUrl.href);
  const module = await create({
    canvas,
    thisProgram: `/examples/${name}`,
    mainScriptUrlOrBlob: bundle.moduleUrl.href,
    wasmBinary: bundle.wasmBinary,
    createRayraiWebGpu: async (element, memory) => {
      const gpu = await createRayraiWebGpu(element, memory);
      gpu.savedPrograms = await programs;
      gpu.session.onError = fail;
      return gpu;
    },
    print: text => console.log(text),
    printErr: text => console.error(text),
    onAbort: () => fail(new Error('The example could not continue. Reload the page to restart.')),
    locateFile: file => new URL(file, import.meta.url).href,
  });
  for (const {path, bytes} of files) writeModuleFile(module, module._rayrai_example_write_file, path, bytes);
  progress.done();
  byId('cache-status').textContent = bundle.storage === 'reused' ? 'Using the simulator saved in this browser.' :
      bundle.storage === 'saved' ? 'Simulator saved in this browser for your next visit.' :
      'Simulator downloaded. Browser storage is unavailable.';
  document.body.dataset.state = 'running';
  canvas.focus();
  let code;
  try {
    code = await module.callMain([name]);
  } catch (error) {
    if (!(error instanceof WebAssembly.Exception)) throw error;
    const [type, message] = module.getExceptionMessage(error);
    throw Error(`The example stopped: ${message || type}`);
  }
  if (code) throw Error(`The example stopped with code ${code}.`);
  document.body.dataset.state = 'closed';
}

resolveSiteLinks(import.meta.url);
boot().catch(fail);
