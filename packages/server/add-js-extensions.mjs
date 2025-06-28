import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';

const IMPORT_REGEX = /(\bimport\s+(?:(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+))*\s+from\s+)?['"])(\.[^'"]+)(['"])/g;
const EXPORT_REGEX = /(\bexport\s+(?:\{[^}]*\}\s+from\s+)?['"])(\.[^'"]+)(['"])/g;

async function findTsFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findTsFiles(fullPath));
    } else if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function addExtensions(filePath) {
  const content = await readFile(filePath, 'utf-8');
  let modified = content;
  
  // Add .js to imports
  modified = modified.replace(IMPORT_REGEX, (match, prefix, importPath, suffix) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      return `${prefix}${importPath}.js${suffix}`;
    }
    return match;
  });
  
  // Add .js to exports
  modified = modified.replace(EXPORT_REGEX, (match, prefix, importPath, suffix) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
      return `${prefix}${importPath}.js${suffix}`;
    }
    return match;
  });
  
  if (modified !== content) {
    await writeFile(filePath, modified, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

// Only process server package
const files = await findTsFiles('./src');
for (const file of files) {
  await addExtensions(file);
}