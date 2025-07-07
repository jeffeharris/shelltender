import React, { useState } from 'react';
import { Terminal, TerminalTheme } from '@shelltender/client';

// Predefined themes
const themes: Record<string, TerminalTheme> = {
  default: {
    background: '#000000',
    foreground: '#ffffff',
    cursor: '#ffffff',
    cursorAccent: '#000000',
  },
  vscode: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: '#3a3d41',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
};

interface TerminalCustomizationProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export const TerminalCustomization: React.FC<TerminalCustomizationProps> = ({
  sessionId,
  onSessionCreated,
}) => {
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Consolas, Monaco, monospace');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [cursorStyle, setCursorStyle] = useState<'block' | 'underline' | 'bar'>('block');
  const [cursorBlink, setCursorBlink] = useState(true);
  const [scrollback, setScrollback] = useState(10000);
  const [paddingLeft, setPaddingLeft] = useState(8);

  return (
    <div className="flex h-full">
      {/* Terminal */}
      <div className="flex-1">
        <Terminal
          key={`${selectedTheme}-${fontSize}-${fontFamily}-${cursorStyle}`} // Force remount on config change
          sessionId={sessionId}
          onSessionCreated={onSessionCreated}
          padding={{ left: paddingLeft }}
          fontSize={fontSize}
          fontFamily={fontFamily}
          theme={themes[selectedTheme]}
          cursorStyle={cursorStyle}
          cursorBlink={cursorBlink}
          scrollback={scrollback}
        />
      </div>

      {/* Customization Panel */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Terminal Customization</h3>
        
        {/* Theme */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {Object.keys(themes).map((theme) => (
              <option key={theme} value={theme}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min="10"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Font Family */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="Consolas, Monaco, monospace">Consolas</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            <option value="'Fira Code', monospace">Fira Code</option>
            <option value="'Source Code Pro', monospace">Source Code Pro</option>
            <option value="'Ubuntu Mono', monospace">Ubuntu Mono</option>
            <option value="monospace">System Monospace</option>
          </select>
        </div>

        {/* Cursor Style */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Cursor Style</label>
          <select
            value={cursorStyle}
            onChange={(e) => setCursorStyle(e.target.value as any)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="block">Block</option>
            <option value="underline">Underline</option>
            <option value="bar">Bar</option>
          </select>
        </div>

        {/* Cursor Blink */}
        <div className="mb-4">
          <label className="flex items-center text-sm font-medium text-gray-300">
            <input
              type="checkbox"
              checked={cursorBlink}
              onChange={(e) => setCursorBlink(e.target.checked)}
              className="mr-2"
            />
            Cursor Blink
          </label>
        </div>

        {/* Left Padding */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Left Padding: {paddingLeft}px
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={paddingLeft}
            onChange={(e) => setPaddingLeft(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Scrollback */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Scrollback Lines: {scrollback.toLocaleString()}
          </label>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={scrollback}
            onChange={(e) => setScrollback(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Code Example */}
        <div className="mt-6 p-3 bg-gray-800 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Usage Example:</h4>
          <pre className="text-xs text-gray-400 overflow-x-auto">
{`<Terminal
  fontSize={${fontSize}}
  fontFamily="${fontFamily}"
  theme={themes.${selectedTheme}}
  cursorStyle="${cursorStyle}"
  cursorBlink={${cursorBlink}}
  scrollback={${scrollback}}
  padding={{ left: ${paddingLeft} }}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};