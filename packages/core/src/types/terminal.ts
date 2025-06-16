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