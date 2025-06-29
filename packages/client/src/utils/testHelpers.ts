// Helper utilities for UI testing and debugging

export const captureTerminalState = () => {
  const terminal = document.querySelector('.xterm');
  const sessionInfo = document.querySelector('[data-testid="session-info"]');
  const wsStatus = document.querySelector('[data-testid="ws-status"]');
  
  return {
    terminalContent: terminal?.textContent || 'Terminal not found',
    sessionId: sessionInfo?.getAttribute('data-session-id') || 'No session',
    wsConnected: wsStatus?.classList.contains('connected') || false,
    timestamp: new Date().toISOString()
  };
};

export const simulateKeyboardInput = (text: string) => {
  const terminal = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
  if (terminal) {
    terminal.focus();
    terminal.value = text;
    terminal.dispatchEvent(new Event('input', { bubbles: true }));
    terminal.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
  }
};

export const logUIState = () => {
  console.group('Shelltender UI State');
  console.log('Terminal:', captureTerminalState());
  console.log('Active Sessions:', document.querySelectorAll('.session-tab').length);
  console.log('WebSocket State:', (window as any).wsService?.isConnected() || false);
  console.groupEnd();
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).shelltenderTest = {
    captureState: captureTerminalState,
    simulateInput: simulateKeyboardInput,
    logState: logUIState
  };
}