#!/usr/bin/env node

/**
 * Test script for Shelltender Monitor Mode
 * 
 * This script demonstrates how to connect as a monitor client
 * and receive all terminal output across all sessions.
 */

const WebSocket = require('ws');

// Configuration
const WS_URL = process.env.SHELLTENDER_WS_URL || 'ws://localhost:8080';
const AUTH_KEY = process.env.SHELLTENDER_MONITOR_AUTH_KEY || 'default-monitor-key';

console.log('🔍 Shelltender Monitor Mode Test');
console.log('================================');
console.log(`Connecting to: ${WS_URL}`);
console.log(`Auth key: ${AUTH_KEY.substring(0, 3)}...`);
console.log('');

// Connect to WebSocket
const ws = new WebSocket(WS_URL);

// Track sessions we've seen
const sessions = new Map();

ws.on('open', () => {
  console.log('✅ Connected to Shelltender WebSocket');
  
  // Enable monitor mode
  console.log('🔐 Requesting monitor mode...');
  ws.send(JSON.stringify({
    type: 'monitor-all',
    authKey: AUTH_KEY
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    switch (message.type) {
      case 'monitor-mode-enabled':
        console.log('✅ Monitor mode enabled!');
        console.log(`📊 Currently tracking ${message.sessionCount} sessions`);
        console.log('');
        console.log('Waiting for terminal output...');
        console.log('(Start typing in any terminal to see output here)');
        console.log('');
        break;
        
      case 'session-output':
        // Track session
        if (!sessions.has(message.sessionId)) {
          sessions.set(message.sessionId, { 
            firstSeen: new Date(),
            lastSeen: new Date(),
            outputCount: 0
          });
          console.log(`\n🆕 New session detected: ${message.sessionId}`);
        }
        
        const session = sessions.get(message.sessionId);
        session.lastSeen = new Date();
        session.outputCount++;
        
        // Display output with session info
        const output = message.data.replace(/\n/g, '\\n').substring(0, 100);
        console.log(`[${message.sessionId.substring(0, 8)}...] ${output}${message.data.length > 100 ? '...' : ''}`);
        
        // Example: Detect AI patterns
        if (message.data.includes('✻ Thinking')) {
          console.log(`  🤖 AI DETECTED: Claude is thinking in session ${message.sessionId}`);
        }
        if (message.data.includes('Would you like me to')) {
          console.log(`  🤖 AI DETECTED: Claude asking for confirmation in session ${message.sessionId}`);
        }
        break;
        
      case 'error':
        console.error('❌ Error:', message.data);
        if (message.data.includes('authentication')) {
          console.error('   Check your SHELLTENDER_MONITOR_AUTH_KEY environment variable');
        }
        break;
        
      default:
        console.log('📨 Received:', message.type, message);
    }
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`\n❌ Disconnected (code: ${code}, reason: ${reason})`);
  console.log(`\n📊 Session Summary:`);
  console.log(`   Total sessions seen: ${sessions.size}`);
  
  sessions.forEach((info, id) => {
    const duration = (info.lastSeen - info.firstSeen) / 1000;
    console.log(`   - ${id.substring(0, 8)}: ${info.outputCount} outputs over ${duration.toFixed(1)}s`);
  });
  
  process.exit(code === 1000 ? 0 : 1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down monitor...');
  ws.close();
});

// Instructions
console.log('\n📌 Instructions:');
console.log('1. Make sure Shelltender is running');
console.log('2. Open some terminal sessions');
console.log('3. Type in the terminals to see output here');
console.log('4. Press Ctrl+C to stop monitoring');
console.log('');