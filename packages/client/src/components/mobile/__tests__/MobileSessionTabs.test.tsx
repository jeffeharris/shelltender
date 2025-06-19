import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSessionTabs } from '../MobileSessionTabs';
import { MobileProvider } from '../../../context/MobileContext';

describe('MobileSessionTabs Button Functionality', () => {
  it('should call onCreateSession when new session button is clicked', () => {
    const onCreateSession = vi.fn();
    const onSelectSession = vi.fn();
    const onManageSessions = vi.fn();

    render(
      <MobileProvider>
        <MobileSessionTabs
          sessions={[]}
          activeSessionId={null}
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onManageSessions={onManageSessions}
        />
      </MobileProvider>
    );

    // Find the new session button (+ icon)
    const newSessionButton = screen.getByLabelText('New session');
    
    // Click it
    fireEvent.click(newSessionButton);
    
    // Check if handler was called
    expect(onCreateSession).toHaveBeenCalledTimes(1);
  });

  it('should call onManageSessions when manage button is clicked', () => {
    const onCreateSession = vi.fn();
    const onSelectSession = vi.fn();
    const onManageSessions = vi.fn();

    render(
      <MobileProvider>
        <MobileSessionTabs
          sessions={[{ id: '1', name: 'Session 1' }]}
          activeSessionId="1"
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onManageSessions={onManageSessions}
        />
      </MobileProvider>
    );

    // First expand the menu
    const menuToggle = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuToggle);
    
    // Find and click the Manage All button
    const manageButton = screen.getByText('Manage All');
    fireEvent.click(manageButton);
    
    // Check if handler was called
    expect(onManageSessions).toHaveBeenCalledTimes(1);
  });

  it('should call onSelectSession when session dot is clicked', () => {
    const onCreateSession = vi.fn();
    const onSelectSession = vi.fn();
    const onManageSessions = vi.fn();

    render(
      <MobileProvider>
        <MobileSessionTabs
          sessions={[
            { id: '1', name: 'Session 1' },
            { id: '2', name: 'Session 2' }
          ]}
          activeSessionId="1"
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onManageSessions={onManageSessions}
        />
      </MobileProvider>
    );

    // Click on session 2 dot
    const sessionDot = screen.getByLabelText('Session 2');
    fireEvent.click(sessionDot);
    
    // Check if handler was called with correct session ID
    expect(onSelectSession).toHaveBeenCalledWith('2');
  });
});