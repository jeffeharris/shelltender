import { useEffect, useRef, useState } from 'react';
import { WebSocketService, WebSocketServiceConfig } from '../services/WebSocketService.js';
import { useWebSocketConfig } from '../context/WebSocketContext.js';

let sharedWsService: WebSocketService | null = null;
let connectionCount = 0;

function getOrCreateWebSocketService(config: WebSocketServiceConfig): WebSocketService {
  if (!sharedWsService) {
    sharedWsService = new WebSocketService(config);
    sharedWsService.connect();
  }
  return sharedWsService;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { config } = useWebSocketConfig();
  
  
  // Get or create service synchronously to ensure it's always available
  const wsService = getOrCreateWebSocketService(config);

  useEffect(() => {
    connectionCount++;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    wsService.onConnect(handleConnect);
    wsService.onDisconnect(handleDisconnect);

    // Check initial connection state
    setIsConnected(wsService.isConnected());

    return () => {
      // Clean up event handlers
      wsService.removeConnectHandler(handleConnect);
      wsService.removeDisconnectHandler(handleDisconnect);
      
      connectionCount--;
      
      // Only disconnect if no other components are using it
      // Add a small delay to handle React StrictMode double-mounting
      if (connectionCount === 0 && sharedWsService) {
        const serviceToDisconnect = sharedWsService;
        setTimeout(() => {
          // Check again in case a new connection was made
          if (connectionCount === 0 && sharedWsService === serviceToDisconnect) {
            serviceToDisconnect.disconnect();
            sharedWsService = null;
          }
        }, 100);
      }
    };
  }, [wsService]);

  return {
    wsService,
    isConnected
  };
}