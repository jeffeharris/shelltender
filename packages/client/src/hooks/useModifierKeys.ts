/**
 * Hook for managing modifier key states in the virtual keyboard
 */

import { useState, useCallback, useRef } from 'react';

export interface ModifierKeyStates {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export interface ModifierKeyActions {
  toggleCtrl: () => void;
  toggleAlt: () => void;
  toggleShift: () => void;
  toggleMeta: () => void;
  clearModifiers: () => void;
  handleKeyPress: (key: string) => string;
  isModifierActive: () => boolean;
}

export function useModifierKeys(): [ModifierKeyStates, ModifierKeyActions] {
  const [modifiers, setModifiers] = useState<ModifierKeyStates>({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  });

  // Track if a modifier was just used (for auto-release)
  const autoReleaseRef = useRef(false);

  const toggleCtrl = useCallback(() => {
    setModifiers(prev => ({ ...prev, ctrl: !prev.ctrl }));
    autoReleaseRef.current = false;
  }, []);

  const toggleAlt = useCallback(() => {
    setModifiers(prev => ({ ...prev, alt: !prev.alt }));
    autoReleaseRef.current = false;
  }, []);

  const toggleShift = useCallback(() => {
    setModifiers(prev => ({ ...prev, shift: !prev.shift }));
    autoReleaseRef.current = false;
  }, []);

  const toggleMeta = useCallback(() => {
    setModifiers(prev => ({ ...prev, meta: !prev.meta }));
    autoReleaseRef.current = false;
  }, []);

  const clearModifiers = useCallback(() => {
    setModifiers({
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    });
    autoReleaseRef.current = false;
  }, []);

  const isModifierActive = useCallback(() => {
    return modifiers.ctrl || modifiers.alt || modifiers.shift || modifiers.meta;
  }, [modifiers]);

  const handleKeyPress = useCallback((key: string): string => {
    // If no modifiers are active, return the key as-is
    if (!modifiers.ctrl && !modifiers.alt && !modifiers.shift && !modifiers.meta) {
      return key;
    }

    let result = key;

    // Apply shift modifier for letters and common symbols
    if (modifiers.shift && key.length === 1) {
      const shiftMap: Record<string, string> = {
        '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
        '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
        '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|',
        ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
        '`': '~',
      };
      
      if (shiftMap[key]) {
        result = shiftMap[key];
      } else if (/[a-z]/.test(key)) {
        result = key.toUpperCase();
      }
    }

    // Build ctrl key combination
    if (modifiers.ctrl && key.length === 1) {
      // Check if it's a letter (a-z)
      if (/[a-zA-Z]/.test(key)) {
        result = `ctrl-${key.toLowerCase()}`;
      }
    }

    // Build alt key combination
    if (modifiers.alt && key.length === 1) {
      result = `alt-${key}`;
    }

    // Meta (cmd) key combination
    if (modifiers.meta && key.length === 1) {
      result = `meta-${key}`;
    }

    // Auto-release modifiers after use (except shift for continuous typing)
    if (autoReleaseRef.current && !modifiers.shift) {
      clearModifiers();
    } else {
      autoReleaseRef.current = true;
    }

    return result;
  }, [modifiers, clearModifiers]);

  const actions: ModifierKeyActions = {
    toggleCtrl,
    toggleAlt,
    toggleShift,
    toggleMeta,
    clearModifiers,
    handleKeyPress,
    isModifierActive,
  };

  return [modifiers, actions];
}