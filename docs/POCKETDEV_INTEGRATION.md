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

// Task-aware sessions (PocketDev hierarchy)
interface TaskSession extends TerminalSession {
  repoId: string;
  projectId: string;
  taskId: string;
  worktreePath: string;  // Each task gets its own worktree
  baseBranch: string;
  taskBranch: string;
  environment?: 'development' | 'staging' | 'production';
  quickActions: {
    commit: boolean;
    push: boolean;
    merge: boolean;
    testMerge: boolean;
  };
}

// Session-to-task mapping
interface SessionTaskMap {
  sessionId: string;
  taskId: string;
  isPrimary: boolean; // Primary session for this task
  role: 'dev' | 'test' | 'build' | 'review' | 'debug';
}
```

### 5. Task Lifecycle Management

```typescript
// Creating a task automatically creates a worktree and spawns a primary session
interface TaskCreation {
  create: (options: {
    projectId: string;
    taskName: string;
    baseBranch: string;
    aiContext: string;
  }) => Promise<{
    taskId: string;
    worktreePath: string;
    primarySessionId: string;
  }>;
  
  // Quick actions for the task
  quickCommit: (taskId: string, message: string) => Promise<void>;
  quickTest: (taskId: string) => Promise<TestResults>;
  quickMerge: (taskId: string) => Promise<MergeResults>;
  cleanup: (taskId: string) => Promise<void>;
}

// Multiple sessions can exist in one task (same worktree)
const devSession = await createSession({ taskId, role: 'dev' });
const testSession = await createSession({ taskId, role: 'test' });
const buildSession = await createSession({ taskId, role: 'build' });
```

## Git Worktree Integration

PocketDev uses git worktrees to provide isolated workspaces for AI developers, enabling safe parallel development with quick merge actions.

### Task-Based Sessions (PocketDev Hierarchy: Repo > Project > Task > Session)

```typescript
interface TaskSession extends TerminalSession {
  repoId: string;
  projectId: string;
  taskId: string;
  worktreePath: string;  // Each task gets its own worktree
  baseBranch: string;
  taskBranch: string;
  linkedSessions: string[]; // Other sessions in same task
}

// Claude creates a new task with its worktree
const taskSession = await pocketdev.claude.createTaskSession({
  projectId: 'auth-feature',
  taskName: 'implement-oauth2',
  baseBranch: 'main',
  command: 'npm install && npm run dev',
  metadata: {
    purpose: 'implementation',
    description: 'Adding OAuth2 authentication'
  }
});

// Quick git actions available in the task
interface QuickGitActions {
  'commit': (message: string) => Promise<void>;
  'push': () => Promise<void>;
  'merge-base': () => Promise<void>;
  'test-merge': () => Promise<MergeResult>;
  'cleanup': () => Promise<void>;
}
```

## Use Case Examples

### 1. Claude Creating Feature Task

```typescript
// Claude starts a new feature task (creates worktree + primary session)
const authTask = await pocketdev.claude.createTask({
  projectId: 'mobile-app',
  taskName: 'add-oauth2',
  type: 'feature',
  baseBranch: 'main',
  context: 'Implementing OAuth2 authentication'
});

// Primary dev session created automatically
const devSession = authTask.primarySessionId;

// Claude can quickly test changes
await pocketdev.git.quickAction(authTask.taskId, 'test-merge');

// If tests pass, merge back
await pocketdev.git.quickAction(authTask.taskId, 'merge-base');
```

### 2. Parallel Bug Fix Task

```typescript
// While working on feature, Claude creates bugfix task
const bugfixTask = await pocketdev.claude.createTask({
  projectId: 'mobile-app',
  taskName: 'fix-memory-leak',
  type: 'bugfix',
  baseBranch: 'main',
  context: 'Fixing memory leak without interrupting feature work'
});

// Create test session in the bugfix task
const testSession = await pocketdev.claude.createSession({
  taskId: bugfixTask.taskId,
  role: 'test',
  command: 'npm test -- --detectLeaks'
});

// Work happens in isolation
sessionManager.sendCommand(testSession, 'git status');
// Output: "On branch task/fix-memory-leak, worktree .worktrees/task-fix-memory-leak"
```

### 3. Code Review Task

```typescript
// Claude creates review task with its own worktree
const reviewTask = await pocketdev.claude.createTask({
  projectId: 'mobile-app',
  taskName: 'review-pr-123',
  type: 'review',
  baseBranch: 'develop',
  checkout: 'origin/feature/new-api',  // Review someone else's branch
  context: 'Reviewing PR #123 in isolated environment'
});

// Run tests in review session
const reviewSession = await pocketdev.claude.createSession({
  taskId: reviewTask.taskId,
  role: 'review',
  command: 'npm test && npm run lint'
});

// Claude can make suggested fixes in the task's worktree
sessionManager.sendCommand(reviewSession, 'git commit -am "Fix: typo in variable name"');
sessionManager.sendCommand(reviewSession, 'git push origin task/review-pr-123');
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

## Task-Based Development Benefits

### 1. Clear Hierarchy (Repo > Project > Task > Session)
- Each task gets its own isolated worktree
- Multiple sessions can run within a task's context
- Clean organization matches mental model

### 2. True Parallel Development
- Claude can work on multiple tasks simultaneously without context switching
- Each task's worktree has its own dependencies, build state, and running processes
- No need to stash/unstash or switch branches

### 3. Safe Task Experimentation
- AI can try risky changes in isolated task worktrees
- Quick rollback by simply deleting the task
- Test merges without affecting other tasks

### 4. Collaborative AI Workflows
- Multiple Claude instances can work on different tasks
- One Claude on feature tasks, another on bug tasks, another on docs
- All coordinated through task-aware Shelltender sessions

### 5. Mobile-Friendly Git Operations
- Quick action buttons instead of complex git commands
- Visual task status in session tabs
- One-tap merge from task back to base branch

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