import React, { useState, useEffect, useRef } from 'react';
import { VirtualKeyboardProps, KeyDefinition, SpecialKeyType } from '../../types/keyboard.js';
import { useCustomKeySets } from '../../hooks/useCustomKeySets.js';
import { useModifierKeys } from '../../hooks/useModifierKeys.js';
import { SPECIAL_KEY_SEQUENCES } from '../../constants/keySets.js';

export function VirtualKeyboard({
  isVisible,
  onInput,
  onCommand,
  onMacro,
  onHeightChange,
  preferences: overridePreferences,
}: VirtualKeyboardProps) {
  const {
    preferences,
    getAllKeySets,
    getKeySet,
    updatePreferences,
  } = useCustomKeySets();

  const [activeKeySetId, setActiveKeySetId] = useState(preferences.defaultKeySetId);
  const [showSettings, setShowSettings] = useState(false);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const [modifiers, modifierActions] = useModifierKeys();

  // Merge override preferences
  const effectivePreferences = {
    ...preferences,
    ...overridePreferences,
  };

  // Get current key set
  const currentKeySet = getKeySet(activeKeySetId) || getKeySet('quick')!;
  const allKeySets = getAllKeySets();

  // Measure and report keyboard height
  useEffect(() => {
    if (!keyboardRef.current || !onHeightChange) return;

    const measureHeight = () => {
      if (keyboardRef.current) {
        const height = isVisible ? keyboardRef.current.offsetHeight : 0;
        onHeightChange(height);
      }
    };

    measureHeight();
    const timer = setTimeout(measureHeight, 300); // After transition

    window.addEventListener('resize', measureHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureHeight);
    };
  }, [isVisible, activeKeySetId, onHeightChange]);

  // Handle key press
  const handleKeyPress = (key: KeyDefinition) => {
    // Haptic feedback if supported
    if (effectivePreferences.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Handle modifier keys specially
    if (key.value === 'ctrl') {
      modifierActions.toggleCtrl();
      return;
    } else if (key.value === 'alt') {
      modifierActions.toggleAlt();
      return;
    } else if (key.value === 'shift') {
      modifierActions.toggleShift();
      return;
    } else if (key.value === 'esc' || key.value === 'escape') {
      onInput('\x1b');
      return;
    }

    switch (key.type) {
      case 'text':
        const processedText = modifierActions.handleKeyPress(key.value as string);
        // Check if it became a special key sequence (e.g., ctrl-c)
        if (processedText.startsWith('ctrl-') || processedText.startsWith('alt-')) {
          const sequence = SPECIAL_KEY_SEQUENCES[processedText];
          if (sequence) {
            onInput(sequence);
          }
        } else {
          onInput(processedText);
        }
        break;
      
      case 'special':
        const specialKey = modifierActions.handleKeyPress(key.value as string);
        const sequence = SPECIAL_KEY_SEQUENCES[specialKey];
        if (sequence) {
          onInput(sequence);
        }
        break;
      
      case 'command':
        onCommand(key.value as string);
        modifierActions.clearModifiers();
        break;
      
      case 'macro':
        if (Array.isArray(key.value)) {
          onMacro(key.value);
        }
        modifierActions.clearModifiers();
        break;
    }
  };

  // Process macro keys
  useEffect(() => {
    if (!onMacro) return;
    
    // The parent component should handle macro execution
    // by sending each key in sequence with appropriate delays
  }, [onMacro]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      ref={keyboardRef}
      className="virtual-keyboard"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      }}
    >
      {/* Tab bar for key sets */}
      <div className="keyboard-tabs">
        <div className="keyboard-tab-list">
          {allKeySets.map(keySet => (
            <button
              key={keySet.id}
              className={`keyboard-tab ${activeKeySetId === keySet.id ? 'active' : ''}`}
              onClick={() => setActiveKeySetId(keySet.id)}
            >
              {keySet.name}
            </button>
          ))}
        </div>
        <button
          className="keyboard-settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Keyboard settings"
        >
          ⚙️
        </button>
      </div>

      {/* Modifier keys row */}
      <div className="keyboard-modifiers">
        <button
          className={`keyboard-modifier ${modifiers.ctrl ? 'active' : ''}`}
          onClick={() => modifierActions.toggleCtrl()}
        >
          Ctrl
        </button>
        <button
          className={`keyboard-modifier ${modifiers.alt ? 'active' : ''}`}
          onClick={() => modifierActions.toggleAlt()}
        >
          Alt
        </button>
        <button
          className={`keyboard-modifier ${modifiers.shift ? 'active' : ''}`}
          onClick={() => modifierActions.toggleShift()}
        >
          Shift
        </button>
        <button
          className="keyboard-modifier esc"
          onClick={() => handleKeyPress({ label: 'Esc', type: 'special', value: 'escape' })}
        >
          Esc
        </button>
      </div>

      {/* Keys grid */}
      <div className="keyboard-keys">
        {currentKeySet.keys.map((key, index) => {
          // Show modified label for text keys when shift is active
          let displayLabel = key.label;
          if (key.type === 'text' && modifiers.shift && typeof key.value === 'string' && key.value.length === 1) {
            const shiftMap: Record<string, string> = {
              '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
              '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
              '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|',
              ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
              '`': '~',
            };
            
            if (shiftMap[key.value]) {
              displayLabel = shiftMap[key.value];
            } else if (/[a-z]/.test(key.value)) {
              displayLabel = key.value.toUpperCase();
            }
          }

          return (
            <button
              key={index}
              className={`keyboard-key ${key.style || ''} ${modifierActions.isModifierActive() ? 'modifier-active' : ''}`}
              style={{
                gridColumn: key.width ? `span ${key.width}` : undefined,
              }}
              onClick={() => handleKeyPress(key)}
            >
              {key.icon ? (
                <span className="keyboard-key-icon">{key.icon}</span>
              ) : (
                <span className="keyboard-key-label">{displayLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="keyboard-settings">
          <div className="keyboard-settings-content">
            <h3>Keyboard Settings</h3>
            
            <label className="keyboard-setting">
              <input
                type="checkbox"
                checked={effectivePreferences.showHints}
                onChange={(e) => updatePreferences({ showHints: e.target.checked })}
              />
              Show key hints
            </label>
            
            <label className="keyboard-setting">
              <input
                type="checkbox"
                checked={effectivePreferences.hapticFeedback}
                onChange={(e) => updatePreferences({ hapticFeedback: e.target.checked })}
              />
              Haptic feedback
            </label>
            
            <label className="keyboard-setting">
              Default key set:
              <select
                value={effectivePreferences.defaultKeySetId}
                onChange={(e) => updatePreferences({ defaultKeySetId: e.target.value })}
              >
                {allKeySets.map(keySet => (
                  <option key={keySet.id} value={keySet.id}>
                    {keySet.name}
                  </option>
                ))}
              </select>
            </label>
            
            <div className="keyboard-settings-actions">
              <button onClick={() => setShowSettings(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}