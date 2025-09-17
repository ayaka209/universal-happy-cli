# Universal CLI Wrapper

A powerful universal CLI tool wrapper that supports remote control, ANSI format processing, and session management for any command-line tool.

## 🚀 Core Features

### ✅ Complete ANSI Support
- Color code parsing and conversion
- Cursor control sequence processing
- Formatted text processing
- Multiple output formats: raw, text, HTML, JSON

### ✅ Smart Stream Processing
- Real-time stream parsing and buffering
- Progress bar detection and processing
- Partial line handling with timeout mechanism
- Carriage return overwrite processing

### ✅ Powerful Process Management
- Secure process lifecycle management
- Signal handling and graceful termination
- Process pause/resume functionality
- Timeout and error handling

### ✅ Flexible Configuration System
- YAML configuration file support
- Automatic tool detection
- Pattern matching and output processing configuration
- Hot reload configuration

### ✅ Complete Session Management
- Multi-session concurrent support
- Remote client connections
- Session history and status tracking
- Automatic cleanup and timeout

## 📦 Installation and Usage

### Basic Usage

```bash
# Start git session
npx tsx src/universal/cli.ts start git status

# Start Docker session with remote control
npx tsx src/universal/cli.ts start docker ps --remote --port 3000

# Interactive mode
npx tsx src/universal/cli.ts interactive python

# View all sessions
npx tsx src/universal/cli.ts list

# Send command to session
npx tsx src/universal/cli.ts send abc12345 "git commit -m 'test'"

# View session history
npx tsx src/universal/cli.ts history abc12345 --format html

# Terminate session
npx tsx src/universal/cli.ts kill abc12345
```

### Configuration Management

```bash
# View tool configurations
npx tsx src/universal/cli.ts config list

# Add new tool
npx tsx src/universal/cli.ts config add python3 python3 --description "Python 3 interpreter"

# View system statistics
npx tsx src/universal/cli.ts stats
```

## 🛠️ Architecture Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Universal CLI Wrapper                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ Format Processor│  │ Stream Parser   │  │ Process Manager │   │
│  │ FormatProcessor │  │ StreamParser    │  │ ProcessManager  │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Config Manager  │  │ Session Manager │                       │
│  │ ConfigManager   │  │ SessionManager  │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Core Modules

1. **FormatProcessor** - ANSI and format processing
   - Parse ANSI escape sequences
   - Color and style conversion
   - Multi-format output support

2. **StreamParser** - Stream parsing and buffering
   - Real-time stream data processing
   - Line assembly and buffer management
   - Progress bar detection

3. **ProcessManager** - Process management
   - Child process lifecycle management
   - I/O handling and signal management
   - Resource cleanup

4. **ConfigManager** - Configuration management
   - Tool configuration and auto-detection
   - YAML configuration files
   - Pattern matching rules

5. **SessionManager** - Session orchestration
   - Integration of all modules
   - Session state management
   - Remote connection support

## 🔧 Configuration Examples

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
        patterns: ["Downloading", "Extracting"]
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

## 🧪 Testing

Run basic functionality tests:

```bash
npx tsx src/universal/test.ts
```

Test output example:
```
🧪 Testing Universal CLI Wrapper...

📝 Testing Format Processor...
Raw ANSI: "\\u001b[31mRed text\\u001b[0m and \\u001b[32mgreen text\\u001b[0m"
Stripped text: Red text and green text
Parsed sequences: 3
HTML output: <span style="color: #cd0000">Red text</span> and <span style="color: #00cd00">green text</span>

🎮 Testing Session Manager...
✅ Session created: 12345678-1234-5678-9abc-123456789abc
📊 Session status: terminated
📜 History entries: 1
📝 Session output: Hello, Universal CLI!
🧹 Session terminated

✅ All tests completed!
```

## 📚 API Documentation

### SessionManager API

```typescript
// Create session
const sessionId = await sessionManager.createSession({
  command: 'git',
  args: ['status'],
  tool: 'git',
  cwd: '/path/to/repo'
});

// Send input
await sessionManager.sendInput(sessionId, 'git commit -m "test"\\n');

// Get history
const history = sessionManager.getSessionHistory(sessionId, 'html', 50);

// Terminate session
await sessionManager.terminateSession(sessionId);
```

### FormatProcessor API

```typescript
const processor = new FormatProcessor();

// Process output
const output = processor.processOutput(buffer, 'stdout');

// Convert formats
const html = processor.serializeForTransmission(output, 'html');
const json = processor.serializeForTransmission(output, 'json');
```

## 🎯 Use Cases

### Development Tools
- `git` - Version control operations
- `npm`/`yarn` - Package management
- `docker` - Container management
- `kubectl` - Kubernetes operations

### System Tools
- `ssh` - Remote connections
- `top`/`htop` - System monitoring
- `tail` - Log viewing

### Build Tools
- `webpack` - Frontend building
- `cargo` - Rust building
- `make` - Traditional building

### Interactive Tools
- `python`/`node` - REPL environments
- `vim`/`nano` - Editors
- `mysql`/`psql` - Database clients

## 🔮 Future Extensions

1. **WebSocket Remote Control** - Implement true remote control
2. **Session Recording/Playback** - Save and replay sessions
3. **Plugin System** - Tool-specific extensions
4. **Cluster Mode** - Multi-machine session management
5. **Web Interface** - Browser control interface

---

This universal CLI wrapper provides powerful wrapping and remote control capabilities for any command-line tool while maintaining a simple and easy-to-use interface design.