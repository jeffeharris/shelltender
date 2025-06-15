# Claude Code Input Detection System

> **NOTE: This document should be moved to the PocketDev repository as it contains Claude-specific implementation details. Shelltender provides generic terminal event detection through TERMINAL_EVENT_SYSTEM.md**

## Overview

The terminal event system for Shelltender is specifically designed to detect when Claude Code (or other AI assistants) running in a terminal session are waiting for user input or have completed tasks. This enables PocketDev to send mobile notifications when user attention is needed.

## Use Cases

### Primary: Input Request Detection
```
Claude: "Should I proceed with deleting these 5 files? (y/n): "
→ PocketDev notification: "Claude needs your input: Delete 5 files?"
```

### Secondary: Task Completion Detection
```
Claude: "✓ Successfully refactored authentication module"
→ PocketDev notification: "Claude completed: Refactored auth module"
```

## Pattern Categories

### 1. Yes/No Prompts
```typescript
const YES_NO_PATTERNS = [
  /\(y\/n\)\s*:?\s*$/i,
  /\(yes\/no\)\s*:?\s*$/i,
  /\[Y\/n\]\s*:?\s*$/i,
  /\[y\/N\]\s*:?\s*$/i,
  /\(confirm\/cancel\)\s*:?\s*$/i
];
```

### 2. Multiple Choice
```typescript
const MULTI_CHOICE_PATTERNS = [
  /choose.*:\s*$/i,
  /select.*:\s*$/i,
  /pick.*:\s*$/i,
  /which.*\?\s*$/i,
  /enter.*\([\d-]+\)\s*:\s*$/i,
  /option.*:\s*$/i
];

// Detect numbered lists
const NUMBERED_LIST = /^\s*\d+\)\s+.+/;
```

### 3. Open Input Requests
```typescript
const INPUT_REQUEST_PATTERNS = [
  /please enter.*:\s*$/i,
  /what.*\?\s*$/i,
  /provide.*:\s*$/i,
  /specify.*:\s*$/i,
  /name.*:\s*$/i,
  /path.*:\s*$/i
];
```

### 4. Task Completion
```typescript
const COMPLETION_PATTERNS = [
  /✓\s+.+/,
  /✗\s+.+/,
  /completed?\s+successfully/i,
  /finished\s+.+/i,
  /done\s+.+/i,
  /error:\s+.+/i,
  /failed:\s+.+/i
];
```

### 5. Claude-Specific Patterns
```typescript
const CLAUDE_PATTERNS = {
  thinking: /^I'll\s+|^Let me\s+|^I'm going to\s+/i,
  question: /^Should I\s+|^Would you like\s+|^Do you want\s+/i,
  needsInput: /^I need\s+|^Please\s+|^Could you\s+/i
};
```

## Implementation Design

### API Interface
```typescript
interface InputDetectionOptions {
  patterns?: 'all' | 'input' | 'completion' | 'custom';
  customPatterns?: RegExp[];
  contextLines?: number;  // How many lines before/after to include
  debounceMs?: number;    // Wait for input to settle
}

interface InputEvent {
  type: 'yes-no' | 'multi-choice' | 'open-input' | 'completion' | 'error';
  sessionId: string;
  timestamp: Date;
  prompt: string;
  context: string[];      // Previous lines for context
  options?: string[];     // For multiple choice
  confidence: number;     // How sure we are this needs input
}

// Usage
sessionManager.watchForInput(sessionId, {
  patterns: 'all',
  contextLines: 5,
  debounceMs: 1000  // Wait 1s of no output before alerting
}, (event: InputEvent) => {
  // Send notification to user
  notificationService.send({
    title: 'Claude needs your input',
    body: event.prompt,
    data: { sessionId, type: event.type }
  });
});
```

### Detection Flow

1. **Buffer Monitoring**
   - Watch for new output in session
   - Keep sliding window of last N lines
   
2. **Pattern Matching**
   - Check each new line against patterns
   - Look for multi-line patterns (numbered lists)
   
3. **Debouncing**
   - Wait for output to stop (Claude finished typing)
   - Prevents false positives mid-output
   
4. **Context Extraction**
   - Grab surrounding lines
   - Extract options from numbered lists
   - Determine input type
   
5. **Event Emission**
   - Send structured event with all info
   - Include confidence score

### Smart Features

#### Option Extraction
```typescript
// From:
"Which would you prefer?
1) Refactor the entire module
2) Fix just the critical bug
3) Add tests first
Enter choice (1-3): "

// Extract:
{
  type: 'multi-choice',
  prompt: 'Which would you prefer?',
  options: [
    'Refactor the entire module',
    'Fix just the critical bug', 
    'Add tests first'
  ]
}
```

#### Inactivity Detection
```typescript
// Claude started something but stopped
"I'll analyze the codebase to find the issue..."
// [No output for 30 seconds]
→ Notification: "Claude may need assistance"
```

#### Smart Grouping
```typescript
// Don't send multiple notifications for related prompts
"Delete file1.js? (y/n): "
"Delete file2.js? (y/n): "
"Delete file3.js? (y/n): "
→ Single notification: "Claude has 3 pending questions"
```

## Mobile Integration

### Notification Actions
```typescript
// For yes/no prompts
notification.actions = [
  { id: 'yes', title: 'Yes' },
  { id: 'no', title: 'No' }
];

// For multiple choice
notification.actions = event.options.map((opt, i) => ({
  id: String(i + 1),
  title: opt.substring(0, 30) + '...'
}));
```

### Quick Responses
User can respond directly from notification without opening app:
- Tap "Yes" → Send "y\n" to terminal
- Tap option → Send "1\n" to terminal

## Testing Strategy

### Test Cases
1. Simple yes/no prompts
2. Complex multiple choice with formatting
3. Open-ended input requests
4. Rapid multiple prompts
5. False positives (code output that looks like prompts)
6. Claude-specific language patterns
7. Task completion messages
8. Error messages

### Example Test
```typescript
it('should detect yes/no prompt', async () => {
  const events: InputEvent[] = [];
  sessionManager.watchForInput(sessionId, {}, (e) => events.push(e));
  
  // Simulate Claude output
  bufferManager.addToBuffer(sessionId, 
    'Analyzing files...\n' +
    'Found 5 unused imports.\n' +
    'Should I remove them? (y/n): '
  );
  
  // Wait for debounce
  await delay(1100);
  
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('yes-no');
  expect(events[0].prompt).toBe('Should I remove them? (y/n): ');
});
```

## Configuration

### Default Settings
```typescript
const DEFAULT_CONFIG = {
  debounceMs: 1000,      // Wait 1s after output stops
  contextLines: 10,      // Include 10 lines of context
  confidence: 0.8,       // 80% confidence threshold
  groupingWindowMs: 5000 // Group related prompts within 5s
};
```

### Per-Session Overrides
```typescript
// For interactive sessions, reduce debounce
sessionManager.createSession({
  command: 'claude-code',
  watchOptions: {
    debounceMs: 500,  // Faster response
    patterns: 'input' // Only watch for input, not completion
  }
});
```

## Future Enhancements

1. **ML-Based Detection**
   - Train on actual Claude Code outputs
   - Better false positive detection
   
2. **Response Prediction**
   - Suggest likely responses based on context
   - "Claude usually gets 'yes' for this type of question"
   
3. **Voice Input**
   - "Hey Siri, tell Claude yes"
   
4. **Batch Operations**
   - "Yes to all" for repeated similar prompts
   
5. **Context-Aware Notifications**
   - Include relevant code snippets
   - Show what Claude is trying to do