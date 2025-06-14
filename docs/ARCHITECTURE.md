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

## Migration Strategy

### Phase 1: Create Package Structure
1. Set up Lerna/npm workspaces
2. Create package directories
3. Set up base package.json files
4. Configure TypeScript project references

### Phase 2: Extract Core Package
1. Move shared types to @shelltender/core
2. Update imports in existing code
3. Ensure no circular dependencies

### Phase 3: Split Server and Client
1. Move server code to @shelltender/server
2. Move client code to @shelltender/client
3. Update import paths
4. Test inter-package dependencies

### Phase 4: Create Combined Package
1. Create shelltender package
2. Set up barrel exports
3. Test combined package usage

### Phase 5: Refactor Demo App
1. Move current app to apps/demo
2. Update to use packages
3. Add examples of different usage patterns

### Phase 6: Publishing Preparation
1. Add package documentation
2. Set up CI/CD for publishing
3. Add examples to README files
4. Version packages appropriately

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

### Unit Tests
- Each package contains its own unit tests
- Tests are co-located with source files or in `__tests__` directories
- Coverage targets: >80% for core logic

### Integration Tests
- Cross-package integration tests in each package's `tests/integration/`
- Full-stack integration tests in `apps/demo/tests/integration/`
- WebSocket communication tests
- Session persistence tests

### E2E Tests
- Located in `apps/demo/tests/e2e/`
- Cover complete user workflows
- Test multi-tab synchronization
- Test session recovery scenarios

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

### Documentation
- API documentation per package
- Integration guide
- Migration guide from current structure
- Example applications

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

## Questions to Resolve

1. **Monorepo Tool**: Lerna, npm workspaces, or pnpm?
2. **Versioning Strategy**: Independent or synchronized versioning?
3. **Build Tool**: Keep current setup or migrate to turborepo/nx?
4. **CSS Strategy**: How to handle styles in @shelltender/client?
5. **Bundle Size**: Optimization strategy for client package?

## Success Criteria

1. All current functionality preserved
2. Packages can be used independently
3. Clear documentation for each package
4. Minimal breaking changes for existing users
5. Published to npm registry
6. Active community adoption