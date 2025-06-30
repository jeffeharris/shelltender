import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test-utils/render';
import { Terminal } from './Terminal';
import { WebSocketService } from '../../services/WebSocketService';

// Mock WebSocket
vi.mock('../../services/WebSocketService');

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
  unicode: { activeVersion: '11' },
  cols: 80,
  rows: 24,
};

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => mockXTermInstance),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({ fit: vi.fn() })),
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
});