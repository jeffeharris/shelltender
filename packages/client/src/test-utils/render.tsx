import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MobileProvider } from '../context/MobileContext';
import { ToastProvider } from '../components/Toast';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mobileDevice?: {
    isMobile: boolean;
    isTablet?: boolean;
    isPhone?: boolean;
    isIOS?: boolean;
    isAndroid?: boolean;
  };
}

// Create a custom render function that includes our providers
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { mobileDevice, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MobileProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MobileProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };