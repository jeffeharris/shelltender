import React, { useEffect } from 'react';
import { ShelltenderApp, Terminal, SessionTabs, useShelltender } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';

function TerminalDemo() {
  const { 
    sessions, 
    activeSession, 
    createSession, 
    killSession, 
    switchSession,
    isConnected 
  } = useShelltender();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <div style={{ padding: '1rem', background: '#1a1a1a', color: '#fff' }}>
        <h1>Shelltender v0.6.0 Demo - Using @shelltender/client</h1>
        <p>Connected: {isConnected ? '✅' : '❌'} | Sessions: {sessions.length}</p>
      </div>
      
      <SessionTabs
        sessions={sessions}
        currentSessionId={activeSession}
        onSelectSession={switchSession}
        onNewSession={() => createSession()}
        onCloseSession={killSession}
        onShowSessionManager={() => {}}
      />
      
      <div style={{ flex: 1, position: 'relative' }}>
        {activeSession ? (
          <Terminal
            sessionId={activeSession}
            style={{ height: '100%' }}
          />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <p>Click "New" to create a session</p>
            <button 
              onClick={() => createSession()}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Create First Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Use environment variable if available, otherwise use relative URL
  const wsUrl = import.meta.env.VITE_WS_URL || "/ws";
  
  return (
    <ShelltenderApp wsUrl={wsUrl}>
      <TerminalDemo />
    </ShelltenderApp>
  );
}