import { useState, useEffect, useCallback, useRef } from 'react';
import { MOBILE_BREAKPOINTS } from '../constants/mobile.js';

export interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isPhone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  hasTouch: boolean;
}

/**
 * Detects mobile device features based on user agent and screen size
 */
function detectMobileFeatures(): MobileDetection {
  const userAgent = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Device detection
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Size-based detection
  const isPhone = width < MOBILE_BREAKPOINTS.PHONE_MAX;
  const isTablet = width >= MOBILE_BREAKPOINTS.PHONE_MAX && width < MOBILE_BREAKPOINTS.TABLET_MAX;
  // Only consider it mobile if it's a small screen OR it's actually iOS/Android
  const isMobile = isPhone || isTablet || (hasTouch && (isIOS || isAndroid));
  
  // Orientation
  const isPortrait = height > width;
  const isLandscape = width > height;
  
  return {
    isMobile,
    isTablet,
    isPhone,
    isIOS,
    isAndroid,
    isPortrait,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
    hasTouch,
  };
}

/**
 * Debounce function to limit update frequency
 */
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>(detectMobileFeatures);
  const visualViewportRef = useRef<VisualViewport | null>(null);

  // Create debounced update function
  const updateDetection = useCallback(
    debounce(() => {
      setDetection(detectMobileFeatures());
    }, 100),
    []
  );

  useEffect(() => {
    // Handle orientation change with delay to ensure dimensions are updated
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(updateDetection, 100);
    };

    // Add event listeners
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen to visual viewport changes for better keyboard handling
    if (window.visualViewport) {
      visualViewportRef.current = window.visualViewport;
      visualViewportRef.current.addEventListener('resize', updateDetection);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      // Safely remove visualViewport listener
      if (visualViewportRef.current) {
        visualViewportRef.current.removeEventListener('resize', updateDetection);
        visualViewportRef.current = null;
      }
    };
  }, [updateDetection]);

  return detection;
}

// Utility hook for breakpoint detection
export function useBreakpoint() {
  const { screenWidth } = useMobileDetection();
  
  return {
    isXs: screenWidth < 640,    // Mobile phones
    isSm: screenWidth >= 640 && screenWidth < 768,   // Large phones
    isMd: screenWidth >= 768 && screenWidth < 1024,  // Tablets
    isLg: screenWidth >= 1024 && screenWidth < 1280, // Small laptops
    isXl: screenWidth >= 1280,   // Desktop
  };
}