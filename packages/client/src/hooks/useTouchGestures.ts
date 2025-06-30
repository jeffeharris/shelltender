import { useRef, useEffect, RefObject, useCallback } from 'react';
import { TOUCH_GESTURES } from '../constants/mobile.js';
import type { 
  TouchGestureOptions, 
  TouchState, 
  TouchEventHandlers 
} from './gestures/gestureTypes.js';
import {
  getTouchCenter,
  getTouchDistance,
  hasTouchMoved,
} from './gestures/gestureDetectors.js';
import {
  createInitialTouchState,
  updateTouchStart,
  updateTouchMove,
  updateLongPress,
} from './gestures/touchStateManager.js';
import {
  processTapGesture,
  processSwipeGesture,
  processPinchGesture,
  processSelectionGesture,
  handleLongPressTimeout,
  createLongPressTimer,
  clearLongPressTimer,
} from './gestures/gestureHandlers.js';

// Re-export types for backward compatibility
export type { TouchGestureOptions } from './gestures/gestureTypes.js';

/**
 * Hook for handling touch gestures on an element
 */
export function useTouchGestures(
  ref: RefObject<HTMLElement | null>,
  options: TouchGestureOptions = {}
) {
  const touchState = useRef<TouchState>(createInitialTouchState());
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Memoize options with defaults
  const gestureOptions = useRef<Required<TouchGestureOptions>>({
    ...options,
    swipeThreshold: options.swipeThreshold ?? TOUCH_GESTURES.SWIPE_THRESHOLD,
    longPressDelay: options.longPressDelay ?? TOUCH_GESTURES.LONG_PRESS_DELAY,
  } as Required<TouchGestureOptions>);

  // Update options ref when they change
  useEffect(() => {
    gestureOptions.current = {
      ...options,
      swipeThreshold: options.swipeThreshold ?? TOUCH_GESTURES.SWIPE_THRESHOLD,
      longPressDelay: options.longPressDelay ?? TOUCH_GESTURES.LONG_PRESS_DELAY,
    } as Required<TouchGestureOptions>;
  }, [options]);

  // Create memoized event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    
    // Prevent default for single touch to avoid text selection
    if (touches.length === 1) {
      e.preventDefault();
    }
    
    // Update touch state
    touchState.current = updateTouchStart(touches);
    
    // Clear any existing long press timer
    clearLongPressTimer(longPressTimer.current);
    longPressTimer.current = null;

    // Handle different touch counts
    if (touches.length === 1) {
      const touch = touches[0];
      longPressTimer.current = createLongPressTimer(() => {
        touchState.current = updateLongPress(touchState.current, true);
        handleLongPressTimeout(
          touchState.current,
          touch.clientX,
          touch.clientY,
          gestureOptions.current
        );
      }, gestureOptions.current.longPressDelay);
    } else if (touches.length === 2) {
      processPinchGesture(
        touchState.current,
        touches,
        'start',
        gestureOptions.current
      );
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    const center = getTouchCenter(touches);
    
    // Prevent scrolling when dragging
    if (touchState.current.isLongPress || touches.length > 1) {
      e.preventDefault();
    }
    
    // Check if touch has moved beyond threshold
    const hasMoved = hasTouchMoved(
      touchState.current.startX,
      touchState.current.startY,
      center.x,
      center.y
    );

    if (hasMoved) {
      touchState.current = updateTouchMove(touchState.current, true);
      clearLongPressTimer(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Handle pinch gesture
    if (touches.length === 2 && touchState.current.touchCount === 2) {
      processPinchGesture(
        touchState.current,
        touches,
        'move',
        gestureOptions.current
      );
    }

    // Handle selection drag
    if (touchState.current.isLongPress && touches.length === 1) {
      processSelectionGesture(
        touchState.current,
        touches[0].clientX,
        touches[0].clientY,
        'move',
        gestureOptions.current
      );
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const endTime = Date.now();
    const duration = endTime - touchState.current.startTime;
    const touches = e.changedTouches;
    const center = getTouchCenter(touches);
    
    clearLongPressTimer(longPressTimer.current);
    longPressTimer.current = null;

    // Handle selection end
    if (touchState.current.isLongPress) {
      processSelectionGesture(
        touchState.current,
        center.x,
        center.y,
        'end',
        gestureOptions.current
      );
      return;
    }

    // Try to process as tap gesture
    if (processTapGesture(
      touchState.current,
      touches,
      duration,
      gestureOptions.current
    )) {
      return;
    }

    // Try to process as swipe gesture
    processSwipeGesture(
      touchState.current,
      center.x,
      center.y,
      gestureOptions.current
    );

    // Handle pinch end
    if (touchState.current.touchCount === 2 && e.touches.length < 2) {
      processPinchGesture(
        touchState.current,
        e.touches,
        'end',
        gestureOptions.current
      );
    }
  }, []);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer(longPressTimer.current);
    longPressTimer.current = null;
    
    if (touchState.current.isLongPress) {
      processSelectionGesture(
        touchState.current,
        0,
        0,
        'end',
        gestureOptions.current
      );
    }
    
    touchState.current = createInitialTouchState();
  }, []);

  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Add passive: false to prevent scrolling during gestures
    const eventOptions = { passive: false };
    element.addEventListener('touchstart', handleTouchStart, eventOptions);
    element.addEventListener('touchmove', handleTouchMove, eventOptions);
    element.addEventListener('touchend', handleTouchEnd, eventOptions);
    element.addEventListener('touchcancel', handleTouchCancel, eventOptions);
    element.addEventListener('contextmenu', handleContextMenu, eventOptions);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      element.removeEventListener('contextmenu', handleContextMenu);
      
      clearLongPressTimer(longPressTimer.current);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, handleContextMenu]);
}

/**
 * Helper hook for common terminal touch patterns
 */
export function useTerminalTouchGestures(
  ref: RefObject<HTMLElement | null>,
  options: {
    onCopy?: () => void;
    onPaste?: () => void;
    onNextSession?: () => void;
    onPrevSession?: () => void;
    onContextMenu?: (x: number, y: number) => void;
  } = {}
) {
  const { onCopy, onPaste, onNextSession, onPrevSession, onContextMenu } = options;

  useTouchGestures(ref, {
    onTwoFingerTap: onCopy,
    onThreeFingerTap: onPaste,
    onSwipeLeft: onNextSession,
    onSwipeRight: onPrevSession,
    onLongPress: onContextMenu,
    swipeThreshold: TOUCH_GESTURES.SWIPE_THRESHOLD,
    longPressDelay: TOUCH_GESTURES.LONG_PRESS_DELAY,
  });
}