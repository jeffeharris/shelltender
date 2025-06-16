import React, { useRef, useState } from 'react';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useMobile } from '../../context/MobileContext';

interface Session {
  id: string;
  name: string;
}

interface MobileSessionTabsProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onManageSessions: () => void;
}

export function MobileSessionTabs({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onManageSessions,
}: MobileSessionTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [showMenu, setShowMenu] = useState(false);

  // Handle swipe down to show menu
  useTouchGestures(containerRef, {
    onSwipeDown: () => setShowMenu(true),
    onSwipeUp: () => setShowMenu(false),
    swipeThreshold: 30,
  });

  return (
    <div 
      ref={containerRef}
      className={`mobile-session-tabs bg-gray-800 border-b border-gray-700 transition-all duration-300 ${
        showMenu ? 'h-32' : 'h-12'
      }`}
    >
      {/* Compact tab bar */}
      <div className="flex items-center h-12 px-2">
        {/* Session indicator dots */}
        <div className="flex items-center gap-1 mr-3">
          {sessions.map((session, index) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                session.id === activeSessionId
                  ? 'bg-blue-500 w-3 h-3'
                  : 'bg-gray-500 hover:bg-gray-400'
              }`}
              aria-label={`Session ${index + 1}`}
            />
          ))}
        </div>

        {/* Current session name */}
        <div className="flex-1 text-white text-sm truncate">
          {sessions.find(s => s.id === activeSessionId)?.name || 'No session'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSession}
            className="text-gray-400 hover:text-white p-2 mobile-touch-target"
            aria-label="New session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-white p-2 mobile-touch-target"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={showMenu ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded menu */}
      {showMenu && (
        <div className="px-4 py-2 overflow-x-auto mobile-hide-scrollbar">
          <div className="flex gap-2">
            {sessions.map((session, index) => (
              <button
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  setShowMenu(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors mobile-touch-target ${
                  session.id === activeSessionId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {session.name}
              </button>
            ))}
            
            <button
              onClick={onManageSessions}
              className="px-4 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg text-sm whitespace-nowrap mobile-touch-target"
            >
              Manage All
            </button>
          </div>
        </div>
      )}

      {/* Swipe hint */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gray-600 opacity-50 rounded-full mx-auto w-12 mt-1" />
    </div>
  );
}

// Alternative bottom navigation style for portrait mode
export function MobileBottomTabs({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onManageSessions,
}: MobileSessionTabsProps) {
  const maxVisibleTabs = 4;
  const activeIndex = sessions.findIndex(s => s.id === activeSessionId);
  
  // Show tabs around the active one
  const startIndex = Math.max(0, Math.min(activeIndex - 1, sessions.length - maxVisibleTabs));
  const visibleSessions = sessions.slice(startIndex, startIndex + maxVisibleTabs);

  return (
    <div className="mobile-bottom-tabs fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 mobile-safe-padding">
      <div className="flex items-center justify-around h-16">
        {visibleSessions.map((session, index) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`flex-1 h-full flex flex-col items-center justify-center mobile-touch-target ${
              session.id === activeSessionId ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <div className={`w-8 h-1 rounded-full mb-1 ${
              session.id === activeSessionId ? 'bg-blue-500' : 'bg-transparent'
            }`} />
            <span className="text-xs truncate max-w-20">{session.name}</span>
          </button>
        ))}
        
        {sessions.length < maxVisibleTabs && (
          <button
            onClick={onCreateSession}
            className="flex-1 h-full flex flex-col items-center justify-center text-gray-400 mobile-touch-target"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">New</span>
          </button>
        )}
        
        <button
          onClick={onManageSessions}
          className="flex-1 h-full flex flex-col items-center justify-center text-gray-400 mobile-touch-target"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span className="text-xs">All</span>
        </button>
      </div>
    </div>
  );
}