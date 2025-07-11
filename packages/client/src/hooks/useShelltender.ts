import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { Terminal as XTerm } from '@xterm/xterm';

interface SessionOutput {
  [sessionId: string]: string;
}

/**
 * Unified hook that provides all Shelltender functionality
 * Combines WebSocket, session management, and terminal operations
 */
export function useShelltender() {
  const { wsService: service, isConnected } = useWebSocket();
  const isConnecting = !isConnected && !!service;
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [output, setOutput] = useState<SessionOutput>({});
  const terminalRef = useRef<XTerm | null>(null);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!service) return;

    const handleMessage = (message: any) => {
      if (message.type === 'output' && message.sessionId) {
        setOutput(prev => ({
          ...prev,
          [message.sessionId]: (prev[message.sessionId] || '') + message.data
        }));
      } else if (message.type === 'created' || message.type === 'connected') {
        const sessionId = message.sessionId;
        setSessions(prev => 
          prev.includes(sessionId) ? prev : [...prev, sessionId]
        );
        if (!activeSession) {
          setActiveSession(sessionId);
        }
      } else if (message.type === 'sessionEnded') {
        const sessionId = message.sessionId;
        setSessions(prev => prev.filter(id => id !== sessionId));
        if (activeSession === sessionId) {
          setActiveSession(sessions[0] || null);
        }
        setOutput(prev => {
          const newOutput = { ...prev };
          delete newOutput[sessionId];
          return newOutput;
        });
      }
    };

    // Subscribe to all messages
    service.on('message', handleMessage);

    return () => {
      service.off('message', handleMessage);
    };
  }, [service, activeSession, sessions]);

  // Create a new session
  const createSession = useCallback(async (options?: any): Promise<string> => {
    if (!service) throw new Error('Not connected');
    
    const sessionId = options?.id || `session-${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 5000);

      const handleResponse = (message: any) => {
        if (message.type === 'created' && message.sessionId === sessionId) {
          clearTimeout(timeout);
          service.off('message', handleResponse);
          resolve(sessionId);
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          service.off('message', handleResponse);
          reject(new Error(message.data));
        }
      };

      service.on('message', handleResponse);
      service.send({
        type: 'create',
        options: { id: sessionId, ...options }
      });
    });
  }, [service]);

  // Send a command (adds newline automatically)
  const sendCommand = useCallback(async (command: string, sessionId?: string) => {
    if (!service) throw new Error('Not connected');
    
    const targetSession = sessionId || activeSession;
    if (!targetSession) throw new Error('No active session');
    
    service.send({
      type: 'input',
      sessionId: targetSession,
      data: command + '\n'
    });
  }, [service, activeSession]);

  // Send raw input
  const sendInput = useCallback(async (input: string, sessionId?: string) => {
    if (!service) throw new Error('Not connected');
    
    const targetSession = sessionId || activeSession;
    if (!targetSession) throw new Error('No active session');
    
    service.send({
      type: 'input', 
      sessionId: targetSession,
      data: input
    });
  }, [service, activeSession]);

  // Kill a session
  const killSession = useCallback(async (sessionId?: string) => {
    if (!service) throw new Error('Not connected');
    
    const targetSession = sessionId || activeSession;
    if (!targetSession) throw new Error('No session to kill');
    
    service.send({
      type: 'disconnect',
      sessionId: targetSession
    });
  }, [service, activeSession]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (service) {
      service.disconnect();
    }
  }, [service]);

  // Clear output for a session
  const clearOutput = useCallback((sessionId?: string) => {
    const targetSession = sessionId || activeSession;
    if (!targetSession) return;
    
    setOutput(prev => ({
      ...prev,
      [targetSession]: ''
    }));
  }, [activeSession]);

  // Switch active session
  const switchSession = useCallback((sessionId: string) => {
    if (sessions.includes(sessionId)) {
      setActiveSession(sessionId);
    }
  }, [sessions]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    
    // Session data
    sessions,
    activeSession,
    output,
    
    // Actions
    createSession,
    sendCommand,
    sendInput,
    killSession,
    disconnect,
    clearOutput,
    switchSession,
    
    // Terminal ref for advanced usage
    terminalRef,
    
    // Raw service for advanced usage
    service
  };
}