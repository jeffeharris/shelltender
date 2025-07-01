import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { MobileProvider } from '../../../context/MobileContext';

// Mock the hooks
vi.mock('../../../hooks/useCustomKeySets', () => ({
  useCustomKeySets: () => ({
    preferences: {
      defaultKeySetId: 'qwerty',
      showHints: true,
      keyboardHeight: 12,
      hapticFeedback: true,
      customKeySets: [],
    },
    getAllKeySets: () => [
      {
        id: 'qwerty',
        name: 'ABC',
        readonly: true,
        keys: [
          { label: 'a', type: 'text', value: 'a' },
          { label: 'b', type: 'text', value: 'b' },
        ],
      },
      {
        id: 'numbers',
        name: '123',
        readonly: true,
        keys: [
          { label: '1', type: 'text', value: '1' },
          { label: '2', type: 'text', value: '2' },
        ],
      },
    ],
    getKeySet: (id: string) => {
      const sets = {
        qwerty: {
          id: 'qwerty',
          name: 'ABC',
          keys: [
            { label: 'a', type: 'text', value: 'a' },
            { label: 'b', type: 'text', value: 'b' },
          ],
        },
        numbers: {
          id: 'numbers',
          name: '123',
          keys: [
            { label: '1', type: 'text', value: '1' },
            { label: '2', type: 'text', value: '2' },
          ],
        },
      };
      return sets[id as keyof typeof sets];
    },
    updatePreferences: vi.fn(),
  }),
}));

describe('VirtualKeyboard', () => {
  const defaultProps = {
    isVisible: true,
    onInput: vi.fn(),
    onCommand: vi.fn(),
    onMacro: vi.fn(),
    onHeightChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not visible', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} isVisible={false} />
      </MobileProvider>
    );
    
    expect(screen.queryByText('ABC')).not.toBeInTheDocument();
  });

  it('should render keyboard when visible', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} />
      </MobileProvider>
    );
    
    expect(screen.getByText('ABC')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('should render modifier keys', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} />
      </MobileProvider>
    );
    
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Alt')).toBeInTheDocument();
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('should handle text key press', () => {
    const onInput = vi.fn();
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} onInput={onInput} />
      </MobileProvider>
    );
    
    const keyA = screen.getByText('a');
    fireEvent.click(keyA);
    
    expect(onInput).toHaveBeenCalledWith('a');
  });

  it('should handle Esc key press', () => {
    const onInput = vi.fn();
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} onInput={onInput} />
      </MobileProvider>
    );
    
    const escKey = screen.getByText('Esc');
    fireEvent.click(escKey);
    
    expect(onInput).toHaveBeenCalledWith('\x1b');
  });

  it('should toggle modifier keys', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} />
      </MobileProvider>
    );
    
    const ctrlKey = screen.getByText('Ctrl');
    
    // Initially not active
    expect(ctrlKey).not.toHaveClass('active');
    
    // Click to activate
    fireEvent.click(ctrlKey);
    expect(ctrlKey).toHaveClass('active');
    
    // Click again to deactivate
    fireEvent.click(ctrlKey);
    expect(ctrlKey).not.toHaveClass('active');
  });

  it('should apply shift to text keys', () => {
    const onInput = vi.fn();
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} onInput={onInput} />
      </MobileProvider>
    );
    
    // Activate shift
    const shiftKey = screen.getByText('Shift');
    fireEvent.click(shiftKey);
    
    // Key should show uppercase
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    
    // Click uppercase A
    const keyA = screen.getByText('A');
    fireEvent.click(keyA);
    
    expect(onInput).toHaveBeenCalledWith('A');
  });

  it('should switch between key sets', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} />
      </MobileProvider>
    );
    
    // Initially shows QWERTY keys
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    
    // Switch to numbers
    const numbersTab = screen.getByText('123');
    fireEvent.click(numbersTab);
    
    // Now shows number keys
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('a')).not.toBeInTheDocument();
  });

  it('should report height changes', async () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} onHeightChange={onHeightChange} />
      </MobileProvider>
    );
    
    // Mock offsetHeight
    const keyboard = container.querySelector('.virtual-keyboard') as HTMLElement;
    Object.defineProperty(keyboard, 'offsetHeight', {
      configurable: true,
      value: 300,
    });
    
    // Wait for height measurement
    await waitFor(() => {
      expect(onHeightChange).toHaveBeenCalledWith(300);
    });
  });

  it('should toggle settings panel', () => {
    render(
      <MobileProvider>
        <VirtualKeyboard {...defaultProps} />
      </MobileProvider>
    );
    
    // Settings not visible initially
    expect(screen.queryByText('Keyboard Settings')).not.toBeInTheDocument();
    
    // Click settings button
    const settingsBtn = screen.getByLabelText('Keyboard settings');
    fireEvent.click(settingsBtn);
    
    // Settings now visible
    expect(screen.getByText('Keyboard Settings')).toBeInTheDocument();
  });
});