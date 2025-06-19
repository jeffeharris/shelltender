import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileTerminal } from '../MobileTerminal';
import { WebSocketProvider } from '../../../context/WebSocketContext';
import { MobileProvider } from '../../../context/MobileContext';

// Mock dependencies
const mockWsService = {
  send: vi.fn(),
};

vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    wsService: mockWsService,
    isConnected: true,
  }),
}));

vi.mock('../../Terminal', () => ({
  Terminal: () => <div data-testid="terminal" />,
}));

// Mock clipboard
const mockClipboard = {
  readText: vi.fn(),
  writeText: vi.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  configurable: true,
});

describe('MobileTerminal Button Click Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle button clicks when menu is visible', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    const { container } = render(
      <MobileProvider>
        <WebSocketProvider>
          <MobileTerminal sessionId="test-session" />
        </WebSocketProvider>
      </MobileProvider>
    );

    // Simulate long press to show menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 150, clientY: 200 } as Touch],
      bubbles: true,
    });
    
    fireEvent(terminalContainer!, touchStart);
    
    // Wait for long press delay
    vi.advanceTimersByTime(400);
    
    // Verify menu is shown
    await waitFor(() => {
      expect(screen.getByText('Paste')).toBeTruthy();
    });

    // Click the Paste button
    const pasteButton = screen.getByText('Paste');
    fireEvent.click(pasteButton);

    // Check if click handler was called
    expect(consoleSpy).toHaveBeenCalledWith('Paste button onClick fired');
    expect(consoleSpy).toHaveBeenCalledWith('Paste button clicked', expect.any(Object));

    consoleSpy.mockRestore();
  });

  it('should send clear command when Clear button is clicked', async () => {
    const { container } = render(
      <MobileProvider>
        <WebSocketProvider>
          <MobileTerminal sessionId="test-session" />
        </WebSocketProvider>
      </MobileProvider>
    );

    // Show menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    fireEvent(terminalContainer!, new TouchEvent('touchstart', {
      touches: [{ clientX: 150, clientY: 200 } as Touch],
      bubbles: true,
    }));
    
    vi.advanceTimersByTime(400);
    
    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeTruthy();
    });

    // Click Clear button
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Verify WebSocket send was called with Ctrl+L
    expect(mockWsService.send).toHaveBeenCalledWith({
      type: 'input',
      sessionId: 'test-session',
      data: '\x0c',
    });
  });

  it('should test if buttons receive touch events', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    const { container } = render(
      <MobileProvider>
        <WebSocketProvider>
          <MobileTerminal sessionId="test-session" />
        </WebSocketProvider>
      </MobileProvider>
    );

    // Show menu
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    fireEvent(terminalContainer!, new TouchEvent('touchstart', {
      touches: [{ clientX: 150, clientY: 200 } as Touch],
      bubbles: true,
    }));
    
    vi.advanceTimersByTime(400);
    
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeTruthy();
    });

    // Touch the Copy button
    const copyButton = screen.getByText('Copy');
    fireEvent.touchStart(copyButton);

    // Should log touch event
    expect(consoleSpy).toHaveBeenCalledWith('Copy button touched');

    consoleSpy.mockRestore();
  });
});