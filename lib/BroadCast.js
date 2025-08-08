const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8888 });
const clients = new Map();
let asLog = false;
const log = {};

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
  if (channel === 'monitoring') { 
    return monitoring(message);
  }

  if (asLog) {
    if (!log[channel]) {
      log[channel] = { allCall: 0 };
    }

    log[channel].allCall++;

    if (
      message &&
      typeof message === 'object' &&
      !Array.isArray(message)
    ) {
      const keys = Object.keys(message);
      if (keys.length === 1) {
        const key = keys[0];
        log[channel][key] = (log[channel][key] || 0) + 1;
      }
    }
}

  const payload = JSON.stringify(message);

  for (const [sock, subs] of clients.entries()) {
    if (subs.includes(channel) && sock.readyState === WebSocket.OPEN) {
      sock.send(payload);
    }
  }
}

function monitoring(message) {
  if (message === 'start') {
    asLog = true;
    return;
  }
  if (message === 'end') {
    asLog = false;
    return;
  }
  if (message === 'read') {
    const subsCount = {};
    for (const subs of clients.values()) {
      for (const channel of subs) {
        subsCount[channel] = (subsCount[channel] || 0) + 1;
      }
    }

    return {
      subscribers: subsCount,
      calls: log
    };
  }
}

module.exports = broadCast;
