import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionTabs } from '../components/SessionTabs';
import { TerminalSession } from '../../../src/shared/types.js';

describe('SessionTabs', () => {
  const mockSessions: TerminalSession[] = [
    {
      id: 'session-1',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cols: 80,
      rows: 24,
      title: 'Session 1'
    },
    {
      id: 'session-2',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      cols: 80,
      rows: 24,
      title: 'Session 2'
    }
  ];

  const mockProps = {
    sessions: mockSessions,
    currentSessionId: 'session-1',
    onSelectSession: vi.fn(),
    onCloseSession: vi.fn(),
    onNewSession: vi.fn(),
    onShowSessionManager: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all sessions as tabs', () => {
    render(<SessionTabs {...mockProps} />);
    
    expect(screen.getByText('Session 1')).toBeInTheDocument();
    expect(screen.getByText('Session 2')).toBeInTheDocument();
  });

  it('should highlight active session', () => {
    render(<SessionTabs {...mockProps} />);
    
    const activeTab = screen.getByText('Session 1').closest('div');
    expect(activeTab).toHaveClass('bg-gray-900');
    expect(activeTab).toHaveClass('border-blue-500');
  });

  it('should call onSessionSelect when tab is clicked', () => {
    render(<SessionTabs {...mockProps} />);
    
    fireEvent.click(screen.getByText('Session 2'));
    expect(mockProps.onSelectSession).toHaveBeenCalledWith('session-2');
  });

  it('should call onCloseSession when close button is clicked', () => {
    render(<SessionTabs {...mockProps} />);
    
    // Find the close button for Session 1
    const closeButtons = screen.getAllByTitle('Close session');
    fireEvent.click(closeButtons[0]);
    
    expect(mockProps.onCloseSession).toHaveBeenCalledWith('session-1');
  });

  it('should call onNewSession when new tab button is clicked', () => {
    render(<SessionTabs {...mockProps} />);
    
    const newButton = screen.getByTitle('New Terminal');
    fireEvent.click(newButton);
    
    expect(mockProps.onNewSession).toHaveBeenCalled();
  });

  it('should call onShowSessionManager when manager button is clicked', () => {
    render(<SessionTabs {...mockProps} />);
    
    const managerButton = screen.getByTitle('Show all sessions');
    fireEvent.click(managerButton);
    
    expect(mockProps.onShowSessionManager).toHaveBeenCalled();
  });

  it('should handle empty sessions list', () => {
    render(<SessionTabs {...mockProps} sessions={[]} />);
    
    // Should still show new session and manager buttons
    expect(screen.getByTitle('New Terminal')).toBeInTheDocument();
    expect(screen.getByTitle('Show all sessions')).toBeInTheDocument();
  });
});