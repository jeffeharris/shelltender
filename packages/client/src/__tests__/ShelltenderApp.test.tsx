import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShelltenderApp, QuickTerminal } from '../ShelltenderApp.js';
import { useShelltender } from '../hooks/useShelltender.js';
import { renderHook } from '@testing-library/react';

// Mock server for tests
let mockServer: any;

beforeEach(() => {
  // Set up a mock WebSocket server response
  mockServer = {
    url: 'ws://localhost:8080/ws',
    health: { status: 'ok', wsPath: '/ws' }
  };
  
  // Mock fetch for auto-detection
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockServer.health)
      });
    }
    return Promise.reject(new Error('Not found'));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShelltenderApp - Zero config component', () => {
  it('should render a terminal with zero configuration', async () => {
    render(<ShelltenderApp />);
    
    // Should show terminal immediately (or loading state)
    await waitFor(() => {
      expect(screen.getByTestId('shelltender-terminal')).toBeInTheDocument();
    });
  });

  it('should auto-detect backend configuration', async () => {
    render(<ShelltenderApp />);
    
    // Should have called health endpoint
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/health');
    });
    
    // Should connect to detected WebSocket URL
    await waitFor(() => {
      const terminal = screen.getByTestId('shelltender-terminal');
      expect(terminal).toHaveAttribute('data-ws-url', 'ws://localhost:8080/ws');
    });
  });

  it('should handle custom configuration when provided', async () => {
    const customConfig = {
      wsUrl: 'ws://custom:9000/terminal',
      theme: 'light',
      fontSize: 16
    };
    
    render(<ShelltenderApp config={customConfig} />);
    
    // Should not call health endpoint when config provided
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Should use custom config
    const terminal = await screen.findByTestId('shelltender-terminal');
    expect(terminal).toHaveAttribute('data-ws-url', 'ws://custom:9000/terminal');
    expect(terminal).toHaveClass('theme-light');
  });

  it('should provide a default layout with tabs when multiple sessions exist', async () => {
    render(<ShelltenderApp enableTabs />);
    
    // Should show tab bar
    await waitFor(() => {
      expect(screen.getByTestId('session-tabs')).toBeInTheDocument();
    });
    
    // Should show new session button
    expect(screen.getByText('New Session')).toBeInTheDocument();
  });

  it('should work with custom children layout', async () => {
    render(
      <ShelltenderApp>
        <div>Custom Header</div>
        <QuickTerminal />
        <div>Custom Footer</div>
      </ShelltenderApp>
    );
    
    expect(screen.getByText('Custom Header')).toBeInTheDocument();
    expect(screen.getByText('Custom Footer')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('shelltender-terminal')).toBeInTheDocument();
    });
  });

  it('should handle connection errors gracefully', async () => {
    // Mock failed health check
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    render(<ShelltenderApp />);
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/Unable to connect/i)).toBeInTheDocument();
    });
    
    // Should show retry button
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    // Clicking retry should attempt reconnection
    await userEvent.click(retryButton);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should automatically handle mobile layout', async () => {
    // Mock mobile user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });
    
    render(<ShelltenderApp />);
    
    // Should render mobile-optimized layout
    await waitFor(() => {
      const container = screen.getByTestId('shelltender-container');
      expect(container).toHaveClass('mobile-layout');
    });
    
    // Should have touch-friendly controls
    expect(screen.getByTestId('mobile-keyboard-toggle')).toBeInTheDocument();
  });
});

describe('QuickTerminal - Simplest possible terminal', () => {
  it('should render a working terminal with one line', async () => {
    render(<QuickTerminal />);
    
    await waitFor(() => {
      expect(screen.getByTestId('shelltender-terminal')).toBeInTheDocument();
    });
  });

  it('should accept a session ID prop', async () => {
    render(<QuickTerminal sessionId="my-custom-session" />);
    
    const terminal = await screen.findByTestId('shelltender-terminal');
    expect(terminal).toHaveAttribute('data-session-id', 'my-custom-session');
  });

  it('should handle commands via props', async () => {
    const onData = vi.fn();
    render(<QuickTerminal onData={onData} />);
    
    // Type in terminal
    const terminal = await screen.findByTestId('shelltender-terminal');
    await userEvent.type(terminal, 'ls{enter}');
    
    // Should have received the input
    await waitFor(() => {
      expect(onData).toHaveBeenCalledWith(expect.stringContaining('ls'));
    });
  });
});

describe('useShelltender - Unified hook', () => {
  it('should provide all terminal functionality in one hook', async () => {
    const { result } = renderHook(() => useShelltender());
    
    // Should provide connection state
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(true);
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Should provide methods
    expect(typeof result.current.createSession).toBe('function');
    expect(typeof result.current.sendCommand).toBe('function');
    expect(typeof result.current.sendInput).toBe('function');
    expect(typeof result.current.killSession).toBe('function');
    
    // Should provide session data
    expect(result.current.sessions).toEqual([]);
    expect(result.current.activeSession).toBeNull();
  });

  it('should handle session creation simply', async () => {
    const { result } = renderHook(() => useShelltender());
    
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    
    // Create a session
    const sessionId = await result.current.createSession();
    
    expect(sessionId).toBeTruthy();
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.activeSession).toBe(sessionId);
  });

  it('should handle commands and input easily', async () => {
    const { result } = renderHook(() => useShelltender());
    
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    
    const sessionId = await result.current.createSession();
    
    // Send a command (adds \n automatically)
    await result.current.sendCommand('ls -la');
    
    // Send raw input
    await result.current.sendInput('echo "test"');
    
    // Should have output
    await waitFor(() => {
      expect(result.current.output[sessionId]).toContain('ls -la');
    });
  });

  it('should provide terminal reference for advanced usage', async () => {
    const { result } = renderHook(() => useShelltender());
    
    expect(result.current.terminalRef).toBeDefined();
    
    // Can be used with Terminal component
    // <Terminal ref={result.current.terminalRef} />
  });

  it('should handle auto-reconnection', async () => {
    const { result } = renderHook(() => useShelltender());
    
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    
    // Simulate disconnect
    result.current.disconnect();
    expect(result.current.isConnected).toBe(false);
    
    // Should auto-reconnect
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    }, { timeout: 5000 });
  });
});

describe('Error boundaries and edge cases', () => {
  it('should show helpful message when xterm CSS is missing', async () => {
    // Remove xterm CSS to simulate missing import
    document.querySelectorAll('link[href*="xterm.css"]').forEach(el => el.remove());
    
    render(<ShelltenderApp />);
    
    await waitFor(() => {
      expect(screen.getByText(/Missing xterm.css/i)).toBeInTheDocument();
      expect(screen.getByText(/import '@xterm\/xterm\/css\/xterm.css'/)).toBeInTheDocument();
    });
  });

  it('should detect and warn about port conflicts', async () => {
    // Mock health check showing different port than expected
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'ok',
        wsPath: '/ws',
        warning: 'Port mismatch detected'
      })
    });
    
    render(<ShelltenderApp />);
    
    await waitFor(() => {
      expect(screen.getByText(/Port mismatch detected/i)).toBeInTheDocument();
    });
  });
});