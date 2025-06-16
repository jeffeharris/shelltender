import { useEffect, useRef, useState } from 'react';
import { WebSocketService } from '../services/WebSocketService';

let sharedWsService: WebSocketService | null = null;
let connectionCount = 0;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    // Use shared WebSocket instance
    if (!sharedWsService) {
      sharedWsService = new WebSocketService(); // Uses constructor defaults
      sharedWsService.connect();
    }

    connectionCount++;
    wsServiceRef.current = sharedWsService;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    sharedWsService.onConnect(handleConnect);
    sharedWsService.onDisconnect(handleDisconnect);

    // Check initial connection state
    setIsConnected(sharedWsService.isConnected());

    return () => {
      connectionCount--;
      
      // Only disconnect if no other components are using it
      if (connectionCount === 0 && sharedWsService) {
        sharedWsService.disconnect();
        sharedWsService = null;
      }
    };
  }, []);

  return {
    wsService: wsServiceRef.current,
    isConnected
  };
}