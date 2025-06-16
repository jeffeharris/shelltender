import { useState, useEffect } from 'react';
import { useTerminalEvents } from '@shelltender/client';
import type { PatternConfig, AnyTerminalEvent } from '@shelltender/core';

interface Props {
  sessionId: string;
}

const DEMO_PATTERNS: PatternConfig[] = [
  {
    name: 'npm-install',
    type: 'regex',
    pattern: /npm (install|i)/,
    options: { debounce: 100 }
  },
  {
    name: 'build-status',
    type: 'regex',
    pattern: /Build (succeeded|failed) in (\d+(\.\d+)?)s/,
    options: { debounce: 500 }
  },
  {
    name: 'test-results',
    type: 'regex',
    pattern: /Tests:\s+(\d+) passed, (\d+) failed/,
    options: { debounce: 200 }
  },
  {
    name: 'git-commands',
    type: 'regex',
    pattern: /git (status|add|commit|push|pull)/,
    options: { debounce: 100 }
  },
  {
    name: 'error-detection',
    type: 'regex',
    pattern: /error:|Error:|ERROR:|failed|Failed|FAILED/i,
    options: { debounce: 200 }
  },
  {
    name: 'warning-detection',
    type: 'regex',
    pattern: /warning:|Warning:|WARNING:|warn:|Warn:|WARN:/i,
    options: { debounce: 200 }
  },
  {
    name: 'prompt-detection',
    type: 'regex',
    pattern: /\$\s*$/,
    options: { debounce: 0 }
  },
  {
    name: 'progress-percentage',
    type: 'regex',
    pattern: /(\d+)%/,
    options: { debounce: 100 }
  }
];

export const EventSystemDemo: React.FC<Props> = ({ sessionId }) => {
  const { events, registerPattern, clearEvents, getPatterns, isConnected } = useTerminalEvents(sessionId, { maxEvents: 100 });
  const [activePatterns, setActivePatterns] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [customPattern, setCustomPattern] = useState('');
  const [customPatternName, setCustomPatternName] = useState('');

  // Load existing patterns on mount
  useEffect(() => {
    if (isConnected) {
      loadPatterns();
    }
  }, [isConnected]);

  const loadPatterns = async () => {
    try {
      const patterns = await getPatterns();
      const names = new Set(patterns.map((p: any) => p.config.name));
      setActivePatterns(names);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  };

  const togglePattern = async (pattern: PatternConfig) => {
    setIsLoading(true);
    try {
      if (activePatterns.has(pattern.name)) {
        // Pattern is already registered, we can't unregister by name
        // so we'll just remove from our tracking
        setActivePatterns(prev => {
          const next = new Set(prev);
          next.delete(pattern.name);
          return next;
        });
      } else {
        await registerPattern(pattern);
        setActivePatterns(prev => new Set([...prev, pattern.name]));
      }
    } catch (error) {
      console.error('Failed to toggle pattern:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomPattern = async () => {
    if (!customPattern || !customPatternName) return;
    
    setIsLoading(true);
    try {
      await registerPattern({
        name: customPatternName,
        type: 'regex',
        pattern: new RegExp(customPattern),
        options: { debounce: 100 }
      });
      setActivePatterns(prev => new Set([...prev, customPatternName]));
      setCustomPattern('');
      setCustomPatternName('');
    } catch (error) {
      console.error('Failed to register custom pattern:', error);
      alert(`Failed to register pattern: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventsByPattern = () => {
    const grouped: Record<string, AnyTerminalEvent[]> = {};
    events.forEach((event: AnyTerminalEvent) => {
      if (event.type === 'pattern-match') {
        const name = (event as any).patternName;
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(event);
      }
    });
    return grouped;
  };

  const eventsByPattern = getEventsByPattern();

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Pattern Selection Panel */}
      <div className="w-80 border-r border-gray-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Pattern Library</h3>
        
        <div className="space-y-2 mb-6">
          {DEMO_PATTERNS.map(pattern => (
            <label
              key={pattern.name}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={activePatterns.has(pattern.name)}
                onChange={() => togglePattern(pattern)}
                disabled={isLoading || !isConnected}
                className="w-4 h-4 text-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{pattern.name}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {pattern.pattern instanceof RegExp ? pattern.pattern.toString() : String(pattern.pattern)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="font-medium mb-2">Custom Pattern</h4>
          <input
            type="text"
            placeholder="Pattern name"
            value={customPatternName}
            onChange={(e) => setCustomPatternName(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 rounded text-sm mb-2"
          />
          <input
            type="text"
            placeholder="Regex pattern (e.g., error|failed)"
            value={customPattern}
            onChange={(e) => setCustomPattern(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 rounded text-sm mb-2"
          />
          <button
            onClick={registerCustomPattern}
            disabled={isLoading || !isConnected || !customPattern || !customPatternName}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm"
          >
            Register Pattern
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Connection</span>
            <span className={`text-sm px-2 py-0.5 rounded ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Total Events</span>
            <span className="text-sm">{events.length}</span>
          </div>
        </div>
      </div>

      {/* Events Display */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Captured Events</h3>
          <button
            onClick={clearEvents}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Clear Events
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No events captured yet.</p>
            <p className="text-sm mt-2">Select patterns from the library and interact with your terminal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(eventsByPattern).map(([patternName, patternEvents]) => (
              <div key={patternName} className="border border-gray-700 rounded p-3">
                <h4 className="font-medium mb-2 text-blue-400">{patternName}</h4>
                <div className="space-y-1">
                  {patternEvents.slice(-5).map((event, idx) => (
                    <div key={idx} className="text-sm font-mono bg-gray-800 p-2 rounded">
                      <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      <span className="ml-2 text-green-400">{(event as any).match}</span>
                      {(event as any).groups && Object.keys((event as any).groups).length > 0 && (
                        <span className="ml-2 text-yellow-400">
                          Groups: {JSON.stringify((event as any).groups)}
                        </span>
                      )}
                    </div>
                  ))}
                  {patternEvents.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      ... and {patternEvents.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};