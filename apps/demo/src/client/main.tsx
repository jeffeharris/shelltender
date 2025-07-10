import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../styles/index.css'
import '../styles/demo.css'
import App from './App'
import { AppRouter } from './AppRouter'
import { ErrorBoundary } from './ErrorBoundary'
import { WebSocketProvider, ToastProvider } from '@shelltender/client'
import { applySafetyPatches, checkForCrashes } from './utils/safetyPatch'

// Apply safety patches before anything else
applySafetyPatches();
checkForCrashes();

// Detect server mode and configure WebSocket accordingly
async function getWebSocketConfig() {
  try {
    const response = await fetch('/api/health');
    const health = await response.json();
    
    if (health.mode === 'single-port') {
      // Single port mode - use relative WebSocket URL
      return {
        url: '/ws' // Will automatically use ws:// or wss:// based on current protocol
      };
    } else {
      // Dual port mode - use separate WebSocket port
      return {
        port: health.wsPort?.toString() || import.meta.env?.VITE_WS_PORT || '8081'
      };
    }
  } catch (error) {
    // Fallback to environment config if health check fails
    console.warn('Failed to detect server mode, using default config:', error);
    return {
      port: import.meta.env?.VITE_WS_PORT || '8081'
    };
  }
}

// Initialize app with detected config
getWebSocketConfig().then(wsConfig => {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <WebSocketProvider config={wsConfig}>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </WebSocketProvider>
    </ErrorBoundary>
  )
});
