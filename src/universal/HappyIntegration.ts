/**
 * Universal CLI to Happy CLI Integration
 *
 * Bridges Universal CLI sessions with Happy CLI's daemon system
 * so sessions appear in the mobile app.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@/ui/logger';
import { readDaemonState } from '@/persistence';
import type { Session, TerminalOutput } from './types.js';

export interface HappySession {
  sessionId: string;
  universalSessionId: string;
  command: string;
  args: string[];
  tool: string;
  startTime: number;
  status: 'idle' | 'running' | 'paused' | 'terminated' | 'error';
  cwd: string;
}

export class HappyIntegration {
  private activeSessions = new Map<string, HappySession>();

  /**
   * Register a Universal CLI session with Happy CLI daemon
   */
  async registerSession(universalSession: Session): Promise<string | null> {
    try {
      const happySessionId = randomUUID();
      
      const happySession: HappySession = {
        sessionId: happySessionId,
        universalSessionId: universalSession.id,
        command: universalSession.command,
        args: universalSession.args,
        tool: universalSession.tool,
        startTime: universalSession.startTime,
        status: universalSession.status,
        cwd: universalSession.cwd
      };

      // Notify daemon about the new session
      const success = await this.notifyDaemonSessionStarted(happySession);
      
      if (success) {
        this.activeSessions.set(universalSession.id, happySession);
        logger.debug(`Universal session ${universalSession.id} registered as Happy session ${happySessionId}`);
        return happySessionId;
      } else {
        logger.debug(`Failed to register Universal session ${universalSession.id} with daemon`);
        return null;
      }
    } catch (error) {
      logger.debug(`Error registering Universal session: ${error}`);
      return null;
    }
  }

  /**
   * Update session status in Happy CLI system
   */
  async updateSessionStatus(universalSessionId: string, status: Session['status']): Promise<void> {
    const happySession = this.activeSessions.get(universalSessionId);
    if (!happySession) {
      return;
    }

    happySession.status = status;

    // If session is terminated, clean up
    if (status === 'terminated' || status === 'error') {
      this.activeSessions.delete(universalSessionId);
    }

    // Note: Happy CLI doesn't have a direct API to update session status
    // The mobile app will see the session as inactive when daemon stops tracking it
  }

  /**
   * Forward output to Happy CLI system (if needed)
   */
  async forwardOutput(universalSessionId: string, output: TerminalOutput): Promise<void> {
    const happySession = this.activeSessions.get(universalSessionId);
    if (!happySession) {
      return;
    }

    // Note: Happy CLI handles output through its own API session system
    // Universal CLI output is shown in terminal directly
    // For remote viewing, we'd need to implement a more complex bridge
  }

  /**
   * Notify daemon about a new session (mimics Happy CLI's session reporting)
   */
  private async notifyDaemonSessionStarted(happySession: HappySession): Promise<boolean> {
    try {
      const daemonState = await readDaemonState();
      if (!daemonState?.httpPort) {
        logger.debug('No daemon running, cannot register Universal CLI session');
        return false;
      }

      // Check if daemon is still alive
      try {
        process.kill(daemonState.pid, 0);
      } catch (error) {
        logger.debug('Daemon process not found, cannot register Universal CLI session');
        return false;
      }

      // Prepare session data in format daemon expects
      const sessionData = {
        sessionId: happySession.sessionId,
        command: happySession.command,
        args: happySession.args,
        tool: happySession.tool,
        startTime: happySession.startTime,
        cwd: happySession.cwd,
        startedBy: 'universal-cli',
        type: 'universal-cli-session'
      };

      // Send notification to daemon
      const response = await fetch(`http://127.0.0.1:${daemonState.httpPort}/session-started`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        logger.debug(`Successfully registered Universal CLI session with daemon`);
        return true;
      } else {
        logger.debug(`Daemon rejected Universal CLI session registration: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.debug(`Failed to notify daemon about Universal CLI session: ${error}`);
      return false;
    }
  }

  /**
   * Get registered sessions
   */
  getRegisteredSessions(): HappySession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up integration
   */
  cleanup(): void {
    this.activeSessions.clear();
  }
}

// Singleton instance
export const happyIntegration = new HappyIntegration();