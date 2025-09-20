# Universal Happy CLI

A powerful, universal CLI wrapper with remote control capabilities. **Now defaults to universal CLI wrapping** with special modes for Claude and Codex integration.

**Free. Open source. Control any CLI tool from anywhere.**

## 🎯 New Default Behavior

Universal Happy CLI now defaults to the universal CLI wrapper mode:
- **Default**: `uhappy <command>` → Uses universal CLI wrapper
- **Special Modes**: `uhappy claude` or `uhappy codex` → Uses original integrations

## ✨ Features

### 🎯 Universal CLI Wrapper
- **Any CLI Tool Support** - Wrap git, docker, npm, kubectl, python, and any command-line tool
- **Complete ANSI Support** - Perfect handling of colors, styles, cursor controls, and terminal formatting
- **Multiple Output Formats** - Support for raw, text, HTML, and JSON output formats
- **Smart Stream Processing** - Real-time processing of progress bars, partial lines, carriage return overwrites
- **Session Management** - Multi-session concurrency, history tracking, status monitoring

### 📱 Remote Control & Tool Integration
- **Universal CLI Remote Control** - Remote control any wrapped CLI tool
- **Claude Code Wrapping** - Available via `uhappy claude` (universal CLI mode)
- **Original Happy Claude** - Available via `uhappy happy-claude` (mobile control mode)
- **Codex AI Mode** - Available via `uhappy codex` (special mode)
- **Real-time Sync** - Mobile and desktop real-time session sharing
- **QR Code Connection** - Scan to connect, no complex configuration needed
- **Push Notifications** - Real-time notifications to mobile devices

### 🔧 Advanced Features
- **Auto Tool Detection** - Automatically detect and configure common CLI tools
- **Pattern Matching** - Configurable patterns for different tool outputs
- **Progress Detection** - Smart detection and handling of progress indicators
- **Environment Inheritance** - Complete inheritance of all parent environment variables
- **Configurable Processing** - YAML-based configuration for tool-specific behaviors
- **Standalone Executables** - Build with Bun or Deno for distribution

## 🚀 Quick Start

### Installation

#### Option 1: From npm (when published)
```bash
npm install -g universal-happy-cli
```

#### Option 2: From source (current development)
```bash
# Clone the repository
git clone https://github.com/ayaka209/universal-happy-cli.git
cd universal-happy-cli

# Install dependencies
npm install

# Use directly with tsx
npx tsx src/universal/cli.ts start -- echo "Hello World"

# Or install locally
npm run build
npm install -g .
```

#### Option 3: Standalone executables
```bash
# Build standalone executable
npm run build:bun  # Creates ~27MB executable
# or
npm run build:deno # Creates ~45MB executable

# Run directly without Node.js
./dist/uhappy-bun start -- echo "Standalone execution"
```

### Basic Usage

#### 1. Default Universal CLI Wrapper (New Default!)
```bash
# NEW DEFAULT BEHAVIOR - No 'start' command needed!
uhappy -- git status              # Direct universal wrapping
uhappy start -- git status        # Explicit start command (also works)
uhappy start --format html -- docker ps
uhappy start -- python -i

# Session management
uhappy list
uhappy send abc123 "git commit -m 'update'"
uhappy history abc123 --format json
uhappy stats

# Quick testing and help
uhappy test                       # Quick functionality test
uhappy --help                     # Show all commands

# Development commands (when using from source)
npm start -- start -- echo "Hello World"
npm run test
npm run test:all
```

#### 2. Interactive Mode
```bash
# Start interactive session with real-time I/O
uhappy interactive python
uhappy interactive node
uhappy interactive mysql -u root -p
```

#### 3. CLI Tool Wrapping & Special Modes
```bash
# CLI tool wrapping (NEW!)
uhappy claude                     # Wrap Claude Code with universal CLI features
uhappy claude --resume            # Claude with session management and logging

# Codex AI programming mode
uhappy codex

# Original Happy CLI Integration (when you need mobile control)
uhappy happy-claude               # Start Claude with original Happy CLI mobile control
uhappy happy-claude --resume      # Resume with full Happy CLI features

# Management commands
uhappy daemon start              # Daemon management
uhappy auth                      # Authentication
uhappy connect                   # API key management
uhappy notify                    # Push notifications
```

## 📋 Command Reference

