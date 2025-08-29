#!/bin/bash

# Legacy version management script for AI Spine Tools SDK
# NOTE: Consider using the new release manager: node scripts/release-manager.js
set -e

echo "⚠️  NOTE: This is the legacy version script."
echo "   Consider using: node scripts/release-manager.js release"
echo "   Or for just version bump: node scripts/monorepo-manager.js version"
echo ""

# Get the new version from argument or prompt
if [ -z "$1" ]; then
  echo "Current version info:"
  echo "  Root package: $(node -p "require('./package.json').version")"
  echo ""
  echo "Available options:"
  echo "  - patch: Bug fixes (1.0.0 -> 1.0.1)"
  echo "  - minor: New features (1.0.0 -> 1.1.0)"
  echo "  - major: Breaking changes (1.0.0 -> 2.0.0)"
  echo "  - specific version like 1.2.3"
  echo ""
  read -p "Enter new version (patch/minor/major or specific version): " VERSION
else
  VERSION=$1
fi

echo "🔄 Using monorepo manager to update version to: $VERSION"

# Use the new monorepo manager for version coordination
node scripts/monorepo-manager.js version $VERSION

echo "✅ Version updated successfully using monorepo manager!"
echo ""
echo "🚀 Next steps:"
echo "  1. Review changes: git status"
echo "  2. Create release: node scripts/release-manager.js release"
echo "  3. Or commit manually and push: git push && git push --tags"