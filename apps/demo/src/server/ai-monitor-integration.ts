#!/usr/bin/env node
/**
 * Real-world AI monitoring integration for Shelltender
 * Monitors actual terminal sessions running AI CLI tools (claude, aider, etc.)
 */

import { 
  SessionManager,
  BufferManager,
  EventManager,
  TerminalDataPipeline,
  PipelineIntegration,
  WebSocketServer,
  SessionStore
} from '@shelltender/server';
import express from 'express';
import { createServer } from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Real AI patterns based on actual CLI tools
const AI_PATTERNS = {
  // Claude CLI patterns
  claude: [
    {
      name: 'claude-thinking',
      type: 'regex' as const,
      pattern: /([·✢*✶✻✽✺●○◉◎])\s*(\w+)…\s*\((\d+)s\s*·\s*([↑↓⚒\s]*)\s*([\d.]+k?)\s*tokens\)/,
      description: 'Claude thinking animation'
    },
    {
      name: 'claude-file-edit',
      type: 'regex' as const,
      pattern: /Editing\s+(.+?):\s*$/,
      description: 'Claude editing a file'
    }
  ],
  
  // Aider patterns
  aider: [
    {
      name: 'aider-prompt',
      type: 'regex' as const,
      pattern: /^>\s*$/m,
      description: 'Aider input prompt'
    },
    {
      name: 'aider-thinking',
      type: 'string' as const,
      pattern: ['Thinking...', 'Processing...'],
      description: 'Aider processing'
    }
  ],
  
  // Common patterns across AI tools
  common: [
    {
      name: 'yes-no-prompt',
      type: 'regex' as const,
      pattern: /\(y\/n\)\s*:?\s*$|Continue\?\s*\[Y\/n\]\s*:?\s*$/im,
      description: 'Yes/No confirmation'
    },
    {
      name: 'input-needed',
      type: 'regex' as const,
      pattern: /(?:Please|Would you|Should I|Do you want).*\?$/im,
      description: 'AI asking for input'
    },
    {
      name: 'error-occurred',
      type: 'regex' as const,
      pattern: /(?:Error|Failed|Exception|Traceback):\s*(.+)/i,
      description: 'Error detected'
    },
    {
      name: 'task-complete',
      type: 'string' as const,
      pattern: ['✓', '✅', 'Done', 'Complete', 'Finished'],
      description: 'Task completion',
      options: { caseSensitive: false }
    }
  ]
};

interface AIMonitorConfig {
  // Server config
  httpPort?: number;        // Port for AI monitor API (default: 3001)
  
  // Shelltender connection config
  wsPort?: number;          // WebSocket port to connect to (default: 8081)
  wsHost?: string;          // WebSocket host (default: 'localhost')
  
  // Storage config
  dataDir?: string;         // Directory for data storage (default: './shelltender-ai-monitor')
}

class AIMonitorServer {
  private sessionManager!: SessionManager;
  private eventManager!: EventManager;
  private pipeline!: TerminalDataPipeline;
  private app!: express.Application;
  private monitoringStats = new Map<string, {
    patternMatches: number;
    lastActivity: number;
    needsAttention: boolean;
    currentState: string;
  }>();
  private config: Required<AIMonitorConfig>;

  constructor(config: AIMonitorConfig = {}) {
    this.config = {
      httpPort: config.httpPort || 3001,
      wsPort: config.wsPort || 8081,
      wsHost: config.wsHost || 'localhost',
      dataDir: config.dataDir || './shelltender-ai-monitor'
    };
  }

