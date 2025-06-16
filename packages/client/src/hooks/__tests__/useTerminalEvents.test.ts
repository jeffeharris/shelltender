import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTerminalEvents } from '../useTerminalEvents';
import { useWebSocket } from '../useWebSocket';
import type { PatternMatchEvent } from '@shelltender/core';

// Mock useWebSocket hook
vi.mock('../useWebSocket');

// Mock TerminalEventService
vi.mock('../../services/TerminalEventService', () => {
  return {
    TerminalEventService: vi.fn()
  };
});

describe('useTerminalEvents', () => {
  let mockWsService: any;
  let mockSubscribeToSession: any;
  let mockRegisterPattern: any;
  let mockUnregisterPattern: any;
  let eventCallback: ((event: any) => void) | null = null;

  beforeEach(async () => {
    const unsubscribeFn = vi.fn();
    
    mockSubscribeToSession = vi.fn((sessionId, callback) => {
      eventCallback = callback;
      return unsubscribeFn; // unsubscribe function
    });

    mockRegisterPattern = vi.fn().mockResolvedValue('pattern-123');
    mockUnregisterPattern = vi.fn().mockResolvedValue(undefined);

    mockWsService = {
      on: vi.fn(),
      off: vi.fn(),
      send: vi.fn()
    };

    // Set up TerminalEventService mock implementation
    const { TerminalEventService } = vi.mocked(await import('../../services/TerminalEventService'));
    (TerminalEventService as any).mockImplementation(() => ({
      subscribeToSession: mockSubscribeToSession,
      registerPattern: mockRegisterPattern,
      unregisterPattern: mockUnregisterPattern,
      getPatterns: vi.fn().mockResolvedValue([])
    }));

    (useWebSocket as any).mockReturnValue({
      wsService: mockWsService,
      isConnected: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty events and connected state', () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    expect(result.current.events).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('should not create service when disconnected', () => {
    (useWebSocket as any).mockReturnValue({
      wsService: mockWsService,
      isConnected: false
    });

    const { result } = renderHook(() => useTerminalEvents('session-1'));

    expect(result.current.isConnected).toBe(false);
    expect(mockSubscribeToSession).not.toHaveBeenCalled();
  });

  it('should subscribe to session events', () => {
    renderHook(() => useTerminalEvents('session-1'));

    expect(mockSubscribeToSession).toHaveBeenCalledWith('session-1', expect.any(Function));
  });

  it('should add events to state when received', () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    const mockEvent: PatternMatchEvent = {
      type: 'pattern-match',
      sessionId: 'session-1',
      patternId: 'pattern-123',
      patternName: 'test-pattern',
      timestamp: Date.now(),
      match: 'test match',
      position: 0
    };

    act(() => {
      if (eventCallback) {
        eventCallback(mockEvent);
      }
    });

    expect(result.current.events).toEqual([mockEvent]);
  });

  it('should register pattern and track it', async () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    const config = {
      name: 'test-pattern',
      type: 'regex' as const,
      pattern: /test/
    };

    let patternId: string;
    await act(async () => {
      patternId = await result.current.registerPattern(config);
    });

    expect(mockRegisterPattern).toHaveBeenCalledWith('session-1', config);
    expect(patternId!).toBe('pattern-123');
  });

  it('should unregister pattern', async () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    await act(async () => {
      await result.current.unregisterPattern('pattern-123');
    });

    expect(mockUnregisterPattern).toHaveBeenCalledWith('pattern-123');
  });

  it('should clear events', () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    // Add some events first
    const mockEvent: PatternMatchEvent = {
      type: 'pattern-match',
      sessionId: 'session-1',
      patternId: 'pattern-123',
      patternName: 'test-pattern',
      timestamp: Date.now(),
      match: 'test match',
      position: 0
    };

    act(() => {
      if (eventCallback) {
        eventCallback(mockEvent);
      }
    });

    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toEqual([]);
  });

  it('should cleanup patterns on unmount', async () => {
    const { result, unmount } = renderHook(() => useTerminalEvents('session-1'));

    // Register a pattern
    await act(async () => {
      await result.current.registerPattern({
        name: 'test-pattern',
        type: 'regex',
        pattern: /test/
      });
    });

    // Unmount
    unmount();

    // Should have called unregisterPattern
    expect(mockUnregisterPattern).toHaveBeenCalledWith('pattern-123');
  });

  it('should throw error if service not initialized', async () => {
    (useWebSocket as any).mockReturnValue({
      wsService: null,
      isConnected: false
    });

    const { result } = renderHook(() => useTerminalEvents('session-1'));

    await expect(
      act(async () => {
        await result.current.registerPattern({
          name: 'test',
          type: 'regex',
          pattern: /test/
        });
      })
    ).rejects.toThrow('Event service not initialized');
  });

  it('should respect maxEvents option', () => {
    const { result } = renderHook(() => useTerminalEvents('session-1', { maxEvents: 3 }));

    // Add 5 events
    for (let i = 0; i < 5; i++) {
      const mockEvent: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: `pattern-${i}`,
        patternName: 'test-pattern',
        timestamp: Date.now() + i,
        match: `test match ${i}`,
        position: i
      };

      act(() => {
        if (eventCallback) {
          eventCallback(mockEvent);
        }
      });
    }

    // Should only keep the last 3 events
    expect(result.current.events).toHaveLength(3);
    expect(result.current.events[0].match).toBe('test match 2');
    expect(result.current.events[1].match).toBe('test match 3');
    expect(result.current.events[2].match).toBe('test match 4');
  });

  it('should use default maxEvents of 1000', () => {
    const { result } = renderHook(() => useTerminalEvents('session-1'));

    // Add 1005 events
    for (let i = 0; i < 1005; i++) {
      const mockEvent: PatternMatchEvent = {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: `pattern-${i}`,
        patternName: 'test-pattern',
        timestamp: Date.now() + i,
        match: `test match ${i}`,
        position: i
      };

      act(() => {
        if (eventCallback) {
          eventCallback(mockEvent);
        }
      });
    }

    // Should only keep the last 1000 events
    expect(result.current.events).toHaveLength(1000);
    expect(result.current.events[0].match).toBe('test match 5');
    expect(result.current.events[999].match).toBe('test match 1004');
  });
});