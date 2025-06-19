import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTerminal } from '../MobileTerminal';
import { WebSocketProvider } from '../../../context/WebSocketContext';

// Mock the WebSocket service
const mockWsService = {
  send: vi.fn(),
  connected: true,
};

vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    wsService: mockWsService,
    isConnected: true,
  }),
}));

// Mock the Terminal component
vi.mock('../../Terminal', () => ({
  Terminal: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="terminal">{sessionId}</div>
  ),
}));

// Mock clipboard API
const mockClipboard = {
  readText: vi.fn(),
  writeText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  configurable: true,
});

describe('MobileTerminal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  const simulateLongPress = async (element: HTMLElement) => {
    // Create touch event
    const touch = { clientX: 150, clientY: 200 };
    const touchStart = new TouchEvent('touchstart', {
      touches: [touch as Touch],
      bubbles: true,
    });
    
    // Fire touch start
    fireEvent(element, touchStart);
    
    // Wait for long press delay (400ms from useTerminalTouchGestures)
    vi.advanceTimersByTime(400);
    
    // Touch end
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [touch as Touch],
      bubbles: true,
    });
    fireEvent(element, touchEnd);
  };

  it('should show context menu on long press', async () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    expect(terminalContainer).toBeTruthy();
    
    // Simulate long press
    await simulateLongPress(terminalContainer!);
    
    // Menu should appear
    expect(screen.getByText('Copy')).toBeTruthy();
    expect(screen.getByText('Paste')).toBeTruthy();
    expect(screen.getByText('Select All')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
  });

  it('should handle paste action', async () => {
    mockClipboard.readText.mockResolvedValue('test paste text');
    
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Show context menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    await simulateLongPress(terminalContainer!);
    
    // Click paste button
    const pasteButton = screen.getByText('Paste');
    fireEvent.click(pasteButton);
    
    // Wait for async clipboard operation
    await waitFor(() => {
      expect(mockClipboard.readText).toHaveBeenCalled();
      expect(mockWsService.send).toHaveBeenCalledWith({
        type: 'input',
        sessionId: 'test-session',
        data: 'test paste text',
      });
    });
  });

  it('should handle clear action', async () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Show context menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    await simulateLongPress(terminalContainer!);
    
    // Click clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    // Should send Ctrl+L
    expect(mockWsService.send).toHaveBeenCalledWith({
      type: 'input',
      sessionId: 'test-session',
      data: '\x0c',
    });
  });

  it('should close menu when clicking backdrop', async () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Show context menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    await simulateLongPress(terminalContainer!);
    
    // Verify menu is visible
    expect(screen.getByText('Copy')).toBeTruthy();
    
    // Click backdrop
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeTruthy();
    
    // Wait for the 100ms delay before backdrop becomes active
    vi.advanceTimersByTime(100);
    
    fireEvent.click(backdrop!);
    
    // Menu should disappear
    expect(screen.queryByText('Copy')).toBeFalsy();
  });

  it('should not close menu immediately after showing', async () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Show context menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    await simulateLongPress(terminalContainer!);
    
    // Menu should appear
    expect(screen.getByText('Copy')).toBeTruthy();
    
    // Simulate immediate touch after menu appears
    fireEvent.touchStart(document.body);
    
    // Menu should still be visible (within 100ms delay)
    expect(screen.getByText('Copy')).toBeTruthy();
    
    // After delay, touches should close menu
    vi.advanceTimersByTime(100);
    fireEvent.touchStart(document.body);
    
    // Now menu should close
    expect(screen.queryByText('Copy')).toBeFalsy();
  });

  it('should handle clipboard permission errors', async () => {
    mockClipboard.readText.mockRejectedValue(new Error('Permission denied'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Show context menu and click paste
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    await simulateLongPress(terminalContainer!);
    
    const pasteButton = screen.getByText('Paste');
    fireEvent.click(pasteButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to paste:', expect.any(Error));
      expect(mockWsService.send).not.toHaveBeenCalled();
    });
    
    consoleSpy.mockRestore();
  });
});