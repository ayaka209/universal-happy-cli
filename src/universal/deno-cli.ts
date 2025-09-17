#!/usr/bin/env -S deno run --allow-all
/**
 * Universal CLI Wrapper - Deno Entry Point
 *
 * Deno-optimized entry point for standalone executable compilation.
 */

// Import necessary modules for Deno
import { Command } from "npm:commander@^11.1.0";
import chalk from "npm:chalk@^5.3.0";

const program = new Command();

// Basic CLI setup
program
  .name('uhappy')
  .description('Universal CLI wrapper with remote control capabilities')
  .version('1.0.0');

/**
 * Simple echo test command for Deno build verification
 */
program
  .command('test')
  .description('Run a quick functionality test')
  .action(async () => {
    console.log(chalk.blue('🧪 Running Deno build test...'));

    try {
      // Simple process spawn test
      const process = new Deno.Command("echo", {
        args: ["Universal Happy CLI is working with Deno!"],
      });

      const { stdout } = await process.output();
      const output = new TextDecoder().decode(stdout);

      console.log(chalk.green('✅ Test successful!'));
      console.log(chalk.white('Output:'), output.trim());

    } catch (error) {
      console.error(chalk.red('❌ Test failed:'), error);
      Deno.exit(1);
    }

    Deno.exit(0);
  });

/**
 * Start command for launching CLI tools
 */
program
  .command('start')
  .description('Start a new CLI session')
  .argument('<command>', 'Command to execute')
  .argument('[args...]', 'Command arguments')
  .option('-f, --format <format>', 'Output format (text|ansi|json)', 'text')
  .action(async (command: string, args: string[], options) => {
    console.log(chalk.green(`Starting: ${command} ${args.join(' ')}`));

    try {
      const process = new Deno.Command(command, {
        args: args,
        stdout: "piped",
        stderr: "piped",
      });

      const child = process.spawn();

      // Stream output in real-time
      const decoder = new TextDecoder();

      // Handle stdout
      (async () => {
        for await (const chunk of child.stdout) {
          const text = decoder.decode(chunk);
          if (options.format === 'json') {
            console.log(JSON.stringify({ type: 'stdout', data: text, timestamp: Date.now() }));
          } else {
            process.stdout.write(chunk);
          }
        }
      })();

      // Handle stderr
      (async () => {
        for await (const chunk of child.stderr) {
          const text = decoder.decode(chunk);
          if (options.format === 'json') {
            console.log(JSON.stringify({ type: 'stderr', data: text, timestamp: Date.now() }));
          } else {
            process.stderr.write(chunk);
          }
        }
      })();

      const status = await child.status;
      console.log(chalk.yellow(`Process exited with code: ${status.code}`));
      Deno.exit(status.code || 0);

    } catch (error) {
      console.error(chalk.red('Failed to start process:'), error);
      Deno.exit(1);
    }
  });

/**
 * Interactive mode
 */
program
  .command('interactive')
  .description('Start interactive mode for a CLI tool')
  .argument('<command>', 'Command to execute')
  .argument('[args...]', 'Command arguments')
  .action(async (command: string, args: string[]) => {
    console.log(chalk.green(`Starting interactive session: ${command} ${args.join(' ')}`));

    try {
      const process = new Deno.Command(command, {
        args: args,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });

      const child = process.spawn();
      const status = await child.status;

      console.log(chalk.yellow(`Interactive session ended with code: ${status.code}`));
      Deno.exit(status.code || 0);

    } catch (error) {
      console.error(chalk.red('Failed to start interactive session:'), error);
      Deno.exit(1);
    }
  });

/**
 * List sessions (placeholder for standalone mode)
 */
program
  .command('list')
  .description('List active sessions (standalone mode - limited functionality)')
  .action(() => {
    console.log(chalk.yellow('📋 Standalone mode: Session management not available'));
    console.log(chalk.white('Use the full Node.js version for complete session management features'));
    Deno.exit(0);
  });

/**
 * Help command
 */
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.green('Universal Happy CLI - Deno Standalone Build'));
    console.log(chalk.white('Available commands:'));
    console.log('  test         - Run functionality test');
    console.log('  start        - Start a CLI session');
    console.log('  interactive  - Start interactive session');
    console.log('  list         - List sessions (limited in standalone)');
    console.log('  help         - Show this help');
    console.log('');
    console.log(chalk.blue('Note: This is a standalone build with limited features.'));
    console.log(chalk.blue('For full functionality, use the Node.js version.'));
  });

// Parse arguments
if (import.meta.main) {
  try {
    // If no arguments provided, show help
    if (Deno.args.length === 0) {
      program.outputHelp();
      Deno.exit(0);
    }

    program.parse(['uhappy', 'uhappy', ...Deno.args]);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    Deno.exit(1);
  }
}