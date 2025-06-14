import { SessionOptions } from './session';

export interface TerminalData {
  type: 'output' | 'input' | 'resize' | 'create' | 'connect' | 'disconnect' | 'error' | 'bell' | 'exit';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
  scrollback?: string;
  exitCode?: number;
  options?: SessionOptions;  // For create message
}