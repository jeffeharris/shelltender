import React, { useState, useEffect, ReactNode } from 'react';
import { WebSocketProvider } from './context/WebSocketContext.js';
import { ToastProvider } from './components/Toast/index.js';
import { Terminal } from './components/Terminal/Terminal.js';
import { SessionTabs } from './components/SessionTabs/index.js';
import { WebSocketServiceConfig } from './services/WebSocketService.js';

export interface ShelltenderAppProps {
  children?: ReactNode;
  config?: WebSocketServiceConfig;
  enableTabs?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
  wsUrl?: string;
  autoDetect?: boolean;
}

/**
 * Zero-configuration wrapper component for Shelltender
 * Automatically detects backend, provides contexts, and handles setup
 */
export function ShelltenderApp({
  children,
  config,
  enableTabs = false,
  theme = 'dark',
  className = '',
  wsUrl,
  autoDetect = true
}: ShelltenderAppProps) {
  const [wsConfig, setWsConfig] = useState<WebSocketServiceConfig | null>(config || null);
  const [loading, setLoading] = useState(!config && autoDetect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip auto-detection if config provided
    if (config || !autoDetect) {
      setLoading(false);
      return;
    }

    // Auto-detect backend configuration
    const detectBackend = async () => {
      try {
        // Try common health endpoints
        const endpoints = [
          '/api/health',
          '/api/shelltender/health',
          '/shelltender-api/health'
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint);
            if (response.ok) {
              const health = await response.json();
              
              // Determine WebSocket URL from health response
              let detectedUrl = wsUrl;
              
              if (!detectedUrl) {
                if (health.wsPath) {
                  // Single-port mode
                  detectedUrl = health.wsPath;
                } else if (health.wsPort) {
                  // Dual-port mode
                  detectedUrl = `ws://localhost:${health.wsPort}`;
                } else if (health.wsUrl) {
                  // Direct URL provided
                  detectedUrl = health.wsUrl;
                }
              }

              setWsConfig({ url: detectedUrl || '/ws' });
              setLoading(false);
              return;
            }
          } catch (err) {
            // Try next endpoint
          }
        }

        // No backend detected, use defaults
        console.warn('Could not detect Shelltender backend, using default /ws');
        setWsConfig({ url: '/ws' });
        setLoading(false);
      } catch (err) {
        setError('Failed to detect backend configuration');
        setLoading(false);
      }
    };

    detectBackend();
  }, [config, wsUrl, autoDetect]);

  // Check for xterm CSS
  useEffect(() => {
    const checkXtermCss = () => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      const hasXtermCss = Array.from(links).some(link => 
        link.getAttribute('href')?.includes('xterm.css')
      );

      if (!hasXtermCss) {
        console.error(
          'Missing xterm.css! Add this to your app:\n' +
          "import '@xterm/xterm/css/xterm.css';"
        );
      }
    };

    checkXtermCss();
  }, []);

  if (loading) {
    return (
      <div className={`shelltender-loading ${className}`}>
        <div className="spinner" />
        <p>Connecting to Shelltender...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`shelltender-error ${className}`}>
        <h3>Unable to connect</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  // Render with detected or provided config
  const content = children || (
    <div 
      className={`shelltender-default ${theme} ${className}`}
      data-testid="shelltender-container"
    >
      {enableTabs && (
        <div data-testid="session-tabs">
          <SessionTabs 
            sessions={[]}
            currentSessionId=""
            onSelectSession={() => {}}
            onNewSession={() => {}}
            onCloseSession={() => {}}
            onShowSessionManager={() => {}}
          />
        </div>
      )}
      <Terminal data-testid="shelltender-terminal" />
    </div>
  );

  return (
    <ToastProvider>
      <WebSocketProvider config={wsConfig!}>
        {content}
      </WebSocketProvider>
    </ToastProvider>
  );
}

/**
 * Simplest possible terminal component
 * Auto-creates session and connects
 */
export function QuickTerminal({
  sessionId,
  sessionConfig,
  onData,
  className
}: {
  sessionId?: string;
  sessionConfig?: any;
  onData?: (data: string) => void;
  className?: string;
}) {
  const [autoSessionId] = useState(
    sessionId || `terminal-${Math.random().toString(36).substring(7)}`
  );

  return (
    <ShelltenderApp>
      <Terminal
        sessionId={autoSessionId}
        sessionConfig={sessionConfig}
        onSessionCreated={(id) => {
          console.log('Terminal ready:', id);
        }}
        className={className}
        data-testid="shelltender-terminal"
        data-session-id={autoSessionId}
      />
    </ShelltenderApp>
  );
}