import React, { createContext, useContext, ReactNode } from 'react';

interface WebSocketConfig {
  url?: string;
  port?: string;
  protocol?: 'ws' | 'wss';
}

interface WebSocketContextValue {
  config: WebSocketConfig;
}

export const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  config?: WebSocketConfig;
}

export function WebSocketProvider({ children, config = {} }: WebSocketProviderProps) {
  const value: WebSocketContextValue = {
    config: config
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
    // Return empty config if not in provider
    return {
      config: {}
    };
  }
  return context;
}