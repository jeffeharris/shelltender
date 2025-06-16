import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { TerminalEventService } from '../services/TerminalEventService';
import type { PatternConfig, AnyTerminalEvent } from '@shelltender/core';

export interface UseTerminalEventsOptions {
  maxEvents?: number;
}

export interface UseTerminalEventsReturn {
  events: AnyTerminalEvent[];
  registerPattern: (config: PatternConfig) => Promise<string>;
  unregisterPattern: (patternId: string) => Promise<void>;
  clearEvents: () => void;
  isConnected: boolean;
  getPatterns: () => Promise<Array<{ patternId: string; config: PatternConfig; sessionId: string }>>;
}

export function useTerminalEvents(sessionId: string, options?: UseTerminalEventsOptions): UseTerminalEventsReturn {
  const { wsService, isConnected } = useWebSocket();
  const [events, setEvents] = useState<AnyTerminalEvent[]>([]);
  const eventServiceRef = useRef<TerminalEventService | null>(null);
  const registeredPatterns = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wsService || !isConnected) return;

    // Create event service
    const eventService = new TerminalEventService(wsService!);
    eventServiceRef.current = eventService;

    // Subscribe to events for this session
    const maxEvents = options?.maxEvents || 1000;
    const unsubscribe = eventService.subscribeToSession(sessionId, (event) => {
      setEvents(prev => {
        const newEvents = [...prev, event];
        // Keep only the last maxEvents
        return newEvents.slice(-maxEvents);
      });
    });

    return () => {
      unsubscribe();
      // Cleanup registered patterns
      registeredPatterns.current.forEach(patternId => {
        eventService.unregisterPattern(patternId).catch(console.error);
      });
      registeredPatterns.current.clear();
    };
  }, [wsService, isConnected, sessionId]);

  const registerPattern = useCallback(async (config: PatternConfig) => {
    if (!eventServiceRef.current) {
      throw new Error('Event service not initialized');
    }

    const patternId = await eventServiceRef.current.registerPattern(sessionId, config);
    registeredPatterns.current.add(patternId);
    return patternId;
  }, [sessionId]);

  const unregisterPattern = useCallback(async (patternId: string) => {
    if (!eventServiceRef.current) {
      throw new Error('Event service not initialized');
    }

    await eventServiceRef.current.unregisterPattern(patternId);
    registeredPatterns.current.delete(patternId);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getPatterns = useCallback(async () => {
    if (!eventServiceRef.current) {
      throw new Error('Event service not initialized');
    }

    return eventServiceRef.current.getPatterns(sessionId);
  }, [sessionId]);

  return {
    events,
    registerPattern,
    unregisterPattern,
    clearEvents,
    isConnected,
    getPatterns
  };
}