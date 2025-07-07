# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Robust resize handling for Terminal component
  - ResizeObserver-based detection for flexbox containers
  - Imperative API via ref for manual terminal fitting (`terminalRef.current?.fit()`)
  - Retry mechanism for initial fit (up to 5 attempts)
  - Debug prop for troubleshooting resize issues
  - Configurable padding via prop instead of hardcoded CSS
- Additional Terminal customization props
  - `fontSize` - Terminal font size (default: 14)
  - `fontFamily` - Terminal font family (default: 'Consolas, Monaco, monospace')
  - `theme` - Comprehensive theme object for colors
  - `cursorStyle` - Cursor style: 'block' | 'underline' | 'bar' (default: 'block')
  - `cursorBlink` - Enable/disable cursor blinking (default: true)
  - `scrollback` - Number of scrollback lines (default: 10000)
- TerminalHandle TypeScript type export for ref usage
- Comprehensive test coverage for resize functionality
- Documentation for terminal resize behavior

### Fixed
- Terminal resize issues with flexbox containers
- CSS padding conflicts (removed hardcoded 4px padding)
- Memory leaks in resize event handlers
- WebSocket event listener cleanup on unmount
- Context menu event listener cleanup
- Clipboard API error handling
- Dimension validation before sending resize to server

### Changed
- Terminal component now uses forwardRef for imperative API
- Moved from window resize events to ResizeObserver as primary resize detection
- Improved error handling throughout Terminal component
- Enhanced initial fit timing with proper layout detection

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