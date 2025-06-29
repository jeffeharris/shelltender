// Emergency patch to prevent crashes
export const applySafetyPatches = () => {
  // Wrap WebSocket.send to catch errors
  const originalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data: any) {
    try {
      console.log('[Safety] WebSocket.send called with:', typeof data === 'string' ? data.substring(0, 100) : data);
      originalSend.call(this, data);
    } catch (error) {
      console.error('[Safety] WebSocket.send failed:', error);
      console.error('[Safety] Data that caused error:', data);
    }
  };
  
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    console.error('[Safety] Uncaught error:', event.error);
    console.error('[Safety] Error stack:', event.error?.stack);
    
    // Log to localStorage
    const errors = JSON.parse(localStorage.getItem('shelltender-errors') || '[]');
    errors.push({
      timestamp: new Date().toISOString(),
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    localStorage.setItem('shelltender-errors', JSON.stringify(errors.slice(-50)));
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Safety] Unhandled promise rejection:', event.reason);
  });
  
  console.log('[Safety] Safety patches applied');
};

// Check for previous crashes
export const checkForCrashes = () => {
  const errors = JSON.parse(localStorage.getItem('shelltender-errors') || '[]');
  if (errors.length > 0) {
    console.warn(`[Safety] Found ${errors.length} previous errors:`);
    errors.forEach((error: any) => {
      console.error(`[${error.timestamp}] ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    });
    return errors;
  }
  return [];
};

// Clear crash logs
export const clearCrashLogs = () => {
  localStorage.removeItem('shelltender-errors');
  console.log('[Safety] Crash logs cleared');
};

// Expose globally
if (typeof window !== 'undefined') {
  (window as any).shelltenderSafety = {
    checkForCrashes,
    clearCrashLogs
  };
}