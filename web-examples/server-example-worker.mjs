// One raisim2Lib server example in its own WebAssembly instance (see viewer-examples.mjs). The
// example's main runs on a thread of its own, so this worker stays free to pass its output on.

import {writeModuleFile} from './viewer-examples.mjs';

const post = message => self.postMessage(message);

self.onmessage = async ({data}) => {
  const {name, moduleUrl, wasmModule, files} = data;
  try {
    const {default: create} = await import(moduleUrl);
    const module = await create({
      mainScriptUrlOrBlob: moduleUrl,
      instantiateWasm: (imports, receive) => {
        WebAssembly.instantiate(wasmModule, imports).then(instance => receive(instance, wasmModule));
        return {};
      },
      print: text => post({type: 'output', text}),
      printErr: text => post({type: 'output', text}),
      onExit: code => post({type: 'exit', code}),
      onAbort: reason => post({type: 'exit', code: -1, reason: `The example stopped: ${reason}`}),
    });
    for (const {path, bytes} of files) writeModuleFile(module, module._raisim_server_write_file, path, bytes);
    post({type: 'channel', buffer: module.HEAPU8.buffer, address: module._raisim_server_channel()});
    module.callMain([name]);
  } catch (error) {
    post({type: 'exit', code: -1, reason: error instanceof Error ? error.message : String(error)});
  }
};
