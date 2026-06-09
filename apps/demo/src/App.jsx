import React, { useState } from 'react';
import { ShelltenderApp, Terminal, useShelltender } from '@shelltender/client';
import '@xterm/xterm/css/xterm.css';

// Styles
const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f0f',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '0.75rem 1.5rem',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#fff',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.125rem',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.875rem',
  },
  statusDot: (connected) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: connected ? '#10b981' : '#ef4444',
    boxShadow: connected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
  }),
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    background: '#141414',
    borderRight: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '1rem',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
  },
  newButton: {
    padding: '0.375rem 0.75rem',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  sessionList: {
    flex: 1,
    overflow: 'auto',
    padding: '0.5rem',
  },
  sessionItem: (isActive) => ({
    padding: '0.75rem',
    marginBottom: '0.25rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: isActive ? '#2a2a2a' : 'transparent',
    border: isActive ? '1px solid #3a3a3a' : '1px solid transparent',
    transition: 'all 0.15s',
  }),
  sessionName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#fff',
  },
  sessionId: {
    fontSize: '0.7rem',
    color: '#666',
    fontFamily: 'monospace',
  },
  closeButton: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    color: '#666',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.15s',
  },
  terminalContainer: {
    flex: 1,
    position: 'relative',
    background: '#000',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1.5rem',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '4rem',
    opacity: 0.3,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    color: '#888',
    marginBottom: '0.5rem',
  },
  emptySubtitle: {
    fontSize: '0.875rem',
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.15s',
  },
  featureList: {
    padding: '1rem',
    borderTop: '1px solid #2a2a2a',
    fontSize: '0.75rem',
    color: '#666',
  },
  featureTitle: {
    fontWeight: 600,
    color: '#888',
    marginBottom: '0.5rem',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  featureCheck: {
    color: '#10b981',
  },
};

function TerminalDemo() {
  const {
    sessions: hookSessions,
    activeSession,
    createSession,
    switchSession,
    isConnected
  } = useShelltender();

  const [sessions, setSessions] = useState([]);
  const [hoveredSession, setHoveredSession] = useState(null);

  // Fetch sessions from API
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  // Fetch on mount and when hook sessions change
  React.useEffect(() => {
    fetchSessions();
  }, [hookSessions.length]);

  // Kill session via REST API
  const handleKillSession = async (sessionId) => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to kill session');
      // Refresh session list
      await fetchSessions();
      // Switch to another session if we killed the active one
      if (activeSession === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        if (remaining.length > 0) {
          switchSession(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to kill session:', err);
    }
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🍹</span>
          <div>
            <h1 style={styles.title}>Shelltender</h1>
            <div style={styles.subtitle}>Persistent Web Terminal Sessions</div>
          </div>
        </div>
        <div style={styles.status}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={styles.statusDot(isConnected)} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <span style={{ color: '#666' }}>|</span>
          <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>Sessions</span>
            <button
              style={styles.newButton}
              onClick={() => createSession()}
              onMouseOver={(e) => e.target.style.background = '#059669'}
              onMouseOut={(e) => e.target.style.background = '#10b981'}
            >
              + New
            </button>
          </div>

          <div style={styles.sessionList}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={styles.sessionItem(session.id === activeSession)}
                onClick={() => switchSession(session.id)}
                onMouseEnter={() => setHoveredSession(session.id)}
                onMouseLeave={() => setHoveredSession(null)}
              >
                <div>
                  <div style={styles.sessionName}>
                    Terminal {sessions.indexOf(session) + 1}
                  </div>
                  <div style={styles.sessionId}>
                    {session.id.slice(0, 8)}...
                  </div>
                </div>
                <button
                  style={{
                    ...styles.closeButton,
                    opacity: (hoveredSession === session.id || session.id === activeSession) ? 1 : 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleKillSession(session.id);
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#ef4444';
                    e.target.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#666';
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={styles.featureList}>
            <div style={styles.featureTitle}>Features</div>
            <div style={styles.feature}>
              <span style={styles.featureCheck}>✓</span>
              <span>Persistent sessions</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureCheck}>✓</span>
              <span>Auto-reconnect</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureCheck}>✓</span>
              <span>Scrollback history</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureCheck}>✓</span>
              <span>Multi-session support</span>
            </div>
          </div>
        </aside>

        {/* Terminal area */}
        <div style={styles.terminalContainer}>
          {activeSession ? (
            <Terminal
              sessionId={activeSession}
              style={{ height: '100%' }}
            />
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⌨️</div>
              <div style={styles.emptyText}>
                <div style={styles.emptyTitle}>No Active Session</div>
                <div style={styles.emptySubtitle}>
                  Create a terminal session to get started
                </div>
              </div>
              <button
                style={styles.createButton}
                onClick={() => createSession()}
                onMouseOver={(e) => e.target.style.background = '#059669'}
                onMouseOut={(e) => e.target.style.background = '#10b981'}
              >
                <span>+</span>
                Create Terminal
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const wsUrl = import.meta.env.VITE_WS_URL || "/ws";

  return (
    <ShelltenderApp wsUrl={wsUrl}>
      <TerminalDemo />
    </ShelltenderApp>
  );
}
