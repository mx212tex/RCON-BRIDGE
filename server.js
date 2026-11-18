import { WebSocketServer, WebSocket } from 'ws';

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

wss.on('connection', (clientSocket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetHost = url.searchParams.get('host') || '45.137.244.79';
  const targetPort = url.searchParams.get('port') || '28116';
  const targetPassword = url.pathname.slice(1) || 'RustyNails';

  const targetUrl = `ws://${targetHost}:${targetPort}/${targetPassword}`;
  console.log(`Connecting upstream to ${targetHost}:${targetPort}...`);
  const gameSocket = new WebSocket(targetUrl);
  const queue = [];

  gameSocket.on('open', () => {
    console.log('Connected to G-Portal upstream. Flushing queued messages...');
    while (queue.length > 0) {
      gameSocket.send(queue.shift());
    }
  });

  clientSocket.on('message', (msg) => {
    // Rust WebRCON requires strings (text frames), not binary Buffers:
    const text = msg.toString();
    if (gameSocket.readyState === WebSocket.OPEN) {
      gameSocket.send(text);
    } else {
      queue.push(text);
    }
  });

  gameSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(msg.toString());
    }
  });

  gameSocket.on('error', (err) => {
    console.error('Upstream error:', err.message);
    clientSocket.close();
  });
  clientSocket.on('error', (err) => {
    console.error('Client error:', err.message);
    gameSocket.close();
  });
  gameSocket.on('close', () => clientSocket.close());
  clientSocket.on('close', () => gameSocket.close());
});

console.log(`RCON bridge listening on port ${port}`);
