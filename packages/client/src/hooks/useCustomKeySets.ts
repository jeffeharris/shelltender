import { useState, useEffect } from 'react';
import { KeySet, KeyboardPreferences } from '../types/keyboard.js';
import { DEFAULT_KEYBOARD_PREFERENCES, PREDEFINED_KEY_SETS } from '../constants/keySets.js';

const STORAGE_KEY = 'shelltender-keyboard-preferences';

/**
 * Hook for managing custom key sets and keyboard preferences
 */
export function useCustomKeySets() {
  const [preferences, setPreferences] = useState<KeyboardPreferences>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_KEYBOARD_PREFERENCES,
            ...parsed,
          };
        } catch (e) {
          console.error('Failed to parse keyboard preferences:', e);
        }
      }
    }
    return DEFAULT_KEYBOARD_PREFERENCES;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences]);

  /**
   * Get all available key sets (predefined + custom)
   */
  const getAllKeySets = (): KeySet[] => {
    return [...PREDEFINED_KEY_SETS, ...preferences.customKeySets];
  };

  /**
   * Get a specific key set by ID
   */
  const getKeySet = (id: string): KeySet | undefined => {
    return getAllKeySets().find(set => set.id === id);
  };

  /**
   * Add or update a custom key set
   */
  const saveCustomKeySet = (keySet: KeySet) => {
    setPreferences(prev => {
      const customKeySets = [...prev.customKeySets];
      const existingIndex = customKeySets.findIndex(set => set.id === keySet.id);
      
      if (existingIndex >= 0) {
        customKeySets[existingIndex] = keySet;
      } else {
        customKeySets.push(keySet);
      }
      
      return {
        ...prev,
        customKeySets,
      };
    });
  };

  /**
   * Delete a custom key set
   */
  const deleteCustomKeySet = (id: string) => {
    setPreferences(prev => ({
      ...prev,
      customKeySets: prev.customKeySets.filter(set => set.id !== id),
      // Reset default if we're deleting the current default
      defaultKeySetId: prev.defaultKeySetId === id ? 'quick' : prev.defaultKeySetId,
    }));
  };

  /**
   * Update keyboard preferences
   */
  const updatePreferences = (updates: Partial<KeyboardPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates,
    }));
  };

  /**
   * Generate a unique ID for a new custom key set
   */
  const generateKeySetId = (): string => {
    return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  return {
    preferences,
    getAllKeySets,
    getKeySet,
    saveCustomKeySet,
    deleteCustomKeySet,
    updatePreferences,
    generateKeySetId,
  };
}