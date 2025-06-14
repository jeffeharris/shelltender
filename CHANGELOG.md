# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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