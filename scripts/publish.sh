#!/bin/bash

# Legacy publish script for AI Spine Tools SDK
# NOTE: Consider using the new release automation: node scripts/release-automation.js
set -e

echo "⚠️  NOTE: This is the legacy publish script."
echo "   Consider using: node scripts/release-automation.js publish"
echo "   Or use the full release flow: node scripts/release-manager.js release"
echo ""

# Check if user is logged in to npm
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ You must be logged in to npm to publish packages"
  echo "Run: npm login"
  exit 1
fi

# Use the new release automation system
echo "🚀 Using release automation system..."
node scripts/release-automation.js publish

echo "✅ Publishing completed using release automation!"
echo ""
echo "🎉 Users can now install with:"
echo "  npm install @ai-spine/tools"
echo "  npm install -g create-ai-spine-tool"