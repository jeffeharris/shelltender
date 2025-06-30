/**
 * Individual gesture handler functions
 */

import type { TouchGestureOptions, TouchState } from './gestureTypes.js';
import { 
  detectSwipeDirection, 
  detectTapType,
  getTouchCenter,
  getTouchDistance,
  calculatePinchScale 
} from './gestureDetectors.js';

/**
 * Process tap gestures (single, double, triple finger)
 */
export function processTapGesture(
  state: TouchState,
  touches: TouchList,
  duration: number,
  options: TouchGestureOptions
): boolean {
  const tapInfo = detectTapType(state.touchCount, duration, state.isMoving);
  
  if (!tapInfo) {
    return false;
  }

  const center = getTouchCenter(touches);
  
  switch (tapInfo.fingerCount) {
    case 2:
      options.onTwoFingerTap?.(center.x, center.y);
      return true;
    case 3:
      options.onThreeFingerTap?.(center.x, center.y);
      return true;
    default:
      return false;
  }
}

/**
 * Process swipe gestures
 */
export function processSwipeGesture(
  state: TouchState,
  endX: number,
  endY: number,
  options: TouchGestureOptions
): boolean {
  if (!state.isMoving || state.touchCount !== 1) {
    return false;
  }

  const deltaX = endX - state.startX;
  const deltaY = endY - state.startY;
  const swipeDirection = detectSwipeDirection(
    deltaX, 
    deltaY, 
    options.swipeThreshold
  );

  if (!swipeDirection) {
    return false;
  }

  switch (swipeDirection) {
    case 'left':
      options.onSwipeLeft?.();
      return true;
    case 'right':
      options.onSwipeRight?.();
      return true;
    case 'up':
      options.onSwipeUp?.();
      return true;
    case 'down':
      options.onSwipeDown?.();
      return true;
  }

  return false;
}

/**
 * Process pinch gestures
 */
export function processPinchGesture(
  state: TouchState,
  touches: TouchList,
  phase: 'start' | 'move' | 'end',
  options: TouchGestureOptions
): boolean {
  if (state.touchCount !== 2) {
    return false;
  }

  const currentDistance = getTouchDistance(touches);
  const scale = calculatePinchScale(currentDistance, state.initialDistance);

  switch (phase) {
    case 'start':
      options.onPinchStart?.(scale);
      return true;
    case 'move':
      options.onPinchMove?.(scale);
      return true;
    case 'end':
      options.onPinchEnd?.(scale);
      return true;
  }

  return false;
}

/**
 * Process selection gestures (long press and drag)
 */
export function processSelectionGesture(
  state: TouchState,
  x: number,
  y: number,
  phase: 'start' | 'move' | 'end',
  options: TouchGestureOptions
): boolean {
  if (!state.isLongPress) {
    return false;
  }

  switch (phase) {
    case 'start':
      options.onSelectionStart?.(x, y);
      return true;
    case 'move':
      options.onSelectionMove?.(x, y);
      return true;
    case 'end':
      options.onSelectionEnd?.();
      return true;
  }

  return false;
}

/**
 * Handle long press timeout
 */
export function handleLongPressTimeout(
  state: TouchState,
  x: number,
  y: number,
  options: TouchGestureOptions
): void {
  if (!state.isMoving && state.touchCount === 1) {
    options.onLongPress?.(x, y);
    options.onSelectionStart?.(x, y);
  }
}

/**
 * Create a timer for long press detection
 */
export function createLongPressTimer(
  callback: () => void,
  delay: number
): NodeJS.Timeout {
  return setTimeout(callback, delay);
}

/**
 * Clear a long press timer safely
 */
export function clearLongPressTimer(timer: NodeJS.Timeout | null): void {
  if (timer) {
    clearTimeout(timer);
  }
}