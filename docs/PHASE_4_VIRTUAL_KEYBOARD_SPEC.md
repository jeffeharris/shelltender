# Phase 4: Enhanced Virtual Keyboard - Detailed Specification

## Overview

This document provides detailed implementation specifications for upgrading the current basic `VirtualKeyboard` component to the full `EnhancedVirtualKeyboard` system with custom key sets, persistence, and advanced features.

## Current State

The demo currently has a basic `VirtualKeyboard` with:
- Quick access keys (Tab, Enter, /, -, Space, Ctrl+C/D/Z/L, ↑↓←→, Esc)
- Full QWERTY keyboard toggle
- Height measurement for layout adjustment
- Basic styling

## Target State

Transform this into a comprehensive keyboard system with:
- Multiple predefined key sets (tabs)
- Custom key creation and management
- Persistent user preferences
- Advanced modifier support
- Improved UX/UI

## Implementation Tasks

### 1. Update Type Definitions

Create `packages/client/src/types/keyboard.ts`:

```typescript
export interface SpecialKey {
  id?: string;           // Unique identifier
  label: string;         // Display text
  value: string;         // Value to send
  icon?: string;         // Optional icon/emoji
  modifier?: boolean;    // Is this a modifier key?
  color?: string;        // Custom background color
  width?: number;        // Relative width (1 = normal, 2 = double)
  action?: 'input' | 'command' | 'macro';
  macro?: string[];      // Sequence of keys for macro
  visible?: boolean;     // Show/hide key
}

export interface KeySet {
  id: string;
  name: string;
  icon?: string;
  keys: SpecialKey[];
  isCustom?: boolean;    // User-created vs predefined
  order?: number;        // Display order
}

export interface KeyboardPreferences {
  activeKeySetId: string;
  customKeySets: KeySet[];
  keyboardHeight: 'compact' | 'normal' | 'tall';
  hapticFeedback: boolean;
  soundFeedback: boolean;
  theme: 'dark' | 'light' | 'auto';
}
```

### 2. Create Predefined Key Sets

Create `packages/client/src/constants/keySets.ts`:

