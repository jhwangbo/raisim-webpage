import createMesher from './fem-mesher.mjs';

let kernelPromise;

export async function readCadSurface(bytes, extension, elementSize, surfaceTolerance = 0, surfaceOnly = false) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength > 128 * 1024 * 1024) throw Error('CAD file exceeds 128 MB.');
  const kernel = await (kernelPromise ??= createMesher({locateFile: () => new URL('./fem-mesher.wasm', import.meta.url).href}));
  let pointer = 0, output;
  try {
    pointer = kernel.allocBuffer(data.byteLength || 1);
    if (!pointer) throw Error('Not enough browser memory to read the CAD model.');
    kernel.HEAPU8.set(data, pointer);
    output = kernel.readCad(pointer, data.byteLength, extension, elementSize ?? 0, surfaceTolerance ?? 0, surfaceOnly);
    if (output.status !== 0) throw Error(output.error || 'CAD import failed.');
    const parts = [];
    for (let i = 0; i < output.partCount(); ++i)
      parts.push({vertices: Float64Array.from(output.verticesView(i)), faces: Int32Array.from(output.facesView(i)),
        patches: Int32Array.from(output.patchesView(i))});
    return parts;
  } finally { output?.delete(); if (pointer) kernel.freeBuffer(pointer); }
}

export function encodeCadSurface(parts) {
  const lines = ['RAISIM_FEM_SURFACE 2',
    `${parts.reduce((s, p) => s + p.vertices.length / 3, 0)} ${parts.reduce((s, p) => s + p.faces.length / 3, 0)}`];
  for (const part of parts) for (let i = 0; i < part.vertices.length; i += 3)
    lines.push(`${part.vertices[i]} ${part.vertices[i + 1]} ${part.vertices[i + 2]}`);
  let offset = 0;
  for (let p = 0; p < parts.length; ++p) {
    const part = parts[p];
    for (let f = 0; f < part.faces.length; f += 3)
      lines.push(`${part.faces[f] + offset} ${part.faces[f + 1] + offset} ${part.faces[f + 2] + offset} ${p + 1} ${part.patches[f / 3]}`);
    offset += part.vertices.length / 3;
  }
  return new TextEncoder().encode(lines.join('\n') + '\n');
}

export function readStl(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength > 128 * 1024 * 1024) throw Error('Surface file exceeds 128 MB.');
  const vertices = [], faces = [], nodes = new Map();
  function vertex(x, y, z) {
    if (![x, y, z].every(Number.isFinite)) throw Error('STL coordinates must be finite.');
    const key = `${x},${y},${z}`;
    if (!nodes.has(key)) { nodes.set(key, vertices.length / 3); vertices.push(x, y, z); }
    faces.push(nodes.get(key));
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = data.byteLength >= 84 ? view.getUint32(80, true) : 0;
  if (count && 84 + 50 * count === data.byteLength) {
    for (let f = 0; f < count; ++f) for (let i = 0; i < 3; ++i) {
      const offset = 84 + f * 50 + 12 + i * 12;
      vertex(view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true));
    }
  } else {
    const text = new TextDecoder().decode(data);
    const pattern = /\bvertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
    for (const match of text.matchAll(pattern)) vertex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (vertices.length < 12 || !faces.length || faces.length % 3) throw Error('STL must contain complete solid triangles.');
  return validateSurfaceArrays({vertices,faces});
}
export function validateSurfaceArrays({vertices,faces,patches=null}) {
  if(vertices.length%3||faces.length%3||vertices.length<12||faces.length<12) throw Error('Surface must contain complete solid triangles with finite coordinates.');
  for(const v of vertices) if(!Number.isFinite(v)) throw Error('Nonfinite surface coordinate.');
  for(const v of faces) if(!Number.isInteger(v)||v<0||v>=vertices.length/3) throw Error('Invalid surface index.');
  if(patches&&(patches.length!==faces.length/3||!Array.prototype.every.call(patches,Number.isInteger))) throw Error('Invalid surface face ids.');
  const edges = new Map();
  for (let i = 0; i < faces.length; i += 3) {
    const tri = faces.slice(i, i + 3);
    if (new Set(tri).size !== 3) throw Error('STL contains a collapsed triangle.');
    for (let j = 0; j < 3; ++j) {
      const a = tri[j], b = tri[(j + 1) % 3], key = `${Math.min(a, b)},${Math.max(a, b)}`;
      const edge = edges.get(key) || {count: 0, direction: 0};
      edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
    }
  }
  for (const edge of edges.values()) if (edge.count !== 2 || edge.direction !== 0)
    throw Error('Surface must be watertight, manifold, and consistently oriented. Repair the STL before meshing.');
  let volume=0;
  const origin=vertices.slice(0,3);
  for(let i=0;i<faces.length;i+=3) {
    const p=[0,1,2].map(a=>Array.from(vertices.slice(3*faces[i+a],3*faces[i+a]+3),(x,k)=>x-origin[k]));
    volume+=p[0][0]*(p[1][1]*p[2][2]-p[1][2]*p[2][1])+p[0][1]*(p[1][2]*p[2][0]-p[1][0]*p[2][2])+p[0][2]*(p[1][0]*p[2][1]-p[1][1]*p[2][0]);
  }
  if(!Number.isFinite(volume)||volume===0) throw Error('Surface must enclose a nonzero volume.');
  if(volume<0) for(let i=0;i<faces.length;i+=3) [faces[i+1],faces[i+2]]=[faces[i+2],faces[i+1]];
  return {vertices: new Float64Array(vertices), faces: new Int32Array(faces), patches: patches ? new Int32Array(patches) : null};
}

