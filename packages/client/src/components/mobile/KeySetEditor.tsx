import React, { useState } from 'react';
import { KeySet, KeyDefinition, KeySetEditorProps } from '../../types/keyboard.js';
import { useCustomKeySets } from '../../hooks/useCustomKeySets.js';

export function KeySetEditor({ keySet, onSave, onCancel }: KeySetEditorProps) {
  const { generateKeySetId } = useCustomKeySets();
  
  const [name, setName] = useState(keySet?.name || '');
  const [keys, setKeys] = useState<KeyDefinition[]>(keySet?.keys || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state for adding/editing keys
  const [keyForm, setKeyForm] = useState<Partial<KeyDefinition>>({
    label: '',
    type: 'text',
    value: '',
    style: undefined,
    width: 1,
  });

  const handleAddKey = () => {
    if (!keyForm.label || !keyForm.value) return;
    
    const newKey: KeyDefinition = {
      label: keyForm.label,
      type: keyForm.type || 'text',
      value: keyForm.value,
      style: keyForm.style,
      width: keyForm.width || 1,
    };

    if (editingIndex !== null) {
      const updatedKeys = [...keys];
      updatedKeys[editingIndex] = newKey;
      setKeys(updatedKeys);
      setEditingIndex(null);
    } else {
      setKeys([...keys, newKey]);
    }

    // Reset form
    setKeyForm({
      label: '',
      type: 'text',
      value: '',
      style: undefined,
      width: 1,
    });
  };

  const handleEditKey = (index: number) => {
    const key = keys[index];
    setKeyForm({
      label: key.label,
      type: key.type,
      value: key.value as string,
      style: key.style,
      width: key.width || 1,
    });
    setEditingIndex(index);
  };

  const handleDeleteKey = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name || keys.length === 0) {
      alert('Please provide a name and at least one key');
      return;
    }

    const savedKeySet: KeySet = {
      id: keySet?.id || generateKeySetId(),
      name,
      keys,
      readonly: false,
    };

    onSave(savedKeySet);
  };

  return (
    <div className="key-set-editor">
      <div className="key-set-editor-header">
        <h3>{keySet ? 'Edit Key Set' : 'Create Key Set'}</h3>
      </div>

      <div className="key-set-editor-content">
        <div className="editor-field">
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Keys"
          />
        </div>

        <div className="editor-section">
          <h4>Keys ({keys.length})</h4>
          
          <div className="keys-list">
            {keys.map((key, index) => (
              <div key={index} className="key-item">
                <span className="key-label">{key.label}</span>
                <span className="key-type">{key.type}</span>
                <div className="key-actions">
                  <button onClick={() => handleEditKey(index)}>Edit</button>
                  <button onClick={() => handleDeleteKey(index)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-section">
          <h4>{editingIndex !== null ? 'Edit Key' : 'Add Key'}</h4>
          
          <div className="key-form">
            <div className="editor-field">
              <label>Label:</label>
              <input
                type="text"
                value={keyForm.label}
                onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })}
                placeholder="Key label"
              />
            </div>

            <div className="editor-field">
              <label>Type:</label>
              <select
                value={keyForm.type}
                onChange={(e) => setKeyForm({ ...keyForm, type: e.target.value as 'text' | 'special' | 'command' | 'macro' })}
              >
                <option value="text">Text</option>
                <option value="special">Special Key</option>
                <option value="command">Command</option>
                <option value="macro">Macro</option>
              </select>
            </div>

            <div className="editor-field">
              <label>Value:</label>
              <input
                type="text"
                value={keyForm.value as string}
                onChange={(e) => setKeyForm({ ...keyForm, value: e.target.value })}
                placeholder={
                  keyForm.type === 'command' ? 'ls -la' :
                  keyForm.type === 'special' ? 'ctrl-c' : 
                  'Text to insert'
                }
              />
            </div>

            <div className="editor-field">
              <label>Style:</label>
              <select
                value={keyForm.style || ''}
                onChange={(e) => setKeyForm({ ...keyForm, style: e.target.value === '' ? undefined : e.target.value as 'primary' | 'danger' | 'warning' | 'success' })}
              >
                <option value="">Default</option>
                <option value="primary">Primary (Blue)</option>
                <option value="danger">Danger (Red)</option>
                <option value="warning">Warning (Yellow)</option>
                <option value="success">Success (Green)</option>
              </select>
            </div>

            <div className="editor-field">
              <label>Width:</label>
              <input
                type="number"
                value={keyForm.width}
                onChange={(e) => setKeyForm({ ...keyForm, width: parseInt(e.target.value) || 1 })}
                min="1"
                max="4"
              />
            </div>

            <button 
              className="add-key-btn"
              onClick={handleAddKey}
              disabled={!keyForm.label || !keyForm.value}
            >
              {editingIndex !== null ? 'Update Key' : 'Add Key'}
            </button>
          </div>
        </div>
      </div>

      <div className="key-set-editor-actions">
        <button onClick={onCancel}>Cancel</button>
        <button 
          onClick={handleSave}
          disabled={!name || keys.length === 0}
          className="primary"
        >
          Save Key Set
        </button>
      </div>
    </div>
  );
}