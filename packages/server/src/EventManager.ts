import { EventEmitter } from 'events';
import { 
  PatternConfig, 
  AnyTerminalEvent,
  PatternMatchEvent,
  AnsiSequenceEvent,
  TerminalEventMessage
} from '@shelltender/core';
import { PatternMatcher, PatternMatcherFactory } from './patterns';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Manages pattern registration, matching, and event emission
 */
export class EventManager extends EventEmitter {
  private patterns = new Map<string, PatternMatcher>();
  private sessionPatterns = new Map<string, Set<string>>();
  private patternIdCounter = 0;
  private persistedPatternsFile: string | null = null;

  constructor(private options?: { persistPath?: string }) {
    super();
    
    if (options?.persistPath) {
      this.persistedPatternsFile = path.join(options.persistPath, 'patterns.json');
      this.loadPersistedPatterns().catch(err => 
        console.error('[EventManager] Failed to load persisted patterns:', err)
      );
    }
  }

  /**
   * Register a new pattern
   */
  async registerPattern(sessionId: string, config: PatternConfig): Promise<string> {
    // Validate the pattern configuration
    try {
      PatternMatcherFactory.validate(config);
    } catch (error) {
      throw new Error(`Invalid pattern configuration: ${error.message}`);
    }

    // Generate unique pattern ID
    const patternId = `pattern-${++this.patternIdCounter}-${Date.now()}`;

    // Create the matcher
    const matcher = PatternMatcherFactory.create(config, patternId);
    this.patterns.set(patternId, matcher);

    // Track session patterns
    if (!this.sessionPatterns.has(sessionId)) {
      this.sessionPatterns.set(sessionId, new Set());
    }
    this.sessionPatterns.get(sessionId)!.add(patternId);

    // Persist if enabled
    if (config.options?.persist && this.persistedPatternsFile) {
      await this.persistPatterns();
    }

    // Emit registration event
    this.emit('pattern-registered', {
      patternId,
      sessionId,
      config,
    });

    return patternId;
  }

  /**
   * Unregister a pattern
   */
  async unregisterPattern(patternId: string): Promise<void> {
    const matcher = this.patterns.get(patternId);
    if (!matcher) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    // Remove from patterns map
    this.patterns.delete(patternId);

    // Remove from session tracking
    for (const [sessionId, patterns] of this.sessionPatterns) {
      patterns.delete(patternId);
      if (patterns.size === 0) {
        this.sessionPatterns.delete(sessionId);
      }
    }

    // Update persisted patterns
    if (matcher.getConfig().options?.persist && this.persistedPatternsFile) {
      await this.persistPatterns();
    }

    // Emit unregistration event
    this.emit('pattern-unregistered', { patternId });
  }

  /**
   * Process new terminal data for pattern matching
   */
  processData(sessionId: string, data: string, buffer: string): void {
    const sessionPatternIds = this.sessionPatterns.get(sessionId);
    if (!sessionPatternIds || sessionPatternIds.size === 0) {
      return;
    }

    // Check each pattern registered for this session
    for (const patternId of sessionPatternIds) {
      const matcher = this.patterns.get(patternId);
      if (!matcher) continue;

      try {
        const result = matcher.tryMatch(data, buffer);
        
        if (result) {
          const event: PatternMatchEvent = {
            type: 'pattern-match',
            sessionId,
            patternId,
            patternName: matcher.getName(),
            timestamp: Date.now(),
            match: result.match,
            position: result.position,
            groups: result.groups,
          };

          this.emitEvent(event);
        }
      } catch (error) {
        console.error(`[EventManager] Error matching pattern ${patternId}:`, error);
      }
    }

    // Also check for ANSI sequences if any ANSI matchers are registered
    this.checkAnsiSequences(sessionId, data);
  }

  /**
   * Check for ANSI sequences (built-in detection)
   */
  private checkAnsiSequences(sessionId: string, data: string): void {
    const ansiRegex = /\x1b(?:\[([0-9;]*)([@-~])|\]([0-9]+);([^\x07\x1b]*)\x07|([A-Z\\^_@\[\]]))/g;
    let match;

    while ((match = ansiRegex.exec(data)) !== null) {
      const event: AnsiSequenceEvent = {
        type: 'ansi-sequence',
        sessionId,
        timestamp: Date.now(),
        sequence: match[0],
        category: this.categorizeAnsiSequence(match),
      };

      // Add parsed data if CSI sequence
      if (match[1] !== undefined && match[2]) {
        event.parsed = {
          command: match[2],
          params: match[1] ? match[1].split(';').map(p => parseInt(p, 10) || 0) : [],
        };
      }

      this.emitEvent(event);
    }
  }

