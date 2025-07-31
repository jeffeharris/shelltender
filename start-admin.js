#!/usr/bin/env node
import { startShelltender } from '@shelltender/server';

// Start Shelltender with admin features enabled
const port = parseInt(process.env.SHELLTENDER_PORT || '3000');
const result = await startShelltender(port);

console.log(`
🚀 Shelltender with Admin Panel is running!

  Web Terminal: http://localhost:${port}
  Admin Panel:  http://localhost:${port}/admin/monitor
  
  WebSocket:    ws://localhost:${port}/ws
  
Press Ctrl+C to stop
`);

// Keep the process alive
process.on('SIGINT', async () => {
  console.log('\nShutting down Shelltender...');
  await result.stop();
  process.exit(0);
});