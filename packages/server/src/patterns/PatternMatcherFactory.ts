import { PatternConfig } from '@shelltender/core';
import { PatternMatcher } from './PatternMatcher.js';
import { RegexMatcher } from './RegexMatcher.js';
import { StringMatcher } from './StringMatcher.js';
import { AnsiMatcher } from './AnsiMatcher.js';
import { CustomMatcher } from './CustomMatcher.js';

/**
 * Factory for creating pattern matchers based on configuration
 */
export class PatternMatcherFactory {
  /**
   * Create a pattern matcher instance
   */
  static create(config: PatternConfig, id: string): PatternMatcher {
    let matcher: PatternMatcher;

    switch (config.type) {
      case 'regex':
        matcher = new RegexMatcher(config, id);
        break;
      
      case 'string':
        matcher = new StringMatcher(config, id);
        break;
      
      case 'ansi':
        matcher = new AnsiMatcher(config, id);
        break;
      
      case 'custom':
        matcher = new CustomMatcher(config, id);
        break;
      
      default:
        throw new Error(`Unknown pattern type: ${config.type}`);
    }

    // Validate the matcher
    matcher.validate();

    return matcher;
  }

  /**
   * Validate a pattern configuration without creating a matcher
   */
  static validate(config: PatternConfig): void {
    const tempId = 'validation-' + Date.now();
    const matcher = this.create(config, tempId);
    matcher.validate();
  }
}