import { EventManager } from './events/EventManager.js';

interface BufferEntry {
  sequence: number;
  data: string;
  timestamp: number;
}

interface SessionBuffer {
  entries: BufferEntry[];
  nextSequence: number;
  totalSize: number;
}

export class BufferManager {
  private buffers: Map<string, string> = new Map();
  private sequencedBuffers: Map<string, SessionBuffer> = new Map();
  private maxBufferSize: number;
  private eventManager?: EventManager;

  constructor(maxBufferSize: number = 100000) {
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Set the event manager for pattern matching
   */
  setEventManager(eventManager: EventManager): void {
    this.eventManager = eventManager;
  }

  addToBuffer(sessionId: string, data: string): number {
    // Legacy buffer management
    if (!this.buffers.has(sessionId)) {
      this.buffers.set(sessionId, '');
    }

    let buffer = this.buffers.get(sessionId)!;
    buffer += data;

    // Trim buffer if it exceeds max size (keep last N characters)
    if (buffer.length > this.maxBufferSize) {
      buffer = buffer.slice(buffer.length - this.maxBufferSize);
    }

    this.buffers.set(sessionId, buffer);

    // New sequenced buffer management
    if (!this.sequencedBuffers.has(sessionId)) {
      this.sequencedBuffers.set(sessionId, {
        entries: [],
        nextSequence: 0,
        totalSize: 0
      });
    }

    const sessionBuffer = this.sequencedBuffers.get(sessionId)!;
    const sequence = sessionBuffer.nextSequence++;
    
    sessionBuffer.entries.push({
      sequence,
      data,
      timestamp: Date.now()
    });
    
    sessionBuffer.totalSize += data.length;
    
    // Trim sequenced buffer if needed
    while (sessionBuffer.totalSize > this.maxBufferSize && sessionBuffer.entries.length > 0) {
      const removed = sessionBuffer.entries.shift()!;
      sessionBuffer.totalSize -= removed.data.length;
    }

    // Process events if event manager is set
    if (this.eventManager) {
      // Use setImmediate to avoid blocking terminal output
      setImmediate(() => {
        this.eventManager!.processData(sessionId, data, buffer);
      });
    }

    return sequence;
  }

  getBuffer(sessionId: string): string {
    return this.buffers.get(sessionId) || '';
  }

  getBufferWithSequence(sessionId: string): { data: string; lastSequence: number } {
    const buffer = this.sequencedBuffers.get(sessionId);
    if (!buffer || buffer.entries.length === 0) {
      return { data: '', lastSequence: -1 };
    }

    const data = buffer.entries.map(e => e.data).join('');
    const lastSequence = buffer.entries[buffer.entries.length - 1].sequence;
    return { data, lastSequence };
  }

  getIncrementalData(sessionId: string, fromSequence: number): { data: string; lastSequence: number } {
    const buffer = this.sequencedBuffers.get(sessionId);
    if (!buffer || buffer.entries.length === 0) {
      return { data: '', lastSequence: fromSequence };
    }

    const newEntries = buffer.entries.filter(e => e.sequence > fromSequence);
    if (newEntries.length === 0) {
      return { data: '', lastSequence: fromSequence };
    }

    const data = newEntries.map(e => e.data).join('');
    const lastSequence = newEntries[newEntries.length - 1].sequence;
    return { data, lastSequence };
  }

  clearBuffer(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.sequencedBuffers.delete(sessionId);
  }

  getAllSessions(): string[] {
    return Array.from(this.buffers.keys());
  }
}