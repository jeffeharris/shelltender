const { spawn } = require('child_process');
const WebSocket = require('ws');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBufferFix() {
  console.log('Starting server...');
  
  // Start the server
  const server = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  // Wait for server to start
  await sleep(5000);

  console.log('Creating test session...');
  
  // Connect to WebSocket
  const ws = new WebSocket('ws://localhost:8080');
  
  await new Promise((resolve) => {
    ws.on('open', resolve);
  });

  // Create a session
  ws.send(JSON.stringify({
    type: 'create',
    cols: 80,
    rows: 24
  }));

  let sessionId;
  let buffer = '';

  await new Promise((resolve) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'created') {
        sessionId = msg.sessionId;
        console.log('Session created:', sessionId);
        resolve();
      } else if (msg.type === 'output') {
        buffer += msg.data;
      }
    });
  });

  // Send a test command
  ws.send(JSON.stringify({
    type: 'input',
    sessionId,
    data: 'echo "test"\n'
  }));

  await sleep(2000);

  // Count prompts in initial buffer
  const promptCount1 = (buffer.match(/\$|#/g) || []).length;
  console.log('Initial prompt count:', promptCount1);

  // Close connection
  ws.close();
  
  // Kill and restart server
  console.log('Restarting server...');
  server.kill();
  await sleep(2000);

  const server2 = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  await sleep(5000);

  // Reconnect
  const ws2 = new WebSocket('ws://localhost:8080');
  
  await new Promise((resolve) => {
    ws2.on('open', resolve);
  });

  // Attach to the same session
  ws2.send(JSON.stringify({
    type: 'attach',
    sessionId
  }));

  let restoredBuffer = '';
  
  await new Promise((resolve) => {
    ws2.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'history') {
        restoredBuffer = msg.data;
        resolve();
      }
    });
  });

  await sleep(2000);

  // Count prompts in restored buffer
  const promptCount2 = (restoredBuffer.match(/\$|#/g) || []).length;
  console.log('Restored prompt count:', promptCount2);

  if (promptCount2 > promptCount1) {
    console.error('❌ FAILED: Buffer has duplicated prompts!');
    console.error(`Expected ${promptCount1} prompts but got ${promptCount2}`);
  } else {
    console.log('✅ PASSED: Buffer restored without duplication');
  }

  // Cleanup
  ws2.close();
  server2.kill();
  
  process.exit(promptCount2 > promptCount1 ? 1 : 0);
}

testBufferFix().catch(console.error);