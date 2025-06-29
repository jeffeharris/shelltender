import { PatternConfig, PatternMatch } from '@shelltender/core';
import { PatternMatcher } from './PatternMatcher.js';

/**
 * Pattern matcher for ANSI escape sequences
 * Detects and categorizes terminal control sequences
 */
export class AnsiMatcher extends PatternMatcher {
  // Common ANSI escape sequence patterns
  private static readonly ANSI_PATTERNS = {
    // CSI sequences (most common - cursor, color, etc.)
    csi: /\x1b\[([0-9;]*)([@-~])/g,
    // OSC sequences (window title, etc.)
    osc: /\x1b\]([0-9]+);([^\x07\x1b]*)\x07/g,
    // Simple ESC sequences
    esc: /\x1b([A-Z\\^_@\[\]])/g,
    // Any ANSI sequence (catch-all)
    any: /\x1b(?:\[([0-9;]*)([@-~])|\]([0-9]+);([^\x07\x1b]*)\x07|([A-Z\\^_@\[\]]))/g,
  };

  private pattern: RegExp;
  private category: string | null = null;

  constructor(config: PatternConfig, id: string) {
    super(config, id);
    
    if (typeof this.config.pattern === 'string') {
      // Use predefined pattern or custom regex string
      this.pattern = this.getPatternByName(this.config.pattern) || 
                     new RegExp(this.config.pattern, 'g');
      this.category = this.config.pattern;
    } else if (this.config.pattern instanceof RegExp) {
      this.pattern = new RegExp(this.config.pattern.source, 'g');
    } else {
      // Default to matching any ANSI sequence
      this.pattern = AnsiMatcher.ANSI_PATTERNS.any;
      this.category = 'any';
    }
  }

  /**
   * Get predefined pattern by name
   */
  private getPatternByName(name: string): RegExp | null {
    switch (name) {
      case 'csi':
      case 'cursor':
      case 'color':
        return AnsiMatcher.ANSI_PATTERNS.csi;
      case 'osc':
      case 'title':
        return AnsiMatcher.ANSI_PATTERNS.osc;
      case 'esc':
        return AnsiMatcher.ANSI_PATTERNS.esc;
      case 'any':
      case 'all':
        return AnsiMatcher.ANSI_PATTERNS.any;
      default:
        return null;
    }
  }

  /**
   * Perform the ANSI sequence match
   */
  match(data: string, buffer: string): PatternMatch | null {
    // Reset regex state
    this.pattern.lastIndex = 0;

    const match = this.pattern.exec(data);
    
    if (match) {
      const result: PatternMatch = {
        match: match[0],
        position: match.index,
      };

      // Parse the ANSI sequence
      const parsed = this.parseAnsiSequence(match);
      if (parsed) {
        result.groups = {
          type: parsed.type,
          ...parsed.data,
        };
      }

      return result;
    }

    return null;
  }

  /**
   * Parse ANSI sequence into structured data
   */
  private parseAnsiSequence(match: RegExpExecArray): { type: string; data: Record<string, any> } | null {
    const fullMatch = match[0];

    // CSI sequence
    if (fullMatch.startsWith('\x1b[')) {
      const params = match[1] || '';
      const command = match[2] || '';
      
      return {
        type: this.categorizeCsiCommand(command),
        data: {
          command,
          params: params ? params.split(';').map(p => parseInt(p, 10) || 0) : [],
          raw: fullMatch,
        },
      };
    }

    // OSC sequence
    if (fullMatch.startsWith('\x1b]')) {
      // For OSC sequences, extract from the full match
      const oscMatch = fullMatch.match(/\x1b\](\d+);([^\x07]*)\x07/);
      const code = oscMatch ? oscMatch[1] : '';
      const data = oscMatch ? oscMatch[2] : '';
      
      return {
        type: 'osc',
        data: {
          code: parseInt(code, 10) || 0,
          data: data || '',
          raw: fullMatch,
        },
      };
    }

    // Simple ESC sequence
    if (fullMatch.startsWith('\x1b')) {
      const command = match[5] || fullMatch[1];
      
      return {
        type: 'esc',
        data: {
          command,
          raw: fullMatch,
        },
      };
    }

    return null;
  }

  /**
   * Categorize CSI commands
   */
  private categorizeCsiCommand(command: string): string {
    switch (command) {
      // Cursor movement
      case 'A': // Up
      case 'B': // Down
      case 'C': // Forward
      case 'D': // Back
      case 'H': // Position
      case 'f': // Position
        return 'cursor';
      
      // Colors and styling
      case 'm':
        return 'color';
      
      // Screen/line clearing
      case 'J': // Clear screen
      case 'K': // Clear line
        return 'clear';
      
      // Others
      default:
        return 'other';
    }
  }

  /**
   * Validate the ANSI pattern
   */
  validate(): void {
    super.validate();
    // ANSI patterns are always valid
  }
}