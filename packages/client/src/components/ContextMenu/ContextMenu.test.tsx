import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

describe('ContextMenu Component', () => {
  const defaultItems: ContextMenuItem[] = [
    { label: 'Copy', action: vi.fn() },
    { label: 'Paste', action: vi.fn() },
    { label: 'Delete', action: vi.fn(), icon: <span>🗑️</span> },
  ];

  const defaultProps = {
    x: 100,
    y: 200,
    items: defaultItems,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render all menu items', () => {
    render(<ContextMenu {...defaultProps} />);
    
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should render icons when provided', () => {
    render(<ContextMenu {...defaultProps} />);
    
    expect(screen.getByText('🗑️')).toBeInTheDocument();
  });

  it('should position menu at specified coordinates', () => {
    const { container } = render(<ContextMenu {...defaultProps} />);
    const menu = container.querySelector('.fixed.bg-gray-800') as HTMLElement;
    
    expect(menu).toHaveStyle({
      left: '100px',
      top: '200px',
    });
  });

  it('should render backdrop', () => {
    const { container } = render(<ContextMenu {...defaultProps} />);
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
    
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveStyle({ zIndex: '9999' });
  });

  it('should call action and close when item is clicked', () => {
    const copyAction = vi.fn();
    const items = [{ label: 'Copy', action: copyAction }];
    const onClose = vi.fn();
    
    render(<ContextMenu {...defaultProps} items={items} onClose={onClose} />);
    
    const copyButton = screen.getByText('Copy');
    fireEvent.pointerDown(copyButton);
    
    expect(copyAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close when clicking outside after delay', async () => {
    const onClose = vi.fn();
    const { container } = render(<ContextMenu {...defaultProps} onClose={onClose} />);
    
    // Wait for the show delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Click on backdrop
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close immediately after rendering', () => {
    const onClose = vi.fn();
    const { container } = render(<ContextMenu {...defaultProps} onClose={onClose} />);
    
    // Click immediately (before delay)
    const backdrop = container.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    
    // Should not close yet
    expect(onClose).not.toHaveBeenCalled();
    
    // After delay, clicking should work
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should adjust position to keep menu on screen', () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true });
    
    // Position that would go off screen
    const { container } = render(
      <ContextMenu x={450} y={350} items={defaultItems} onClose={vi.fn()} />
    );
    
    const menu = container.querySelector('.fixed.bg-gray-800') as HTMLElement;
    
    // Should be adjusted to stay on screen
    const left = parseInt(menu.style.left);
    const top = parseInt(menu.style.top);
    
    expect(left).toBeLessThan(450); // Adjusted left
    expect(top).toBeLessThan(350);  // Adjusted top
  });

  it('should have proper styling classes', () => {
    render(<ContextMenu {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('mobile-touch-target');
      expect(button).toHaveClass('hover:bg-gray-700');
    });
  });
});