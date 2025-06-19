import React, { useRef, useEffect, useState } from 'react';
import { useMobile } from '../../context/MobileContext';

interface MobileTerminalInputProps {
  onInput: (text: string) => void;
  onSpecialKey: (key: string) => void;
}

export function MobileTerminalInput({ onInput, onSpecialKey }: MobileTerminalInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const { isKeyboardVisible } = useMobile();

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle input changes
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const diff = newValue.slice(inputValue.length);
    
    if (diff) {
      onInput(diff);
    }
    
    // Keep a small buffer to detect backspace
    setInputValue(newValue.slice(-10));
  };

  // Handle special keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't prevent default for regular characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      return;
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        onInput('\r');
        setInputValue('');
        break;
      
      case 'Backspace':
        if (inputValue.length === 0) {
          e.preventDefault();
          onSpecialKey('backspace');
        }
        break;
      
      case 'Tab':
        e.preventDefault();
        onInput('\t');
        break;
      
      case 'Escape':
        e.preventDefault();
        onSpecialKey('escape');
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        onSpecialKey('up');
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        onSpecialKey('down');
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        onSpecialKey('left');
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        onSpecialKey('right');
        break;
      
      default:
        // Handle Ctrl/Cmd combinations
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.key === 'c') {
            onSpecialKey('ctrl-c');
          } else if (e.key === 'd') {
            onSpecialKey('ctrl-d');
          } else if (e.key === 'z') {
            onSpecialKey('ctrl-z');
          } else if (e.key === 'l') {
            onSpecialKey('ctrl-l');
          } else if (e.key === 'a') {
            onSpecialKey('ctrl-a');
          } else if (e.key === 'e') {
            onSpecialKey('ctrl-e');
          } else if (e.key === 'k') {
            onSpecialKey('ctrl-k');
          } else if (e.key === 'u') {
            onSpecialKey('ctrl-u');
          } else if (e.key === 'w') {
            onSpecialKey('ctrl-w');
          }
        }
    }
  };

  // Ensure input stays focused
  const handleBlur = () => {
    // Small delay to allow for button clicks
    setTimeout(() => {
      if (inputRef.current && !document.activeElement?.closest('.mobile-no-blur')) {
        inputRef.current.focus();
      }
    }, 100);
  };

  return (
    <textarea
      ref={inputRef}
      value={inputValue}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="mobile-terminal-input"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  );
}