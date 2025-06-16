import { PatternConfig, PatternMatch } from '@shelltender/core';

/**
 * Base class for all pattern matchers
 * Provides common functionality and performance tracking
 */
export abstract class PatternMatcher {
  protected lastMatchTime: number = 0;
  protected matchCount: number = 0;

  constructor(
    protected config: PatternConfig,
    protected id: string
  ) {}

  /**
   * Get the pattern ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the pattern name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get the pattern configuration
   */
  getConfig(): PatternConfig {
    return this.config;
  }

  /**
   * Abstract method that each matcher must implement
   * @param data - The new data chunk to match against
   * @param buffer - The full buffer content (for context)
   * @returns Match result or null if no match
   */
  abstract match(data: string, buffer: string): PatternMatch | null;

  /**
   * Wrapper method that handles debouncing and performance tracking
   */
  tryMatch(data: string, buffer: string): PatternMatch | null {
    const now = Date.now();

    // Handle debouncing
    if (this.config.options?.debounce) {
      if (now - this.lastMatchTime < this.config.options.debounce) {
        return null;
      }
    }

    // Measure performance
    const result = this.measureMatch(() => this.match(data, buffer));

    if (result) {
      this.lastMatchTime = now;
      this.matchCount++;
    }

    return result;
  }

  /**
   * Helper for performance tracking
   */
  protected measureMatch<T>(fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    // Log slow matches (> 10ms)
    if (duration > 10) {
      console.warn(
        `[PatternMatcher] Slow match detected: ${this.config.name} took ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Get matcher statistics
   */
  getStats() {
    return {
      id: this.id,
      name: this.config.name,
      type: this.config.type,
      matchCount: this.matchCount,
      lastMatchTime: this.lastMatchTime,
    };
  }

  /**
   * Validate the pattern configuration
   * Can be overridden by subclasses for specific validation
   */
  validate(): void {
    if (!this.config.name) {
      throw new Error('Pattern name is required');
    }
    if (!this.config.type) {
      throw new Error('Pattern type is required');
    }
  }
}