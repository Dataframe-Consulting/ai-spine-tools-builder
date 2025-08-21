#!/bin/bash

# Version management script for AI Spine Tools SDK
set -e

# Get the new version from argument or prompt
if [ -z "$1" ]; then
  echo "Current version info:"
  echo "  Root package: $(node -p "require('./package.json').version")"
  echo ""
  read -p "Enter new version (patch/minor/major or specific version like 1.2.3): " VERSION
else
  VERSION=$1
fi

echo "🔄 Updating version to: $VERSION"

# Update root package.json
echo "📝 Updating root package.json..."
npm version $VERSION --no-git-tag-version

# Update all sub-packages
echo "📝 Updating sub-packages..."

# Update core package
cd packages/ai-spine-tools-core
npm version $VERSION --no-git-tag-version
cd ../..

# Update main tools package
cd packages/ai-spine-tools
npm version $VERSION --no-git-tag-version
cd ../..

# Update testing package
cd packages/ai-spine-tools-testing
npm version $VERSION --no-git-tag-version
cd ../..

# Update CLI package
cd packages/create-ai-spine-tool
npm version $VERSION --no-git-tag-version
cd ../..

# Get the actual version that was set
NEW_VERSION=$(node -p "require('./package.json').version")

# Update cross-package dependencies
echo "🔗 Updating cross-package dependencies..."

# Update tools package to use new core version
cd packages/ai-spine-tools
npm pkg set dependencies.@ai-spine/tools-core="^$NEW_VERSION"
cd ../..

# Update testing package to use new core version
cd packages/ai-spine-tools-testing
npm pkg set dependencies.@ai-spine/tools-core="^$NEW_VERSION"
cd ../..

# Update examples to use new versions
echo "📝 Updating examples..."

cd examples/weather-tool
npm pkg set dependencies.@ai-spine/tools="^$NEW_VERSION"
npm pkg set devDependencies.@ai-spine/tools-testing="^$NEW_VERSION"
cd ../..

cd examples/email-tool
npm pkg set dependencies.@ai-spine/tools="^$NEW_VERSION"
npm pkg set devDependencies.@ai-spine/tools-testing="^$NEW_VERSION"
cd ../..

# Create git tag
echo "🏷️  Creating git tag..."
git add .
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "✅ Version updated successfully!"
echo ""
echo "📋 Summary:"
echo "  - Updated all packages to version: $NEW_VERSION"
echo "  - Updated cross-package dependencies"
echo "  - Created git tag: v$NEW_VERSION"
echo ""
echo "🚀 Next steps:"
echo "  1. Push changes: git push && git push --tags"
echo "  2. GitHub Actions will automatically publish to npm"
echo "  3. Or publish manually: npm run publish"