import React, { useEffect, useState } from 'react';
import { TERMINAL_MOBILE } from '../../constants/mobile.js';
import { mobileDesignTokens } from '../../styles/mobile.js';
import { cn } from '../../styles/components.js';
import { useSafeAreaStyles } from '../../hooks/useStyles.js';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
  variant?: 'default' | 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  duration = TERMINAL_MOBILE.TOAST_DURATION,
  onClose,
  variant = 'default'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const safeAreaStyles = useSafeAreaStyles(['top']);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, TERMINAL_MOBILE.TOAST_FADE_DURATION);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const variantClasses = {
    default: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };

  return (
    <div
      className={cn(
        'fixed left-1/2 transform -translate-x-1/2',
        'px-4 py-3 rounded-lg shadow-lg',
        'transition-opacity duration-300',
        variantClasses[variant],
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        top: `${mobileDesignTokens.toast.offset.top}px`,
        zIndex: mobileDesignTokens.zIndex.TOAST,
        minHeight: `${mobileDesignTokens.toast.minHeight}px`,
        ...safeAreaStyles,
      }}
    >
      {message}
    </div>
  );
};