import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TerminalEventMonitor } from '../TerminalEventMonitor.js';
import { useTerminalEvents } from '../../hooks/useTerminalEvents.js';
import type { PatternMatchEvent } from '@shelltender/core';

// Mock the useTerminalEvents hook
vi.mock('../../hooks/useTerminalEvents');

describe('TerminalEventMonitor', () => {
  let mockRegisterPattern: any;
  let mockClearEvents: any;
  let mockEvents: PatternMatchEvent[];

  beforeEach(() => {
    mockRegisterPattern = vi.fn().mockResolvedValue('pattern-id');
    mockClearEvents = vi.fn();
    mockEvents = [];

    (useTerminalEvents as any).mockReturnValue({
      events: mockEvents,
      registerPattern: mockRegisterPattern,
      clearEvents: mockClearEvents,
      isConnected: true
    });
  });

  it('should render with initial state', () => {
    render(<TerminalEventMonitor sessionId="session-1" />);

    expect(screen.getByText('Event Monitor')).toBeInTheDocument();
    expect(screen.getByText('Start Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Errors (0)')).toBeInTheDocument();
    expect(screen.getByText('Success (0)')).toBeInTheDocument();
    expect(screen.getByText('No errors detected')).toBeInTheDocument();
    expect(screen.getByText('No success events detected')).toBeInTheDocument();
  });

  it('should register patterns when monitoring starts', async () => {
    render(<TerminalEventMonitor sessionId="session-1" />);

    const startButton = screen.getByText('Start Monitoring');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockRegisterPattern).toHaveBeenCalledWith({
        name: 'error-detector',
        type: 'regex',
        pattern: /error:|failed:/i,
        options: { debounce: 100 }
      });

      expect(mockRegisterPattern).toHaveBeenCalledWith({
        name: 'success-detector',
        type: 'regex',
        pattern: /success|completed|done/i,
        options: { debounce: 100 }
      });
    });

    expect(screen.getByText('Stop Monitoring')).toBeInTheDocument();
  });

  it('should display error events', () => {
    const errorEvent: PatternMatchEvent = {
      type: 'pattern-match',
      sessionId: 'session-1',
      patternId: 'pattern-1',
      patternName: 'error-detector',
      timestamp: Date.now(),
      match: 'Error: Something went wrong',
      position: 100
    };

    (useTerminalEvents as any).mockReturnValue({
      events: [errorEvent],
      registerPattern: mockRegisterPattern,
      clearEvents: mockClearEvents,
      isConnected: true
    });

    render(<TerminalEventMonitor sessionId="session-1" />);

    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('No errors detected')).not.toBeInTheDocument();
  });

  it('should display success events', () => {
    const successEvent: PatternMatchEvent = {
      type: 'pattern-match',
      sessionId: 'session-1',
      patternId: 'pattern-2',
      patternName: 'success-detector',
      timestamp: Date.now(),
      match: 'Build completed successfully',
      position: 200
    };

    (useTerminalEvents as any).mockReturnValue({
      events: [successEvent],
      registerPattern: mockRegisterPattern,
      clearEvents: mockClearEvents,
      isConnected: true
    });

    render(<TerminalEventMonitor sessionId="session-1" />);

    expect(screen.getByText('Success (1)')).toBeInTheDocument();
    expect(screen.getByText('Build completed successfully')).toBeInTheDocument();
    expect(screen.queryByText('No success events detected')).not.toBeInTheDocument();
  });

  it('should display both error and success events', () => {
    const events: PatternMatchEvent[] = [
      {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-1',
        patternName: 'error-detector',
        timestamp: Date.now(),
        match: 'Error: Failed to compile',
        position: 100
      },
      {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-2',
        patternName: 'success-detector',
        timestamp: Date.now(),
        match: 'Tests completed successfully',
        position: 200
      }
    ];

    (useTerminalEvents as any).mockReturnValue({
      events,
      registerPattern: mockRegisterPattern,
      clearEvents: mockClearEvents,
      isConnected: true
    });

    render(<TerminalEventMonitor sessionId="session-1" />);

    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Error: Failed to compile')).toBeInTheDocument();
    expect(screen.getByText('Success (1)')).toBeInTheDocument();
    expect(screen.getByText('Tests completed successfully')).toBeInTheDocument();
  });

  it('should clear events when Clear button is clicked', () => {
    render(<TerminalEventMonitor sessionId="session-1" />);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(mockClearEvents).toHaveBeenCalled();
  });

  it('should handle pattern registration errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRegisterPattern.mockRejectedValue(new Error('Registration failed'));

    render(<TerminalEventMonitor sessionId="session-1" />);

    const startButton = screen.getByText('Start Monitoring');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to register patterns:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should toggle monitoring state', () => {
    render(<TerminalEventMonitor sessionId="session-1" />);

    const toggleButton = screen.getByText('Start Monitoring');
    expect(toggleButton).toHaveClass('bg-green-500');

    fireEvent.click(toggleButton);
    expect(screen.getByText('Stop Monitoring')).toHaveClass('bg-red-500');

    fireEvent.click(screen.getByText('Stop Monitoring'));
    expect(screen.getByText('Start Monitoring')).toHaveClass('bg-green-500');
  });

  it('should filter out non-pattern-match events', () => {
    const events = [
      {
        type: 'pattern-match',
        sessionId: 'session-1',
        patternId: 'pattern-1',
        patternName: 'error-detector',
        timestamp: Date.now(),
        match: 'Error: Test',
        position: 0
      },
      {
        type: 'ansi-sequence',
        sessionId: 'session-1',
        timestamp: Date.now(),
        sequence: '\x1b[31m',
        category: 'color' as const
      }
    ];

    (useTerminalEvents as any).mockReturnValue({
      events,
      registerPattern: mockRegisterPattern,
      clearEvents: mockClearEvents,
      isConnected: true
    });

    render(<TerminalEventMonitor sessionId="session-1" />);

    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Error: Test')).toBeInTheDocument();
  });
});