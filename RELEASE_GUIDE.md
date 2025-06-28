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
- Current version: 0.2.4
- Last release addressed critical integration issues and added custom session ID support
- All packages are synchronized at the same version
- The CHANGELOG.md has the v0.2.4 release documented

To check if a release has already been created:
```bash
git tag -l "v*" | tail -5  # Show last 5 version tags
```

## Branch Strategy

Before proceeding with a release, ensure you're on the appropriate branch:

```bash
# Check current branch
git branch --show-current

# Check if you have uncommitted changes
git status
```

**Branch Requirements:**
- **Preferred**: Releases should be made from `main` or `master` branch
- **Acceptable**: Release branches like `release/v0.2.4`
- **Not Recommended**: Feature branches (unless merging to main first)

If you're on a feature branch:
```bash
# Option 1: Merge to main first (recommended)
git checkout main
git pull origin main
git merge feature/your-branch

# Option 2: Create release from feature branch (document in release notes)
# Proceed with caution and note this in the GitHub release description
```

## Step 1: Determine Version Number

First, check what changes are pending release:
```bash
# Check for uncommitted changes
git status

# View recent commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Check current version in package.json
grep '"version"' packages/core/package.json

# Check what's published on npm
npm view @shelltender/core versions --json | tail -5
npm view @shelltender/server versions --json | tail -5
npm view @shelltender/client versions --json | tail -5
npm view shelltender versions --json | tail -5
```

### Handling Version Mismatches

If git tags and package.json versions don't match:

1. **Check npm registry** - What's actually published?
   ```bash
   npm view @shelltender/core version  # Latest published version
   ```

2. **Decision tree**:
   - If package.json > npm version → Previous release may have failed
   - If package.json = npm version → You're up to date
   - If git tag > package.json → Package.json wasn't updated in last release

3. **Resolution**:
   - Use package.json as source of truth if npm versions match
   - If versions were skipped, document in CHANGELOG
   - Always increment from the highest version found

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

### Evaluating Test Failures

If tests fail, evaluate their severity:

**🛑 Critical Failures (STOP RELEASE):**
- Unit test failures in business logic
- Integration test failures
- Build errors or TypeScript compilation errors
- Security-related test failures
- Data corruption or loss scenarios

**⚠️ Non-Critical Failures (PROCEED WITH CAUTION):**
- React `act()` warnings in tests
- CSS class name changes in snapshot tests
- Deprecation warnings
- Linting warnings (not errors)
- Minor styling test failures

**When in doubt:**
```bash
# Run failed tests individually for more detail
npm test -- path/to/failing.test.ts

# Ask the user: "I found [X] test failures. They appear to be [critical/non-critical] because [reason]. Should I proceed with the release?"
```

### Handling Build Warnings

**Acceptable warnings:**
- Chunk size warnings (unless extreme)
- Peer dependency warnings (if documented)
- Source map warnings

**Unacceptable warnings:**
- Security vulnerabilities
- License compatibility issues
- Missing dependencies

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
# First, prepare the release notes (more robust extraction)
VERSION="X.Y.Z"  # Replace with actual version

# Extract release notes using awk (more reliable than sed)
awk -v ver="$VERSION" '
  /^## \['ver'\]/ {flag=1; next}
  /^## \[/ && flag {exit}
  flag {print}
' CHANGELOG.md > release_notes.md

# Review the extracted notes
cat release_notes.md

# Create the release
gh release create "v$VERSION" \
  --title "v$VERSION - $(head -n1 release_notes.md | sed 's/^### //')" \
  --notes-file release_notes.md

# Clean up
rm release_notes.md
```

**Alternative: Manual release notes**
```bash
# If automatic extraction fails, create manually
gh release create vX.Y.Z \
  --title "vX.Y.Z - Brief Description" \
  --notes "### Fixed
- List fixes here

### Added  
- List additions here

See CHANGELOG.md for full details."
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

## Step 11: Post-Release Checklist

Complete these final tasks after the release:

```bash
# 1. Update this guide's Current Release Status section
# Edit RELEASE_GUIDE.md and update:
# - Current version: X.Y.Z → new version
# - Last release notes summary
```

**Checklist:**
- [ ] All packages show correct version on npm
- [ ] GitHub release is visible at github.com/jeffh/shelltender/releases
- [ ] Tag is visible in git: `git tag -l | grep vX.Y.Z`
- [ ] CI/CD passed on the release tag (if applicable)
- [ ] Updated Current Release Status in this guide
- [ ] Notified relevant teams/users (if applicable)

**Optional: Create announcement**
```markdown
# Shelltender vX.Y.Z Released! 🎉

Key changes:
- [Summary of major fixes/features]

Update with: `npm update shelltender`

Full changelog: [link to release]
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

## Troubleshooting Version History

### When Previous Versions Were Never Published

If you discover versions in package.json that were never published to npm:

1. **Verify what's on npm:**
   ```bash
   npm view @shelltender/core versions --json
   npm view shelltender versions --json | jq '.[-5:]'  # Last 5 versions
   ```

2. **Update CHANGELOG.md:**
   - Consolidate unpublished versions into the current release
   - Add a note explaining the version skip
   
   Example:
   ```markdown
   ## [0.2.4] - 2025-06-28
   
   *Note: Version 0.2.3 was tagged but never published to npm. This release includes all changes from v0.2.3.*
   
   ### Fixed
   - All fixes from 0.2.3 plus new fixes...
   ```

3. **Clean up git tags (if needed):**
   ```bash
   # List all tags
   git tag -l
   
   # Delete local tag for unpublished version (use with caution)
   git tag -d v0.2.3
   
   # Delete remote tag (use with extreme caution)
   git push --delete origin v0.2.3
   ```

## Common Assumptions and Decisions

This section clarifies assumptions Claude should make when not explicitly specified:

### NPM Registry
- **Default**: Use the public npm registry (registry.npmjs.org)
- **Private registries**: User will specify with `--registry` flag
- **Scoped packages**: Follow npm config for @shelltender scope

### Build Warnings
- **Chunk size warnings**: Acceptable up to 1MB, flag if larger
- **Dependency warnings**: Note but don't block release
- **TypeScript strict mode warnings**: Should be fixed before release

### Git Workflow
- **PR-based releases**: If prompted about PR, ask user preference
- **Direct push**: Acceptable for tags, ask for branch pushes
- **Default branch**: Assume 'main' unless specified

### Release Formats
- **Tag format**: Always `vX.Y.Z` (with 'v' prefix)
- **Release title**: "vX.Y.Z - [First major change category]"
- **Pre-releases**: Use `-beta.N` or `-rc.N` suffix

### Testing Thresholds
- **Coverage drop**: Warn if coverage drops >5%
- **Performance**: Flag if build time >5 minutes
- **Package size**: Warn if package grows >20% from last version

### Communication
- **Confirmation points**: Always confirm before npm publish
- **Error handling**: Stop and ask for guidance on unexpected errors
- **Progress updates**: Report completion of each major step