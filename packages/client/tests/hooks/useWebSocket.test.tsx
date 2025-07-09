import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { WebSocketProvider } from '../../src/context/WebSocketContext';
import React from 'react';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WebSocketProvider url="ws://localhost:8080">
      {children}
    </WebSocketProvider>
  );

  it('should return WebSocket service immediately on first render', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    // Service should be available immediately
    expect(result.current.wsService).toBeDefined();
    expect(result.current.wsService).not.toBeNull();
  });

  it('should update connection state when WebSocket connects', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });

    // Initially not connected
    expect(result.current.isConnected).toBe(false);

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should be connected after WebSocket opens
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle multiple components using the same WebSocket service', () => {
    const { result: result1 } = renderHook(() => useWebSocket(), { wrapper });
    const { result: result2 } = renderHook(() => useWebSocket(), { wrapper });

    // Both should get the same service instance
    expect(result1.current.wsService).toBe(result2.current.wsService);
  });

  it('should not disconnect WebSocket when one component unmounts but others still use it', () => {
    const { result: result1, unmount: unmount1 } = renderHook(() => useWebSocket(), { wrapper });
    const { result: result2 } = renderHook(() => useWebSocket(), { wrapper });

    const disconnectSpy = vi.spyOn(result1.current.wsService!, 'disconnect');

    // Unmount first component
    unmount1();

    // Service should not be disconnected
    expect(disconnectSpy).not.toHaveBeenCalled();
    expect(result2.current.wsService).toBeDefined();
  });

  it('should disconnect WebSocket when all components unmount', () => {
    const { result: result1, unmount: unmount1 } = renderHook(() => useWebSocket(), { wrapper });
    const { result: result2, unmount: unmount2 } = renderHook(() => useWebSocket(), { wrapper });

    const disconnectSpy = vi.spyOn(result1.current.wsService!, 'disconnect');

    // Unmount both components
    unmount1();
    unmount2();

    // Service should be disconnected
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should clean up event handlers on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket(), { wrapper });

    const removeConnectSpy = vi.spyOn(result.current.wsService!, 'removeConnectHandler');
    const removeDisconnectSpy = vi.spyOn(result.current.wsService!, 'removeDisconnectHandler');

    unmount();

    // Event handlers should be cleaned up
    expect(removeConnectSpy).toHaveBeenCalled();
    expect(removeDisconnectSpy).toHaveBeenCalled();
  });

  it('should call connect handler immediately if already connected', async () => {
    const { result: result1 } = renderHook(() => useWebSocket(), { wrapper });

    // Wait for initial connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result1.current.isConnected).toBe(true);

    // Mount second component after connection is established
    const { result: result2 } = renderHook(() => useWebSocket(), { wrapper });

    // Second component should see connection immediately
    expect(result2.current.isConnected).toBe(true);
  });
});