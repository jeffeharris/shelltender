// Export all server components
export { SessionManager } from './SessionManager.js';
export { BufferManager } from './BufferManager.js';
export { SessionStore } from './SessionStore.js';
export { RestrictedShell } from './RestrictedShell.js';
export { WebSocketServer } from './WebSocketServer.js';
export { EventManager } from './events/EventManager.js';

// Export pipeline components
export { TerminalDataPipeline, CommonProcessors, CommonFilters } from './TerminalDataPipeline.js';
export { PipelineIntegration } from './integration/PipelineIntegration.js';

// Export convenience functions
export { 
  createShelltender, 
  createShelltenderServer, 
  startShelltender,
  detectEnvironment,
  validateConfiguration
} from './createServer.js';
export type { ShelltenderConfig, ShelltenderInstance } from './createServer.js';

// Export interfaces
export type { ISessionManager, IDataEmitter } from './interfaces/ISessionManager.js';

// Export pattern matchers
export * from './patterns/index.js';

// Export types that are specific to the server
export type { StoredSession } from './SessionStore.js';
export type { SessionMetadata } from './routes/admin.js';