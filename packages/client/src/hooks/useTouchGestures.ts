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

// Helper functions extracted from the main hook
const getTouchDistance = (touches: TouchList): number => {
  if (touches.length < 2) return 0;
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

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

// Gesture detection functions
const detectSwipeDirection = (
  deltaX: number,
  deltaY: number,
  threshold: number
): 'left' | 'right' | 'up' | 'down' | null => {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX <= threshold && absY <= threshold) return null;

  if (absX > absY) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
};

const isQuickTap = (duration: number, isMoving: boolean): boolean => {
  return !isMoving && duration < 300;
};

// Touch event handlers factory
const createTouchHandlers = (
  touchState: React.MutableRefObject<TouchState>,
  longPressTimer: React.MutableRefObject<NodeJS.Timeout | null>,
  options: TouchGestureOptions
) => {
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

  const startLongPressTimer = (x: number, y: number) => {
    longPressTimer.current = setTimeout(() => {
      if (!touchState.current.isMoving) {
        touchState.current.isLongPress = true;
        onLongPress?.(x, y);
        onSelectionStart?.(x, y);
      }
    }, longPressDelay);
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touches = e.touches;
    const center = getTouchCenter(touches);
    
    // Prevent default for single touch to avoid text selection
    if (touches.length === 1) {
      e.preventDefault();
    }
    
    touchState.current = {
      startX: center.x,
      startY: center.y,
      startTime: Date.now(),
      initialDistance: getTouchDistance(touches),
      isMoving: false,
      isLongPress: false,
      touchCount: touches.length,
    };

    clearLongPressTimer();

    // Handle different touch counts
    if (touches.length === 1) {
      const touchX = touches[0].clientX;
      const touchY = touches[0].clientY;
      startLongPressTimer(touchX, touchY);
    } else if (touches.length === 2) {
      onPinchStart?.(1);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touches = e.touches;
    const center = getTouchCenter(touches);
    
    // Prevent scrolling when dragging
    if (touchState.current.isLongPress || touches.length > 1) {
      e.preventDefault();
    }
    
    const deltaX = center.x - touchState.current.startX;
    const deltaY = center.y - touchState.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Mark as moving if moved more than 10 pixels
    if (distance > 10) {
      touchState.current.isMoving = true;
      clearLongPressTimer();
    }

    // Handle pinch gesture
    if (touches.length === 2 && touchState.current.touchCount === 2) {
      const currentDistance = getTouchDistance(touches);
      if (currentDistance > 0 && touchState.current.initialDistance > 0) {
        const scale = currentDistance / touchState.current.initialDistance;
        onPinchMove?.(scale);
      }
    }

    // Handle selection drag
    if (touchState.current.isLongPress && touches.length === 1) {
      onSelectionMove?.(touches[0].clientX, touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const endTime = Date.now();
    const duration = endTime - touchState.current.startTime;
    const touches = e.changedTouches;
    const center = getTouchCenter(touches);
    
    clearLongPressTimer();

    // Handle selection end
    if (touchState.current.isLongPress) {
      onSelectionEnd?.();
      return;
    }

    // Handle tap gestures
    if (isQuickTap(duration, touchState.current.isMoving)) {
      switch (touchState.current.touchCount) {
        case 2:
          onTwoFingerTap?.(center.x, center.y);
          return;
        case 3:
          onThreeFingerTap?.(center.x, center.y);
          return;
      }
    }

    // Handle swipe gestures
    if (touchState.current.isMoving && touchState.current.touchCount === 1) {
      const deltaX = center.x - touchState.current.startX;
      const deltaY = center.y - touchState.current.startY;
      const swipeDirection = detectSwipeDirection(deltaX, deltaY, swipeThreshold);

      switch (swipeDirection) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    }

    // Handle pinch end
    if (touchState.current.touchCount === 2) {
      const currentDistance = getTouchDistance(e.touches);
      if (currentDistance > 0 && touchState.current.initialDistance > 0) {
        const scale = currentDistance / touchState.current.initialDistance;
        onPinchEnd?.(scale);
      }
    }
  };

  const handleTouchCancel = () => {
    clearLongPressTimer();
    
    if (touchState.current.isLongPress) {
      onSelectionEnd?.();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
};

export function useTouchGestures(
  ref: RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
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

    const handlers = createTouchHandlers(touchState, longPressTimer, options);
    
    // Prevent default context menu
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // Add passive: false to prevent scrolling during gestures
    const eventOptions = { passive: false };
    element.addEventListener('touchstart', handlers.handleTouchStart, eventOptions);
    element.addEventListener('touchmove', handlers.handleTouchMove, eventOptions);
    element.addEventListener('touchend', handlers.handleTouchEnd, eventOptions);
    element.addEventListener('touchcancel', handlers.handleTouchCancel, eventOptions);
    element.addEventListener('contextmenu', handleContextMenu, eventOptions);

    return () => {
      element.removeEventListener('touchstart', handlers.handleTouchStart);
      element.removeEventListener('touchmove', handlers.handleTouchMove);
      element.removeEventListener('touchend', handlers.handleTouchEnd);
      element.removeEventListener('touchcancel', handlers.handleTouchCancel);
      element.removeEventListener('contextmenu', handleContextMenu);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [ref, options]);
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