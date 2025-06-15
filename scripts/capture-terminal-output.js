#!/usr/bin/env node

/**
 * Generic terminal output capture tool
 * Captures raw PTY output from any command for analysis
 */

import { spawn } from 'node-pty';
import fs from 'fs';
import path from 'path';

// Get command from args or default to 'claude'
const command = process.argv[2] || 'claude';
const args = process.argv.slice(3);

const OUTPUT_DIR = './terminal-captures';
const CAPTURE_FILE = path.join(OUTPUT_DIR, `${command}-${Date.now()}.log`);
const ANALYSIS_FILE = path.join(OUTPUT_DIR, `${command}-${Date.now()}-analysis.json`);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Raw output stream
const rawStream = fs.createWriteStream(CAPTURE_FILE);

// Analysis data
const analysis = {
  startTime: new Date().toISOString(),
  totalBytes: 0,
  lineCount: 0,
  ansiCodes: [],
  potentialPrompts: [],
  clearScreenEvents: 0,
  cursorMovements: 0,
  timeGaps: [],
  lastOutputTime: Date.now()
};

// Spawn the command
console.log(`Starting ${command} capture...`);
console.log(`Raw output: ${CAPTURE_FILE}`);
console.log(`Analysis: ${ANALYSIS_FILE}`);
console.log('---');

const ptyProcess = spawn(command, args, {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

// Capture everything
ptyProcess.onData((data) => {
  const now = Date.now();
  const timeSinceLastOutput = now - analysis.lastOutputTime;
  
  // Record time gaps (might indicate waiting for input)
  if (timeSinceLastOutput > 1000) {
    analysis.timeGaps.push({
      gap: timeSinceLastOutput,
      afterOutput: data.slice(0, 50),
      timestamp: new Date().toISOString()
    });
  }
  
  analysis.lastOutputTime = now;
  analysis.totalBytes += data.length;
  
  // Write raw data
  rawStream.write(data);
  
  // Also output to console so we can interact
  process.stdout.write(data);
  
  // Analyze the chunk
  analyzeChunk(data);
});

// Set stdin to raw mode to capture everything properly
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Pass through our input
process.stdin.on('data', (key) => {
  // Handle Ctrl+C to exit
  if (key === '\x03') {
    process.exit();
    return;
  }
  
  // Pass everything else to the process
  ptyProcess.write(key);
  
  // Log what we sent (but convert special chars for display)
  analysis.userInputs = analysis.userInputs || [];
  analysis.userInputs.push({
    input: key,
    inputHex: Buffer.from(key).toString('hex'),
    timestamp: new Date().toISOString(),
    afterOutput: getLastNChars(50)
  });
});

// Clean up on exit
ptyProcess.onExit((exitCode) => {
  // Restore terminal
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  
  console.log('\n---');
  console.log('Capture complete!');
  
  analysis.endTime = new Date().toISOString();
  analysis.exitCode = exitCode;
  
  // Write analysis
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analysis, null, 2));
  
  // Quick summary
  console.log(`\nSummary:`);
  console.log(`- Total bytes: ${analysis.totalBytes}`);
  console.log(`- ANSI codes found: ${analysis.ansiCodes.length}`);
  console.log(`- Potential prompts: ${analysis.potentialPrompts.length}`);
  console.log(`- Time gaps > 1s: ${analysis.timeGaps.length}`);
  console.log(`- Clear screen events: ${analysis.clearScreenEvents}`);
  
  process.exit(0);
});

let recentOutput = '';

function getLastNChars(n) {
  return recentOutput.slice(-n);
}

function analyzeChunk(data) {
  recentOutput += data;
  if (recentOutput.length > 1000) {
    recentOutput = recentOutput.slice(-500);
  }
  
  // Look for ANSI codes
  const ansiRegex = /\x1b\[[0-9;]*[mGKHF]/g;
  const ansiMatches = data.match(ansiRegex);
  if (ansiMatches) {
    ansiMatches.forEach(code => {
      if (!analysis.ansiCodes.includes(code)) {
        analysis.ansiCodes.push(code);
      }
    });
  }
  
  // Look for clear screen
  if (data.includes('\x1b[2J') || data.includes('\x1b[H')) {
    analysis.clearScreenEvents++;
  }
  
  // Look for cursor movements
  if (data.match(/\x1b\[\d+[ABCD]/)) {
    analysis.cursorMovements++;
  }
  
  // Look for potential prompts (ends with : or ? followed by space or nothing)
  const promptRegex = /[^\n]+[?:]\s*$/;
  const promptMatch = data.match(promptRegex);
  if (promptMatch) {
    analysis.potentialPrompts.push({
      text: promptMatch[0],
      raw: Buffer.from(promptMatch[0]).toString('hex'),
      timestamp: new Date().toISOString(),
      fullChunk: data.slice(0, 200)
    });
  }
  
  // Count newlines
  const newlines = (data.match(/\n/g) || []).length;
  analysis.lineCount += newlines;
}

// Handle process termination
process.on('SIGINT', () => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  ptyProcess.kill();
});

process.on('exit', () => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
});

console.log('Ready to interact with Claude Code...');
console.log('Type your commands and watch the capture.');
console.log('Press Ctrl+C to stop and save analysis.\n');