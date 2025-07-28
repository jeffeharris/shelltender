import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { WebSocketServer } from '../WebSocketServer.js';
import { SessionManager } from '../SessionManager.js';
import { BufferManager } from '../BufferManager.js';
import { EventManager } from '../events/EventManager.js';
import { SessionStore } from '../SessionStore.js';
import * as path from 'path';
import * as os from 'os';

describe('Multi-Session WebSocket Support', () => {
  let wss: WebSocketServer;
  let sessionManager: SessionManager;
  let bufferManager: BufferManager;
  let eventManager: EventManager;
  let sessionStore: SessionStore;
  let client: WebSocket;
  const port = 18765; // Different port to avoid conflicts

  beforeEach(async () => {
    const tempDir = path.join(os.tmpdir(), `shelltender-test-${Date.now()}`);
    sessionStore = new SessionStore(tempDir);
    sessionManager = new SessionManager(sessionStore);
    bufferManager = new BufferManager();
    eventManager = new EventManager();
    wss = WebSocketServer.create(port, sessionManager, bufferManager, eventManager, sessionStore);
    
    // Manually connect session output to WebSocket broadcasting
    sessionManager.on('data', (sessionId: string, data: string) => {
      // Add to buffer and get sequence number
      const sequence = bufferManager.addToBuffer(sessionId, data);
      
      // Broadcast to connected clients
      wss.broadcastToSession(sessionId, {
        type: 'output',
        sessionId,
        data,
        sequence
      });
    });
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
    // Clean up all sessions
    sessionManager.getAllSessions().forEach(session => {
      try {
        sessionManager.killSession(session.id);
      } catch (e) {
        // Session might already be closed
      }
    });
    
    // Close the WebSocket server
    if (wss) {
      (wss as any).wss.close();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should allow a single client to subscribe to multiple sessions', async () => {
    const receivedMessages: any[] = [];
    
    // Connect client
    client = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve) => {
      client.on('open', resolve);
    });

    // Collect all messages
    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      receivedMessages.push(message);
    });

    // Create first session
    client.send(JSON.stringify({
      type: 'create',
      options: { id: 'session1' }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second session
    client.send(JSON.stringify({
      type: 'create',
      options: { id: 'session2' }
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Connect to both sessions
    client.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session1'
    }));

    client.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session2'
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear received messages before test
    receivedMessages.length = 0;

    // Write to both sessions
    sessionManager.writeToSession('session1', 'Hello from session 1');
    sessionManager.writeToSession('session2', 'Hello from session 2');

    // Wait for messages to be received
    await new Promise(resolve => setTimeout(resolve, 100));

    // Filter output messages
    const outputMessages = receivedMessages.filter(msg => msg.type === 'output');
    
    // Should receive output from both sessions
    expect(outputMessages.length).toBe(2);
    
    const session1Output = outputMessages.find(msg => msg.sessionId === 'session1');
    const session2Output = outputMessages.find(msg => msg.sessionId === 'session2');
    
    expect(session1Output).toBeDefined();
    expect(session1Output?.data).toBe('Hello from session 1');
    
    expect(session2Output).toBeDefined();
    expect(session2Output?.data).toBe('Hello from session 2');
  });

  it('should handle selective session disconnection', async () => {
    const receivedMessages: any[] = [];
    
    // Connect client
    client = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve) => {
      client.on('open', resolve);
    });

    // Collect all messages
    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      receivedMessages.push(message);
    });

    // Create and connect to two sessions
    client.send(JSON.stringify({
      type: 'create',
      options: { id: 'session1' }
    }));

    client.send(JSON.stringify({
      type: 'create',
      options: { id: 'session2' }
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    client.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session1'
    }));

    client.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session2'
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Disconnect from session1 only
    client.send(JSON.stringify({
      type: 'disconnect',
      sessionId: 'session1'
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear received messages
    receivedMessages.length = 0;

    // Write to both sessions
    sessionManager.writeToSession('session1', 'Should not receive this');
    sessionManager.writeToSession('session2', 'Should receive this');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only receive output from session2
    const outputMessages = receivedMessages.filter(msg => msg.type === 'output');
    expect(outputMessages.length).toBe(1);
    expect(outputMessages[0].sessionId).toBe('session2');
    expect(outputMessages[0].data).toBe('Should receive this');
  });

  it('should correctly count clients across multiple sessions', async () => {
    // Connect first client
    const client1 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => {
      client1.on('open', resolve);
    });

    // Connect second client
    const client2 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => {
      client2.on('open', resolve);
    });

    // Create sessions
    client1.send(JSON.stringify({
      type: 'create',
      options: { id: 'session1' }
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Client1 connects to session1
    client1.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session1'
    }));

    // Client2 connects to session1
    client2.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session1'
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Both clients should be counted for session1
    expect(wss.getSessionClientCount('session1')).toBe(2);

    // Client1 also connects to a new session
    client1.send(JSON.stringify({
      type: 'create',
      options: { id: 'session2' }
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    client1.send(JSON.stringify({
      type: 'connect',
      sessionId: 'session2'
    }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // Check counts
    expect(wss.getSessionClientCount('session1')).toBe(2);
    expect(wss.getSessionClientCount('session2')).toBe(1);

    // Check clients by session map
    const clientsBySession = wss.getClientsBySession();
    expect(clientsBySession.get('session1')).toBe(2);
    expect(clientsBySession.get('session2')).toBe(1);

    // Cleanup
    client1.close();
    client2.close();
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});