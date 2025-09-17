#!/bin/bash

# Universal Happy CLI - Standalone Build Script
# Builds standalone executables using Bun and Deno

set -e

echo "🚀 Building Universal Happy CLI standalone executables..."

# Create dist directory
mkdir -p dist

# Build with Bun (if available)
if command -v bun &> /dev/null; then
    echo "📦 Building with Bun..."
    cd src/universal

    # Build for current platform
    bun build bun-cli.ts --compile --outfile ../../dist/uhappy-bun

    cd ../..
    echo "✅ Bun build completed: dist/uhappy-bun"
else
    echo "⚠️  Bun not found, skipping Bun build"
fi

# Build with Deno (if available)
if command -v deno &> /dev/null; then
    echo "📦 Building with Deno..."

    # Build for current platform
    deno compile \
        --allow-all \
        --output dist/uhappy-deno \
        --unstable \
        src/universal/deno-cli.ts

    echo "✅ Deno build completed: dist/uhappy-deno"
else
    echo "⚠️  Deno not found, skipping Deno build"
fi

# Test the builds
echo "🧪 Testing built executables..."

if [ -f "dist/uhappy-bun" ]; then
    echo "Testing Bun build..."
    ./dist/uhappy-bun test || echo "❌ Bun build test failed"
fi

if [ -f "dist/uhappy-deno" ]; then
    echo "Testing Deno build..."
    ./dist/uhappy-deno test || echo "❌ Deno build test failed"
fi

echo "📊 Build summary:"
ls -la dist/uhappy-* 2>/dev/null || echo "No executables built"

echo "✅ Build process completed!"
echo ""
echo "Usage:"
echo "  ./dist/uhappy-bun test      # Test Bun build"
echo "  ./dist/uhappy-deno test     # Test Deno build"
echo "  ./dist/uhappy-bun start echo hello   # Run command with Bun build"
echo "  ./dist/uhappy-deno start echo hello  # Run command with Deno build"