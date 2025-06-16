# Custom Special Keys Implementation

## Enhanced Virtual Keyboard with Custom Keys

### 1. Configurable Key Sets

```typescript
// packages/client/src/types/keyboard.ts
export interface SpecialKey {
  label: string;
  value: string;
  icon?: string;
  modifier?: boolean;
  color?: string;
  width?: number; // Relative width (1 = normal, 2 = double)
  action?: 'input' | 'command' | 'macro';
  macro?: string[]; // Sequence of keys to send
}

export interface KeySet {
  id: string;
  name: string;
  icon?: string;
  keys: SpecialKey[];
}

// packages/client/src/constants/keySets.ts
export const DEFAULT_KEY_SETS: KeySet[] = [
  {
    id: 'navigation',
    name: 'Navigation',
    icon: '🧭',
    keys: [
      { label: 'Tab', value: '\t' },
      { label: 'Esc', value: '\x1b' },
      { label: '↑', value: '\x1b[A' },
      { label: '↓', value: '\x1b[B' },
      { label: '←', value: '\x1b[D' },
      { label: '→', value: '\x1b[C' },
      { label: 'Home', value: '\x1b[H' },
      { label: 'End', value: '\x1b[F' },
    ]
  },
  {
    id: 'modifiers',
    name: 'Modifiers',
    icon: '⌨️',
    keys: [
      { label: 'Ctrl', value: 'ctrl', modifier: true, color: '#007acc' },
      { label: 'Alt', value: 'alt', modifier: true, color: '#007acc' },
      { label: 'Shift', value: 'shift', modifier: true, color: '#007acc' },
      { label: 'Ctrl+C', value: '\x03', color: '#ff6b6b' },
      { label: 'Ctrl+D', value: '\x04', color: '#ff6b6b' },
      { label: 'Ctrl+Z', value: '\x1a' },
      { label: 'Ctrl+R', value: '\x12' },
      { label: 'Ctrl+L', value: '\x0c' },
    ]
  },
  {
    id: 'functions',
    name: 'Functions',
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
  },
  {
    id: 'unix',
    name: 'Unix',
    icon: '🐧',
    keys: [
      { label: 'ls', value: 'ls', action: 'command' },
      { label: 'cd ..', value: 'cd ..', action: 'command' },
      { label: 'pwd', value: 'pwd', action: 'command' },
      { label: 'clear', value: 'clear', action: 'command' },
      { label: 'exit', value: 'exit', action: 'command' },
      { label: '|', value: '|' },
      { label: '>', value: '>' },
      { label: '&', value: '&' },
    ]
  },
  {
    id: 'vim',
    name: 'Vim',
    icon: '📝',
    keys: [
      { label: ':w', value: ':w', action: 'command' },
      { label: ':q', value: ':q', action: 'command' },
      { label: ':wq', value: ':wq', action: 'command' },
      { label: 'dd', value: 'dd', action: 'macro', macro: ['d', 'd'] },
      { label: 'yy', value: 'yy', action: 'macro', macro: ['y', 'y'] },
      { label: 'p', value: 'p' },
      { label: 'i', value: 'i' },
      { label: 'Esc', value: '\x1b', color: '#ff6b6b' },
    ]
  },
  {
    id: 'git',
    name: 'Git',
    icon: '🌿',
    keys: [
      { label: 'status', value: 'git status', action: 'command' },
      { label: 'add .', value: 'git add .', action: 'command' },
      { label: 'commit', value: 'git commit -m ""', action: 'input' },
      { label: 'push', value: 'git push', action: 'command' },
      { label: 'pull', value: 'git pull', action: 'command' },
      { label: 'diff', value: 'git diff', action: 'command' },
      { label: 'log', value: 'git log --oneline', action: 'command' },
    ]
  }
];
```

### 2. Enhanced Virtual Keyboard Component

