export interface TerminalSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  title?: string;
  cols: number;
  rows: number;
  command?: string;
  args?: string[];
  locked?: boolean;
}

export interface TerminalEvent {
  type: 'bell' | 'output-match' | 'exit' | 'error';
  sessionId: string;
  timestamp: Date;
  data?: any;
}