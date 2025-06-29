import { SessionManager } from '../SessionManager.js';
import { BufferManager } from '../BufferManager.js';
import { EventManager } from '../events/EventManager.js';
import { TerminalDataPipeline } from '../TerminalDataPipeline.js';
import { WebSocketServer } from '../WebSocketServer.js';
import { SessionStore } from '../SessionStore.js';
import { ProcessedDataEvent } from '@shelltender/core';

export class PipelineIntegration {
  private unsubscribers: Array<() => void> = [];
  private sessionBufferMap = new Map<string, NodeJS.Timeout>();

  constructor(
    private pipeline: TerminalDataPipeline,
    private sessionManager: SessionManager,
    private bufferManager: BufferManager,
    private wsServer: WebSocketServer,
    private sessionStore: SessionStore,
    private eventManager?: EventManager
  ) {}

  setup(): void {
    // Connect SessionManager to Pipeline
    const unsubscribeData = this.sessionManager.onData((sessionId, data, metadata) => {
      this.pipeline.processData(sessionId, data, metadata);
    });
    this.unsubscribers.push(unsubscribeData);

    // Connect Pipeline to BufferManager
    const unsubscribeBuffer = this.pipeline.onData((event: ProcessedDataEvent) => {
      this.bufferManager.addToBuffer(event.sessionId, event.processedData);
      
      // Debounce saves to disk to avoid excessive writes
      this.debounceSave(event.sessionId);
    });
    this.unsubscribers.push(unsubscribeBuffer);

    // Connect Pipeline to WebSocketServer
    const unsubscribeWs = this.pipeline.onData((event: ProcessedDataEvent) => {
      this.wsServer.broadcastToSession(event.sessionId, {
        type: 'output',
        sessionId: event.sessionId,
        data: event.processedData,
      });
    });
    this.unsubscribers.push(unsubscribeWs);

    // Connect Pipeline to EventManager if available
    if (this.eventManager) {
      const unsubscribeEvent = this.pipeline.onData((event: ProcessedDataEvent) => {
        const buffer = this.bufferManager.getBuffer(event.sessionId);
        this.eventManager!.processData(event.sessionId, event.processedData, buffer);
      });
      this.unsubscribers.push(unsubscribeEvent);
    }

    // Handle session end events
    const unsubscribeSessionEnd = this.sessionManager.onSessionEnd((sessionId) => {
      // Clear any pending save timer
      const timer = this.sessionBufferMap.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        // Do a final save before deletion
        this.sessionStore.updateSessionBuffer(sessionId, this.bufferManager.getBuffer(sessionId));
        this.sessionBufferMap.delete(sessionId);
      }
      
      // Clear the buffer
      this.bufferManager.clearBuffer(sessionId);
    });
    this.unsubscribers.push(unsubscribeSessionEnd);

    // Set up audit logging if enabled
    if (this.pipeline.options.enableAudit) {
      this.pipeline.on('data:raw', this.auditLog.bind(this));
    }

    // Set up metrics collection if enabled
    if (this.pipeline.options.enableMetrics) {
      this.setupMetrics();
    }

    // Log pipeline configuration
    console.log('Pipeline integration setup complete');
    console.log('- Processors:', this.pipeline.getProcessorNames());
    console.log('- Filters:', this.pipeline.getFilterNames());
    console.log('- Audit logging:', this.pipeline.options.enableAudit ? 'enabled' : 'disabled');
    console.log('- Metrics:', this.pipeline.options.enableMetrics ? 'enabled' : 'disabled');
  }

  private debounceSave(sessionId: string): void {
    // Clear existing timer if any
    const existingTimer = this.sessionBufferMap.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const buffer = this.bufferManager.getBuffer(sessionId);
      this.sessionStore.updateSessionBuffer(sessionId, buffer);
      this.sessionBufferMap.delete(sessionId);
    }, 1000); // Save after 1 second of inactivity

    this.sessionBufferMap.set(sessionId, timer);
  }

  private auditLog(event: { sessionId: string; data: string; timestamp: number }): void {
    // In a real implementation, this would write to a secure audit log
    const logEntry = {
      timestamp: new Date(event.timestamp).toISOString(),
      sessionId: event.sessionId,
      dataSize: event.data.length,
      preview: event.data.substring(0, 50).replace(/\n/g, '\\n'),
    };
    
    console.log('[AUDIT]', JSON.stringify(logEntry));
  }

  private setupMetrics(): void {
    let totalBytes = 0;
    let messageCount = 0;
    const sessionBytes = new Map<string, number>();

    // Track processed data
    this.pipeline.on('data:processed', (event: ProcessedDataEvent) => {
      totalBytes += event.processedData.length;
      messageCount++;
      
      const current = sessionBytes.get(event.sessionId) || 0;
      sessionBytes.set(event.sessionId, current + event.processedData.length);
    });

    // Track transformations
    this.pipeline.on('data:transformed', (event: ProcessedDataEvent) => {
      console.log(`[METRICS] Data transformed in session ${event.sessionId}:`, event.transformations);
    });

    // Track blocked data
    this.pipeline.on('data:blocked', (event: any) => {
      console.log(`[METRICS] Data blocked by filter '${event.filter}' in session ${event.sessionId}`);
    });

    // Log metrics periodically
    setInterval(() => {
      console.log('[METRICS] Pipeline statistics:');
      console.log(`  Total bytes processed: ${totalBytes}`);
      console.log(`  Total messages: ${messageCount}`);
      console.log(`  Active sessions: ${sessionBytes.size}`);
      console.log(`  Average message size: ${messageCount > 0 ? Math.round(totalBytes / messageCount) : 0} bytes`);
    }, 60000); // Every minute
  }

  teardown(): void {
    // Unsubscribe all listeners
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];

    // Clear any pending save timers
    for (const timer of this.sessionBufferMap.values()) {
      clearTimeout(timer);
    }
    this.sessionBufferMap.clear();

    // Remove audit and metrics listeners
    this.pipeline.removeAllListeners('data:raw');
    this.pipeline.removeAllListeners('data:processed');
    this.pipeline.removeAllListeners('data:transformed');
    this.pipeline.removeAllListeners('data:blocked');
  }
}