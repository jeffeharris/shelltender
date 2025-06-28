// Test importing from npm packages
import { SessionManager, BufferManager } from '@shelltender/server';
import { Terminal, SessionTabs } from '@shelltender/client';
import { MessageType, SessionOptions } from '@shelltender/core';

console.log('✅ All imports successful!');
console.log('Available exports:');
console.log('- Server:', { SessionManager, BufferManager });
console.log('- Client:', { Terminal, SessionTabs });
console.log('- Core:', { MessageType, SessionOptions });