export function medit(vertices, tetrahedra, regions = null) {
  if (vertices.length % 3 || tetrahedra.length % 4 || !tetrahedra.length) throw Error('Mesher returned invalid tetrahedra.');
  const lines = ['MeshVersionFormatted 1', 'Dimension 3', 'Vertices', String(vertices.length / 3)];
  for (let i = 0; i < vertices.length; i += 3) lines.push(`${vertices[i]} ${vertices[i+1]} ${vertices[i+2]} 0`);
  lines.push('Tetrahedra', String(tetrahedra.length / 4));
  for (let i = 0; i < tetrahedra.length; i += 4) lines.push(`${tetrahedra[i]+1} ${tetrahedra[i+1]+1} ${tetrahedra[i+2]+1} ${tetrahedra[i+3]+1} ${regions ? regions[i/4] : 0}`);
  lines.push('End', '');
  return new TextEncoder().encode(lines.join('\n'));
}

export async function meshSurfaceArrays(surface, elementSize, surfaceTolerance = 0) {
  if (!Number.isFinite(elementSize) || elementSize <= 0) throw Error('Element size must be positive.');
  surface = validateSurfaceArrays(surface);
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < surface.vertices.length; ++i) {
    const a = i % 3; low[a] = Math.min(low[a], surface.vertices[i]); high[a] = Math.max(high[a], surface.vertices[i]);
  }
  const diagonal = Math.hypot(...low.map((x, a) => high[a] - x));
  if (!(diagonal > 0) || !Number.isFinite(diagonal)) throw Error('Surface extent must be positive and finite.');
  const kernel = await (kernelPromise ??= createMesher({locateFile: () => new URL('./fem-mesher.wasm', import.meta.url).href,
    print: () => {}, printErr: text => console.error(text)}));
  let vp = 0, fp = 0, pp = 0, output;
  try {
    vp = kernel.allocBuffer(surface.vertices.byteLength);
    fp = kernel.allocBuffer(surface.faces.byteLength);
    if (surface.patches) pp = kernel.allocBuffer(surface.patches.byteLength);
    if (!vp || !fp || (surface.patches && !pp)) throw Error("Not enough browser memory to tetrahedralize the surface.");
    kernel.HEAPF64.set(surface.vertices, vp / 8); kernel.HEAP32.set(surface.faces, fp / 4);
    if (pp) kernel.HEAP32.set(surface.patches, pp / 4);
    output = kernel.tetrahedralize(vp, surface.vertices.length, fp, surface.faces.length, pp,
      {maximumEdge: elementSize, tolerance: surfaceTolerance || Math.min(elementSize * .01, diagonal * .001)});
    if (output.status !== 0) throw Error(output.error || `Volume meshing failed (status ${output.status}).`);
    return {vertices: Float64Array.from(output.verticesView()), tetrahedra: Int32Array.from(output.tetsView())};
  } finally {
    output?.delete(); if (pp) kernel.freeBuffer(pp); if (fp) kernel.freeBuffer(fp); if (vp) kernel.freeBuffer(vp);
  }
}

