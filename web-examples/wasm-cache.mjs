export const WASM_CACHE_NAME = 'raisim-wasm-v1';
export const PROGRAM_CACHE_NAME = 'raisim-programs-v1';

export function requireBrowserIsolation(platform = globalThis) {
  if (platform.crossOriginIsolated !== true || typeof platform.SharedArrayBuffer !== 'function')
    throw new Error('Rayrai requires cross-origin isolation. Serve the page with Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.');
}

const ISOLATION_RELOAD = 'raisim-isolation-reload';

// Without cross-origin isolation, installs isolation-worker.js and reloads the page once under it.
// Resolves when the page is isolated, or when that reload did not help, for
// requireBrowserIsolation() to report.
export async function ensureBrowserIsolation(platform = globalThis, workerUrl = new URL('./isolation-worker.js', import.meta.url)) {
  let storage;
  try { storage = platform.sessionStorage; } catch {}
  if (platform.crossOriginIsolated === true) {
    try { storage?.removeItem(ISOLATION_RELOAD); } catch {}
    return;
  }
  const container = platform.navigator?.serviceWorker;
  let reloaded = false;
  try { reloaded = storage?.getItem(ISOLATION_RELOAD) === '1'; } catch {}
  if (!container || !storage || reloaded) return;
  await container.register(workerUrl, {scope: './'});
  await container.ready;
  storage.setItem(ISOLATION_RELOAD, '1');
  platform.location.reload();
  await new Promise(() => {});
}

export function requireBrowserGraphics(platform = globalThis) {
  requireBrowserIsolation(platform);
  if (platform.isSecureContext !== true || !platform.navigator?.gpu ||
      typeof platform.WebAssembly?.Suspending !== 'function' || typeof platform.WebAssembly?.promising !== 'function')
    throw new Error('Use a recent Chrome or Edge browser with WebGPU enabled, on HTTPS or localhost.');
}

function fileEntry(manifest, name, maximum) {
  const entry = manifest?.files?.[name];
  if (manifest?.schema !== 1 || manifest?.access !== 'unrestricted' ||
      !Number.isSafeInteger(entry?.bytes) || entry.bytes < 8 || entry.bytes > maximum ||
      !/^[a-f0-9]{64}$/.test(entry?.sha256))
    throw new Error('Invalid simulator version manifest.');
  return entry;
}

async function fetchValue(platform, url, options, read, milliseconds = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await read(await platform.fetch(url, { ...options, signal: controller.signal }));
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Simulator download timed out. Try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

function integrity(hash) {
  return 'sha256-' + btoa(String.fromCharCode(...hash.match(/../g).map(byte => parseInt(byte, 16))));
}

async function readBytes(response, entry, onProgress) {
  const reader = onProgress && response.body?.getReader?.();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const bytes = new Uint8Array(entry.bytes);
  let loaded = 0;
  onProgress({phase: 'download', loaded, total: entry.bytes});
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    if (loaded + value.byteLength > bytes.byteLength) {
      await reader.cancel();
      throw new Error('Simulator download is incomplete or has the wrong version. Try again.');
    }
    bytes.set(value, loaded);
    loaded += value.byteLength;
    onProgress({phase: 'download', loaded, total: entry.bytes});
  }
  return loaded === bytes.byteLength ? bytes : bytes.subarray(0, loaded);
}

async function verifiedBytes(response, entry, subtle, onProgress) {
  if (!response?.ok || response.status !== 200) throw new Error('Could not download the simulator. Try again.');
  const bytes = await readBytes(response, entry, onProgress);
  if (bytes.byteLength !== entry.bytes ||
      [0, 97, 115, 109, 1, 0, 0, 0].some((value, i) => bytes[i] !== value))
    throw new Error('Simulator download is incomplete or has the wrong version. Try again.');
  if (subtle) {
    const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
    const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
    if (hex !== entry.sha256) throw new Error('Simulator integrity check failed. Try again.');
  }
  return bytes;
}

