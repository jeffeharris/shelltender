/**
 * Pure functions for detecting touch gestures
 */

import { TOUCH_GESTURES } from '../../constants/mobile.js';
import type { SwipeDirection, TouchState } from './gestureTypes.js';

/**
 * Calculate the distance between two touch points
 */
export function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the center point of multiple touches
 */
export function getTouchCenter(touches: TouchList): { x: number; y: number } {
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
}

/**
 * Detect swipe direction based on touch movement
 */
export function detectSwipeDirection(
  deltaX: number,
  deltaY: number,
  threshold: number = TOUCH_GESTURES.SWIPE_THRESHOLD
): SwipeDirection {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX <= threshold && absY <= threshold) return null;

  if (absX > absY) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
}

/**
 * Check if a touch gesture qualifies as a quick tap
 */
export function isQuickTap(
  duration: number, 
  isMoving: boolean,
  maxDuration: number = TOUCH_GESTURES.QUICK_TAP_DURATION
): boolean {
  return !isMoving && duration < maxDuration;
}

/**
 * Calculate the scale factor for a pinch gesture
 */
export function calculatePinchScale(
  currentDistance: number,
  initialDistance: number
): number {
  if (initialDistance === 0) return 1;
  return currentDistance / initialDistance;
}

/**
 * Check if touch has moved beyond the movement threshold
 */
export function hasTouchMoved(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  threshold: number = TOUCH_GESTURES.MOVEMENT_THRESHOLD
): boolean {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  return distance > threshold;
}

/**
 * Detect the type of tap gesture based on touch count and timing
 */
export function detectTapType(
  touchCount: number,
  duration: number,
  isMoving: boolean
): { isTap: boolean; fingerCount: number } | null {
  if (!isQuickTap(duration, isMoving)) {
    return null;
  }

  return {
    isTap: true,
    fingerCount: touchCount,
  };
}

/**
 * Check if a long press should be triggered
 */
export function shouldTriggerLongPress(
  elapsed: number,
  isMoving: boolean,
  delay: number = TOUCH_GESTURES.LONG_PRESS_DELAY
): boolean {
  return elapsed >= delay && !isMoving;
}

/**
 * Calculate touch velocity for gesture physics
 */
export function calculateVelocity(
  deltaX: number,
  deltaY: number,
  duration: number
): { vx: number; vy: number; speed: number } {
  if (duration === 0) {
    return { vx: 0, vy: 0, speed: 0 };
  }

  const vx = deltaX / duration;
  const vy = deltaY / duration;
  const speed = Math.sqrt(vx * vx + vy * vy);

  return { vx, vy, speed };
}

/**
 * Determine if a pinch gesture is valid
 */
export function isValidPinch(
  currentDistance: number,
  initialDistance: number,
  threshold: number = TOUCH_GESTURES.PINCH_THRESHOLD
): boolean {
  const delta = Math.abs(currentDistance - initialDistance);
  return delta > threshold;
}