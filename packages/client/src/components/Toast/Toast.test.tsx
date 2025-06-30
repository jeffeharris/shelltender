import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast Component', () => {
  const defaultProps = {
    message: 'Test message',
    duration: 1000,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should have visible class initially', () => {
    const { container } = render(<Toast {...defaultProps} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast).toHaveClass('opacity-100');
  });

  it('should hide after duration and call onClose', async () => {
    const onClose = vi.fn();
    const { container } = render(<Toast {...defaultProps} onClose={onClose} />);
    
    // Should be visible initially
    expect(container.firstChild).toHaveClass('opacity-100');
    
    // Advance time to trigger fade out
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should start fading
    expect(container.firstChild).toHaveClass('opacity-0');
    
    // Advance time for fade animation
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // onClose should be called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should use default duration if not provided', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);
    
    // Default duration is 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should have correct z-index', () => {
    const { container } = render(<Toast {...defaultProps} />);
    const toast = container.firstChild as HTMLElement;
    expect(toast).toHaveStyle({ zIndex: '10001' });
  });
});