### Universal CLI Commands (Default Behavior)
- `uhappy [command] [args...]` – **NEW DEFAULT**: Direct universal CLI wrapping
- `uhappy start <command> [args...]` – Explicit start command (still works)
- `uhappy interactive <command> [args...]` – Start interactive session
- `uhappy list [--verbose]` – List active sessions
- `uhappy send <sessionId> <input>` – Send input to session
- `uhappy history <sessionId> [--format]` – View session history
- `uhappy kill <sessionId> [--force]` – Terminate session
- `uhappy stats` – Show system statistics
- `uhappy test` – Run functionality tests

### CLI Tool Wrapping Commands
- `uhappy claude [options]` – Wrap Claude Code with universal CLI features
- `uhappy codex` – Codex AI programming mode

### Special Happy CLI Integration
- `uhappy happy-claude [options]` – Original Happy CLI Claude integration with mobile control

### Configuration Commands
- `uhappy config list` – List configured tools
- `uhappy config add <name> <command>` – Add tool configuration
- `uhappy config export` – Export configuration
- `uhappy config import <file>` – Import configuration

### Development Commands (npm scripts)
```bash
# Testing
npm run test              # Run basic functionality tests
npm run test:format       # Run format processing tests
npm run test:real-world   # Run real-world scenario tests
npm run test:quick        # Run quick validation tests
npm run test:all          # Run all tests

# Development
npm run start             # Start CLI (same as tsx src/universal/cli.ts)
npm run dev               # Development mode
npm run typecheck         # TypeScript type checking

# Building
npm run build             # Build project with pkgroll
npm run build:standalone  # Build standalone executables
npm run build:bun         # Build Bun executable
npm run build:deno        # Build Deno executable

# Legacy features
npm run daemon:start      # Start Happy CLI daemon
npm run daemon:stop       # Stop Happy CLI daemon
npm run daemon:status     # Check daemon status
npm run legacy:dev        # Legacy development mode
npm run legacy:test       # Legacy test suite
```

### Legacy/Management Commands
- `uhappy auth` – Manage authentication
- `uhappy connect` – Manage cloud API keys
- `uhappy notify` – Send push notifications
- `uhappy daemon` – Manage background service
- `uhappy doctor` – System diagnostics

## 🔨 Development Usage (Before npm publish)

If you want to use Universal Happy CLI before it's published to npm, here are several methods:

### Method 1: Direct tsx execution (Recommended for development)
```bash
# Clone and setup
git clone https://github.com/ayaka209/universal-happy-cli.git
cd universal-happy-cli
npm install

# Use directly with tsx
npx tsx src/universal/cli.ts start -- echo "Hello World"
npx tsx src/universal/cli.ts start -- git status
npx tsx src/universal/cli.ts start --format json -- node -e "console.log('test')"

# Session management
npx tsx src/universal/cli.ts list
npx tsx src/universal/cli.ts stats
npx tsx src/universal/cli.ts test
```

### Method 2: Local npm installation
```bash
# In the project directory
npm run build
npm install -g .

# Now use globally
uhappy start -- echo "Now available globally"
uhappy test
uhappy start -- git log --oneline -5
```

### Method 3: npm link for development
```bash
# Create symlink for development
npm link

# Use from anywhere
cd /some/other/directory
uhappy start -- ls -la
uhappy start -- python --version

# Unlink when done
npm unlink -g universal-happy-cli
```

### Method 4: Standalone executables
```bash
# Build standalone executable (no Node.js required)
npm run build:bun

# Use the executable directly
./dist/uhappy-bun.exe start -- echo "Standalone"
./dist/uhappy-bun.exe test

# Share with others (they don't need Node.js)
cp dist/uhappy-bun.exe /path/to/share/
```

### Method 5: Package distribution
```bash
# Create distributable package
npm pack
# Creates: universal-happy-cli-1.0.0.tgz

# Others can install from the tarball
npm install -g ./universal-happy-cli-1.0.0.tgz
```

### Quick Testing Examples
```bash
# NEW DEFAULT BEHAVIOR - Direct wrapping
npx tsx src/index.ts -- echo "Hello Universal CLI"
npx tsx src/index.ts start -- git log --oneline --color=always -5
npx tsx src/index.ts start -- node -e "console.log(process.versions)"

# Test Claude wrapping vs Happy integration
npx tsx src/index.ts claude --help          # Universal CLI wrapper
npx tsx src/index.ts happy-claude --help    # Original Happy CLI integration
npx tsx src/index.ts codex --help

# Test different output formats (via start command)
npx tsx src/index.ts start --format json -- echo "JSON output"
npx tsx src/index.ts start --format html -- git status

# Run test suites
npm run test:quick      # Fast functionality test
npm run test:format     # ANSI processing test
npm run test:real-world # Real CLI tools test
npm run test:env        # Environment variable inheritance test
npm run test:all        # All tests
```

