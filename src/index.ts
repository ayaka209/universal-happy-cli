#!/usr/bin/env node

/**
 * CLI entry point for Universal Happy CLI
 *
 * Unified command-line interface that defaults to universal CLI wrapper
 * with special modes for Claude and Codex integration
 */


import chalk from 'chalk'
import { runClaude, StartOptions } from '@/claude/runClaude'
import { logger } from './ui/logger'
import { readCredentials } from './persistence'
import { authAndSetupMachineIfNeeded } from './ui/auth'
import packageJson from '../package.json'
import { z } from 'zod'
import { startDaemon } from './daemon/run'
import { checkIfDaemonRunningAndCleanupStaleState, isDaemonRunningCurrentlyInstalledHappyVersion, stopDaemon } from './daemon/controlClient'
import { getLatestDaemonLog } from './ui/logger'
import { killRunawayHappyProcesses } from './daemon/doctor'
import { install } from './daemon/install'
import { uninstall } from './daemon/uninstall'
import { ApiClient } from './api/api'
import { runDoctorCommand } from './ui/doctor'
import { listDaemonSessions, stopDaemonSession } from './daemon/controlClient'
import { handleAuthCommand } from './commands/auth'
import { handleConnectCommand } from './commands/connect'
import { spawnHappyCLI } from './utils/spawnHappyCLI'
import { claudeCliPath } from './claude/claudeLocal'
import { execFileSync } from 'node:child_process'


