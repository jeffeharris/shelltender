import React from 'react';
import type { TerminalSession } from '@shelltender/core';

interface SessionManagerProps {
  sessions: TerminalSession[];
  openTabs: string[];
  onOpenSession: (sessionId: string) => void;
  onKillSession: (sessionId: string) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  openTabs,
  onOpenSession,
  onKillSession,
  onClose,
  onRefresh,
}) => {
  const backgroundedSessions = sessions.filter(
    session => !openTabs.includes(session.id)
  );

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Session Manager</h2>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh sessions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Open Sessions</h3>
                <span className="text-xs text-gray-500">{sessions.filter(s => openTabs.includes(s.id)).length} active</span>
              </div>
              <div className="grid gap-3">
                {sessions.filter(s => openTabs.includes(s.id)).length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No open sessions</p>
                ) : (
                  sessions.filter(s => openTabs.includes(s.id)).map(session => (
                    <div
                      key={session.id}
                      className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white mb-1">
                          {session.title || `Terminal ${session.id.slice(0, 8)}`}
                        </h4>
                        <p className="text-xs text-gray-400">
                          Created {formatDate(session.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to kill this session? This cannot be undone.')) {
                            onKillSession(session.id);
                          }
                        }}
                        className="ml-4 px-3 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100"
                        title="Kill session"
                      >
                        Kill
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Backgrounded Sessions</h3>
                <span className="text-xs text-gray-500">{backgroundedSessions.length} inactive</span>
              </div>
              <div className="grid gap-3">
                {backgroundedSessions.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No backgrounded sessions</p>
                ) : (
                  backgroundedSessions.map(session => (
                    <div
                      key={session.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-800 hover:border-gray-600 transition-all group"
                      onClick={() => {
                        onOpenSession(session.id);
                        onClose();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white mb-1">
                            {session.title || `Terminal ${session.id.slice(0, 8)}`}
                          </h4>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-gray-400">
                              Created {formatDate(session.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Last used {formatDate(session.lastAccessedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSession(session.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition-all"
                            title="Open session"
                          >
                            Open
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to kill this session? This cannot be undone.')) {
                                onKillSession(session.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-700 text-gray-400 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100"
                            title="Kill session"
                          >
                            Kill
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};