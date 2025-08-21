#!/bin/bash

# Publish script for AI Spine Tools SDK
set -e

echo "🚀 Publishing AI Spine Tools SDK..."

# Check if user is logged in to npm
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ You must be logged in to npm to publish packages"
  echo "Run: npm login"
  exit 1
fi

# Confirm publication
echo "⚠️  This will publish all packages to npm registry."
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Publication cancelled."
  exit 0
fi

# Build packages first
echo "🔨 Building packages..."
npm run build

# Publish packages in dependency order
echo "📦 Publishing packages..."

# 1. Publish core first (no dependencies)
echo "Publishing @ai-spine/tools-core..."
cd packages/ai-spine-tools-core
npm publish --access public
cd ../..

# 2. Publish main tools package (depends on core)
echo "Publishing @ai-spine/tools..."
cd packages/ai-spine-tools
npm publish --access public
cd ../..

# 3. Publish testing package (depends on core)
echo "Publishing @ai-spine/tools-testing..."
cd packages/ai-spine-tools-testing
npm publish --access public
cd ../..

# 4. Publish CLI tool (depends on core)
echo "Publishing create-ai-spine-tool..."
cd packages/create-ai-spine-tool
npm publish --access public
cd ../..

echo "✅ All packages published successfully!"
echo ""
echo "📦 Published packages:"
echo "  - @ai-spine/tools-core"
echo "  - @ai-spine/tools"
echo "  - @ai-spine/tools-testing"
echo "  - create-ai-spine-tool"
echo ""
echo "🎉 Users can now install with:"
echo "  npm install @ai-spine/tools"
echo "  npm install -g create-ai-spine-tool"