// Runs raisim2Lib's RaisimServer examples in the browser, one worker and one WebAssembly
// instance each, so that stopping an example ends it the way ending a process does. The viewer
// reaches an example's RaisimServer through a channel in that instance's shared memory
// (include/raisim/server/BrowserChannel.hpp), driven here with Atomics.

const F = {
  magic: 0, port: 2, requested: 3, accepted: 4, viewerStart: 5, serverClosed: 6, viewerClosed: 7,
  toServerWrite: 8, toServerRead: 9, toViewerWrite: 10, toViewerRead: 11, toServerOffset: 12,
  toServerSize: 13, toViewerOffset: 14, toViewerSize: 15, beaconOffset: 16, beaconLength: 18,
};
const MAGIC = 0x31435352;
const OUTPUT_LIMIT = 64 * 1024;

class Channel {
  constructor(buffer, address) {
    this.fields = new Int32Array(buffer, address, 32);
    if (Atomics.load(this.fields, F.magic) !== MAGIC) throw Error('The server example has no browser channel.');
    const view = (offset, size) => new Uint8Array(buffer, address + Atomics.load(this.fields, offset),
        Atomics.load(this.fields, size));
    this.toServer = view(F.toServerOffset, F.toServerSize);
    this.toViewer = view(F.toViewerOffset, F.toViewerSize);
    this.beacon = new Uint8Array(buffer, address + Atomics.load(this.fields, F.beaconOffset), 1024);
  }

  get port() { return Atomics.load(this.fields, F.port); }

  beaconText() {
    const length = Math.min(Atomics.load(this.fields, F.beaconLength), this.beacon.length);
    return new TextDecoder().decode(this.beacon.slice(0, length));
  }

  // A connection: the server accepts it, then each side writes its ring and reads the other's.
  connect() {
    const fields = this.fields, request = Atomics.add(fields, F.requested, 1) + 1;
    Atomics.notify(fields, F.requested);
    let open = false, pending = [];
    const closed = () => Atomics.load(fields, F.serverClosed) === request ||
        (open && Atomics.load(fields, F.accepted) !== request);
    const write = () => {
      const size = this.toServer.length;
      while (pending.length) {
        const bytes = pending[0];
        const used = (Atomics.load(fields, F.toServerWrite) - Atomics.load(fields, F.toServerRead)) >>> 0;
        const count = Math.min(bytes.length, size - used);
        if (!count) return;
        const start = Atomics.load(fields, F.toServerWrite) >>> 0;
        for (let done = 0; done < count;) {
          const at = (start + done) % size, piece = Math.min(count - done, size - at);
          this.toServer.set(bytes.subarray(done, done + piece), at);
          done += piece;
        }
        Atomics.store(fields, F.toServerWrite, (start + count) | 0);
        Atomics.notify(fields, F.toServerWrite);
        if (count === bytes.length) pending.shift();
        else pending[0] = bytes.subarray(count);
      }
    };
    return {
      pull: () => {
        if (!open) {
          if (Atomics.load(fields, F.accepted) !== request) return {closed: closed()};
          open = true;
          Atomics.store(fields, F.toViewerRead, Atomics.load(fields, F.viewerStart));
        }
        write();
        const size = this.toViewer.length, start = Atomics.load(fields, F.toViewerRead) >>> 0;
        const available = (Atomics.load(fields, F.toViewerWrite) - start) >>> 0;
        let bytes = null;
        if (available) {
          bytes = new Uint8Array(available);
          for (let done = 0; done < available;) {
            const at = (start + done) % size, piece = Math.min(available - done, size - at);
            bytes.set(this.toViewer.subarray(at, at + piece), done);
            done += piece;
          }
          Atomics.store(fields, F.toViewerRead, (start + available) | 0);
          Atomics.notify(fields, F.toViewerRead);
        }
        return {open: true, bytes, closed: !available && closed()};
      },
      send: bytes => {
        if (closed()) return false;
        pending.push(bytes);
        write();
        return true;
      },
      close: () => {
        Atomics.store(fields, F.viewerClosed, request);
        Atomics.notify(fields, F.toServerWrite);
      },
    };
  }
}