export async function meshSurfaceData(bytes, elementSize, surfaceTolerance = 0) {
  return meshSurfaceArrays(readStl(bytes), elementSize, surfaceTolerance);
}

export async function meshSurface(bytes, elementSize, surfaceTolerance = 0) {
  const data = await meshSurfaceData(bytes, elementSize, surfaceTolerance);
  return medit(data.vertices, data.tetrahedra, new Int32Array(data.tetrahedra.length/4).fill(1));
}

export function readRfs(bytes) {
  const words = new TextDecoder().decode(bytes).trim().split(/\s+/);
  const version = words[1];
  if (words[0] !== 'RAISIM_FEM_SURFACE' || (version !== '1' && version !== '2')) throw Error('Invalid source surface');
  let offset = 2;
  const columns = version === '2' ? 5 : 4;
  const nv = Number(words[offset++]), nf = Number(words[offset++]);
  if (!Number.isInteger(nv) || !Number.isInteger(nf) || nv < 4 || nf < 1 || nv > 10000000 || nf > 10000000 || words.length !== 4+3*nv+columns*nf)
    throw Error('Invalid surface dimensions');
  const vertices = Float64Array.from(words.slice(offset, offset+3*nv), Number); offset += 3*nv;
  const parts = new Map(), patches = new Map();
  for (let f = 0; f < nf; ++f) {
    const face = words.slice(offset,offset+3).map(Number), tag = Number(words[offset+3]);
    const patch = columns === 5 ? Number(words[offset+4]) : 0; offset += columns;
    if (![tag, patch].every(v=>Number.isInteger(v) && v >= -2147483648 && v <= 2147483647) || face.some(v=>!Number.isInteger(v)||v<0||v>=nv)) throw Error('Invalid surface face');
    if (!parts.has(tag)) { parts.set(tag, []); patches.set(tag, []); }
    parts.get(tag).push(...face); patches.get(tag).push(patch);
  }
  return {vertices, parts, patches};
}

export function encodeSurface(parts) {
  const count = parts.reduce((sum,p)=>sum+p.vertices.length/3,0);
  const faces = parts.reduce((sum,p)=>sum+p.faces.length/3,0);
  const lines = ['RAISIM_FEM_SURFACE 1',`${count} ${faces}`];
  for (const part of parts) for(let v=0;v<part.vertices.length;v+=3)
    lines.push(`${part.vertices[v]} ${part.vertices[v+1]} ${part.vertices[v+2]}`);
  let offset=0;
  for(let p=0;p<parts.length;++p) {
    const part=parts[p];
    for(let f=0;f<part.faces.length;f+=3) lines.push(`${part.faces[f]+offset} ${part.faces[f+1]+offset} ${part.faces[f+2]+offset} ${p+1}`);
    offset+=part.vertices.length/3;
  }
  return new TextEncoder().encode(lines.join('\n')+'\n');
}

export function mergeVolumes(parts, tags = parts.map((_,i)=>i+1)) {
  const lines = ['MeshVersionFormatted 1','Dimension 3','Vertices',String(parts.reduce((s,p)=>s+p.vertices.length/3,0))];
  for(const part of parts) for(let i=0;i<part.vertices.length;i+=3)
    lines.push(`${part.vertices[i]} ${part.vertices[i+1]} ${part.vertices[i+2]} 0`);
  lines.push('Tetrahedra', String(parts.reduce((s,p)=>s+p.tetrahedra.length/4,0)));
  let offset=1;
  for(let p=0;p<parts.length;++p) {
    const part=parts[p];
    for(let i=0;i<part.tetrahedra.length;i+=4)
      lines.push(`${part.tetrahedra[i]+offset} ${part.tetrahedra[i+1]+offset} ${part.tetrahedra[i+2]+offset} ${part.tetrahedra[i+3]+offset} ${tags[p]}`);
    offset+=part.vertices.length/3;
  }
  lines.push('End',''); return new TextEncoder().encode(lines.join('\n'));
}

