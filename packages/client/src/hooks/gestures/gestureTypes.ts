/**
 * Types and interfaces for touch gesture handling
 */

/**
 * Configuration options for touch gesture detection
 */
export interface TouchGestureOptions {
  /** Callback fired when user swipes left */
  onSwipeLeft?: () => void;
  /** Callback fired when user swipes right */
  onSwipeRight?: () => void;
  /** Callback fired when user swipes up */
  onSwipeUp?: () => void;
  /** Callback fired when user swipes down */
  onSwipeDown?: () => void;
  /** Callback fired when user performs a long press */
  onLongPress?: (x: number, y: number) => void;
  /** Callback fired when user taps with two fingers */
  onTwoFingerTap?: (x: number, y: number) => void;
  /** Callback fired when user taps with three fingers */
  onThreeFingerTap?: (x: number, y: number) => void;
  /** Callback fired when pinch gesture starts */
  onPinchStart?: (scale: number) => void;
  /** Callback fired during pinch gesture movement */
  onPinchMove?: (scale: number) => void;
  /** Callback fired when pinch gesture ends */
  onPinchEnd?: (scale: number) => void;
  /** Callback fired when text selection starts */
  onSelectionStart?: (x: number, y: number) => void;
  /** Callback fired during text selection movement */
  onSelectionMove?: (x: number, y: number) => void;
  /** Callback fired when text selection ends */
  onSelectionEnd?: () => void;
  /** Minimum distance in pixels to trigger a swipe gesture */
  swipeThreshold?: number;
  /** Delay in milliseconds before triggering a long press */
  longPressDelay?: number;
}

/**
 * Internal state for tracking touch gestures
 */
export interface TouchState {
  /** X coordinate where touch started */
  startX: number;
  /** Y coordinate where touch started */
  startY: number;
  /** Timestamp when touch started */
  startTime: number;
  /** Initial distance between two touch points (for pinch) */
  initialDistance: number;
  /** Whether the touch has moved beyond the movement threshold */
  isMoving: boolean;
  /** Whether a long press has been triggered */
  isLongPress: boolean;
  /** Number of simultaneous touches */
  touchCount: number;
}

/**
 * Possible swipe directions
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

/**
 * Result of gesture detection
 */
export interface GestureResult {
  /** Type of gesture detected */
  type: 'tap' | 'swipe' | 'pinch' | 'longpress' | 'selection' | null;
  /** Additional data about the gesture */
  data?: {
    /** For tap gestures: number of fingers */
    fingerCount?: number;
    /** For swipe gestures: direction */
    direction?: SwipeDirection;
    /** For pinch gestures: scale factor */
    scale?: number;
    /** For position-based gestures: coordinates */
    x?: number;
    y?: number;
  };
}

/**
 * Touch event handler function type
 */
export type TouchEventHandler = (event: TouchEvent) => void;

/**
 * Collection of touch event handlers
 */
export interface TouchEventHandlers {
  handleTouchStart: TouchEventHandler;
  handleTouchMove: TouchEventHandler;
  handleTouchEnd: TouchEventHandler;
  handleTouchCancel: TouchEventHandler;
}