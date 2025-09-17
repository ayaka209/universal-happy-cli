#!/usr/bin/env bun
/**
 * Universal CLI Wrapper - Bun Entry Point
 *
 * Bun-optimized entry point for standalone executable compilation.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { SessionManager, ConfigManager, type OutputFormat } from './index.js';

const program = new Command();
const sessionManager = new SessionManager();

// Global CLI state
let initialized = false;

/**
 * Initialize the CLI system
 */
async function initializeCLI(): Promise<void> {
  if (initialized) return;

  try {
    await sessionManager.initialize();
    initialized = true;
  } catch (error) {
    console.error(chalk.red('Failed to initialize CLI system:'), error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log(chalk.yellow('Shutting down...'));
  await sessionManager.shutdown();
  process.exit(0);
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Setup CLI commands
program
  .name('uhappy')
  .description('Universal CLI wrapper with remote control capabilities')
  .version('1.0.0');

/**
 * Start a new CLI session
 */
program
  .command('start')
  .description('Start a new CLI session')
  .argument('<command>', 'Command to execute')
  .argument('[args...]', 'Command arguments')
  .option('-t, --tool <tool>', 'Specify tool type for better parsing')
  .option('-c, --cwd <dir>', 'Working directory')
  .option('-e, --env <vars>', 'Environment variables (JSON format)')
  .option('-f, --format <format>', 'Output format (text|html|json|raw)', 'text')
  .action(async (command: string, args: string[], options) => {
    await initializeCLI();

    try {
      const env = options.env ? JSON.parse(options.env) : {};

      const sessionId = await sessionManager.createSession({
        tool: options.tool,
        command,
        args,
        cwd: options.cwd,
        env,
        autoStart: true
      });

      console.log(chalk.green(`Session started: ${sessionId}`));

      // Monitor session output
      sessionManager.on('output', (id, output) => {
        if (id === sessionId) {
          // Use the format processor to get formatted output
          if (options.format === 'text') {
            console.log(output.text);
          } else if (options.format === 'ansi') {
            console.log(output.ansi);
          } else {
            const formatted = sessionManager.getSessionHistory(id, options.format as OutputFormat, 1)[0];
            console.log(formatted);
          }
        }
      });

      sessionManager.on('sessionTerminated', (id, exitCode) => {
        if (id === sessionId) {
          console.log(chalk.yellow(`Session terminated with exit code: ${exitCode || 0}`));
          process.exit(exitCode || 0);
        }
      });

    } catch (error) {
      console.error(chalk.red('Failed to start session:'), error);
      process.exit(1);
    }
  });

/**
 * List active sessions
 */
program
  .command('list')
  .description('List all active sessions')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    await initializeCLI();

    const sessions = sessionManager.listSessions();

    if (sessions.length === 0) {
      console.log(chalk.yellow('No active sessions'));
      return;
    }

    console.log(chalk.green(`Active sessions (${sessions.length}):`));

    sessions.forEach(session => {
      const status = session.status === 'running' ? chalk.green(session.status) :
                    session.status === 'paused' ? chalk.yellow(session.status) :
                    session.status === 'terminated' ? chalk.gray(session.status) :
                    chalk.red(session.status);

      const uptime = Math.round((Date.now() - session.startTime) / 1000);

      if (options.verbose) {
        console.log(`  ${chalk.blue(session.id.slice(0, 8))} - ${chalk.white(session.command)} ${session.args.join(' ')}`);
        console.log(`    Status: ${status}, Tool: ${session.tool}, Uptime: ${uptime}s`);
        console.log(`    Remote connections: ${session.remoteConnections.size}, PID: ${session.pid || 'N/A'}`);
      } else {
        console.log(`  ${chalk.blue(session.id.slice(0, 8))} - ${chalk.white(session.command)} [${status}] (${uptime}s)`);
      }
    });

    process.exit(0);
  });

/**
 * Send input to a session
 */
program
  .command('send')
  .description('Send input to a session')
  .argument('<sessionId>', 'Session ID (can be partial)')
  .argument('<input>', 'Input to send')
  .action(async (sessionId: string, input: string) => {
    await initializeCLI();

    const sessions = sessionManager.listSessions();
    const session = sessions.find(s => s.id.startsWith(sessionId));

    if (!session) {
      console.error(chalk.red(`Session not found: ${sessionId}`));
      process.exit(1);
    }

    try {
      await sessionManager.sendInput(session.id, input + '\n');
      console.log(chalk.green(`Input sent to session ${session.id.slice(0, 8)}`));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Failed to send input:'), error);
      process.exit(1);
    }
  });

/**
 * Show statistics
 */
program
  .command('stats')
  .description('Show system statistics')
  .action(async () => {
    await initializeCLI();

    const stats = sessionManager.getStats();

    console.log(chalk.green('System Statistics:'));
    console.log(`  Total sessions: ${stats.totalSessions}`);
    console.log(`  Running: ${chalk.green(stats.runningSessions)}`);
    console.log(`  Idle: ${chalk.yellow(stats.idleSessions)}`);
    console.log(`  Paused: ${chalk.blue(stats.pausedSessions)}`);
    console.log(`  Terminated: ${chalk.gray(stats.terminatedSessions)}`);
    console.log(`  Remote connections: ${stats.totalRemoteConnections}`);

    process.exit(0);
  });

/**
 * Quick test command
 */
program
  .command('test')
  .description('Run a quick functionality test')
  .action(async () => {
    await initializeCLI();

    console.log(chalk.blue('Running quick test...'));

    try {
      const sessionId = await sessionManager.createSession({
        command: 'echo',
        args: ['Universal CLI Wrapper is working!'],
        autoStart: true
      });

      // Wait for completion
      await new Promise(resolve => {
        sessionManager.on('sessionTerminated', (id) => {
          if (id === sessionId) resolve(undefined);
        });
      });

      const history = sessionManager.getSessionHistory(sessionId, 'text');
      console.log(chalk.green('✅ Test successful!'));
      console.log(chalk.white('Output:'), history[0] || 'No output');

    } catch (error) {
      console.error(chalk.red('❌ Test failed:'), error);
      process.exit(1);
    }

    process.exit(0);
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}