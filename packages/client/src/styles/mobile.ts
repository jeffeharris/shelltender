/**
 * Mobile-specific design tokens for Shelltender
 * Complements the main theme with mobile-focused values
 */

import { Z_INDEX } from '../constants/mobile.js';

export const mobileDesignTokens = {
  // Touch target sizes (WCAG 2.1 Level AAA compliance)
  touchTarget: {
    min: 44,           // iOS HIG minimum
    preferred: 48,     // Material Design recommended
    large: 56,         // For primary actions
  },
  
  // Safe area insets for notched devices
  safeArea: {
    padding: {
      top: 'env(safe-area-inset-top)',
      bottom: 'env(safe-area-inset-bottom)',
      left: 'env(safe-area-inset-left)',
      right: 'env(safe-area-inset-right)',
    },
  },
  
  // Virtual keyboard dimensions
  keyboard: {
    height: {
      compact: 200,    // Minimal keyboard
      normal: 300,     // Standard keyboard
      expanded: 400,   // Keyboard with predictions
    },
    key: {
      minWidth: 32,
      minHeight: 40,
      spacing: 4,
    },
  },
  
  // Session tabs
  sessionTabs: {
    height: 44,
    dotSize: 8,
    borderWidth: 1,
  },
  
  // Context menu
  contextMenu: {
    itemHeight: 44,
    minWidth: 200,
    maxWidth: 280,
    iconSize: 20,
    showDelay: 100,
  },
  
  // Toast notifications
  toast: {
    minHeight: 44,
    padding: {
      x: 16,
      y: 12,
    },
    offset: {
      top: 16,
      bottom: 16,
    },
  },
  
  // Gesture feedback
  gesture: {
    rippleSize: 40,
    feedbackDuration: 200,
  },
  
  // Z-index hierarchy (imported from constants)
  zIndex: Z_INDEX,
  
  // Animation durations
  animation: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Viewport breakpoints for mobile
  viewport: {
    phone: {
      small: 320,     // iPhone SE
      medium: 375,    // iPhone 12/13
      large: 428,     // iPhone 12/13 Pro Max
    },
    tablet: {
      small: 768,     // iPad Mini
      medium: 834,    // iPad Air
      large: 1024,    // iPad Pro 11"
    },
  },
} as const;

// Utility function to convert touch target to CSS
export function getTouchTargetStyles(size: keyof typeof mobileDesignTokens.touchTarget = 'preferred') {
  const pixels = mobileDesignTokens.touchTarget[size];
  return {
    minWidth: `${pixels}px`,
    minHeight: `${pixels}px`,
  };
}

// Utility function to apply safe area padding
export function getSafeAreaStyles(sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom']) {
  const styles: Record<string, string> = {};
  
  sides.forEach(side => {
    const paddingKey = `padding${side.charAt(0).toUpperCase() + side.slice(1)}`;
    styles[paddingKey] = mobileDesignTokens.safeArea.padding[side];
  });
  
  return styles;
}

// Type exports
export type MobileDesignTokens = typeof mobileDesignTokens;