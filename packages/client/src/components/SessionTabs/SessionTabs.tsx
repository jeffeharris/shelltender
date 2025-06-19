import React from 'react';
import type { TerminalSession } from '@shelltender/core';

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
    <div className="bg-gray-900 border-b border-gray-700 flex items-center px-4 h-12">
      <div className="flex gap-2 flex-1 items-center">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center px-4 h-9 rounded-lg cursor-pointer transition-colors text-sm whitespace-nowrap relative group ${
              currentSessionId === session.id 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <button
              onClick={() => onSelectSession(session.id)}
              className="bg-transparent border-none text-inherit text-sm cursor-pointer pr-2 font-medium"
            >
              {session.title || `Terminal ${session.id.slice(0, 6)}`}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.id);
              }}
              className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-600 text-gray-400 hover:text-gray-200 w-5 h-5 flex items-center justify-center"
              title="Close session"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onNewSession}
        className="ml-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 hover:bg-blue-700"
        title="New Terminal"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>New</span>
      </button>
      <button
        onClick={onShowSessionManager}
        className="ml-auto mr-2 px-4 py-1.5 text-gray-300 border border-gray-700 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 hover:bg-gray-800 hover:text-white hover:border-gray-600"
        title="Toggle session manager"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>Sessions</span>
      </button>
    </div>
  );
};