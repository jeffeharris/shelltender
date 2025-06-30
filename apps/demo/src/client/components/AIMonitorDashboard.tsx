import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';

interface SessionStats {
  patternMatches: number;
  lastActivity: number;
  needsAttention: boolean;
  currentState: string;
}

interface MonitorStats {
  totalSessions: number;
  monitoredSessions: number;
  sessionsNeedingAttention: number;
  sessionStats: Record<string, SessionStats>;
}

interface AIMonitorDashboardProps {
  apiUrl?: string; // Default: http://localhost:3001
}

export const AIMonitorDashboard: React.FC<AIMonitorDashboardProps> = ({ 
  apiUrl = 'http://localhost:3001' 
}) => {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [attentionSessions, setAttentionSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch monitoring stats
        const statsRes = await fetch(`${apiUrl}/api/stats`);
        if (statsRes.ok) {
          setStats(await statsRes.json());
          setError(null);
        }

        // Fetch sessions needing attention
        const attentionRes = await fetch(`${apiUrl}/api/attention`);
        if (attentionRes.ok) {
          setAttentionSessions(await attentionRes.json());
        }
      } catch (err) {
        setError(`Failed to connect to AI Monitor Server at ${apiUrl}`);
      }
    };

    // Initial fetch
    fetchStats();

    // Poll every 2 seconds
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'thinking':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'waiting-for-input':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'thinking':
        return 'text-blue-500';
      case 'waiting-for-input':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'completed':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <p className="text-sm text-red-600 mt-1">
          Make sure the AI Monitor Server is running at {apiUrl}
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Loading AI monitor stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold">{stats.totalSessions}</div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.monitoredSessions}</div>
          <div className="text-sm text-gray-600">AI Sessions</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">{stats.sessionsNeedingAttention}</div>
          <div className="text-sm text-gray-600">Need Attention</div>
        </div>
      </div>

      {/* Attention Needed */}
      {attentionSessions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Sessions Needing Attention
          </h3>
          <div className="space-y-2">
            {attentionSessions.map((session) => (
              <div key={session.sessionId} className="flex items-center justify-between bg-white p-2 rounded">
                <div>
                  <span className="font-mono text-sm">{session.sessionId}</span>
                  <span className={`ml-2 text-sm ${getStateColor(session.state)}`}>
                    ({session.state})
                  </span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(new Date(session.lastActivity).getTime())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sessions */}
      <div className="bg-white border rounded-lg">
        <h3 className="font-semibold p-4 border-b">Monitored AI Sessions</h3>
        <div className="divide-y">
          {Object.entries(stats.sessionStats).map(([sessionId, sessionStat]) => (
            <div key={sessionId} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStateIcon(sessionStat.currentState)}
                  <div>
                    <div className="font-mono text-sm">{sessionId}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      State: <span className={getStateColor(sessionStat.currentState)}>
                        {sessionStat.currentState}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {sessionStat.patternMatches} pattern matches
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatTime(sessionStat.lastActivity)}
                  </div>
                  {sessionStat.needsAttention && (
                    <div className="mt-1">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Needs Attention
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {Object.keys(stats.sessionStats).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No AI sessions detected yet. Run Claude or another AI tool in a terminal.
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-blue-800 mb-1">How it works:</h4>
        <ul className="list-disc list-inside text-blue-700 space-y-1">
          <li>AI Monitor automatically detects when Claude, Aider, or other AI tools are running</li>
          <li>It watches for patterns like thinking animations, input prompts, and errors</li>
          <li>Sessions needing attention are highlighted in yellow</li>
          <li>Pattern matches are counted and displayed for each session</li>
        </ul>
      </div>
    </div>
  );
};