import type { PatternConfig } from '@shelltender/core';

/**
 * Patterns for detecting AI coding assistant states and interactions
 * Focused on reliable visual indicators rather than specific text
 */

// Animation symbols used by AI assistants when thinking/processing
export const THINKING_ANIMATION_SYMBOLS = ['·', '✢', '*', '✶', '✻', '✽', '✺', '●', '○', '◉', '◎'];

// Box drawing characters used in UI elements
export const BOX_DRAWING_CHARS = {
  TOP_LEFT: '╭',
  TOP_RIGHT: '╮',
  BOTTOM_LEFT: '╰',
  BOTTOM_RIGHT: '╯',
  HORIZONTAL: '─',
  VERTICAL: '│'
};

export const AgenticCodingPatterns = {
  // Status Detection - focused on animations and visual indicators
  status: {
    thinking: {
      name: 'ai-thinking',
      type: 'regex' as const,
      pattern: /([·✢*✶✻✽✺●○◉◎])\s*(\w+)…\s*\((\d+)s\s*·\s*([↑↓⚒\s]*)\s*([\d.]+k?)\s*tokens/,
      description: 'AI assistant is processing/thinking (animation + action word + time + tokens)',
      options: { debounce: 100 }
    },
    thinkingSimple: {
      name: 'ai-thinking-simple',
      type: 'string' as const,
      pattern: THINKING_ANIMATION_SYMBOLS,
      description: 'AI thinking indicator (animation symbols only)',
      options: { debounce: 50 }
    },
    contextLoading: {
      name: 'ai-context-loading',
      type: 'regex' as const,
      pattern: /(\d{1,3})%\s*$/m,
      description: 'Context window loading percentage',
      options: { debounce: 200 }
    },
    actionWord: {
      name: 'ai-action-word',
      type: 'regex' as const,
      pattern: /[·✢*✶✻✽✺●○◉◎]\s*(\w+)…/,
      description: 'Captures the action word during thinking (for collection)',
      options: { debounce: 100 }
    }
  },

  // Input Detection - prompts and questions
  input: {
    yesNo: {
      name: 'ai-yes-no-prompt',
      type: 'regex' as const,
      pattern: /\(y\/n\)\s*:?\s*$|^\(yes\/no\)\s*:?\s*$|^\[Y\/n\]\s*:?\s*$|^\[y\/N\]\s*:?\s*$|^\(confirm\/cancel\)\s*:?\s*$/im,
      description: 'Yes/No confirmation prompt',
      options: { debounce: 500 }
    },
    multiChoice: {
      name: 'ai-multi-choice',
      type: 'regex' as const,
      pattern: /choose.*:\s*$|select.*:\s*$|pick.*:\s*$|which.*\?\s*$|enter.*\([\d-]+\)\s*:\s*$|option.*:\s*$/im,
      description: 'Multiple choice selection prompt',
      options: { debounce: 500 }
    },
    numberedOption: {
      name: 'ai-numbered-option',
      type: 'regex' as const,
      pattern: /^\s*(\d+)[.)]\s+(.+)$/m,
      description: 'Numbered option in a list',
      options: { debounce: 200 }
    },
    openQuestion: {
      name: 'ai-open-question',
      type: 'regex' as const,
      pattern: /^(Should I|Would you like|Do you want|Can I|May I|Shall I)\s+.+\?/im,
      description: 'Open-ended question from AI',
      options: { debounce: 300 }
    },
    inputRequest: {
      name: 'ai-input-request',
      type: 'regex' as const,
      pattern: /please enter.*:\s*$|provide.*:\s*$|specify.*:\s*$|what.*\?\s*$|name.*:\s*$|path.*:\s*$/im,
      description: 'Request for user input',
      options: { debounce: 300 }
    }
  },

  // UI Elements - box drawing patterns
  ui: {
    boxTop: {
      name: 'ai-box-top',
      type: 'regex' as const,
      pattern: /╭─+╮/,
      description: 'Top of a UI box',
      options: { debounce: 100 }
    },
    boxBottom: {
      name: 'ai-box-bottom',
      type: 'regex' as const,
      pattern: /╰─+╯/,
      description: 'Bottom of a UI box',
      options: { debounce: 100 }
    },
    inputBox: {
      name: 'ai-input-box',
      type: 'regex' as const,
      pattern: /│\s*[>❯▶]\s*/,
      description: 'Input prompt inside a box',
      options: { debounce: 200 }
    },
    boxSeparator: {
      name: 'ai-box-separator',
      type: 'regex' as const,
      pattern: /[─═]{20,}/,
      description: 'Horizontal separator line',
      options: { debounce: 100 }
    }
  },

  // Task Completion - success/error indicators
  completion: {
    success: {
      name: 'ai-task-success',
      type: 'regex' as const,
      pattern: /✓\s+.+|✅\s+.+|completed?\s+successfully|finished\s+.+|done\s+.+|success:\s+.+/i,
      description: 'Task completed successfully',
      options: { debounce: 300 }
    },
    error: {
      name: 'ai-task-error',
      type: 'regex' as const,
      pattern: /✗\s+.+|❌\s+.+|error:\s+.+|failed:\s+.+|failure:\s+.+|could not\s+.+/i,
      description: 'Task failed or encountered error',
      options: { debounce: 300 }
    },
    warning: {
      name: 'ai-task-warning',
      type: 'regex' as const,
      pattern: /⚠️\s+.+|warning:\s+.+|caution:\s+.+|note:\s+.+/i,
      description: 'Warning or important note',
      options: { debounce: 300 }
    }
  },

  // Special States
  special: {
    interrupted: {
      name: 'ai-interrupted',
      type: 'regex' as const,
      pattern: /interrupted|cancelled|stopped|aborted|terminated/i,
      description: 'AI processing was interrupted',
      options: { debounce: 200 }
    },
    escToInterrupt: {
      name: 'ai-esc-hint',
      type: 'regex' as const,
      pattern: /esc\s+to\s+interrupt|press\s+esc\s+to\s+stop/i,
      description: 'Hint that ESC key can interrupt',
      options: { debounce: 500 }
    }
  },

  // Terminal Control - tab titles and window titles
  terminal: {
    setTitle: {
      name: 'terminal-set-title',
      type: 'regex' as const,
      pattern: /\x1b\]0;([^\x07\x1b]+)(?:\x07|\x1b\\)/,
      description: 'Terminal window/tab title change (OSC 0)',
      options: { debounce: 100 }
    },
    setWindowTitle: {
      name: 'terminal-set-window-title',
      type: 'regex' as const,
      pattern: /\x1b\]2;([^\x07\x1b]+)(?:\x07|\x1b\\)/,
      description: 'Terminal window title change (OSC 2)',
      options: { debounce: 100 }
    },
    setIconTitle: {
      name: 'terminal-set-icon-title',
      type: 'regex' as const,
      pattern: /\x1b\]1;([^\x07\x1b]+)(?:\x07|\x1b\\)/,
      description: 'Terminal icon/tab title change (OSC 1)',
      options: { debounce: 100 }
    },
    // Claude-specific title patterns
    claudeTitle: {
      name: 'claude-title-change',
      type: 'regex' as const,
      pattern: /\x1b\][012];[^:]*:\s*(.+?)(?:\x07|\x1b\\)/,
      description: 'Claude changing terminal title with context',
      options: { debounce: 200 }
    }
  }
} as const;

