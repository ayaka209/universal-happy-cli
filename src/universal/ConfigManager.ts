/**
 * Universal CLI Wrapper - Configuration Manager
 *
 * Manages tool configurations, auto-detection, and user settings.
 * Supports YAML configuration files with hot-reloading.
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import type { ToolConfig, GlobalConfig, PatternConfig, OutputProcessingConfig } from './types.js';

const execAsync = promisify(exec);

export class ConfigManager {
  private config = new Map<string, ToolConfig>();
  private globalConfig: GlobalConfig;
  private configDir: string;
  private configPath: string;
  private globalConfigPath: string;

  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), '.universal-cli');
    this.configPath = join(this.configDir, 'tools.yaml');
    this.globalConfigPath = join(this.configDir, 'config.yaml');

    // Default global configuration
    this.globalConfig = {
      outputFormats: ['raw', 'text', 'html', 'json'],
      defaultFormat: 'text',
      bufferSize: 8192,
      realTimeThreshold: 100,
      sessionTimeout: 3600,
      maxSessions: 20,
      logLevel: 'info'
    };
  }

  /**
   * Initialize configuration system
   */
  async initialize(): Promise<void> {
    await this.ensureConfigDir();
    await this.loadGlobalConfig();
    await this.loadToolConfigs();
    await this.loadDefaultConfigs();
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create config directory: ${error}`);
    }
  }

  /**
   * Load global configuration
   */
  private async loadGlobalConfig(): Promise<void> {
    try {
      const content = await fs.readFile(this.globalConfigPath, 'utf8');
      const parsed = YAML.parse(content);
      this.globalConfig = { ...this.globalConfig, ...parsed };
    } catch (error) {
      // Create default config if it doesn't exist
      await this.saveGlobalConfig();
    }
  }

  /**
   * Load tool configurations
   */
  private async loadToolConfigs(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      const parsed = YAML.parse(content);

      if (parsed && parsed.tools) {
        this.config.clear();
        for (const [name, toolConfig] of Object.entries(parsed.tools)) {
          this.config.set(name, toolConfig as ToolConfig);
        }
      }
    } catch (error) {
      // Create default config if it doesn't exist
      await this.saveToolConfigs();
    }
  }

  /**
   * Load default tool configurations
   */
  private async loadDefaultConfigs(): Promise<void> {
    const defaultConfigs = this.getDefaultToolConfigs();
    let hasNewConfigs = false;

    for (const [name, config] of Object.entries(defaultConfigs)) {
      if (!this.config.has(name)) {
        this.config.set(name, config);
        hasNewConfigs = true;
      }
    }

    // Save if we added new default configs
    if (hasNewConfigs) {
      await this.saveToolConfigs();
    }
  }

  /**
   * Get default tool configurations
   */
  private getDefaultToolConfigs(): Record<string, ToolConfig> {
    return {
      git: {
        command: 'git',
        description: 'Git version control system',
        patterns: {
          status: {
            stdout: 'working tree (clean|dirty)',
            description: 'Repository status'
          },
          commit: {
            stdout: '\\[\\w+\\s+[a-f0-9]+\\]',
            description: 'Commit created'
          },
          error: {
            stderr: 'fatal:|error:',
            description: 'Git error'
          }
        },
        outputProcessing: {
          preserveColors: true,
          realTime: true,
          tableDetection: true
        },
        modes: {
          interactive: true,
          batch: true
        }
      },

      docker: {
        command: 'docker',
        description: 'Docker container management',
        env: {
          DOCKER_CLI_HINTS: 'false'
        },
        patterns: {
          container_start: {
            stdout: 'container .+ started',
            description: 'Container started'
          },
          image_pull: {
            stdout: 'Pull complete',
            description: 'Image pull completed'
          },
          error: {
            stderr: 'Error response from daemon',
            description: 'Docker daemon error'
          }
        },
        outputProcessing: {
          stripProgress: true,
          bufferLines: 50,
          progressDetection: {
            enabled: true,
            patterns: ['Downloading', 'Extracting', 'Pull complete']
          }
        },
        modes: {
          interactive: true,
          batch: true
        }
      },

      npm: {
        command: 'npm',
        description: 'Node.js package manager',
        patterns: {
          install_complete: {
            stdout: 'added \\d+ packages',
            description: 'Package installation complete'
          },
          build_complete: {
            stdout: 'webpack compiled',
            description: 'Build completed'
          },
          error: {
            stderr: 'npm ERR!',
            description: 'NPM error'
          }
        },
        outputProcessing: {
          preserveColors: true,
          realTime: true,
          progressDetection: {
            enabled: true,
            patterns: ['⸩', '░', '▓', '█']
          }
        },
        modes: {
          interactive: true,
          batch: true
        }
      },

      kubectl: {
        command: 'kubectl',
        description: 'Kubernetes CLI',
        patterns: {
          pod_status: {
            stdout: '\\w+\\s+\\d+/\\d+\\s+(Running|Pending|Failed)',
            description: 'Pod status'
          },
          deployment_ready: {
            stdout: 'deployment.*successfully rolled out',
            description: 'Deployment completed'
          }
        },
        outputProcessing: {
          tableDetection: true,
          preserveFormatting: true,
          preserveColors: true
        },
        modes: {
          interactive: true,
          batch: true
        }
      },

      python: {
        command: 'python',
        description: 'Python interpreter',
        patterns: {
          prompt: {
            stdout: '>>> ',
            description: 'Python prompt'
          },
          error: {
            stderr: 'Traceback|SyntaxError|NameError',
            description: 'Python error'
          }
        },
        outputProcessing: {
          preserveColors: true,
          realTime: true
        },
        modes: {
          interactive: true,
          batch: true
        }
      },

      generic: {
        command: '',
        description: 'Generic CLI tool',
        outputProcessing: {
          preserveColors: true,
          realTime: true
        },
        modes: {
          interactive: true,
          batch: true
        }
      }
    };
  }

  /**
   * Get tool configuration by name
   */
  getToolConfig(toolName: string): ToolConfig | null {
    return this.config.get(toolName) || null;
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }

  /**
   * Auto-detect tool type from command
   */
  async detectTool(command: string): Promise<string | null> {
    // First check if we have a direct match
    for (const [name, config] of this.config) {
      if (config.command === command || name === command) {
        return name;
      }
    }

    // Try to detect based on command output
    try {
      const toolType = await this.analyzeCommand(command);
      if (toolType && this.config.has(toolType)) {
        return toolType;
      }
    } catch (error) {
      // Detection failed, use generic
    }

    return 'generic';
  }

  /**
   * Analyze command to determine tool type
   */
  private async analyzeCommand(command: string): Promise<string | null> {
    const detectionCommands = [
      `${command} --version 2>&1`,
      `${command} --help 2>&1`,
      `${command} -V 2>&1`,
      `which ${command} 2>&1`,
      `type ${command} 2>&1`
    ];

    for (const cmd of detectionCommands) {
      try {
        const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
        const output = (stdout + stderr).toLowerCase();

        // Analyze output patterns
        if (output.includes('git version')) return 'git';
        if (output.includes('docker version') || output.includes('docker.com')) return 'docker';
        if (output.includes('npm@') || output.includes('node package manager')) return 'npm';
        if (output.includes('kubectl') || output.includes('kubernetes')) return 'kubectl';
        if (output.includes('python') && output.includes('python.org')) return 'python';
        if (output.includes('node') && output.includes('nodejs.org')) return 'node';

        break; // If we got output, stop trying other commands
      } catch (error) {
        // Continue to next detection command
        continue;
      }
    }

    return null;
  }

  /**
   * Add or update tool configuration
   */
  async addTool(name: string, config: ToolConfig): Promise<void> {
    this.config.set(name, config);
    await this.saveToolConfigs();
  }

  /**
   * Remove tool configuration
   */
  async removeTool(name: string): Promise<void> {
    this.config.delete(name);
    await this.saveToolConfigs();
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<void> {
    this.globalConfig = { ...this.globalConfig, ...updates };
    await this.saveGlobalConfig();
  }

  /**
   * Save tool configurations to file
   */
  private async saveToolConfigs(): Promise<void> {
    const configData = {
      tools: Object.fromEntries(this.config),
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      }
    };

    const yaml = YAML.stringify(configData, {
      indent: 2,
      lineWidth: 120
    });

    await fs.writeFile(this.configPath, yaml, 'utf8');
  }

  /**
   * Save global configuration to file
   */
  private async saveGlobalConfig(): Promise<void> {
    const yaml = YAML.stringify(this.globalConfig, {
      indent: 2,
      lineWidth: 120
    });

    await fs.writeFile(this.globalConfigPath, yaml, 'utf8');
  }

  /**
   * List all configured tools
   */
  listTools(): Array<{ name: string; config: ToolConfig }> {
    return Array.from(this.config.entries()).map(([name, config]) => ({
      name,
      config
    }));
  }

  /**
   * Validate tool configuration
   */
  validateToolConfig(config: ToolConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.command || config.command.trim().length === 0) {
      errors.push('Command is required');
    }

    if (config.patterns) {
      for (const [patternName, pattern] of Object.entries(config.patterns)) {
        try {
          if (pattern.stdout) new RegExp(pattern.stdout);
          if (pattern.stderr) new RegExp(pattern.stderr);
        } catch (error) {
          errors.push(`Invalid regex in pattern '${patternName}': ${error}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths(): {
    configDir: string;
    toolsConfig: string;
    globalConfig: string;
  } {
    return {
      configDir: this.configDir,
      toolsConfig: this.configPath,
      globalConfig: this.globalConfigPath
    };
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config.clear();
    await this.loadDefaultConfigs();
    await this.saveToolConfigs();
  }

  /**
   * Export configuration
   */
  async exportConfig(): Promise<{
    tools: Record<string, ToolConfig>;
    global: GlobalConfig;
  }> {
    return {
      tools: Object.fromEntries(this.config),
      global: this.globalConfig
    };
  }

  /**
   * Import configuration
   */
  async importConfig(data: {
    tools?: Record<string, ToolConfig>;
    global?: Partial<GlobalConfig>;
  }): Promise<void> {
    if (data.tools) {
      this.config.clear();
      for (const [name, config] of Object.entries(data.tools)) {
        const validation = this.validateToolConfig(config);
        if (validation.valid) {
          this.config.set(name, config);
        } else {
          console.warn(`Invalid config for tool '${name}':`, validation.errors);
        }
      }
      await this.saveToolConfigs();
    }

    if (data.global) {
      this.globalConfig = { ...this.globalConfig, ...data.global };
      await this.saveGlobalConfig();
    }
  }
}