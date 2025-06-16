# Terminal Event System Demo

The demo application now includes comprehensive examples of the Terminal Event System.

## Features Demonstrated

### 1. Event Monitor (Simple View)
Click "Show Event Monitor" at the bottom of the terminal to see a simple real-time view of:
- **Error Events**: Captures any text matching `error:` or `failed:` (case-insensitive)
- **Success Events**: Captures text matching `success`, `completed`, or `done`

### 2. Pattern Library (Advanced View)
Click "Show Pattern Library" to access the full event system demo featuring:

#### Pre-built Patterns
- **npm-install**: Detects npm install commands
- **build-status**: Captures build success/failure with timing
- **test-results**: Extracts test pass/fail counts
- **git-commands**: Monitors git command usage
- **error-detection**: Comprehensive error pattern matching
- **warning-detection**: Warning message detection
- **prompt-detection**: Detects shell prompts
- **progress-percentage**: Captures percentage progress indicators

#### Custom Patterns
Create your own regex patterns on the fly:
1. Enter a pattern name
2. Enter a regex pattern (without slashes)
3. Click "Register Pattern"

#### Event Visualization
- Events grouped by pattern type
- Timestamps for each match
- Captured groups displayed (for regex with capture groups)
- Shows last 5 events per pattern with count of additional events

## Try It Out

### Basic Commands to Test
```bash
# Trigger error detection
echo "Error: File not found"
ls /nonexistent 2>&1

# Trigger build status
echo "Build succeeded in 2.3s"
echo "Build failed in 1.2s"

# Trigger test results
echo "Tests: 45 passed, 2 failed"

# Trigger git commands
git status
git add .
git commit -m "test"

# Trigger progress
echo "Processing: 25%"
echo "Upload: 75%"
```

### Pattern Testing Script
Create a test script to see multiple patterns in action:
```bash
cat > test_events.sh << 'EOF'
#!/bin/bash
echo "Starting build process..."
sleep 1
echo "Compiling: 25%"
sleep 1
echo "Compiling: 50%"
sleep 1
echo "Compiling: 75%"
sleep 1
echo "Compiling: 100%"
echo "Build succeeded in 4.2s"
echo ""
echo "Running tests..."
sleep 1
echo "Tests: 142 passed, 0 failed"
echo ""
echo "Checking git status..."
git status
EOF

chmod +x test_events.sh
./test_events.sh
```

## Technical Details

### Event Flow
1. Terminal output is captured server-side in BufferManager
2. EventManager processes each chunk against registered patterns
3. Matches are broadcast via WebSocket as terminal events
4. Client components receive and display events in real-time

### Performance
- Debouncing prevents duplicate events from rapid matches
- Client-side event limit (default 1000, demo uses 100)
- Pattern matching happens asynchronously with setImmediate
- Only active patterns are processed

### Configuration
- WebSocket URL: Set `REACT_APP_WS_URL` environment variable
- Event History: Configurable via `maxEvents` option
- Pattern Persistence: Optional server-side storage

## Development Tips

### Creating Custom Matchers
```typescript
// Register a pattern that detects Python tracebacks
await registerPattern({
  name: 'python-traceback',
  type: 'regex',
  pattern: /Traceback[\s\S]*?^\S+Error:.*/m,
  options: { 
    debounce: 500,
    multiline: true 
  }
});
```

### Subscribing to Events
```typescript
// In your component
const { events, registerPattern } = useTerminalEvents(sessionId);

// Filter for specific event types
const errors = events.filter(e => 
  e.type === 'pattern-match' && 
  e.patternName === 'error-detection'
);
```

### Event-Driven Actions
```typescript
// React to specific patterns
useEffect(() => {
  const buildComplete = events.find(e => 
    e.type === 'pattern-match' && 
    e.patternName === 'build-status'
  );
  
  if (buildComplete) {
    // Trigger notification, update UI, etc.
  }
}, [events]);
```