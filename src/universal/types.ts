/**
 * Universal CLI Wrapper - Type Definitions
 *
 * Core types for the universal CLI wrapper system that supports
 * any CLI tool with ANSI color and format processing.
 */

export interface TerminalOutput {
  /** Raw bytes from the terminal */
  raw: Buffer;
  /** Plain text with ANSI codes removed */
  text: string;
  /** Text with ANSI codes preserved */
  ansi: string;
  /** Parsed format information */
  formatted: AnsiSequence[];
  /** Source of the output */
  source: 'stdout' | 'stderr';
  /** Timestamp when received */
  timestamp: number;
}

export interface AnsiSequence {
  /** Type of ANSI sequence */
  type: 'color' | 'cursor' | 'erase' | 'style' | 'unknown';
  /** Raw ANSI escape code */
  code: string;
  /** Numeric parameters */
  params: number[];
  /** Human-readable description */
  description: string;
  /** Position in the original string */
  position: number;
}

export interface StreamChunk {
  /** Source stream */
  source: 'stdout' | 'stderr';
  /** Raw data */
  data: Buffer;
  /** Timestamp when received */
  timestamp: number;
  /** Sequence number for ordering */
  sequence: number;
}

export interface ParsedLine {
  /** Line content */
  content: string;
  /** Whether the line is complete */
  complete: boolean;
  /** Source stream */
  source: 'stdout' | 'stderr';
  /** Timestamp */
  timestamp: number;
}

export interface ProcessConfig {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Process timeout in ms */
  timeout?: number;
}

export interface ToolConfig {
  /** Command executable name */
  command: string;
  /** Tool description */
  description?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Pattern matching rules */
  patterns?: Record<string, PatternConfig>;
  /** Output processing configuration */
  outputProcessing?: OutputProcessingConfig;
  /** Supported modes */
  modes?: {
    interactive?: boolean;
    batch?: boolean;
  };
}

export interface PatternConfig {
  /** Pattern for stdout matching */
  stdout?: string;
  /** Pattern for stderr matching */
  stderr?: string;
  /** Description of what this pattern detects */
  description?: string;
  /** Action to take when pattern matches */
  action?: 'log' | 'notify' | 'trigger';
}

export interface OutputProcessingConfig {
  /** Preserve ANSI color codes */
  preserveColors?: boolean;
  /** Enable real-time streaming */
  realTime?: boolean;
  /** Strip progress bars and animations */
  stripProgress?: boolean;
  /** Number of lines to buffer */
  bufferLines?: number;
  /** Detect table formatting */
  tableDetection?: boolean;
  /** Preserve original formatting */
  preserveFormatting?: boolean;
  /** Progress bar detection */
  progressDetection?: {
    enabled: boolean;
    patterns: string[];
  };
}

export interface Session {
  /** Unique session identifier */
  id: string;
  /** Tool being wrapped */
  tool: string;
  /** Command being executed */
  command: string;
  /** Command arguments */
  args: string[];
  /** Current session status */
  status: 'idle' | 'running' | 'paused' | 'terminated' | 'error';
  /** Session start time */
  startTime: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Working directory */
  cwd: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Output history */
  outputHistory: TerminalOutput[];
  /** Input history */
  inputHistory: string[];
  /** Connected remote clients */
  remoteConnections: Set<string>;
  /** Process ID if running */
  pid?: number;
  /** Exit code if terminated */
  exitCode?: number;
}

export interface RemoteMessage {
  /** Message type */
  type: 'input' | 'output' | 'control' | 'status' | 'error';
  /** Target session ID */
  sessionId: string;
  /** Message payload */
  data: any;
  /** Message timestamp */
  timestamp: number;
  /** Client ID (for routing) */
  clientId?: string;
}

export interface GlobalConfig {
  /** Supported output formats */
  outputFormats: ('raw' | 'text' | 'html' | 'json')[];
  /** Default output format */
  defaultFormat: 'raw' | 'text' | 'html' | 'json';
  /** Stream buffer size in bytes */
  bufferSize: number;
  /** Real-time threshold in ms */
  realTimeThreshold: number;
  /** Session timeout in seconds */
  sessionTimeout: number;
  /** Maximum number of concurrent sessions */
  maxSessions: number;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export type OutputFormat = 'raw' | 'text' | 'html' | 'json';

export interface StreamEvent {
  /** Event type */
  type: 'data' | 'error' | 'close';
  /** Source stream */
  source: 'stdout' | 'stderr' | 'stdin';
  /** Event data */
  data: any;
  /** Timestamp */
  timestamp: number;
  /** Session ID */
  sessionId: string;
}