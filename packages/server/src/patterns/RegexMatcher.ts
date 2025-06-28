import { PatternConfig, PatternMatch } from '@shelltender/core';
import { PatternMatcher } from './PatternMatcher.js';

/**
 * Pattern matcher for regular expressions
 */
export class RegexMatcher extends PatternMatcher {
  private regex: RegExp;

  constructor(config: PatternConfig, id: string) {
    super(config, id);
    this.regex = this.createRegex();
  }

  /**
   * Create the RegExp instance from the pattern configuration
   */
  private createRegex(): RegExp {
    if (this.config.pattern instanceof RegExp) {
      return this.config.pattern;
    }

    if (typeof this.config.pattern === 'string') {
      const flags = this.buildFlags();
      return new RegExp(this.config.pattern, flags);
    }

    throw new Error('RegexMatcher requires a string or RegExp pattern');
  }

  /**
   * Build regex flags from configuration options
   */
  private buildFlags(): string {
    let flags = '';
    
    // Global flag for multiple matches
    flags += 'g';
    
    // Case sensitivity
    if (this.config.options?.caseSensitive === false) {
      flags += 'i';
    }
    
    // Multiline mode
    if (this.config.options?.multiline) {
      flags += 'm';
    }

    return flags;
  }

  /**
   * Perform the regex match
   */
  match(data: string, buffer: string): PatternMatch | null {
    // Reset regex state for global flag
    this.regex.lastIndex = 0;

    // Try to match against the new data first (most common case)
    const match = this.regex.exec(data);
    
    if (match) {
      return {
        match: match[0],
        position: match.index,
        groups: this.extractGroups(match),
      };
    }

    // If no match in new data and multiline is enabled, try buffer
    if (this.config.options?.multiline && buffer !== data) {
      this.regex.lastIndex = 0;
      const bufferMatch = this.regex.exec(buffer);
      
      if (bufferMatch) {
        return {
          match: bufferMatch[0],
          position: bufferMatch.index,
          groups: this.extractGroups(bufferMatch),
        };
      }
    }

    return null;
  }

  /**
   * Extract named and numbered capture groups
   */
  private extractGroups(match: RegExpExecArray): Record<string, string> | undefined {
    if (match.length <= 1) {
      return undefined;
    }

    const groups: Record<string, string> = {};

    // Add numbered groups
    for (let i = 1; i < match.length; i++) {
      if (match[i] !== undefined) {
        groups[i.toString()] = match[i];
      }
    }

    // Add named groups if available
    if (match.groups) {
      Object.assign(groups, match.groups);
    }

    return Object.keys(groups).length > 0 ? groups : undefined;
  }

  /**
   * Validate the regex pattern
   */
  validate(): void {
    super.validate();

    try {
      // Test the regex with an empty string to check validity
      this.regex.test('');
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}