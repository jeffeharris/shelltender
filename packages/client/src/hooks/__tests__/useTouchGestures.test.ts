import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTouchGestures, useTerminalTouchGestures } from '../useTouchGestures';
import { useRef } from 'react';

// Helper to create mock touch event
function createTouchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }> = []
): TouchEvent {
  const touchList = touches.map((touch, index) => ({
    identifier: index,
    target: document.body,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  }));

  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  event.touches = touchList;
  event.changedTouches = touchList;
  event.targetTouches = touchList;
  
  return event as TouchEvent;
}

describe('useTouchGestures', () => {
  let element: HTMLDivElement;
  
  beforeEach(() => {
    vi.useFakeTimers();
    element = document.createElement('div');
    document.body.appendChild(element);
  });
  
  afterEach(() => {
    vi.useRealTimers();
    document.body.removeChild(element);
  });
  
  it('detects swipe left', () => {
    const onSwipeLeft = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onSwipeLeft });
      return ref;
    });
    
    // Simulate swipe left
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 100, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 30, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 20, clientY: 50 }])
    );
    
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });
  
  it('detects swipe right', () => {
    const onSwipeRight = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onSwipeRight });
      return ref;
    });
    
    // Simulate swipe right
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 20, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 90, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 100, clientY: 50 }])
    );
    
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });
  
  it('detects swipe up', () => {
    const onSwipeUp = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onSwipeUp });
      return ref;
    });
    
    // Simulate swipe up
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 100 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 50, clientY: 30 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 50, clientY: 20 }])
    );
    
    expect(onSwipeUp).toHaveBeenCalledTimes(1);
  });
  
  it('detects swipe down', () => {
    const onSwipeDown = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onSwipeDown });
      return ref;
    });
    
    // Simulate swipe down
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 20 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 50, clientY: 90 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }])
    );
    
    expect(onSwipeDown).toHaveBeenCalledTimes(1);
  });
  
  it('respects swipe threshold', () => {
    const onSwipeLeft = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onSwipeLeft, swipeThreshold: 100 });
      return ref;
    });
    
    // Small swipe - should not trigger
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 100, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 70, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 60, clientY: 50 }])
    );
    
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
  
  it('detects long press', () => {
    const onLongPress = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onLongPress, longPressDelay: 500 });
      return ref;
    });
    
    // Start touch
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 50 }])
    );
    
    // Long press not triggered yet
    vi.advanceTimersByTime(400);
    expect(onLongPress).not.toHaveBeenCalled();
    
    // Long press triggered
    vi.advanceTimersByTime(100);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(50, 50);
  });
  
  it('cancels long press on movement', () => {
    const onLongPress = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onLongPress, longPressDelay: 500 });
      return ref;
    });
    
    // Start touch
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 50 }])
    );
    
    // Move before long press triggers
    vi.advanceTimersByTime(200);
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 100, clientY: 50 }])
    );
    
    // Advance past long press delay
    vi.advanceTimersByTime(400);
    expect(onLongPress).not.toHaveBeenCalled();
  });
  
  it('detects two-finger tap', () => {
    const onTwoFingerTap = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onTwoFingerTap });
      return ref;
    });
    
    // Two-finger tap
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    
    expect(onTwoFingerTap).toHaveBeenCalledTimes(1);
    expect(onTwoFingerTap).toHaveBeenCalledWith(50, 50); // Center point
  });
  
  it('detects three-finger tap', () => {
    const onThreeFingerTap = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onThreeFingerTap });
      return ref;
    });
    
    // Three-finger tap
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 30, clientY: 50 },
        { clientX: 50, clientY: 50 },
        { clientX: 70, clientY: 50 },
      ])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [
        { clientX: 30, clientY: 50 },
        { clientX: 50, clientY: 50 },
        { clientX: 70, clientY: 50 },
      ])
    );
    
    expect(onThreeFingerTap).toHaveBeenCalledTimes(1);
    expect(onThreeFingerTap).toHaveBeenCalledWith(50, 50); // Center point
  });
  
  it('handles pinch gesture', () => {
    const onPinchStart = vi.fn();
    const onPinchMove = vi.fn();
    const onPinchEnd = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onPinchStart, onPinchMove, onPinchEnd });
      return ref;
    });
    
    // Start pinch
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    
    expect(onPinchStart).toHaveBeenCalledWith(1);
    
    // Pinch out (zoom in)
    element.dispatchEvent(
      createTouchEvent('touchmove', [
        { clientX: 30, clientY: 50 },
        { clientX: 70, clientY: 50 },
      ])
    );
    
    expect(onPinchMove).toHaveBeenCalled();
    const scale = onPinchMove.mock.calls[0][0];
    expect(scale).toBeGreaterThan(1);
  });
  
  it('handles selection gestures', () => {
    const onSelectionStart = vi.fn();
    const onSelectionMove = vi.fn();
    const onSelectionEnd = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, {
        onLongPress: vi.fn(),
        onSelectionStart,
        onSelectionMove,
        onSelectionEnd,
        longPressDelay: 500,
      });
      return ref;
    });
    
    // Start long press
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 50 }])
    );
    
    // Trigger long press
    vi.advanceTimersByTime(500);
    expect(onSelectionStart).toHaveBeenCalledWith(50, 50);
    
    // Move to select
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 100, clientY: 50 }])
    );
    expect(onSelectionMove).toHaveBeenCalledWith(100, 50);
    
    // End selection
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 100, clientY: 50 }])
    );
    expect(onSelectionEnd).toHaveBeenCalled();
  });
  
  it('handles touch cancel', () => {
    const onSelectionEnd = vi.fn();
    const onLongPress = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, {
        onLongPress,
        onSelectionEnd,
        longPressDelay: 500,
      });
      return ref;
    });
    
    // Start touch
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 50 }])
    );
    
    // Trigger long press
    vi.advanceTimersByTime(500);
    
    // Cancel touch
    element.dispatchEvent(new Event('touchcancel', { bubbles: true }));
    expect(onSelectionEnd).toHaveBeenCalled();
  });
  
  it('ignores taps that take too long', () => {
    const onTwoFingerTap = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, { onTwoFingerTap });
      return ref;
    });
    
    // Two-finger touch
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    
    // Wait too long
    vi.advanceTimersByTime(400);
    
    element.dispatchEvent(
      createTouchEvent('touchend', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    
    expect(onTwoFingerTap).not.toHaveBeenCalled();
  });
  
  it('cleans up on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');
    
    const { unmount } = renderHook(() => {
      const ref = useRef(element);
      useTouchGestures(ref, {});
      return ref;
    });
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function));
  });
});

