# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2025-07-14

### Fixed
- **Critical**: WebSocket connections now work correctly when using `createShelltender()` with Express
  - Fixed issue where WebSocket upgrade handler wasn't attached when user calls `app.listen()`
  - WebSocket path (e.g., `/ws`) now properly handles upgrade requests
- **Critical**: Session creation no longer crashes in Alpine Linux containers
  - Default shell changed from `/bin/bash` to `process.env.SHELL || '/bin/sh'`
  - Better error messages when shell is not found
  - Improved error context for debugging PTY creation failures
- Session persistence now respects `dataDir` configuration option
  - Previously always saved to `.sessions/` regardless of configuration
- Missing convenience methods added to main instance
  - `getSession()`, `getAllSessions()`, and `resizeSession()` now available directly
  - Provides consistent API without needing to access `sessionManager` property
- Server lifecycle fixed when using Express integration
  - No longer creates unused internal HTTP server
  - Properly defers WebSocket setup until after `app.listen()` is called

### Changed
- Better default working directory (uses `process.cwd()` instead of `$HOME`)
- Improved error handling throughout session creation process

### Developer Notes
This release addresses critical issues discovered by the PocketDev team when implementing Shelltender v0.6.0 in Docker containers. The fixes ensure that the "convenience" APIs actually provide convenience rather than confusion.

## [0.6.0] - 2025-07-13

### Added
- Convenience APIs for zero-configuration setup
  - `createShelltenderServer()` - Single-line server setup with all features
  - `startShelltender()` - Automatic server startup with logging
  - `createShelltender()` - Programmatic server creation
- Bundled CSS support for @shelltender/client package
  - Components now include all required styles
  - Import with `import '@shelltender/client/styles.css'`
  - No external CSS dependencies required
- Comprehensive quickstart guide and v0.6.0 documentation
- Minimal demo application showcasing best practices

### Fixed
- Terminal component session isolation - terminals only display their assigned session's output
- Session tab switching no longer causes text scrambling
- Client package CSS exports now work correctly with Vite and other bundlers
- Removed unnecessary output state tracking in useShelltender hook that caused performance issues
- Duplicate session creation when using both useShelltender and Terminal components
  - WebSocketServer now checks for existing sessions before creating new ones
  - Prevents creation of duplicate sessions with the same ID

### Changed
- Improved developer experience with simpler API surface
- Better error messages when WebSocket connections fail
- Cleaner separation between server and client concerns

## [0.5.0] - 2025-07-10

### ⚠️ BREAKING CHANGES
- Default server configuration changed to single port mode
  - Previously: HTTP on port 3000, WebSocket on port 8080 (separate)
  - Now: Both HTTP and WebSocket on port 8080 (single port)
  - WebSocket endpoint moved from `ws://host:8080` to `ws://host:8080/ws`
  - To use old behavior: set `SINGLE_PORT=false PORT=3000 WS_PORT=8080`

### Fixed
- WebSocket connection race condition in useWebSocket hook
  - Service is now synchronously initialized to ensure availability on first render
  - Eliminates "WebSocket service not available" errors
  - No API changes - purely an internal fix

### Added
- Unified server support in WebSocketServer
  - New factory method `WebSocketServer.create()` for flexible initialization
  - Can now attach to existing HTTP servers via `WebSocketServerOptions`
  - Maintains backward compatibility with port-only initialization
  - Enables integration with existing Express/HTTP server setups
- Single port mode as default deployment configuration
  - HTTP API and WebSocket now share the same port (default: 8080)
  - Automatic client detection of server mode via /api/health endpoint
  - Simplifies deployment, proxy configuration, and firewall rules
  - Dual port mode still available via SINGLE_PORT=false
- Post-build validation script for Terminal component
  - Verifies @__PURE__ annotation preservation in bundled output
  - Ensures forwardRef optimization issues don't resurface
  - Run automatically after build via `npm run build`
- Bundler compatibility documentation
  - Comprehensive guide for Terminal component integration
  - Covers known issues with Vite, Webpack, and other bundlers
  - Includes troubleshooting steps and workarounds

### Changed
- Enhanced WebSocketService event handling
  - Migrated from single handlers to Set-based collections
  - Supports multiple event listeners without conflicts
  - Improved cleanup with proper handler removal
