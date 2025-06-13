import React from 'react';
import type { TerminalSession } from '../../../src/shared/types';

interface SessionManagerProps {
  sessions: TerminalSession[];
  openTabs: string[];
  onOpenSession: (sessionId: string) => void;
  onKillSession: (sessionId: string) => void;
  onClose: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  openTabs,
  onOpenSession,
  onKillSession,
  onClose,
}) => {
  const backgroundedSessions = sessions.filter(
    session => !openTabs.includes(session.id)
  );

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Session Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Open Sessions</h3>
            {sessions.filter(s => openTabs.includes(s.id)).map(session => (
              <div
                key={session.id}
                className="bg-gray-700 p-3 rounded mb-2 flex justify-between items-center"
              >
                <div className="text-gray-300">
                  <div className="font-medium">
                    {session.title || `Terminal ${session.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {formatDate(session.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to kill this session? This cannot be undone.')) {
                      onKillSession(session.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 p-2"
                  title="Kill session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Backgrounded Sessions</h3>
            {backgroundedSessions.length === 0 ? (
              <p className="text-gray-500 text-sm">No backgrounded sessions</p>
            ) : (
              backgroundedSessions.map(session => (
                <div
                  key={session.id}
                  className="bg-gray-700 p-3 rounded mb-2 flex justify-between items-center group"
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      onOpenSession(session.id);
                      onClose();
                    }}
                  >
                    <div className="font-medium text-gray-300">
                      {session.title || `Terminal ${session.id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(session.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last accessed: {formatDate(session.lastAccessedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to kill this session? This cannot be undone.')) {
                        onKillSession(session.id);
                      }
                    }}
                    className="text-red-400 hover:text-red-300 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Kill session"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};