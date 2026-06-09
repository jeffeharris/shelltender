import { createShelltenderServer } from '@shelltender/server';

// Use environment variable for port or default to 8090 for local testing
const PORT = process.env.PORT || 8090;

// Create and start shelltender server with admin UI
const { url, wsUrl, shelltender, server } = await createShelltenderServer({
  port: PORT,
  host: '0.0.0.0',  // Bind to all interfaces for Docker
  wsPath: '/ws',
  enablePipeline: true,
  apiRoutes: true,  // Enable API routes including admin
  staticDir: './public'
});

console.log('🍹 Shelltender Server with Admin UI');
console.log('');
console.log(`Server: ${url}`);
console.log(`Admin UI: ${url}/admin`);
console.log(`WebSocket: ${wsUrl}`);
console.log('');
console.log('Try these URLs:');
console.log(`- ${url}/api/health`);
console.log(`- ${url}/api/admin/sessions`);
console.log(`- ${url}/admin`);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await shelltender.stop();
  process.exit(0);
});