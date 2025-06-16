import { useRef, useEffect, RefObject } from 'react';

export interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: (x: number, y: number) => void;
  onTwoFingerTap?: (x: number, y: number) => void;
  onThreeFingerTap?: (x: number, y: number) => void;
  onPinchStart?: (scale: number) => void;
  onPinchMove?: (scale: number) => void;
  onPinchEnd?: (scale: number) => void;
  onSelectionStart?: (x: number, y: number) => void;
  onSelectionMove?: (x: number, y: number) => void;
  onSelectionEnd?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  initialDistance: number;
  isMoving: boolean;
  isLongPress: boolean;
  touchCount: number;
}

export function useTouchGestures(
  ref: RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onTwoFingerTap,
    onThreeFingerTap,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    onSelectionStart,
    onSelectionMove,
    onSelectionEnd,
    swipeThreshold = 50,
    longPressDelay = 500,
  } = options;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    initialDistance: 0,
    isMoving: false,
    isLongPress: false,
    touchCount: 0,
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Calculate distance between two touch points
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Get center point of multiple touches
    const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < touches.length; i++) {
        sumX += touches[i].clientX;
        sumY += touches[i].clientY;
      }
      return {
        x: sumX / touches.length,
        y: sumY / touches.length,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = e.touches;
      const center = getTouchCenter(touches);
      
      touchState.current = {
        startX: center.x,
        startY: center.y,
        startTime: Date.now(),
        initialDistance: getTouchDistance(touches),
        isMoving: false,
        isLongPress: false,
        touchCount: touches.length,
      };

      // Clear any existing long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      // Handle different touch counts
      if (touches.length === 1) {
        // Single touch - set up long press detection
        longPressTimer.current = setTimeout(() => {
          if (!touchState.current.isMoving) {
            touchState.current.isLongPress = true;
            if (onLongPress) {
              onLongPress(touches[0].clientX, touches[0].clientY);
            }
            if (onSelectionStart) {
              onSelectionStart(touches[0].clientX, touches[0].clientY);
            }
          }
        }, longPressDelay);
      } else if (touches.length === 2 && onPinchStart) {
        // Two fingers - potential pinch gesture
        onPinchStart(1);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touches = e.touches;
      const center = getTouchCenter(touches);
      
      const deltaX = center.x - touchState.current.startX;
      const deltaY = center.y - touchState.current.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Mark as moving if moved more than 10 pixels
      if (distance > 10) {
        touchState.current.isMoving = true;
        
        // Cancel long press if moving
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      // Handle pinch gesture
      if (touches.length === 2 && touchState.current.touchCount === 2) {
        const currentDistance = getTouchDistance(touches);
        if (currentDistance > 0 && touchState.current.initialDistance > 0) {
          const scale = currentDistance / touchState.current.initialDistance;
          if (onPinchMove) {
            onPinchMove(scale);
          }
        }
      }

      // Handle selection drag
      if (touchState.current.isLongPress && touches.length === 1 && onSelectionMove) {
        onSelectionMove(touches[0].clientX, touches[0].clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endTime = Date.now();
      const duration = endTime - touchState.current.startTime;
      const touches = e.changedTouches;
      const center = getTouchCenter(touches);
      
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // Handle selection end
      if (touchState.current.isLongPress && onSelectionEnd) {
        onSelectionEnd();
        return;
      }

      // Handle tap gestures (quick touch without movement)
      if (!touchState.current.isMoving && duration < 300) {
        if (touchState.current.touchCount === 2 && onTwoFingerTap) {
          onTwoFingerTap(center.x, center.y);
          return;
        } else if (touchState.current.touchCount === 3 && onThreeFingerTap) {
          onThreeFingerTap(center.x, center.y);
          return;
        }
      }

      // Handle swipe gestures
      if (touchState.current.isMoving && touchState.current.touchCount === 1) {
        const deltaX = center.x - touchState.current.startX;
        const deltaY = center.y - touchState.current.startY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > swipeThreshold || absY > swipeThreshold) {
          if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        }
      }

      // Handle pinch end
      if (touchState.current.touchCount === 2 && onPinchEnd) {
        const currentDistance = getTouchDistance(e.touches);
        if (currentDistance > 0 && touchState.current.initialDistance > 0) {
          const scale = currentDistance / touchState.current.initialDistance;
          onPinchEnd(scale);
        }
      }
    };

    const handleTouchCancel = () => {
      // Clear any timers and reset state
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      if (touchState.current.isLongPress && onSelectionEnd) {
        onSelectionEnd();
      }
    };

    // Add passive: false to prevent scrolling during gestures
    const options = { passive: false };
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', handleTouchCancel, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [
    ref,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    onTwoFingerTap,
    onThreeFingerTap,
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    onSelectionStart,
    onSelectionMove,
    onSelectionEnd,
    swipeThreshold,
    longPressDelay,
  ]);
}

// Helper hook for common terminal touch patterns
export function useTerminalTouchGestures(
  ref: RefObject<HTMLElement>,
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
    swipeThreshold: 75,
    longPressDelay: 400,
  });
}