```typescript
import type { KeySet } from '../types/keyboard';

export const PREDEFINED_KEY_SETS: KeySet[] = [
  {
    id: 'quick',
    name: 'Quick',
    icon: '⚡',
    keys: [
      { label: 'Tab', value: '\t', width: 1.5 },
      { label: 'Esc', value: '\x1b', color: '#ef4444' },
      { label: '/', value: '/' },
      { label: '-', value: '-' },
      { label: '_', value: '_' },
      { label: '|', value: '|' },
      { label: '&', value: '&' },
      { label: ';', value: ';' },
      { label: '~', value: '~' },
      { label: '.', value: '.' },
      { label: '..', value: '..', action: 'input' },
      { label: '../', value: '../', action: 'input' },
    ]
  },
  {
    id: 'navigation',
    name: 'Nav',
    icon: '🧭',
    keys: [
      { label: '↑', value: '\x1b[A', icon: '⬆️' },
      { label: '↓', value: '\x1b[B', icon: '⬇️' },
      { label: '←', value: '\x1b[D', icon: '⬅️' },
      { label: '→', value: '\x1b[C', icon: '➡️' },
      { label: 'Home', value: '\x1b[H' },
      { label: 'End', value: '\x1b[F' },
      { label: 'PgUp', value: '\x1b[5~' },
      { label: 'PgDn', value: '\x1b[6~' },
      { label: 'Del', value: '\x1b[3~', color: '#ef4444' },
    ]
  },
  {
    id: 'control',
    name: 'Ctrl',
    icon: '⌃',
    keys: [
      { label: 'Ctrl', value: 'ctrl', modifier: true, color: '#3b82f6', width: 2 },
      { label: 'Alt', value: 'alt', modifier: true, color: '#3b82f6' },
      { label: 'C', value: '\x03', color: '#ef4444' },
      { label: 'D', value: '\x04', color: '#ef4444' },
      { label: 'Z', value: '\x1a' },
      { label: 'R', value: '\x12' },
      { label: 'L', value: '\x0c' },
      { label: 'A', value: '\x01' },
      { label: 'E', value: '\x05' },
      { label: 'K', value: '\x0b' },
      { label: 'U', value: '\x15' },
      { label: 'W', value: '\x17' },
    ]
  },
  {
    id: 'unix',
    name: 'Unix',
    icon: '🐧',
    keys: [
      { label: 'ls', value: 'ls', action: 'command' },
      { label: 'ls -la', value: 'ls -la', action: 'command' },
      { label: 'cd', value: 'cd ', action: 'input' },
      { label: 'cd ..', value: 'cd ..', action: 'command' },
      { label: 'pwd', value: 'pwd', action: 'command' },
      { label: 'clear', value: 'clear', action: 'command' },
      { label: 'exit', value: 'exit', action: 'command' },
      { label: 'sudo', value: 'sudo ', action: 'input' },
      { label: '!!', value: '!!', action: 'command' },
      { label: 'history', value: 'history', action: 'command' },
    ]
  },
  {
    id: 'git',
    name: 'Git',
    icon: '🌿',
    keys: [
      { label: 'status', value: 'git status', action: 'command' },
      { label: 'add .', value: 'git add .', action: 'command' },
      { label: 'commit', value: 'git commit -m ""', action: 'input', macro: ['git commit -m "', '\x1b[D'] },
      { label: 'push', value: 'git push', action: 'command' },
      { label: 'pull', value: 'git pull', action: 'command' },
      { label: 'diff', value: 'git diff', action: 'command' },
      { label: 'log', value: 'git log --oneline -10', action: 'command' },
      { label: 'branch', value: 'git branch', action: 'command' },
      { label: 'checkout', value: 'git checkout ', action: 'input' },
    ]
  },
  {
    id: 'function',
    name: 'Fn',
    icon: 'ƒ',
    keys: [
      { label: 'F1', value: '\x1bOP' },
      { label: 'F2', value: '\x1bOQ' },
      { label: 'F3', value: '\x1bOR' },
      { label: 'F4', value: '\x1bOS' },
      { label: 'F5', value: '\x1b[15~' },
      { label: 'F6', value: '\x1b[17~' },
      { label: 'F7', value: '\x1b[18~' },
      { label: 'F8', value: '\x1b[19~' },
      { label: 'F9', value: '\x1b[20~' },
      { label: 'F10', value: '\x1b[21~' },
      { label: 'F11', value: '\x1b[23~' },
      { label: 'F12', value: '\x1b[24~' },
    ]
  }
];
```

### 3. Enhanced Virtual Keyboard Component

Update the existing `VirtualKeyboard` component:

```typescript
// packages/client/src/components/mobile/EnhancedVirtualKeyboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { PREDEFINED_KEY_SETS } from '../../constants/keySets';
import { useCustomKeySets } from '../../hooks/useCustomKeySets';
import { KeySetEditor } from './KeySetEditor';
import type { KeySet, SpecialKey } from '../../types/keyboard';
import './EnhancedVirtualKeyboard.css';

interface EnhancedVirtualKeyboardProps {
  onInput: (text: string) => void;
  onCommand: (command: string) => void;
  onMacro?: (keys: string[]) => void;
  isVisible: boolean;
  onHeightChange?: (height: number) => void;
}

export const EnhancedVirtualKeyboard: React.FC<EnhancedVirtualKeyboardProps> = ({
  onInput,
  onCommand,
  onMacro,
  isVisible,
  onHeightChange
}) => {
  const { customKeySets, addKeySet, updateKeySet, removeKeySet } = useCustomKeySets();
  const [activeKeySetId, setActiveKeySetId] = useState(() => 
    localStorage.getItem('shelltender-active-keyset') || 'quick'
  );
  const [showQwerty, setShowQwerty] = useState(false);
  const [showKeySetEditor, setShowKeySetEditor] = useState(false);
  const [editingKeySet, setEditingKeySet] = useState<KeySet | undefined>();
  const [modifiers, setModifiers] = useState({
    ctrl: false,
    alt: false,
    shift: false
  });
  
  const keyboardRef = useRef<HTMLDivElement>(null);

  // Combine predefined and custom key sets
  const allKeySets = [...PREDEFINED_KEY_SETS, ...customKeySets];
  const activeKeySet = allKeySets.find(set => set.id === activeKeySetId) || PREDEFINED_KEY_SETS[0];

  // Save active key set preference
  useEffect(() => {
    localStorage.setItem('shelltender-active-keyset', activeKeySetId);
  }, [activeKeySetId]);

  // Measure height
  useEffect(() => {
    if (!onHeightChange) return;
    
    const measure = () => {
      if (keyboardRef.current) {
        onHeightChange(keyboardRef.current.offsetHeight);
      }
    };

    measure();
    const timer = setTimeout(measure, 300);
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [isVisible, showQwerty, activeKeySetId, onHeightChange]);

  const handleKeyPress = (key: SpecialKey) => {
    // Handle modifier keys
    if (key.modifier) {
      setModifiers(prev => ({
        ...prev,
        [key.value]: !prev[key.value as keyof typeof prev]
      }));
      return;
    }

    // Apply modifiers if active
    let finalValue = key.value;
    if (modifiers.ctrl && key.value.length === 1) {
      // Convert to Ctrl+key
      const charCode = key.value.toUpperCase().charCodeAt(0);
      finalValue = String.fromCharCode(charCode - 64);
    }

    // Handle different action types
    switch (key.action) {
      case 'command':
        onCommand(finalValue);
        break;
      case 'macro':
        if (key.macro && onMacro) {
          onMacro(key.macro);
        } else {
          // Fallback: send as input
          onInput(finalValue);
        }
        break;
      default:
        onInput(finalValue);
    }

    // Reset modifiers after use
    setModifiers({ ctrl: false, alt: false, shift: false });
  };

  const handleQwertyKey = (key: string) => {
    let finalKey = key;
    
    // Apply modifiers
    if (modifiers.ctrl && key.length === 1) {
      const charCode = key.toUpperCase().charCodeAt(0);
      finalKey = String.fromCharCode(charCode - 64);
    } else if (modifiers.shift) {
      finalKey = key.toUpperCase();
    }

    onInput(finalKey);
    setModifiers({ ctrl: false, alt: false, shift: false });
  };

  if (!isVisible) return null;

  return (
    <>
      <div 
        ref={keyboardRef}
        className="enhanced-virtual-keyboard"
        style={{ display: isVisible ? 'flex' : 'none' }}
      >
        {/* Tab bar */}
        <div className="keyboard-tabs">
          <div className="tabs-scroll">
            {allKeySets.map(set => (
              <button
                key={set.id}
                className={`keyboard-tab ${set.id === activeKeySetId ? 'active' : ''}`}
                onClick={() => setActiveKeySetId(set.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (set.isCustom) {
                    setEditingKeySet(set);
                    setShowKeySetEditor(true);
                  }
                }}
              >
                {set.icon && <span className="tab-icon">{set.icon}</span>}
                <span className="tab-name">{set.name}</span>
              </button>
            ))}
            
            {/* Add custom key set button */}
            <button
              className="keyboard-tab add-tab"
              onClick={() => {
                setEditingKeySet(undefined);
                setShowKeySetEditor(true);
              }}
            >
              <span className="tab-icon">+</span>
            </button>
          </div>
          
          {/* QWERTY toggle */}
          <button
            className={`qwerty-toggle ${showQwerty ? 'active' : ''}`}
            onClick={() => setShowQwerty(!showQwerty)}
          >
            ABC
          </button>
        </div>

        {/* Keys grid */}
        <div className="keyboard-content">
          {!showQwerty ? (
            <div className="keyboard-keys">
              {activeKeySet.keys.map((key, index) => (
                <button
                  key={`${key.label}-${index}`}
                  className={`
                    key-button 
                    ${key.width ? `key-width-${key.width}` : ''}
                    ${key.modifier && modifiers[key.value as keyof typeof modifiers] ? 'active' : ''}
                    ${key.action ? `key-action-${key.action}` : ''}
                  `}
                  style={key.color ? { backgroundColor: key.color } : undefined}
                  onClick={() => handleKeyPress(key)}
                >
                  {key.icon && <span className="key-icon">{key.icon}</span>}
                  <span className="key-label">{key.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <QwertyKeyboard 
              onKey={handleQwertyKey}
              modifiers={modifiers}
            />
          )}

          {/* Modifier indicators */}
          {(modifiers.ctrl || modifiers.alt || modifiers.shift) && (
            <div className="modifier-indicators">
              {modifiers.ctrl && <span className="modifier-active">Ctrl</span>}
              {modifiers.alt && <span className="modifier-active">Alt</span>}
              {modifiers.shift && <span className="modifier-active">Shift</span>}
            </div>
          )}
        </div>
      </div>

      {/* Key set editor modal */}
      {showKeySetEditor && (
        <KeySetEditor
          keySet={editingKeySet}
          onSave={(keySet) => {
            if (editingKeySet) {
              updateKeySet(keySet.id, keySet);
            } else {
              addKeySet(keySet);
            }
            setShowKeySetEditor(false);
          }}
          onDelete={editingKeySet ? () => {
            removeKeySet(editingKeySet.id);
            setShowKeySetEditor(false);
          } : undefined}
          onCancel={() => setShowKeySetEditor(false)}
        />
      )}
    </>
  );
};

// QWERTY keyboard component
const QwertyKeyboard: React.FC<{
  onKey: (key: string) => void;
  modifiers: { ctrl: boolean; alt: boolean; shift: boolean };
}> = ({ onKey, modifiers }) => {
  const rows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
    <div className="qwerty-keyboard">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="qwerty-row">
          {rowIndex === 2 && <div className="qwerty-spacer" />}
          {row.map(key => (
            <button
              key={key}
              className="qwerty-key"
              onClick={() => onKey(key)}
            >
              {modifiers.shift ? key.toUpperCase() : key}
            </button>
          ))}
          {rowIndex === 2 && <div className="qwerty-spacer" />}
        </div>
      ))}
      
      <div className="qwerty-row">
        <button 
          className="qwerty-key qwerty-space"
          onClick={() => onKey(' ')}
        >
          Space
        </button>
      </div>

      <div className="qwerty-row">
        <button 
          className="qwerty-key qwerty-special"
          onClick={() => onKey('\x7f')}
        >
          ← Backspace
        </button>
        <button 
          className="qwerty-key qwerty-special"
          onClick={() => onKey('\r')}
        >
          Enter ↵
        </button>
      </div>
    </div>
  );
};
```