- Default deployment configuration to single port mode
  - Demo app now defaults to port 8080 for both HTTP and WebSocket
  - Docker compose updated to use single port configuration
  - All README examples updated to show single port setup
  - Environment template (.env.example) updated with new defaults

### Developer Notes
- Two Terminal component tests marked as technical debt (skipped)
- Tests need refactoring to reduce mocking and improve maintainability

## [0.4.5] - 2025-07-08

### Fixed
- Terminal forwardRef now properly preserved during bundling with `@__PURE__` annotation
  - Fixes issue where Terminal ref callback was never called in bundled environments
  - Addresses known esbuild limitation with React.forwardRef optimization
  - No API changes - purely a build fix

## [0.4.4] - 2025-07-08

### Fixed
- Terminal component ref now works correctly in Vite and other bundled environments
  - Changed export pattern to use `Object.assign()` to prevent bundlers from stripping `forwardRef`
  - Fixes issue where Terminal ref callback was never called in production builds
  - Maintains full backward compatibility - no API changes

### Added
- Documentation explaining Vite optimization issues and workarounds
- Bundler-resistant pattern for ForwardRef components

## [0.4.3] - 2025-07-08

### Fixed
- WebSocketService now properly handles relative URLs (e.g., `/shelltender-ws`) by constructing full WebSocket URLs
  - Relative paths are converted to full ws:// or wss:// URLs based on current protocol
  - Enables proper proxy configuration in development environments

## [0.4.2] - 2025-07-08

### Fixed
- **Critical WebSocket configuration bug** - Terminal component now properly uses the shared WebSocket service from `useWebSocket` hook
  - WebSocketProvider configuration is now respected (custom URLs, ports, protocols)
  - Terminal no longer creates its own WebSocketService instance
  - Fixes issue where Terminal would always try to connect to default port 8080
  - Proper resource sharing - only one WebSocket connection across all components
  - No breaking changes - existing code continues to work, configuration just works now

### Changed
- Terminal component now imports and uses `useWebSocket` hook
- Removed direct WebSocketService instantiation from Terminal
- Terminal no longer manages WebSocket lifecycle (connect/disconnect)

### Added
- Test coverage for WebSocket configuration behavior
- Documentation explaining the fix and proper usage

## [0.4.1] - 2025-07-08

### Added
- Terminal component now exposes `focus()` method via ref for programmatic focus control
  - Enables proper focus management when switching between hidden/shown terminals
  - Eliminates need for DOM query workarounds

## [0.4.0] - 2025-07-07

### Added
- Robust resize handling for Terminal component
  - ResizeObserver-based detection for flexbox containers
  - Imperative API via ref for manual terminal fitting (`terminalRef.current?.fit()`)
  - Retry mechanism for initial fit (up to 5 attempts)
  - Debug prop for troubleshooting resize issues
  - Configurable padding via prop instead of hardcoded CSS
- Comprehensive Terminal customization options
  - `padding` - Configurable terminal padding (number or per-side object)
  - `fontSize` - Terminal font size (default: 14)
  - `fontFamily` - Terminal font family (default: 'Consolas, Monaco, monospace')
  - `theme` - Full theme customization with TerminalTheme interface
    - Basic colors: background, foreground, cursor, cursorAccent, selection
    - ANSI colors: black, red, green, yellow, blue, magenta, cyan, white
    - Bright ANSI colors: brightBlack, brightRed, etc.
  - `cursorStyle` - Cursor style: 'block' | 'underline' | 'bar' (default: 'block')
  - `cursorBlink` - Enable/disable cursor blinking (default: true)
  - `scrollback` - Number of scrollback lines (default: 10000)
- TerminalHandle and TerminalTheme TypeScript exports
- Terminal Customization demo page showcasing all configuration options
  - Live preview with interactive controls
  - Predefined themes (Default, VS Code, Monokai)
  - Code generation for configuration
- Centralized CSS design system for mobile components
- Enhanced mobile virtual keyboard with modular architecture
- Comprehensive test coverage for all new features
- Updated documentation with configuration examples

### Fixed
- Terminal resize issues with flexbox containers
- CSS padding conflicts (removed hardcoded 4px padding)
- Memory leaks in resize event handlers
- WebSocket event listener cleanup on unmount
- Context menu event listener cleanup
- Clipboard API error handling
- Dimension validation before sending resize to server
- TypeScript build issues across all packages
- React act() warnings in tests

