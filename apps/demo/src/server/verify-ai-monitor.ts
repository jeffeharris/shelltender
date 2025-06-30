#!/usr/bin/env node
/**
 * Verification script that demonstrates AI monitoring with real Claude sessions
 * This creates a Shelltender session running Claude and verifies pattern detection
 */

import { 
  SessionManager,
  BufferManager,
  EventManager,
  SessionStore
} from '@shelltender/server';
import chalk from 'chalk';
import { AIMonitorServer } from './ai-monitor-integration';

class AIMonitorVerifier {
  private sessionManager!: SessionManager;
  private eventManager!: EventManager;
  private detectedEvents: any[] = [];
  
  async run() {
    console.log(chalk.blue.bold('\n🔍 AI Monitor Verification Script\n'));
    console.log('This will create a Shelltender session running Claude and verify pattern detection.\n');
    
    // Start the AI monitor server
    console.log(chalk.cyan('1. Starting AI Monitor Server...'));
    const monitor = new AIMonitorServer({ httpPort: 3002 }); // Different port to avoid conflicts
    await monitor.start();
    
    // Give server time to start
    await this.delay(1000);
    
    // Initialize our own session manager to create test session
    console.log(chalk.cyan('\n2. Initializing Shelltender components...'));
    const sessionStore = new SessionStore('./verify-ai-monitor-data');
    await sessionStore.initialize();
    
    this.sessionManager = new SessionManager(sessionStore);
    const bufferManager = new BufferManager();
    this.eventManager = new EventManager();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Create a session running Claude
    console.log(chalk.cyan('\n3. Creating Claude session...'));
    const session = this.sessionManager.createSession({
      command: 'claude',
      args: ['-m', 'claude-3-5-sonnet-20241022'], // Use specific model
      cols: 80,
      rows: 24,
      cwd: process.cwd()
    });
    
    console.log(chalk.green(`✓ Created session: ${session.id}`));
    console.log(chalk.gray(`  Command: claude -m claude-3-5-sonnet-20241022`));
    
    // Register AI patterns for this session
    await this.registerPatterns(session.id);
    
    // Run verification tests
    console.log(chalk.cyan('\n4. Running verification tests...\n'));
    
    await this.test1_ThinkingAnimation(session.id);
    await this.test2_MultipleChoice(session.id);
    await this.test3_YesNoPrompt(session.id);
    await this.test4_ErrorScenario(session.id);
    
    // Show results
    this.showResults();
    
    // Cleanup
    console.log(chalk.gray('\nCleaning up...'));
    this.sessionManager.killSession(session.id);
    
    console.log(chalk.green.bold('\n✅ Verification complete!\n'));
    
    // Show how to monitor real sessions
    this.showRealWorldUsage();
    
    process.exit(0);
  }
  
  private setupEventListeners() {
    // Monitor all data to show what's happening
    this.sessionManager.onData((sessionId, data) => {
      if (data.trim()) {
        console.log(chalk.dim(`[Claude Output] ${data.trim().substring(0, 60)}...`));
      }
    });
    
    // Monitor pattern matches
    this.eventManager.on('pattern-match', (event) => {
      this.detectedEvents.push(event);
      console.log(chalk.yellow(`\n🎯 Pattern Detected: ${event.patternName}`));
      console.log(chalk.yellow(`   Match: "${event.match.trim().substring(0, 50)}..."`));
    });
  }
  
  private async registerPatterns(sessionId: string) {
    const patterns = [
      {
        name: 'claude-thinking',
        type: 'regex' as const,
        pattern: /([·✢*✶✻✽✺●○◉◎])\s*(\w+)…/,
        description: 'Claude thinking animation'
      },
      {
        name: 'yes-no-prompt',
        type: 'regex' as const,
        pattern: /\(y\/n\)\s*:?\s*$|Would you like.*\?$/im,
        description: 'Yes/No or question prompt'
      },
      {
        name: 'multiple-choice',
        type: 'regex' as const,
        pattern: /\[(\d+)\]\s+\w+|Choose.*:$/im,
        description: 'Multiple choice prompt'
      }
    ];
    
    for (const pattern of patterns) {
      await this.eventManager.registerPattern(sessionId, pattern);
    }
  }
  
