import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileDetection, useBreakpoint } from '../useMobileDetection.js';

describe('useMobileDetection', () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalMaxTouchPoints = navigator.maxTouchPoints;
  
  beforeEach(() => {
    // Set default non-touch environment
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    
    // Remove touch support for desktop tests
    if ('ontouchstart' in window) {
      delete (window as any).ontouchstart;
    }
  });
  
  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, 'platform', {
      writable: true,
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: originalMaxTouchPoints,
    });
    
    // Reset touch support
    delete (window as any).ontouchstart;
  });
  
  it('detects mobile phone correctly', () => {
    window.innerWidth = 375;
    window.innerHeight = 667;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isPhone).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });
  
  it('detects tablet correctly', () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(true);
  });
  
  it('detects desktop correctly', () => {
    window.innerWidth = 1920;
    window.innerHeight = 1080;
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isPhone).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.hasTouch).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });
  
  it('detects iOS devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isIOS).toBe(true);
    expect(result.current.isAndroid).toBe(false);
  });
  
  it('detects iPad as iOS', () => {
    Object.defineProperty(navigator, 'platform', {
      writable: true,
      configurable: true,
      value: 'MacIntel',
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isIOS).toBe(true);
  });
  
  it('detects Android devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G960U)',
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isAndroid).toBe(true);
    expect(result.current.isIOS).toBe(false);
  });
  
  it('detects touch support', () => {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: () => {},
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.hasTouch).toBe(true);
  });
  
  it('detects orientation correctly', () => {
    window.innerWidth = 667;
    window.innerHeight = 375;
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
  });
  
  it('updates on window resize', () => {
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.screenWidth).toBe(1024);
    
    act(() => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });
    
    expect(result.current.screenWidth).toBe(375);
    expect(result.current.isPhone).toBe(true);
  });
  
  it('handles orientation change', () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useMobileDetection());
    
    act(() => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('orientationchange'));
    });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current.isPortrait).toBe(true);
    
    vi.useRealTimers();
  });
  
  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useMobileDetection());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });
  
  it('detects extra small screens', () => {
    window.innerWidth = 320;
    
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isXs).toBe(true);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isMd).toBe(false);
    expect(result.current.isLg).toBe(false);
    expect(result.current.isXl).toBe(false);
  });
  
  it('detects small screens', () => {
    window.innerWidth = 640;
    
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isXs).toBe(false);
    expect(result.current.isSm).toBe(true);
    expect(result.current.isMd).toBe(false);
  });
  
  it('detects medium screens', () => {
    window.innerWidth = 768;
    
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isXs).toBe(false);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isMd).toBe(true);
  });
  
  it('detects large screens', () => {
    window.innerWidth = 1024;
    
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isLg).toBe(true);
    expect(result.current.isXl).toBe(false);
  });
  
  it('detects extra large screens', () => {
    window.innerWidth = 1920;
    
    const { result } = renderHook(() => useBreakpoint());
    
    expect(result.current.isXl).toBe(true);
    expect(result.current.isLg).toBe(false);
  });
});