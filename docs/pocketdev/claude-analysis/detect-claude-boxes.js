#!/usr/bin/env node

/**
 * Analyze Claude captures to detect box-drawing patterns
 * These boxes seem to indicate different UI states
 */

import fs from 'fs';
import path from 'path';

const CAPTURES_DIR = './claude-captures';

// Box drawing characters Claude uses
const BOX_CHARS = {
  TOP_LEFT: '╭',
  TOP_RIGHT: '╮',
  BOTTOM_LEFT: '╰',
  BOTTOM_RIGHT: '╯',
  HORIZONTAL: '─',
  VERTICAL: '│',
  // Alternative box styles
  DOUBLE_HORIZONTAL: '═',
  SINGLE_VERTICAL: '|'
};

// Patterns for different box types
const BOX_PATTERNS = {
  // Top of a box
  boxTop: /╭─+╮/,
  // Bottom of a box
  boxBottom: /╰─+╯/,
  // Full horizontal line (often separators)
  horizontalLine: /[─═]{10,}/,
  // Vertical sides
  verticalSides: /│.+│/,
  // Input prompt area (often has > or similar)
  inputArea: /│\s*[>❯▶]\s*/,
  // Box with content
  boxWithContent: /╭─+╮[\s\S]*?╰─+╯/
};

console.log('Analyzing Claude box patterns...\n');

// Read all capture files
const files = fs.readdirSync(CAPTURES_DIR)
  .filter(f => f.endsWith('.log'))
  .map(f => path.join(CAPTURES_DIR, f));

files.forEach(file => {
  console.log(`\n=== ${path.basename(file)} ===`);
  
  const content = fs.readFileSync(file, 'utf-8');
  
  // Find all box tops
  const boxTops = content.match(/╭─+╮/g) || [];
  console.log(`\nBox tops found: ${boxTops.length}`);
  if (boxTops.length > 0 && boxTops.length < 10) {
    boxTops.forEach((box, i) => {
      console.log(`  ${i + 1}. Width: ${box.length} chars`);
    });
  }
  
  // Find all box bottoms
  const boxBottoms = content.match(/╰─+╯/g) || [];
  console.log(`\nBox bottoms found: ${boxBottoms.length}`);
  
  // Look for complete boxes (this is tricky with ANSI codes)
  const completeBoxes = findCompleteBoxes(content);
  console.log(`\nComplete boxes found: ${completeBoxes.length}`);
  completeBoxes.slice(0, 3).forEach((box, i) => {
    console.log(`\nBox ${i + 1}:`);
    console.log(`  Content preview: "${cleanAnsi(box.content).slice(0, 100)}..."`);
    console.log(`  Lines: ${box.lines}`);
    console.log(`  Width: ${box.width}`);
    console.log(`  Has input indicator: ${box.hasInputIndicator}`);
    
    // Check for numbered options
    if (box.numberedOptions && box.numberedOptions.length > 0) {
      console.log(`  Numbered options found:`);
      box.numberedOptions.forEach(opt => {
        console.log(`    ${opt.number}. ${opt.text}`);
      });
    }
  });
  
  // Look for patterns around boxes
  console.log('\nContext analysis:');
  
  // Find what comes after box bottoms (might indicate waiting)
  const afterBoxPatterns = findPatternsAfterBoxes(content);
  console.log('\nPatterns after box bottoms:');
  Object.entries(afterBoxPatterns).forEach(([pattern, count]) => {
    if (count > 0) {
      console.log(`  ${pattern}: ${count} times`);
    }
  });
  
  // Look for input indicators
  const inputIndicators = findInputIndicators(content);
  console.log('\nInput indicators found:');
  inputIndicators.slice(0, 5).forEach(indicator => {
    console.log(`  "${cleanAnsi(indicator)}"`);
  });
  
  // Look for numbered options outside of boxes too
  const standaloneOptions = findNumberedOptions(content);
  if (standaloneOptions.length > 0) {
    console.log('\nStandalone numbered options found:');
    standaloneOptions.slice(0, 10).forEach(opt => {
      console.log(`  ${opt.number}. ${opt.text}`);
    });
  }
  
  // Look for status/action lines (the red text with animations)
  const statusLines = findStatusLines(content);
  console.log('\nStatus/Action lines found:');
  console.log(`  Total: ${statusLines.length}`);
  if (statusLines.length > 0) {
    console.log('  Action words found:');
    const actionWords = [...new Set(statusLines.map(s => s.action))];
    actionWords.forEach(action => {
      const count = statusLines.filter(s => s.action === action).length;
      console.log(`    - ${action}: ${count} times`);
    });
    
    console.log('\n  Sample status lines:');
    statusLines.slice(0, 5).forEach((status, i) => {
      console.log(`    ${i + 1}. ${status.action} (${status.duration}, ${status.tokens} tokens)`);
      if (status.symbol) {
        console.log(`       Symbol: ${status.symbol}`);
      }
    });
  }
});

