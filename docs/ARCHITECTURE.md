# Shelltender Monorepo Architecture Design

## Overview

This document outlines the monorepo restructuring plan for Shelltender, transforming it from a single application into a set of modular, publishable npm packages while maintaining an all-in-one option.

## Goals

1. **Modularity**: Enable users to use only the parts they need
2. **Reusability**: Allow embedding Shelltender components into other applications
3. **Maintainability**: Clear separation of concerns between packages
4. **Flexibility**: Support both modular and all-in-one usage patterns
5. **Publishing**: Create npm-publishable packages for the community

## Package Structure

```
shelltender/
├── packages/
│   ├── @shelltender/core/        # Shared types, interfaces, constants
│   ├── @shelltender/server/      # Backend server implementation
│   ├── @shelltender/client/      # Frontend React components
│   └── shelltender/              # All-in-one combined package
├── apps/
│   └── demo/                     # Demo application
├── docs/                         # Documentation
└── tools/                        # Build tools and scripts
```

## Package Details

### @shelltender/core

**Purpose**: Shared types, interfaces, and utilities used across all packages

**Structure**:
```
@shelltender/core/
├── src/
│   ├── types/
│   │   ├── terminal.ts
│   │   ├── session.ts
│   │   └── websocket.ts
│   ├── constants/
│   │   └── index.ts
│   ├── utils/
│   │   ├── id.ts
│   │   └── validation.ts
│   └── index.ts
├── tests/
│   ├── utils/
│   │   ├── id.test.ts
│   │   └── validation.test.ts
│   └── types.test.ts
├── package.json
└── tsconfig.json
```

**Exports**:
- TypeScript interfaces (`TerminalSession`, `TerminalData`, etc.)
- Constants (WebSocket message types, defaults)
- Utility functions (ID generation, validation)
- Event types and enums

**Dependencies**: None (pure TypeScript)

**Example Usage**:
```typescript
import { TerminalSession, TerminalData, MessageType } from '@shelltender/core';
```

### @shelltender/server

**Purpose**: Server-side terminal session management

**Structure**:
```
@shelltender/server/
├── src/
│   ├── SessionManager.ts
│   ├── BufferManager.ts
│   ├── RestrictedShell.ts
│   ├── SessionStore.ts
│   ├── WebSocketServer.ts
│   ├── middleware/
│   │   └── express.ts
│   └── index.ts
├── tests/
│   ├── SessionManager.test.ts
│   ├── BufferManager.test.ts
│   ├── RestrictedShell.test.ts
│   ├── SessionStore.test.ts
│   └── integration/
│       └── websocket.test.ts
├── package.json
└── tsconfig.json
```

**Exports**:
- `SessionManager` - Main session orchestrator
- `BufferManager` - Terminal output buffering
- `RestrictedShell` - Sandboxed shell sessions
- `SessionStore` - Persistence layer
- `WebSocketServer` - WebSocket communication
- Express middleware for easy integration

**Dependencies**:
- @shelltender/core
- node-pty
- ws
- express (peer dependency)

**Example Usage**:
```typescript
import { SessionManager, WebSocketServer } from '@shelltender/server';

const sessionManager = new SessionManager();
const wsServer = new WebSocketServer(server, sessionManager);
```

### @shelltender/client

**Purpose**: React components and hooks for terminal UI

**Structure**:
```
@shelltender/client/
├── src/
│   ├── components/
│   │   ├── Terminal/
│   │   │   ├── Terminal.tsx
│   │   │   ├── Terminal.test.tsx
│   │   │   └── index.ts
│   │   ├── SessionTabs/
│   │   │   ├── SessionTabs.tsx
│   │   │   ├── SessionTabs.test.tsx
│   │   │   └── index.ts
│   │   ├── SessionManager/
│   │   │   ├── SessionManager.tsx
│   │   │   ├── SessionManager.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useTerminal.ts
│   │   ├── useWebSocket.ts
│   │   ├── useSession.ts
│   │   └── __tests__/
│   │       ├── useTerminal.test.ts
│   │       └── useWebSocket.test.ts
│   ├── services/
│   │   ├── WebSocketService.ts
│   │   └── __tests__/
│   │       └── WebSocketService.test.ts
│   ├── context/
│   │   └── TerminalProvider.tsx
│   ├── styles/
│   │   └── terminal.css
│   └── index.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Exports**:
- Components:
  - `<Terminal />` - xterm.js terminal component
  - `<SessionTabs />` - Tab bar for sessions
  - `<SessionManager />` - Session management modal
  - `<TerminalProvider />` - Context provider
- Hooks:
  - `useTerminal()` - Terminal instance management
  - `useWebSocket()` - WebSocket connection
  - `useSession()` - Session state management
- Services:
  - `WebSocketService` - Client-side WebSocket handler

**Dependencies**:
- @shelltender/core
- react, react-dom (peer dependencies)
- xterm
- tailwindcss (optional peer dependency)

**Example Usage**:
```typescript
import { Terminal, SessionTabs, useTerminal } from '@shelltender/client';

