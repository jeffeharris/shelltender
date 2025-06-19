import React, { useState } from 'react';

export function SimpleTouchTest() {
  const [events, setEvents] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const addEvent = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [...prev.slice(-9), `${timestamp}: ${msg}`]);
    console.log('SimpleTouchTest event:', msg);
  };
  
  // Log when component mounts
  React.useEffect(() => {
    console.log('SimpleTouchTest component mounted');
    addEvent('Component mounted');
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    addEvent(`Touch start at ${Math.round(touch.clientX)}, ${Math.round(touch.clientY)}`);
    
    // Set a timeout for long press
    const timer = setTimeout(() => {
      addEvent('Long press detected!');
      setMenuPos({ x: touch.clientX, y: touch.clientY });
      setMenuVisible(true);
    }, 500);
    
    // Store timer on the element
    (e.target as any)._timer = timer;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    addEvent('Touch end');
    
    // Clear the timer
    const timer = (e.target as any)._timer;
    if (timer) {
      clearTimeout(timer);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press on move
    const timer = (e.target as any)._timer;
    if (timer) {
      clearTimeout(timer);
      (e.target as any)._timer = null;
    }
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-xl font-bold mb-4">Simple Touch Test</h1>
      
      <div 
        className="bg-blue-500 text-white p-8 rounded-lg relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={() => setMenuVisible(false)}
      >
        <p className="text-center">Touch and hold here</p>
        
        {menuVisible && (
          <div 
            className="absolute bg-white text-black p-4 rounded shadow-lg"
            style={{ 
              left: menuPos.x + 'px', 
              top: menuPos.y + 'px',
              transform: 'translate(-50%, -50%)'
            }}
          >
            Menu at {Math.round(menuPos.x)}, {Math.round(menuPos.y)}
          </div>
        )}
      </div>

      <div className="mt-4 bg-white p-4 rounded">
        <h2 className="font-bold mb-2">Events:</h2>
        {events.map((evt, i) => (
          <div key={i} className="text-sm text-gray-600">{evt}</div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</p>
        <p>Touch support: {('ontouchstart' in window) ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}