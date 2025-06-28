# Shelltender Release Guide

This guide documents the process for releasing new versions of Shelltender packages.

## Pre-release Checklist

1. **Ensure all tests pass**
   ```bash
   npm test
   ```

2. **Build all packages**
   ```bash
   npm run build
   ```

3. **Update versions in package.json files**
   - Update version in all package.json files:
     - `/packages/core/package.json`
     - `/packages/server/package.json`
     - `/packages/client/package.json`
     - `/packages/shelltender/package.json`
   - Update dependency versions to match (e.g., `@shelltender/core` in server/client packages)

4. **Update CHANGELOG.md**
   - Add a new version section with release date
   - Document all changes under appropriate categories:
     - Added
     - Changed
     - Fixed
     - Deprecated
     - Removed
     - Security

## Release Process

### 1. Create a Git Tag

```bash
# Create an annotated tag
git tag -a v0.2.3 -m "Release v0.2.3: Fix integration issues"

# Push the tag
git push origin v0.2.3
```

### 2. Publish to npm (if applicable)

If publishing to npm registry:

```bash
# Login to npm (if not already)
npm login

# Publish all packages
npm publish -w @shelltender/core
npm publish -w @shelltender/server  
npm publish -w @shelltender/client
npm publish -w shelltender
```

### 3. Create GitHub Release

1. Go to https://github.com/jeffh/shelltender/releases
2. Click "Draft a new release"
3. Select the tag you just created
4. Title: "v0.2.3 - Fix Integration Issues"
5. Copy the relevant section from CHANGELOG.md
6. Publish the release

## Post-release

1. **Notify downstream teams**
   - Send release notes highlighting breaking changes
   - Update any integration documentation

2. **Update demo app** (if needed)
   ```bash
   cd apps/demo
   npm update
   npm run build
   ```

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- MAJOR version (1.0.0) - Incompatible API changes
- MINOR version (0.2.0) - Add functionality in a backwards compatible manner
- PATCH version (0.2.3) - Backwards compatible bug fixes

## Emergency Hotfix Process

For critical bugs:
1. Create hotfix branch from the tag: `git checkout -b hotfix/0.2.4 v0.2.3`
2. Make minimal fixes
3. Update only patch version
4. Fast-track testing
5. Release as patch version

## Notes

- All packages should maintain the same version number for simplicity
- Always test the integration example after releases
- Consider running `npm pack` locally before publishing to verify package contents