import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createServer } from 'http';
import express from 'express';
import { 
  createShelltender, 
  createShelltenderServer 
} from '@shelltender/server';
import { ShelltenderApp, QuickTerminal, useShelltender } from '../index.js';
import '@xterm/xterm/css/xterm.css';

describe('Client Convenience Components - Integration Tests', () => {
  let serverInstance: any;
  let serverUrl: string;
  let wsUrl: string;

  beforeAll(async () => {
    // Start a real Shelltender server
    serverInstance = await createShelltenderServer({ 
      port: 0,
      enableSecurity: false 
    });
    
    serverUrl = serverInstance.url;
    wsUrl = serverInstance.wsUrl;
    
    console.log('Test server started:', { serverUrl, wsUrl });
  });

  afterAll(async () => {
    if (serverInstance?.stop) {
      await serverInstance.stop();
    }
  });

  afterEach(() => {
    // Clean up any rendered components
    document.body.innerHTML = '';
  });

  describe('ShelltenderApp', () => {
    it('should auto-detect backend and connect', async () => {
      // Mock the health endpoint to return our test server info
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === '/api/health') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              status: 'ok',
              wsPath: '/ws',
              mode: 'single-port'
            })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      render(
        <ShelltenderApp wsUrl={wsUrl}>
          <div data-testid="child-content">Test Content</div>
        </ShelltenderApp>
      );

      // Should show loading initially
      expect(screen.getByText('Connecting to Shelltender...')).toBeInTheDocument();

      // Should eventually show content
      await waitFor(() => {
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
      });

      vi.restoreAllMocks();
    });

    it('should show error when backend is unavailable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<ShelltenderApp />);

      await waitFor(() => {
        expect(screen.getByText('Unable to connect')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      vi.restoreAllMocks();
    });

    it('should render default layout when no children provided', async () => {
      render(
        <ShelltenderApp config={{ url: wsUrl }}>
          {/* No children */}
        </ShelltenderApp>
      );

      await waitFor(() => {
        expect(screen.getByTestId('shelltender-container')).toBeInTheDocument();
        expect(screen.getByTestId('shelltender-terminal')).toBeInTheDocument();
      });
    });
  });

  describe('QuickTerminal', () => {
    it('should render a working terminal with zero config', async () => {
      render(<QuickTerminal />);

      // Should render terminal
      await waitFor(() => {
        expect(screen.getByTestId('shelltender-terminal')).toBeInTheDocument();
      });

      // Should have auto-generated session ID
      const terminal = screen.getByTestId('shelltender-terminal');
      expect(terminal.getAttribute('data-session-id')).toMatch(/^terminal-\w+$/);
    });

    it('should accept sessionConfig for directory routing', async () => {
      const sessionConfig = {
        cwd: '/home/test/project',
        env: { PROJECT_NAME: 'test' }
      };

      render(
        <QuickTerminal 
          sessionId="test-session"
          sessionConfig={sessionConfig}
        />
      );

      await waitFor(() => {
        const terminal = screen.getByTestId('shelltender-terminal');
        expect(terminal.getAttribute('data-session-id')).toBe('test-session');
      });

      // In a real test, we'd verify the session was created with the right config
      // by checking the server or terminal output
    });
  });

  describe('useShelltender hook', () => {
    function TestComponent() {
      const {
        isConnected,
        isConnecting,
        sessions,
        activeSession,
        createSession,
        sendCommand,
        killSession
      } = useShelltender();

      return (
        <div>
          <div data-testid="status">
            {isConnecting ? 'Connecting' : isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div data-testid="sessions">{sessions.length} sessions</div>
          <div data-testid="active">{activeSession || 'none'}</div>
          <button onClick={() => createSession()}>Create Session</button>
          <button onClick={() => sendCommand('test')}>Send Command</button>
          <button onClick={() => killSession()}>Kill Session</button>
        </div>
      );
    }

    it('should provide connection status', async () => {
      render(
        <ShelltenderApp config={{ url: wsUrl }}>
          <TestComponent />
        </ShelltenderApp>
      );

      // Should show connecting then connected
      expect(screen.getByTestId('status')).toHaveTextContent('Connecting');
      
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Connected');
      });
    });

    it('should manage sessions', async () => {
      const user = userEvent.setup();
      
      render(
        <ShelltenderApp config={{ url: wsUrl }}>
          <TestComponent />
        </ShelltenderApp>
      );

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Connected');
      });

      // Initially no sessions
      expect(screen.getByTestId('sessions')).toHaveTextContent('0 sessions');
      expect(screen.getByTestId('active')).toHaveTextContent('none');

      // Create a session
      await user.click(screen.getByText('Create Session'));

      // Should now have a session
      await waitFor(() => {
        expect(screen.getByTestId('sessions')).toHaveTextContent('1 sessions');
        expect(screen.getByTestId('active')).not.toHaveTextContent('none');
      });
    });
  });

  describe('Real WebSocket communication', () => {
    it('should send and receive terminal data', async () => {
      // Custom component to test real I/O
      function TerminalTest() {
        const { isConnected, output, activeSession, createSession, sendCommand } = useShelltender();
        const [created, setCreated] = React.useState(false);

        React.useEffect(() => {
          if (isConnected && !created) {
            createSession().then(() => setCreated(true));
          }
        }, [isConnected, created, createSession]);

        const handleEcho = async () => {
          await sendCommand('echo "Hello from test"');
        };

        return (
          <div>
            <div data-testid="connected">{isConnected ? 'yes' : 'no'}</div>
            <div data-testid="session">{activeSession || 'none'}</div>
            <div data-testid="output">{output[activeSession || ''] || 'no output'}</div>
            <button onClick={handleEcho}>Send Echo</button>
          </div>
        );
      }

      const user = userEvent.setup();
      
      render(
        <ShelltenderApp config={{ url: wsUrl }}>
          <TerminalTest />
        </ShelltenderApp>
      );

      // Wait for connection and session
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('yes');
        expect(screen.getByTestId('session')).not.toHaveTextContent('none');
      });

      // Send echo command
      await user.click(screen.getByText('Send Echo'));

      // Should receive output
      await waitFor(() => {
        const output = screen.getByTestId('output').textContent;
        expect(output).toContain('Hello from test');
      }, { timeout: 5000 });
    });
  });

  describe('Error recovery', () => {
    it('should handle WebSocket disconnection gracefully', async () => {
      function DisconnectTest() {
        const { isConnected, disconnect } = useShelltender();
        
        return (
          <div>
            <div data-testid="status">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        );
      }

      const user = userEvent.setup();
      
      render(
        <ShelltenderApp config={{ url: wsUrl }}>
          <DisconnectTest />
        </ShelltenderApp>
      );

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Connected');
      });

      // Disconnect
      await user.click(screen.getByText('Disconnect'));

      // Should show disconnected
      expect(screen.getByTestId('status')).toHaveTextContent('Disconnected');
    });
  });
});