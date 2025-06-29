import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionManager } from './SessionManager.js';
import type { TerminalSession } from '@shelltender/core';

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('SessionManager', () => {
  const mockSessions: TerminalSession[] = [
    {
      id: 'session-1',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      lastAccessedAt: new Date('2024-01-01T11:00:00Z'),
      cols: 80,
      rows: 24,
      title: 'Dev Server'
    },
    {
      id: 'session-2',
      createdAt: new Date('2024-01-01T09:00:00Z'),
      lastAccessedAt: new Date('2024-01-01T09:30:00Z'),
      cols: 80,
      rows: 24
    },
    {
      id: 'session-3',
      createdAt: new Date('2024-01-01T08:00:00Z'),
      lastAccessedAt: new Date('2024-01-01T08:30:00Z'),
      cols: 80,
      rows: 24,
      title: 'Database Client'
    }
  ];

  const mockProps = {
    sessions: mockSessions,
    openTabs: ['session-1', 'session-2'],
    onOpenSession: vi.fn(),
    onKillSession: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.confirm as any).mockReturnValue(true);
  });

  it('should render session manager modal', () => {
    render(<SessionManager {...mockProps} />);
    
    expect(screen.getByText('Session Manager')).toBeInTheDocument();
    expect(screen.getByText('Open Sessions')).toBeInTheDocument();
    expect(screen.getByText('Backgrounded Sessions')).toBeInTheDocument();
  });

  it('should categorize sessions correctly', () => {
    render(<SessionManager {...mockProps} />);
    
    // Open sessions
    expect(screen.getByText('Dev Server')).toBeInTheDocument();
    // Session 2 has no title, so it shows "Terminal" + first 8 chars of ID
    expect(screen.getByText('Terminal session-')).toBeInTheDocument();
    
    // Backgrounded session
    expect(screen.getByText('Database Client')).toBeInTheDocument();
  });

  it('should display session creation times', () => {
    render(<SessionManager {...mockProps} />);
    
    // Check for formatted dates
    expect(screen.getAllByText(/Created:/)).toHaveLength(3);
    expect(screen.getAllByText(/Last accessed:/)).toHaveLength(1); // Only backgrounded sessions show this
  });

  it('should call onClose when close button clicked', () => {
    render(<SessionManager {...mockProps} />);
    
    // Find the close button - it's the X button in the header
    const header = screen.getByText('Session Manager').parentElement;
    const closeButton = header?.querySelector('button');
    if (closeButton) fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should call onOpenSession when backgrounded session clicked', () => {
    render(<SessionManager {...mockProps} />);
    
    // Click on the backgrounded session - find the clickable div
    const databaseClientText = screen.getByText('Database Client');
    const clickableDiv = databaseClientText.closest('.cursor-pointer');
    
    if (clickableDiv) {
      fireEvent.click(clickableDiv);
    }
    
    expect(mockProps.onOpenSession).toHaveBeenCalledWith('session-3');
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should show confirm dialog before killing session', () => {
    render(<SessionManager {...mockProps} />);
    
    // Find kill button for first open session
    const killButtons = screen.getAllByTitle('Kill session');
    fireEvent.click(killButtons[0]);
    
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to kill this session? This cannot be undone.');
    expect(mockProps.onKillSession).toHaveBeenCalledWith('session-1');
  });

  it('should not kill session if confirm is cancelled', () => {
    (global.confirm as any).mockReturnValue(false);
    
    render(<SessionManager {...mockProps} />);
    
    const killButtons = screen.getAllByTitle('Kill session');
    fireEvent.click(killButtons[0]);
    
    expect(global.confirm).toHaveBeenCalled();
    expect(mockProps.onKillSession).not.toHaveBeenCalled();
  });

  it('should show "No backgrounded sessions" when all sessions are open', () => {
    const propsWithAllOpen = {
      ...mockProps,
      openTabs: ['session-1', 'session-2', 'session-3']
    };
    
    render(<SessionManager {...propsWithAllOpen} />);
    
    expect(screen.getByText('No backgrounded sessions')).toBeInTheDocument();
  });

  it('should stop event propagation when killing backgrounded session', () => {
    render(<SessionManager {...mockProps} />);
    
    // Find the kill button for the backgrounded session
    const backgroundedSection = screen.getByText('Database Client').closest('.group');
    const killButton = backgroundedSection?.querySelector('button[title="Kill session"]');
    
    if (killButton) {
      fireEvent.click(killButton);
    }
    
    expect(mockProps.onKillSession).toHaveBeenCalledWith('session-3');
    expect(mockProps.onOpenSession).not.toHaveBeenCalled(); // Should not open session
  });

  it('should truncate long session IDs', () => {
    render(<SessionManager {...mockProps} />);
    
    // Session 2 has no title, so it should show truncated ID
    // Find the element that contains "Terminal session-"
    const elements = screen.getAllByText(/Terminal session-/);
    expect(elements.length).toBeGreaterThan(0);
    // The text should be "Terminal " + first 8 chars of the ID
    expect(elements[0].textContent).toBe('Terminal session-');
  });

  it('should handle empty sessions list', () => {
    const emptyProps = {
      ...mockProps,
      sessions: [],
      openTabs: []
    };
    
    render(<SessionManager {...emptyProps} />);
    
    expect(screen.getByText('No backgrounded sessions')).toBeInTheDocument();
  });
});