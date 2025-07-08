import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '../../test-utils/render';
import { Terminal, TerminalHandle } from './Terminal';
import { Terminal as XTerm } from '@xterm/xterm';
import { WebSocketService } from '../../services/WebSocketService';
import React from 'react';

// Mock WebSocket
vi.mock('../../services/WebSocketService');

// Mock FitAddon
const mockFitAddon = {
  fit: vi.fn(),
};

// Mock xterm - simplified
const mockXTermInstance = {
  open: vi.fn(),
  write: vi.fn(),
  clear: vi.fn(),
  dispose: vi.fn(),
  resize: vi.fn(),
  onData: vi.fn(),
  attachCustomKeyEventHandler: vi.fn(),
  loadAddon: vi.fn(),
  focus: vi.fn(),
  unicode: { activeVersion: '11' },
  cols: 80,
  rows: 24,
};

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => mockXTermInstance),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => mockFitAddon),
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(),
}));

vi.mock('@xterm/addon-unicode11', () => ({
  Unicode11Addon: vi.fn(),
}));

const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
  on: vi.fn(),
  off: vi.fn(),
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
};

describe('Terminal Component (Simplified)', () => {
  beforeEach(() => {
    vi.mocked(WebSocketService).mockImplementation(() => mockWebSocketService as any);
    vi.clearAllMocks();
  });

  it('should render terminal container', () => {
    const { container } = render(<Terminal />);
    expect(container.querySelector('.terminal-container')).toBeInTheDocument();
  });

  it('should create new session when no sessionId provided', () => {
    render(<Terminal />);
    
    // Get the connect callback and trigger it
    const connectCallback = mockWebSocketService.onConnect.mock.calls[0][0];
    act(() => {
      connectCallback();
    });
    
    expect(mockWebSocketService.send).toHaveBeenCalledWith({
      type: 'create',
      cols: expect.any(Number),
      rows: expect.any(Number),
    });
  });

  it('should connect to existing session when sessionId provided', () => {
    const sessionId = 'test-123';
    render(<Terminal sessionId={sessionId} />);
    
    const connectCallback = mockWebSocketService.onConnect.mock.calls[0][0];
    act(() => {
      connectCallback();
    });
    
    expect(mockWebSocketService.send).toHaveBeenCalledWith({
      type: 'connect',
      sessionId,
    });
  });

  it('should handle disconnection state', () => {
    mockWebSocketService.isConnected.mockReturnValue(false);
    render(<Terminal />);
    
    const disconnectCallback = mockWebSocketService.onDisconnect.mock.calls[0][0];
    act(() => {
      disconnectCallback();
    });
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should call onSessionCreated when session is created', () => {
    const onSessionCreated = vi.fn();
    render(<Terminal onSessionCreated={onSessionCreated} />);
    
    // Connect first
    const connectCallback = mockWebSocketService.onConnect.mock.calls[0][0];
    act(() => {
      connectCallback();
    });
    
    // Get the created event handler
    const createdHandler = mockWebSocketService.on.mock.calls.find(
      call => call[0] === 'created'
    )[1];
    
    // Trigger created event
    act(() => {
      createdHandler({ type: 'created', sessionId: 'new-123' });
    });
    
    expect(onSessionCreated).toHaveBeenCalledWith('new-123');
  });

  it('should handle terminal output', () => {
    render(<Terminal sessionId="test" />);
    
    const outputHandler = mockWebSocketService.on.mock.calls.find(
      call => call[0] === 'output'
    )[1];
    
    act(() => {
      outputHandler({ type: 'output', data: 'Hello World' });
    });
    
    expect(mockXTermInstance.write).toHaveBeenCalledWith('Hello World');
  });

  it('should handle resize messages', () => {
    render(<Terminal sessionId="test" />);
    
    const resizeHandler = mockWebSocketService.on.mock.calls.find(
      call => call[0] === 'resize'
    )[1];
    
    act(() => {
      resizeHandler({ type: 'resize', cols: 120, rows: 40 });
    });
    
    expect(mockXTermInstance.resize).toHaveBeenCalledWith(120, 40);
  });

  it('should send user input through websocket', () => {
    render(<Terminal sessionId="test-session" />);
    
    // Connect first and let the session be marked as ready
    const connectCallback = mockWebSocketService.onConnect.mock.calls[0][0];
    act(() => {
      connectCallback();
    });
    
    // The Terminal component blocks input until the session is ready
    // We need to trigger the 'connect' event to mark it as ready
    const connectHandler = mockWebSocketService.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1];
    
    act(() => {
      connectHandler({ type: 'connect', scrollback: '' });
    });
    
    // Clear previous calls
    mockWebSocketService.send.mockClear();
    
    // Get the onData handler
    expect(mockXTermInstance.onData).toHaveBeenCalled();
    const onDataHandler = mockXTermInstance.onData.mock.calls[0][0];
    
    // Make sure WebSocket is still connected
    mockWebSocketService.isConnected.mockReturnValue(true);
    
    // Simulate typing
    act(() => {
      onDataHandler('ls -la');
    });
    
    expect(mockWebSocketService.send).toHaveBeenCalledWith({
      type: 'input',
      sessionId: 'test-session',
      data: 'ls -la',
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<Terminal />);
    
    unmount();
    
    expect(mockXTermInstance.dispose).toHaveBeenCalled();
    expect(mockWebSocketService.disconnect).toHaveBeenCalled();
  });

  it('should apply custom font size', () => {
    const customFontSize = 18;
    render(<Terminal fontSize={customFontSize} />);
    
    expect(vi.mocked(XTerm)).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: customFontSize
      })
    );
  });

  it('should apply custom font family', () => {
    const customFont = 'JetBrains Mono, monospace';
    render(<Terminal fontFamily={customFont} />);
    
    expect(vi.mocked(XTerm)).toHaveBeenCalledWith(
      expect.objectContaining({
        fontFamily: customFont
      })
    );
  });

  it('should apply custom theme', () => {
    const customTheme = {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selection: '#3a3d41',
    };
    render(<Terminal theme={customTheme} />);
    
    expect(vi.mocked(XTerm)).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        })
      })
    );
  });

  it('should apply custom cursor style', () => {
    render(<Terminal cursorStyle="underline" cursorBlink={false} />);
    
    expect(vi.mocked(XTerm)).toHaveBeenCalledWith(
      expect.objectContaining({
        cursorStyle: 'underline',
        cursorBlink: false
      })
    );
  });

  it('should apply custom scrollback buffer', () => {
    const customScrollback = 50000;
    render(<Terminal scrollback={customScrollback} />);
    
    expect(vi.mocked(XTerm)).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollback: customScrollback
      })
    );
  });
});

