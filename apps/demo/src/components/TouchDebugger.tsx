import React, { useState, useRef } from 'react';
import { useTouchGestures } from '@shelltender/client';

export function TouchDebugger() {
  const ref = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const addEvent = (event: string) => {
    setEvents(prev => [...prev.slice(-9), event]);
  };

  useTouchGestures(ref as React.RefObject<HTMLElement>, {
    onLongPress: (x, y) => {
      addEvent(`Long press at ${x}, ${y}`);
      setMenuPos({ x, y });
      setShowMenu(true);
    },
    onSwipeLeft: () => addEvent('Swipe left'),
    onSwipeRight: () => addEvent('Swipe right'),
    onTwoFingerTap: (x, y) => addEvent(`Two finger tap at ${x}, ${y}`),
    onThreeFingerTap: (x, y) => addEvent(`Three finger tap at ${x}, ${y}`),
  });

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Touch Gesture Debugger</h2>
      
      <div 
        ref={ref}
        className="bg-gray-800 p-8 rounded-lg h-64 relative overflow-hidden"
        onClick={() => setShowMenu(false)}
      >
        <p className="text-white text-center">Touch here to test gestures</p>
        
        {showMenu && (
          <div
            className="absolute bg-blue-600 text-white p-2 rounded"
            style={{
              left: `${menuPos.x}px`,
              top: `${menuPos.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            Menu at {menuPos.x}, {menuPos.y}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-bold mb-2">Events:</h3>
        <div className="bg-gray-100 p-2 rounded h-48 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500">No events yet...</p>
          ) : (
            events.map((event, i) => (
              <div key={i} className="text-sm">{event}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}