export async function fetchOk(url, what) {
  const response = await fetch(url, {cache: 'no-cache', credentials: 'same-origin'});
  if (!response.ok) throw Error(`Could not download ${what}. Try again.`);
  return response;
}

// An example download that the visitor turned down.
export class DownloadDeclined extends Error {}

export const ASSET_CACHE_NAME = 'raisim-assets-v1';
const hex = digest => Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');

// Example files the visitor chose to keep in this browser: Cache Storage entries named by the file's
// URL and SHA-256, checked against that hash whenever they are read. Null where the browser offers no
// Cache Storage or WebCrypto (an insecure origin, or storage the visitor blocked).
export async function openAssetStore(base, platform = globalThis) {
  let cache, subtle;
  try {
    subtle = platform.crypto?.subtle;
    if (subtle) cache = await platform.caches?.open(ASSET_CACHE_NAME);
  } catch {}
  if (!cache) return null;
  const root = new URL('./assets/', base);
  const key = (path, sha256) => {
    const url = new URL(path, root);
    url.searchParams.set('sha256', sha256);
    return url.href;
  };
  // A removal outlasts the saves already under way: each save that finishes after it takes itself back.
  let generation = 0;
  const saved = async () => (await cache.keys()).map(request => new URL(request.url))
      .filter(url => url.href.startsWith(root.href))
      .map(url => ({request: url.href, path: decodeURIComponent(url.pathname.slice(root.pathname.length)),
                    sha256: url.searchParams.get('sha256')}));
  return {
    async read(path, entry) {
      try {
        const response = await cache.match(key(path, entry.sha256));
        if (!response) return null;
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength === entry.bytes && hex(await subtle.digest('SHA-256', bytes)) === entry.sha256) return bytes;
      } catch {}
      try { await cache.delete(key(path, entry.sha256)); } catch {}
      return null;
    },
    // The removals so far; a load that agreed to keep its files passes it to write().
    generation: () => generation,
    async write(path, entry, bytes, since = generation) {
      if (since !== generation) return;
      await cache.put(key(path, entry.sha256), new Response(bytes));
      if (since !== generation) await cache.delete(key(path, entry.sha256));
    },
    // Drops the saved files that the manifest no longer lists with the same contents.
    async prune(files) {
      for (const {request, path, sha256} of await saved())
        if (files[path]?.sha256 !== sha256) await cache.delete(request);
    },
    // The bytes of the saved files the manifest lists.
    async bytes(files) {
      return (await saved()).reduce((sum, {path, sha256}) => sum + (files[path]?.sha256 === sha256 ? files[path].bytes : 0), 0);
    },
    async clear() {
      ++generation;
      for (const request of await cache.keys()) await cache.delete(request);
    },
  };
}

