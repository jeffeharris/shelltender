import React, { useRef } from 'react';
import { Terminal, TerminalHandle } from '@shelltender/client';

export function ResizableTerminalExample() {
  const terminalRef = useRef<TerminalHandle>(null);

  // Example: Manually trigger fit after some layout change
  const handleLayoutChange = () => {
    // Call fit() to recalculate terminal dimensions
    terminalRef.current?.fit();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with manual fit button */}
      <div style={{ padding: '10px', background: '#333', color: 'white' }}>
        <button onClick={handleLayoutChange}>
          Manually Fit Terminal
        </button>
      </div>
      
      {/* Terminal in flex container */}
      <div style={{ flex: 1, display: 'flex' }}>
        <Terminal 
          ref={terminalRef}
          debug={true} // Enable debug logging
          padding={{ left: 10, right: 10, top: 5, bottom: 5 }}
        />
      </div>
    </div>
  );
}

// Example with dynamic sidebar
export function TerminalWithSidebar() {
  const terminalRef = useRef<TerminalHandle>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Terminal will automatically resize when sidebar toggles
  // thanks to ResizeObserver
  
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: '200px', background: '#eee', padding: '20px' }}>
          <h3>Sidebar</h3>
          <p>Terminal will resize when this toggles</p>
        </div>
      )}
      
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          Toggle Sidebar
        </button>
        <div style={{ flex: 1 }}>
          <Terminal 
            ref={terminalRef}
            debug={true}
          />
        </div>
      </div>
    </div>
  );
}