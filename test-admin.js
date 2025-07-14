import express from 'express';
import { createShelltender } from './packages/server/dist/index.js';

const app = express();

// Create shelltender instance
const shelltender = await createShelltender(app, {
  port: 3333,
  wsPath: '/ws',
  enablePipeline: true
});

// Start the server
const server = app.listen(3333, () => {
  console.log('Server running on http://localhost:3333');
  console.log('Admin UI available at http://localhost:3333/admin');
  console.log('WebSocket endpoint at ws://localhost:3333/ws');
  
  // Create a test session
  const session = shelltender.sessionManager.createSession({
    command: 'bash',
    args: ['-c', 'echo "Test session started" && sleep 3600']
  });
  
  console.log('Created test session:', session.id);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await shelltender.stop();
  process.exit(0);
});