import { WebSocketServer, WebSocket } from 'ws';

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

wss.on('connection', (clientSocket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetHost = url.searchParams.get('host') || '45.137.244.79';
  const targetPort = url.searchParams.get('port') || '28116';
  const targetPassword = url.pathname.slice(1);

  const targetUrl = `ws://${targetHost}:${targetPort}/${targetPassword}`;
  console.log(`Connecting upstream to ${targetHost}:${targetPort}...`);
  const gameSocket = new WebSocket(targetUrl);

  clientSocket.on('message', (msg) => {
    if (gameSocket.readyState === WebSocket.OPEN) gameSocket.send(msg);
  });

  gameSocket.on('message', (msg) => {
    if (clientSocket.readyState === WebSocket.OPEN) clientSocket.send(msg);
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