```typescript
// packages/client/src/components/mobile/EnhancedVirtualKeyboard.tsx
import React, { useState, useEffect } from 'react';
import { DEFAULT_KEY_SETS } from '../../constants/keySets';
import type { KeySet, SpecialKey } from '../../types/keyboard';
import './EnhancedVirtualKeyboard.css';

interface EnhancedVirtualKeyboardProps {
  onKey: (key: string) => void;
  onCommand: (command: string) => void;
  onMacro: (keys: string[]) => void;
  isVisible: boolean;
  customKeySets?: KeySet[];
  defaultKeySetId?: string;
}

export const EnhancedVirtualKeyboard: React.FC<EnhancedVirtualKeyboardProps> = ({
  onKey,
  onCommand,
  onMacro,
  isVisible,
  customKeySets = [],
  defaultKeySetId = 'navigation'
}) => {
  const allKeySets = [...DEFAULT_KEY_SETS, ...customKeySets];
  const [activeKeySetId, setActiveKeySetId] = useState(defaultKeySetId);
  const [modifiers, setModifiers] = useState({
    ctrl: false,
    alt: false,
    shift: false
  });

  const activeKeySet = allKeySets.find(set => set.id === activeKeySetId) || allKeySets[0];

  const handleKeyPress = (key: SpecialKey) => {
    if (key.modifier) {
      setModifiers(prev => ({
        ...prev,
        [key.value]: !prev[key.value as keyof typeof prev]
      }));
      return;
    }

    // Apply modifiers if needed
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
        if (key.macro) {
          onMacro(key.macro);
        }
        break;
      default:
        onKey(finalValue);
    }

    // Reset modifiers after use
    setModifiers({ ctrl: false, alt: false, shift: false });
  };

  if (!isVisible) return null;

  return (
    <div className="enhanced-virtual-keyboard">
      <div className="keyboard-tabs">
        {allKeySets.map(set => (
          <button
            key={set.id}
            className={`keyboard-tab ${set.id === activeKeySetId ? 'active' : ''}`}
            onClick={() => setActiveKeySetId(set.id)}
          >
            {set.icon && <span className="tab-icon">{set.icon}</span>}
            <span className="tab-name">{set.name}</span>
          </button>
        ))}
      </div>
      
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
      
      {/* Modifier indicators */}
      <div className="modifier-indicators">
        {modifiers.ctrl && <span className="modifier-active">Ctrl</span>}
        {modifiers.alt && <span className="modifier-active">Alt</span>}
        {modifiers.shift && <span className="modifier-active">Shift</span>}
      </div>
    </div>
  );
};
```

### 3. Customizable Key Sets Hook

```typescript
// packages/client/src/hooks/useCustomKeySets.ts
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
    setCustomKeySets(prev => [...prev, keySet]);
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

  return {
    customKeySets,
    addKeySet,
    updateKeySet,
    removeKeySet,
    addKeyToSet
  };
}
```

### 4. Key Set Editor Component

```typescript
// packages/client/src/components/mobile/KeySetEditor.tsx
import React, { useState } from 'react';
import type { KeySet, SpecialKey } from '../../types/keyboard';
import './KeySetEditor.css';

interface KeySetEditorProps {
  keySet?: KeySet;
  onSave: (keySet: KeySet) => void;
  onCancel: () => void;
}

export const KeySetEditor: React.FC<KeySetEditorProps> = ({
  keySet,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(keySet?.name || '');
  const [icon, setIcon] = useState(keySet?.icon || '');
  const [keys, setKeys] = useState<SpecialKey[]>(keySet?.keys || []);
  const [editingKey, setEditingKey] = useState<SpecialKey | null>(null);

  const handleAddKey = () => {
    setEditingKey({
      label: '',
      value: '',
      action: 'input'
    });
  };

  const handleSaveKey = (key: SpecialKey) => {
    if (editingKey && keys.includes(editingKey)) {
      // Update existing
      setKeys(keys.map(k => k === editingKey ? key : k));
    } else {
      // Add new
      setKeys([...keys, key]);
    }
    setEditingKey(null);
  };

  const handleRemoveKey = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const id = keySet?.id || `custom-${Date.now()}`;
    onSave({
      id,
      name,
      icon,
      keys
    });
  };

  return (
    <div className="key-set-editor">
      <h3>{keySet ? 'Edit Key Set' : 'New Key Set'}</h3>
      
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Custom Keys"
        />
      </div>
      
      <div className="form-group">
        <label>Icon (emoji)</label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🔧"
          maxLength={2}
        />
      </div>
      
      <div className="keys-list">
        <h4>Keys</h4>
        {keys.map((key, index) => (
          <div key={index} className="key-item">
            <span className="key-preview">{key.label}</span>
            <button onClick={() => setEditingKey(key)}>Edit</button>
            <button onClick={() => handleRemoveKey(index)}>Remove</button>
          </div>
        ))}
        <button onClick={handleAddKey} className="add-key-button">
          + Add Key
        </button>
      </div>
      
      {editingKey && (
        <KeyEditor
          key={editingKey}
          onSave={handleSaveKey}
          onCancel={() => setEditingKey(null)}
        />
      )}
      
      <div className="editor-actions">
        <button onClick={handleSave} disabled={!name || keys.length === 0}>
          Save
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// Key editor component
const KeyEditor: React.FC<{
  key: SpecialKey;
  onSave: (key: SpecialKey) => void;
  onCancel: () => void;
}> = ({ key, onSave, onCancel }) => {
  const [label, setLabel] = useState(key.label);
  const [value, setValue] = useState(key.value);
  const [action, setAction] = useState(key.action || 'input');
  const [color, setColor] = useState(key.color || '');

  const handleSave = () => {
    onSave({
      ...key,
      label,
      value,
      action: action as SpecialKey['action'],
      color: color || undefined
    });
  };

  return (
    <div className="key-editor">
      <h4>Edit Key</h4>
      
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label"
      />
      
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value or command"
      />
      
      <select value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="input">Input</option>
        <option value="command">Command</option>
        <option value="macro">Macro</option>
      </select>
      
      <input
        type="color"
        value={color || '#007acc'}
        onChange={(e) => setColor(e.target.value)}
      />
      
      <div className="key-editor-actions">
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
```