### Changed
- Terminal component now uses forwardRef for imperative API
- Moved from window resize events to ResizeObserver as primary resize detection
- Improved error handling throughout Terminal component
- Enhanced initial fit timing with proper layout detection
- Refactored mobile support with improved architecture
- Modularized useTouchGestures hook for better maintainability
- Improved development environment and build configuration

## [0.3.0] - 2025-06-30

### Added
- AI Monitor Integration for monitoring AI-related terminal sessions
  - Standalone server for detecting AI CLI tools (Claude, Aider, etc.)
  - Pattern matchers for AI-specific behaviors (thinking animations, prompts)
  - REST API for monitoring status
  - Docker integration with separate container support
- EventEmitter support to SessionManager for `data` and `sessionEnd` events
- TerminalDataPipeline for processing terminal data through filters and processors
- PipelineIntegration to connect SessionManager → Pipeline → BufferManager → WebSocket

### Fixed
- React `act()` warnings in mobile terminal tests
- Session creation time display in SessionManager UI

### Changed
- Refactored WebSocketServer to break down god functions for better maintainability
- Removed console.log statements throughout the codebase
- Improved Docker development scripts with better error handling
- Enhanced TypeScript configurations for better ESM support
- Updated dependencies in demo application

## [0.2.6] - 2025-06-29

### Added
- Environment file patterns to .gitignore for better security
- AI assistant API key support in docker-compose.yml (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)
- Terminal input readiness check to prevent race conditions

### Fixed
- Terminal input race condition where users could type before session was ready
- Docker container now runs as non-root user for improved security

### Changed
- Enhanced RELEASE_GUIDE.md with comprehensive Claude-specific improvements

### Removed
- Obsolete test-terminal.js file

## [0.2.5] - 2025-06-29

### Added
- AI coding assistant CLIs to development container (Claude Code, OpenAI CLI, Google Gemini CLI)
- Comprehensive debugging tools for demo application
- Dynamic pattern library with enhanced filtering and organization
- Docker support for containerized development
- Observer pattern implementation for terminal data processing
- Terminal data pipeline with processors and filters
- Common patterns and agentic coding patterns for output detection
- Enhanced pattern matching system with factory pattern
- Pipeline integration for seamless data processing
- ESM validation script for build verification
- WSL network scripts for improved Windows development

### Fixed
- WebSocket 'created' event type migration completed
- Test terminal script for WebSocket validation
- Package export configuration for proper ESM/CJS compatibility

### Changed
- Improved monorepo structure with tsup build system
- Enhanced TypeScript configurations across all packages
- Updated demo app with better error boundaries and UI components

## [0.2.4] - 2025-06-28

### Fixed
- **Critical**: Fixed SessionStore async initialization race condition that caused "loadAllSessions is not a function" error
  - Added `initialize()` method to SessionStore for proper async initialization
  - Updated all SessionStore methods to ensure initialization before operations
  - Updated demo app and examples to properly await SessionStore initialization
- Multiple ESM build system issues across all packages
  - Migrated @shelltender/core to tsup build system
  - Migrated @shelltender/server to tsup build system  
  - Migrated @shelltender/client to proper ESM build
  - Migrated shelltender combined package to tsup
- Demo app tsconfig for standalone build
- CSS styling issues and improved desktop UI
- Mobile keyboard accessibility

### Added
- Custom session ID support
  - Added `id?: string` field to SessionOptions interface
  - SessionManager now respects provided session IDs instead of always generating UUIDs
  - Enables downstream applications to use predictable session identifiers
- Improved WebSocket error handling and logging
  - Better error messages when session creation fails
  - Added detailed logging for debugging data flow issues
  - Changed WebSocket response type from 'create' to 'created' for consistency
- Comprehensive troubleshooting documentation (docs/TROUBLESHOOTING.md)
- Minimal integration example (packages/server/examples/minimal-integration.ts)
- **Mobile Support** (v0.2.0 features)
  - Comprehensive mobile support with multi-touch gestures
  - Enhanced virtual keyboard with terminal-specific key sets
  - Mobile-optimized UI components
  - Touch gesture support (2-finger copy, 3-finger paste, swipe navigation)
  - Custom key set creation and persistence
- Observer pattern for terminal data processing
- Enhanced release guide for fresh Claude instances with detailed automation notes
- Claude-friendly release automation guide with step-by-step instructions