  async start() {
    console.log('🚀 Starting AI Monitor Server...\n');
    console.log(`Configuration:`);
    console.log(`  HTTP API Port: ${this.config.httpPort}`);
    console.log(`  WebSocket Connection: ws://${this.config.wsHost}:${this.config.wsPort}`);
    console.log(`  Data Directory: ${this.config.dataDir}\n`);
    
    // Initialize storage
    const sessionStore = new SessionStore(this.config.dataDir);
    await sessionStore.initialize();
    
    // Initialize components
    this.sessionManager = new SessionManager(sessionStore);
    this.eventManager = new EventManager({ persistPath: path.join(this.config.dataDir, 'patterns') });
    const bufferManager = new BufferManager();
    
    // Set up pipeline with monitoring
    this.pipeline = new TerminalDataPipeline({
      enableMetrics: true,
      enableAudit: true
    });
    
    // Add custom processor to detect AI sessions
    this.pipeline.addProcessor('ai-session-detector', (event) => {
      // Check if this looks like an AI tool session
      const lowerData = event.data.toLowerCase();
      if (lowerData.includes('claude') || 
          lowerData.includes('aider') || 
          lowerData.includes('copilot') ||
          lowerData.includes('gpt')) {
        console.log(`🤖 Detected AI tool in session ${event.sessionId}`);
        this.initializeAIMonitoring(event.sessionId);
      }
      return event;
    }, 5);
    
    // WebSocket server
    const wsServer = WebSocketServer.create(
      this.config.wsPort,
      this.sessionManager,
      bufferManager,
      this.eventManager,
      sessionStore
    );
    
    // Integration
    const integration = new PipelineIntegration(
      this.pipeline,
      this.sessionManager,
      bufferManager,
      wsServer,
      sessionStore,
      this.eventManager
    );
    integration.setup();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Set up HTTP API
    this.setupAPI();
    
    // Start server
    const server = createServer(this.app);
    server.listen(this.config.httpPort, () => {
      console.log(`✅ AI Monitor Server running on http://localhost:${this.config.httpPort}`);
      console.log(`📡 Connected to WebSocket on ws://${this.config.wsHost}:${this.config.wsPort}`);
      console.log('\n📋 Available endpoints:');
      console.log('  GET  /api/sessions     - List all monitored sessions');
      console.log('  GET  /api/stats        - Get monitoring statistics');
      console.log('  POST /api/register/:id - Register patterns for a session');
      console.log('  GET  /api/attention    - Get sessions needing attention');
      console.log('\n🔍 Monitoring for AI patterns in all terminal sessions...\n');
    });
  }

  private async initializeAIMonitoring(sessionId: string) {
    if (this.monitoringStats.has(sessionId)) return;
    
    console.log(`\n📌 Initializing AI monitoring for session ${sessionId}`);
    
    // Register all AI patterns
    const allPatterns = [
      ...AI_PATTERNS.claude,
      ...AI_PATTERNS.aider,
      ...AI_PATTERNS.common
    ];
    
    for (const pattern of allPatterns) {
      try {
        await this.eventManager.registerPattern(sessionId, pattern);
        console.log(`  ✓ Registered pattern: ${pattern.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to register ${pattern.name}:`, error);
      }
    }
    
    // Initialize monitoring stats
    this.monitoringStats.set(sessionId, {
      patternMatches: 0,
      lastActivity: Date.now(),
      needsAttention: false,
      currentState: 'idle'
    });
  }

  private setupEventHandlers() {
    // Monitor pattern matches
    this.eventManager.on('pattern-match', (event) => {
      const stats = this.monitoringStats.get(event.sessionId);
      if (!stats) return;
      
      stats.patternMatches++;
      stats.lastActivity = Date.now();
      
      // Log the match
      console.log(`\n🎯 Pattern Match in session ${event.sessionId}:`);
      console.log(`  Pattern: ${event.patternName}`);
      console.log(`  Match: "${event.match.trim().substring(0, 50)}..."`);
      
      // Update state based on pattern
      switch (event.patternName) {
        case 'claude-thinking':
        case 'aider-thinking':
          stats.currentState = 'thinking';
          stats.needsAttention = false;
          break;
          
        case 'yes-no-prompt':
        case 'input-needed':
        case 'aider-prompt':
          stats.currentState = 'waiting-for-input';
          stats.needsAttention = true;
          console.log(`  ⚠️  ATTENTION NEEDED!`);
          break;
          
        case 'error-occurred':
          stats.currentState = 'error';
          stats.needsAttention = true;
          console.log(`  ❌ ERROR DETECTED!`);
          break;
          
        case 'task-complete':
          stats.currentState = 'completed';
          stats.needsAttention = false;
          break;
      }
    });
    
    // Monitor new sessions
    this.sessionManager.on('sessionCreated', (session) => {
      console.log(`\n🆕 New session created: ${session.id}`);
      console.log(`  Command: ${session.command || 'default shell'}`);
    });
    
    // Monitor session data
    this.sessionManager.onData((sessionId, data) => {
      const stats = this.monitoringStats.get(sessionId);
      if (stats) {
        stats.lastActivity = Date.now();
      }
    });
  }

