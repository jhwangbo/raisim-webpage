// Byte streams for the rayrai viewer's TcpClient in the browser (TcpWebClient.cpp). A stream is a
// WebSocket to a RaisimServer on this computer or the network, or the channel of a server example
// running in this page (host "browser"). Both carry the bytes a TCP connection would.

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?)$/i;
const STATE = {connecting: 0, open: 1, closed: 2};

export function isLoopbackHost(host) {
  return LOOPBACK.test(host);
}

function webSocketUrl(host, port) {
  const name = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `ws://${name}:${port}/`;
}

function blockedMessage(host, platform) {
  if (platform.location?.protocol === 'https:' && !isLoopbackHost(host))
    return 'This page was opened over HTTPS, so the browser only lets it reach servers on this ' +
        'computer. To reach servers on your network, open the viewer from a local copy ' +
        '(python3 web/serve.py).';
  return '';
}

export class ViewerStreams {
  constructor(examples, platform = globalThis) {
    this.examples = examples;
    this.platform = platform;
    this.next = 1;
    this.streams = new Map();
  }

  open(host, port) {
    const id = this.next++;
    const stream = {state: STATE.connecting, chunks: [], error: '', local: false, socket: null};
    this.streams.set(id, stream);
    try {
      if (host === 'browser') {
        stream.local = true;
        stream.socket = this.examples.connect(port);
      } else {
        stream.local = isLoopbackHost(host);
        const blocked = blockedMessage(host, this.platform);
        if (blocked) throw Error(blocked);
        const socket = new this.platform.WebSocket(webSocketUrl(host, port));
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => { stream.state = STATE.open; };
        socket.onmessage = event => stream.chunks.push(new Uint8Array(event.data));
        socket.onclose = () => {
          if (stream.state === STATE.connecting && !stream.error)
            stream.error = `No RaisimServer accepted this page at ${host}:${port}. A server accepts pages ` +
                'from raisim.com and from this computer; RaisimServer::allowWebViewerOrigin() adds others.';
          stream.state = STATE.closed;
        };
        stream.socket = {
          send: bytes => socket.send(bytes),
          close: () => socket.close(),
        };
      }
    } catch (error) {
      stream.error = error instanceof Error ? error.message : String(error);
      stream.state = STATE.closed;
    }
    return id;
  }

  update(stream) {
    const pulled = stream.socket?.pull?.();
    if (!pulled) return;
    if (pulled.open && stream.state === STATE.connecting) stream.state = STATE.open;
    if (pulled.bytes?.length) stream.chunks.push(pulled.bytes);
    if (pulled.closed) stream.state = STATE.closed;
    if (pulled.error && !stream.error) stream.error = pulled.error;
  }

  // Resolves with the stream's state once it is no longer connecting, or after timeoutMs.
  waitOpen(id, timeoutMs) {
    const stream = this.streams.get(id);
    if (!stream) return Promise.resolve(STATE.closed);
    const deadline = performance.now() + timeoutMs;
    return new Promise(resolve => {
      const check = () => {
        this.update(stream);
        if (stream.state !== STATE.connecting) return resolve(stream.state);
        if (performance.now() >= deadline) {
          stream.error ||= 'The server did not answer in time.';
          return resolve(STATE.connecting);
        }
        this.platform.setTimeout(check, 5);
      };
      check();
    });
  }

  // Up to capacity received bytes; 0 when none have arrived, -1 once the stream ended.
  take(id, capacity) {
    const stream = this.streams.get(id);
    if (!stream) return -1;
    this.update(stream);
    if (!stream.chunks.length) return stream.state === STATE.closed ? -1 : 0;
    const first = stream.chunks[0];
    if (first.length <= capacity) {
      stream.chunks.shift();
      return first;
    }
    stream.chunks[0] = first.subarray(capacity);
    return first.subarray(0, capacity);
  }

  give(id, bytes) {
    const stream = this.streams.get(id);
    if (!stream || stream.state !== STATE.open) return -1;
    try {
      return stream.socket.send(bytes) === false ? -1 : 0;
    } catch {
      stream.state = STATE.closed;
      return -1;
    }
  }

  isLocal(id) {
    return this.streams.get(id)?.local === true;
  }

  error(id) {
    return this.streams.get(id)?.error || '';
  }

  close(id) {
    const stream = this.streams.get(id);
    if (!stream) return;
    try {
      stream.socket?.close();
    } catch {}
    this.streams.delete(id);
  }
}
