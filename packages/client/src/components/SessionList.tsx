import React, { useEffect, useState } from 'react';
import type { TerminalSession } from '@shelltender/core';

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string | null;
}

export const SessionList: React.FC<SessionListProps> = ({ onSelectSession, currentSessionId }) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-gray-900 text-white p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Terminal Sessions</h2>
      
      <button
        onClick={() => onSelectSession('')}
        className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        New Terminal
      </button>

      {loading ? (
        <div className="text-gray-400">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-gray-400">No active sessions</div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`p-3 rounded cursor-pointer transition-colors ${
                currentSessionId === session.id
                  ? 'bg-blue-600'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold">
                {session.title || `Session ${session.id.slice(0, 8)}`}
              </div>
              <div className="text-sm text-gray-400">
                Created: {formatDate(session.createdAt)}
              </div>
              <div className="text-sm text-gray-400">
                Size: {session.cols}x{session.rows}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};