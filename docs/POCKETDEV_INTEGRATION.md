# Shelltender + pocketdev Integration Guide

## Overview

This document outlines how Shelltender serves as the terminal infrastructure for pocketdev, enabling AI developers to work seamlessly across devices with full persistence, scrollback, and modern terminal UI support.

## Core Use Case

pocketdev provides AI developers (like Claude Code) in your pocket, allowing users to work on projects on-the-go without an IDE. Shelltender provides the critical terminal infrastructure that makes this possible.

### Problem Solved

Traditional solutions failed to provide both persistence AND scrollback:
- **ttyd alone**: Great UX and scrollback, but no server-side persistence
- **ttyd + tmux**: Persistence works, but loses scrollback ability
- **Mobile limitations**: Copy/paste issues, session management complexity

Shelltender provides all of these simultaneously with a mobile-first UX.

## Key Integration Points

### 1. AI-Initiated Sessions

Claude Code (via MCP) can programmatically create and manage sessions:

```typescript
// Claude decides to spawn a code review session
const reviewSession = await sessionManager.createSession({
  name: 'code-review-auth-feature',
  command: 'git diff main..feature/auth',
  cwd: '/project/path',
  metadata: {
    initiatedBy: 'claude',
    purpose: 'code-review',
    parentSession: currentSessionId,
    aiContext: 'Reviewing authentication implementation for security concerns'
  }
});

// Claude can monitor the session
sessionManager.on('output', (sessionId, data) => {
  if (sessionId === reviewSession && data.includes('vulnerability')) {
    // Alert Claude to potential issue
  }
});
```

### 2. Autonomous AI Workflows

Claude can spawn multiple specialized sessions:

```typescript
// Documentation session
const docsSession = await sessionManager.createSession({
  name: 'docs-update',
  command: 'npm run docs:generate',
  restricted: true, // Limit to docs directory only
  metadata: {
    purpose: 'documentation',
    triggerEvent: 'feature-complete'
  }
});

// Bug investigation session
const bugSession = await sessionManager.createSession({
  name: 'investigate-test-failure',
  command: 'npm test -- --verbose',
  metadata: {
    purpose: 'debugging',
    issueId: 'TEST-123'
  }
});

// Idea exploration session
const ideaSession = await sessionManager.createSession({
  name: 'explore-caching-strategy',
  command: 'node scripts/analyze-performance.js',
  metadata: {
    purpose: 'research',
    priority: 'low'
  }
});
```

### 3. Session Communication & Awareness

```typescript
// Claude can read from any session it created
const history = await bufferManager.getBuffer(docsSession);
const lastOutput = history.slice(-1000); // Last 1000 chars

// Claude can inject commands into sessions
sessionManager.sendCommand(bugSession, 'npm test -- --testNamePattern="auth"');

// Claude gets notified of important events
sessionManager.on('sessionAlert', (sessionId, alertType, data) => {
  // E.g., process completed, error occurred, pattern matched
  if (alertType === 'pattern-match' && data.pattern === 'FAILED') {
    // Claude can decide to investigate
  }
});
```

### 4. Mobile-First Features for pocketdev

```typescript
// Session templates for common pocketdev workflows
const templates = {
  'feature': {
    command: 'npm run dev',
    name: 'feature-{id}',
    env: { NODE_ENV: 'development' }
  },
  'bugfix': {
    command: 'npm test -- --watch',
    name: 'fix-{id}'
  },
  'review': {
    command: 'git log --oneline -10',
    name: 'review-{id}'
  }
};

// Quick actions for mobile
interface MobileQuickActions {
  swipeLeft: 'minimize-session',
  swipeRight: 'switch-session',
  longPress: 'session-actions-menu',
  doubleTap: 'toggle-fullscreen'
}
```

## Implementation Requirements

### 1. Enhanced SessionManager API

```typescript
interface PocketdevSessionManager extends SessionManager {
  // AI-specific session creation
  createAISession(options: AISessionOptions): Promise<string>;
  
  // Session monitoring
  watchSession(sessionId: string, patterns: string[]): EventEmitter;
  
  // Bulk operations
  getSessionsByMetadata(query: object): TerminalSession[];
  
  // Session relationships
  linkSessions(parentId: string, childId: string): void;
  getSessionTree(rootId: string): SessionTree;
}

interface AISessionOptions extends SessionOptions {
  metadata: {
    initiatedBy: 'claude' | 'user' | 'system';
    purpose: 'implementation' | 'review' | 'documentation' | 'debugging' | 'research';
    parentSession?: string;
    aiContext?: string;
    priority?: 'high' | 'medium' | 'low';
    alerts?: AlertConfig[];
  };
}
```

