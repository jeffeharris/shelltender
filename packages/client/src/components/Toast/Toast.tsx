import React, { useEffect, useState } from 'react';
import { TERMINAL_MOBILE, Z_INDEX } from '../../constants/mobile.js';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  duration = TERMINAL_MOBILE.TOAST_DURATION,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, TERMINAL_MOBILE.TOAST_FADE_DURATION);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ zIndex: Z_INDEX.TOAST }}
    >
      {message}
    </div>
  );
};