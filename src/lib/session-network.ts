import TcpSocket from 'react-native-tcp-socket';

export type Lang = 'en' | 'vi';

export type CaptionMessage = {
  kind: 'caption';
  id: string;
  speaker: string;
  sourceLang: Lang;
  targetLang: Lang;
  source: string;
  translated: string;
};

export type HelloMessage = {
  kind: 'hello';
  deviceId: string;
  name: string;
};

export type RequestSpeakMessage = {
  kind: 'request-speak';
  deviceId: string;
  name: string;
};

export type SpeakDecisionMessage = {
  kind: 'speak-decision';
  deviceId: string;
  approved: boolean;
};

export type NetMessage =
  | CaptionMessage
  | HelloMessage
  | RequestSpeakMessage
  | SpeakDecisionMessage;

export const SESSION_PORT = 8288;

type TcpSocketInstance = InstanceType<typeof TcpSocket.Socket>;

/** Buffers arbitrary chunks into newline-delimited JSON messages. */
function makeLineFeed(onMessage: (msg: NetMessage) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.trim()) continue;
      try {
        onMessage(JSON.parse(line) as NetMessage);
      } catch (err) {
        console.log(`[Session] malformed line ignored: "${line}" (${err})`);
      }
    }
  };
}

export type HostSession = {
  port: number;
  broadcast: (msg: NetMessage) => void;
  sendTo: (deviceId: string, msg: NetMessage) => void;
  close: () => void;
};

/**
 * Starts a TCP server. Caption messages from any peer are relayed to every other peer.
 * `hello`/`request-speak`/`speak-decision` are host-only concerns: the host tracks which
 * socket belongs to which deviceId (from `hello`) so it can `sendTo` a single peer directly
 * (e.g. to approve/deny a specific speak request) instead of broadcasting.
 */
export function startHost(
  onMessage: (msg: NetMessage, fromDeviceId: string | null) => void,
  onPeerCountChange: (count: number) => void,
  onError: (error: Error) => void
): HostSession {
  const sockets = new Set<TcpSocketInstance>();
  const socketByDevice = new Map<string, TcpSocketInstance>();
  const deviceBySocket = new Map<TcpSocketInstance, string>();

  const server = TcpSocket.createServer((socket) => {
    console.log(`[Session:Host] peer connected (${socket.remoteAddress}:${socket.remotePort})`);
    sockets.add(socket);
    onPeerCountChange(sockets.size);

    const feed = makeLineFeed((msg) => {
      if (msg.kind === 'hello') {
        socketByDevice.set(msg.deviceId, socket);
        deviceBySocket.set(socket, msg.deviceId);
      }
      const fromDeviceId = deviceBySocket.get(socket) ?? null;
      console.log(`[Session:Host] received from ${fromDeviceId ?? 'unknown'}: ${JSON.stringify(msg)}`);
      onMessage(msg, fromDeviceId);

      // Only captions get fanned out to everyone else; speak requests/decisions are handled
      // by the host directly (sendTo) rather than broadcast.
      if (msg.kind === 'caption') {
        const line = `${JSON.stringify(msg)}\n`;
        let relayedTo = 0;
        for (const other of sockets) {
          if (other !== socket) {
            other.write(line);
            relayedTo++;
          }
        }
        console.log(`[Session:Host] relayed caption to ${relayedTo} other peer(s)`);
      }
    });

    socket.on('data', (data) => feed(data.toString()));
    socket.on('close', () => {
      console.log('[Session:Host] peer disconnected');
      sockets.delete(socket);
      const deviceId = deviceBySocket.get(socket);
      if (deviceId) {
        socketByDevice.delete(deviceId);
        deviceBySocket.delete(socket);
      }
      onPeerCountChange(sockets.size);
    });
    socket.on('error', (err) => {
      console.log(`[Session:Host] peer socket error: ${err.message}`);
      sockets.delete(socket);
      onPeerCountChange(sockets.size);
    });
  });

  server.on('error', (err) => {
    console.log(`[Session:Host] server error: ${err.message}`);
    onError(err);
  });
  server.listen({ port: SESSION_PORT, host: '0.0.0.0' }, () => {
    console.log(`[Session:Host] listening on 0.0.0.0:${SESSION_PORT}`);
  });

  return {
    port: SESSION_PORT,
    broadcast: (msg) => {
      const line = `${JSON.stringify(msg)}\n`;
      console.log(`[Session:Host] broadcasting to ${sockets.size} peer(s): ${JSON.stringify(msg)}`);
      for (const socket of sockets) socket.write(line);
    },
    sendTo: (deviceId, msg) => {
      const socket = socketByDevice.get(deviceId);
      if (!socket) {
        console.log(`[Session:Host] sendTo: unknown deviceId ${deviceId}`);
        return;
      }
      socket.write(`${JSON.stringify(msg)}\n`);
    },
    close: () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

export type JoinSession = {
  send: (msg: NetMessage) => void;
  close: () => void;
};

/** Connects to a host's TCP server as a client. */
export function joinHost(
  host: string,
  port: number,
  callbacks: {
    onConnected: () => void;
    onMessage: (msg: NetMessage) => void;
    onDisconnect: (error?: Error) => void;
  }
): JoinSession {
  console.log(`[Session:Join] connecting to ${host}:${port}...`);
  const socket = TcpSocket.createConnection({ port, host }, () => {
    console.log('[Session:Join] connected to host');
    callbacks.onConnected();
  });

  const feed = makeLineFeed((msg) => {
    console.log(`[Session:Join] received from host: ${JSON.stringify(msg)}`);
    callbacks.onMessage(msg);
  });
  socket.on('data', (data) => feed(data.toString()));
  socket.on('close', () => {
    console.log('[Session:Join] connection closed');
    callbacks.onDisconnect();
  });
  socket.on('error', (err) => {
    console.log(`[Session:Join] connection error: ${err.message}`);
    callbacks.onDisconnect(err);
  });

  return {
    send: (msg) => {
      console.log(`[Session:Join] sending to host: ${JSON.stringify(msg)}`);
      socket.write(`${JSON.stringify(msg)}\n`);
    },
    close: () => {
      socket.destroy();
    },
  };
}
