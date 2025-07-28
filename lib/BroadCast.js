const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8888 });
const clients = new Map();
const session = new (require('@lib/Session'))();

server.on('connection', (ws) => {
  clients.set(ws, { channels: [], userId: null });

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    const client = clients.get(ws);
    if (!client) return;

    // Enregistrement de l'userId s'il est fourni
    if (data.userId && typeof data.userId === 'string') {
      client.userId = data.userId;
    }

    if (data.subscribe) {
      const channel = data.subscribe;
      if (!client.channels.includes(channel)) {
        client.channels.push(channel);
      }
    } else if (data.unsubscribe) {
      const channel = data.unsubscribe;
      client.channels = client.channels.filter(c => c !== channel);
    } else if (data.clear) {
      client.channels = [];
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadCast(channel, message) {
  console.log(session.getUserId())

  const payload = JSON.stringify(message);

  for (const [sock, { channels, userId }] of clients.entries()) {
    if (
      channels.includes(channel) &&
      sock.readyState === WebSocket.OPEN &&
      userId !== session.getUserId()
    ) {
      sock.send(payload);
    }
  }
}

module.exports = broadCast;
