/**
 * Universal CLI to Happy CLI Integration
 *
 * Bridges Universal CLI sessions with Happy CLI's daemon system
 * so sessions appear in the mobile app by creating real Happy API sessions.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@/ui/logger';
import { readDaemonState, readCredentials } from '@/persistence';
import { ApiClient } from '@/api/api';
import type { Session, TerminalOutput } from './types.js';
import type { Metadata } from '@/api/types';

export interface HappySession {
  sessionId: string;
  universalSessionId: string;
  command: string;
  args: string[];
  tool: string;
  startTime: number;
  status: 'idle' | 'running' | 'paused' | 'terminated' | 'error';
  cwd: string;
  apiSessionId?: string; // Happy API session ID
}

export class HappyIntegration {
  private activeSessions = new Map<string, HappySession>();

  /**
   * Register a Universal CLI session with Happy CLI by creating a real API session
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

      // Create a real Happy API session first
      const apiSessionId = await this.createHappyApiSession(happySession);
      if (apiSessionId) {
        happySession.apiSessionId = apiSessionId;
        
        // Then notify daemon about the session
        const success = await this.notifyDaemonSessionStarted(happySession);
        
        if (success) {
          this.activeSessions.set(universalSession.id, happySession);
          logger.debug(`Universal session ${universalSession.id} registered as Happy API session ${apiSessionId}`);
          return happySessionId;
        } else {
          logger.debug(`Failed to register Universal session ${universalSession.id} with daemon`);
          return null;
        }
      } else {
        logger.debug(`Failed to create Happy API session for Universal session ${universalSession.id}`);
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
   * Create a real Happy CLI API session
   */
  private async createHappyApiSession(happySession: HappySession): Promise<string | null> {
    try {
      // Check if we have credentials
      const credentials = await readCredentials();
      if (!credentials) {
        logger.debug('No Happy CLI credentials found, cannot create API session');
        return null;
      }

      // Create API client
      const api = await ApiClient.create(credentials);

      // Import required modules
      const os = require('os');
      const path = require('path');
      const packageJson = require('../../package.json');
      const { configuration } = require('@/configuration');
      const { projectPath } = require('@/projectPath');

      // Create metadata for the session
      const metadata: Metadata = {
        path: happySession.cwd,
        host: os.hostname(),
        version: packageJson.version,
        name: `Universal CLI: ${happySession.command}`,
        os: os.platform(),
        summary: {
          text: `Running ${happySession.command} ${happySession.args.join(' ')} via Universal CLI`,
          updatedAt: Date.now()
        },
        machineId: undefined, // Will be set by API
        claudeSessionId: happySession.sessionId, // Use Universal CLI session ID as reference
        tools: [happySession.tool],
        homeDir: os.homedir(),
        happyHomeDir: configuration.happyHomeDir,
        happyLibDir: projectPath(),
        happyToolsDir: path.join(configuration.happyHomeDir, 'tools'),
        startedFromDaemon: false,
        hostPid: process.pid,
        startedBy: 'terminal',
        lifecycleState: happySession.status === 'running' ? 'running' : 'archived',
        lifecycleStateSince: happySession.startTime,
        flavor: 'universal-cli'
      };

      // Create the session via API
      const session = await api.createSession({
        metadata,
        agentState: null
      });

      logger.debug(`Created Happy API session ${session.id} for Universal CLI session ${happySession.universalSessionId}`);
      return session.id;

    } catch (error) {
      logger.debug(`Failed to create Happy API session: ${error}`);
      return null;
    }
  }

  /**
   * Create a proper Happy CLI API session and notify daemon
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

      // Import required modules
      const os = require('os');
      const path = require('path');
      const packageJson = require('../../package.json');
      const { configuration } = require('@/configuration');
      const { projectPath } = require('@/projectPath');

      // Create proper Happy CLI metadata format
      const metadata = {
        path: happySession.cwd,
        host: os.hostname(),
        version: packageJson.version,
        name: `Universal CLI: ${happySession.command}`,
        os: os.platform(),
        summary: {
          text: `Running ${happySession.command} ${happySession.args.join(' ')} via Universal CLI`,
          updatedAt: Date.now()
        },
        machineId: undefined, // Will be set by daemon
        claudeSessionId: happySession.sessionId, // Use Universal CLI session ID as reference
        tools: [happySession.tool],
        homeDir: os.homedir(),
        happyHomeDir: configuration.happyHomeDir,
        happyLibDir: projectPath(),
        happyToolsDir: path.join(configuration.happyHomeDir, 'tools'),
        startedFromDaemon: false,
        hostPid: process.pid,
        startedBy: 'terminal',
        lifecycleState: happySession.status === 'running' ? 'running' : 'archived',
        lifecycleStateSince: happySession.startTime,
        flavor: 'universal-cli'
      };

      // Send notification with proper metadata format using the API session ID
      const sessionIdToUse = happySession.apiSessionId || happySession.sessionId;
      const response = await fetch(`http://127.0.0.1:${daemonState.httpPort}/session-started`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdToUse,
          metadata: metadata
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        logger.debug(`Successfully registered Universal CLI session with daemon`);
        return true;
      } else {
        logger.debug(`Daemon rejected Universal CLI session registration: ${response.status} ${await response.text()}`);
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