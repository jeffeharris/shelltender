import React, { createContext, useContext, ReactNode } from 'react';

interface WebSocketConfig {
  url?: string;
  port?: string;
  protocol?: 'ws' | 'wss';
}

interface WebSocketContextValue {
  config: WebSocketConfig;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  config?: WebSocketConfig;
}

export function WebSocketProvider({ children, config = {} }: WebSocketProviderProps) {
  const value: WebSocketContextValue = {
    config: {
      port: '8081',
      ...config
    }
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketConfig() {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return defaults if not in provider
    return {
      config: {
        port: '8081'
      }
    };
  }
  return context;
}