function App() {
  const { terminal, sessions } = useTerminal();
  return (
    <>
      <SessionTabs sessions={sessions} />
      <Terminal session={currentSession} />
    </>
  );
}
```

### shelltender

**Purpose**: Batteries-included package combining all components

**Structure**:
```
shelltender/
├── src/
│   ├── index.ts        # Re-exports from all packages
│   ├── server.ts       # Server-specific exports
│   ├── client.ts       # Client-specific exports
│   └── types.ts        # Type re-exports
├── tests/
│   └── integration/
│       └── combined.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Exports**: Everything from @shelltender/core, @shelltender/server, and @shelltender/client

**Dependencies**:
- @shelltender/core
- @shelltender/server  
- @shelltender/client

**Example Usage**:
```typescript
// Everything in one import
import { 
  SessionManager,     // from @shelltender/server
  Terminal,          // from @shelltender/client
  TerminalSession    // from @shelltender/core
} from 'shelltender';
```

## Application Structure

### apps/demo

The current application refactored as a demo/example:

**Structure**:
```
apps/demo/
├── src/
│   ├── server/
│   │   └── index.ts
│   ├── client/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   └── shared/
│       └── config.ts
├── tests/
│   ├── e2e/
│   │   ├── terminal.test.ts
│   │   └── session-management.test.ts
│   └── integration/
│       └── full-stack.test.ts
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

**Features**:
- Shows best practices for using the packages
- Serves as integration testing ground
- Provides a ready-to-run terminal application
- Can be used as a template for custom implementations
- Contains E2E tests demonstrating full workflows

## Implementation Strategy

### Core Principles
- Keep it simple - no overengineering
- Use modern standards (npm workspaces, ESM)
- Test and document as we go
- Ship working code at each phase

### Phase 1: Foundation Setup (Week 1)
1. **Configure npm workspaces**
   ```json
   // root package.json
   {
     "workspaces": ["packages/*", "apps/*"]
   }
   ```

2. **Create package structure**
   ```bash
   mkdir -p packages/{core,server,client,shelltender}
   mkdir -p apps/demo
   ```

3. **Set up base package.json files**
   - Use consistent versioning (0.1.0)
   - Configure TypeScript project references
   - Set up build scripts

4. **Update root test configuration**
   - Ensure tests can run across packages
   - Update CI to test all packages

### Phase 2: Extract Core Package (Week 1)
1. **Move shared types**
   - `src/shared/types.ts` → `packages/core/src/types/`
   - Extract interfaces only (no runtime code)
   - Zero dependencies

2. **Create tests for core**
   - Type validation tests
   - Export verification

3. **Update documentation**
   - Create `packages/core/README.md`
   - Document all exported types

### Phase 3: Split Server and Client (Week 2)
1. **Server package migration**
   - Move `src/server/*` → `packages/server/src/`
   - Update imports to use `@shelltender/core`
   - Migrate server tests
   - Create server README with examples

2. **Client package migration**
   - Move `client/src/*` → `packages/client/src/`
   - Extract styles to optional CSS file
   - Update imports to use `@shelltender/core`
   - Migrate client tests
   - Create client README with examples

3. **Fix all imports**
   - Use find/replace for import paths
   - Run all tests to verify

### Phase 4: Add Terminal Events & Combined Package (Week 3)
1. **Implement terminal event system**
   ```typescript
   // In SessionManager
   watch(sessionId: string, pattern: RegExp, callback: (match: string) => void): void;
   getOutput(sessionId: string, options?: { lines?: number }): string;
   ```
   - Add tests for event system
   - Document event API

2. **Create combined package**
   - Simple re-exports from all packages
   - Test that imports work correctly
   - Add combined package tests

3. **Update demo app**
   - Move current app to `apps/demo`
   - Update to use new package imports
   - Verify all functionality works

### Phase 5: Polish and Publish (Week 4)
1. **Documentation sweep**
   - API docs using TypeDoc
   - Update all READMEs
   - Add migration notes (even though no users yet)

2. **Final testing**
   ```bash
   # Test local installation
   npm pack packages/core
   cd test-project && npm install ../shelltender-core-0.1.0.tgz
   ```

3. **Publish to npm**
   ```bash
   npm publish packages/core
   npm publish packages/server  
   npm publish packages/client
   npm publish packages/shelltender
   ```

## Build and Development

### Development Workflow
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode for development
npm run dev

# Run tests
npm run test

# Run demo app
npm run demo
```

### Package Scripts
Each package will have standard scripts:
- `build` - Compile TypeScript
- `test` - Run package tests
- `lint` - Run linting
- `typecheck` - TypeScript checking

### Publishing Workflow
```bash
# Version packages
npm run version

# Build all packages
npm run build

# Publish to npm
npm run publish
```

## Considerations

### TypeScript Configuration
- Root `tsconfig.json` with base configuration
- Each package extends base with specific settings
- Use TypeScript project references for faster builds

### Testing Strategy

**Key Principle**: Update tests alongside code changes in each phase.

### Test Migration Plan
1. **Phase 1**: Update root test config to handle workspaces
2. **Phase 2**: Move type tests with core package
3. **Phase 3**: Migrate server/client tests with their code
4. **Phase 4**: Add new tests for terminal events
5. **Phase 5**: Add integration tests for package imports

### Unit Tests
- Each package contains its own unit tests
- Tests are co-located with source files or in `__tests__` directories
- Coverage targets: >80% for core logic
- Run tests after each code move: `npm test`

### Integration Tests
- Cross-package integration tests in each package's `tests/integration/`
- Full-stack integration tests in `apps/demo/tests/integration/`
- WebSocket communication tests
- Session persistence tests
- Terminal event system tests (new)

### E2E Tests
- Located in `apps/demo/tests/e2e/`
- Cover complete user workflows
- Test multi-tab synchronization
- Test session recovery scenarios
- Verify package integration works end-to-end

### Test Structure Summary
```
shelltender/
├── packages/
│   ├── @shelltender/core/tests/       # Core utility tests
│   ├── @shelltender/server/tests/     # Server unit + integration tests
│   ├── @shelltender/client/           # Component tests co-located
│   └── shelltender/tests/             # Combined package tests
└── apps/demo/tests/                   # E2E and full-stack tests
```

### Continuous Testing Commands
```bash
# During development
npm test                    # Run all tests
npm test packages/core      # Test specific package
npm run test:watch         # Watch mode

# Before commits
npm run test:coverage      # Ensure coverage maintained
```

### Documentation Strategy

**Key Principle**: Document as you code - don't leave it for the end.

### Documentation Updates by Phase
1. **Phase 1**: Update main README with new structure
2. **Phase 2**: Create core package README with type docs
3. **Phase 3**: Create server/client READMEs with examples
4. **Phase 4**: Document terminal event API
5. **Phase 5**: Generate API docs with TypeDoc

### Documentation Structure
```
shelltender/
├── README.md                          # Main project overview
├── docs/
│   ├── ARCHITECTURE.md               # This file
│   ├── POCKETDEV_INTEGRATION.md      # PocketDev use case
│   └── API.md                        # Generated from TypeDoc
├── packages/
│   ├── core/README.md                # Type definitions & interfaces
│   ├── server/README.md              # Server setup & API
│   ├── client/README.md              # React components & hooks
│   └── shelltender/README.md         # Combined usage
└── apps/demo/README.md               # Example implementation
```

### README Template for Packages
```markdown
# @shelltender/[package-name]

Brief description

## Installation
\`\`\`bash
npm install @shelltender/[package-name]
\`\`\`

## Usage
\`\`\`typescript
// Example code
\`\`\`

## API
[Key exports and methods]

## Examples
[Link to demo app]
```

### Backwards Compatibility
- The combined `shelltender` package maintains current API
- Individual packages allow gradual migration
- Clear upgrade path documentation

## Future Enhancements

### Additional Packages (Post-MVP)
- `@shelltender/auth` - Authentication providers
- `@shelltender/themes` - Terminal themes
- `@shelltender/plugins` - Plugin system
- `@shelltender/mobile` - React Native components

### Integration Packages
- `@shelltender/nextjs` - Next.js integration
- `@shelltender/express` - Express middleware
- `@shelltender/docker` - Containerized sessions

## Decisions Made

1. **Monorepo Tool**: npm workspaces (simple, built-in)
2. **Versioning Strategy**: Synchronized initially (0.1.0 for all)
3. **Build Tool**: Keep current setup (add complexity later if needed)
4. **CSS Strategy**: Optional import `@shelltender/client/styles.css`
5. **Bundle Size**: Address in future versions (focus on working code first)
6. **API Design**: Direct exports, no factories
7. **Config**: Runtime only, no config files
8. **Terminal Events**: Include basic version in v1

## Implementation Details

### Package.json Structure

**Root package.json**:
```json
{
  "name": "shelltender-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "lerna run build",
    "test": "lerna run test",
    "dev": "lerna run dev --parallel",
    "clean": "lerna clean -y && rm -rf node_modules"
  }
}
```

**@shelltender/core package.json**:
```json
{
  "name": "@shelltender/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
```

### File Migration Mapping

**Current Structure → New Structure**:
```
src/shared/types.ts → packages/@shelltender/core/src/types/
src/server/* → packages/@shelltender/server/src/
client/src/components/* → packages/@shelltender/client/src/components/
client/src/services/* → packages/@shelltender/client/src/services/
```

### API Compatibility Layer

To ensure backwards compatibility, the combined package should maintain the current import paths:

```typescript
// packages/shelltender/src/index.ts
export * from '@shelltender/core';
export * from '@shelltender/server';
export * from '@shelltender/client';

// Maintain legacy imports
export { SessionManager } from '@shelltender/server';
export { Terminal } from '@shelltender/client';
```

### CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm test
  
  publish:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx lerna publish --yes
```

### Development Dependencies

**Root Level**:
- lerna or nx
- typescript
- vitest
- eslint + config
- prettier

**Per Package**:
- Minimal, specific to package needs
- Shared configs via workspace references

## Release Strategy

### Initial Release Plan
1. **Alpha releases** (`0.0.x-alpha`) - Internal testing
2. **Beta releases** (`0.1.0-beta`) - Community testing
3. **Release Candidate** (`1.0.0-rc`) - Final testing
4. **Stable Release** (`1.0.0`) - Production ready

### Package Versioning
- Follow semantic versioning (semver)
- Consider synchronized versioning initially for simplicity
- Move to independent versioning as packages mature

## Risk Mitigation

### Potential Risks and Mitigations
1. **Breaking existing users**: Maintain backwards compatibility in combined package
2. **Complex build setup**: Start simple with npm workspaces, migrate to advanced tools later
3. **Package interdependencies**: Enforce strict dependency rules via linting
4. **Documentation drift**: Automate documentation generation from source
5. **Testing complexity**: Set up comprehensive CI pipeline from day one

## Success Criteria

1. All current functionality preserved
2. Packages can be used independently
3. Clear documentation for each package
4. Minimal breaking changes for existing users
5. Published to npm registry
6. Active community adoption
7. All tests passing with >80% coverage
8. Performance benchmarks maintained or improved

## Implementation Timeline

### Week 1-2: Foundation
- Set up monorepo structure
- Configure build tools
- Extract @shelltender/core

### Week 3-4: Package Split
- Move server code to @shelltender/server
- Move client code to @shelltender/client
- Update all imports

### Week 5-6: Integration
- Create combined package
- Set up demo app
- Comprehensive testing

### Week 7-8: Polish
- Documentation
- CI/CD setup
- Beta release preparation