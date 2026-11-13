self.onmessage = async ({data}) => {
  try {
    const {readCadSurface, encodeCadSurface, meshSurfaceArrays, mergeVolumes} = await import('./fem-mesher-worker.mjs');
    const parts = await readCadSurface(data.bytes, data.extension, data.elementSize, data.surfaceTolerance, data.surfaceOnly);
    let bytes;
    if (data.surfaceOnly) bytes = encodeCadSurface(parts);
    else {
      const volumes = [];
      for (const part of parts) volumes.push(await meshSurfaceArrays(part, data.elementSize, data.surfaceTolerance));
      bytes = mergeVolumes(volumes);
    }
    self.postMessage({bytes}, [bytes.buffer]);
  } catch (error) { self.postMessage({error: error?.message || String(error)}); }
};
