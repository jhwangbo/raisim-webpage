import {writeModuleFile} from './viewer-examples.mjs';

export function installFemWorkbench(module, canvas, environment = globalThis) {
  const input = document.createElement('input');
  input.type = 'file'; input.multiple = true;
  input.accept = '.step,.stp,.iges,.igs,.brep,.rfem';
  input.hidden = true; document.body.append(input);
  let worker = null;
  let sequence = 0;
  const allowed = new Set(['step','stp','iges','igs','brep','rfem']);
  const notifyError = error => { environment.raisimFemError = error?.message || String(error); console.error(error); };
  const importFiles = async files => {
    const list = [...files];
    const primary = list.find(file => allowed.has(file.name.split('.').at(-1).toLowerCase()));
    if (!primary) throw Error('Choose a B-rep CAD solid (STEP, IGES or BREP) or a saved .rfem project.');
    for (const file of list) {
      if (!file.name || file.name.includes('/') || file.name.includes('\\')) throw Error('Invalid dropped file name.');
      if (file.size > 128 * 1024 * 1024) throw Error('A dropped file exceeds 128 MB.');
    }
    const folder = `/examples/rsc/fem-import-${++sequence}/`;
    for (const file of list) {
      writeModuleFile(module, module._rayrai_example_write_file, folder + file.name, new Uint8Array(await file.arrayBuffer()));
    }
    const path = new TextEncoder().encode(folder + primary.name + '\0');
    const pointer = module._malloc(path.byteLength);
    if (!pointer) throw Error('Not enough browser memory to open this file.');
    try { new Uint8Array(module.wasmMemory.buffer).set(path, pointer); if (!module._rayrai_example_drop_file(pointer)) throw Error('Cannot queue the dropped model.'); }
    finally { module._free(pointer); }
  };
  const drop = event => { event.preventDefault(); importFiles(event.dataTransfer.files).catch(notifyError); };
  const drag = event => event.preventDefault();
  canvas.addEventListener('dragover', drag); canvas.addEventListener('drop', drop);
  input.addEventListener('change', () => { importFiles(input.files).catch(notifyError); input.value = ''; });
  environment.raisimFem = {
    open: () => input.click(), importFiles,
    startMesh: (directory, bytes, elementSize, files, extension, surfaceTolerance = 0, surfaceOnly = false) => {
      if (worker) worker.terminate();
      const cad = ['.step','.stp','.brep','.iges','.igs'].includes(extension);
      const current = cad ? new Worker(new URL('./fem-cad-worker.js', import.meta.url)) :
        new Worker(new URL('./fem-mesher-worker.mjs', import.meta.url), {type: 'module'});
      worker = current;
      const finish = message => {
        if (worker !== current) return;
        try {
          if (message.error) files.writeFile(directory + '/error.txt', new TextEncoder().encode(message.error));
          else files.writeFile(directory + (surfaceOnly ? '/surface.rfs' : '/volume.mesh'), message.bytes);
          files.writeFile(directory + '/done', new Uint8Array([1]));
        } catch (error) { notifyError(error); }
        current.terminate(); worker = null;
      };
      current.onmessage = ({data}) => finish(data);
      current.onerror = event => finish({error: event.message || 'Browser mesher failed to load.'});
      current.postMessage({bytes, elementSize, extension, surfaceTolerance, surfaceOnly}, [bytes.buffer]);
    },
    setMeshingSettings: (settings = {}) => { environment.raisimFemSolveRequest = {...settings, configureOnly:true}; },
    solve: (settings = {}) => { environment.raisimFemSolveRequest = settings; },
    cancelMesh: () => { worker?.terminate(); worker = null; },
    download: (name, bytes) => {
      const url = URL.createObjectURL(new Blob([bytes], {type: 'application/octet-stream'}));
      const link = document.createElement('a'); link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
  return () => { worker?.terminate(); input.remove(); canvas.removeEventListener('dragover', drag); canvas.removeEventListener('drop', drop); delete environment.raisimFem; };
}
