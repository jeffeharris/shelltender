import type { PatternConfig } from '@shelltender/core';

/**
 * Common terminal output patterns for various use cases
 */
export const CommonPatterns = {
  // Build Tools
  build: {
    npmInstall: {
      name: 'npm-install',
      type: 'regex' as const,
      pattern: /npm\s+(install|i|add|remove|uninstall|rm)/i,
      description: 'NPM package management commands',
      options: { debounce: 100 }
    },
    npmScript: {
      name: 'npm-script',
      type: 'regex' as const,
      pattern: />\s*(\S+@\S+)\s+(\w+)/,
      description: 'NPM script execution',
      options: { debounce: 100 }
    },
    buildSuccess: {
      name: 'build-success',
      type: 'regex' as const,
      pattern: /(?:build|built|compiled?)\s+(?:successfully|succeeded|completed?)(?:\s+in\s+(\d+(?:\.\d+)?)\s*(?:ms|s|seconds?|minutes?))?/i,
      description: 'Successful build completion',
      options: { debounce: 500 }
    },
    buildFailure: {
      name: 'build-failure',
      type: 'regex' as const,
      pattern: /(?:build|compilation)\s+(?:failed|error)/i,
      description: 'Build failures',
      options: { debounce: 500 }
    },
    webpack: {
      name: 'webpack-status',
      type: 'regex' as const,
      pattern: /webpack\s+(\d+\.\d+\.\d+)\s+compiled\s+(?:successfully|with\s+\d+\s+warnings?)/,
      description: 'Webpack compilation status',
      options: { debounce: 200 }
    }
  },

  // Version Control
  git: {
    command: {
      name: 'git-command',
      type: 'regex' as const,
      pattern: /git\s+(status|add|commit|push|pull|fetch|merge|checkout|branch|log|diff|stash|reset|rebase)/i,
      description: 'Git commands',
      options: { debounce: 100 }
    },
    branch: {
      name: 'git-branch',
      type: 'regex' as const,
      pattern: /(?:On branch|HEAD detached at|Switched to branch)\s+([^\s]+)/,
      description: 'Git branch information',
      options: { debounce: 200 }
    },
    remote: {
      name: 'git-remote',
      type: 'regex' as const,
      pattern: /(?:origin|upstream)\s+(\S+)\s+\((?:fetch|push)\)/,
      description: 'Git remote URLs',
      options: { debounce: 200 }
    },
    conflict: {
      name: 'git-conflict',
      type: 'regex' as const,
      pattern: /CONFLICT\s+\([^)]+\):\s+(.+)/,
      description: 'Git merge conflicts',
      options: { debounce: 100 }
    }
  },

  // Testing
  testing: {
    jest: {
      name: 'jest-results',
      type: 'regex' as const,
      pattern: /Tests?:\s+(\d+)\s+passed,\s+(\d+)\s+failed(?:,\s+(\d+)\s+skipped)?/,
      description: 'Jest test results',
      options: { debounce: 200 }
    },
    vitest: {
      name: 'vitest-results',
      type: 'regex' as const,
      pattern: /(\d+)\s+passed(?:\s+\|\s+(\d+)\s+failed)?(?:\s+\|\s+(\d+)\s+skipped)?/,
      description: 'Vitest test results',
      options: { debounce: 200 }
    },
    testFile: {
      name: 'test-file',
      type: 'regex' as const,
      pattern: /(?:PASS|FAIL|SKIP)\s+(.+\.(?:test|spec)\.[jt]sx?)/,
      description: 'Test file results',
      options: { debounce: 100 }
    },
    coverage: {
      name: 'test-coverage',
      type: 'regex' as const,
      pattern: /(?:Coverage|Statements|Branches|Functions|Lines)\s*:\s*(\d+(?:\.\d+)?%)/,
      description: 'Test coverage percentages',
      options: { debounce: 300 }
    }
  },

  // Errors and Warnings
  diagnostics: {
    error: {
      name: 'error-generic',
      type: 'regex' as const,
      pattern: /(?:error|ERROR|Error|failed|Failed|FAILED):\s*(.+)/i,
      description: 'Generic error messages',
      options: { debounce: 200 }
    },
    warning: {
      name: 'warning-generic',
      type: 'regex' as const,
      pattern: /(?:warning|WARNING|Warning|warn|Warn|WARN):\s*(.+)/i,
      description: 'Generic warning messages',
      options: { debounce: 200 }
    },
    stackTrace: {
      name: 'stack-trace',
      type: 'regex' as const,
      pattern: /^\s*at\s+(.+)\s+\((.+):(\d+):(\d+)\)/,
      description: 'JavaScript stack traces',
      options: { debounce: 50 }
    },
    typeError: {
      name: 'typescript-error',
      type: 'regex' as const,
      pattern: /(.+\.tsx?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/,
      description: 'TypeScript compilation errors',
      options: { debounce: 100 }
    }
  },

  // System and Shell
  system: {
    prompt: {
      name: 'shell-prompt',
      type: 'regex' as const,
      pattern: /^(?:\$|\#|>|❯|➜)\s*$/m,
      description: 'Shell prompt detection',
      options: { debounce: 0 }
    },
    command: {
      name: 'shell-command',
      type: 'regex' as const,
      pattern: /^(?:\$|#|>)\s+(.+)$/m,
      description: 'Shell command execution',
      options: { debounce: 100 }
    },
    path: {
      name: 'file-path',
      type: 'regex' as const,
      pattern: /(?:\/[\w.-]+)+(?:\/[\w.-]+\.\w+)?|(?:[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*)/,
      description: 'File paths (Unix and Windows)',
      options: { debounce: 200 }
    },
    port: {
      name: 'port-binding',
      type: 'regex' as const,
      pattern: /(?:listening|serving|running)\s+(?:on|at)\s+(?:port\s+)?(\d{1,5})/i,
      description: 'Port binding messages',
      options: { debounce: 200 }
    }
  },

  // Progress and Status
  progress: {
    percentage: {
      name: 'progress-percentage',
      type: 'regex' as const,
      pattern: /(\d{1,3})%/,
      description: 'Percentage progress indicators',
      options: { debounce: 100 }
    },
    progressBar: {
      name: 'progress-bar',
      type: 'regex' as const,
      pattern: /\[([=\-#]+)\]/,
      description: 'ASCII progress bars',
      options: { debounce: 100 }
    },
    spinner: {
      name: 'spinner',
      type: 'string' as const,
      pattern: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      description: 'Loading spinner characters',
      options: { debounce: 50 }
    },
    bytes: {
      name: 'data-transfer',
      type: 'regex' as const,
      pattern: /(\d+(?:\.\d+)?)\s*(?:B|KB|MB|GB|TB|bytes|kilobytes|megabytes|gigabytes)/i,
      description: 'Data transfer sizes',
      options: { debounce: 200 }
    }
  },

  // Network and HTTP
  network: {
    url: {
      name: 'url',
      type: 'regex' as const,
      pattern: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/,
      description: 'HTTP/HTTPS URLs',
      options: { debounce: 200 }
    },
    ipAddress: {
      name: 'ip-address',
      type: 'regex' as const,
      pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
      description: 'IPv4 addresses',
      options: { debounce: 200 }
    },
    httpStatus: {
      name: 'http-status',
      type: 'regex' as const,
      pattern: /(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\S+\s+(\d{3})/,
      description: 'HTTP status codes',
      options: { debounce: 100 }
    }
  },

  // Docker and Containers
  docker: {
    command: {
      name: 'docker-command',
      type: 'regex' as const,
      pattern: /docker(?:-compose)?\s+(run|build|push|pull|ps|logs|exec|stop|start|restart)/,
      description: 'Docker commands',
      options: { debounce: 100 }
    },
    imageId: {
      name: 'docker-image',
      type: 'regex' as const,
      pattern: /(?:sha256:)?[a-f0-9]{12,64}/,
      description: 'Docker image IDs',
      options: { debounce: 200 }
    },
    container: {
      name: 'docker-container',
      type: 'regex' as const,
      pattern: /container\s+([a-f0-9]{12,64})/i,
      description: 'Docker container IDs',
      options: { debounce: 200 }
    }
  },

  // Package Managers
  packageManagers: {
    npmPackage: {
      name: 'npm-package',
      type: 'regex' as const,
      pattern: /(?:added|updated|removed)\s+(\d+)\s+packages?/,
      description: 'NPM package operations',
      options: { debounce: 300 }
    },
    yarnPackage: {
      name: 'yarn-package',
      type: 'regex' as const,
      pattern: /success\s+(?:Added|Removed|Updated)\s+"([^"]+)"/,
      description: 'Yarn package operations',
      options: { debounce: 300 }
    },
    packageVersion: {
      name: 'package-version',
      type: 'regex' as const,
      pattern: /([\w@/-]+)@(\d+\.\d+\.\d+(?:-[\w.]+)?)/,
      description: 'Package versions',
      options: { debounce: 200 }
    }
  }
} as const;

// Helper to get all patterns as a flat array
export function getAllPatterns(): PatternConfig[] {
  const patterns: PatternConfig[] = [];
  
  Object.values(CommonPatterns).forEach(category => {
    Object.values(category).forEach(pattern => {
      patterns.push(pattern as PatternConfig);
    });
  });
  
  return patterns;
}

// Helper to get patterns by category
export function getPatternsByCategory(category: keyof typeof CommonPatterns): PatternConfig[] {
  return Object.values(CommonPatterns[category]) as PatternConfig[];
}

// Helper to search patterns by name or description
export function searchPatterns(query: string): PatternConfig[] {
  const lowerQuery = query.toLowerCase();
  return getAllPatterns().filter(pattern => 
    pattern.name.toLowerCase().includes(lowerQuery) ||
    (pattern.description && pattern.description.toLowerCase().includes(lowerQuery))
  );
}