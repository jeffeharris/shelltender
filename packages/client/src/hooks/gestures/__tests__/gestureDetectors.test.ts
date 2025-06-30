import { describe, it, expect } from 'vitest';
import {
  getTouchDistance,
  getTouchCenter,
  detectSwipeDirection,
  isQuickTap,
  calculatePinchScale,
  hasTouchMoved,
  detectTapType,
  shouldTriggerLongPress,
  calculateVelocity,
  isValidPinch,
} from '../gestureDetectors.js';

describe('Gesture Detectors', () => {
  describe('getTouchDistance', () => {
    it('should return 0 for single touch', () => {
      const touches = [{ clientX: 100, clientY: 100 }] as unknown as TouchList;
      expect(getTouchDistance(touches)).toBe(0);
    });

    it('should calculate distance between two touches', () => {
      const touches = [
        { clientX: 0, clientY: 0 },
        { clientX: 3, clientY: 4 },
      ] as unknown as TouchList;
      touches.length = 2;
      expect(getTouchDistance(touches)).toBe(5); // 3-4-5 triangle
    });
  });

  describe('getTouchCenter', () => {
    it('should return center of single touch', () => {
      const touches = [{ clientX: 100, clientY: 200 }] as unknown as TouchList;
      touches.length = 1;
      expect(getTouchCenter(touches)).toEqual({ x: 100, y: 200 });
    });

    it('should calculate center of multiple touches', () => {
      const touches = [
        { clientX: 0, clientY: 0 },
        { clientX: 100, clientY: 100 },
      ] as unknown as TouchList;
      touches.length = 2;
      expect(getTouchCenter(touches)).toEqual({ x: 50, y: 50 });
    });
  });

  describe('detectSwipeDirection', () => {
    it('should return null for small movements', () => {
      expect(detectSwipeDirection(10, 10, 50)).toBeNull();
    });

    it('should detect left swipe', () => {
      expect(detectSwipeDirection(-100, 10, 50)).toBe('left');
    });

    it('should detect right swipe', () => {
      expect(detectSwipeDirection(100, 10, 50)).toBe('right');
    });

    it('should detect up swipe', () => {
      expect(detectSwipeDirection(10, -100, 50)).toBe('up');
    });

    it('should detect down swipe', () => {
      expect(detectSwipeDirection(10, 100, 50)).toBe('down');
    });

    it('should prefer horizontal swipes when X delta is larger', () => {
      expect(detectSwipeDirection(100, 60, 50)).toBe('right');
    });

    it('should prefer vertical swipes when Y delta is larger', () => {
      expect(detectSwipeDirection(60, 100, 50)).toBe('down');
    });
  });

  describe('isQuickTap', () => {
    it('should return true for quick non-moving tap', () => {
      expect(isQuickTap(100, false)).toBe(true);
    });

    it('should return false for slow tap', () => {
      expect(isQuickTap(400, false)).toBe(false);
    });

    it('should return false for moving gesture', () => {
      expect(isQuickTap(100, true)).toBe(false);
    });

    it('should respect custom duration', () => {
      expect(isQuickTap(250, false, 200)).toBe(false);
      expect(isQuickTap(150, false, 200)).toBe(true);
    });
  });

  describe('calculatePinchScale', () => {
    it('should return 1 for zero initial distance', () => {
      expect(calculatePinchScale(100, 0)).toBe(1);
    });

    it('should calculate scale correctly', () => {
      expect(calculatePinchScale(200, 100)).toBe(2);
      expect(calculatePinchScale(50, 100)).toBe(0.5);
    });
  });

  describe('hasTouchMoved', () => {
    it('should return false for no movement', () => {
      expect(hasTouchMoved(100, 100, 100, 100)).toBe(false);
    });

    it('should return false for small movement', () => {
      expect(hasTouchMoved(100, 100, 105, 105)).toBe(false);
    });

    it('should return true for movement beyond threshold', () => {
      expect(hasTouchMoved(100, 100, 120, 100)).toBe(true);
    });

    it('should respect custom threshold', () => {
      expect(hasTouchMoved(100, 100, 105, 100, 20)).toBe(false);
      expect(hasTouchMoved(100, 100, 125, 100, 20)).toBe(true);
    });
  });

  describe('detectTapType', () => {
    it('should return null for non-tap', () => {
      expect(detectTapType(1, 400, false)).toBeNull();
      expect(detectTapType(1, 100, true)).toBeNull();
    });

    it('should detect single finger tap', () => {
      const result = detectTapType(1, 100, false);
      expect(result).toEqual({ isTap: true, fingerCount: 1 });
    });

    it('should detect multi-finger tap', () => {
      const result = detectTapType(3, 100, false);
      expect(result).toEqual({ isTap: true, fingerCount: 3 });
    });
  });

  describe('shouldTriggerLongPress', () => {
    it('should return false for short duration', () => {
      expect(shouldTriggerLongPress(300, false)).toBe(false);
    });

    it('should return true for long duration without movement', () => {
      expect(shouldTriggerLongPress(500, false)).toBe(true);
    });

    it('should return false for long duration with movement', () => {
      expect(shouldTriggerLongPress(500, true)).toBe(false);
    });

    it('should respect custom delay', () => {
      expect(shouldTriggerLongPress(250, false, 200)).toBe(true);
      expect(shouldTriggerLongPress(150, false, 200)).toBe(false);
    });
  });

  describe('calculateVelocity', () => {
    it('should return zero velocity for zero duration', () => {
      expect(calculateVelocity(100, 100, 0)).toEqual({
        vx: 0,
        vy: 0,
        speed: 0,
      });
    });

    it('should calculate velocity correctly', () => {
      const result = calculateVelocity(300, 400, 100);
      expect(result.vx).toBe(3);
      expect(result.vy).toBe(4);
      expect(result.speed).toBe(5); // 3-4-5 triangle
    });
  });

  describe('isValidPinch', () => {
    it('should return false for small distance change', () => {
      expect(isValidPinch(110, 100)).toBe(false);
    });

    it('should return true for large distance change', () => {
      expect(isValidPinch(200, 100)).toBe(true);
      expect(isValidPinch(40, 100)).toBe(true);
    });

    it('should respect custom threshold', () => {
      expect(isValidPinch(110, 100, 20)).toBe(false);
      expect(isValidPinch(125, 100, 20)).toBe(true);
    });
  });
});