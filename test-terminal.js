import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

let sessionId = null;
let testPassed = false;

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Create a new session
  ws.send(JSON.stringify({
    type: 'create',
    cols: 80,
    rows: 24
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg.type, msg.sessionId ? `(session: ${msg.sessionId})` : '');
  
  switch(msg.type) {
    case 'created':
      console.log('✓ Session created successfully');
      sessionId = msg.sessionId;
      
      // Send a test command
      setTimeout(() => {
        console.log('Sending test command: echo "Hello Shelltender"');
        ws.send(JSON.stringify({
          type: 'input',
          sessionId: sessionId,
          data: 'echo "Hello Shelltender"\r'
        }));
      }, 100);
      break;
      
    case 'output':
      console.log('Output:', JSON.stringify(msg.data));
      if (msg.data && msg.data.includes('Hello Shelltender')) {
        console.log('✓ Terminal responded correctly!');
        testPassed = true;
        
        // Exit the session
        ws.send(JSON.stringify({
          type: 'input',
          sessionId: sessionId,
          data: 'exit\r'
        }));
      }
      break;
      
    case 'exit':
      console.log('Session exited');
      ws.close();
      break;
  }
});

ws.on('close', () => {
  console.log('\nTest Result:', testPassed ? '✅ PASSED' : '❌ FAILED');
  process.exit(testPassed ? 0 : 1);
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
  process.exit(1);
});