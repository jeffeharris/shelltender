import { useState, useEffect } from 'react';
import { 
  Terminal, 
  SessionTabs, 
  SessionManager, 
  TerminalEventMonitor,
  MobileApp,
  MobileTerminal,
  MobileSessionTabs,
  EnhancedVirtualKeyboard,
  useMobileDetection,
  useWebSocket,
  SpecialKeyType,
  SPECIAL_KEY_SEQUENCES
} from '@shelltender/client';
import type { TerminalSession } from '@shelltender/core';
import { EventSystemDemo } from './components/EventSystemDemo';
import { SimpleEventTest } from './components/SimpleEventTest';
import { TouchDebugger } from '../components/TouchDebugger';
import { SimpleTouchTest } from '../components/SimpleTouchTest';

// Helper to get special key sequence
function getSpecialKeySequence(key: SpecialKeyType): string {
  return SPECIAL_KEY_SEQUENCES[key] || '';
}

function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showEventMonitor, setShowEventMonitor] = useState(false);
  const [showEventDemo, setShowEventDemo] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { isMobile } = useMobileDetection();
  const { wsService } = useWebSocket();

  // Fetch sessions periodically
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSession = (sessionId: string) => {
    console.log('handleSelectSession called with:', sessionId);
    setCurrentSessionId(sessionId);
    if (!openTabs.includes(sessionId)) {
      setOpenTabs(prev => [...prev, sessionId]);
    }
  };

  const handleNewSession = () => {
    console.log('handleNewSession called');
    setCurrentSessionId(''); // Empty string triggers new session
  };

  const handleSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setOpenTabs(prev => [...prev, sessionId]);
    // Refresh sessions list
    fetch('/api/sessions')
      .then(res => res.json())
      .then(setSessions)
      .catch(console.error);
  };

  const handleCloseSession = (sessionId: string) => {
    setOpenTabs(prev => prev.filter(id => id !== sessionId));
    
    // If closing current session, switch to another tab or null
    if (currentSessionId === sessionId) {
      const remainingTabs = openTabs.filter(id => id !== sessionId);
      setCurrentSessionId(remainingTabs.length > 0 ? remainingTabs[0] : null);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    if (!openTabs.includes(sessionId)) {
      setOpenTabs(prev => [...prev, sessionId]);
    }
    setCurrentSessionId(sessionId);
  };

  const handleKillSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from open tabs if present
        setOpenTabs(prev => prev.filter(id => id !== sessionId));
        
        // If it was the current session, switch to another
        if (currentSessionId === sessionId) {
          const remainingTabs = openTabs.filter(id => id !== sessionId);
          setCurrentSessionId(remainingTabs.length > 0 ? remainingTabs[0] : null);
        }
        
        // Refresh sessions list
        const sessionsResponse = await fetch('/api/sessions');
        const sessions = await sessionsResponse.json();
        setSessions(sessions);
      }
    } catch (error) {
      console.error('Error killing session:', error);
    }
  };

  const handleSessionChange = (direction: 'next' | 'prev') => {
    const currentIndex = openTabs.indexOf(currentSessionId || '');
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % openTabs.length
      : (currentIndex - 1 + openTabs.length) % openTabs.length;
    
    setCurrentSessionId(openTabs[newIndex]);
  };

  // Format sessions for mobile components
  const mobileSessionsData = sessions.filter(s => openTabs.includes(s.id)).map(s => ({
    id: s.id,
    name: s.title || `Session ${s.id.substring(0, 8)}`
  }));

  // Debug mobile detection and session
  console.log('Mobile detection:', { isMobile, currentSessionId, sessionsCount: sessions.length });
  
  // Mobile layout
  if (isMobile) {
    // Temporary debug mode
    if (window.location.search.includes('debug')) {
      return <TouchDebugger />;
    }
    
    // Simple touch test
    if (window.location.search.includes('touchtest')) {
      return <SimpleTouchTest />;
    }
    
    return (
      <MobileApp>
        <div className="flex flex-col h-screen bg-gray-900">
          <MobileSessionTabs
            sessions={mobileSessionsData}
            activeSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onCreateSession={handleNewSession}
            onManageSessions={() => setShowSessionManager(true)}
          />
          
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 flex flex-col">
              {currentSessionId !== null ? (
                currentSessionId ? (
                  <MobileTerminal
                    sessionId={currentSessionId}
                    onSessionChange={handleSessionChange}
                  />
                ) : (
                  <Terminal 
                    sessionId={undefined}
                    onSessionCreated={handleSessionCreated}
                  />
                )
              ) : (
                <div className="mobile-empty-state">
                  <h3>No Active Session</h3>
                  <p>Start a new terminal session to get started</p>
                  <button
                    onClick={handleNewSession}
                    className="mobile-button"
                  >
                    Create New Session
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {showSessionManager && (
            <SessionManager
              sessions={sessions}
              openTabs={openTabs}
              onOpenSession={handleOpenSession}
              onKillSession={handleKillSession}
              onClose={() => setShowSessionManager(false)}
              onRefresh={async () => {
                try {
                  const response = await fetch('/api/sessions');
                  const data = await response.json();
                  setSessions(data);
                } catch (error) {
                  console.error('Error fetching sessions:', error);
                }
              }}
            />
          )}
          
          {/* Enhanced Virtual Keyboard */}
          <EnhancedVirtualKeyboard
            isVisible={!!currentSessionId}
            onInput={(text) => {
              if (wsService && currentSessionId) {
                wsService.send({
                  type: 'input',
                  sessionId: currentSessionId,
                  data: text
                });
              }
            }}
            onCommand={(command) => {
              if (wsService && currentSessionId) {
                wsService.send({
                  type: 'input',
                  sessionId: currentSessionId,
                  data: command + '\r'
                });
              }
            }}
            onMacro={(keys) => {
              if (wsService && currentSessionId) {
                // Send each key in the macro sequence
                keys.forEach((key, index) => {
                  setTimeout(() => {
                    const data = typeof key === 'string' ? key : getSpecialKeySequence(key);
                    wsService.send({
                      type: 'input',
                      sessionId: currentSessionId,
                      data
                    });
                  }, index * 50); // Small delay between keys
                });
              }
            }}
            onHeightChange={setKeyboardHeight}
          />
        </div>
      </MobileApp>
    );
  }

  // Desktop layout (original)
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <SessionTabs
        sessions={sessions.filter(s => openTabs.includes(s.id))}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onCloseSession={handleCloseSession}
        onShowSessionManager={() => setShowSessionManager(!showSessionManager)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {currentSessionId !== null ? (
            <Terminal 
              sessionId={currentSessionId || undefined}
              onSessionCreated={handleSessionCreated}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center p-8">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2 text-gray-400">No Terminal Session</h3>
              <p className="mb-6 text-gray-600">
                Click "New" to create a terminal session or select an existing one from the tabs above.
              </p>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-all duration-200 active:scale-95"
              >
                Create New Session
              </button>
            </div>
          )}
        </div>
        {showEventMonitor && currentSessionId && !showEventDemo && (
          <div className="h-64 border-t border-gray-800 overflow-hidden bg-gray-950">
            <TerminalEventMonitor sessionId={currentSessionId} />
          </div>
        )}
        {showEventDemo && currentSessionId && (
          <div className="h-96 border-t border-gray-800 overflow-hidden bg-gray-950">
            <EventSystemDemo sessionId={currentSessionId} />
          </div>
        )}
        
        {/* Simple Event Test - Always show when there's a session */}
        {currentSessionId && (
          <div className="absolute bottom-20 right-4 w-80">
            <SimpleEventTest sessionId={currentSessionId} />
          </div>
        )}
      </div>
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 text-sm text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium">Session: {currentSessionId ? currentSessionId.substring(0, 8) : 'None'}</span>
          <button
            onClick={() => {
              setShowEventMonitor(!showEventMonitor);
              if (showEventDemo) setShowEventDemo(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              showEventMonitor
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {showEventMonitor ? 'Hide' : 'Show'} Event Monitor
          </button>
          <button
            onClick={() => {
              setShowEventDemo(!showEventDemo);
              if (showEventMonitor) setShowEventMonitor(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              showEventDemo
                ? 'bg-purple-600 text-white hover:bg-purple-500'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {showEventDemo ? 'Hide' : 'Show'} Pattern Library
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Terminal Event System Demo</span>
          <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-full font-medium">Active</span>
        </div>
      </div>
      {showSessionManager && (
        <SessionManager
          sessions={sessions}
          openTabs={openTabs}
          onOpenSession={handleOpenSession}
          onKillSession={handleKillSession}
          onClose={() => setShowSessionManager(false)}
          onRefresh={async () => {
            try {
              const response = await fetch('/api/sessions');
              const data = await response.json();
              setSessions(data);
            } catch (error) {
              console.error('Error fetching sessions:', error);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;