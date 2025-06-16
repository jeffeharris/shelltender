import { useState, useEffect } from 'react';
import { Terminal, SessionTabs, SessionManager, TerminalEventMonitor } from '@shelltender/client';
import type { TerminalSession } from '@shelltender/core';
import { EventSystemDemo } from './components/EventSystemDemo';

function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showEventMonitor, setShowEventMonitor] = useState(false);
  const [showEventDemo, setShowEventDemo] = useState(false);

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
    setCurrentSessionId(sessionId);
    if (!openTabs.includes(sessionId)) {
      setOpenTabs(prev => [...prev, sessionId]);
    }
  };

  const handleNewSession = () => {
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

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <SessionTabs
        sessions={sessions.filter(s => openTabs.includes(s.id))}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onCloseSession={handleCloseSession}
        onShowSessionManager={() => setShowSessionManager(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Terminal 
            sessionId={currentSessionId || undefined}
            onSessionCreated={handleSessionCreated}
          />
        </div>
        {showEventMonitor && currentSessionId && !showEventDemo && (
          <div className="h-64 border-t border-gray-700 overflow-hidden">
            <TerminalEventMonitor sessionId={currentSessionId} />
          </div>
        )}
        {showEventDemo && currentSessionId && (
          <div className="h-96 border-t border-gray-700 overflow-hidden">
            <EventSystemDemo sessionId={currentSessionId} />
          </div>
        )}
      </div>
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-sm text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Session: {currentSessionId ? currentSessionId.substring(0, 8) : 'None'}</span>
          <button
            onClick={() => {
              setShowEventMonitor(!showEventMonitor);
              if (showEventDemo) setShowEventDemo(false);
            }}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              showEventMonitor
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showEventMonitor ? 'Hide' : 'Show'} Event Monitor
          </button>
          <button
            onClick={() => {
              setShowEventDemo(!showEventDemo);
              if (showEventMonitor) setShowEventMonitor(false);
            }}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              showEventDemo
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showEventDemo ? 'Hide' : 'Show'} Pattern Library
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">Terminal Event System Demo</span>
          <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded">Active</span>
        </div>
      </div>
      {showSessionManager && (
        <SessionManager
          sessions={sessions}
          openTabs={openTabs}
          onOpenSession={handleOpenSession}
          onKillSession={handleKillSession}
          onClose={() => setShowSessionManager(false)}
        />
      )}
    </div>
  );
}

export default App;