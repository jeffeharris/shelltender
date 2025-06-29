import { TerminalDataPipeline, CommonProcessors } from '../TerminalDataPipeline.js';
import { BufferManager } from '../BufferManager.js';
import { EventManager } from '../events/EventManager.js';

/**
 * Example showing how different components subscribe to the pipeline
 */
export function setupTerminalPipeline() {
  const pipeline = new TerminalDataPipeline();
  const bufferManager = new BufferManager();
  const eventManager = new EventManager();

  // ===== PROCESSORS (Transform Data) =====
  
  // Priority 10: Security - runs first
  pipeline.addProcessor('security', CommonProcessors.securityFilter([
    /password:\s*["']?([^"'\s]+)["']?/gi,
    /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g,  // JWT tokens
    /ssh-rsa\s+[A-Za-z0-9+\/=]+/g,       // SSH keys
  ]), 10);

  // Priority 20: Compliance - remove credit cards
  pipeline.addProcessor('pci-compliance', (event: any) => {
    const ccRegex = /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g;
    const data = event.data.replace(ccRegex, '[CREDIT-CARD]');
    return { ...event, data };
  }, 20);

  // Priority 30: Rate limiting
  pipeline.addProcessor('rate-limit', CommonProcessors.rateLimiter(1024 * 1024), 30);

  // Priority 90: Logging - runs near end
  pipeline.addProcessor('logger', (event: any) => {
    console.log(`[LOG] Session ${event.sessionId}: ${event.data.length} bytes`);
    return event; // Don't modify, just log
  }, 90);

  // ===== FILTERS (Block Data) =====
  
  // Block sessions that shouldn't be recorded
  const recordableSessions = new Set<string>();
  pipeline.addFilter('recordable', (event: any) => {
    return recordableSessions.has(event.sessionId);
  });

  // Block binary data
  pipeline.addFilter('no-binary', (event: any) => {
    const hasBinary = /[\x00-\x08\x0E-\x1F\x7F-\x9F]/.test(event.data);
    return !hasBinary;
  });

  // ===== SUBSCRIBERS (Consume Processed Data) =====

  // 1. Buffer Manager - stores cleaned data
  const bufferUnsubscribe = pipeline.onData((event) => {
    console.log(`[BUFFER] Storing ${event.processedData.length} bytes for session ${event.sessionId}`);
    bufferManager.addToBuffer(event.sessionId, event.processedData);
  });

  // 2. Event Manager - pattern matching on cleaned data
  const eventUnsubscribe = pipeline.onData((event) => {
    const buffer = bufferManager.getBuffer(event.sessionId);
    eventManager.processData(event.sessionId, event.processedData, buffer);
  });

  // 3. Analytics - track command usage (on raw data)
  const commandTracker = new Map<string, number>();
  pipeline.on('data:raw', ({ data }) => {
    // Simple command detection
    const commandMatch = data.match(/^\$\s*(\w+)/);
    if (commandMatch) {
      const command = commandMatch[1];
      commandTracker.set(command, (commandTracker.get(command) || 0) + 1);
    }
  });

  // 4. Security Monitor - alert on suspicious activity
  pipeline.on('data:transformed', (event) => {
    if (event.transformations.includes('security')) {
      console.warn(`🚨 [SECURITY] Sensitive data detected and redacted in session ${event.sessionId}`);
      // In production: Send to SIEM, trigger alerts, etc.
    }
  });

  // 5. Audit Trail - log everything for compliance
  pipeline.on('data:raw', ({ sessionId, data }) => {
    // In production: Write to immutable audit log
    console.log(`[AUDIT] Session ${sessionId} raw data: ${data.substring(0, 50)}...`);
  });

  // 6. Session-specific monitoring
  const monitorSession = (sessionId: string) => {
    const unsubscribe = pipeline.onSessionData(sessionId, (event) => {
      console.log(`[MONITOR] Session ${sessionId} activity:`, {
        originalLength: event.originalData.length,
        processedLength: event.processedData.length,
        transformations: event.transformations,
      });
    });
    
    // Stop monitoring after 5 minutes
    setTimeout(unsubscribe, 5 * 60 * 1000);
  };

  // ===== ERROR HANDLING =====
  
  pipeline.on('error', ({ phase, name, error }) => {
    console.error(`[ERROR] Pipeline error in ${phase} "${name}":`, error);
  });

  pipeline.on('data:filtered', ({ filterName, sessionId }) => {
    console.log(`[FILTERED] Data blocked by filter "${filterName}" for session ${sessionId}`);
  });

  pipeline.on('data:dropped', ({ processorName, sessionId }) => {
    console.log(`[DROPPED] Data dropped by processor "${processorName}" for session ${sessionId}`);
  });

  // ===== CLEANUP =====
  
  // Return cleanup function
  return {
    pipeline,
    cleanup: () => {
      bufferUnsubscribe();
      eventUnsubscribe();
      pipeline.removeAllListeners();
    },
    
    // Control functions
    enableSessionRecording: (sessionId: string) => {
      recordableSessions.add(sessionId);
    },
    
    disableSessionRecording: (sessionId: string) => {
      recordableSessions.delete(sessionId);
    },
    
    getCommandStats: () => {
      return new Map(commandTracker);
    },
    
    monitorSession,
  };
}

// ===== USAGE EXAMPLE =====

// In your server setup:
const terminalSystem = setupTerminalPipeline();

// Enable recording for a specific session
terminalSystem.enableSessionRecording('session-123');

// Monitor a high-privilege session
terminalSystem.monitorSession('admin-session-456');

// Get command statistics
setInterval(() => {
  const stats = terminalSystem.getCommandStats();
  console.log('Command usage:', Object.fromEntries(stats));
}, 60000);

// Cleanup on shutdown
process.on('SIGTERM', () => {
  terminalSystem.cleanup();
});