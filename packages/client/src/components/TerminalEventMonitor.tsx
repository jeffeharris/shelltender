import React, { useEffect, useState } from 'react';
import { useTerminalEvents } from '../hooks/useTerminalEvents';
import type { PatternMatchEvent } from '@shelltender/core';

interface Props {
  sessionId: string;
}

export const TerminalEventMonitor: React.FC<Props> = ({ sessionId }) => {
  const { events, registerPattern, clearEvents } = useTerminalEvents(sessionId, { maxEvents: 500 });
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isMonitoring) return;

    const setupPatterns = async () => {
      try {
        // Register error pattern
        await registerPattern({
          name: 'error-detector',
          type: 'regex',
          pattern: /error:|failed:/i,
          options: { debounce: 100 }
        });

        // Register success pattern
        await registerPattern({
          name: 'success-detector',
          type: 'regex',
          pattern: /success|completed|done/i,
          options: { debounce: 100 }
        });
      } catch (error) {
        console.error('Failed to register patterns:', error);
      }
    };

    setupPatterns();
  }, [isMonitoring, registerPattern]);

  const errorEvents = events.filter(e => 
    e.type === 'pattern-match' && 
    (e as PatternMatchEvent).patternName === 'error-detector'
  );

  const successEvents = events.filter(e => 
    e.type === 'pattern-match' && 
    (e as PatternMatchEvent).patternName === 'success-detector'
  );

  return (
    <div className="terminal-event-monitor p-4 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 rounded transition-colors ${
              isMonitoring 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-700 rounded p-3 bg-gray-800">
          <h4 className="font-semibold text-red-400 mb-2">
            Errors ({errorEvents.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {errorEvents.length === 0 ? (
              <div className="text-gray-500 text-sm">No errors detected</div>
            ) : (
              errorEvents.map((event, i) => (
                <div key={i} className="text-sm font-mono text-red-300">
                  {(event as PatternMatchEvent).match}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-gray-700 rounded p-3 bg-gray-800">
          <h4 className="font-semibold text-green-400 mb-2">
            Success ({successEvents.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {successEvents.length === 0 ? (
              <div className="text-gray-500 text-sm">No success events detected</div>
            ) : (
              successEvents.map((event, i) => (
                <div key={i} className="text-sm font-mono text-green-300">
                  {(event as PatternMatchEvent).match}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};