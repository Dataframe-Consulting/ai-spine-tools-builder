#!/bin/bash

# Build script for AI Spine Tools SDK
set -e

echo "🔨 Building AI Spine Tools SDK..."

# Clean previous builds
echo "📦 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📥 Installing dependencies..."
npm ci

# Lint and type check
echo "🔍 Running linting and type checking..."
npm run lint
npx tsc --noEmit

# Build packages in dependency order
echo "🏗️  Building packages..."

# 1. Build core first (no dependencies)
echo "Building @ai-spine/tools-core..."
cd packages/ai-spine-tools-core
npm run build
cd ../..

# 2. Build main tools package (depends on core)
echo "Building @ai-spine/tools..."
cd packages/ai-spine-tools
npm run build
cd ../..

# 3. Build testing package (depends on core)
echo "Building @ai-spine/tools-testing..."
cd packages/ai-spine-tools-testing
npm run build
cd ../..

# 4. Build CLI tool (depends on core)
echo "Building create-ai-spine-tool..."
cd packages/create-ai-spine-tool
npm run build
cd ../..

# Run tests
echo "🧪 Running tests..."
npm test

# Build examples
echo "🏗️  Building examples..."
cd examples/weather-tool
npm ci
npm run build
cd ../..

cd examples/email-tool
npm ci
npm run build
cd ../..

echo "✅ Build completed successfully!"
echo ""
echo "📦 Built packages:"
echo "  - @ai-spine/tools-core"
echo "  - @ai-spine/tools"
echo "  - @ai-spine/tools-testing"
echo "  - create-ai-spine-tool"
echo ""
echo "🚀 Ready for publishing!"