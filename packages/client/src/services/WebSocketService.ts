import type { TerminalData, WebSocketMessage } from '@shelltender/core';

type MessageHandler = (data: any) => void;

export interface WebSocketServiceConfig {
  url?: string;
  port?: string;
  protocol?: 'ws' | 'wss';
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: WebSocketMessage[] = [];
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private onConnectHandler: (() => void) | null = null;
  private onDisconnectHandler: (() => void) | null = null;

  constructor(config: WebSocketServiceConfig = {}) {
    if (config.url) {
      this.url = config.url;
    } else {
      const protocol = config.protocol || (window.location.protocol === 'https:' ? 'wss' : 'ws');
      const host = window.location.hostname;
      const port = config.port || '8081';
      this.url = `${protocol}://${host}:${port}`;
    }
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      // WebSocket connection error
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      if (this.onConnectHandler) {
        this.onConnectHandler();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        // Error parsing WebSocket message
      }
    };

    this.ws.onclose = () => {
      if (this.onDisconnectHandler) {
        this.onDisconnectHandler();
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      // WebSocket error
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.connect(), delay);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  send(data: WebSocketMessage): void {
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const serialized = JSON.stringify(data);
        this.ws.send(serialized);
      } catch (error) {
        // Failed to send message
      }
    } else {
      this.messageQueue.push(data);
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  off(type: string, handler: MessageHandler): void {
    this.messageHandlers.get(type)?.delete(handler);
  }

  private handleMessage(data: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }


  onConnect(handler: () => void): void {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandler = handler;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}