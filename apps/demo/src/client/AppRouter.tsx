import { useState, useEffect } from 'react';
import App from './App';
import { EventSystemDemo } from './components/EventSystemDemo';
import { ClaudeAgentDemo } from './components/ClaudeAgentDemo';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { TerminalCustomization } from './components/TerminalCustomization';

type DemoMode = 'terminal' | 'events' | 'claude' | 'mobile' | 'diagnostics' | 'customization';

export function AppRouter() {
  const [mode, setMode] = useState<DemoMode>('terminal');
  
  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode') as DemoMode;
    if (requestedMode && ['terminal', 'events', 'claude', 'mobile', 'diagnostics', 'customization'].includes(requestedMode)) {
      setMode(requestedMode);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Mode Selector */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Demo Mode:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('terminal')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'terminal' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Terminal Only
            </button>
            <button
              onClick={() => setMode('events')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'events' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Event System
            </button>
            <button
              onClick={() => setMode('claude')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'claude' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Claude Patterns
            </button>
            <button
              onClick={() => setMode('mobile')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'mobile' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Mobile View
            </button>
            <button
              onClick={() => setMode('diagnostics')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'diagnostics' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Diagnostics
            </button>
            <button
              onClick={() => setMode('customization')}
              className={`px-3 py-1 text-sm rounded ${
                mode === 'customization' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Customization
            </button>
          </div>
          <div className="ml-auto text-xs text-gray-500">
            Tip: Use ?mode=terminal, ?mode=events, ?mode=claude, etc. in URL
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'terminal' && <App showEventSystem={false} forceMobile={false} />}
        {mode === 'events' && <App showEventSystem={true} forceMobile={false} />}
        {mode === 'claude' && <ClaudeAgentDemo />}
        {mode === 'mobile' && <App showEventSystem={false} forceMobile={true} />}
        {mode === 'diagnostics' && (
          <div className="h-full flex flex-col">
            <App showEventSystem={false} forceMobile={false} />
            <div className="h-1/3 border-t border-gray-700">
              <DiagnosticPanel />
            </div>
          </div>
        )}
        {mode === 'customization' && <TerminalCustomization />}
      </div>
    </div>
  );
}