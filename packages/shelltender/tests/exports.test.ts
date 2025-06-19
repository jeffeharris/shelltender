import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Shelltender Combined Package', () => {
  const packageRoot = join(__dirname, '..');
  
  it('should have all required source files', () => {
    const requiredFiles = [
      'src/index.ts',
      'src/server.ts', 
      'src/client.ts',
      'src/types.ts',
      'package.json',
      'tsconfig.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = join(packageRoot, file);
      expect(existsSync(filePath), `Missing required file: ${file}`).toBe(true);
    }
  });

  it('should have correct package.json configuration', () => {
    const pkgPath = join(packageRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    
    expect(pkg.name).toBe('shelltender');
    expect(pkg.main).toBe('dist/index.js');
    expect(pkg.types).toBe('dist/index.d.ts');
    expect(pkg.files).toContain('dist');
    
    // Check dependencies
    expect(pkg.dependencies).toHaveProperty('@shelltender/core', '^0.2.0');
    expect(pkg.dependencies).toHaveProperty('@shelltender/server', '^0.2.0');
    expect(pkg.dependencies).toHaveProperty('@shelltender/client', '^0.2.0');
  });

  it('should have valid TypeScript configuration', () => {
    const tsconfigPath = join(packageRoot, 'tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    
    expect(tsconfig.extends).toBe('../../tsconfig.json');
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
    expect(tsconfig.compilerOptions.declaration).toBe(true);
  });

  it('should export from all sub-packages in index.ts', () => {
    const indexPath = join(packageRoot, 'src/index.ts');
    const indexContent = readFileSync(indexPath, 'utf-8');
    
    // Check that it exports from all packages
    expect(indexContent).toContain("from '@shelltender/core'");
    expect(indexContent).toContain("from '@shelltender/server'");
    expect(indexContent).toContain("from '@shelltender/client'");
  });
});