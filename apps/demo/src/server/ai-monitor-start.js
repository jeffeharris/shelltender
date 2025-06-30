#!/usr/bin/env node
/**
 * Simple JavaScript starter for AI Monitor in Docker
 * This avoids TypeScript compilation issues in the container
 */

import { AIMonitorServer } from './ai-monitor-integration.js';
import { config as dotenv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.ai-monitor if it exists
dotenv({ path: path.join(process.cwd(), '.env.ai-monitor') });

// Build configuration from environment
const config = {
  httpPort: process.env.AI_MONITOR_HTTP_PORT 
    ? parseInt(process.env.AI_MONITOR_HTTP_PORT) 
    : 3001,
  
  wsHost: process.env.SHELLTENDER_WS_HOST || 'localhost',
  
  wsPort: process.env.SHELLTENDER_WS_PORT 
    ? parseInt(process.env.SHELLTENDER_WS_PORT) 
    : 8081,
  
  dataDir: process.env.AI_MONITOR_DATA_DIR || './shelltender-ai-monitor'
};

console.log('🔧 Starting AI Monitor with environment configuration:');
console.log(`  AI_MONITOR_HTTP_PORT=${config.httpPort}`);
console.log(`  SHELLTENDER_WS_HOST=${config.wsHost}`);
console.log(`  SHELLTENDER_WS_PORT=${config.wsPort}`);
console.log(`  AI_MONITOR_DATA_DIR=${config.dataDir}`);
console.log('');

// Start the server
const server = new AIMonitorServer(config);
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});