import React, { createContext, useContext, ReactNode } from 'react';
import { useMobileDetection, MobileDetection } from '../hooks/useMobileDetection';

interface MobileContextValue extends MobileDetection {
  // Additional mobile-specific settings can be added here
  virtualKeyboardHeight: number;
  isKeyboardVisible: boolean;
}

const MobileContext = createContext<MobileContextValue | undefined>(undefined);

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

interface MobileProviderProps {
  children: ReactNode;
}

export function MobileProvider({ children }: MobileProviderProps) {
  const mobileDetection = useMobileDetection();
  const [virtualKeyboardHeight, setVirtualKeyboardHeight] = React.useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    if (!window.visualViewport) return;

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // Calculate keyboard height
      const keyboardHeight = window.innerHeight - viewport.height;
      setVirtualKeyboardHeight(keyboardHeight);
      setIsKeyboardVisible(keyboardHeight > 50); // Threshold to avoid false positives
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);
  
  const value: MobileContextValue = {
    ...mobileDetection,
    virtualKeyboardHeight,
    isKeyboardVisible,
  };
  
  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}