import { 
  SessionManager, 
  BufferManager, 
  SessionStore, 
  WebSocketServer,
  TerminalDataPipeline,
  PipelineIntegration
} from '@shelltender/server';
import WebSocket from 'ws';

async function minimalIntegration() {
  console.log('Starting minimal Shelltender integration...\n');

  // Step 1: Initialize components in the correct order
  console.log('1. Initializing components...');
  
  const bufferManager = new BufferManager();
  const sessionStore = new SessionStore('./test-sessions');
  
  // CRITICAL: Initialize SessionStore before creating SessionManager
  await sessionStore.initialize();
  console.log('   ✓ SessionStore initialized');
  
  const sessionManager = new SessionManager(sessionStore);
  console.log('   ✓ SessionManager created');

  // Step 2: Create data pipeline (optional but recommended)
  const pipeline = new TerminalDataPipeline();
  console.log('   ✓ Pipeline created');

  // Step 3: Create WebSocket server
  const wsPort = 8082;
  const wsServer = new WebSocketServer(wsPort, sessionManager, bufferManager);
  console.log(`   ✓ WebSocket server listening on port ${wsPort}`);

  // Step 4: Set up integration to connect all components
  const integration = new PipelineIntegration(
    pipeline,
    sessionManager,
    bufferManager,
    wsServer,
    sessionStore
  );
  integration.setup();
  console.log('   ✓ Pipeline integration setup complete\n');

  // Step 5: Test the integration
  console.log('2. Testing WebSocket connection...');
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  const ws = new WebSocket(`ws://localhost:${wsPort}`);
  
  ws.on('open', () => {
    console.log('   ✓ Connected to WebSocket server\n');
    
    console.log('3. Creating a session with custom ID...');
    
    // Create session with custom ID
    ws.send(JSON.stringify({
      type: 'create',
      options: {
        id: 'test-custom-123',
        command: '/bin/bash',
        cwd: '/tmp'
      }
    }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`   → Received: ${msg.type}`);
    
    if (msg.type === 'created') {
      console.log(`   ✓ Session created with ID: ${msg.sessionId}`);
      console.log(`     Command: ${msg.session.command || '/bin/bash'}`);
      
      // Verify custom ID was used
      if (msg.sessionId === 'test-custom-123') {
        console.log('   ✓ Custom session ID working correctly!\n');
      } else {
        console.log('   ✗ Custom session ID not working - got:', msg.sessionId, '\n');
      }
      
      console.log('4. Sending test command...');
      
      // Send a test command
      ws.send(JSON.stringify({
        type: 'input',
        sessionId: msg.sessionId,
        data: 'echo "Hello from Shelltender!"\n'
      }));
      
      // Send pwd to verify working directory
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'input',
          sessionId: msg.sessionId,
          data: 'pwd\n'
        }));
      }, 100);
      
      // Exit after testing
      setTimeout(() => {
        console.log('\n5. Test complete! Shutting down...');
        
        // Kill the session
        sessionManager.killSession(msg.sessionId);
        
        // Clean up
        ws.close();
        integration.teardown();
        process.exit(0);
      }, 2000);
    }
    
    if (msg.type === 'output') {
      console.log(`   ✓ Output received: ${msg.data.trim()}`);
    }
    
    if (msg.type === 'error') {
      console.error(`   ✗ Error: ${msg.data}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
  });
}

// Run the example
minimalIntegration().catch(console.error);