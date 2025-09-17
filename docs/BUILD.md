# Build Guide - Universal Happy CLI

This guide covers how to build standalone executables for Universal Happy CLI using Bun and Deno.

## 🚀 Quick Build

### Automated Build Script
```bash
# Run the automated build script
./scripts/build-standalone.sh

# Output will be in dist/ directory:
# dist/uhappy-bun    (Bun executable)
# dist/uhappy-deno   (Deno executable)
```

## 📦 Manual Build Instructions

### Prerequisites

#### For Bun Build
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# or on Windows with PowerShell:
# irm bun.sh/install.ps1 | iex

# Verify installation
bun --version
```

#### For Deno Build
```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh
# or on Windows with PowerShell:
# irm https://deno.land/install.ps1 | iex

# Verify installation
deno --version
```

### Building with Bun

#### 1. Basic Build
```bash
cd src/universal
bun build bun-cli.ts --compile --outfile ../../dist/uhappy
```

#### 2. Optimized Build
```bash
cd src/universal
bun build bun-cli.ts \
  --compile \
  --minify \
  --target bun \
  --outfile ../../dist/uhappy
```

#### 3. Cross-platform Builds
```bash
# Note: Bun currently supports same-platform compilation only
# For cross-platform, build on each target platform

# Build on Windows (produces .exe)
bun build bun-cli.ts --compile --outfile ../../dist/uhappy-win.exe

# Build on macOS
bun build bun-cli.ts --compile --outfile ../../dist/uhappy-macos

# Build on Linux
bun build bun-cli.ts --compile --outfile ../../dist/uhappy-linux
```

### Building with Deno

#### 1. Basic Build
```bash
deno compile \
  --allow-all \
  --output dist/uhappy \
  src/universal/deno-cli.ts
```

#### 2. Optimized Build
```bash
deno compile \
  --allow-all \
  --unstable \
  --no-check \
  --output dist/uhappy \
  src/universal/deno-cli.ts
```

#### 3. Cross-platform Builds
```bash
# Build for Windows
deno compile \
  --allow-all \
  --target x86_64-pc-windows-msvc \
  --output dist/uhappy-win.exe \
  src/universal/deno-cli.ts

# Build for macOS
deno compile \
  --allow-all \
  --target x86_64-apple-darwin \
  --output dist/uhappy-macos \
  src/universal/deno-cli.ts

# Build for Linux
deno compile \
  --allow-all \
  --target x86_64-unknown-linux-gnu \
  --output dist/uhappy-linux \
  src/universal/deno-cli.ts
```

## 🧪 Testing Builds

### Test Executables
```bash
# Test Bun build
./dist/uhappy test

# Test Deno build
./dist/uhappy-deno test

# Test basic functionality
./dist/uhappy start echo "Hello World"
./dist/uhappy start git --version
```

### Expected Output
```bash
$ ./dist/uhappy test
🧪 Running quick test...
✅ Test successful!
Output: Universal Happy CLI is working!
```

## 📊 Build Comparison

### Bun vs Deno Builds

| Feature | Bun Build | Deno Build |
|---------|-----------|------------|
| **Build Speed** | Very Fast (< 5s) | Fast (10-15s) |
| **File Size** | Smaller (~20-30MB) | Larger (~40-60MB) |
| **Startup Time** | Very Fast | Fast |
| **Cross-compilation** | Limited | Full Support |
| **Dependencies** | Bundled | Bundled |
| **Platform Support** | Same-platform only | Cross-platform |

### Choosing Between Builds

**Use Bun Build When:**
- Building for same platform
- Want smallest file size
- Need fastest build time
- Performance is critical

**Use Deno Build When:**
- Need cross-platform builds
- Want broader platform support
- Building CI/CD pipelines
- Distribution to multiple platforms

## 🔧 Advanced Build Options

### Bun Advanced Options
```bash
# With custom entry point
bun build src/universal/bun-cli.ts \
  --compile \
  --minify \
  --sourcemap \
  --outfile dist/uhappy

# With specific target
bun build bun-cli.ts \
  --compile \
  --target=bun-linux-x64 \
  --outfile uhappy-linux
```

### Deno Advanced Options
```bash
# With specific permissions
deno compile \
  --allow-run \
  --allow-read \
  --allow-write \
  --allow-env \
  --output dist/uhappy \
  src/universal/deno-cli.ts

# With import maps and config
deno compile \
  --allow-all \
  --config deno.json \
  --import-map import_map.json \
  --output dist/uhappy \
  src/universal/deno-cli.ts
```

## 📁 Output Structure

After building, your `dist/` directory should look like:

```
dist/
├── uhappy               # Default build
├── uhappy-bun          # Bun build
├── uhappy-deno         # Deno build
├── uhappy-win.exe      # Windows executable
├── uhappy-macos        # macOS executable
└── uhappy-linux        # Linux executable
```

## 🚢 Distribution

### Single Platform Distribution
```bash
# Copy the appropriate executable
cp dist/uhappy-linux /usr/local/bin/uhappy

# Or create a release package
tar -czf uhappy-linux-x64.tar.gz -C dist uhappy-linux
```

### Multi-Platform Distribution
```bash
# Create release packages for all platforms
tar -czf uhappy-linux-x64.tar.gz -C dist uhappy-linux
tar -czf uhappy-macos-x64.tar.gz -C dist uhappy-macos
zip -j uhappy-windows-x64.zip dist/uhappy-win.exe

# Upload to GitHub Releases or distribution platform
```

## 🐛 Troubleshooting

### Common Build Issues

#### Bun Build Fails
```bash
# Check Bun version
bun --version

# Update Bun
bun upgrade

# Clear cache
rm -rf node_modules/.cache
```

#### Deno Build Fails
```bash
# Check Deno version
deno --version

# Update Deno
deno upgrade

# Clear cache
deno cache --reload src/universal/deno-cli.ts
```

#### Permission Issues
```bash
# Make sure script is executable
chmod +x scripts/build-standalone.sh

# Check file permissions
ls -la dist/
```

### Platform-Specific Issues

#### Windows
- Use PowerShell or WSL for building
- Ensure proper permissions for executable creation
- Use `.exe` extension for executables

#### macOS
- May need to allow unsigned executables: `xattr -d com.apple.quarantine dist/uhappy`
- Sign executables for distribution: `codesign -s "Developer ID" dist/uhappy`

#### Linux
- Ensure glibc compatibility for target systems
- Consider static builds for broader compatibility
- Test on target distributions

## 📋 Build Checklist

Before releasing a build:

- [ ] Test on target platform
- [ ] Verify all CLI commands work
- [ ] Check file size is reasonable
- [ ] Test startup performance
- [ ] Validate error handling
- [ ] Check dependencies are bundled
- [ ] Test with different CLI tools
- [ ] Verify output formatting works
- [ ] Test session management features
- [ ] Check configuration loading

## 🔄 Automated Builds

### GitHub Actions Example
```yaml
name: Build Executables

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1

    - name: Setup Deno
      uses: denoland/setup-deno@v1

    - name: Build executables
      run: ./scripts/build-standalone.sh

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: uhappy-${{ matrix.os }}
        path: dist/uhappy*
```

This will automatically build executables for all platforms when you push a version tag.

---

**Happy Building!** 🚀