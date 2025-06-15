# Shelltender Utility Scripts

## capture-terminal-output.js

A generic terminal output capture tool that records raw PTY output from any command for analysis.

### Usage
```bash
# Capture output from any command
node scripts/capture-terminal-output.js [command] [args...]

# Examples
node scripts/capture-terminal-output.js claude
node scripts/capture-terminal-output.js npm test
node scripts/capture-terminal-output.js python script.py
```

### Features
- Captures raw terminal output including ANSI codes
- Records timing information and user input
- Generates analysis JSON with:
  - ANSI escape sequences used
  - Time gaps (potential waiting states)
  - Line counts and byte counts
  - Potential prompt patterns
- Output saved to `terminal-captures/[command]-[timestamp].log`
- Analysis saved to `terminal-captures/[command]-[timestamp]-analysis.json`

### What It's For
This tool helps understand how terminal applications behave, which is essential for:
- Building pattern detection for the terminal event system
- Understanding ANSI escape sequences used by different tools
- Analyzing timing patterns (when apps are waiting vs processing)
- Testing shelltender's ability to capture and relay terminal output

### Example Session
```bash
# Capture a build process
$ node scripts/capture-terminal-output.js npm run build

# Capture a test run
$ node scripts/capture-terminal-output.js pytest -v

# Interactive session
$ node scripts/capture-terminal-output.js python
>>> print("Hello")
Hello
>>> exit()

# Analysis will show timing, ANSI codes, and patterns
```

The captured data can be used to build pattern matchers for shelltender's terminal event system.