import React from 'react';
import type { TerminalSession } from '../../../src/shared/types';

interface SessionTabsProps {
  sessions: TerminalSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onCloseSession: (sessionId: string) => void;
  onShowSessionManager: () => void;
}

export const SessionTabs: React.FC<SessionTabsProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onCloseSession,
  onShowSessionManager,
}) => {
  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
      <div className="flex">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center group ${
              currentSessionId === session.id
                ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
            >
              {session.title || `Terminal ${session.id.slice(0, 6)}`}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.id);
              }}
              className="px-2 py-2 opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded transition-opacity"
              title="Close session"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex ml-auto">
        <button
          onClick={onShowSessionManager}
          className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="Show all sessions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={onNewSession}
          className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="New Terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};