  private async test1_ThinkingAnimation(sessionId: string) {
    console.log(chalk.bold('Test 1: Thinking Animation Detection'));
    console.log(chalk.gray('Asking Claude to simulate thinking for 10 seconds...\n'));
    
    const prompt = `For testing our monitoring system, please:
1. Show your thinking animation (with the dots) for about 10 seconds
2. Make it look like you're "Analyzing" something
3. Include token count like "(10s · ↑ 2.5k tokens)"
This is just for testing pattern detection.`;
    
    this.sessionManager.sendCommand(sessionId, prompt);
    
    // Wait for Claude to respond
    await this.delay(15000);
    console.log('');
  }
  
  private async test2_MultipleChoice(sessionId: string) {
    console.log(chalk.bold('\nTest 2: Multiple Choice Detection'));
    console.log(chalk.gray('Asking Claude to present multiple choice options...\n'));
    
    const prompt = `For testing, please present a multiple choice question with 3 options like:
    
What would you like me to do?
[1] Option A
[2] Option B  
[3] Option C

Choose your option:`;
    
    this.sessionManager.sendCommand(sessionId, prompt);
    await this.delay(8000);
    
    // Respond to the choice
    this.sessionManager.sendCommand(sessionId, '2');
    await this.delay(3000);
  }
  
  private async test3_YesNoPrompt(sessionId: string) {
    console.log(chalk.bold('\nTest 3: Yes/No Prompt Detection'));
    console.log(chalk.gray('Asking Claude to ask a yes/no question...\n'));
    
    const prompt = `For testing, please ask me a yes/no question that ends with "(y/n): "`;
    
    this.sessionManager.sendCommand(sessionId, prompt);
    await this.delay(5000);
    
    // Answer the prompt
    this.sessionManager.sendCommand(sessionId, 'y');
    await this.delay(2000);
  }
  
  private async test4_ErrorScenario(sessionId: string) {
    console.log(chalk.bold('\nTest 4: Error Detection'));
    console.log(chalk.gray('Creating an error scenario...\n'));
    
    const prompt = `For testing, please simulate an error message that starts with "Error:" followed by some description`;
    
    this.sessionManager.sendCommand(sessionId, prompt);
    await this.delay(5000);
  }
  
  private showResults() {
    console.log(chalk.blue.bold('\n📊 Verification Results:\n'));
    
    const patternCounts = new Map<string, number>();
    for (const event of this.detectedEvents) {
      patternCounts.set(event.patternName, (patternCounts.get(event.patternName) || 0) + 1);
    }
    
    console.log(chalk.cyan('Detected Patterns:'));
    for (const [pattern, count] of patternCounts) {
      console.log(chalk.green(`  ✓ ${pattern}: ${count} matches`));
    }
    
    if (this.detectedEvents.length === 0) {
      console.log(chalk.red('  ✗ No patterns detected'));
    }
    
    console.log(chalk.cyan(`\nTotal events detected: ${this.detectedEvents.length}`));
  }
  
  private showRealWorldUsage() {
    console.log(chalk.blue.bold('\n💡 Real-World Usage:\n'));
    console.log('To monitor your actual Claude sessions:');
    console.log('\n1. Start the AI monitor server:');
    console.log(chalk.gray('   $ npx ts-node apps/demo/src/server/ai-monitor-integration.ts'));
    console.log('\n2. Use Shelltender normally with Claude:');
    console.log(chalk.gray('   $ cd apps/demo && npm run dev'));
    console.log(chalk.gray('   # Open browser, create terminal, run: claude'));
    console.log('\n3. The monitor will automatically:');
    console.log('   - Detect when Claude is running');
    console.log('   - Register all AI patterns');
    console.log('   - Alert when Claude needs input');
    console.log('   - Track thinking animations');
    console.log('   - Detect errors');
    console.log('\n4. Check status via API:');
    console.log(chalk.gray('   $ curl http://localhost:3001/api/stats'));
    console.log(chalk.gray('   $ curl http://localhost:3001/api/attention'));
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run verification
if (require.main === module) {
  const verifier = new AIMonitorVerifier();
  verifier.run().catch(error => {
    console.error(chalk.red('Verification failed:'), error);
    process.exit(1);
  });
}

export { AIMonitorVerifier };