// The files each example reads, from the web asset packs (assets/manifest.json). Files kept in this
// browser are read from there; for the rest, confirm({name, bytes, files}) asks the visitor first.
// It resolves to false, or to {keep} where keep saves the downloaded files for the next visit. A yes
// holds for the rest of the page's life. prefetch(name) asks and loads early; the example later takes
// those files. `store` is openAssetStore()'s result (or null to keep nothing); onSaved() runs once the
// files a load keeps are saved.
export function exampleResources(base, confirm, {store = openAssetStore(base), onSaved = () => {}} = {}) {
  let manifest;
  const prefetched = new Map(), answers = new Map();
  const quiet = {update() {}, done() {}};
  // Loads of one pack that start together share its question; a no is forgotten once given.
  const agreed = request => {
    if (!answers.has(request.name)) {
      const forget = () => answers.delete(request.name);
      answers.set(request.name, Promise.resolve(confirm(request)).then(
          yes => (yes || forget(), yes), error => { forget(); throw error; }));
    }
    return answers.get(request.name);
  };
  const files = async () => {
    manifest ??= fetchOk(new URL('./assets/manifest.json', base), 'the example assets').then(r => r.json()).then(async value => {
      try { await (await store)?.prune(value.files || {}); } catch {}
      return value;
    });
    return (await manifest).files || {};
  };
  const load = async (name, onProgress) => {
    const sizes = await files();
    const listed = (await manifest).packs?.[`example/${name}`] || [];
    const kept = await store;
    if (kept && listed.length) onProgress.update({phase: 'saved-assets'});
    const saved = await Promise.all(listed.map(path => kept && sizes[path] ? kept.read(path, sizes[path]) : null));
    const missing = listed.filter((path, index) => !saved[index]);
    const total = missing.reduce((sum, path) => sum + (sizes[path]?.bytes || 0), 0);
    const answer = missing.length ? await agreed({name, bytes: total, files: missing.length}) : null;
    if (missing.length && !answer)
      throw new DownloadDeclined('The example needs its assets, and their download was declined.');
    const keep = !!(answer?.keep && kept);
    const keptSince = keep ? kept.generation() : 0;
    if (keep) globalThis.navigator?.storage?.persist?.().catch(() => {});
    const result = listed.map((path, index) => saved[index] && {path: `/examples/${path}`, bytes: saved[index]});
    const indices = listed.map((path, index) => index).filter(index => !saved[index]);
    const writes = [];
    let next = 0, loaded = 0;
    onProgress.update({phase: 'assets', loaded, total});
    const fetchNext = async () => {
      while (next < indices.length) {
        const index = indices[next++], path = listed[index];
        const bytes = await (await fetchOk(new URL(`./assets/${path}`, base), path)).arrayBuffer();
        result[index] = {path: `/examples/${path}`, bytes};
        if (keep && sizes[path]) writes.push(kept.write(path, sizes[path], bytes, keptSince));
        loaded += bytes.byteLength;
        onProgress.update({phase: 'assets', loaded, total});
      }
    };
    await Promise.all(Array.from({length: Math.min(6, indices.length)}, fetchNext));
    // A file that could not be saved downloads again next time; the example runs either way.
    if (writes.length) Promise.all(writes).catch(error => console.warn(`Some example files were not saved: ${error.message}`))
        .then(() => onSaved());
    onProgress.done();
    return result;
  };
  const resources = (name, onProgress) => {
    const early = prefetched.get(name);
    prefetched.delete(name);
    return early ? early.catch(error => {
      if (error instanceof DownloadDeclined) throw error;
      return load(name, onProgress);
    }) : load(name, onProgress);
  };
  resources.prefetch = name => {
    if (prefetched.has(name)) return;
    const early = load(name, quiet);
    early.catch(() => {});
    prefetched.set(name, early);
  };
  // The bytes of example files kept in this browser, and their removal.
  resources.savedBytes = async () => (await (await store)?.bytes(await files())) || 0;
  resources.forget = async () => { await (await store)?.clear(); };
  return resources;
}

// Everything a page keeps in this browser for the footer's removal button: the example files of
// `resources` and the compiled programs of `programs()`, a program store promise.
export function savedFiles(resources, programs) {
  return {
    savedBytes: async () => await resources.savedBytes() + ((await programs())?.bytes() ?? 0),
    async forget() {
      await resources.forget();
      await (await programs())?.clear();
    },
  };
}

// Copies a file into a module's file system with writer(pathPointer, dataPointer, length). The heap
// view comes from the live memory: another thread may have grown it since HEAPU8 was made.
export function writeModuleFile(module, writer, path, bytes) {
  const data = new Uint8Array(bytes), name = new TextEncoder().encode(`${path}\0`);
  const pointer = module._malloc(name.length + data.length);
  if (!pointer) throw Error(`Not enough memory for ${path}`);
  try {
    const heap = new Uint8Array(module.wasmMemory.buffer);
    heap.set(name, pointer);
    heap.set(data, pointer + name.length);
    if (!writer(pointer, pointer + name.length, data.length)) throw Error(`Could not store ${path}`);
  } finally {
    module._free(pointer);
  }
}

export function parseManifest(text) {
  return text.split('\n').filter(line => line && !line.startsWith('#'))
      .map(line => line.split('\t')).filter(fields => fields.length >= 3)
      .map(([name, category, title]) => ({name, category, title}));
}

