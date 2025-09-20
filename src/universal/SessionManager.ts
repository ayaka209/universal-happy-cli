/**
 * Universal CLI Wrapper - Session Manager
 *
 * Manages CLI sessions, integrates all components, and handles remote connections.
 * Core orchestrator for the universal CLI wrapper system.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  Session,
  RemoteMessage,
  TerminalOutput,
  OutputFormat,
  ProcessConfig,
  ToolConfig
} from './types.js';
import { ProcessManager } from './ProcessManager.js';
import { StreamParser } from './StreamParser.js';
import { FormatProcessor } from './FormatProcessor.js';
import { ConfigManager } from './ConfigManager.js';
import { happyIntegration } from './HappyIntegration.js';

export interface SessionEvents {
  sessionCreated: (sessionId: string) => void;
  sessionStarted: (sessionId: string) => void;
  sessionTerminated: (sessionId: string, exitCode?: number) => void;
  sessionError: (sessionId: string, error: Error) => void;
  output: (sessionId: string, output: TerminalOutput) => void;
  input: (sessionId: string, input: string) => void;
  statusChange: (sessionId: string, status: Session['status']) => void;
  remoteConnect: (sessionId: string, clientId: string) => void;
  remoteDisconnect: (sessionId: string, clientId: string) => void;
}

export class SessionManager extends EventEmitter<SessionEvents> {
  private sessions = new Map<string, Session>();
  private processManager = new ProcessManager();
  private streamParser = new StreamParser();
  private formatProcessor = new FormatProcessor();
  private configManager = new ConfigManager();

  private readonly maxSessions = 50;
  private readonly sessionTimeout = 3600000; // 1 hour
  private sessionCleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    this.setupProcessHandlers();
    this.setupCleanupInterval();
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    await this.configManager.initialize();
  }

  /**
   * Create a new session
   */
  async createSession(options: {
    tool?: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    autoStart?: boolean;
    directOutput?: boolean;
  }): Promise<string> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum number of sessions (${this.maxSessions}) reached`);
    }

    const sessionId = randomUUID();
    const tool = options.tool || await this.configManager.detectTool(options.command) || 'generic';
    const toolConfig = this.configManager.getToolConfig(tool);

    const session: Session = {
      id: sessionId,
      tool,
      command: options.command,
      args: options.args || [],
      status: 'idle',
      startTime: Date.now(),
      lastActivity: Date.now(),
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...toolConfig?.env,
        ...options.env
      },
      directOutput: options.directOutput !== false, // Default to true
      outputHistory: [],
      inputHistory: [],
      remoteConnections: new Set()
    };

    this.sessions.set(sessionId, session);
    this.emit('sessionCreated', sessionId);

    // Register with Happy CLI integration for mobile app visibility
    try {
      await happyIntegration.registerSession(session);
    } catch (error) {
      // Don't fail session creation if integration fails
      console.warn('Failed to register session with Happy CLI integration:', error);
    }

    if (options.autoStart !== false) {
      await this.startSession(sessionId);
    }

    return sessionId;
  }

  /**
   * Start a session (spawn the process)
   */
  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'idle') {
      throw new Error(`Session ${sessionId} is not idle (current status: ${session.status})`);
    }

    this.updateSessionStatus(sessionId, 'running');

    try {
      const processConfig: ProcessConfig = {
        command: session.command,
        args: session.args,
        cwd: session.cwd,
        env: session.env,
        directOutput: session.directOutput
      };

      const managedProcess = await this.processManager.spawn(sessionId, processConfig);
      session.pid = managedProcess.pid;
      session.lastActivity = Date.now();

      this.emit('sessionStarted', sessionId);
    } catch (error) {
      this.updateSessionStatus(sessionId, 'error');
      this.emit('sessionError', sessionId, error as Error);
      throw error;
    }
  }

  /**
   * Send input to a session
   */
  async sendInput(sessionId: string, input: string, clientId?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'running') {
      throw new Error(`Session ${sessionId} is not running (status: ${session.status})`);
    }

    try {
      await this.processManager.send(sessionId, input);

      session.inputHistory.push(input);
      session.lastActivity = Date.now();

      this.emit('input', sessionId, input);

      // Broadcast to remote clients (excluding sender)
      this.broadcastToRemote(sessionId, {
        type: 'input',
        sessionId,
        data: { input },
        timestamp: Date.now(),
        clientId
      }, clientId);

    } catch (error) {
      throw new Error(`Failed to send input to session ${sessionId}: ${error}`);
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * List all sessions
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session history in specified format
   */
  getSessionHistory(
    sessionId: string,
    format: OutputFormat = 'text',
    limit?: number
  ): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    let history = session.outputHistory;
    if (limit && limit > 0) {
      history = history.slice(-limit);
    }

    return history.map(output =>
      this.formatProcessor.serializeForTransmission(output, format)
    );
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'running') {
      throw new Error(`Session ${sessionId} is not running`);
    }

    try {
      await this.processManager.pause(sessionId);
      this.updateSessionStatus(sessionId, 'paused');
    } catch (error) {
      throw new Error(`Failed to pause session ${sessionId}: ${error}`);
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session ${sessionId} is not paused`);
    }

    try {
      await this.processManager.resume(sessionId);
      this.updateSessionStatus(sessionId, 'running');
    } catch (error) {
      throw new Error(`Failed to resume session ${sessionId}: ${error}`);
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string, force = false): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status === 'terminated') {
      return; // Already terminated
    }

    try {
      if (force) {
        await this.processManager.kill(sessionId, 'SIGKILL');
      } else {
        await this.processManager.kill(sessionId, 'SIGTERM');
      }

      this.updateSessionStatus(sessionId, 'terminated');

      // Clean up after a delay
      setTimeout(() => {
        this.cleanupSession(sessionId);
      }, 5000);

    } catch (error) {
      throw new Error(`Failed to terminate session ${sessionId}: ${error}`);
    }
  }

  /**
   * Add remote connection to session
   */
  addRemoteConnection(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.remoteConnections.add(clientId);
    session.lastActivity = Date.now();
    this.emit('remoteConnect', sessionId, clientId);
    return true;
  }

  /**
   * Remove remote connection from session
   */
  removeRemoteConnection(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const removed = session.remoteConnections.delete(clientId);
    if (removed) {
      this.emit('remoteDisconnect', sessionId, clientId);
    }
    return removed;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    runningSessions: number;
    idleSessions: number;
    pausedSessions: number;
    terminatedSessions: number;
    totalRemoteConnections: number;
    processStats: any;
  } {
    const sessions = Array.from(this.sessions.values());

    let totalRemoteConnections = 0;
    const statusCounts = {
      idle: 0,
      running: 0,
      paused: 0,
      terminated: 0,
      error: 0
    };

    sessions.forEach(session => {
      statusCounts[session.status]++;
      totalRemoteConnections += session.remoteConnections.size;
    });

    return {
      totalSessions: sessions.length,
      runningSessions: statusCounts.running,
      idleSessions: statusCounts.idle,
      pausedSessions: statusCounts.paused,
      terminatedSessions: statusCounts.terminated,
      totalRemoteConnections,
      processStats: this.processManager.getStats()
    };
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    this.processManager.on('stdout', (data: Buffer, processId: string) => {
      this.handleProcessOutput(processId, data, 'stdout');
    });

    this.processManager.on('stderr', (data: Buffer, processId: string) => {
      this.handleProcessOutput(processId, data, 'stderr');
    });

    this.processManager.on('exit', (code: number | null, signal: string | null, processId: string) => {
      this.handleProcessExit(processId, code, signal);
    });

    this.processManager.on('error', (error: Error, processId: string) => {
      this.handleProcessError(processId, error);
    });
  }

  /**
   * Handle process output
   */
  private handleProcessOutput(sessionId: string, data: Buffer, source: 'stdout' | 'stderr'): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Update activity
    session.lastActivity = Date.now();

    // Process the output
    const output = this.formatProcessor.processOutput(data, source);
    session.outputHistory.push(output);

    // Limit history size to prevent memory issues
    if (session.outputHistory.length > 10000) {
      session.outputHistory = session.outputHistory.slice(-5000);
    }

    // Emit output event
    this.emit('output', sessionId, output);

    // Broadcast to remote clients
    this.broadcastToRemote(sessionId, {
      type: 'output',
      sessionId,
      data: {
        source,
        text: output.text,
        ansi: output.ansi,
        timestamp: output.timestamp
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(sessionId: string, code: number | null, signal: string | null): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.exitCode = code || undefined;
    this.updateSessionStatus(sessionId, 'terminated');

    this.emit('sessionTerminated', sessionId, code || undefined);

    // Broadcast to remote clients
    this.broadcastToRemote(sessionId, {
      type: 'status',
      sessionId,
      data: {
        status: 'terminated',
        exitCode: code,
        signal
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle process error
   */
  private handleProcessError(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.updateSessionStatus(sessionId, 'error');
    this.emit('sessionError', sessionId, error);

    // Broadcast to remote clients
    this.broadcastToRemote(sessionId, {
      type: 'error',
      sessionId,
      data: {
        error: error.message,
        stack: error.stack
      },
      timestamp: Date.now()
    });
  }

  /**
   * Update session status and emit event
   */
  private updateSessionStatus(sessionId: string, status: Session['status']): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = status;
    session.lastActivity = Date.now();
    this.emit('statusChange', sessionId, status);

    // Update status in Happy CLI integration
    happyIntegration.updateSessionStatus(sessionId, status).catch(error => {
      // Don't fail status update if integration fails
      console.warn('Failed to update session status in Happy CLI integration:', error);
    });
  }

  /**
   * Broadcast message to remote clients
   */
  private broadcastToRemote(
    sessionId: string,
    message: RemoteMessage,
    excludeClientId?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    for (const clientId of session.remoteConnections) {
      if (clientId !== excludeClientId) {
        // TODO: Implement actual message sending to remote clients
        // This would typically involve WebSocket connections or HTTP callbacks
        this.sendToRemoteClient(clientId, message);
      }
    }
  }

  /**
   * Send message to remote client (placeholder)
   */
  private sendToRemoteClient(clientId: string, message: RemoteMessage): void {
    // TODO: Implement actual remote transport
    // For now, just log for debugging
    console.debug(`[SessionManager] Would send to client ${clientId}:`, {
      type: message.type,
      sessionId: message.sessionId,
      timestamp: message.timestamp
    });
  }

  /**
   * Setup periodic cleanup of old sessions
   */
  private setupCleanupInterval(): void {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60000); // Run every minute
  }

  /**
   * Clean up old and terminated sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      const age = now - session.lastActivity;

      // Remove old terminated sessions
      if (session.status === 'terminated' && age > 300000) { // 5 minutes
        this.cleanupSession(sessionId);
        continue;
      }

      // Terminate very old idle sessions
      if (session.status === 'idle' && age > this.sessionTimeout) {
        console.warn(`Terminating old idle session: ${sessionId}`);
        this.terminateSession(sessionId).catch(error => {
          console.error(`Failed to terminate old session ${sessionId}:`, error);
        });
      }
    }
  }

  /**
   * Clean up session resources
   */
  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Clear stream parser buffers
    this.streamParser.clearSession(sessionId);

    // Remove from sessions map
    this.sessions.delete(sessionId);

    console.debug(`Cleaned up session: ${sessionId}`);
  }

  /**
   * Shutdown session manager
   */
  async shutdown(): Promise<void> {
    // Clear cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Terminate all running sessions
    const terminationPromises = Array.from(this.sessions.keys()).map(sessionId =>
      this.terminateSession(sessionId, true).catch(error =>
        console.warn(`Failed to terminate session ${sessionId}:`, error)
      )
    );

    await Promise.all(terminationPromises);

    // Kill all processes
    await this.processManager.killAll();

    console.info('Session manager shutdown complete');
  }
}