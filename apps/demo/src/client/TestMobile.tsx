import { useMobileDetection } from '@shelltender/client';

export function TestMobile() {
  const detection = useMobileDetection();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Mobile Detection Test</h1>
      <pre>{JSON.stringify(detection, null, 2)}</pre>
      <p>User Agent: {navigator.userAgent}</p>
    </div>
  );
}