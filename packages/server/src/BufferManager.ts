import { EventManager } from './events/EventManager.js';

export class BufferManager {
  private buffers: Map<string, string> = new Map();
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

  addToBuffer(sessionId: string, data: string): void {
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

    // Process events if event manager is set
    if (this.eventManager) {
      // Use setImmediate to avoid blocking terminal output
      setImmediate(() => {
        this.eventManager!.processData(sessionId, data, buffer);
      });
    }
  }

  getBuffer(sessionId: string): string {
    return this.buffers.get(sessionId) || '';
  }

  clearBuffer(sessionId: string): void {
    this.buffers.delete(sessionId);
  }

  getAllSessions(): string[] {
    return Array.from(this.buffers.keys());
  }
}