// Debug logger that persists logs to localStorage to survive crashes
export class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
  private maxLogs = 1000;

  static getInstance() {
    if (!this.instance) {
      this.instance = new DebugLogger();
    }
    return this.instance;
  }

  constructor() {
    // Load existing logs from localStorage
    try {
      const stored = localStorage.getItem('shelltender-debug-logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load debug logs:', e);
    }

    // Override console methods to capture logs
    this.interceptConsole();
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.log('info', args.join(' '));
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.log('error', args.join(' '));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.log('warn', args.join(' '));
      originalWarn.apply(console, args);
    };
  }

  log(level: string, message: string, data?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to localStorage
    try {
      localStorage.setItem('shelltender-debug-logs', JSON.stringify(this.logs));
    } catch (e) {
      // localStorage might be full
      this.logs = this.logs.slice(-500); // Keep less logs
      try {
        localStorage.setItem('shelltender-debug-logs', JSON.stringify(this.logs));
      } catch (e2) {
        // Give up
      }
    }
  }

  getLogs() {
    return this.logs;
  }

  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('shelltender-debug-logs');
  }

  // Export logs as text
  exportLogs() {
    return this.logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${log.data ? '\n  Data: ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
  }
}

// Create global instance and expose it
export const debugLogger = DebugLogger.getInstance();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
  (window as any).getDebugLogs = () => {
    const logs = debugLogger.getRecentLogs(100);
    console.log('=== Recent Debug Logs ===');
    logs.forEach(log => {
      const style = log.level === 'error' ? 'color: red' : log.level === 'warn' ? 'color: orange' : '';
      console.log(`%c[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`, style);
      if (log.data) {
        console.log('  Data:', log.data);
      }
    });
    return logs;
  };
  
  (window as any).exportDebugLogs = () => {
    const text = debugLogger.exportLogs();
    console.log(text);
    // Copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Logs copied to clipboard!');
      });
    }
    return text;
  };
  
  (window as any).clearDebugLogs = () => {
    debugLogger.clearLogs();
    console.log('Debug logs cleared');
  };
}