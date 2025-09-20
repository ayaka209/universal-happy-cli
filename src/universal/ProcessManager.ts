/**
 * Universal CLI Wrapper - Process Manager
 *
 * Manages CLI process lifecycle, I/O handling, and signal management.
 * Supports both PTY and regular stdio modes.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ProcessConfig, StreamEvent } from './types.js';

export interface ManagedProcess {
  id: string;
  process: ChildProcess;
  config: ProcessConfig;
  startTime: number;
  status: 'starting' | 'running' | 'paused' | 'terminated' | 'error';
  pid?: number;
  exitCode?: number;
  signal?: string;
}

export interface ProcessEvents {
  stdout: (data: Buffer, processId: string) => void;
  stderr: (data: Buffer, processId: string) => void;
  exit: (code: number | null, signal: string | null, processId: string) => void;
  error: (error: Error, processId: string) => void;
  spawn: (processId: string) => void;
}

export class ProcessManager extends EventEmitter<ProcessEvents> {
  private processes = new Map<string, ManagedProcess>();
  private readonly maxProcesses = 50;
  private readonly defaultTimeout = 30000; // 30 seconds

  /**
   * Spawn a new process with the given configuration
   */
  async spawn(processId: string, config: ProcessConfig): Promise<ManagedProcess> {
    if (this.processes.has(processId)) {
      throw new Error(`Process with ID ${processId} already exists`);
    }

    if (this.processes.size >= this.maxProcesses) {
      throw new Error(`Maximum number of processes (${this.maxProcesses}) reached`);
    }

    const managedProcess: ManagedProcess = {
      id: processId,
      process: null as any, // Will be set below
      config,
      startTime: Date.now(),
      status: 'starting'
    };

    try {
      const childProcess = this.createChildProcess(config);
      managedProcess.process = childProcess;
      managedProcess.pid = childProcess.pid;

      this.processes.set(processId, managedProcess);
      this.setupProcessHandlers(managedProcess);

      // Wait for spawn event or error
      await this.waitForSpawn(childProcess, processId);

      managedProcess.status = 'running';
      this.emit('spawn', processId);

      return managedProcess;
    } catch (error) {
      managedProcess.status = 'error';
      this.processes.delete(processId);
      throw error;
    }
  }

  /**
   * Create child process with appropriate stdio configuration
   */
  private createChildProcess(config: ProcessConfig): ChildProcess {
    const spawnOptions = {
      cwd: config.cwd || process.cwd(),
      env: {
        ...process.env,
        ...config.env,
        // Ensure UTF-8 encoding
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8'
      },
      // Use pipe for all stdio to capture everything
      stdio: ['pipe', 'pipe', 'pipe'] as const,
      // Detach from parent on Unix-like systems only
      detached: process.platform !== 'win32',
      // Kill entire process group when parent exits
      killSignal: 'SIGTERM',
      // Enable shell to find executables and handle .cmd/.bat files on Windows
      shell: true
    };

    return spawn(config.command, config.args, spawnOptions);
  }

  /**
   * Setup event handlers for a managed process
   */
  private setupProcessHandlers(managedProcess: ManagedProcess): void {
    const { process: childProcess, id } = managedProcess;

    // Handle stdout data
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data: Buffer) => {
        this.emit('stdout', data, id);
      });

      childProcess.stdout.on('error', (error: Error) => {
        console.warn(`stdout error for process ${id}:`, error);
      });
    }

    // Handle stderr data
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data: Buffer) => {
        this.emit('stderr', data, id);
      });

      childProcess.stderr.on('error', (error: Error) => {
        console.warn(`stderr error for process ${id}:`, error);
      });
    }

    // Handle process exit
    childProcess.on('exit', (code: number | null, signal: string | null) => {
      managedProcess.status = 'terminated';
      managedProcess.exitCode = code || undefined;
      managedProcess.signal = signal || undefined;
      this.emit('exit', code, signal, id);
    });

    // Handle process errors
    childProcess.on('error', (error: Error) => {
      managedProcess.status = 'error';
      this.emit('error', error, id);
    });

    // Handle close event
    childProcess.on('close', (code: number | null, signal: string | null) => {
      // Clean up after a delay to allow final events to be processed
      setTimeout(() => {
        this.processes.delete(id);
      }, 1000);
    });

    // Setup timeout if specified
    if (managedProcess.config.timeout && managedProcess.config.timeout > 0) {
      setTimeout(() => {
        if (managedProcess.status === 'running') {
          console.warn(`Process ${id} timed out, terminating`);
          this.kill(id, 'SIGTERM');
        }
      }, managedProcess.config.timeout);
    }
  }

  /**
   * Wait for process to spawn successfully
   */
  private waitForSpawn(childProcess: ChildProcess, processId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Process ${processId} failed to spawn within timeout`));
      }, 5000);

      childProcess.on('spawn', () => {
        clearTimeout(timeout);
        resolve();
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Send input to a process
   */
  async send(processId: string, input: string): Promise<void> {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess) {
      throw new Error(`Process ${processId} not found`);
    }

    if (managedProcess.status !== 'running') {
      throw new Error(`Process ${processId} is not running (status: ${managedProcess.status})`);
    }

    const { process: childProcess } = managedProcess;
    if (!childProcess.stdin) {
      throw new Error(`Process ${processId} stdin is not available`);
    }

    return new Promise((resolve, reject) => {
      const data = Buffer.from(input, 'utf8');

      childProcess.stdin!.write(data, (error) => {
        if (error) {
          reject(new Error(`Failed to write to process ${processId}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send raw bytes to a process
   */
  async sendRaw(processId: string, data: Buffer): Promise<void> {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess) {
      throw new Error(`Process ${processId} not found`);
    }

    if (managedProcess.status !== 'running') {
      throw new Error(`Process ${processId} is not running`);
    }

    const { process: childProcess } = managedProcess;
    if (!childProcess.stdin) {
      throw new Error(`Process ${processId} stdin is not available`);
    }

    return new Promise((resolve, reject) => {
      childProcess.stdin!.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Kill a process with specified signal
   */
  async kill(processId: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess) {
      throw new Error(`Process ${processId} not found`);
    }

    const { process: childProcess } = managedProcess;

    if (managedProcess.status === 'terminated') {
      return; // Already terminated
    }

    try {
      // Try graceful termination first
      if (signal === 'SIGTERM' && childProcess.pid) {
        childProcess.kill('SIGTERM');

        // Wait a bit for graceful termination
        await this.waitForTermination(processId, 5000);

        // If still running, force kill
        if (managedProcess.status !== 'terminated') {
          console.warn(`Process ${processId} did not terminate gracefully, force killing`);
          childProcess.kill('SIGKILL');
        }
      } else {
        // Direct signal
        childProcess.kill(signal);
      }

      managedProcess.status = 'terminated';
    } catch (error) {
      console.error(`Error killing process ${processId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for process termination
   */
  private waitForTermination(processId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const managedProcess = this.processes.get(processId);
      if (!managedProcess || managedProcess.status === 'terminated') {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (!this.processes.has(processId) ||
            this.processes.get(processId)!.status === 'terminated') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, timeoutMs);
    });
  }

  /**
   * Pause a process (send SIGSTOP)
   */
  async pause(processId: string): Promise<void> {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess) {
      throw new Error(`Process ${processId} not found`);
    }

    if (managedProcess.status !== 'running') {
      throw new Error(`Process ${processId} is not running`);
    }

    try {
      managedProcess.process.kill('SIGSTOP');
      managedProcess.status = 'paused';
    } catch (error) {
      throw new Error(`Failed to pause process ${processId}: ${error}`);
    }
  }

  /**
   * Resume a paused process (send SIGCONT)
   */
  async resume(processId: string): Promise<void> {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess) {
      throw new Error(`Process ${processId} not found`);
    }

    if (managedProcess.status !== 'paused') {
      throw new Error(`Process ${processId} is not paused`);
    }

    try {
      managedProcess.process.kill('SIGCONT');
      managedProcess.status = 'running';
    } catch (error) {
      throw new Error(`Failed to resume process ${processId}: ${error}`);
    }
  }

  /**
   * Get process information
   */
  getProcess(processId: string): ManagedProcess | null {
    return this.processes.get(processId) || null;
  }

  /**
   * List all processes
   */
  listProcesses(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get running processes count
   */
  getRunningCount(): number {
    return Array.from(this.processes.values())
      .filter(p => p.status === 'running').length;
  }

  /**
   * Check if process exists and is running
   */
  isRunning(processId: string): boolean {
    const process = this.processes.get(processId);
    return process?.status === 'running' || false;
  }

  /**
   * Kill all processes
   */
  async killAll(): Promise<void> {
    const processIds = Array.from(this.processes.keys());
    const killPromises = processIds.map(id =>
      this.kill(id).catch(error =>
        console.warn(`Failed to kill process ${id}:`, error)
      )
    );

    await Promise.all(killPromises);
  }

  /**
   * Clean up terminated processes
   */
  cleanup(): void {
    for (const [id, managedProcess] of this.processes.entries()) {
      if (managedProcess.status === 'terminated' || managedProcess.status === 'error') {
        this.processes.delete(id);
      }
    }
  }

  /**
   * Get statistics about managed processes
   */
  getStats(): {
    total: number;
    running: number;
    paused: number;
    terminated: number;
    error: number;
    uptime: Record<string, number>;
  } {
    const processes = Array.from(this.processes.values());
    const now = Date.now();

    const stats = {
      total: processes.length,
      running: 0,
      paused: 0,
      terminated: 0,
      error: 0,
      uptime: {} as Record<string, number>
    };

    processes.forEach(process => {
      stats[process.status]++;
      stats.uptime[process.id] = now - process.startTime;
    });

    return stats;
  }
}