### Performance Comparison
- **tsx direct**: ~200-300ms startup (includes TypeScript compilation)
- **npm scripts**: ~100-200ms startup
- **Local install**: ~50-100ms startup (pre-compiled)
- **Standalone exe**: ~30-50ms startup (fastest)

## ⚙️ Configuration

### Tool Configuration (~/.universal-cli/tools.yaml)
```yaml
tools:
  git:
    command: "git"
    description: "Git version control"
    patterns:
      status:
        stdout: "working tree (clean|dirty)"
        description: "Repository status"
      commit:
        stdout: "\\[\\w+\\s+[a-f0-9]+\\]"
        description: "Commit created"
    outputProcessing:
      preserveColors: true
      realTime: true
      tableDetection: true

  docker:
    command: "docker"
    description: "Docker container management"
    env:
      DOCKER_CLI_HINTS: "false"
    patterns:
      container_start:
        stdout: "container .+ started"
      error:
        stderr: "Error response from daemon"
    outputProcessing:
      stripProgress: true
      progressDetection:
        enabled: true
        patterns: ["Downloading", "Extracting", "Pull complete"]

  python:
    command: "python"
    description: "Python interpreter"
    patterns:
      prompt:
        stdout: ">>> "
        description: "Python prompt"
      error:
        stderr: "Traceback|SyntaxError|NameError"
        description: "Python error"
    outputProcessing:
      preserveColors: true
      realTime: true
```

### Global Configuration (~/.universal-cli/config.yaml)
```yaml
outputFormats: ["raw", "text", "html", "json"]
defaultFormat: "text"
bufferSize: 8192
realTimeThreshold: 100
sessionTimeout: 3600
maxSessions: 20
logLevel: "info"
```

### Environment Variable Inheritance
Universal Happy CLI automatically inherits **ALL** environment variables from the parent process:

```bash
# Environment variables are automatically inherited
export MY_API_KEY="secret123"
export DATABASE_URL="postgresql://localhost/mydb"
uhappy start -- my-app
# my-app will have access to MY_API_KEY and DATABASE_URL

# Override specific environment variables
uhappy start --env '{"NODE_ENV":"production"}' -- node server.js

# Verify environment inheritance
PARENT_VAR=test uhappy start -- node -e "console.log(process.env.PARENT_VAR)"
# Output: test

# All 100+ environment variables are inherited
uhappy start -- node -e "console.log('Env count:', Object.keys(process.env).length)"
# Output: Env count: 142
```

**Features:**
- ✅ **Complete Inheritance** - All parent environment variables passed through
- ✅ **Override Support** - Custom environment variables via `--env` option
- ✅ **UTF-8 Guaranteed** - Automatic LANG/LC_ALL setup for proper encoding
- ✅ **Cross-Platform** - Works on Windows, macOS, and Linux
- ✅ **Performance** - Zero overhead for environment variable passing

## 🎯 Usage Examples

### Basic CLI Wrapping
```bash
# Run git commands with color preservation
uhappy start git log --oneline -5

# Run Docker with progress monitoring
uhappy start docker pull nginx

# Interactive Python session
uhappy interactive python
```

### Multi-format Output
```bash
# Get HTML formatted git output
uhappy start git status --format html

# Get JSON formatted command history
uhappy history abc123 --format json

# Get raw ANSI data for terminal replay
uhappy history abc123 --format raw
```

### Session Management
```bash
# View all active sessions with details
uhappy list --verbose

# Send commands to specific session
uhappy send abc123 "ls -la"

# Monitor system performance
uhappy stats
```

### Advanced Scenarios
```bash
# Long-running development server
uhappy start npm run dev

# Database maintenance session
uhappy interactive mysql -u root -p mydb

# Multi-session workflow
uhappy start git status &
uhappy start docker ps &
uhappy start npm test &
uhappy list
```

## 📦 Building Standalone Executables

### Using Bun
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Build standalone executable
cd src/universal
bun build bun-cli.ts --compile --outfile ../../dist/uhappy

# Test the executable
./dist/uhappy test
```

### Using Deno
```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Build standalone executable
deno compile --allow-all --output dist/uhappy src/universal/deno-cli.ts

# Test the executable
./dist/uhappy test
```

### Binary Distribution
```bash
# Create distribution package
npm run build:binaries

# Outputs:
# dist/uhappy-win.exe     (Windows)
# dist/uhappy-macos       (macOS)
# dist/uhappy-linux       (Linux)
```

## 🧪 Testing

### Run All Tests
```bash
# Basic functionality test
npx tsx src/universal/test.ts

