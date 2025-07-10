import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:9090/ws');

ws.on('open', () => {
  console.log('Connected!');
  
  // Send create message
  ws.send(JSON.stringify({
    type: 'create',
    cols: 80,
    rows: 24
  }));
  console.log('Sent create message');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'created' && msg.sessionId) {
    console.log('Session created successfully! ID:', msg.sessionId);
    
    // Send some input
    ws.send(JSON.stringify({
      type: 'input',
      sessionId: msg.sessionId,
      data: 'echo "Hello from Shelltender!"\n'
    }));
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('Connection closed');
});

// Keep process alive
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);