/**
 * Component style system for Shelltender
 * Provides consistent, reusable component styles
 */

import { theme } from './theme.js';

// Button styles
export const buttonStyles = {
  base: 'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
  
  sizes: {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-lg',
    icon: 'p-2 rounded-lg', // Square icon button
  },
  
  variants: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-700 focus:ring-gray-500',
    ghost: 'text-gray-400 hover:bg-gray-800 hover:text-white active:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus:ring-green-500',
  },
};

// Container styles
export const containerStyles = {
  // Full-screen modal backdrop
  modalBackdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50',
  
  // Modal content container
  modalContent: 'bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden',
  
  // Card/panel styles
  card: 'bg-gray-800 rounded-lg shadow-lg',
  cardElevated: 'bg-gray-800 rounded-lg shadow-xl',
  
  // Section styles
  section: 'bg-gray-900 border-b border-gray-700',
  sectionPadded: 'bg-gray-900 border-b border-gray-700 p-4',
  
  // Terminal container
  terminal: 'bg-black rounded-lg overflow-hidden',
};

// Text styles
export const textStyles = {
  // Headings
  h1: 'text-2xl font-bold text-white',
  h2: 'text-xl font-semibold text-white',
  h3: 'text-lg font-semibold text-white',
  h4: 'text-base font-semibold text-white',
  
  // Body text
  body: 'text-base text-gray-300',
  bodySmall: 'text-sm text-gray-300',
  bodyLarge: 'text-lg text-gray-300',
  
  // Utility text
  label: 'text-sm font-medium text-gray-400',
  caption: 'text-xs text-gray-500',
  error: 'text-sm text-red-400',
  success: 'text-sm text-green-400',
  
  // Specialized
  code: 'font-mono text-sm bg-gray-900 px-1 py-0.5 rounded',
  link: 'text-blue-400 hover:text-blue-300 underline cursor-pointer',
};

// Form control styles
export const formStyles = {
  // Input fields
  input: 'w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  inputError: 'border-red-500 focus:ring-red-500',
  
  // Select dropdown
  select: 'w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  
  // Checkbox/Radio
  checkbox: 'h-4 w-4 bg-gray-900 border-gray-700 rounded text-blue-600 focus:ring-blue-500',
  radio: 'h-4 w-4 bg-gray-900 border-gray-700 text-blue-600 focus:ring-blue-500',
  
  // Label
  label: 'block text-sm font-medium text-gray-400 mb-1',
  
  // Help text
  helpText: 'text-xs text-gray-500 mt-1',
  errorText: 'text-xs text-red-400 mt-1',
};

// List styles
export const listStyles = {
  // Base list container
  container: 'divide-y divide-gray-700',
  
  // List items
  item: 'py-3 px-4 hover:bg-gray-800 transition-colors cursor-pointer',
  itemActive: 'bg-gray-800',
  itemDisabled: 'opacity-50 cursor-not-allowed',
  
  // Empty state
  empty: 'py-8 text-center text-gray-500',
};

// Badge/Chip styles
export const badgeStyles = {
  base: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
  
  variants: {
    default: 'bg-gray-700 text-gray-300',
    primary: 'bg-blue-600/10 text-blue-400',
    success: 'bg-green-600/10 text-green-400',
    danger: 'bg-red-600/10 text-red-400',
    warning: 'bg-amber-600/10 text-amber-400',
  },
};

// Icon button styles (for mobile)
export const iconButtonStyles = {
  base: 'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
  
  sizes: {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  },
  
  variants: {
    default: 'text-gray-400 hover:text-white hover:bg-gray-800',
    primary: 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-900/20',
  },
};

// Utility function to combine class names
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}