### 5. Usage Example

```typescript
// In your mobile app component
import { EnhancedVirtualKeyboard } from './components/mobile/EnhancedVirtualKeyboard';
import { useCustomKeySets } from './hooks/useCustomKeySets';

export const MobileApp: React.FC = () => {
  const { customKeySets } = useCustomKeySets();
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  const handleKey = (key: string) => {
    wsService.send({
      type: 'input',
      sessionId: activeSessionId,
      data: key
    });
  };
  
  const handleCommand = (command: string) => {
    // Send command with newline
    wsService.send({
      type: 'input',
      sessionId: activeSessionId,
      data: command + '\n'
    });
  };
  
  const handleMacro = (keys: string[]) => {
    // Send keys in sequence
    keys.forEach(key => {
      wsService.send({
        type: 'input',
        sessionId: activeSessionId,
        data: key
      });
    });
  };

  return (
    <div className="mobile-app">
      {/* ... other components ... */}
      
      <EnhancedVirtualKeyboard
        isVisible={showKeyboard}
        onKey={handleKey}
        onCommand={handleCommand}
        onMacro={handleMacro}
        customKeySets={customKeySets}
        defaultKeySetId="navigation"
      />
    </div>
  );
};
```

### 6. Styles for Enhanced Keyboard

```css
/* Enhanced keyboard styles */
.enhanced-virtual-keyboard {
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  max-height: 40vh;
  overflow: hidden;
}

.keyboard-tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.keyboard-tab {
  flex: 0 0 auto;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.keyboard-tab.active {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.tab-icon {
  font-size: 18px;
}

.keyboard-keys {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.key-button {
  min-height: 44px;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
  position: relative;
}

.key-button:active {
  transform: scale(0.95);
  background: var(--bg-tertiary);
}

.key-button.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

/* Different key widths */
.key-width-2 {
  grid-column: span 2;
}

.key-width-3 {
  grid-column: span 3;
}

/* Action-specific styles */
.key-action-command {
  font-family: monospace;
  font-size: 12px;
}

.key-action-macro::after {
  content: '⚡';
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  opacity: 0.7;
}

.key-icon {
  font-size: 16px;
}

.key-label {
  font-size: 12px;
}

.modifier-indicators {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  min-height: 24px;
  align-items: center;
  justify-content: center;
}

.modifier-active {
  padding: 2px 8px;
  background: var(--accent-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* Key set editor styles */
.key-set-editor {
  background: var(--bg-primary);
  padding: 16px;
  border-radius: 8px;
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: var(--text-secondary);
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 4px;
}

.keys-list {
  margin-bottom: 16px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  margin-bottom: 4px;
}

.key-preview {
  flex: 1;
  font-family: monospace;
}

.add-key-button {
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
}

.editor-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .keyboard-keys {
    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  }
  
  .key-button {
    min-height: 48px;
    font-size: 14px;
  }
}

/* Landscape mode */
@media (max-width: 768px) and (orientation: landscape) {
  .enhanced-virtual-keyboard {
    max-height: 50vh;
  }
  
  .keyboard-keys {
    grid-template-columns: repeat(auto-fit, minmax(45px, 1fr));
  }
  
  .key-button {
    min-height: 36px;
    padding: 4px;
  }
}
```

## Benefits

1. **Predefined Key Sets**: Navigation, modifiers, functions, Unix commands, Vim, Git
2. **Custom Key Sets**: Users can create their own key sets
3. **Multiple Actions**: Input, command (with newline), macro (sequence)
4. **Visual Customization**: Colors, icons, widths
5. **Modifier Support**: Ctrl, Alt, Shift combinations
6. **Persistent Storage**: Custom key sets saved to localStorage
7. **Touch-Optimized**: Proper sizing and spacing for mobile

## Future Enhancements

1. **Import/Export**: Share custom key sets
2. **Cloud Sync**: Sync custom keys across devices
3. **Contextual Keys**: Show different keys based on current command
4. **Voice Input**: Speech-to-text for commands
5. **Gesture Shortcuts**: Draw gestures for common commands
6. **Haptic Feedback**: Vibration on key press
7. **Theme Support**: Match terminal theme