(async () => {
  const args = process.argv.slice(2)

  // If --version is passed - do not log, its likely daemon inquiring about our version
  if (!args.includes('--version')) {
    logger.debug('Starting happy CLI with args: ', process.argv)
  }

  // Check if first argument is a subcommand
  const subcommand = args[0]

  if (subcommand === 'doctor') {
    // Check for clean subcommand
    if (args[1] === 'clean') {
      const result = await killRunawayHappyProcesses()
      console.log(`Cleaned up ${result.killed} runaway processes`)
      if (result.errors.length > 0) {
        console.log('Errors:', result.errors)
      }
      process.exit(0)
    }
    await runDoctorCommand();
    return;
  } else if (subcommand === 'auth') {
    // Handle auth subcommands
    try {
      await handleAuthCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'connect') {
    // Handle connect subcommands
    try {
      await handleConnectCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'claude') {
    // Handle Claude Code via universal CLI wrapper
    try {
      // Convert 'uhappy claude [args]' to 'uhappy start -- claude [args]'
      const claudeArgs = args.slice(1); // Remove 'claude'
      const universalArgs = ['start', '--', 'claude', ...claudeArgs];

      // Check for help flag specifically
      if (claudeArgs.includes('-h') || claudeArgs.includes('--help')) {
        console.log(`
${chalk.bold('uhappy claude')} - Claude Code via Universal CLI Wrapper

${chalk.bold('Usage:')}
  uhappy claude [options]     Wrap Claude Code with universal CLI features

${chalk.bold('Examples:')}
  uhappy claude              Start Claude session
  uhappy claude --resume     Resume previous session
  uhappy claude --help       Show Claude help

${chalk.bold('Note:')} This wraps the ${chalk.cyan('claude')} command using the universal CLI wrapper.
For the original Happy CLI integration, use: ${chalk.cyan('uhappy happy-claude')}

${chalk.gray('─'.repeat(60))}
${chalk.bold.cyan('This will execute:')} ${chalk.cyan('uhappy start -- claude [your-args]')}
`)
        process.exit(0)
      }

      // Delegate to universal CLI with claude command
      const { execSync } = await import('node:child_process');
      const path = await import('node:path');
      const { fileURLToPath } = await import('node:url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const universalCliPath = path.join(__dirname, 'universal', 'cli.ts');

      const command = `npx tsx "${universalCliPath}" ${universalArgs.join(' ')}`;

      execSync(command, {
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd()
      });

    } catch (error: any) {
      if (error.status !== undefined) {
        process.exit(error.status);
      }
      console.error(chalk.red('Failed to wrap claude command:'), error.message);
      process.exit(1);
    }
    return;
  } else if (subcommand === 'happy-claude') {
    // Handle original Happy CLI Claude integration (special mode)
    try {
      // Remove 'happy-claude' from args and parse remaining
      const claudeArgs = args.slice(1);

      // Parse command line arguments for Claude mode
      const options: StartOptions = {}
      let showHelp = false
      let showVersion = false
      const unknownArgs: string[] = [] // Collect unknown args to pass through to claude

      for (let i = 0; i < claudeArgs.length; i++) {
        const arg = claudeArgs[i]

        if (arg === '-h' || arg === '--help') {
          showHelp = true
          unknownArgs.push(arg)
        } else if (arg === '-v' || arg === '--version') {
          showVersion = true
          unknownArgs.push(arg)
        } else if (arg === '--happy-starting-mode') {
          options.startingMode = z.enum(['local', 'remote']).parse(claudeArgs[++i])
        } else if (arg === '--yolo') {
          unknownArgs.push('--dangerously-skip-permissions')
        } else if (arg === '--started-by') {
          options.startedBy = claudeArgs[++i] as 'daemon' | 'terminal'
        } else {
          unknownArgs.push(arg)
          if (i + 1 < claudeArgs.length && !claudeArgs[i + 1].startsWith('-')) {
            unknownArgs.push(claudeArgs[++i])
          }
        }
      }

      if (unknownArgs.length > 0) {
        options.claudeArgs = [...(options.claudeArgs || []), ...unknownArgs]
      }

      if (showHelp) {
        console.log(`
${chalk.bold('uhappy happy-claude')} - Original Happy CLI Claude Integration

${chalk.bold('Usage:')}
  uhappy happy-claude [options]     Start Claude with original Happy CLI mobile control

${chalk.bold('Examples:')}
  uhappy happy-claude              Start Claude session with Happy integration
  uhappy happy-claude --yolo       Start with bypassing permissions
  uhappy happy-claude --resume     Resume previous session

${chalk.bold('Note:')} This uses the original Happy CLI Claude integration with mobile control.
For simple CLI wrapping, use: ${chalk.cyan('uhappy claude')}

${chalk.gray('─'.repeat(60))}
${chalk.bold.cyan('Claude Code Options (from `claude --help`):')}
`)

        try {
          const claudeHelp = execFileSync(process.execPath, [claudeCliPath, '--help'], { encoding: 'utf8' })
          console.log(claudeHelp)
        } catch (e) {
          console.log(chalk.yellow('Could not retrieve claude help. Make sure claude is installed.'))
        }

        process.exit(0)
      }

      if (showVersion) {
        console.log(`uhappy version: ${packageJson.version}`)
      }

      const { credentials } = await authAndSetupMachineIfNeeded();

      // Auto-start daemon for Happy Claude mode
      logger.debug('Ensuring Happy background service is running & matches our version...');
      if (!(await isDaemonRunningCurrentlyInstalledHappyVersion())) {
        logger.debug('Starting Happy background service...');
        const daemonProcess = spawnHappyCLI(['daemon', 'start-sync'], {
          detached: true,
          stdio: 'ignore',
          env: process.env
        })
        daemonProcess.unref();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await runClaude(credentials, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'codex') {
    // Handle codex command (special mode)
    try {
      const { runCodex } = await import('@/codex/runCodex');

      // Parse startedBy argument
      let startedBy: 'daemon' | 'terminal' | undefined = undefined;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--started-by') {
          startedBy = args[++i] as 'daemon' | 'terminal';
        }
      }

      const {
        credentials
      } = await authAndSetupMachineIfNeeded();
      await runCodex({credentials, startedBy});
      // Do not force exit here; allow instrumentation to show lingering handles
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'logout') {
    // Keep for backward compatibility - redirect to auth logout
    console.log(chalk.yellow('Note: "happy logout" is deprecated. Use "happy auth logout" instead.\n'));
    try {
      await handleAuthCommand(['logout']);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'notify') {
    // Handle notification command
    try {
      await handleNotifyCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      if (process.env.DEBUG) {
        console.error(error)
      }
      process.exit(1)
    }
    return;
  } else if (subcommand === 'daemon') {
    // Show daemon management help
    const daemonSubcommand = args[1]

    if (daemonSubcommand === 'list') {
      try {
        const sessions = await listDaemonSessions()

        if (sessions.length === 0) {
          console.log('No active sessions this daemon is aware of (they might have been started by a previous version of the daemon)')
        } else {
          console.log('Active sessions:')
          console.log(JSON.stringify(sessions, null, 2))
        }
      } catch (error) {
        console.log('No daemon running')
      }
      return

    } else if (daemonSubcommand === 'stop-session') {
      const sessionId = args[2]
      if (!sessionId) {
        console.error('Session ID required')
        process.exit(1)
      }

      try {
        const success = await stopDaemonSession(sessionId)
        console.log(success ? 'Session stopped' : 'Failed to stop session')
      } catch (error) {
        console.log('No daemon running')
      }
      return

    } else if (daemonSubcommand === 'start') {
      // Spawn detached daemon process
      const child = spawnHappyCLI(['daemon', 'start-sync'], {
        detached: true,
        stdio: 'ignore',
        env: process.env
      });
      child.unref();

      // Wait for daemon to write state file (up to 5 seconds)
      let started = false;
      for (let i = 0; i < 50; i++) {
        if (await checkIfDaemonRunningAndCleanupStaleState()) {
          started = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (started) {
        console.log('Daemon started successfully');
      } else {
        console.error('Failed to start daemon');
        process.exit(1);
      }
      process.exit(0);
    } else if (daemonSubcommand === 'start-sync') {
      await startDaemon()
      process.exit(0)
    } else if (daemonSubcommand === 'stop') {
      await stopDaemon()
      process.exit(0)
    } else if (daemonSubcommand === 'status') {
      // Show daemon-specific doctor output
      await runDoctorCommand('daemon')
      process.exit(0)
    } else if (daemonSubcommand === 'logs') {
      // Simply print the path to the latest daemon log file
      const latest = await getLatestDaemonLog()
      if (!latest) {
        console.log('No daemon logs found')
      } else {
        console.log(latest.path)
      }
      process.exit(0)
    } else if (daemonSubcommand === 'install') {
      try {
        await install()
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
      }
    } else if (daemonSubcommand === 'uninstall') {
      try {
        await uninstall()
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
        process.exit(1)
      }
    } else {
      console.log(`
${chalk.bold('happy daemon')} - Daemon management

${chalk.bold('Usage:')}
  happy daemon start              Start the daemon (detached)
  happy daemon stop               Stop the daemon (sessions stay alive)
  happy daemon status             Show daemon status
  happy daemon list               List active sessions

  If you want to kill all happy related processes run 
  ${chalk.cyan('happy doctor clean')}

${chalk.bold('Note:')} The daemon runs in the background and manages Claude sessions.

${chalk.bold('To clean up runaway processes:')} Use ${chalk.cyan('happy doctor clean')}
`)
    }
    return;
  } else {
    // Default behavior: Use Universal CLI Wrapper

    // Check for help and version flags ONLY if this is a top-level help request
    // (i.e., no subcommand like 'start' is present)
    let showHelp = false
    let showVersion = false

    // Only intercept help/version if the first argument is not a known command
    const firstArg = args[0];
    const knownCommands = ['start', 'interactive', 'list', 'send', 'history', 'kill', 'stats', 'config', 'test'];
    const isTopLevelCall = !knownCommands.includes(firstArg) && firstArg !== '--';

    if (isTopLevelCall) {
      for (const arg of args) {
        if (arg === '-h' || arg === '--help') {
          showHelp = true
          break
        } else if (arg === '-v' || arg === '--version') {
          showVersion = true
          break
        }
      }
    }

    // Show help
    if (showHelp) {
      console.log(`
${chalk.bold('uhappy')} - Universal CLI Wrapper with Remote Control

${chalk.bold('Universal CLI Commands:')}
  uhappy start <command> [args...]     Wrap any CLI tool with enhanced features
  uhappy interactive <command>         Start interactive session
  uhappy list [--verbose]              List active sessions
  uhappy send <sessionId> <input>      Send input to session
  uhappy history <sessionId>           View session history
  uhappy kill <sessionId>              Terminate session
  uhappy stats                         Show system statistics
  uhappy test                          Run functionality test

${chalk.bold('Configuration:')}
  uhappy config list                   List configured tools
  uhappy config add <name> <command>   Add tool configuration

${chalk.bold('CLI Tool Wrapping:')}
  uhappy claude [options]              Wrap Claude Code with universal CLI features
  uhappy codex                         Codex AI programming mode

${chalk.bold('Service Management:')}
  uhappy stop --sessions               Stop all Universal CLI sessions
  uhappy stop --daemon                 Stop Happy CLI daemon
  uhappy stop --all                    Stop sessions and daemon
  uhappy stop --clean                  Stop everything and clean up

${chalk.bold('Special Happy CLI Modes:')}
  uhappy happy-claude [options]        Original Happy CLI Claude integration with mobile control
  uhappy auth                          Manage authentication
  uhappy connect                       Connect AI vendor API keys
  uhappy notify                        Send push notification
  uhappy daemon                        Manage background service
  uhappy doctor                        System diagnostics

${chalk.bold('Examples:')}
  uhappy start -- git status          Wrap git with enhanced output
  uhappy start -- docker ps           Monitor docker processes
  uhappy claude --resume              Wrap Claude Code with session management
  uhappy happy-claude --resume         Use original Happy CLI integration
  uhappy stop --all                   Stop all services
  uhappy interactive node              Start interactive Node.js session

${chalk.bold('Note:')} By default, uhappy uses the universal CLI wrapper.
For original Happy CLI integration, use: ${chalk.cyan('uhappy happy-claude [options]')}
`)
      process.exit(0)
    }

    // Show version
    if (showVersion) {
      console.log(`uhappy version: ${packageJson.version}`)
      process.exit(0)
    }

    // Handle direct command delegation (no subcommand specified)
    // This means the user wants to use the universal CLI wrapper directly
    if (args.length === 0) {
      console.log(`
${chalk.bold('Welcome to Universal Happy CLI!')}

${chalk.yellow('No command specified.')} Here are some options:

${chalk.bold('Quick Start:')}
  ${chalk.cyan('uhappy start -- echo "Hello World"')}     Test the universal wrapper
  ${chalk.cyan('uhappy test')}                           Run functionality test
  ${chalk.cyan('uhappy --help')}                         Show all commands

${chalk.bold('Common Usage:')}
  ${chalk.cyan('uhappy start -- git status')}             Wrap git commands
  ${chalk.cyan('uhappy interactive python')}              Interactive Python session
  ${chalk.cyan('uhappy claude')}                          Use Claude Code integration

For full help: ${chalk.cyan('uhappy --help')}
`)
      process.exit(0)
    }

    // Check if we have a -- separator, indicating direct command delegation
    const separatorIndex = args.indexOf('--');
    if (separatorIndex !== -1) {
      // Remove the -- and everything before it, delegate the rest
      const commandArgs = ['start', ...args];
      args.splice(0, args.length, ...commandArgs);
    }

    // Delegate to universal CLI
    try {
      // Use spawn instead of execSync for better cross-platform compatibility
      const { spawn } = await import('node:child_process');

      // Use relative path to universal CLI
      const universalCliPath = './src/universal/cli.ts';

      // Use spawn with npx tsx for cross-platform compatibility
      const child = spawn('npx', [
        'tsx',
        universalCliPath,
        ...args
      ], {
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd(),
        shell: true // Enable shell to find npx on Windows
      });

      child.on('exit', (code) => {
        process.exit(code || 0);
      });

      child.on('error', (error) => {
        console.error(chalk.red('Failed to start universal CLI:'), error);
        process.exit(1);
      });

    } catch (error: any) {
      console.error(chalk.red('Failed to delegate to universal CLI:'), error.message);
      console.log(chalk.yellow('Falling back to help...'));

      console.log(`
${chalk.bold('uhappy')} - Universal CLI Wrapper

Run ${chalk.cyan('uhappy --help')} for usage information.
Or try: ${chalk.cyan('uhappy start -- echo "Hello World"')}

${chalk.gray('Troubleshooting:')}
- Make sure you have ${chalk.cyan('tsx')} installed: ${chalk.cyan('npm install -g tsx')}
- Or use the built version: ${chalk.cyan('npm run build')} first
`)
      process.exit(1);
    }
  }
})();


/**
 * Handle notification command
 */
async function handleNotifyCommand(args: string[]): Promise<void> {
  let message = ''
  let title = ''
  let showHelp = false

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-p' && i + 1 < args.length) {
      message = args[++i]
    } else if (arg === '-t' && i + 1 < args.length) {
      title = args[++i]
    } else if (arg === '-h' || arg === '--help') {
      showHelp = true
    } else {
      console.error(chalk.red(`Unknown argument for notify command: ${arg}`))
      process.exit(1)
    }
  }

  if (showHelp) {
    console.log(`
${chalk.bold('happy notify')} - Send notification

${chalk.bold('Usage:')}
  happy notify -p <message> [-t <title>]    Send notification with custom message and optional title
  happy notify -h, --help                   Show this help

${chalk.bold('Options:')}
  -p <message>    Notification message (required)
  -t <title>      Notification title (optional, defaults to "Happy")

${chalk.bold('Examples:')}
  happy notify -p "Deployment complete!"
  happy notify -p "System update complete" -t "Server Status"
  happy notify -t "Alert" -p "Database connection restored"
`)
    return
  }

  if (!message) {
    console.error(chalk.red('Error: Message is required. Use -p "your message" to specify the notification text.'))
    console.log(chalk.gray('Run "happy notify --help" for usage information.'))
    process.exit(1)
  }

  // Load credentials
  let credentials = await readCredentials()
  if (!credentials) {
    console.error(chalk.red('Error: Not authenticated. Please run "happy auth login" first.'))
    process.exit(1)
  }

  console.log(chalk.blue('📱 Sending push notification...'))

  try {
    // Create API client and send push notification
    const api = await ApiClient.create(credentials);

    // Use custom title or default to "Happy"
    const notificationTitle = title || 'Happy'

    // Send the push notification
    api.push().sendToAllDevices(
      notificationTitle,
      message,
      {
        source: 'cli',
        timestamp: Date.now()
      }
    )

    console.log(chalk.green('✓ Push notification sent successfully!'))
    console.log(chalk.gray(`  Title: ${notificationTitle}`))
    console.log(chalk.gray(`  Message: ${message}`))
    console.log(chalk.gray('  Check your mobile device for the notification.'))

    // Give a moment for the async operation to start
    await new Promise(resolve => setTimeout(resolve, 1000))

  } catch (error) {
    console.error(chalk.red('✗ Failed to send push notification'))
    throw error
  }
}
