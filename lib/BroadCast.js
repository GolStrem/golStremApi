const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8888 });
const clients = new Map();

server.on('connection', (ws) => {
  clients.set(ws, []);

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    const channels = clients.get(ws);
    if (!channels) return;

    if (data.subscribe) {
      const channel = data.subscribe;
      if (!channels.includes(channel)) {
        channels.push(channel);
      }
    } else if (data.unsubscribe) {
      const channel = data.unsubscribe;
      clients.set(ws, channels.filter(c => c !== channel));
    } else if (data.clear) {
      clients.set(ws, []);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadCast(channel, message) {
  const payload = JSON.stringify(message);

  for (const [sock, subs] of clients.entries()) {
    if (subs.includes(channel) && sock.readyState === WebSocket.OPEN) {
      sock.send(payload);
    }
  }
}

module.exports = broadCast;
