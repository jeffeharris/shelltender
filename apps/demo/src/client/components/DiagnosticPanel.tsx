import { useState, useEffect } from 'react';
import { useWebSocket } from '@shelltender/client';

export const DiagnosticPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { wsService } = useWebSocket();
  
  useEffect(() => {
    // Add keyboard shortcut to toggle panel (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    if (!isVisible) return;
    
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      setLogs(prev => [...prev.slice(-100), `[LOG] ${args.join(' ')}`]);
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      setLogs(prev => [...prev.slice(-100), `[ERROR] ${args.join(' ')}`]);
      originalError.apply(console, args);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [isVisible]);
  
  const runDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      wsConnected: wsService?.isConnected() || false,
      wsUrl: (wsService as any)?.url || 'Unknown',
      localStorage: {
        items: Object.keys(localStorage).length,
        size: new Blob(Object.values(localStorage)).size
      },
      sessionStorage: {
        items: Object.keys(sessionStorage).length
      },
      terminals: document.querySelectorAll('.xterm').length,
      activeElement: document.activeElement?.tagName || 'None'
    };
    
    console.log('Diagnostics:', diagnostics);
    
    // Create downloadable report
    const report = JSON.stringify(diagnostics, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelltender-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const testInputHandling = () => {
    console.log('Testing input handling...');
    
    // Find terminal textarea
    const textarea = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
    if (textarea) {
      console.log('Found terminal textarea:', {
        exists: true,
        focused: document.activeElement === textarea,
        disabled: textarea.disabled,
        readOnly: textarea.readOnly,
        value: textarea.value
      });
      
      // Try to focus and type
      textarea.focus();
      textarea.value = 'test';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log('Dispatched test input event');
    } else {
      console.error('Terminal textarea not found!');
    }
  };
  
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white px-3 py-1 rounded text-xs opacity-50 hover:opacity-100"
        >
          Diagnostics (Ctrl+Shift+D)
        </button>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-900 text-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Shelltender Diagnostics</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={runDiagnostics}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Run Diagnostics
          </button>
          <button
            onClick={testInputHandling}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Test Input
          </button>
          <button
            onClick={() => setLogs([])}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Clear Logs
          </button>
          <button
            onClick={() => {
              if ((window as any).exportDebugLogs) {
                (window as any).exportDebugLogs();
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Export Debug Logs
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-800 p-4 rounded font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs captured yet. Interact with the app to see logs.</div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`mb-1 ${log.startsWith('[ERROR]') ? 'text-red-400' : 'text-gray-300'}`}
              >
                {log}
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          Press Ctrl+Shift+D to toggle this panel. Check browser console for full logs.
        </div>
      </div>
    </div>
  );
};