export async function loadWasmBundle(base = import.meta.url, platform = globalThis, moduleName = 'raisim-viewer',
    onProgress = undefined) {
  if (!['raisim-viewer', 'raisim-server-examples', 'raisim-rayrai-examples', 'raisim-editor'].includes(moduleName))
    throw new Error('Unknown simulator module.');
  const WASM_NAME = `${moduleName}.wasm`, MODULE_NAME = `${moduleName}.mjs`;
  const manifestUrl = new URL('./bundle-manifest.json', base);
  const manifest = await fetchValue(platform, manifestUrl,
    { cache: 'no-cache', credentials: 'same-origin', redirect: 'error' }, async response => {
      if (!response.ok) throw new Error('Could not check the simulator version. Try again.');
      return response.json();
    });
  const wasm = fileEntry(manifest, WASM_NAME, 64 * 1024 * 1024);
  const module = fileEntry(manifest, MODULE_NAME, 2 * 1024 * 1024);
  const graphics = fileEntry(manifest, 'graphics.mjs', 2 * 1024 * 1024);
  const wasmUrl = new URL(`./${WASM_NAME}`, base);
  const moduleUrl = new URL(`./${MODULE_NAME}`, base);
  const graphicsUrl = new URL('./graphics.mjs', base);
  wasmUrl.searchParams.set('sha256', wasm.sha256);
  moduleUrl.searchParams.set('sha256', module.sha256);
  graphicsUrl.searchParams.set('sha256', graphics.sha256);
  let cache, subtle;
  try { subtle = platform.crypto?.subtle; } catch {}
  if (subtle) {
    try { cache = await platform.caches?.open(WASM_CACHE_NAME); } catch {}
  }
  if (cache) {
    try {
      const saved = await cache.match(wasmUrl.href);
      if (saved) {
        onProgress?.({phase: 'cache', loaded: 0, total: wasm.bytes});
        const wasmBinary = await verifiedBytes(saved, wasm, subtle);
        onProgress?.({phase: 'cache', loaded: wasm.bytes, total: wasm.bytes});
        return { moduleUrl, graphicsUrl, wasmBinary, storage: 'reused', version: wasm.sha256 };
      }
    } catch {
      try { await cache.delete(wasmUrl.href); } catch {}
    }
  }
  const wasmBinary = await fetchValue(platform, wasmUrl,
    { cache: 'no-cache', credentials: 'same-origin', redirect: 'error', integrity: integrity(wasm.sha256) },
    response => verifiedBytes(response, wasm, subtle, onProgress), 120000);
  let storage = 'unavailable';
  if (cache) {
    try {
      await cache.put(wasmUrl.href, new Response(wasmBinary, { headers: { 'Content-Type': 'application/wasm' } }));
      storage = 'saved';
    } catch {}
    if (storage === 'saved') {
      try {
        for (const request of await cache.keys()) {
          const old = new URL(request.url);
          if (old.origin === wasmUrl.origin && old.pathname === wasmUrl.pathname && old.href !== wasmUrl.href)
            await cache.delete(request);
        }
      } catch {}
    }
  }
  return { moduleUrl, graphicsUrl, wasmBinary, storage, version: wasm.sha256 };
}

// Shader programs a simulator module compiled, kept between visits so a page does not compile them
// again: a Map-like get(key)/set(key, bytes) over Cache Storage, holding one build (`version`, its
// WASM hash) of `moduleName`. Opening it reads that build's programs and drops the module's others.
// Without Cache Storage it keeps programs for this page only. onSaved() runs, at most once a second,
// after programs were saved. After clear() the page keeps no more programs: the visitor removed them,
// so the ones it compiles later are not saved again. A program another tab is saving may stay.
export async function openProgramStore(base, moduleName, version, platform = globalThis, {onSaved = () => {}} = {}) {
  const programs = new Map();
  const everything = new URL('./programs/', base), current = new URL(`${moduleName}/${version}/`, everything);
  const module = new URL(`${moduleName}/`, everything);
  let cache, generation = 0, announce = null, removed = false;
  const saved = () => {
    announce ??= setTimeout(() => { announce = null; onSaved(); }, 1000);
  };
  try { cache = await platform.caches?.open(PROGRAM_CACHE_NAME); } catch {}
  if (cache) {
    try {
      for (const request of await cache.keys()) {
        if (!request.url.startsWith(module.href)) continue;
        if (!request.url.startsWith(current.href)) { await cache.delete(request); continue; }
        const response = await cache.match(request);
        if (response) programs.set(request.url.slice(current.href.length), new Uint8Array(await response.arrayBuffer()));
      }
    } catch {}
  }
  return {
    get: key => programs.get(key),
    set(key, bytes) {
      if (removed) return;
      programs.set(key, bytes);
      if (!cache) return;
      const since = generation, url = new URL(key, current).href;
      cache.put(url, new Response(bytes))
          .then(() => (since === generation ? saved() : cache.delete(url)))
          .catch(() => {});
    },
    // The bytes of this module's programs, and the removal of every module's.
    bytes: () => [...programs.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0),
    async clear() {
      ++generation;
      removed = true;
      clearTimeout(announce);
      announce = null;
      programs.clear();
      if (!cache) return;
      for (const request of await cache.keys())
        if (request.url.startsWith(everything.href)) await cache.delete(request);
    },
  };
}