  private setupAPI() {
    this.app = express();
    this.app.use(express.json());
    
    // List all monitored sessions
    this.app.get('/api/sessions', (req, res) => {
      const sessions = this.sessionManager.getActiveSessionIds().map(id => {
        const session = this.sessionManager.getSession(id);
        const stats = this.monitoringStats.get(id);
        return {
          id,
          command: session?.command,
          stats: stats || { monitored: false }
        };
      });
      res.json(sessions);
    });
    
    // Get monitoring statistics
    this.app.get('/api/stats', (req, res) => {
      const stats = {
        totalSessions: this.sessionManager.getActiveSessionIds().length,
        monitoredSessions: this.monitoringStats.size,
        sessionsNeedingAttention: Array.from(this.monitoringStats.entries())
          .filter(([_, stats]) => stats.needsAttention).length,
        pipelineMetrics: {}, // Pipeline metrics if available
        sessionStats: Object.fromEntries(this.monitoringStats)
      };
      res.json(stats);
    });
    
    // Get sessions needing attention
    this.app.get('/api/attention', (req, res) => {
      const needingAttention = Array.from(this.monitoringStats.entries())
        .filter(([_, stats]) => stats.needsAttention)
        .map(([sessionId, stats]) => ({
          sessionId,
          state: stats.currentState,
          lastActivity: new Date(stats.lastActivity).toISOString()
        }));
      res.json(needingAttention);
    });
    
    // Manually register patterns for a session
    this.app.post('/api/register/:sessionId', async (req, res) => {
      const { sessionId } = req.params;
      try {
        await this.initializeAIMonitoring(sessionId);
        res.json({ success: true, message: 'Patterns registered' });
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }
}

// Verification helper to show it's working
function showVerification() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 HOW TO VERIFY IT\'S WORKING:');
  console.log('='.repeat(60));
  console.log('\n1. Start the AI monitor server:');
  console.log('   $ npx ts-node ai-monitor-integration.ts\n');
  console.log('2. In another terminal, start a Shelltender session:');
  console.log('   $ cd apps/demo && npm run dev\n');
  console.log('3. Open browser to http://localhost:5173\n');
  console.log('4. In the terminal, run an AI tool:');
  console.log('   $ claude "help me write a function"');
  console.log('   $ aider "fix the bug in server.ts"\n');
  console.log('5. Watch this console for pattern matches!\n');
  console.log('6. Check monitoring stats:');
  console.log('   $ curl http://localhost:3001/api/stats');
  console.log('   $ curl http://localhost:3001/api/attention\n');
  console.log('7. The console will show:');
  console.log('   - 🤖 When AI tools are detected');
  console.log('   - 🎯 When patterns match');
  console.log('   - ⚠️  When attention is needed');
  console.log('   - ❌ When errors occur\n');
  console.log('='.repeat(60) + '\n');
}

// Run the server
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: AIMonitorConfig = {};
  
  // Simple argument parsing
  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const value = args[i + 1];
    
    switch (arg) {
      case '--http-port':
      case '-p':
        config.httpPort = parseInt(value);
        break;
      case '--ws-port':
        config.wsPort = parseInt(value);
        break;
      case '--ws-host':
        config.wsHost = value;
        break;
      case '--data-dir':
      case '-d':
        config.dataDir = value;
        break;
      case '--help':
      case '-h':
        console.log(`
AI Monitor Server for Shelltender

Usage: npx ts-node ai-monitor-integration.ts [options]

Options:
  -p, --http-port <port>    HTTP API port (default: 3001)
  --ws-port <port>          WebSocket port to connect to (default: 8081)
  --ws-host <host>          WebSocket host (default: localhost)
  -d, --data-dir <dir>      Data directory (default: ./shelltender-ai-monitor)
  -h, --help                Show this help message

Examples:
  # Use default ports
  npx ts-node ai-monitor-integration.ts
  
  # Custom HTTP port
  npx ts-node ai-monitor-integration.ts -p 4000
  
  # Connect to remote Shelltender
  npx ts-node ai-monitor-integration.ts --ws-host 192.168.1.100 --ws-port 8080
  
  # All options
  npx ts-node ai-monitor-integration.ts -p 4000 --ws-port 9000 --ws-host myserver -d /tmp/ai-monitor
        `);
        process.exit(0);
    }
  }
  
  const server = new AIMonitorServer(config);
  server.start().then(() => {
    showVerification();
  }).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { AIMonitorServer, AI_PATTERNS };