describe('Terminal Resize Functionality', () => {
  let mockResizeObserver: any;
  let resizeCallback: (entries: any[]) => void;

  beforeEach(() => {
    vi.mocked(WebSocketService).mockImplementation(() => mockWebSocketService as any);
    vi.clearAllMocks();
    
    // Mock ResizeObserver
    mockResizeObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    };
    
    // @ts-ignore
    global.ResizeObserver = vi.fn().mockImplementation((callback) => {
      resizeCallback = callback;
      return mockResizeObserver;
    });
    
    // Mock requestAnimationFrame to execute immediately
    let rafCallbacks: Array<(time: number) => void> = [];
    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb);
      // Execute callbacks after current call stack
      Promise.resolve().then(() => {
        const callbacks = [...rafCallbacks];
        rafCallbacks = [];
        callbacks.forEach(callback => callback(0));
      });
      return rafCallbacks.length;
    });
     
    // Mock container dimensions
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 600,
    });
  });

  afterEach(() => {
    // @ts-ignore
    delete global.ResizeObserver;
    // @ts-ignore
    delete global.requestAnimationFrame;
  });

  it('should expose fit method via ref', () => {
    const ref = React.createRef<TerminalHandle>();
    render(<Terminal ref={ref} />);
    
    expect(ref.current).toBeDefined();
    expect(ref.current?.fit).toBeInstanceOf(Function);
  });

  it('should call fit when manually triggered via ref', () => {
    const ref = React.createRef<TerminalHandle>();
    render(<Terminal ref={ref} />);
    
    act(() => {
      ref.current?.fit();
    });
    
    expect(mockFitAddon.fit).toHaveBeenCalled();
  });

  it('should call focus when manually triggered via ref', () => {
    const ref = React.createRef<TerminalHandle>();
    render(<Terminal ref={ref} />);
    
    act(() => {
      ref.current?.focus();
    });
    
    expect(mockXTermInstance.focus).toHaveBeenCalled();
  });

  it('should set up ResizeObserver on mount', () => {
    const { container } = render(<Terminal />);
    
    expect(global.ResizeObserver).toHaveBeenCalled();
    expect(mockResizeObserver.observe).toHaveBeenCalled();
  });

  it('should trigger fit when ResizeObserver detects size change', async () => {
    const { container } = render(<Terminal />);
    
    // Clear initial fit calls
    mockFitAddon.fit.mockClear();
    
    // Simulate resize event
    act(() => {
      resizeCallback([{
        target: container.querySelector('.relative'),
        contentRect: { width: 800, height: 600 }
      }]);
    });
    
    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    expect(mockFitAddon.fit).toHaveBeenCalled();
  });

  it('should apply custom padding styles', () => {
    const { container } = render(
      <Terminal padding={{ left: 10, right: 20, top: 5, bottom: 15 }} />
    );
    
    const terminalContainer = container.querySelector('.terminal-container') as HTMLElement;
    expect(terminalContainer.style.paddingLeft).toBe('10px');
    expect(terminalContainer.style.paddingRight).toBe('20px');
    expect(terminalContainer.style.paddingTop).toBe('5px');
    expect(terminalContainer.style.paddingBottom).toBe('15px');
  });

  it('should apply uniform padding when number provided', () => {
    const { container } = render(<Terminal padding={15} />);
    
    const terminalContainer = container.querySelector('.terminal-container') as HTMLElement;
    expect(terminalContainer.style.paddingLeft).toBe('15px');
    expect(terminalContainer.style.paddingRight).toBe('15px');
    expect(terminalContainer.style.paddingTop).toBe('15px');
    expect(terminalContainer.style.paddingBottom).toBe('15px');
  });

  it('should enable debug logging when debug prop is true', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Terminal debug={true} />);
    
    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Check if any debug logs were made (either log or error)
    const allCalls = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
    const hasTerminalLog = allCalls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('[Terminal]'))
    );
    
    expect(hasTerminalLog).toBe(true);
    
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should validate dimensions before sending resize to server', () => {
    render(<Terminal sessionId="test" />);
    
    // Set invalid dimensions
    mockXTermInstance.cols = 2000;
    mockXTermInstance.rows = -5;
    
    const ref = React.createRef<TerminalHandle>();
    const { rerender } = render(<Terminal ref={ref} sessionId="test" />);
    
    mockWebSocketService.send.mockClear();
    
    act(() => {
      ref.current?.fit();
    });
    
    // Should not send resize with invalid dimensions
    expect(mockWebSocketService.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resize' })
    );
  });

  it('should cleanup ResizeObserver on unmount', () => {
    const { unmount } = render(<Terminal />);
    
    unmount();
    
    expect(mockResizeObserver.disconnect).toHaveBeenCalled();
  });

  it('should remove all WebSocket event listeners on unmount', () => {
    const { unmount } = render(<Terminal />);
    
    unmount();
    
    expect(mockWebSocketService.off).toHaveBeenCalledWith('output', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('created', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('bell', expect.any(Function));
    expect(mockWebSocketService.off).toHaveBeenCalledWith('exit', expect.any(Function));
  });
});