import { useState, useEffect } from 'react';

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

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Device detection
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(userAgent);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Size-based detection
    const isPhone = width < 768;
    const isTablet = width >= 768 && width < 1024;
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
  });

  useEffect(() => {
    const handleResize = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /android/.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isPhone = width < 768;
      const isTablet = width >= 768 && width < 1024;
      // Only consider it mobile if it's a small screen OR it's actually iOS/Android
      const isMobile = isPhone || isTablet || (hasTouch && (isIOS || isAndroid));
      
      const isPortrait = height > width;
      const isLandscape = width > height;
      
      setDetection({
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
      });
    };

    // Handle orientation change
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen to visual viewport changes for better keyboard handling
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

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