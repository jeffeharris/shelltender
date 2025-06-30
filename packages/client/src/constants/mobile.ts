/**
 * Mobile-specific constants for Shelltender
 */

// Touch gesture thresholds
export const TOUCH_GESTURES = {
  SWIPE_THRESHOLD: 75,
  MOVEMENT_THRESHOLD: 10,
  LONG_PRESS_DELAY: 400,
  PINCH_THRESHOLD: 50,
  MULTI_TAP_DELAY: 300,
} as const;

// Context menu dimensions
export const CONTEXT_MENU = {
  WIDTH: 200,
  HEIGHT: 180, // 4 items * ~45px each
  MARGIN: 10,
  ITEM_HEIGHT: 45,
  SHOW_DELAY: 100, // Delay before allowing close
} as const;

// Terminal settings
export const TERMINAL_MOBILE = {
  MIN_TOUCH_TARGET_SIZE: 44, // iOS recommended minimum
  GESTURE_HINT_TIMEOUT: 5000,
  TOAST_DURATION: 2000,
  TOAST_FADE_DURATION: 300,
} as const;

// Viewport breakpoints
export const MOBILE_BREAKPOINTS = {
  PHONE_MAX: 768,
  TABLET_MAX: 1024,
  PHONE_LANDSCAPE_MAX: 896,
} as const;

// Special key mappings
export const SPECIAL_KEYS = {
  backspace: '\x7f',
  escape: '\x1b',
  up: '\x1b[A',
  down: '\x1b[B',
  left: '\x1b[D',
  right: '\x1b[C',
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-z': '\x1a',
  'ctrl-l': '\x0c',
  'ctrl-a': '\x01',
  'ctrl-e': '\x05',
  'ctrl-k': '\x0b',
  'ctrl-u': '\x15',
  'ctrl-w': '\x17',
  tab: '\t',
  enter: '\r',
} as const;

// Animation durations
export const ANIMATIONS = {
  SLIDE_DURATION: 200,
  FADE_DURATION: 150,
  KEYBOARD_SLIDE_DURATION: 300,
} as const;

// Safe area handling
export const SAFE_AREA = {
  BOTTOM_PADDING: 'env(safe-area-inset-bottom)',
  TOP_PADDING: 'env(safe-area-inset-top)',
  LEFT_PADDING: 'env(safe-area-inset-left)',
  RIGHT_PADDING: 'env(safe-area-inset-right)',
} as const;

// Z-index hierarchy
export const Z_INDEX = {
  TERMINAL: 1,
  GESTURE_HINTS: 10,
  CONTEXT_MENU_BACKDROP: 9999,
  CONTEXT_MENU: 10000,
  TOAST: 10001,
  VIRTUAL_KEYBOARD: 9998,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  CUSTOM_KEY_SETS: 'mobile-custom-key-sets',
  KEYBOARD_PREFERENCES: 'mobile-keyboard-prefs',
  LAST_ACTIVE_KEY_SET: 'mobile-last-key-set',
} as const;