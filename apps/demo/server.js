import { createShelltenderServer } from '@shelltender/server';

// v0.6.0 Best Practice: Use createShelltenderServer for zero-config setup
const { url } = await createShelltenderServer({ 
  port: 8085,
  host: '0.0.0.0',  // Bind to all interfaces for Docker
  staticDir: './public',
  shellArgs: ['-l'],  // Login shell for proper prompt
  env: {
    PS1: '\\u@shelltender:\\w\\$ '  // Fallback prompt
  }
});

console.log(`
🍹 Shelltender v0.6.0 Server Running!

${url}

This demonstrates:
- Zero-config server setup
- Automatic session persistence
- Built-in health endpoints (/api/health)
- Pipeline integration for security
- WebSocket handling
`);