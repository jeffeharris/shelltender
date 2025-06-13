import { useState, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { SessionTabs } from './components/SessionTabs';
import { SessionManager } from './components/SessionManager';
import type { TerminalSession } from '../../src/shared/types';

function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);

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
      <div className="flex-1 overflow-hidden">
        <Terminal 
          sessionId={currentSessionId || undefined}
          onSessionCreated={handleSessionCreated}
        />
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