# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2025-07-14

### Added
- Admin UI for managing terminal sessions
- Session management API endpoints at `/api/admin/*`
- Real-time session monitoring with CPU and memory usage
- Bulk session operations (select all, delete multiple)
- Kill all sessions functionality
- System resource monitoring in admin dashboard
- Process statistics utilities for tracking session resources
- Admin UI served at `/admin` endpoint
- WebSocket client count tracking per session

### Fixed
- Critical WebSocket 404 issues with proper path handling
- Session creation crashes in Alpine/Docker environments by defaulting to /bin/sh
- Missing API methods on shelltender instance (createSession, getSession, getAllSessions, resizeSession, killSession)
- Async transformSessionConfig properly awaits transformation
- TypeScript errors in SessionManager error handling
- dataDir configuration option for custom session persistence directory
- Server lifecycle issues when integrating with Express apps

### Changed
- Updated `createServer.ts` to include admin routes by default
- Modified Docker configuration to support admin UI
- Enhanced `WebSocketServer` with `getSessionClientCount()` method

## [0.6.0] - 2025-07-12

Previous release information can be found in the git history.