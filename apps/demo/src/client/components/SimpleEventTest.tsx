import { useEffect, useState } from 'react';
import { useTerminalEvents } from '@shelltender/client';

interface Props {
  sessionId: string;
}

export function SimpleEventTest({ sessionId }: Props) {
  const { events, registerPattern, isConnected } = useTerminalEvents(sessionId);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (isConnected && !isRegistered) {
      // Register a simple pattern that matches "test"
      registerPattern({
        name: 'simple-test',
        type: 'string',
        pattern: 'test',
        options: { debounce: 0 }
      }).then(() => {
        console.log('Pattern registered successfully!');
        setIsRegistered(true);
      }).catch(err => {
        console.error('Failed to register pattern:', err);
      });
    }
  }, [isConnected, isRegistered, registerPattern]);

  return (
    <div className="p-4 bg-gray-800 text-white rounded">
      <h3 className="text-lg font-bold mb-2">Event System Test</h3>
      <div className="mb-2">
        <span className="text-sm">Connection: </span>
        <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-sm">Pattern registered: </span>
        <span className={isRegistered ? 'text-green-400' : 'text-yellow-400'}>
          {isRegistered ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <p className="text-sm mb-2">Type "test" in the terminal to trigger an event:</p>
        <div className="bg-gray-900 p-2 rounded">
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No events yet...</p>
          ) : (
            events.map((event, idx) => (
              <div key={idx} className="text-sm font-mono">
                {new Date(event.timestamp).toLocaleTimeString()} - Event detected!
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}