describe('useTerminalTouchGestures', () => {
  let element: HTMLDivElement;
  
  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });
  
  afterEach(() => {
    document.body.removeChild(element);
  });
  
  it('maps two-finger tap to copy', () => {
    const onCopy = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTerminalTouchGestures(ref, { onCopy });
      return ref;
    });
    
    // Two-finger tap
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [
        { clientX: 40, clientY: 50 },
        { clientX: 60, clientY: 50 },
      ])
    );
    
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
  
  it('maps three-finger tap to paste', () => {
    const onPaste = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTerminalTouchGestures(ref, { onPaste });
      return ref;
    });
    
    // Three-finger tap
    element.dispatchEvent(
      createTouchEvent('touchstart', [
        { clientX: 30, clientY: 50 },
        { clientX: 50, clientY: 50 },
        { clientX: 70, clientY: 50 },
      ])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [
        { clientX: 30, clientY: 50 },
        { clientX: 50, clientY: 50 },
        { clientX: 70, clientY: 50 },
      ])
    );
    
    expect(onPaste).toHaveBeenCalledTimes(1);
  });
  
  it('maps swipe gestures to session navigation', () => {
    const onNextSession = vi.fn();
    const onPrevSession = vi.fn();
    
    renderHook(() => {
      const ref = useRef(element);
      useTerminalTouchGestures(ref, { onNextSession, onPrevSession });
      return ref;
    });
    
    // Swipe left for next session
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 200, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 100, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 50, clientY: 50 }])
    );
    
    expect(onNextSession).toHaveBeenCalledTimes(1);
    
    // Swipe right for previous session
    element.dispatchEvent(
      createTouchEvent('touchstart', [{ clientX: 50, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchmove', [{ clientX: 150, clientY: 50 }])
    );
    element.dispatchEvent(
      createTouchEvent('touchend', [{ clientX: 200, clientY: 50 }])
    );
    
    expect(onPrevSession).toHaveBeenCalledTimes(1);
  });
});