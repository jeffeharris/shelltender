import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTouchGestures } from '../useTouchGestures.js';

describe('useTouchGestures', () => {
  let element: HTMLDivElement;
  let onLongPress: ReturnType<typeof vi.fn>;
  let onSwipeLeft: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    // Create a mock element
    element = document.createElement('div');
    document.body.appendChild(element);
    
    // Create mock callbacks
    onLongPress = vi.fn();
    onSwipeLeft = vi.fn();
    
    // Mock timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    document.body.removeChild(element);
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  
  it('should trigger long press with correct coordinates', () => {
    const ref = { current: element };
    
    renderHook(() => useTouchGestures(ref, {
      onLongPress,
      longPressDelay: 400,
    }));
    
    // Simulate touch start at specific coordinates
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200 } as Touch],
      bubbles: true,
    });
    
    act(() => {
      element.dispatchEvent(touchStartEvent);
    });
    
    // Long press shouldn't fire immediately
    expect(onLongPress).not.toHaveBeenCalled();
    
    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(400);
    });
    
    // Long press should fire with the original coordinates
    expect(onLongPress).toHaveBeenCalledWith(100, 200);
  });
  
  it('should not trigger long press if user moves', () => {
    const ref = { current: element };
    
    renderHook(() => useTouchGestures(ref, {
      onLongPress,
      longPressDelay: 400,
    }));
    
    // Start touch
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200 } as Touch],
      bubbles: true,
    });
    
    act(() => {
      element.dispatchEvent(touchStartEvent);
    });
    
    // Move touch significantly
    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 150, clientY: 250 } as Touch],
      bubbles: true,
    });
    
    act(() => {
      element.dispatchEvent(touchMoveEvent);
    });
    
    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(400);
    });
    
    // Long press should not fire
    expect(onLongPress).not.toHaveBeenCalled();
  });
  
  it('should prevent context menu', () => {
    const ref = { current: element };
    
    renderHook(() => useTouchGestures(ref, {
      onLongPress,
    }));
    
    // Create context menu event
    const contextMenuEvent = new Event('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    
    // Spy on preventDefault
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
    
    act(() => {
      element.dispatchEvent(contextMenuEvent);
    });
    
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});