### 4. Custom Key Sets Hook

Create `packages/client/src/hooks/useCustomKeySets.ts`:

```typescript
import { useState, useEffect } from 'react';
import type { KeySet } from '../types/keyboard';

const STORAGE_KEY = 'shelltender-custom-keysets';

export function useCustomKeySets() {
  const [customKeySets, setCustomKeySets] = useState<KeySet[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customKeySets));
  }, [customKeySets]);

  const addKeySet = (keySet: KeySet) => {
    const newKeySet = {
      ...keySet,
      id: keySet.id || `custom-${Date.now()}`,
      isCustom: true
    };
    setCustomKeySets(prev => [...prev, newKeySet]);
    return newKeySet.id;
  };

  const updateKeySet = (id: string, updates: Partial<KeySet>) => {
    setCustomKeySets(prev => 
      prev.map(set => set.id === id ? { ...set, ...updates } : set)
    );
  };

  const removeKeySet = (id: string) => {
    setCustomKeySets(prev => prev.filter(set => set.id !== id));
  };

  const addKeyToSet = (setId: string, key: SpecialKey) => {
    setCustomKeySets(prev => 
      prev.map(set => 
        set.id === setId 
          ? { ...set, keys: [...set.keys, key] }
          : set
      )
    );
  };

  const removeKeyFromSet = (setId: string, keyIndex: number) => {
    setCustomKeySets(prev => 
      prev.map(set => 
        set.id === setId 
          ? { ...set, keys: set.keys.filter((_, i) => i !== keyIndex) }
          : set
      )
    );
  };

  const updateKeyInSet = (setId: string, keyIndex: number, updates: Partial<SpecialKey>) => {
    setCustomKeySets(prev => 
      prev.map(set => 
        set.id === setId 
          ? {
              ...set,
              keys: set.keys.map((key, i) => 
                i === keyIndex ? { ...key, ...updates } : key
              )
            }
          : set
      )
    );
  };

  return {
    customKeySets,
    addKeySet,
    updateKeySet,
    removeKeySet,
    addKeyToSet,
    removeKeyFromSet,
    updateKeyInSet
  };
}
```

