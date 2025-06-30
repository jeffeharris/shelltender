import { useState, useEffect, useRef } from 'react';
import { Terminal, useWebSocket } from '@shelltender/client';
import type { TerminalSession } from '@shelltender/core';

interface Props {
  sessionId?: string;
}

// Simulated Claude agent output sequences
const CLAUDE_SEQUENCES = [
  {
    name: "File Analysis",
    steps: [
      { delay: 0, text: "\x1b[1;34m◉ Analyzing...\x1b[0m Reading project structure\r\n" },
      { delay: 500, text: "  \x1b[32m✓\x1b[0m Found 15 TypeScript files\r\n" },
      { delay: 700, text: "  \x1b[32m✓\x1b[0m Detected React components\r\n" },
      { delay: 900, text: "  \x1b[32m✓\x1b[0m Identified test files\r\n\r\n" },
      { delay: 1200, text: "\x1b[1;34m◎ Planning...\x1b[0m Determining best approach\r\n" },
      { delay: 1500, text: "  • Will refactor the authentication module\r\n" },
      { delay: 1700, text: "  • Need to update 3 components\r\n" },
      { delay: 1900, text: "  • Tests will be added\r\n\r\n" },
      { delay: 2200, text: "\x1b[1;34m✶ Executing...\x1b[0m Making changes\r\n" },
      { delay: 2500, text: "  \x1b[33m~\x1b[0m Updating src/auth/login.tsx\r\n" },
      { delay: 2800, text: "  \x1b[33m~\x1b[0m Modifying src/auth/context.tsx\r\n" },
      { delay: 3100, text: "  \x1b[33m~\x1b[0m Creating src/auth/hooks.ts\r\n" },
      { delay: 3400, text: "  \x1b[32m✓\x1b[0m Changes complete\r\n\r\n" },
      { delay: 3700, text: "\x1b[1;32m✓ Task completed successfully!\x1b[0m\r\n" }
    ]
  },
  {
    name: "Running Tests",
    steps: [
      { delay: 0, text: "\x1b[1;34m● Testing...\x1b[0m Running test suite\r\n\r\n" },
      { delay: 300, text: "$ npm test\r\n" },
      { delay: 600, text: "\x1b[2m> project@1.0.0 test\x1b[0m\r\n" },
      { delay: 700, text: "\x1b[2m> jest --coverage\x1b[0m\r\n\r\n" },
      { delay: 1000, text: " PASS  src/auth/login.test.tsx\r\n" },
      { delay: 1200, text: "  \x1b[32m✓\x1b[0m renders login form (45ms)\r\n" },
      { delay: 1400, text: "  \x1b[32m✓\x1b[0m handles form submission (23ms)\r\n" },
      { delay: 1600, text: "  \x1b[32m✓\x1b[0m shows validation errors (18ms)\r\n\r\n" },
      { delay: 1900, text: " PASS  src/auth/context.test.tsx\r\n" },
      { delay: 2100, text: "  \x1b[32m✓\x1b[0m provides auth state (12ms)\r\n" },
      { delay: 2300, text: "  \x1b[32m✓\x1b[0m handles logout (8ms)\r\n\r\n" },
      { delay: 2600, text: "Test Suites: \x1b[1;32m2 passed\x1b[0m, 2 total\r\n" },
      { delay: 2800, text: "Tests:       \x1b[1;32m5 passed\x1b[0m, 5 total\r\n" },
      { delay: 3000, text: "Coverage:    \x1b[1;32m94.3%\x1b[0m\r\n" }
    ]
  },
  {
    name: "Debugging Error",
    steps: [
      { delay: 0, text: "\x1b[1;31m✗ Error detected!\x1b[0m TypeError: Cannot read property 'map' of undefined\r\n" },
      { delay: 300, text: "  at UserList.tsx:45\r\n\r\n" },
      { delay: 600, text: "\x1b[1;34m◉ Investigating...\x1b[0m Analyzing error context\r\n" },
      { delay: 900, text: "  \x1b[33m?\x1b[0m Checking data flow\r\n" },
      { delay: 1200, text: "  \x1b[33m?\x1b[0m users prop is undefined\r\n" },
      { delay: 1500, text: "  \x1b[32m!\x1b[0m Found issue: missing null check\antml\r\n\r\n" },
      { delay: 1800, text: "\x1b[1;34m◎ Fixing...\x1b[0m Applying solution\r\n" },
      { delay: 2100, text: "  \x1b[33m~\x1b[0m Adding defensive check\r\n" },
      { delay: 2400, text: "  \x1b[33m~\x1b[0m Updating PropTypes\r\n" },
      { delay: 2700, text: "  \x1b[32m✓\x1b[0m Fix applied\r\n\r\n" },
      { delay: 3000, text: "\x1b[1;32m✓ Error resolved!\x1b[0m Component now handles undefined gracefully\r\n" }
    ]
  },
  {
    name: "Claude Thinking",
    steps: [
      { delay: 0, text: "\x1b[1;35m<thinking>\x1b[0m\r\n" },
      { delay: 300, text: "The user wants me to implement a search feature. Let me think about this...\r\n\r\n" },
      { delay: 600, text: "Key considerations:\r\n" },
      { delay: 800, text: "• Need to handle real-time search\r\n" },
      { delay: 1000, text: "• Should debounce API calls\r\n" },
      { delay: 1200, text: "• Must show loading states\r\n" },
      { delay: 1400, text: "• Error handling is important\r\n\r\n" },
      { delay: 1700, text: "I'll use React hooks for state management and axios for API calls.\r\n" },
      { delay: 2000, text: "The debounce delay should be around 300ms for good UX.\r\n" },
      { delay: 2300, text: "\x1b[1;35m</thinking>\x1b[0m\r\n\r\n" },
      { delay: 2600, text: "I'll implement a search feature with debouncing and proper error handling.\r\n" },
      { delay: 2900, text: "Let me start by creating the search hook...\r\n" }
    ]
  }
];