# ANSI format processing test
npx tsx src/universal/format-test.ts

# Real-world scenario test
npx tsx src/universal/real-world-test.ts

# Quick CLI test
uhappy test
```

### Expected Test Results
```
🧪 Testing Universal CLI Wrapper...

📝 Testing Format Processor...
✅ ANSI sequences parsed: 9
✅ HTML conversion: Perfect
✅ Multiple formats: text/html/json/raw

🎮 Testing Session Manager...
✅ Session created: 12345678
✅ Multiple tools: echo/node/cmd
✅ Concurrent sessions: 4
✅ Process management: Stable
✅ All tests completed!
```

## 🏗️ Architecture

### Core Components
```
┌─────────────────────────────────────────┐
│         Universal CLI Wrapper          │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │Format       │ │   Stream Parser     │ │
│ │Processor    │ │   Buffer/Lines      │ │
│ │ANSI/Colors  │ │   Progress/Realtime │ │
│ └─────────────┘ └─────────────────────┘ │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │Process      │ │   Config Manager    │ │
│ │Manager      │ │   Tools/Patterns    │ │
│ │Lifecycle    │ │   Auto-detection    │ │
│ └─────────────┘ └─────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │       Session Manager (Core)       │ │
│ │   Orchestration/Remote/Events      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Project Structure
```
src/universal/
├── types.ts              # TypeScript type definitions
├── FormatProcessor.ts     # ANSI and format processing
├── StreamParser.ts        # Stream parsing and buffering
├── ProcessManager.ts      # Process lifecycle management
├── ConfigManager.ts       # Configuration management
├── SessionManager.ts      # Session orchestration
├── cli.ts                # Main CLI interface
├── bun-cli.ts            # Bun optimized version
├── deno-cli.ts           # Deno optimized version
└── README.md             # Detailed documentation
```

## 📋 System Requirements

### Basic Requirements
- **Node.js >= 20.0.0**
  - Required for eventsource-parser@3.0.5
  - Required for @modelcontextprotocol/sdk (permission forwarding)
- **Claude CLI** - Installed and authenticated (for Claude features)

### Optional Requirements
- **Bun >= 1.0** - For building standalone executables
- **Deno >= 1.30** - Alternative build tool
- **Git** - For version control examples

### Supported Platforms
- ✅ **Windows** - Windows 10/11, PowerShell, CMD
- ✅ **macOS** - macOS 10.15+, Terminal, iTerm2
- ✅ **Linux** - Ubuntu, CentOS, Alpine, and major distributions

### Supported CLI Tools
- ✅ **Development Tools** - git, npm, yarn, pip, cargo, go
- ✅ **System Tools** - ssh, curl, wget, ping, netstat
- ✅ **Container Tools** - docker, kubectl, helm, docker-compose
- ✅ **Database Tools** - mysql, psql, redis-cli, mongo
- ✅ **Interactive Tools** - python, node, irb, php -a
- ✅ **Any CLI Tool** - Generic support for unknown tools

## 🚀 Roadmap

### Near-term Goals
- [ ] WebSocket remote control server
- [ ] Session recording and playback
- [ ] Plugin system for tool-specific enhancements
- [ ] Web-based control interface
- [ ] Mobile app improvements

### Long-term Vision
- [ ] Cluster mode for multi-machine management
- [ ] AI-powered command suggestions
- [ ] Cloud session synchronization
- [ ] Enterprise permission management
- [ ] Integration marketplace

## 🤝 Contributing

We welcome issues and pull requests!

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request

### Testing Requirements
- All new features must have test coverage
- Ensure existing tests pass
- Include usage examples
- Test on multiple platforms when possible

### Code Style
- Use TypeScript with strict typing
- Follow existing code conventions
- Add JSDoc comments for public APIs
- Keep functions focused and testable

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🔗 Related Projects

- **Happy CLI** - Original Claude Code mobile control (legacy features)
- **Claude Code** - Anthropic's official CLI tool
- **Terminal Multiplexers** - tmux, screen, etc.

---

**Universal Happy CLI** - Making remote control of any CLI tool simple and powerful! 🚀

### Quick Links
- 📖 [Documentation](./src/universal/README.md)
- 🐛 [Report Issues](https://github.com/ayaka209/universal-happy-cli/issues)
- 💬 [Discussions](https://github.com/ayaka209/universal-happy-cli/discussions)
- 🌟 [Star on GitHub](https://github.com/ayaka209/universal-happy-cli)