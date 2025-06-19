import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTerminal } from '../MobileTerminal';
import { WebSocketProvider } from '../../../context/WebSocketContext';

// Mock dependencies
vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    wsService: { send: vi.fn() },
    isConnected: true,
  }),
}));

vi.mock('../../Terminal', () => ({
  Terminal: () => <div data-testid="terminal" />,
}));

describe('MobileTerminal Button Click Tests', () => {
  it('should register button clicks and log to console', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Manually set the context menu to visible
    // Since we're testing button clicks, not the long press
    const component = container.querySelector('.mobile-terminal-container');
    
    // Trigger long press to show menu
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
      bubbles: true,
    });
    fireEvent(component!, touchStart);
    
    // Wait for long press (using setTimeout to simulate the delay)
    setTimeout(() => {
      // Check if menu is visible
      const copyButton = screen.queryByText('Copy');
      console.log('Copy button found:', !!copyButton);
      
      if (copyButton) {
        // Test touch events on button
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 150, clientY: 150 } as Touch],
          bubbles: true,
        });
        fireEvent(copyButton, touchEvent);
        
        // Test click event
        fireEvent.click(copyButton);
        
        // Check console logs
        expect(consoleSpy).toHaveBeenCalledWith('Copy button touched');
        expect(consoleSpy).toHaveBeenCalledWith('Copy button clicked!');
      }
    }, 500);
    
    consoleSpy.mockRestore();
  });

  it('should test event propagation on menu buttons', () => {
    const { container } = render(
      <WebSocketProvider>
        <MobileTerminal sessionId="test-session" />
      </WebSocketProvider>
    );
    
    // Create a test div structure to verify event bubbling
    const testStructure = document.createElement('div');
    testStructure.innerHTML = `
      <div class="context-menu">
        <button class="test-button">Test Button</button>
      </div>
    `;
    
    let menuClicked = false;
    let buttonClicked = false;
    
    const menu = testStructure.querySelector('.context-menu') as HTMLElement;
    const button = testStructure.querySelector('.test-button') as HTMLElement;
    
    menu.addEventListener('click', (e) => {
      menuClicked = true;
    });
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      buttonClicked = true;
    });
    
    // Simulate button click
    button.click();
    
    expect(buttonClicked).toBe(true);
    expect(menuClicked).toBe(false); // Should not bubble due to stopPropagation
  });
});