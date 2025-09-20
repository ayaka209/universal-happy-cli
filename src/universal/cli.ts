#!/usr/bin/env node
/**
 * Universal CLI Wrapper - Command Line Interface
 *
 * Main CLI entry point for the universal CLI wrapper.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { SessionManager, ConfigManager, type OutputFormat } from './index.js';

const program = new Command();
const sessionManager = new SessionManager();
const configManager = new ConfigManager();

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
  .option('--env <vars>', 'Environment variables (JSON format)')
  .option('-r, --remote', 'Enable remote control')
  .option('-p, --port <port>', 'Port for remote control (default: 3000)', '3000')
  .option('-f, --format <format>', 'Output format (text|html|json|raw)', 'text')
  .option('--no-output', 'Capture output without showing in terminal (for remote control)')
  .option('--direct', 'Show output directly in terminal (default behavior)')
  .action(async (command: string, args: string[], options) => {
    await initializeCLI();

    try {
      let env = {};
      if (options.env) {
        try {
          env = JSON.parse(options.env);
        } catch (error) {
          console.error(chalk.red('Invalid JSON in --env option:'), error.message);
          process.exit(1);
        }
      }

      // Determine output mode: direct output is default unless --no-output is specified
      const directOutput = !options.noOutput;

      const sessionId = await sessionManager.createSession({
        tool: options.tool,
        command,
        args,
        cwd: options.cwd,
        env,
        autoStart: true,
        directOutput
      });

      console.log(chalk.green(`Session started: ${sessionId}`));

      if (options.remote) {
        console.log(chalk.blue(`Remote control available on port ${options.port}`));
        // TODO: Start remote control server
      }

      // Monitor session output
      sessionManager.on('output', (id, output) => {
        if (id === sessionId) {
          const formatted = sessionManager.getSessionHistory(id, options.format as OutputFormat, 1)[0];
          console.log(formatted);
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

    // Find session by partial ID
    const sessions = sessionManager.listSessions();
    const session = sessions.find(s => s.id.startsWith(sessionId));

    if (!session) {
      console.error(chalk.red(`Session not found: ${sessionId}`));
      process.exit(1);
    }

    try {
      await sessionManager.sendInput(session.id, input + '\n');
      console.log(chalk.green(`Input sent to session ${session.id.slice(0, 8)}`));
    } catch (error) {
      console.error(chalk.red('Failed to send input:'), error);
      process.exit(1);
    }
  });

/**
 * Get session history
 */
program
  .command('history')
  .description('Get session history')
  .argument('<sessionId>', 'Session ID (can be partial)')
  .option('-f, --format <format>', 'Output format (text|html|json|raw)', 'text')
  .option('-l, --lines <count>', 'Number of lines to show', '50')
  .action(async (sessionId: string, options) => {
    await initializeCLI();

    const sessions = sessionManager.listSessions();
    const session = sessions.find(s => s.id.startsWith(sessionId));

    if (!session) {
      console.error(chalk.red(`Session not found: ${sessionId}`));
      process.exit(1);
    }

    const history = sessionManager.getSessionHistory(
      session.id,
      options.format as OutputFormat,
      parseInt(options.lines)
    );

    if (history.length === 0) {
      console.log(chalk.yellow('No history available'));
      return;
    }

    history.forEach(line => console.log(line));
  });

/**
 * Terminate a session
 */
program
  .command('kill')
  .description('Terminate a session')
  .argument('<sessionId>', 'Session ID (can be partial)')
  .option('-f, --force', 'Force termination (SIGKILL)')
  .action(async (sessionId: string, options) => {
    await initializeCLI();

    const sessions = sessionManager.listSessions();
    const session = sessions.find(s => s.id.startsWith(sessionId));

    if (!session) {
      console.error(chalk.red(`Session not found: ${sessionId}`));
      process.exit(1);
    }

    try {
      await sessionManager.terminateSession(session.id, options.force);
      console.log(chalk.green(`Session ${session.id.slice(0, 8)} terminated`));
    } catch (error) {
      console.error(chalk.red('Failed to terminate session:'), error);
      process.exit(1);
    }
  });