export class ExampleRuntime {
  // module: loads the server examples' code ({moduleUrl, wasmModule}); resources(name): the
  // example's files as [{path, url}] (path under /examples/rsc); viewerFiles(path, bytes) stores a
  // copy for the viewer.
  constructor({manifestText, workerUrl, module, resources, viewerFiles, onProgress = () => {}}) {
    this.manifestText = manifestText;
    this.examples = parseManifest(manifestText);
    this.workerUrl = workerUrl;
    this.module = module;
    this.resources = resources;
    this.viewerFiles = viewerFiles;
    this.onProgress = onProgress;
    this.next = 1;
    this.processes = new Map();
  }

  manifest() { return this.manifestText; }

  start(name) {
    const example = this.examples.find(entry => entry.name === name);
    if (!example) return 0;
    const id = this.next++;
    const process = {example, state: 'starting', exitCode: -1, output: '', channel: null, worker: null, port: 0};
    this.processes.set(id, process);
    this.launch(process).catch(error => this.exit(process, -1, error));
    return id;
  }

  async launch(process) {
    const {moduleUrl, wasmModule} = await this.module();
    const files = await this.resources(process.example.name, this.onProgress);
    if (process.state === 'exited') return;
    for (const file of files) this.viewerFiles(file.path, file.bytes);
    const worker = new Worker(this.workerUrl, {type: 'module', name: `raisim example ${process.example.name}`});
    process.worker = worker;
    worker.onmessage = ({data}) => {
      if (data.type === 'output') this.print(process, data.text);
      else if (data.type === 'channel') {
        process.channel = new Channel(data.buffer, data.address);
        process.state = 'running';
      } else if (data.type === 'exit') this.exit(process, data.code, data.reason && Error(data.reason));
    };
    worker.onerror = event => this.exit(process, -1, Error(event.message || 'The example stopped.'));
    worker.postMessage({name: process.example.name, moduleUrl, wasmModule,
                        files: files.map(({path, bytes}) => ({path, bytes}))});
  }

  print(process, text) {
    process.output = (process.output + text + '\n').slice(-OUTPUT_LIMIT);
  }

  exit(process, code, error) {
    if (process.state === 'exited') return;
    if (error) this.print(process, error.message);
    process.state = 'exited';
    process.exitCode = code;
    process.worker?.terminate();
    process.worker = null;
  }

  // The port a running example is reached at. Every instance listens alone in its own memory, so
  // the page gives a later example asking for a port that another one holds the next free port,
  // as a native server binds the next port when its own is in use.
  port(process) {
    if (process.port || process.state !== 'running' || !process.channel?.port) return process.port;
    const taken = new Set([...this.processes.values()].filter(other => other.state === 'running')
        .map(other => other.port));
    let port = process.channel.port;
    while (taken.has(port)) ++port;
    process.port = port;
    return port;
  }

  // "state port exitCode", where state is starting, running or exited.
  status(id) {
    const process = this.processes.get(id);
    if (!process) return 'exited 0 -1';
    const port = this.port(process);
    const state = process.state === 'running' && !port ? 'starting' : process.state;
    return `${state} ${port} ${process.exitCode}`;
  }

  output(id) { return this.processes.get(id)?.output || ''; }

  stop(id) {
    const process = this.processes.get(id);
    if (!process) return;
    this.exit(process, -1);
    this.processes.delete(id);
  }

  connect(port) {
    for (const process of this.processes.values())
      if (process.state === 'running' && this.port(process) === port) return process.channel.connect();
    throw Error(`No server example in this page listens on port ${port}.`);
  }

  // Discovery beacons of the running examples, as "source<TAB>payload" lines.
  beacons() {
    const lines = [];
    for (const process of this.processes.values()) {
      const port = this.port(process);
      if (process.state !== 'running' || !port) continue;
      const beacon = process.channel.beaconText();
      if (beacon) {
        lines.push(`browser\t${beacon.replace(/^(\S+) \d+/, `$1 ${port}`)
            .replace(/ exe=\S*/, ` exe=${process.example.name}`)}`);
      }
    }
    return lines.join('\n');
  }
}
