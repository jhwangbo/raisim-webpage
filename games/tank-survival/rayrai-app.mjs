// Runs a program built with rayrai_add_web_app() on a web page. The program's main() draws on a
// canvas through WebGPU (graphics.mjs) and owns the page's main thread, yielding once a frame.
import {limitPixelRatio, mouseFromTouch} from './touch-input.mjs';

const ISOLATION_RELOAD = 'rayrai-isolation-reload';

// Rayrai's threads need SharedArrayBuffer, which a page has only under cross-origin isolation. A host
// that cannot send the headers gets them from isolation-worker.js: the page installs it and reloads once.
export async function ensureCrossOriginIsolation(workerUrl = new URL('./isolation-worker.js', import.meta.url)) {
  let storage;
  try { storage = sessionStorage; } catch {}
  if (globalThis.crossOriginIsolated === true) {
    try { storage?.removeItem(ISOLATION_RELOAD); } catch {}
    return;
  }
  const container = navigator.serviceWorker;
  let reloaded = false;
  try { reloaded = storage?.getItem(ISOLATION_RELOAD) === '1'; } catch {}
  if (!container || !storage || reloaded) return;
  await container.register(workerUrl, {scope: './'});
  await container.ready;
  storage.setItem(ISOLATION_RELOAD, '1');
  location.reload();
  await new Promise(() => {});
}

export function requireRayraiSupport() {
  if (globalThis.crossOriginIsolated !== true || typeof SharedArrayBuffer !== 'function')
    throw Error('Serve this page with Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.');
  if (globalThis.isSecureContext !== true || !navigator.gpu ||
      typeof WebAssembly.Suspending !== 'function' || typeof WebAssembly.promising !== 'function')
    throw Error('Use a recent Chrome or Edge browser with WebGPU, on HTTPS or localhost.');
}

