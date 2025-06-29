import { PatternConfig, PatternMatch } from '@shelltender/core';
import { PatternMatcher } from './PatternMatcher.js';

/**
 * Pattern matcher for exact string matching
 * Faster than regex for simple string searches
 */
export class StringMatcher extends PatternMatcher {
  private searchString: string;
  private caseSensitive: boolean;

  constructor(config: PatternConfig, id: string) {
    super(config, id);
    
    if (typeof this.config.pattern !== 'string') {
      throw new Error('StringMatcher requires a string pattern');
    }

    this.searchString = this.config.pattern;
    this.caseSensitive = this.config.options?.caseSensitive ?? true;
    
    // Convert to lowercase for case-insensitive matching
    if (!this.caseSensitive) {
      this.searchString = this.searchString.toLowerCase();
    }
  }

  /**
   * Perform the string match
   */
  match(data: string, buffer: string): PatternMatch | null {
    const searchIn = this.caseSensitive ? data : data.toLowerCase();
    const index = searchIn.indexOf(this.searchString);

    if (index !== -1) {
      // Extract the actual match (preserving original case)
      const match = data.substring(index, index + this.searchString.length);
      
      return {
        match,
        position: index,
      };
    }

    return null;
  }

  /**
   * Validate the string pattern
   */
  validate(): void {
    super.validate();

    if (!this.searchString || this.searchString.length === 0) {
      throw new Error('String pattern cannot be empty');
    }
  }
}