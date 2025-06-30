/**
 * Touch state management utilities
 */

import type { TouchState } from './gestureTypes.js';
import { getTouchDistance, getTouchCenter } from './gestureDetectors.js';

/**
 * Create initial touch state
 */
export function createInitialTouchState(): TouchState {
  return {
    startX: 0,
    startY: 0,
    startTime: 0,
    initialDistance: 0,
    isMoving: false,
    isLongPress: false,
    touchCount: 0,
  };
}

/**
 * Update touch state when a touch starts
 */
export function updateTouchStart(
  touches: TouchList,
  timestamp: number = Date.now()
): TouchState {
  const center = getTouchCenter(touches);
  
  return {
    startX: center.x,
    startY: center.y,
    startTime: timestamp,
    initialDistance: getTouchDistance(touches),
    isMoving: false,
    isLongPress: false,
    touchCount: touches.length,
  };
}

/**
 * Update touch state for movement
 */
export function updateTouchMove(
  currentState: TouchState,
  hasMovedBeyondThreshold: boolean
): TouchState {
  if (!hasMovedBeyondThreshold || currentState.isMoving) {
    return currentState;
  }

  return {
    ...currentState,
    isMoving: true,
  };
}

/**
 * Update touch state for long press
 */
export function updateLongPress(
  currentState: TouchState,
  isLongPress: boolean
): TouchState {
  if (currentState.isLongPress === isLongPress) {
    return currentState;
  }

  return {
    ...currentState,
    isLongPress,
  };
}

/**
 * Reset touch state
 */
export function resetTouchState(currentState: TouchState): TouchState {
  return createInitialTouchState();
}

/**
 * Check if touch state represents a gesture in progress
 */
export function isGestureInProgress(state: TouchState): boolean {
  return state.touchCount > 0 || state.isLongPress;
}

/**
 * Create a touch state snapshot for debugging
 */
export function createTouchStateSnapshot(state: TouchState): string {
  return JSON.stringify({
    position: `(${state.startX.toFixed(0)}, ${state.startY.toFixed(0)})`,
    touchCount: state.touchCount,
    isMoving: state.isMoving,
    isLongPress: state.isLongPress,
    duration: Date.now() - state.startTime,
  }, null, 2);
}