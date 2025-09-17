# Universal Happy CLI

A powerful, universal CLI wrapper with remote control capabilities. Wrap any command-line tool with enhanced features like ANSI processing, session management, and mobile remote control.

**Free. Open source. Control any CLI tool from anywhere.**

## ✨ Features

### 🎯 Universal CLI Wrapper
- **Any CLI Tool Support** - Wrap git, docker, npm, kubectl, python, and any command-line tool
- **Complete ANSI Support** - Perfect handling of colors, styles, cursor controls, and terminal formatting
- **Multiple Output Formats** - Support for raw, text, HTML, and JSON output formats
- **Smart Stream Processing** - Real-time processing of progress bars, partial lines, carriage return overwrites
- **Session Management** - Multi-session concurrency, history tracking, status monitoring

### 📱 Remote Control (Legacy from Happy CLI)
- **Claude Code Integration** - Remote control of Claude Code sessions
- **Real-time Sync** - Mobile and desktop real-time session sharing
- **QR Code Connection** - Scan to connect, no complex configuration needed
- **Push Notifications** - Real-time notifications to mobile devices

### 🔧 Advanced Features
- **Auto Tool Detection** - Automatically detect and configure common CLI tools
- **Pattern Matching** - Configurable patterns for different tool outputs
- **Progress Detection** - Smart detection and handling of progress indicators
- **Configurable Processing** - YAML-based configuration for tool-specific behaviors
- **Standalone Executables** - Build with Bun or Deno for distribution

## 🚀 Quick Start

### Installation

```bash
npm install -g universal-happy-cli
```

### Basic Usage

#### 1. Universal CLI Wrapper
```bash
# Wrap any CLI tool with enhanced features
uhappy start git status
uhappy start docker ps --format html
uhappy start python -i

# Session management
uhappy list
uhappy send abc123 "git commit -m 'update'"
uhappy history abc123 --format json
uhappy stats
```

#### 2. Interactive Mode
```bash
# Start interactive session with real-time I/O
uhappy interactive python
uhappy interactive node
uhappy interactive mysql -u root -p
```

#### 3. Legacy Happy CLI Features
```bash
# Start Claude Code with QR code for mobile control
uhappy claude

# Codex AI programming mode
uhappy codex

# Daemon mode
uhappy daemon start
```

## 📋 Command Reference

### Universal CLI Commands
- `uhappy start <command> [args...]` – Start a CLI tool session
- `uhappy interactive <command> [args...]` – Start interactive session
- `uhappy list [--verbose]` – List active sessions
- `uhappy send <sessionId> <input>` – Send input to session
- `uhappy history <sessionId> [--format]` – View session history
- `uhappy kill <sessionId> [--force]` – Terminate session
- `uhappy stats` – Show system statistics
- `uhappy test` – Run functionality tests

### Configuration Commands
- `uhappy config list` – List configured tools
- `uhappy config add <name> <command>` – Add tool configuration
- `uhappy config export` – Export configuration
- `uhappy config import <file>` – Import configuration

### Legacy Happy CLI Commands
- `uhappy claude` – Start Claude Code with mobile remote control
- `uhappy auth` – Manage authentication
- `uhappy codex` – Start Codex AI programming mode
- `uhappy connect` – Manage cloud API keys
- `uhappy notify` – Send push notifications
- `uhappy daemon` – Manage background service
- `uhappy doctor` – System diagnostics

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