### 2. Event System for AI Awareness

```typescript
interface SessionEvent {
  sessionId: string;
  timestamp: Date;
  type: 'output' | 'command' | 'state-change' | 'alert';
  data: any;
}

// Pattern matching for alerts
interface AlertConfig {
  pattern: RegExp | string;
  action: 'notify' | 'pause' | 'terminate' | 'spawn-session';
  metadata?: any;
}

// Example: Claude watching for test failures
const testSession = await sessionManager.createAISession({
  command: 'npm test',
  metadata: {
    initiatedBy: 'claude',
    purpose: 'debugging',
    alerts: [{
      pattern: /FAIL|ERROR/,
      action: 'notify',
      metadata: { severity: 'high' }
    }]
  }
});
```

### 3. Mobile Optimizations

```typescript
// Compact session representation for mobile
interface MobileSessionView {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'completed' | 'error';
  lastActivity: Date;
  preview: string; // Last 200 chars of output
  quickActions: string[];
}

// Gesture support
interface GestureHandlers {
  onSwipeLeft: (sessionId: string) => void;
  onSwipeRight: (sessionId: string) => void;
  onPinch: (sessionId: string, scale: number) => void;
  onLongPress: (sessionId: string, position: Point) => void;
}
```

### 4. pocketdev-Specific Features

```typescript
// Session persistence with pocketdev profile
interface PocketdevProfile {
  userId: string;
  activeProject: string;
  sessionHistory: SessionSnapshot[];
  preferences: UserPreferences;
  worktrees: WorktreeConfig[];
}

// Worktree-aware sessions
interface WorktreeSession extends TerminalSession {
  projectId: string;
  worktreeId: string;
  worktreePath: string;
  baseBranch: string;
  featureBranch: string;
  environment?: 'development' | 'staging' | 'production';
  quickActions: {
    commit: boolean;
    push: boolean;
    merge: boolean;
    testMerge: boolean;
  };
}

// Session-to-worktree mapping
interface SessionWorktreeMap {
  sessionId: string;
  worktreeId: string;
  isPrimary: boolean; // Primary session for this worktree
  role: 'dev' | 'test' | 'build' | 'review' | 'debug';
}
```

### 5. Worktree Lifecycle Management

```typescript
// Creating a worktree automatically spawns a primary session
interface WorktreeCreation {
  create: (options: {
    baseBranch: string;
    featureName: string;
    aiContext: string;
  }) => Promise<{
    worktreeId: string;
    primarySessionId: string;
    path: string;
  }>;
  
  // Quick actions for the worktree
  quickCommit: (worktreeId: string, message: string) => Promise<void>;
  quickTest: (worktreeId: string) => Promise<TestResults>;
  quickMerge: (worktreeId: string) => Promise<MergeResults>;
  cleanup: (worktreeId: string) => Promise<void>;
}

// Multiple sessions can exist in one worktree
const devSession = await createSession({ worktreeId, role: 'dev' });
const testSession = await createSession({ worktreeId, role: 'test' });
const buildSession = await createSession({ worktreeId, role: 'build' });
```

## Git Worktree Integration

PocketDev uses git worktrees to provide isolated workspaces for AI developers, enabling safe parallel development with quick merge actions.

### Worktree-Aware Sessions

```typescript
interface WorktreeSession extends TerminalSession {
  worktreePath: string;
  baseBranch: string;
  featureBranch: string;
  linkedSessions: string[]; // Other sessions in same worktree
}

// Claude creates a new worktree for a feature
const worktreeSession = await pocketdev.claude.createWorktreeSession({
  baseBranch: 'main',
  featureName: 'add-authentication',
  command: 'npm install && npm run dev',
  metadata: {
    purpose: 'implementation',
    description: 'Adding OAuth2 authentication'
  }
});

// Quick git actions available in the session
interface QuickGitActions {
  'commit': (message: string) => Promise<void>;
  'push': () => Promise<void>;
  'merge-base': () => Promise<void>;
  'test-merge': () => Promise<MergeResult>;
  'cleanup': () => Promise<void>;
}
```

## Use Case Examples

### 1. Claude Creating Feature Worktree

```typescript
// Claude starts a new feature in isolated worktree
const authSession = await pocketdev.claude.spawnSession({
  type: 'feature',
  worktree: {
    base: 'main',
    branch: 'feature/add-oauth',
    path: '.worktrees/add-oauth'
  },
  command: 'npm run dev',
  context: 'Implementing OAuth2 authentication'
});

// Claude can quickly test changes
await pocketdev.git.quickAction(authSession, 'test-merge');

// If tests pass, merge back
await pocketdev.git.quickAction(authSession, 'merge-base');
```

