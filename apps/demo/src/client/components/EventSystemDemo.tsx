import { useState, useEffect } from 'react';
import { useTerminalEvents } from '@shelltender/client';
import type { PatternConfig, AnyTerminalEvent } from '@shelltender/core';
import { CommonPatterns, getAllPatterns, getPatternsByCategory, AgenticCodingPatterns } from '@shelltender/server/patterns';

interface Props {
  sessionId: string;
}

// Pattern categories for organization
const PATTERN_CATEGORIES = [
  { key: 'build', label: 'Build Tools', icon: '🔨', source: 'common' },
  { key: 'git', label: 'Version Control', icon: '🔀', source: 'common' },
  { key: 'testing', label: 'Testing', icon: '🧪', source: 'common' },
  { key: 'diagnostics', label: 'Errors & Warnings', icon: '⚠️', source: 'common' },
  { key: 'system', label: 'System & Shell', icon: '💻', source: 'common' },
  { key: 'progress', label: 'Progress & Status', icon: '📊', source: 'common' },
  { key: 'network', label: 'Network & HTTP', icon: '🌐', source: 'common' },
  { key: 'docker', label: 'Docker & Containers', icon: '🐳', source: 'common' },
  { key: 'packageManagers', label: 'Package Managers', icon: '📦', source: 'common' },
  // AI Assistant patterns
  { key: 'status', label: 'AI Status', icon: '🤖', source: 'agentic' },
  { key: 'input', label: 'AI Input Prompts', icon: '💬', source: 'agentic' },
  { key: 'ui', label: 'AI UI Elements', icon: '🔲', source: 'agentic' },
  { key: 'completion', label: 'AI Task Results', icon: '✅', source: 'agentic' },
  { key: 'special', label: 'AI Special States', icon: '⚡', source: 'agentic' },
  { key: 'terminal', label: 'Terminal Control', icon: '🖥️', source: 'agentic' }
] as const;

export const EventSystemDemo: React.FC<Props> = ({ sessionId }) => {
  const { events, registerPattern, clearEvents, getPatterns, isConnected } = useTerminalEvents(sessionId, { maxEvents: 100 });
  const [activePatterns, setActivePatterns] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [customPattern, setCustomPattern] = useState('');
  const [customPatternName, setCustomPatternName] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [collectedActionWords, setCollectedActionWords] = useState<Map<string, number>>(new Map());

  // Load existing patterns on mount
  useEffect(() => {
    if (isConnected) {
      loadPatterns();
    }
  }, [isConnected]);

  // Collect action words from AI events
  useEffect(() => {
    events.forEach(event => {
      if (event.type === 'pattern-match' && (event as any).patternName === 'ai-action-word') {
        const match = (event as any).match;
        const actionWordMatch = match.match(/[·✢*✶✻✽✺●○◉◎]\s*(\w+)…/);
        if (actionWordMatch) {
          const word = actionWordMatch[1];
          setCollectedActionWords(prev => {
            const newMap = new Map(prev);
            newMap.set(word, (newMap.get(word) || 0) + 1);
            return newMap;
          });
        }
      }
    });
  }, [events]);

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

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getFilteredPatterns = (category: typeof PATTERN_CATEGORIES[number]) => {
    let patterns: any;
    
    if (category.source === 'common') {
      patterns = CommonPatterns[category.key as keyof typeof CommonPatterns];
    } else if (category.source === 'agentic') {
      patterns = AgenticCodingPatterns[category.key as keyof typeof AgenticCodingPatterns];
    }
    
    if (!patterns) return [];
    
    const patternArray = Object.values(patterns) as PatternConfig[];
    
    if (!searchQuery) return patternArray;
    
    const query = searchQuery.toLowerCase();
    return patternArray.filter(pattern => 
      pattern.name.toLowerCase().includes(query) ||
      (pattern.description && pattern.description.toLowerCase().includes(query)) ||
      (pattern.pattern instanceof RegExp && pattern.pattern.toString().toLowerCase().includes(query))
    );
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
      <div className="w-96 border-r border-gray-700 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold mb-3">Pattern Library</h3>
          
          {/* Search input */}
          <input
            type="text"
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-2">
            {PATTERN_CATEGORIES.map(category => {
              const patterns = getFilteredPatterns(category);
              const isCollapsed = collapsedCategories.has(category.key);
              const hasActivePatterns = patterns.some(p => activePatterns.has(p.name));
              
              if (patterns.length === 0 && searchQuery) return null;
              
              return (
                <div key={category.key} className="border border-gray-700 rounded overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.key)}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.label}</span>
                      <span className="text-xs text-gray-500">({patterns.length})</span>
                      {hasActivePatterns && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-600 rounded">Active</span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {!isCollapsed && (
                    <div className="p-2 space-y-1 bg-gray-850">
                      {patterns.map(pattern => (
                        <label
                          key={pattern.name}
                          className="flex items-start gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={activePatterns.has(pattern.name)}
                            onChange={() => togglePattern(pattern)}
                            disabled={isLoading || !isConnected}
                            className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-200">{pattern.name}</div>
                            {pattern.description && (
                              <div className="text-xs text-gray-400 mt-0.5">{pattern.description}</div>
                            )}
                            <div className="text-xs text-gray-500 font-mono mt-1 break-all">
                              {pattern.pattern instanceof RegExp 
                                ? pattern.pattern.toString() 
                                : Array.isArray(pattern.pattern)
                                  ? pattern.pattern.join(', ')
                                  : String(pattern.pattern)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 space-y-4 border-t border-gray-700 flex-shrink-0 bg-gray-900">
          <div>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
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
        
        {/* Action Word Collection Display */}
        {collectedActionWords.size > 0 && (
          <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🎲</span>
              <span>Claude's Action Words Collection</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(collectedActionWords.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([word, count]) => (
                  <span
                    key={word}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm flex items-center gap-2"
                    title={`Seen ${count} time${count > 1 ? 's' : ''}`}
                  >
                    <span className="font-medium">{word}</span>
                    <span className="text-xs text-gray-400">×{count}</span>
                  </span>
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              These are the random action words Claude uses while thinking. Collect them all!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};