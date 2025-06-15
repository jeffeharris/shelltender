#!/usr/bin/env node

/**
 * Analyze captured Claude Code output files
 * This helps us understand patterns across multiple captures
 */

import fs from 'fs';
import path from 'path';

const CAPTURES_DIR = './claude-captures';

console.log('Analyzing Claude Code captures...\n');

// Read all capture files
const files = fs.readdirSync(CAPTURES_DIR)
  .filter(f => f.endsWith('.log'))
  .map(f => path.join(CAPTURES_DIR, f));

console.log(`Found ${files.length} capture files\n`);

// Analyze each file
files.forEach(file => {
  console.log(`\n=== ${path.basename(file)} ===`);
  
  const content = fs.readFileSync(file, 'utf-8');
  const analysisFile = file.replace('.log', '-analysis.json');
  
  let analysis = {};
  if (fs.existsSync(analysisFile)) {
    analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));
  }
  
  // Show raw bytes around potential prompts
  if (analysis.potentialPrompts) {
    console.log('\nPotential prompts:');
    analysis.potentialPrompts.forEach((prompt, i) => {
      console.log(`\n${i + 1}. "${prompt.text}"`);
      console.log(`   Hex: ${prompt.raw}`);
      console.log(`   Context: ${prompt.fullChunk.replace(/\n/g, '\\n').substring(0, 100)}...`);
    });
  }
  
  // Show ANSI codes found
  if (analysis.ansiCodes && analysis.ansiCodes.length > 0) {
    console.log('\nANSI codes used:');
    analysis.ansiCodes.forEach(code => {
      const readable = code.replace('\x1b', '\\x1b');
      console.log(`  ${readable}`);
    });
  }
  
  // Show time gaps (potential waiting for input)
  if (analysis.timeGaps && analysis.timeGaps.length > 0) {
    console.log('\nSignificant time gaps:');
    analysis.timeGaps.forEach(gap => {
      console.log(`  ${gap.gap}ms gap before: "${gap.afterOutput.replace(/\n/g, '\\n')}"`);
    });
  }
  
  // Look for specific patterns in raw content
  console.log('\nPattern search:');
  
  // Check for progress indicators
  const progressPatterns = [
    /\r[^\n]+/g,  // Carriage return without newline (overwriting)
    /\x1b\[\d+D/g,  // Cursor back
    /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g,  // Spinner characters
    /█+/g,  // Progress bars
    /\d+%/g  // Percentages
  ];
  
  progressPatterns.forEach((pattern, i) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  Progress pattern ${i}: ${matches.length} occurrences`);
      if (matches.length < 5) {
        matches.forEach(m => console.log(`    "${m.replace(/\r/g, '\\r')}"`));
      }
    }
  });
  
  // Check for input patterns
  const inputPatterns = [
    /\n[^\n]+[?:]\s*$/gm,  // Line ending with ? or :
    /\(y\/n\)/gi,
    /\[Y\/n\]/g,
    /press\s+enter/gi,
    /continue\?/gi,
    /proceed\?/gi
  ];
  
  console.log('\nInput patterns:');
  inputPatterns.forEach((pattern, i) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  Pattern ${i}: ${matches.length} matches`);
      matches.slice(0, 3).forEach(m => {
        console.log(`    "${m.replace(/\n/g, '\\n').trim()}"`);
      });
    }
  });
});

// Aggregate analysis across all files
console.log('\n\n=== AGGREGATE ANALYSIS ===');

const allAnsiCodes = new Set();
const allPromptEndings = [];
const commonPatterns = {};

files.forEach(file => {
  const analysisFile = file.replace('.log', '-analysis.json');
  if (fs.existsSync(analysisFile)) {
    const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));
    
    // Collect all ANSI codes
    (analysis.ansiCodes || []).forEach(code => allAnsiCodes.add(code));
    
    // Collect prompt endings
    (analysis.potentialPrompts || []).forEach(prompt => {
      const ending = prompt.text.slice(-10);
      allPromptEndings.push(ending);
    });
  }
});

console.log(`\nUnique ANSI codes across all captures: ${allAnsiCodes.size}`);
console.log('\nCommon prompt endings:');
const endingCounts = {};
allPromptEndings.forEach(ending => {
  endingCounts[ending] = (endingCounts[ending] || 0) + 1;
});
Object.entries(endingCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([ending, count]) => {
    console.log(`  "${ending}": ${count} times`);
  });

console.log('\n✨ Analysis complete!');