export const ClaudeAgentDemo: React.FC<Props> = ({ sessionId: propSessionId }) => {
  const { wsService } = useWebSocket();
  const [sessionId, setSessionId] = useState<string | null>(propSessionId || null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const handleSessionCreated = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  const runSequence = () => {
    if (!wsService || !sessionId || isRunning) return;

    setIsRunning(true);
    // Clear any existing timeouts
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    const sequence = CLAUDE_SEQUENCES[selectedSequence];
    
    // Clear terminal first
    wsService.send({
      type: 'input',
      sessionId,
      data: '\x1b[2J\x1b[H' // Clear screen and move cursor to top
    });

    // Run each step with delays
    sequence.steps.forEach(step => {
      const timeout = setTimeout(() => {
        if (wsService && wsService.isConnected()) {
          // Simulate typing effect by sending character by character for some lines
          if (step.text.length < 50 && Math.random() > 0.5) {
            let i = 0;
            const typeInterval = setInterval(() => {
              if (i < step.text.length) {
                wsService.send({
                  type: 'input',
                  sessionId,
                  data: step.text[i]
                });
                i++;
              } else {
                clearInterval(typeInterval);
              }
            }, 20);
          } else {
            // Send whole line at once
            wsService.send({
              type: 'input',
              sessionId,
              data: step.text
            });
          }
        }
      }, step.delay);
      
      timeoutsRef.current.push(timeout);
    });

    // Reset running state after sequence completes
    const totalTime = Math.max(...sequence.steps.map(s => s.delay)) + 1000;
    const resetTimeout = setTimeout(() => {
      setIsRunning(false);
    }, totalTime);
    timeoutsRef.current.push(resetTimeout);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="h-full flex">
      {/* Control Panel */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-white">Claude Agent Pattern Demo</h2>
        
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Sequence:
            </label>
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              disabled={isRunning}
            >
              {CLAUDE_SEQUENCES.map((seq, idx) => (
                <option key={idx} value={idx}>{seq.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={runSequence}
            disabled={!sessionId || isRunning}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium"
          >
            {isRunning ? 'Running...' : 'Run Sequence'}
          </button>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Pattern Legend:</h3>
            <div className="space-y-1 text-xs text-gray-400">
              <div>◉ ◎ ● - Status indicators</div>
              <div>✓ ✗ - Success/Error</div>
              <div>✶ ✻ ✽ - Action words</div>
              <div>~ ? ! - Progress indicators</div>
              <div>&lt;thinking&gt; - Claude's thought process</div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Tips:</h3>
            <div className="space-y-1 text-xs text-gray-400">
              <p>• These patterns help identify when Claude is working</p>
              <p>• The event system can detect and track these patterns</p>
              <p>• Use the Event System demo to see pattern matching in action</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            Session: {sessionId ? sessionId.substring(0, 8) : 'Not created'}
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1">
        <Terminal
          sessionId={sessionId || undefined}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  );
};