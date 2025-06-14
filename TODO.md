# Shelltender Documentation TODO

This file tracks remaining documentation tasks for the Shelltender monorepo.

## Package Documentation

### High Priority

- [ ] Create README.md for `@shelltender/core`
  - Package description and purpose
  - Installation instructions
  - Type definitions overview
  - Usage examples
  - API reference

- [ ] Create README.md for `@shelltender/server`
  - Package description
  - Installation and setup
  - SessionManager usage
  - BufferManager usage
  - RestrictedShell usage
  - WebSocketServer integration
  - Configuration options
  - API reference

- [ ] Create README.md for `@shelltender/client`
  - Package description
  - Installation instructions
  - Component usage (Terminal, SessionTabs, SessionManager)
  - Hooks documentation (useTerminal, useWebSocket, useSession)
  - CSS import instructions
  - React integration examples
  - API reference

- [ ] Create README.md for `shelltender` (meta-package)
  - Purpose of combined package
  - Installation instructions
  - Quick start guide
  - Differences from individual packages
  - Migration from individual to combined

- [ ] Create README.md for `apps/demo`
  - How to run the demo
  - What features it demonstrates
  - Code walkthrough
  - Using as a template

### Medium Priority

- [ ] Generate API documentation with TypeDoc
  - Set up TypeDoc configuration
  - Generate docs for all packages
  - Host on GitHub Pages
  - Update main README API link

- [ ] Create CONTRIBUTING.md
  - Development setup
  - How to test across packages
  - Code style guide
  - PR process
  - Release process

- [ ] Add usage examples
  - Basic terminal setup
  - Session management
  - Custom configurations
  - Integration patterns
  - Terminal event system usage

### Low Priority

- [ ] Add badges to main README
  - npm version badges
  - License badge
  - Test status badge
  - Coverage badge

- [ ] Create troubleshooting guide
  - Common issues
  - ESM/CJS problems
  - Browser compatibility
  - Performance tips

- [ ] Document terminal event system
  - Pattern matching examples
  - Event handling patterns
  - Use cases for AI integration

## Templates

### Package README Template

```markdown
# @shelltender/[package-name]

Brief description of what this package provides.

## Installation

\`\`\`bash
npm install @shelltender/[package-name]
\`\`\`

## Usage

\`\`\`typescript
import { Component } from '@shelltender/[package-name]';

// Basic usage example
\`\`\`

## API Reference

### Main Exports

- `ExportName` - Description
- `AnotherExport` - Description

### Configuration Options

\`\`\`typescript
interface Options {
  // Document options
}
\`\`\`

## Examples

See the [demo app](../../apps/demo) for a complete working example.

## License

MIT
```

## Notes

- Each package README should be self-contained
- Include TypeScript examples where possible
- Link to demo app for full examples
- Keep API references concise (full docs in TypeDoc)
- Test all code examples before publishing