// Helper functions
export function getAllAgenticPatterns(): PatternConfig[] {
  const patterns: PatternConfig[] = [];
  
  Object.values(AgenticCodingPatterns).forEach(category => {
    Object.values(category).forEach(pattern => {
      patterns.push(pattern as PatternConfig);
    });
  });
  
  return patterns;
}

export function getAgenticPatternsByCategory(category: keyof typeof AgenticCodingPatterns): PatternConfig[] {
  return Object.values(AgenticCodingPatterns[category]) as PatternConfig[];
}

// Action word collector helper
export function extractActionWord(text: string): string | null {
  const match = text.match(/[·✢*✶✻✽✺●○◉◎]\s*(\w+)…/);
  return match ? match[1] : null;
}

// Terminal title extraction helper
export function extractTerminalTitle(text: string): { type: 'window' | 'icon' | 'both', title: string } | null {
  // OSC 0 - Both window and icon title
  const osc0Match = text.match(/\x1b\]0;([^\x07\x1b]+)(?:\x07|\x1b\\)/);
  if (osc0Match) {
    return { type: 'both', title: osc0Match[1] };
  }

  // OSC 2 - Window title
  const osc2Match = text.match(/\x1b\]2;([^\x07\x1b]+)(?:\x07|\x1b\\)/);
  if (osc2Match) {
    return { type: 'window', title: osc2Match[1] };
  }

  // OSC 1 - Icon/tab title
  const osc1Match = text.match(/\x1b\]1;([^\x07\x1b]+)(?:\x07|\x1b\\)/);
  if (osc1Match) {
    return { type: 'icon', title: osc1Match[1] };
  }

  return null;
}

// Status detection helper
export interface AIStatus {
  type: 'thinking' | 'loading-context' | 'waiting-input' | 'idle';
  animation?: string;
  actionWord?: string;
  duration?: string;
  tokens?: string;
  contextProgress?: number;
  terminalTitle?: string;
}

export function detectAIStatus(text: string): AIStatus | null {
  // Check for thinking pattern
  const thinkingMatch = text.match(/([·✢*✶✻✽✺●○◉◎])\s*(\w+)…\s*\((\d+)s\s*·\s*([↑↓⚒\s]*)\s*([\d.]+k?)\s*tokens/);
  if (thinkingMatch) {
    return {
      type: 'thinking',
      animation: thinkingMatch[1],
      actionWord: thinkingMatch[2],
      duration: thinkingMatch[3] + 's',
      tokens: thinkingMatch[5]
    };
  }

  // Check for context loading
  const contextMatch = text.match(/(\d{1,3})%\s*$/m);
  if (contextMatch) {
    return {
      type: 'loading-context',
      contextProgress: parseInt(contextMatch[1])
    };
  }

  // Check for input box
  if (text.includes('│') && (text.includes('>') || text.includes('❯') || text.includes('▶'))) {
    return {
      type: 'waiting-input'
    };
  }

  // Check for terminal title change
  const titleInfo = extractTerminalTitle(text);
  if (titleInfo) {
    return {
      type: 'idle', // Title changes can happen in any state
      terminalTitle: titleInfo.title
    };
  }

  return null;
}