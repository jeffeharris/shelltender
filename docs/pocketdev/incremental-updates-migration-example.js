// PocketDev Migration Example: Before and After

// ============================================
// BEFORE: Multiple WebSocket connections cause duplicate output
// ============================================

class DirectTerminalOld {
  constructor() {
    this.terminals = new Map();
  }

  // Problem: Creates new WebSocket for each command
  async executeCommand(sessionId, command) {
    const ws = new WebSocket('ws://shelltender:8080/ws');
    
    ws.on('open', () => {
      // This causes full buffer replay!
      ws.send(JSON.stringify({
        type: 'connect',
        sessionId: sessionId
      }));
      
      ws.send(JSON.stringify({
        type: 'input',
        sessionId: sessionId,
        data: command + '\n'
      }));
      
      // Close after sending
      setTimeout(() => ws.close(), 1000);
    });
  }

  // Problem: Tab switching replays entire buffer
  switchTab(fromSessionId, toSessionId) {
    const terminal = this.terminals.get(toSessionId);
    terminal.clear(); // Have to clear to avoid duplicates
    
    this.ws.send(JSON.stringify({
      type: 'connect',
      sessionId: toSessionId
    }));
    // Server sends ENTIRE buffer, causing duplicates
  }
}

// ============================================
// AFTER: Single WebSocket with incremental updates
// ============================================

class DirectTerminalNew {
  constructor() {
    this.terminals = new Map();
    this.sessionSequences = new Map();
    this.hasReceivedBuffer = new Set();
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket('ws://shelltender:8080/ws');
    
    this.ws.on('message', (event) => {
      const msg = JSON.parse(event.data);
      
      switch (msg.type) {
        case 'connect':
          this.handleConnectResponse(msg);
          break;
          
        case 'output':
          this.handleOutput(msg);
          break;
      }
    });
  }

  handleConnectResponse(msg) {
    const terminal = this.terminals.get(msg.sessionId);
    
    if (msg.incrementalData) {
      // Just new data since last sequence!
      terminal.write(msg.incrementalData);
    } else if (msg.scrollback && !this.hasReceivedBuffer.has(msg.sessionId)) {
      // First time seeing this session
      terminal.clear();
      terminal.write(msg.scrollback);
      this.hasReceivedBuffer.add(msg.sessionId);
    }
    
    // Track sequence for next time
    if (msg.lastSequence !== undefined) {
      this.sessionSequences.set(msg.sessionId, msg.lastSequence);
    }
  }

  handleOutput(msg) {
    const terminal = this.terminals.get(msg.sessionId);
    terminal.write(msg.data);
    
    // Track sequence
    if (msg.sequence !== undefined) {
      this.sessionSequences.set(msg.sessionId, msg.sequence);
    }
  }

  // Fixed: Use persistent connection
  async executeCommand(sessionId, command) {
    this.ws.send(JSON.stringify({
      type: 'input',
      sessionId: sessionId,
      data: command + '\n'
    }));
    // No new connection, no duplicate buffer!
  }

  // Fixed: Tab switching only gets new data
  switchTab(fromSessionId, toSessionId) {
    const terminal = this.terminals.get(toSessionId);
    // No need to clear!
    
    const lastSequence = this.sessionSequences.get(toSessionId);
    
    this.ws.send(JSON.stringify({
      type: 'connect',
      sessionId: toSessionId,
      useIncrementalUpdates: true,  // Magic flag!
      lastSequence: lastSequence     // Tell server what we have
    }));
    // Server only sends NEW data!
  }
}

// ============================================
// React Component Example
// ============================================

const DirectTerminal = ({ sessionId, isVisible }) => {
  const wsRef = useRef();
  const sequencesRef = useRef(new Map());
  const hasBufferRef = useRef(new Set());
  
  // Connect when visible
  useEffect(() => {
    if (!isVisible || !wsRef.current) return;
    
    const lastSeq = sequencesRef.current.get(sessionId);
    
    wsRef.current.send(JSON.stringify({
      type: 'connect',
      sessionId,
      useIncrementalUpdates: true,
      lastSequence: lastSeq
    }));
  }, [isVisible, sessionId]);
  
  // Handle messages
  const handleMessage = (msg) => {
    if (msg.sessionId !== sessionId) return;
    
    switch (msg.type) {
      case 'connect':
        if (msg.incrementalData) {
          // Incremental update
          terminalRef.current.write(msg.incrementalData);
        } else if (msg.scrollback && !hasBufferRef.current.has(sessionId)) {
          // Full buffer (first time)
          terminalRef.current.clear();
          terminalRef.current.write(msg.scrollback);
          hasBufferRef.current.add(sessionId);
        }
        
        if (msg.lastSequence !== undefined) {
          sequencesRef.current.set(sessionId, msg.lastSequence);
        }
        break;
        
      case 'output':
        terminalRef.current.write(msg.data);
        if (msg.sequence !== undefined) {
          sequencesRef.current.set(sessionId, msg.sequence);
        }
        break;
    }
  };
  
  return <div ref={terminalRef} style={{ display: isVisible ? 'block' : 'none' }} />;
};