### 5. Key Set Editor Component

Create a simplified key set editor (see MOBILE_CUSTOM_KEYS.md for full version):

```typescript
// packages/client/src/components/mobile/KeySetEditor.tsx
import React, { useState } from 'react';
import type { KeySet, SpecialKey } from '../../types/keyboard';
import './KeySetEditor.css';

interface KeySetEditorProps {
  keySet?: KeySet;
  onSave: (keySet: KeySet) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export const KeySetEditor: React.FC<KeySetEditorProps> = ({
  keySet,
  onSave,
  onDelete,
  onCancel
}) => {
  const [name, setName] = useState(keySet?.name || '');
  const [icon, setIcon] = useState(keySet?.icon || '');
  const [keys, setKeys] = useState<SpecialKey[]>(keySet?.keys || []);
  const [editingKeyIndex, setEditingKeyIndex] = useState<number | null>(null);

  // Implementation details in MOBILE_CUSTOM_KEYS.md
  // This is a placeholder for the actual implementation
  
  return (
    <div className="key-set-editor-modal">
      <div className="key-set-editor">
        <h3>{keySet ? 'Edit Key Set' : 'New Key Set'}</h3>
        {/* Editor UI */}
      </div>
    </div>
  );
};
```

### 6. Integration Steps

1. **Update MobileApp** to use EnhancedVirtualKeyboard:
```typescript
// In App.tsx, replace VirtualKeyboard with:
import { EnhancedVirtualKeyboard } from '@shelltender/client';

// In the component:
<EnhancedVirtualKeyboard
  isVisible={!!currentSessionId}
  onInput={(text) => {
    wsService.send({
      type: 'input',
      sessionId: currentSessionId,
      data: text
    });
  }}
  onCommand={(command) => {
    wsService.send({
      type: 'input',
      sessionId: currentSessionId,
      data: command + '\n'
    });
  }}
  onMacro={(keys) => {
    keys.forEach(key => {
      wsService.send({
        type: 'input',
        sessionId: currentSessionId,
        data: key
      });
    });
  }}
  onHeightChange={setKeyboardHeight}
/>
```

2. **Add to package exports**:
```typescript
// In packages/client/src/index.ts
export { EnhancedVirtualKeyboard } from './components/mobile/EnhancedVirtualKeyboard';
export { useCustomKeySets } from './hooks/useCustomKeySets';
export type { KeySet, SpecialKey, KeyboardPreferences } from './types/keyboard';
```

3. **Add CSS** (see MOBILE_CUSTOM_KEYS.md for complete styles)

### 7. Testing Checklist

- [ ] All predefined key sets work correctly
- [ ] Custom key creation and editing
- [ ] Key persistence across sessions
- [ ] Modifier keys (Ctrl, Alt, Shift)
- [ ] Command vs input vs macro actions
- [ ] QWERTY keyboard integration
- [ ] Height measurement for layout
- [ ] Long press to edit custom sets
- [ ] Smooth transitions and animations
- [ ] Touch feedback (visual)
- [ ] Landscape mode layout
- [ ] Performance with many custom keys

### 8. Future Enhancements (Post-Phase 4)

1. **Import/Export**: Share custom key sets via JSON
2. **Cloud Sync**: Sync preferences across devices
3. **Themes**: Light/dark/custom themes
4. **Haptic Feedback**: Vibration on key press (where supported)
5. **Sound Effects**: Optional key press sounds
6. **Contextual Keys**: Show different keys based on current command
7. **Key Macros**: Record and replay key sequences
8. **Gesture Shortcuts**: Swipe gestures on keyboard for quick actions

## Success Criteria

1. Users can switch between multiple key sets
2. Custom key sets are created and persist
3. All key types work (input, command, macro)
4. Modifier keys function correctly
5. UI is responsive and touch-friendly
6. No performance degradation
7. Backward compatible with existing usage

## Timeline

Estimated: 5-6 days for full implementation
- Day 1-2: Core EnhancedVirtualKeyboard component
- Day 3: Custom key sets and persistence
- Day 4: Key set editor UI
- Day 5: Integration and testing
- Day 6: Polish and bug fixes