### 2. Parallel Bug Fix in Separate Worktree

```typescript
// While working on feature, Claude spawns bugfix in new worktree
const bugfixSession = await pocketdev.claude.spawnSession({
  type: 'bugfix',
  worktree: {
    base: 'main',
    branch: 'fix/memory-leak',
    path: '.worktrees/fix-memory-leak'
  },
  command: 'npm test -- --detectLeaks',
  context: 'Fixing memory leak without interrupting feature work'
});

// Work happens in isolation
sessionManager.sendCommand(bugfixSession, 'git status');
// Output: "On branch fix/memory-leak, worktree .worktrees/fix-memory-leak"
```

### 3. Code Review in Clean Worktree

```typescript
// Claude spawns review session in fresh worktree
const reviewSession = await pocketdev.claude.spawnSession({
  type: 'review',
  worktree: {
    base: 'develop',
    branch: 'review/pr-123',
    checkout: 'origin/feature/new-api'  // Review someone else's branch
  },
  command: 'npm test && npm run lint',
  context: 'Reviewing PR #123 in isolated environment'
});

// Claude can make suggested fixes in the worktree
sessionManager.sendCommand(reviewSession, 'git commit -am "Fix: typo in variable name"');
sessionManager.sendCommand(reviewSession, 'git push origin review/pr-123');
```

### 2. Parallel Documentation Generation

```typescript
// Claude realizes docs are out of date
const docsSession = await pocketdev.claude.spawnSession({
  type: 'documentation',
  command: 'npm run docs:update && npm run docs:deploy',
  background: true,
  context: 'Updating API documentation while continuing feature work'
});

// Continue with implementation while docs build
// Check back later
setTimeout(() => {
  const docsStatus = pocketdev.claude.checkSession(docsSession);
  if (docsStatus.completed) {
    // Merge documentation updates
  }
}, 5 * 60 * 1000); // Check after 5 minutes
```

### 3. Debugging in Parallel

```typescript
// Encounter unexpected behavior
const debugSession = await pocketdev.claude.spawnSession({
  type: 'debugging',
  command: 'node --inspect-brk app.js',
  context: 'Investigating memory leak in background'
});

// Set up monitoring
pocketdev.claude.watchSession(debugSession, {
  patterns: ['heap snapshot', 'memory usage'],
  onMatch: (match) => {
    // Analyze memory patterns
  }
});
```

## Worktree + Shelltender Benefits

### 1. True Parallel Development
- Claude can work on multiple features simultaneously without context switching
- Each worktree has its own dependencies, build state, and running processes
- No need to stash/unstash or switch branches

### 2. Safe Experimentation
- AI can try risky changes in isolated worktrees
- Quick rollback by simply deleting the worktree
- Test merges without affecting main development

### 3. Collaborative AI Workflows
- Multiple Claude instances can work in different worktrees
- One Claude on features, another on bugs, another on docs
- All coordinated through Shelltender sessions

### 4. Mobile-Friendly Git Operations
- Quick action buttons instead of complex git commands
- Visual worktree status in session tabs
- One-tap merge back to base branch

## Success Metrics

1. **Session Spawn Time**: < 500ms for new AI-initiated session
2. **Worktree Creation**: < 2s including initial session
3. **Cross-Device Sync**: < 100ms latency for session state sync
4. **Mobile Performance**: Smooth scrolling with 10k+ lines of buffer
5. **AI Response Time**: < 200ms for session queries/commands
6. **Concurrent Sessions**: Support 50+ active sessions per user
7. **Worktree Operations**: < 1s for quick git actions

## Future Enhancements

1. **Session Templates Library**: Pre-configured sessions for common tasks
2. **AI Learning**: Claude learns optimal session configurations over time
3. **Collaborative AI**: Multiple Claude instances working in shared sessions
4. **Smart Alerts**: ML-based pattern detection for important events
5. **Resource Optimization**: Automatic session hibernation/wake based on activity

## Integration Checklist

- [ ] SessionManager supports metadata and AI-initiated sessions
- [ ] Event system for pattern matching and alerts
- [ ] Mobile-optimized UI components
- [ ] MCP server integration points
- [ ] Session persistence with pocketdev profiles
- [ ] Bulk session operations API
- [ ] Performance monitoring and metrics
- [ ] Documentation for AI session patterns