import React, { ReactNode } from 'react';
import { MobileProvider } from '../../context/MobileContext.js';
import { useMobileDetection } from '../../hooks/useMobileDetection.js';

interface MobileAppProps {
  children: ReactNode;
  desktopComponent?: ReactNode;
}

export function MobileApp({ children, desktopComponent }: MobileAppProps) {
  const { isMobile } = useMobileDetection();

  // If desktop component is provided and we're on desktop, show that instead
  if (!isMobile && desktopComponent) {
    return <>{desktopComponent}</>;
  }

  // Wrap mobile experience in MobileProvider
  return (
    <MobileProvider>
      <div className="mobile-app mobile-no-bounce mobile-safe-padding">
        {children}
      </div>
    </MobileProvider>
  );
}