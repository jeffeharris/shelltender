# Terminal Resize Behavior

The Shelltender Terminal component now includes robust resize handling that works seamlessly with flexbox containers and provides better control over terminal sizing.

## Features

### 1. ResizeObserver-Based Detection

The Terminal component uses `ResizeObserver` to detect container size changes, not just window resize events. This means:

- Flexbox layout changes are detected automatically
- CSS transitions that affect container size trigger terminal resizing
- Works with dynamic layouts (sidebars, accordions, etc.)

### 2. Imperative API

You can now manually trigger a terminal fit using a ref:

```tsx
import { useRef } from 'react';
import { Terminal, TerminalHandle } from '@shelltender/client';

function MyComponent() {
  const terminalRef = useRef<TerminalHandle>(null);

  const handleManualResize = () => {
    // Manually trigger terminal fit
    terminalRef.current?.fit();
  };

  return (
    <Terminal ref={terminalRef} />
  );
}
```

### 3. Improved Initial Sizing

The Terminal component now:
- Uses `requestAnimationFrame` double-buffering for layout stability
- Retries initial fit up to 5 times if container dimensions are invalid
- Validates container dimensions before attempting to fit

### 4. Configurable Padding

Control terminal padding without CSS conflicts:

```tsx
// Uniform padding
<Terminal padding={10} />

// Individual padding values
<Terminal padding={{ left: 10, right: 20, top: 5, bottom: 15 }} />
```

### 5. Terminal Customization

The Terminal component now supports extensive customization:

```tsx
<Terminal
  // Appearance
  fontSize={16}
  fontFamily="'Fira Code', monospace"
  cursorStyle="underline"
  cursorBlink={false}
  scrollback={5000}
  
  // Theme
  theme={{
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selection: '#264f78',
    // ANSI colors
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    // Bright ANSI colors
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  }}
/>
```

### 5. Debug Mode

Enable debug logging to troubleshoot resize issues:

```tsx
<Terminal debug={true} />
```

This logs:
- Container dimension changes
- Fit operations and their results
- Resize events from various sources
- Any errors during fit operations

## Usage Examples

### Basic Flexbox Container

```tsx
function FlexboxExample() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Terminal />
      </div>
    </div>
  );
}
```

### Dynamic Sidebar Layout

```tsx
function SidebarLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {sidebarOpen && (
        <div style={{ width: '200px', background: '#eee' }}>
          Sidebar Content
        </div>
      )}
      <div style={{ flex: 1 }}>
        <Terminal />
      </div>
    </div>
  );
}
```

### Manual Resize Control

```tsx
function ManualResizeExample() {
  const terminalRef = useRef<TerminalHandle>(null);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    // Manually fit after font size change
    terminalRef.current?.fit();
  }, [fontSize]);

  return (
    <>
      <button onClick={() => setFontSize(fs => fs + 2)}>
        Increase Font Size
      </button>
      <Terminal ref={terminalRef} />
    </>
  );
}
```

## Migration Guide

### Removing Hardcoded CSS Padding

If you have custom CSS that adds padding to `.terminal-container`, remove it and use the `padding` prop instead:

```css
/* Remove this */
.terminal-container {
  padding: 4px;
}
```

```tsx
/* Use this instead */
<Terminal padding={4} />
```

### Handling Resize Events

The Terminal component now handles resize automatically. Remove any manual resize handling:

```tsx
// Old approach - no longer needed
useEffect(() => {
  const handleResize = () => {
    // Manual resize logic
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// New approach - just render the Terminal
<Terminal />
```

## Troubleshooting

### Terminal Not Resizing

1. Enable debug mode: `<Terminal debug={true} />`
2. Check console for dimension warnings
3. Ensure container has valid dimensions (not 0x0)
4. Verify no CSS conflicts with terminal sizing

### Performance Issues

The resize operations are debounced by 100ms by default. If you're seeing performance issues:

1. Check if ResizeObserver is firing too frequently
2. Ensure terminal container doesn't have CSS animations that trigger constant resizes
3. Use the manual fit() method for controlled resizing

### Invalid Dimensions

The Terminal validates dimensions before sending to the server:
- Columns: 1-999
- Rows: 1-999

If you see warnings about invalid dimensions, check your container sizing.