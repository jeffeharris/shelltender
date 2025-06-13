export interface TerminalSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  title?: string;
  cols: number;
  rows: number;
}

export interface TerminalData {
  type: 'output' | 'input' | 'resize' | 'create' | 'connect' | 'disconnect' | 'error';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  scrollback?: string;
}