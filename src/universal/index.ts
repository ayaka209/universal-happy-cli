/**
 * Universal CLI Wrapper - Main Entry Point
 *
 * Export all core components for use by the CLI application.
 */

export { SessionManager } from './SessionManager.js';
export { ProcessManager } from './ProcessManager.js';
export { StreamParser } from './StreamParser.js';
export { FormatProcessor } from './FormatProcessor.js';
export { ConfigManager } from './ConfigManager.js';

export type * from './types.js';

// Re-export commonly used types
export type {
  Session,
  TerminalOutput,
  ProcessConfig,
  ToolConfig,
  GlobalConfig,
  OutputFormat,
  RemoteMessage
} from './types.js';