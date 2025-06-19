import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MobileTerminal } from '../MobileTerminal';
import { WebSocketProvider } from '../../../context/WebSocketContext';
import { MobileProvider } from '../../../context/MobileContext';

// Mock the Terminal component
vi.mock('../../Terminal', () => ({
  Terminal: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="terminal">{sessionId}</div>
  ),
}));

// Mock WebSocket service
const mockWsService = {
  send: vi.fn(),
};

vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    wsService: mockWsService,
    isConnected: true,
  }),
}));

describe('MobileTerminal Context Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should show context menu on long press with correct position', async () => {
    const { container } = render(
      <MobileProvider>
        <WebSocketProvider>
          <MobileTerminal sessionId="test-session" />
        </WebSocketProvider>
      </MobileProvider>
    );
    
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    expect(terminalContainer).toBeTruthy();
    
    // Simulate long press at specific coordinates
    const touchX = 150;
    const touchY = 300;
    
    // Mock touch event
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: touchX, clientY: touchY } as Touch],
      bubbles: true,
    });
    
    // Dispatch touch start
    terminalContainer!.dispatchEvent(touchEvent);
    
    // Wait for long press delay (400ms)
    await waitFor(() => {
      const contextMenu = screen.queryByText('Copy');
      expect(contextMenu).toBeTruthy();
    }, { timeout: 500 });
    
    // Check menu position
    const menuContainer = screen.getByText('Copy').closest('div[style*="position"]');
    const style = window.getComputedStyle(menuContainer!);
    
    // Menu should be positioned at or near the touch point
    expect(style.left).toBeTruthy();
    expect(style.top).toBeTruthy();
    
    // Verify all menu items are present
    expect(screen.getByText('Copy')).toBeTruthy();
    expect(screen.getByText('Paste')).toBeTruthy();
    expect(screen.getByText('Select All')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
  });
  
  it('should close context menu when clicking backdrop', async () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    
    // Trigger long press
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
      bubbles: true,
    });
    
    terminalContainer!.dispatchEvent(touchEvent);
    
    // Wait for menu to appear
    await waitFor(() => {
      expect(screen.queryByText('Copy')).toBeTruthy();
    }, { timeout: 500 });
    
    // Click backdrop
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeTruthy();
    
    backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    // Menu should disappear
    await waitFor(() => {
      expect(screen.queryByText('Copy')).toBeFalsy();
    });
  });
  
  it('should handle paste action correctly', async () => {
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockResolvedValue('pasted text'),
        writeText: vi.fn(),
      },
      configurable: true,
    });
    
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    const terminalContainer = container.querySelector('.mobile-terminal-container');
    
    // Trigger long press
    const touchEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
      bubbles: true,
    });
    
    terminalContainer!.dispatchEvent(touchEvent);
    
    // Wait for menu and click paste
    await waitFor(() => {
      const pasteButton = screen.getByText('Paste');
      pasteButton.click();
    }, { timeout: 500 });
    
    // Verify paste was sent
    await waitFor(() => {
      expect(mockWsService.send).toHaveBeenCalledWith({
        type: 'input',
        sessionId: 'test-session',
        data: 'pasted text',
      });
    });
  });
});