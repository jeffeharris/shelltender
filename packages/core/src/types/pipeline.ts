export interface TerminalDataEvent {
  sessionId: string;
  data: string;
  timestamp: number;
  metadata?: {
    source?: 'pty' | 'user' | 'system';
    encoding?: string;
    [key: string]: any;
  };
}

export interface ProcessedDataEvent extends TerminalDataEvent {
  originalData: string;
  processedData: string;
  transformations: string[];
}

export type DataProcessor = (event: TerminalDataEvent) => TerminalDataEvent | null;
export type DataFilter = (event: TerminalDataEvent) => boolean;

export interface PipelineOptions {
  maxListeners?: number;
  enableAudit?: boolean;
  enableMetrics?: boolean;
}

export interface IPipelineSubscriber {
  onData(callback: (event: ProcessedDataEvent) => void): () => void;
  onSessionData(sessionId: string, callback: (event: ProcessedDataEvent) => void): () => void;
}