# Shelltender Release Guide for Claude

This guide provides exact instructions for Claude to execute release procedures autonomously. Every decision point has explicit criteria.

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

## Claude Tool Usage Pattern

Execute this release using these specific tool patterns:

1. **Start with TodoWrite** - Create these 11 release steps:
   ```
   - Step 1: Check current version and branch
   - Step 2: Run pre-release checks
   - Step 3: Update version numbers
   - Step 4: Update CHANGELOG
   - Step 5: Rebuild and test
   - Step 6: Commit version changes
   - Step 7: Create and push tag
   - Step 8: Publish to npm
   - Step 9: Create GitHub release
   - Step 10: Verify release
   - Step 11: Update release guide
   ```

2. **Use MultiEdit** for simultaneous updates:
   - Update all 4 package.json files in ONE operation
   - Never edit package.json files individually

3. **Use Bash tool** with exact commands:
   - Copy commands exactly as shown
   - Never use interactive flags (-i, --interactive)
   - Always check command success before proceeding

4. **State tracking** - Initialize and maintain throughout:
   ```typescript
   // Claude: Initialize these at the start
   const releaseState = {
     CURRENT_VERSION: "",      // Set from: grep '"version"' packages/core/package.json
     NEW_VERSION: "",          // Calculate based on RELEASE_TYPE
     BRANCH_NAME: "",          // Set from: git branch --show-current
     RELEASE_TYPE: "",         // PATCH|MINOR|MAJOR - determined from commits
     STEPS_COMPLETED: [],      // Track: ["step1", "step2", ...]
     ERRORS_ENCOUNTERED: [],   // Log all errors with step number
     TEST_RESULTS: {
       passed: false,
       failures: 0,
       criticalFailures: []
     },
     BUILD_METRICS: {
       time: 0,              // Build time in seconds
       bundleSize: 0,        // Largest bundle in MB
       warnings: []
     }
   };
   
   // Update TodoWrite with current state after each step
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

**Claude Test Failure Decision Logic:**
```javascript
// Exact logic for Claude to follow
const analyzeTestFailures = (output) => {
  const failures = output.match(/FAIL.*\.test\.(ts|tsx)/g) || [];
  
  for (const failure of failures) {
    // Critical patterns - MUST STOP
    if (failure.includes('SessionManager') || 
        failure.includes('BufferManager') ||
        failure.includes('integration') ||
        failure.includes('WebSocket')) {
      return {
        action: 'STOP',
        message: `Critical test failure detected: ${failure}. Core functionality is broken.`
      };
    }
  }
  
  // Non-critical patterns - can proceed
  const nonCritical = failures.filter(f => 
    f.includes('act()') || 
    f.includes('.css') || 
    f.includes('snapshot')
  );
  
  if (nonCritical.length === failures.length) {
    return {
      action: 'PROCEED',
      message: `Only UI/styling test failures (${failures.length} total). These are non-critical.`
    };
  }
  
  // Unknown failures - ask user
  return {
    action: 'ASK',
    message: `Found ${failures.length} test failures: ${failures.join(', ')}. These don't match known patterns. Should I proceed?`
  };
};
```

### Handling Build Warnings

**Claude Decision Matrix:**

| Warning Type | Action |
|-------------|--------|
| Chunk size < 1MB | ✅ Proceed |
| Chunk size 1-2MB | ⚠️ Proceed but note in release: "Large bundle size (XMB)" |
| Chunk size > 2MB | 🛑 Stop - Ask user: "Bundle size is XMB. This exceeds the 2MB threshold. Should I proceed?" |
| Peer dependency warnings | ✅ Proceed if package.json documents them |
| Source map warnings | ✅ Proceed |
| Security vulnerability (any) | 🛑 Stop - Report exact vulnerability |
| License compatibility | 🛑 Stop - Report exact license conflict |
| Missing dependencies | 🛑 Stop - Cannot proceed without deps |

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
# Claude: Execute these verification commands
npm view @shelltender/core version     # Should show X.Y.Z
npm view @shelltender/server version   # Should show X.Y.Z
npm view @shelltender/client version   # Should show X.Y.Z
npm view shelltender version           # Should show X.Y.Z

gh release view vX.Y.Z                 # Should show release details
git tag -l | grep vX.Y.Z              # Should show the tag
```