// Chrome answers null while its GPU process is still starting, as for a page opened with the browser.
async function waitForGpuAdapter(seconds = 3) {
  for (const deadline = performance.now() + seconds * 1000; performance.now() < deadline;) {
    if (await navigator.gpu.requestAdapter({powerPreference: 'high-performance'})) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Fetches url's bytes, calling onBytes with each chunk's size as it arrives.
async function download(url, onBytes) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Cannot load ${new URL(url).pathname}: HTTP ${response.status}`);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onBytes(bytes.byteLength);
    return bytes;
  }
  const chunks = [], reader = response.body.getReader();
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    onBytes(value.byteLength);
  }
  const bytes = new Uint8Array(size);
  for (let offset = 0, i = 0; i < chunks.length; offset += chunks[i++].byteLength) bytes.set(chunks[i], offset);
  return bytes;
}

// The files an asset manifest lists (rayrai_add_web_app()'s ASSETS): their total size, the size of the
// program's WebAssembly, and a promise that downloads them six at a time, calling onBytes as they
// arrive and keep(path, bytes) for each.
async function fetchAssets(manifestUrl, onBytes, keep) {
  manifestUrl = new URL(manifestUrl, location.href);
  const response = await fetch(manifestUrl, {cache: 'no-cache'});
  if (!response.ok) throw Error(`Cannot load ${manifestUrl.pathname}: HTTP ${response.status}`);
  const {folder, bytes, program, files} = await response.json();
  const base = new URL(folder.replace(/\/*$/, '/'), manifestUrl);
  let cache;
  try { if (globalThis.crypto?.subtle) cache = await globalThis.caches?.open('rayrai-assets-v1'); } catch {}
  const digest = async data => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)),
      byte => byte.toString(16).padStart(2, '0')).join('');
  let next = 0;
  const fetchNext = async () => {
    while (next < files.length) {
      const [path, size, hash] = files[next++];
      const url = new URL(path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'), base);
      const versioned = /^[a-f0-9]{64}$/.test(hash);
      if (versioned) url.searchParams.set('sha256', hash);
      let data;
      if (cache && versioned) {
        try {
          const saved = await cache.match(url.href);
          if (saved) {
            const bytes = new Uint8Array(await saved.arrayBuffer());
            if (bytes.byteLength === size && await digest(bytes) === hash) data = bytes;
            else await cache.delete(url.href);
          }
        } catch {}
      }
      if (data) onBytes(data.byteLength);
      else {
        data = await download(url.href, onBytes);
        if (versioned && (data.byteLength !== size ||
            (globalThis.crypto?.subtle && await digest(data) !== hash)))
          throw Error(`Asset integrity check failed: ${path}`);
        if (cache && versioned) {
          try {
            await cache.put(url.href, new Response(data));
            for (const request of await cache.keys()) {
              const old = new URL(request.url);
              if (old.origin === url.origin && old.pathname === url.pathname && old.href !== url.href)
                await cache.delete(request);
            }
          }
          catch (error) { console.warn(`Could not save ${path}: ${error.message}`); }
        }
      }
      keep(path, data);
    }
  };
  const done = Promise.all(Array.from({length: Math.min(6, files.length)}, fetchNext));
  done.catch(() => {});
  return {bytes, program, done};
}

// The size of url's body when the server states it uncompressed; 0 when it is unknown.
async function contentLength(url) {
  try {
    const reply = await fetch(url, {method: 'HEAD'});
    if (!reply.ok || reply.headers.get('Content-Encoding')) return 0;
    return Number(reply.headers.get('Content-Length')) || 0;
  } catch {
    return 0;
  }
}

// Shader programs the program's WebGPU backend compiled, kept between visits in Cache Storage so that
// the next visit does not compile them again: a get(key)/set(key, bytes) store holding one build
// (`version`, the hash of the program's WebAssembly, whose shader compiler made them) per program.
// Without Cache Storage it keeps them for this page only.
async function openProgramStore(moduleUrl, version) {
  const programs = new Map();
  const program = new URL(`./.rayrai-programs/${moduleUrl.pathname.split('/').pop()}/`, moduleUrl);
  const current = new URL(`${version}/`, program);
  let cache;
  try { cache = await caches.open('rayrai-programs'); } catch {}
  if (cache) {
    try {
      for (const request of await cache.keys()) {
        if (!request.url.startsWith(program.href)) continue;
        if (!request.url.startsWith(current.href)) { await cache.delete(request); continue; }
        const response = await cache.match(request);
        if (response) programs.set(request.url.slice(current.href.length), new Uint8Array(await response.arrayBuffer()));
      }
    } catch {}
  }
  return {
    get: key => programs.get(key),
    set(key, bytes) {
      programs.set(key, bytes);
      cache?.put(new URL(key, current).href, new Response(bytes)).catch(() => {});
    },
  };
}

// Instantiates the program at moduleUrl on canvas, loads the files of the asset manifest at assets (if
// any) into its file system, and runs its main() with args. The program's WebAssembly and its assets
// download together while the scripts load. Resolves when main() returns 0; rejects when it returns
// another code (with the last line it printed to stderr), throws or aborts. onError receives a GPU
// failure that happens while the program runs; onProgress the bytes downloaded, the bytes in all (0
// while unknown) and whether every download has finished; and onStart is called just before main()
// starts. Assets that arrive before the program is instantiated wait for it; later ones are written
// into its file system as they arrive.
export async function runRayraiApp({moduleUrl, canvas, args = [], assets = null, print = console.log,
                                    printErr = console.error, onError = error => console.error(error),
                                    onProgress = null, onStart = null}) {
  requireRayraiSupport();
  moduleUrl = new URL(moduleUrl, location.href);
  const wasmUrl = new URL(moduleUrl.pathname.split('/').pop().replace(/\.mjs$/, '.wasm'), moduleUrl);
  let loaded = 0, total = 0, finished = false, module = null;
  const report = () => onProgress?.(loaded, total, finished);
  const onBytes = size => { loaded += size; report(); };
  const waiting = [];
  // Copies a file into the program's memory at once and writes it from there (FS.writeFile copies
  // byte by byte, seconds for a game's assets). The heap view comes from the live memory: another
  // thread may have grown it.
  const keep = (path, bytes) => {
    if (!module) { waiting.push([path, bytes]); return; }
    module.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')) || '/');
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), name = new TextEncoder().encode(`${path}\0`);
    const pointer = module._malloc(name.length + data.length);
    if (!pointer) throw Error(`Not enough memory for ${path}`);
    try {
      const heap = new Uint8Array(module.wasmMemory.buffer);
      heap.set(name, pointer);
      heap.set(data, pointer + name.length);
      if (!module._rayrai_web_write_file(pointer, pointer + name.length, data.length)) throw Error(`Cannot write ${path}`);
    } finally {
      module._free(pointer);
    }
  };
  const assetList = assets ? await fetchAssets(assets, onBytes, keep) : null;
  const wasmSize = assetList?.program || await contentLength(wasmUrl.href);
  total = wasmSize ? wasmSize + (assetList?.bytes ?? 0) : 0;
  report();
  const wasmBinary = download(wasmUrl.href, onBytes);
  const programs = wasmBinary.then(async bytes => {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return openProgramStore(moduleUrl, Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join(''));
  });
  programs.catch(() => {});
  const downloads = Promise.all([wasmBinary, assetList?.done]).then(() => { finished = true; report(); });
  downloads.catch(() => {});
  await waitForGpuAdapter();
  let lastError = '';
  const [{createRayraiWebGpu}, {default: create}] = await Promise.all([
    import(new URL('./graphics.mjs', import.meta.url).href), import(moduleUrl.href)]);
  let aborted;
  const instance = await create({
    canvas,
    wasmBinary: await wasmBinary,
    thisProgram: '/' + moduleUrl.pathname.split('/').pop().replace(/\.mjs$/, ''),
    mainScriptUrlOrBlob: moduleUrl.href,
    locateFile: file => new URL(file, moduleUrl).href,
    createRayraiWebGpu: async (element, memory) => {
      const gpu = await createRayraiWebGpu(element, memory);
      gpu.savedPrograms = await programs;
      gpu.session.onError = onError;
      return gpu;
    },
    print,
    printErr: text => {
      if (String(text).trim()) lastError = String(text).trim();
      printErr(text);
    },
    onAbort: reason => { aborted = reason; },
  });
  module = instance;
  for (const [path, bytes] of waiting.splice(0)) keep(path, bytes);
  await downloads;
  onStart?.();
  let code;
  try {
    code = await module.callMain(args.map(String));
  } catch (error) {
    if (error instanceof WebAssembly.Exception) {
      const [type, message] = module.getExceptionMessage(error);
      throw Error(`The program threw ${message || type}`);
    }
    if (aborted !== undefined) throw Error(`The program aborted: ${aborted}`);
    throw error;
  }
  if (code) throw Error(`The program exited with code ${code}${lastError ? ': ' + lastError : '.'}`);
}

// Runs the program at moduleUrl on the page's #canvas, after downloading the files of the asset
// manifest at assets (if any), reporting progress in #status and in the body's data-state attribute:
// loading, running, closed or error.
export async function startRayraiPage(moduleUrl, {canvas = document.getElementById('canvas'),
                                                  status = document.getElementById('status'), assets = null} = {}) {
  const fail = error => {
    console.error(error);
    document.body.dataset.state = 'error';
    document.body.dataset.error = error?.message || String(error);
    if (status) status.textContent = document.body.dataset.error;
  };
  try {
    await ensureCrossOriginIsolation();
    limitPixelRatio();
    mouseFromTouch(canvas);
    const args = new URLSearchParams(location.search).getAll('arg');
    const megabytes = value => (value / 1048576).toFixed(value < 10485760 ? 1 : 0);
    const bar = document.getElementById('progress');
    const onProgress = (loaded, bytes, finished) => {
      if (document.body.dataset.state === 'error') return;
      const known = bytes > 0 && loaded <= bytes;
      if (status) status.textContent = finished ? 'Starting…' :
          known ? `Downloading ${megabytes(loaded)} of ${megabytes(bytes)} MB…` : `Downloading ${megabytes(loaded)} MB…`;
      if (!bar) return;
      if (finished || known) bar.value = finished ? 1 : loaded / bytes;
      else bar.removeAttribute('value');
    };
    const onStart = () => {
      if (document.body.dataset.state === 'error') return;
      document.body.dataset.state = 'running';
      if (status) status.textContent = '';
      canvas.focus();
    };
    await runRayraiApp({moduleUrl, canvas, args, assets, onError: fail, onProgress, onStart});
    if (document.body.dataset.state !== 'error') document.body.dataset.state = 'closed';
  } catch (error) {
    fail(error);
  }
}
