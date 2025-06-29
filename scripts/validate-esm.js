#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';

const PACKAGES = ['core', 'server', 'client', 'shelltender'];
const IMPORT_REGEX = /(?:import|export)\s+(?:(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+))*\s+from\s+)?['"](\.[^'"]+)['"]/g;

async function findJsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findJsFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === '.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function validateFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const issues = [];
  
  let match;
  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const importPath = match[1];
    // Check if it's a relative import without .js extension
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      issues.push({
        file: filePath,
        line: content.substring(0, match.index).split('\n').length,
        import: importPath,
        fullMatch: match[0]
      });
    }
  }
  
  return issues;
}

async function validatePackage(packageName) {
  const distDir = join(process.cwd(), 'packages', packageName, 'dist');
  
  try {
    const files = await findJsFiles(distDir);
    const allIssues = [];
    
    for (const file of files) {
      const issues = await validateFile(file);
      allIssues.push(...issues);
    }
    
    return allIssues;
  } catch (error) {
    console.error(`Error validating package ${packageName}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 Validating ESM imports in compiled output...\n');
  
  let totalIssues = 0;
  
  for (const pkg of PACKAGES) {
    const issues = await validatePackage(pkg);
    
    if (issues.length > 0) {
      console.log(`❌ Package @shelltender/${pkg}:`);
      for (const issue of issues) {
        console.log(`   ${issue.file}:${issue.line}`);
        console.log(`   ${issue.fullMatch}`);
        console.log(`   Missing .js extension: '${issue.import}' → '${issue.import}.js'\n`);
      }
      totalIssues += issues.length;
    } else {
      console.log(`✅ Package @shelltender/${pkg}: No issues found`);
    }
  }
  
  console.log(`\n${totalIssues === 0 ? '✅' : '❌'} Total issues found: ${totalIssues}`);
  
  if (totalIssues > 0) {
    process.exit(1);
  }
}

main().catch(console.error);