export async function meshRfs(bytes, edge, tolerance) {
  const source=readRfs(bytes), parts=[], tags=[];
  for (const [tag, face] of [...source.parts].sort((a,b)=>a[0]-b[0])) {
    const unique=[...new Set(face)].sort((a,b)=>a-b), map=new Map(unique.map((v,i)=>[v,i]));
    const vertices=Float64Array.from(unique.flatMap(v=>Array.from(source.vertices.subarray(3*v,3*v+3))));
    const faces=Int32Array.from(face,v=>map.get(v)), patches=Int32Array.from(source.patches.get(tag));
    parts.push(await meshSurfaceArrays({vertices,faces,patches},edge,tolerance)); tags.push(tag);
  }
  return mergeVolumes(parts,tags);
}

export async function refineVolume(bytes, edge) {
  const words=new TextDecoder().decode(bytes).trim().split(/\s+/);
  if(words[0]!=='RAISIM_FEM_VOLUME'||words[1]!=='1') throw Error('Invalid volume source');
  const nv=Number(words[2]),nt=Number(words[3]);
  if(!Number.isInteger(nv)||!Number.isInteger(nt)||nv<4||nt<1||nt>2000000||words.length!==4+3*nv+5*nt) throw Error('Invalid volume dimensions');
  const vertices=Float64Array.from(words.slice(4,4+3*nv),Number), cells=new Int32Array(4*nt), regions=new Int32Array(nt);
  if(!vertices.every(Number.isFinite)) throw Error('Invalid volume coordinate');
  for(let t=0;t<nt;++t) {
    for(let a=0;a<4;++a) {
      const v=Number(words[4+3*nv+5*t+a]);
      if(!Number.isInteger(v)||v<0||v>=nv) throw Error('Invalid volume index');
      cells[4*t+a]=v;
    }
    const region=Number(words[4+3*nv+5*t+4]);
    if(!Number.isInteger(region)||region<-2147483648||region>2147483647) throw Error('Invalid volume region');
    regions[t]=region;
  }
  const kernel=await(kernelPromise ??= createMesher({locateFile:()=>new URL('./fem-mesher.wasm',import.meta.url).href}));
  let vp=0,tp=0,rp=0,output;
  try {
    vp=kernel.allocBuffer(vertices.byteLength); tp=kernel.allocBuffer(cells.byteLength); rp=kernel.allocBuffer(regions.byteLength);
    if(!vp||!tp||!rp) throw Error('Not enough memory to refine this volume');
    kernel.HEAPF64.set(vertices,vp/8); kernel.HEAP32.set(cells,tp/4); kernel.HEAP32.set(regions,rp/4);
    output=kernel.refine(vp,vertices.length,tp,cells.length,rp,edge);
    if(output.status!==0) throw Error(output.error||'Volume refinement failed');
    return medit(Float64Array.from(output.verticesView()),Int32Array.from(output.tetsView()),Int32Array.from(output.regionsView()));
  } finally { output?.delete(); if(vp)kernel.freeBuffer(vp); if(tp)kernel.freeBuffer(tp); if(rp)kernel.freeBuffer(rp); }
}

if (typeof self !== 'undefined' && typeof document === 'undefined') self.onmessage = async ({data}) => {
  try {
    const bytes = data.extension === '.rvm' ? await refineVolume(data.bytes,data.elementSize) :
      data.extension === '.rfs' ? await meshRfs(data.bytes,data.elementSize,data.surfaceTolerance) :
      await meshSurface(data.bytes,data.elementSize,data.surfaceTolerance);
    self.postMessage({bytes},[bytes.buffer]);
  } catch(error) { self.postMessage({error:error?.message||String(error)}); }
};
