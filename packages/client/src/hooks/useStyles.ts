/**
 * Utility hooks for consistent styling across Shelltender components
 */

import { useMemo } from 'react';
import { useMobileDetection } from './useMobileDetection.js';
import { 
  buttonStyles, 
  iconButtonStyles,
  cn 
} from '../styles/components.js';
import { 
  getTouchTargetStyles, 
  getSafeAreaStyles,
  mobileDesignTokens 
} from '../styles/mobile.js';
import { theme } from '../styles/theme.js';

// Button variant and size types
export type ButtonVariant = keyof typeof buttonStyles.variants;
export type ButtonSize = keyof typeof buttonStyles.sizes;
export type IconButtonVariant = keyof typeof iconButtonStyles.variants;
export type IconButtonSize = keyof typeof iconButtonStyles.sizes;

/**
 * Hook to get consistent button styles
 */
export function useButtonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
): string {
  return useMemo(
    () => cn(
      buttonStyles.base,
      buttonStyles.variants[variant],
      buttonStyles.sizes[size],
      className
    ),
    [variant, size, className]
  );
}

/**
 * Hook to get consistent icon button styles
 */
export function useIconButtonStyles(
  variant: IconButtonVariant = 'default',
  size: IconButtonSize = 'md',
  className?: string
): string {
  const { isMobile } = useMobileDetection();
  
  return useMemo(() => {
    const baseClasses = cn(
      iconButtonStyles.base,
      iconButtonStyles.variants[variant],
      iconButtonStyles.sizes[size],
      className
    );
    
    // Apply minimum touch target size on mobile
    if (isMobile) {
      const touchSize = size === 'sm' ? 'min' : 'preferred';
      return cn(baseClasses, `min-w-[${mobileDesignTokens.touchTarget[touchSize]}px]`, `min-h-[${mobileDesignTokens.touchTarget[touchSize]}px]`);
    }
    
    return baseClasses;
  }, [variant, size, className, isMobile]);
}

/**
 * Hook to get mobile-optimized styles
 */
export function useMobileStyles() {
  const { isMobile } = useMobileDetection();
  
  return useMemo(() => {
    if (!isMobile) {
      return {
        touchTarget: '',
        safeArea: '',
        safeAreaClasses: '',
      };
    }
    
    return {
      // Touch target classes
      touchTarget: `min-h-[${mobileDesignTokens.touchTarget.preferred}px] min-w-[${mobileDesignTokens.touchTarget.preferred}px]`,
      touchTargetLarge: `min-h-[${mobileDesignTokens.touchTarget.large}px] min-w-[${mobileDesignTokens.touchTarget.large}px]`,
      
      // Safe area padding classes
      safeArea: 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
      safeAreaTop: 'pt-[env(safe-area-inset-top)]',
      safeAreaBottom: 'pb-[env(safe-area-inset-bottom)]',
      safeAreaClasses: 'mobile-safe-padding',
    };
  }, [isMobile]);
}

/**
 * Hook to get dynamic touch target styles
 */
export function useTouchTargetStyles(
  size: keyof typeof mobileDesignTokens.touchTarget = 'preferred',
  enabled = true
) {
  const { isMobile } = useMobileDetection();
  
  return useMemo(() => {
    if (!isMobile || !enabled) {
      return {};
    }
    
    return getTouchTargetStyles(size);
  }, [isMobile, enabled, size]);
}

/**
 * Hook to get safe area padding styles
 */
export function useSafeAreaStyles(
  sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom'],
  enabled = true
) {
  const { isMobile } = useMobileDetection();
  
  return useMemo(() => {
    if (!isMobile || !enabled) {
      return {};
    }
    
    return getSafeAreaStyles(sides);
  }, [isMobile, enabled, sides]);
}

/**
 * Hook to get responsive container styles
 */
export function useResponsiveContainer(
  baseClass = '',
  mobileClass = '',
  desktopClass = ''
) {
  const { isMobile, isTablet } = useMobileDetection();
  
  return useMemo(() => {
    if (isMobile) {
      return cn(baseClass, mobileClass);
    }
    
    if (isTablet) {
      // Tablet gets both mobile and desktop classes for flexibility
      return cn(baseClass, mobileClass, desktopClass);
    }
    
    return cn(baseClass, desktopClass);
  }, [baseClass, mobileClass, desktopClass, isMobile, isTablet]);
}

/**
 * Hook for animation duration based on user preferences
 */
export function useAnimationDuration(
  type: 'instant' | 'fast' | 'normal' | 'slow' = 'normal'
): number {
  // TODO: Add support for prefers-reduced-motion
  return mobileDesignTokens.animation[type];
}

/**
 * Hook to get theme-aware colors
 */
export function useThemeColor(
  colorPath: string // e.g., 'background.primary' or 'text.secondary'
): string {
  return useMemo(() => {
    const parts = colorPath.split('.');
    let value: any = theme.colors;
    
    for (const part of parts) {
      value = value?.[part];
      if (!value) {
        console.warn(`Color path "${colorPath}" not found in theme`);
        return '#000000';
      }
    }
    
    return value;
  }, [colorPath]);
}