# Shelltender Release Guide

This guide is designed for Claude to execute release procedures. Follow these steps exactly to create and publish a new release.

## Prerequisites

Before starting, verify you're in the correct directory:
```bash
pwd  # Should show the shelltender project root
ls -la packages/  # Should show core, server, client, shelltender directories
```

## Current Release Status

As of the last update to this guide:
- Current version: 0.2.3
- Last release addressed critical integration issues
- All packages are synchronized at the same version
- The CHANGELOG.md has the v0.2.3 release documented

To check if a release has already been created:
```bash
git tag -l "v*" | tail -5  # Show last 5 version tags
```

## Step 1: Determine Version Number

First, check what changes are pending release:
```bash
# Check for uncommitted changes
git status

# View recent commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Check current version
grep '"version"' packages/core/package.json
```

Analyze recent changes to determine the version bump:
- **PATCH** (0.2.3 → 0.2.4): Bug fixes only
- **MINOR** (0.2.3 → 0.3.0): New features, backwards compatible
- **MAJOR** (0.2.3 → 1.0.0): Breaking changes

Look for keywords in commits:
- "fix:", "bugfix:" → PATCH
- "feat:", "feature:", "add:" → MINOR
- "BREAKING:", "breaking change:" → MAJOR

## Step 2: Run Pre-release Checks

```bash
# 1. Ensure clean working directory
git status

# 2. Run all tests
npm test

# 3. Build all packages
npm run build
```

## Step 3: Update Version Numbers

Use MultiEdit to update all package.json files simultaneously. Replace X.Y.Z with the new version:

```typescript
// Update these files:
// - /packages/core/package.json
// - /packages/server/package.json  
// - /packages/client/package.json
// - /packages/shelltender/package.json

// For each file, update:
// 1. The "version" field
// 2. Any @shelltender/* dependencies to match
```

Example for updating to 0.2.4:
- Change `"version": "0.2.3"` to `"version": "0.2.4"`
- Change `"@shelltender/core": "^0.2.3"` to `"@shelltender/core": "^0.2.4"`

## Step 4: Update CHANGELOG.md

Add a new section after `## [Unreleased]` with the format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Fixed
- Description of fixes

### Added
- New features or files

### Changed
- Modified behavior
```

## Step 5: Rebuild and Test

```bash
# Rebuild with new versions
npm run build

# Run tests again to ensure everything works
npm test
```

## Step 6: Commit Version Changes

```bash
# Stage all changes
git add -A

# Commit with standardized message
git commit -m "chore: release vX.Y.Z

- Update all packages to vX.Y.Z
- Update CHANGELOG.md

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 7: Create and Push Git Tag

```bash
# Create annotated tag (replace X.Y.Z and description)
git tag -a vX.Y.Z -m "Release vX.Y.Z: Brief description"

# Push commits and tag to remote
git push origin HEAD
git push origin vX.Y.Z
```

## Step 8: Publish to npm Registry

**IMPORTANT**: Only proceed if the user has confirmed they want to publish to npm.

```bash
# Check npm login status
npm whoami

# If not logged in, the user will need to run:
# npm login

# Dry run first to verify package contents
npm publish --dry-run -w @shelltender/core
npm publish --dry-run -w @shelltender/server
npm publish --dry-run -w @shelltender/client
npm publish --dry-run -w shelltender

# If dry runs look good, publish for real
npm publish -w @shelltender/core
npm publish -w @shelltender/server
npm publish -w @shelltender/client
npm publish -w shelltender
```

## Step 9: Create GitHub Release

Execute these GitHub CLI commands:

```bash
# Create release from tag (replace X.Y.Z)
gh release create vX.Y.Z \
  --title "vX.Y.Z - Release Title" \
  --notes "$(sed -n '/## \[X.Y.Z\]/,/## \[/p' CHANGELOG.md | sed '$d')"
```

## Step 10: Post-release Verification

```bash
# Verify packages are published
npm view @shelltender/core version
npm view @shelltender/server version
npm view @shelltender/client version
npm view shelltender version

# Test the minimal integration example
cd packages/server
npx tsx examples/minimal-integration.ts
```

## Automation Notes for Claude

When executing this guide:
1. Always show the user what version you're updating to before making changes
2. Use MultiEdit for bulk updates to package.json files
3. Extract the release notes from CHANGELOG.md for the git tag message
4. Ask for confirmation before publishing to npm
5. If any step fails, stop and report the error
6. Keep track of which steps have been completed
7. **IMPORTANT**: Use the TodoWrite tool to track your progress through the release steps

## Version Sync Rules

All packages must have the same version number:
- `@shelltender/core`
- `@shelltender/server` (also update its dependency on core)
- `@shelltender/client` (also update its dependency on core)
- `shelltender` (update all three dependencies)

## Common Issues and Solutions

1. **Tests failing**: Don't proceed with release. Investigate failures first.
2. **Build errors**: Usually means TypeScript errors. Check recent changes.
3. **npm publish fails**: 
   - 403 error: User needs to login with `npm login`
   - 409 error: Version already exists, bump version number
4. **Git push rejected**: User may need to pull latest changes first

## Example First Message to User

When starting a release, say something like:
```
I'll help you create a new release for Shelltender. Let me first check the current version and recent changes to determine what version number to use.

[Run the version check commands]

Based on the recent changes, I recommend a [PATCH/MINOR/MAJOR] version bump from X.Y.Z to X.Y.Z because:
- [List key changes]

Shall I proceed with creating release vX.Y.Z?
```