**Claude-Executable Checklist:**
```typescript
// Use this exact check sequence
const postReleaseChecks = {
  npmPackages: {
    command: "npm view @shelltender/core version",
    expected: NEW_VERSION,
    action: "✅ Confirmed" || "❌ Failed - version mismatch"
  },
  githubRelease: {
    command: "gh release view v" + NEW_VERSION,
    expected: "shows release",
    action: "✅ Confirmed" || "❌ Failed - release not found"
  },
  gitTag: {
    command: "git tag -l | grep v" + NEW_VERSION,
    expected: "v" + NEW_VERSION,
    action: "✅ Confirmed" || "❌ Failed - tag not found"
  },
  guideUpdate: {
    task: "Update RELEASE_GUIDE.md Current Release Status to " + NEW_VERSION,
    action: "Use MultiEdit tool"
  }
};
```

**Human-Only Tasks (Claude: Skip these):**
- ~~Notify teams/users~~
- ~~Monitor CI/CD~~
- ~~Social media announcements~~

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

## Claude Error Response Templates

Use these exact responses for common errors:

### npm publish errors:
```typescript
if (error.includes("403")) {
  return "I encountered a 403 error during npm publish. This means you need to authenticate. Please run `npm login` and let me know when you're ready to continue.";
}

if (error.includes("409")) {
  return "I encountered a 409 error - this version already exists on npm. I need to bump to a higher version. Current version is " + CURRENT_VERSION + ". Should I increment to the next patch version?";
}

if (error.includes("E404")) {
  return "I encountered a 404 error. This might mean the package hasn't been published before. Should I proceed with `npm publish --access public`?";
}
```

### Git errors:
```typescript
if (error.includes("rejected")) {
  return "Git push was rejected. This usually means:\n1. You need to pull latest changes: `git pull origin " + BRANCH_NAME + "`\n2. Or force push (dangerous): `git push --force`\nWhich would you prefer?";
}

if (error.includes("Permission denied")) {
  return "Git operation failed with permission denied. Please check:\n1. SSH key is configured: `ssh -T git@github.com`\n2. You have push access to the repository";
}
```

### Test failures:
```typescript
if (testResult.failures > 0) {
  const analysis = analyzeTestFailures(testResult.output);
  return `I found ${testResult.failures} test failures:\n\n${analysis.details}\n\nMy assessment: ${analysis.message}\n\n${analysis.action === 'STOP' ? 'I cannot proceed.' : 'Should I proceed?'}`;
}
```

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
   # Check if jq is available first
   which jq > /dev/null 2>&1
   if [ $? -eq 0 ]; then
     npm view shelltender versions --json | jq '.[-5:]'  # Last 5 versions with jq
   else
     npm view shelltender versions --json | tail -10      # Fallback without jq
   fi
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

## Claude Decision Rules

Apply these exact rules without deviation:

### Version Bumping Logic
```typescript
const determineVersionBump = (commits: string[]) => {
  if (commits.some(c => c.includes('BREAKING'))) return 'MAJOR';
  if (commits.some(c => c.match(/^feat|^feature/))) return 'MINOR';
  return 'PATCH';
};
```

### NPM Registry Decision
```typescript
const getNpmRegistry = () => {
  // Never ask - use these defaults
  return {
    registry: 'https://registry.npmjs.org/',
    access: 'public',
    dryRun: true  // ALWAYS do dry run first
  };
};
```

### Build Performance Thresholds
| Metric | Green | Yellow | Red (Stop) |
|--------|-------|--------|------------|
| Build time | < 3 min | 3-5 min | > 5 min |
| Bundle size | < 1MB | 1-2MB | > 2MB |
| Test coverage drop | < 2% | 2-5% | > 5% |
| Package size increase | < 10% | 10-20% | > 20% |

### Git Push Rules
```typescript
const gitPushRules = {
  tags: "ALWAYS push tags directly",
  branches: "ONLY push if on main/master, otherwise ask",
  force: "NEVER force push without explicit user confirmation"
};
```

### Communication Checkpoints
1. **MUST confirm before**: npm publish, git push to main, force operations
2. **MUST report after**: each step completion, any warning, any error
3. **MUST ask when**: unknown error, ambiguous situation, missing permissions