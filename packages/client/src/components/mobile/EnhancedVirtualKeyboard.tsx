import React, { useState, useEffect, useRef } from 'react';
import { EnhancedVirtualKeyboardProps, KeyDefinition, SpecialKeyType } from '../../types/keyboard';
import { useCustomKeySets } from '../../hooks/useCustomKeySets';
import { SPECIAL_KEY_SEQUENCES } from '../../constants/keySets';

export function EnhancedVirtualKeyboard({
  isVisible,
  onInput,
  onCommand,
  onMacro,
  onHeightChange,
  preferences: overridePreferences,
}: EnhancedVirtualKeyboardProps) {
  const {
    preferences,
    getAllKeySets,
    getKeySet,
    updatePreferences,
  } = useCustomKeySets();

  const [activeKeySetId, setActiveKeySetId] = useState(preferences.defaultKeySetId);
  const [showSettings, setShowSettings] = useState(false);
  const keyboardRef = useRef<HTMLDivElement>(null);

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

    switch (key.type) {
      case 'text':
        onInput(key.value as string);
        break;
      
      case 'special':
        const sequence = SPECIAL_KEY_SEQUENCES[key.value as string];
        if (sequence) {
          onInput(sequence);
        }
        break;
      
      case 'command':
        onCommand(key.value as string);
        break;
      
      case 'macro':
        if (Array.isArray(key.value)) {
          onMacro(key.value);
        }
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
      className="enhanced-virtual-keyboard"
      style={{
        maxHeight: `${effectivePreferences.keyboardHeight}rem`,
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

      {/* Keys grid */}
      <div className="keyboard-keys">
        {currentKeySet.keys.map((key, index) => (
          <button
            key={index}
            className={`keyboard-key ${key.style || ''}`}
            style={{
              gridColumn: key.width ? `span ${key.width}` : undefined,
            }}
            onClick={() => handleKeyPress(key)}
          >
            {key.icon ? (
              <span className="keyboard-key-icon">{key.icon}</span>
            ) : (
              <span className="keyboard-key-label">{key.label}</span>
            )}
          </button>
        ))}
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