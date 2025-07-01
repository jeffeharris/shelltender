import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModifierKeys } from '../useModifierKeys';

describe('useModifierKeys', () => {
  it('should initialize with all modifiers off', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [modifiers] = result.current;
    
    expect(modifiers).toEqual({
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    });
  });

  it('should toggle ctrl key', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [, actions] = result.current;
    
    act(() => {
      actions.toggleCtrl();
    });
    
    expect(result.current[0].ctrl).toBe(true);
    
    act(() => {
      actions.toggleCtrl();
    });
    
    expect(result.current[0].ctrl).toBe(false);
  });

  it('should toggle multiple modifiers', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [, actions] = result.current;
    
    act(() => {
      actions.toggleCtrl();
      actions.toggleShift();
    });
    
    const [modifiers] = result.current;
    expect(modifiers.ctrl).toBe(true);
    expect(modifiers.shift).toBe(true);
    expect(modifiers.alt).toBe(false);
  });

  it('should clear all modifiers', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [, actions] = result.current;
    
    act(() => {
      actions.toggleCtrl();
      actions.toggleAlt();
      actions.toggleShift();
    });
    
    act(() => {
      actions.clearModifiers();
    });
    
    const [modifiers] = result.current;
    expect(modifiers).toEqual({
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    });
  });

  it('should check if any modifier is active', () => {
    const { result } = renderHook(() => useModifierKeys());
    
    expect(result.current[1].isModifierActive()).toBe(false);
    
    act(() => {
      result.current[1].toggleCtrl();
    });
    
    expect(result.current[1].isModifierActive()).toBe(true);
  });

  it('should handle key press without modifiers', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [, actions] = result.current;
    
    const processed = actions.handleKeyPress('a');
    expect(processed).toBe('a');
  });

  it('should handle key press with shift modifier', () => {
    const { result } = renderHook(() => useModifierKeys());
    
    act(() => {
      result.current[1].toggleShift();
    });
    
    expect(result.current[1].handleKeyPress('a')).toBe('A');
    expect(result.current[1].handleKeyPress('1')).toBe('!');
    expect(result.current[1].handleKeyPress('/')).toBe('?');
  });

  it('should handle key press with ctrl modifier', () => {
    const { result } = renderHook(() => useModifierKeys());
    
    act(() => {
      result.current[1].toggleCtrl();
    });
    
    expect(result.current[1].handleKeyPress('c')).toBe('ctrl-c');
    expect(result.current[1].handleKeyPress('C')).toBe('ctrl-c');
    expect(result.current[1].handleKeyPress('1')).toBe('1'); // Numbers don't get ctrl
  });

  it('should auto-release ctrl after use', () => {
    const { result } = renderHook(() => useModifierKeys());
    
    act(() => {
      result.current[1].toggleCtrl();
    });
    
    expect(result.current[0].ctrl).toBe(true);
    
    act(() => {
      result.current[1].handleKeyPress('c');
    });
    
    // First use doesn't clear immediately
    expect(result.current[0].ctrl).toBe(true);
    
    act(() => {
      result.current[1].handleKeyPress('d');
    });
    
    // Second use should clear
    expect(result.current[0].ctrl).toBe(false);
  });

  it('should not auto-release shift', () => {
    const { result } = renderHook(() => useModifierKeys());
    const [, actions] = result.current;
    
    act(() => {
      actions.toggleShift();
    });
    
    act(() => {
      actions.handleKeyPress('a');
      actions.handleKeyPress('b');
      actions.handleKeyPress('c');
    });
    
    // Shift should still be active
    expect(result.current[0].shift).toBe(true);
  });
});