/**
 * Stop services command
 */
program
  .command('stop')
  .description('Stop Universal Happy CLI services')
  .option('-a, --all', 'Stop all sessions and services')
  .option('-s, --sessions', 'Stop all active sessions only')
  .option('-d, --daemon', 'Stop Happy CLI daemon')
  .option('-f, --force', 'Force termination (SIGKILL)')
  .option('--clean', 'Clean up and stop everything (sessions + daemon + cleanup)')
  .action(async (options) => {
    await initializeCLI();

    let sessionsStopped = 0;
    let daemonStopped = false;

    try {
      // Stop all sessions if requested
      if (options.all || options.sessions || options.clean) {
        console.log(chalk.blue('🛑 Stopping all Universal CLI sessions...'));
        
        const sessions = sessionManager.listSessions();
        const activeSessions = sessions.filter(s => 
          s.status === 'running' || s.status === 'paused' || s.status === 'idle'
        );

        if (activeSessions.length === 0) {
          console.log(chalk.yellow('  No active sessions to stop'));
        } else {
          for (const session of activeSessions) {
            try {
              await sessionManager.terminateSession(session.id, options.force);
              sessionsStopped++;
              console.log(chalk.green(`  ✓ Stopped session ${session.id.slice(0, 8)} (${session.command})`));
            } catch (error) {
              console.log(chalk.red(`  ✗ Failed to stop session ${session.id.slice(0, 8)}: ${error.message}`));
            }
          }
        }
      }

      // Stop Happy CLI daemon if requested
      if (options.all || options.daemon || options.clean) {
        console.log(chalk.blue('🛑 Stopping Happy CLI daemon...'));
        
        try {
          // Import daemon control functions
          const { stopDaemon } = await import('@/daemon/controlClient');
          await stopDaemon();
          daemonStopped = true;
          console.log(chalk.green('  ✓ Happy CLI daemon stopped'));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠ Daemon might not be running: ${error.message}`));
        }
      }

      // Clean up processes if requested
      if (options.clean) {
        console.log(chalk.blue('🧹 Cleaning up runaway processes...'));
        
        try {
          const { killRunawayHappyProcesses } = await import('@/daemon/doctor');
          const result = await killRunawayHappyProcesses();
          
          if (result.killed > 0) {
            console.log(chalk.green(`  ✓ Cleaned up ${result.killed} runaway processes`));
          } else {
            console.log(chalk.yellow('  No runaway processes found'));
          }
          
          if (result.errors.length > 0) {
            console.log(chalk.red(`  ✗ Cleanup errors: ${result.errors.join(', ')}`));
          }
        } catch (error) {
          console.log(chalk.red(`  ✗ Cleanup failed: ${error.message}`));
        }
      }

      // Shutdown session manager
      await sessionManager.shutdown();

      // Summary
      console.log(chalk.green('\n📋 Stop Summary:'));
      if (sessionsStopped > 0) {
        console.log(chalk.green(`  Sessions stopped: ${sessionsStopped}`));
      }
      if (daemonStopped) {
        console.log(chalk.green(`  Daemon stopped: Yes`));
      }
      if (options.clean) {
        console.log(chalk.green(`  Cleanup performed: Yes`));
      }

      // Show help if no specific options were provided
      if (!options.all && !options.sessions && !options.daemon && !options.clean) {
        console.log(chalk.yellow('\nNo specific stop action specified. Available options:'));
        console.log(chalk.cyan('  uhappy stop --sessions    ') + 'Stop all Universal CLI sessions');
        console.log(chalk.cyan('  uhappy stop --daemon      ') + 'Stop Happy CLI daemon');
        console.log(chalk.cyan('  uhappy stop --all         ') + 'Stop sessions and daemon');
        console.log(chalk.cyan('  uhappy stop --clean       ') + 'Stop everything and clean up');
        console.log(chalk.cyan('  uhappy stop --force       ') + 'Force termination (add to any option)');
        console.log(chalk.gray('\nFor single session: uhappy kill <sessionId>'));
      }

    } catch (error) {
      console.error(chalk.red('Stop operation failed:'), error);
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

    console.log(chalk.green('\nProcess Statistics:'));
    console.log(`  Active processes: ${stats.processStats.running}`);
    console.log(`  Total buffer size: ${Math.round(stats.processStats.totalBufferSize / 1024)}KB`);
  });

/**
 * Configuration commands
 */
const configCmd = program
  .command('config')
  .description('Manage tool configurations');

configCmd
  .command('list')
  .description('List configured tools')
  .action(async () => {
    await initializeCLI();

    const tools = configManager.listTools();

    if (tools.length === 0) {
      console.log(chalk.yellow('No tools configured'));
      return;
    }

    console.log(chalk.green(`Configured tools (${tools.length}):`));

    tools.forEach(({ name, config }) => {
      console.log(`  ${chalk.blue(name)} - ${config.description || 'No description'}`);
      console.log(`    Command: ${config.command}`);
      if (config.patterns) {
        console.log(`    Patterns: ${Object.keys(config.patterns).join(', ')}`);
      }
    });
  });

configCmd
  .command('add')
  .description('Add a new tool configuration')
  .argument('<name>', 'Tool name')
  .argument('<command>', 'Command to execute')
  .option('-d, --description <desc>', 'Tool description')
  .action(async (name: string, command: string, options) => {
    await initializeCLI();

    try {
      await configManager.addTool(name, {
        command,
        description: options.description
      });

      console.log(chalk.green(`Tool '${name}' added successfully`));
    } catch (error) {
      console.error(chalk.red('Failed to add tool:'), error);
      process.exit(1);
    }
  });

/**
 * Interactive mode
 */
program
  .command('interactive')
  .description('Start interactive mode for a tool')
  .argument('<command>', 'Command to execute')
  .argument('[args...]', 'Command arguments')
  .option('-t, --tool <tool>', 'Specify tool type')
  .action(async (command: string, args: string[], options) => {
    await initializeCLI();

    try {
      const sessionId = await sessionManager.createSession({
        tool: options.tool,
        command,
        args,
        autoStart: true
      });

      console.log(chalk.green(`Interactive session started: ${sessionId.slice(0, 8)}`));
      console.log(chalk.blue('Type your commands below. Press Ctrl+C to exit.'));

      // Setup stdin handling
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', async (key: string) => {
        if (key === '\u0003') { // Ctrl+C
          await sessionManager.terminateSession(sessionId);
          process.exit(0);
        } else {
          await sessionManager.sendInput(sessionId, key);
        }
      });

      // Monitor output
      sessionManager.on('output', (id, output) => {
        if (id === sessionId) {
          process.stdout.write(output.ansi);
        }
      });

      sessionManager.on('sessionTerminated', (id) => {
        if (id === sessionId) {
          console.log(chalk.yellow('\nSession terminated'));
          process.exit(0);
        }
      });

    } catch (error) {
      console.error(chalk.red('Failed to start interactive session:'), error);
      process.exit(1);
    }
  });

/**
 * Quick test command
 */
program
  .command('test')
  .description('Run a quick functionality test')
  .action(async () => {
    await initializeCLI();

    console.log(chalk.blue('🧪 Running Universal Happy CLI test...'));

    try {
      const sessionId = await sessionManager.createSession({
        command: 'echo',
        args: ['Universal Happy CLI is working!'],
        autoStart: true
      });

      // Wait for completion
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 3000);
        sessionManager.on('sessionTerminated', (id) => {
          if (id === sessionId) {
            clearTimeout(timeout);
            resolve(undefined);
          }
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