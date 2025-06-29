import { EventEmitter } from 'events';
import { 
  TerminalDataEvent, 
  ProcessedDataEvent, 
  DataProcessor, 
  DataFilter,
  PipelineOptions,
  IPipelineSubscriber
} from '@shelltender/core';

interface ProcessorEntry {
  processor: DataProcessor;
  priority: number;
}

interface PipelineError {
  phase: 'filter' | 'processor';
  name: string;
  error: Error;
  event: TerminalDataEvent;
}

export class TerminalDataPipeline extends EventEmitter implements IPipelineSubscriber {
  private processors = new Map<string, ProcessorEntry>();
  private filters = new Map<string, DataFilter>();
  private processorOrder: string[] = [];
  
  constructor(public readonly options: PipelineOptions = {}) {
    super();
    this.setMaxListeners(options.maxListeners || 100);
  }

  addProcessor(name: string, processor: DataProcessor, priority: number = 50): void {
    this.processors.set(name, { processor, priority });
    this.updateProcessorOrder();
  }

  removeProcessor(name: string): void {
    this.processors.delete(name);
    this.updateProcessorOrder();
  }

  addFilter(name: string, filter: DataFilter): void {
    this.filters.set(name, filter);
  }

  removeFilter(name: string): void {
    this.filters.delete(name);
  }

  async processData(sessionId: string, data: string, metadata?: any): Promise<void> {
    const originalData = data;
    const timestamp = Date.now();
    
    // Create initial event
    let event: TerminalDataEvent = {
      sessionId,
      data,
      timestamp,
      metadata: metadata || {}
    };

    // Emit raw data event
    this.emit('data:raw', { sessionId, data: originalData, timestamp, metadata });

    // Apply filters
    for (const [name, filter] of this.filters) {
      try {
        if (!filter(event)) {
          // Data blocked by filter
          this.emit('data:blocked', { sessionId, filter: name, data: originalData });
          return;
        }
      } catch (error) {
        this.handleError({ phase: 'filter', name, error: error as Error, event });
        // Continue processing despite filter error
      }
    }

    // Apply processors
    const transformations: string[] = [];
    for (const name of this.processorOrder) {
      const entry = this.processors.get(name);
      if (!entry) continue;

      try {
        const processed = entry.processor(event);
        if (processed === null) {
          // Processor decided to drop the data
          this.emit('data:dropped', { sessionId, processor: name, data: originalData });
          return;
        }
        
        if (processed.data !== event.data) {
          transformations.push(name);
        }
        
        event = processed;
      } catch (error) {
        this.handleError({ phase: 'processor', name, error: error as Error, event });
        // Continue with other processors
      }
    }

    // Create processed event
    const processedEvent: ProcessedDataEvent = {
      ...event,
      originalData,
      processedData: event.data,
      transformations
    };

    // Emit transformation event if data was changed
    if (transformations.length > 0) {
      this.emit('data:transformed', processedEvent);
    }

    // Emit main data event
    this.emit('data:processed', processedEvent);
    this.emit('data', processedEvent);
  }

  onData(callback: (event: ProcessedDataEvent) => void): () => void {
    this.on('data', callback);
    return () => this.off('data', callback);
  }

  onSessionData(sessionId: string, callback: (event: ProcessedDataEvent) => void): () => void {
    const handler = (event: ProcessedDataEvent) => {
      if (event.sessionId === sessionId) {
        callback(event);
      }
    };
    this.on('data', handler);
    return () => this.off('data', handler);
  }

  private updateProcessorOrder(): void {
    this.processorOrder = Array.from(this.processors.entries())
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name]) => name);
  }

  private handleError(error: PipelineError): void {
    this.emit('error', error);
    
    if (this.listenerCount('error') === 0) {
      console.error(`[TerminalDataPipeline] Error in ${error.phase} '${error.name}':`, error.error);
    }
  }

  // Utility methods for monitoring
  getProcessorNames(): string[] {
    return [...this.processorOrder];
  }

  getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }

  clear(): void {
    this.processors.clear();
    this.filters.clear();
    this.processorOrder = [];
  }
}

// Common processors for terminal data
export const CommonProcessors = {
  securityFilter: (patterns: RegExp[]): DataProcessor => {
    return (event: TerminalDataEvent) => {
      let data = event.data;
      
      for (const pattern of patterns) {
        data = data.replace(pattern, '[REDACTED]');
      }
      
      return { ...event, data };
    };
  },

  rateLimiter: (maxBytesPerSecond: number): DataProcessor => {
    const sessionBytes = new Map<string, { bytes: number; resetTime: number }>();
    
    return (event: TerminalDataEvent) => {
      const now = Date.now();
      const session = sessionBytes.get(event.sessionId) || { bytes: 0, resetTime: now + 1000 };
      
      if (now > session.resetTime) {
        session.bytes = 0;
        session.resetTime = now + 1000;
      }
      
      session.bytes += event.data.length;
      
      if (session.bytes > maxBytesPerSecond) {
        return null; // Drop data if over limit
      }
      
      sessionBytes.set(event.sessionId, session);
      return event;
    };
  },

  ansiStripper: (): DataProcessor => {
    // eslint-disable-next-line no-control-regex
    const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]/g;
    
    return (event: TerminalDataEvent) => {
      const stripped = event.data.replace(ansiRegex, '');
      return { ...event, data: stripped };
    };
  },

  lineEndingNormalizer: (): DataProcessor => {
    return (event: TerminalDataEvent) => {
      const normalized = event.data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      return { ...event, data: normalized };
    };
  },

  creditCardRedactor: (): DataProcessor => {
    // Common credit card patterns
    const patterns = [
      /\b(?:4[0-9]{12}(?:[0-9]{3})?)\b/g, // Visa
      /\b(?:5[1-5][0-9]{14})\b/g, // Mastercard
      /\b(?:3[47][0-9]{13})\b/g, // Amex
      /\b(?:6(?:011|5[0-9][0-9])[0-9]{12})\b/g, // Discover
    ];
    
    return (event: TerminalDataEvent) => {
      let data = event.data;
      
      for (const pattern of patterns) {
        data = data.replace(pattern, '[CREDIT_CARD_REDACTED]');
      }
      
      return { ...event, data };
    };
  }
};

// Common filters for terminal data
export const CommonFilters = {
  noBinary: (): DataFilter => {
    return (event: TerminalDataEvent) => {
      // Check for non-printable characters (except common control chars)
      // Allow: tab(\t), newline(\n), carriage return(\r), and escape sequences
      return !/[\x00-\x08\x0E-\x1A\x1C-\x1F\x7F-\x9F]/.test(event.data);
    };
  },

  sessionAllowlist: (allowedSessions: Set<string>): DataFilter => {
    return (event: TerminalDataEvent) => allowedSessions.has(event.sessionId);
  },

  maxDataSize: (maxBytes: number): DataFilter => {
    return (event: TerminalDataEvent) => event.data.length <= maxBytes;
  },

  sourceFilter: (allowedSources: Array<'pty' | 'user' | 'system'>): DataFilter => {
    return (event: TerminalDataEvent) => {
      const source = event.metadata?.source;
      return !source || allowedSources.includes(source);
    };
  }
};