  /**
   * Categorize ANSI sequence
   */
  private categorizeAnsiSequence(match: RegExpExecArray): 'cursor' | 'color' | 'clear' | 'other' {
    const command = match[2]; // CSI command
    
    if (!command) return 'other';

    switch (command) {
      case 'A': case 'B': case 'C': case 'D': case 'H': case 'f':
        return 'cursor';
      case 'm':
        return 'color';
      case 'J': case 'K':
        return 'clear';
      default:
        return 'other';
    }
  }

  /**
   * Emit a terminal event
   */
  private emitEvent(event: AnyTerminalEvent): void {
    // Emit specific event type
    this.emit(event.type, event);
    
    // Emit general terminal event
    this.emit('terminal-event', event);

    // Log in debug mode
    if (process.env.DEBUG_EVENTS) {
      console.log('[EventManager] Event emitted:', event);
    }
  }

  /**
   * Get all patterns for a session
   */
  getSessionPatterns(sessionId: string): PatternConfig[] {
    const patternIds = this.sessionPatterns.get(sessionId);
    if (!patternIds) return [];

    return Array.from(patternIds)
      .map(id => this.patterns.get(id))
      .filter(matcher => matcher !== undefined)
      .map(matcher => matcher!.getConfig());
  }

  /**
   * Get pattern statistics
   */
  getStats() {
    const stats = {
      totalPatterns: this.patterns.size,
      sessionCount: this.sessionPatterns.size,
      patterns: Array.from(this.patterns.values()).map(p => p.getStats()),
    };

    return stats;
  }

  /**
   * Clean up patterns for a session
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const patternIds = this.sessionPatterns.get(sessionId);
    if (!patternIds) return;

    // Unregister all patterns for this session
    for (const patternId of patternIds) {
      await this.unregisterPattern(patternId);
    }

    this.sessionPatterns.delete(sessionId);
  }

  /**
   * Persist patterns to disk
   */
  private async persistPatterns(): Promise<void> {
    if (!this.persistedPatternsFile) return;

    const persistedPatterns: Array<{
      id: string;
      sessionId: string;
      config: PatternConfig;
    }> = [];

    // Collect patterns that should be persisted
    for (const [sessionId, patternIds] of this.sessionPatterns) {
      for (const patternId of patternIds) {
        const matcher = this.patterns.get(patternId);
        if (matcher && matcher.getConfig().options?.persist) {
          // Note: Custom matchers with functions cannot be persisted
          if (matcher.getConfig().type !== 'custom') {
            persistedPatterns.push({
              id: patternId,
              sessionId,
              config: matcher.getConfig(),
            });
          }
        }
      }
    }

    // Write to disk
    try {
      await fs.mkdir(path.dirname(this.persistedPatternsFile), { recursive: true });
      await fs.writeFile(
        this.persistedPatternsFile,
        JSON.stringify(persistedPatterns, null, 2)
      );
    } catch (error) {
      console.error('[EventManager] Failed to persist patterns:', error);
    }
  }

  /**
   * Load persisted patterns from disk
   */
  private async loadPersistedPatterns(): Promise<void> {
    if (!this.persistedPatternsFile) return;

    try {
      const data = await fs.readFile(this.persistedPatternsFile, 'utf-8');
      const persistedPatterns = JSON.parse(data);

      for (const { id, sessionId, config } of persistedPatterns) {
        try {
          // Recreate the matcher
          const matcher = PatternMatcherFactory.create(config, id);
          this.patterns.set(id, matcher);

          // Track in session patterns
          if (!this.sessionPatterns.has(sessionId)) {
            this.sessionPatterns.set(sessionId, new Set());
          }
          this.sessionPatterns.get(sessionId)!.add(id);

          // Update ID counter
          const idNum = parseInt(id.split('-')[1], 10);
          if (!isNaN(idNum) && idNum > this.patternIdCounter) {
            this.patternIdCounter = idNum;
          }
        } catch (error) {
          console.error(`[EventManager] Failed to restore pattern ${id}:`, error);
        }
      }

      console.log(`[EventManager] Loaded ${this.patterns.size} persisted patterns`);
    } catch (error) {
      // File might not exist yet
      if (error.code !== 'ENOENT') {
        console.error('[EventManager] Failed to load persisted patterns:', error);
      }
    }
  }
}