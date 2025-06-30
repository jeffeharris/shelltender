/**
 * Centralized theme configuration for Shelltender
 * Provides consistent design tokens across all components
 */

export const theme = {
  colors: {
    // Background colors - dark theme optimized for terminal
    background: {
      primary: '#111827',    // gray-900 - main background
      secondary: '#1f2937',  // gray-800 - elevated surfaces
      tertiary: '#374151',   // gray-700 - subtle elevation
      terminal: '#000000',   // pure black for terminal
    },
    
    // Text colors
    text: {
      primary: '#ffffff',    // white - primary text
      secondary: '#9ca3af',  // gray-400 - secondary text
      muted: '#6b7280',      // gray-500 - muted/disabled text
      inverse: '#111827',    // gray-900 - for light backgrounds
    },
    
    // Border colors
    border: {
      default: '#374151',    // gray-700
      hover: '#4b5563',      // gray-600
      focus: '#6b7280',      // gray-500
    },
    
    // Interactive colors
    primary: {
      default: '#3b82f6',    // blue-600
      hover: '#2563eb',      // blue-700
      active: '#1d4ed8',     // blue-800
      light: '#60a5fa',      // blue-400
    },
    
    // Status colors
    success: {
      default: '#10b981',    // green-500
      hover: '#059669',      // green-600
      light: '#34d399',      // green-400
    },
    
    danger: {
      default: '#ef4444',    // red-600
      hover: '#dc2626',      // red-700
      light: '#f87171',      // red-400
    },
    
    warning: {
      default: '#f59e0b',    // amber-500
      hover: '#d97706',      // amber-600
      light: '#fbbf24',      // amber-400
    },
    
    // Overlay colors
    overlay: {
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(0, 0, 0, 0.5)',
      heavy: 'rgba(0, 0, 0, 0.8)',
    },
  },
  
  // Spacing scale
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Border radius scale
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  
  // Font sizes
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  
  // Transitions
  transition: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;

// Type-safe theme access
export type Theme = typeof theme;