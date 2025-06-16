import '@testing-library/jest-dom/vitest';

// Mock navigator for consistent test environment
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 0,
});

// Remove ontouchstart from window in test environment
if ('ontouchstart' in window) {
  delete (window as any).ontouchstart;
}