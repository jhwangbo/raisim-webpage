const USER_CACHE = 'raisim-user-robots-v1';
const USER_PREFIX = 'robots/';
const MAX_DROP_BYTES = 256 * 1024 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;

export async function loadRobotCatalog(base, platform = globalThis) {
  const response = await platform.fetch(new URL('./assets/manifest.json', base), {cache: 'no-cache'});
  if (!response.ok) throw new Error('The robot library is unavailable.');
  const manifest = await response.json();
  if (manifest?.schema !== 1 || !Array.isArray(manifest.robots) || typeof manifest.packs !== 'object' ||
      typeof manifest.files !== 'object')
    throw new Error('The robot library manifest is invalid.');
  return manifest;
}

// Writes through the live memory: another thread may have grown it since HEAPU8 was made.
export function writeEditorFile(sim, path, bytes) {
  const name = new TextEncoder().encode(path);
  const address = sim._malloc(Math.max(1, name.length + bytes.length));
  if (!address) throw new Error('The browser could not allocate memory for a robot file.');
  try {
    const heap = new Uint8Array(sim.wasmMemory.buffer);
    heap.set(name, address);
    heap.set(bytes, address + name.length);
    if (!sim._editor_write_file(address, name.length, address + name.length, bytes.length))
      throw new Error(sim.UTF8ToString(sim._editor_error()));
  } finally {
    sim._free(address);
  }
}

export class RobotFiles {
  constructor(base, manifest, platform = globalThis) {
    this.base = base;
    this.manifest = manifest;
    this.platform = platform;
    this.written = new Set();
  }

  bySource(source) { return this.manifest.robots.find(robot => robot.source === source); }

  async ensureLibrary(sim, robot, onProgress) {
    const files = this.manifest.packs[robot.pack] || [];
    const missing = files.filter(file => !this.written.has(file));
    const total = missing.reduce((sum, file) => sum + (this.manifest.files[file]?.bytes || 0), 0);
    let loaded = 0, next = 0;
    const fetchNext = async () => {
      while (next < missing.length) {
        const file = missing[next++], entry = this.manifest.files[file];
        const response = await this.platform.fetch(new URL(`./assets/${file}`, this.base));
        if (!response.ok) throw new Error(`Could not download ${file}.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length !== entry.bytes) throw new Error(`${file} is incomplete. Try again.`);
        writeEditorFile(sim, file, bytes);
        this.written.add(file);
        loaded += bytes.length;
        onProgress?.({phase: 'assets', loaded, total});
      }
    };
    await Promise.all(Array.from({length: Math.min(6, missing.length)}, fetchNext));
  }

  async ensureDropped(sim, source) {
    const folder = source.split('/').slice(0, 2).join('/');
    if (this.written.has(folder)) return;
    const cache = await this.platform.caches.open(USER_CACHE);
    const index = await cache.match(new URL(`./${folder}/.files`, this.base).href);
    if (!index) throw new Error(`The files of ${folder} are no longer in this browser. Drop the robot again.`);
    for (const file of await index.json()) {
      const response = await cache.match(new URL(`./${folder}/${file}`, this.base).href);
      if (!response) throw new Error(`${folder}/${file} is missing. Drop the robot again.`);
      writeEditorFile(sim, `${folder}/${file}`, new Uint8Array(await response.arrayBuffer()));
    }
    this.written.add(folder);
  }

  async ensure(sim, source, onProgress) {
    if (source.startsWith(USER_PREFIX)) return this.ensureDropped(sim, source);
    const robot = this.bySource(source);
    if (!robot) throw new Error(`${source} is not in the robot library.`);
    return this.ensureLibrary(sim, robot, onProgress);
  }

  async addDropped(sim, folder, files) {
    const total = files.reduce((sum, file) => sum + file.blob.size, 0);
    if (total > MAX_DROP_BYTES) throw new Error('Dropped robot files exceed 256 MB.');
    let cache = null;
    try {
      cache = await this.platform.caches.open(USER_CACHE);
    } catch {}
    for (const file of files) {
      if (file.blob.size > MAX_FILE_BYTES) throw new Error(`${file.path} exceeds 64 MB.`);
      const bytes = new Uint8Array(await file.blob.arrayBuffer());
      writeEditorFile(sim, `${USER_PREFIX}${folder}/${file.path}`, bytes);
      await cache?.put(new URL(`./${USER_PREFIX}${folder}/${file.path}`, this.base).href, new Response(bytes));
    }
    await cache?.put(new URL(`./${USER_PREFIX}${folder}/.files`, this.base).href,
                     Response.json(files.map(file => file.path)));
    this.written.add(`${USER_PREFIX}${folder}`);
    return Boolean(cache);
  }
}

function safePart(name) {
  const part = name.normalize('NFC').replace(/[^\p{L}\p{N}._ -]/gu, '_').trim();
  return part && part !== '.' && part !== '..' ? part : '_';
}

async function entryFiles(entry, prefix, output) {
  if (entry.isFile) {
    const blob = await new Promise((resolve, reject) => entry.file(resolve, reject));
    output.push({path: prefix + safePart(entry.name), blob});
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const child of batch) await entryFiles(child, `${prefix}${safePart(entry.name)}/`, output);
    }
  }
}

// The dropped files with paths relative to a common folder, and that folder's name.
export async function droppedRobot(dataTransfer) {
  const entries = Array.from(dataTransfer.items || [])
      .map(item => item.webkitGetAsEntry?.()).filter(Boolean);
  const files = [];
  if (entries.length) {
    for (const entry of entries) await entryFiles(entry, '', files);
  } else {
    for (const blob of dataTransfer.files || []) files.push({path: safePart(blob.name), blob});
  }
  const urdfs = files.filter(file => /\.urdf$/i.test(file.path))
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
  if (!urdfs.length) throw new Error('Drop a .urdf file, its meshes, or the robot\'s folder.');
  const top = files.every(file => file.path.includes('/')) &&
      new Set(files.map(file => file.path.split('/')[0])).size === 1 ? files[0].path.split('/')[0] : null;
  const strip = path => top ? path.slice(top.length + 1) : path;
  const folder = top || urdfs[0].path.replace(/\.urdf$/i, '');
  return {
    folder: safePart(folder).slice(0, 64),
    urdf: strip(urdfs[0].path),
    others: urdfs.slice(1).map(file => strip(file.path)),
    files: files.map(file => ({path: strip(file.path), blob: file.blob})),
  };
}