### Changed
- SessionManager now saves actual working directory instead of process.env.HOME
- Improved error handling in SessionStore with proper error propagation
- Configured servers to bind to 0.0.0.0 for mobile testing
- Use standard WebSocket port 8080 as default
- Improved release documentation for better automation support
- Cleanup of ESM migration workaround scripts

### Developer Notes
This release includes all changes since v0.1.0, including the v0.2.0 mobile support features and v0.2.3 critical fixes that were not previously published to npm. It addresses all integration issues reported by downstream teams, particularly around initialization order and session ID management.

## [0.2.3] - Not Released
*Note: Version 0.2.3 was tagged in the codebase but never published to npm. All changes are included in v0.2.4.*

## [0.1.0] - 2025-06-14

### Added
- **Monorepo Structure** - Complete transformation to modular npm packages
  - `@shelltender/core` (0.1.0) - Shared types, interfaces, and constants with zero dependencies
  - `@shelltender/server` (0.1.0) - Backend terminal session management  
  - `@shelltender/client` (0.1.0) - React components and hooks for terminal UI
  - `shelltender` (0.1.0) - Combined package for convenience
- Demo application in `apps/demo` showcasing package usage
- npm workspace configuration for efficient development
- TypeScript project references for better build performance
- Package-specific test suites (78 total tests across all packages)
- Modular documentation with package-specific READMEs

### Changed
- **BREAKING**: Restructured entire codebase from single application to modular packages
- All imports now use package names (`@shelltender/core`) instead of relative paths
- Moved shared types from `src/shared/types.ts` to `@shelltender/core`
- Separated server and client code into independent, publishable packages
- Updated build system to support workspace builds
- Enhanced test structure with package-specific test directories
- Improved documentation to reflect monorepo structure

### Technical Improvements
- Zero dependencies in core package for maximum compatibility
- Express as peer dependency in server package for flexibility
- React 18/19 support in client package
- Each package independently buildable and testable
- Consistent versioning across all packages (0.1.0)

## [Unreleased]

### Added
- Comprehensive testing framework using Vitest
  - 68 total tests (34 backend + 34 frontend)
  - Unit tests for SessionManager, BufferManager, RestrictedShell
  - Integration tests for WebSocket communication
  - Frontend component tests for SessionManager and SessionTabs
  - WebSocket service tests with reconnection logic
- RestrictedShell for sandboxed terminal sessions
  - Filesystem access restrictions
  - Command filtering capabilities
  - Safe environment for untrusted code execution
- Programmatic input methods for AI/automation
  - `sendCommand()` - Send commands with automatic newline
  - `sendRawInput()` - Send raw input without modification
  - `sendKey()` - Send special keys (ctrl-c, ctrl-d, ctrl-z, ctrl-r, tab, escape, arrows)
- Session persistence across server restarts
  - Sessions saved to `.sessions` directory
  - Automatic restoration on server startup
  - Maintains terminal state and buffer
- Special key support including ctrl-r for reverse search
- Monorepo architecture documentation
  - Detailed package structure (@shelltender/core, server, client)
  - Implementation strategy and timeline
  - Testing and documentation guidelines
- PocketDev integration documentation
  - AI-initiated session workflows
  - Git worktree integration patterns
  - Task-based development model

### Changed
- Migrated from Jest to Vitest for better ESM support
- Updated project name from "mobile-persistent-terminal-sessions" to "shelltender"
- Enhanced SessionManager with new capabilities
  - Support for custom commands on session creation
  - Restricted session options
  - Programmatic control methods

### Fixed
- ESM/CommonJS compatibility issues in test environment
- WebSocket mock implementation for testing
- Test assertions for buffer truncation behavior
- Reconnection logic test expectations

### Documentation
- Created comprehensive ARCHITECTURE.md for monorepo plans
- Added POCKETDEV_INTEGRATION.md for specific use case
- Updated README.md with new features and testing instructions
- Enhanced CLAUDE.md with project context

## [0.0.1] - Initial Development

### Added
- Core terminal functionality with xterm.js
- Persistent sessions that survive browser closure
- Multi-tab synchronization via WebSocket
- Session management UI (tabs and modal)
- 10,000 line scrollback buffer
- Automatic reconnection with exponential backoff
- Paste support with multiple fallback methods
- Basic session operations (create, connect, kill, resize)