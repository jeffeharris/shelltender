# Supporting AI Coding Assistants in Shelltender

## Generic Pattern for AI Assistant Support

### 1. Authentication Patterns

All AI assistants follow similar authentication patterns:

```yaml
# Common environment variables pattern
<PROVIDER>_API_KEY=your-key-here

# Examples:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### 2. Installation Pattern

```dockerfile
# Generic pattern for NPM-based AI tools
RUN npm install -g @<provider>/<tool-name>

# Examples:
RUN npm install -g \
    @anthropic-ai/claude-code \
    openai-cli \
    @google/gemini-cli \
    @cursor/cursor-cli \        # Future
    @github/copilot-cli \       # Future
    @codeium/cli                # Future
```

### 3. Common Terminal Patterns

All AI coding assistants exhibit similar terminal behaviors:

#### Status Indicators
- **Animation symbols**: Rotating characters during processing
- **Progress indicators**: Percentages, time elapsed, token counts
- **Terminal title changes**: Updates to show current task

#### Input Patterns
- **Confirmation prompts**: (y/n), [Y/n], (confirm/cancel)
- **Multiple choice**: Numbered lists with selection
- **Open questions**: Prompts ending with "?" or ":"

#### UI Elements
- **Box drawing**: ╭─╮ ╰─╯ for structured output
- **Status lines**: Processing status with metadata
- **Progress bars**: Visual progress indicators

### 4. Adding New AI Assistants

To add support for a new AI assistant:

1. **Update Dockerfile**:
```dockerfile
# Add to AI tools section
RUN npm install -g @newprovider/newtool-cli
```

2. **Add Environment Variables**:
```yaml
# docker-compose.yml
- NEWPROVIDER_API_KEY=${NEWPROVIDER_API_KEY:-}
```

3. **Add Pattern Detection** (if unique patterns):
```typescript
// In AgenticCodingPatterns.ts
newProvider: {
  thinking: {
    name: 'newprovider-thinking',
    type: 'regex',
    pattern: /their-specific-pattern/,
    description: 'NewProvider thinking indicator'
  }
}
```

4. **Update Documentation**:
- Add to AI_ASSISTANTS.md
- Include auth method
- Document any unique behaviors

### 5. Pattern Detection Strategy

Instead of tool-specific patterns, focus on generic behaviors:

```typescript
// Generic patterns that work across tools
const UNIVERSAL_AI_PATTERNS = {
  // Animation during processing
  animationSymbols: /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏·✢*✶✻✽✺●○◉◎]/,
  
  // Progress indicators
  percentageProgress: /(\d{1,3})%/,
  tokenCount: /([\d.]+k?)\s*tokens?/,
  timeElapsed: /(\d+)s\s*elapsed|\((\d+)s\)/,
  
  // Terminal control
  titleChange: /\x1b\][012];([^\x07\x1b]+)(?:\x07|\x1b\\)/,
  
  // Common prompts
  confirmation: /\(y\/n\)|confirm\?|proceed\?/i,
  selection: /select|choose|pick|option/i
};
```

### 6. Extensibility Considerations

1. **Plugin Architecture**: Consider allowing pattern sets to be loaded dynamically
2. **Configuration Files**: Allow users to define custom patterns per tool
3. **Auto-detection**: Detect which AI tool is running based on initial output
4. **Shared Behaviors**: Most AI tools share 80% of behaviors - focus on these

### 7. Testing New AI Tools

When adding a new AI tool:

1. **Capture Output**: Record terminal sessions with the new tool
2. **Analyze Patterns**: Look for unique indicators
3. **Test Detection**: Verify patterns work reliably
4. **Document Differences**: Note any unique behaviors

### 8. Future AI Tools to Consider

- **Cursor CLI**: Terminal version of Cursor IDE
- **GitHub Copilot CLI**: Official CLI when released
- **Codeium CLI**: Free AI coding assistant
- **Tabnine CLI**: AI code completion
- **Amazon CodeWhisperer CLI**: AWS AI coding
- **Replit Ghostwriter CLI**: Replit's AI assistant

### 9. Best Practices

1. **Avoid Over-Specification**: Don't create patterns too specific to one tool
2. **Version Agnostic**: Patterns should work across versions
3. **Graceful Degradation**: System should work even if patterns don't match
4. **User Customization**: Allow users to add their own patterns
5. **Performance**: Compile regex patterns once, reuse for all sessions

This approach ensures Shelltender can support any AI coding assistant, both current and future, without major code changes.