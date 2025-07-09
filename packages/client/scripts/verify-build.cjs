#!/usr/bin/env node
/**
 * Post-build validation script for @shelltender/client
 * 
 * This script verifies that critical build artifacts are preserved during bundling:
 * 1. Terminal component's forwardRef with @__PURE__ annotation
 * 2. Terminal.displayName for React DevTools
 * 
 * Run this after building to ensure bundlers haven't stripped important code.
 */

const fs = require('fs');
const path = require('path');
const { exit } = require('process');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, checks) {
  log(`\nChecking ${path.basename(filePath)}...`, 'blue');
  
  if (!fs.existsSync(filePath)) {
    log(`  ✗ File not found: ${filePath}`, 'red');
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let allPassed = true;

  for (const check of checks) {
    const found = check.pattern.test(content);
    if (found) {
      log(`  ✓ ${check.description}`, 'green');
    } else {
      log(`  ✗ ${check.description}`, 'red');
      if (check.hint) {
        log(`    Hint: ${check.hint}`, 'yellow');
      }
      allPassed = false;
    }
  }

  return allPassed;
}

// Main validation
function main() {
  log('=== Shelltender Client Build Verification ===\n', 'blue');

  const buildPaths = [
    path.join(__dirname, '../dist/index.js'),
    path.join(__dirname, '../dist/index.mjs'),
    path.join(__dirname, '../dist/index.esm.js'),
    path.join(__dirname, '../dist/shelltender-client.js'),
  ];

  // Find the first existing build file
  const distFile = buildPaths.find(p => fs.existsSync(p));

  if (!distFile) {
    log('No build files found. Please run the build first.', 'red');
    log('Expected locations:', 'yellow');
    buildPaths.forEach(p => log(`  - ${p}`, 'yellow'));
    exit(1);
  }

  const checks = [
    {
      pattern: /\/\*\s*@__PURE__\s*\*\/\s*forwardRef/,
      description: 'Terminal forwardRef has @__PURE__ annotation',
      hint: 'The Terminal component may not work properly with refs. Check Terminal.tsx exports.'
    },
    {
      pattern: /Terminal\.displayName\s*=\s*['"]Terminal['"]/,
      description: 'Terminal.displayName is preserved',
      hint: 'React DevTools may not show the component name correctly.'
    },
    {
      pattern: /useImperativeHandle/,
      description: 'useImperativeHandle hook is present',
      hint: 'Terminal ref methods (focus, fit) may not be available.'
    }
  ];

  const passed = checkFile(distFile, checks);

  // Check the main index.d.ts for exports
  const mainDtsFile = path.join(__dirname, '../dist/index.d.ts');
  if (fs.existsSync(mainDtsFile)) {
    log(`\nChecking main TypeScript declarations...`, 'blue');
    const mainDtsChecks = [
      {
        pattern: /export\s+\{\s*Terminal\s*\}/,
        description: 'Terminal is exported from main index',
        hint: 'Terminal component may not be accessible to users.'
      },
      {
        pattern: /export\s+type\s+\{\s*.*TerminalHandle.*\s*\}/,
        description: 'TerminalHandle type is exported',
        hint: 'Ref type information may be missing.'
      }
    ];
    checkFile(mainDtsFile, mainDtsChecks);
  }

  // Also check the Terminal component's type definition
  const terminalDtsFile = path.join(__dirname, '../dist/components/Terminal/Terminal.d.ts');
  if (fs.existsSync(terminalDtsFile)) {
    log(`\nChecking Terminal component TypeScript declarations...`, 'blue');
    const terminalDtsChecks = [
      {
        pattern: /export\s+declare\s+const\s+Terminal:\s*React\.ForwardRefExoticComponent/,
        description: 'Terminal is declared as ForwardRefExoticComponent',
        hint: 'TypeScript may not recognize Terminal refs correctly.'
      },
      {
        pattern: /export\s+interface\s+TerminalHandle/,
        description: 'TerminalHandle interface is defined',
        hint: 'Ref type information may be missing.'
      }
    ];
    checkFile(terminalDtsFile, terminalDtsChecks);
  }

  log('\n=== Summary ===', 'blue');
  if (passed) {
    log('All critical checks passed! ✓', 'green');
    log('The Terminal component should work correctly with bundlers.', 'green');
    exit(0);
  } else {
    log('Some checks failed! ✗', 'red');
    log('The Terminal component may have issues with refs in bundled applications.', 'yellow');
    log('\nPossible solutions:', 'yellow');
    log('1. Ensure you are using @shelltender/client version 0.4.5 or later', 'yellow');
    log('2. Check your bundler configuration (especially tree-shaking settings)', 'yellow');
    log('3. Try excluding @shelltender/client from optimization in your bundler', 'yellow');
    exit(1);
  }
}

// Run the validation
if (require.main === module) {
  main();
}

module.exports = { checkFile };