# Development Guide

## Pre-commit Hooks

This project includes pre-commit hooks to ensure code quality. To set them up:

### Install Husky (one-time setup)

```bash
npm install --save-dev husky
npx husky init
```

### Activate Pre-commit Hook

The pre-commit hook is already configured in `.husky/pre-commit`. It will:
- Run linting (`npm run lint`)
- Run type checking (`npm run typecheck`)

If either check fails, the commit will be aborted.

### Bypass Hooks (use sparingly)

If you need to commit without running hooks:
```bash
git commit --no-verify -m "your message"
```

## Code Quality Scripts

Run these manually at any time:

```bash
# Lint all packages
npm run lint

# Type check all packages  
npm run typecheck

# Run all tests
npm test

# Build all packages in order
npm run build:packages
```

## Docker Development

See the main README for Docker development setup instructions.