function findCompleteBoxes(content) {
  const boxes = [];
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for box top
    if (line.includes('╭') && line.includes('╮')) {
      const boxStart = i;
      let boxEnd = -1;
      let boxContent = [];
      let width = (line.match(/─+/) || [''])[0].length + 2;
      
      // Look for matching bottom
      for (let j = i + 1; j < lines.length && j < i + 50; j++) {
        const checkLine = lines[j];
        boxContent.push(checkLine);
        
        if (checkLine.includes('╰') && checkLine.includes('╯')) {
          boxEnd = j;
          break;
        }
      }
      
      if (boxEnd > boxStart) {
        const boxContentStr = boxContent.join('\n');
        const box = {
          startLine: boxStart,
          endLine: boxEnd,
          lines: boxEnd - boxStart + 1,
          width: width,
          content: boxContentStr,
          hasInputIndicator: boxContent.some(l => 
            l.includes('>') || l.includes('❯') || l.includes('▶') || l.includes('?')
          ),
          numberedOptions: extractNumberedOptions(boxContentStr)
        };
        boxes.push(box);
        i = boxEnd; // Skip past this box
      }
    }
  }
  
  return boxes;
}

function findPatternsAfterBoxes(content) {
  const patterns = {
    'cursor_show': 0,
    'cursor_hide': 0,
    'clear_screen': 0,
    'newlines': 0,
    'ansi_codes': 0,
    'no_output': 0
  };
  
  // Split by box bottoms
  const parts = content.split(/╰─+╯/);
  
  parts.forEach((part, i) => {
    if (i === parts.length - 1) return; // Skip last part
    
    const next50Chars = part.slice(0, 50);
    
    if (next50Chars.includes('\x1b[?25h')) patterns.cursor_show++;
    if (next50Chars.includes('\x1b[?25l')) patterns.cursor_hide++;
    if (next50Chars.includes('\x1b[2J')) patterns.clear_screen++;
    if (next50Chars.match(/\n{3,}/)) patterns.newlines++;
    if (next50Chars.includes('\x1b[')) patterns.ansi_codes++;
    if (next50Chars.trim().length < 5) patterns.no_output++;
  });
  
  return patterns;
}

function findInputIndicators(content) {
  const indicators = [];
  
  // Look for lines with input symbols inside boxes
  const lines = content.split(/\r?\n/);
  lines.forEach(line => {
    if (line.includes('│') && (line.includes('>') || line.includes('❯') || line.includes('▶'))) {
      indicators.push(line);
    }
  });
  
  return indicators;
}

function cleanAnsi(str) {
  // Remove ANSI escape codes for display
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1b\[\?[0-9]+[hl]/g, '')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
}

function extractNumberedOptions(content) {
  const options = [];
  const cleanContent = cleanAnsi(content);
  
  // Look for patterns like "1. option text" or "1) option text"
  const numberPattern = /(\d+)[.)] ([^\n]+)/g;
  let match;
  
  while ((match = numberPattern.exec(cleanContent)) !== null) {
    options.push({
      number: parseInt(match[1]),
      text: match[2].trim()
    });
  }
  
  return options;
}

function findNumberedOptions(content) {
  const options = [];
  const lines = content.split(/\r?\n/);
  
  lines.forEach(line => {
    const cleanLine = cleanAnsi(line);
    // Look for lines that start with a number followed by . or )
    const match = cleanLine.match(/^\s*(\d+)[.)] (.+)/);
    if (match) {
      options.push({
        number: parseInt(match[1]),
        text: match[2].trim(),
        rawLine: line
      });
    }
  });
  
  return options;
}

function findStatusLines(content) {
  const statusLines = [];
  const lines = content.split(/\r?\n/);
  
  // Animation symbols Claude uses
  const animationSymbols = ['·', '✢', '*', '✶', '✻', '✽', '✺', '●', '○', '◉', '◎'];
  
  lines.forEach(line => {
    // Look for pattern: [symbol] [action word]… ([time]s · [direction] [tokens] tokens · esc to interrupt)
    // Example: ✻ Transmuting… (0s · ↑ 0 tokens · esc to interrupt)
    const cleanLine = cleanAnsi(line);
    
    // Match status lines with time and token info
    const statusMatch = cleanLine.match(/^([·✢*✶✻✽✺●○◉◎])?\s*(\w+)…\s*\((\d+s)\s*·\s*([↑↓⚒\s]*)\s*([\d.]+k?)\s*tokens\s*·.*\)/);
    
    if (statusMatch) {
      statusLines.push({
        symbol: statusMatch[1] || '',
        action: statusMatch[2],
        duration: statusMatch[3],
        direction: statusMatch[4].trim(),
        tokens: statusMatch[5],
        fullLine: line,
        cleanLine: cleanLine
      });
    }
  });
  
  return statusLines;
}

console.log('\n\n=== SUMMARY ===');
console.log('\nBox patterns seem to be used for:');
console.log('1. Welcome/header messages');
console.log('2. Input areas (with > or similar prompt)');
console.log('3. Output/response sections');
console.log('\nKey indicators Claude is WAITING for input:');
console.log('- Box with input prompt symbol (>, ❯, ▶)');
console.log('- Cursor shown after box (\x1b[?25h)');
console.log('- NO status line (Transmuting/Churning/etc) visible');
console.log('- Minimal output after box bottom');
console.log('\nKey indicators Claude is PROCESSING:');
console.log('- Status line with action words (Transmuting, Churning, etc)');
console.log('- Animated symbols (·, ✢, *, ✶, ✻, ✽, etc)');
console.log('- Time counter and token count visible');
console.log('- Pattern: "[symbol] [Action]… ([time]s · [tokens] tokens · esc to interrupt)"');
console.log('\nNumbered options detection:');
console.log('- Look for patterns like "1. text" or "1) text"');
console.log('- Often appear in Claude\'s regular output (not in boxes)');
console.log('- May indicate multi-choice selections');
console.log('\n✨ Done!');