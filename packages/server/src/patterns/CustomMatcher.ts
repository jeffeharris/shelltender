import { PatternConfig, PatternMatch, CustomMatcher as CustomMatcherFn } from '@shelltender/core';
import { PatternMatcher } from './PatternMatcher.js';

/**
 * Pattern matcher for custom matching logic
 * Allows arbitrary matching functions for complex patterns
 */
export class CustomMatcher extends PatternMatcher {
  private matcherFn: CustomMatcherFn;

  constructor(config: PatternConfig, id: string) {
    super(config, id);
    
    if (typeof this.config.pattern !== 'function') {
      throw new Error('CustomMatcher requires a function pattern');
    }

    this.matcherFn = this.config.pattern as CustomMatcherFn;
  }

  /**
   * Perform the custom match
   */
  match(data: string, buffer: string): PatternMatch | null {
    try {
      return this.matcherFn(data, buffer);
    } catch (error) {
      console.error(`[CustomMatcher] Error in custom matcher ${this.config.name}:`, error);
      return null;
    }
  }

  /**
   * Validate the custom matcher
   */
  validate(): void {
    super.validate();

    // Test the matcher with empty strings
    try {
      this.matcherFn('', '');
    } catch (error) {
      throw new Error(`Invalid custom matcher: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}