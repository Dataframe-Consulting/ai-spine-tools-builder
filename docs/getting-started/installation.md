# Installation Guide

Complete installation instructions for AI Spine Tools SDK on different platforms and environments.

## System Requirements

### Minimum Requirements
- **Node.js**: Version 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: Version 8.0 or higher (included with Node.js)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 1GB free space for SDK and dependencies

### Recommended Development Environment
- **IDE**: Visual Studio Code with TypeScript extension
- **Terminal**: Modern terminal with color support
- **Git**: Version 2.20 or higher for version control
- **Docker**: Optional, for containerized development

## Installation Methods

### Method 1: Global Installation (Recommended)

```bash
# Install the CLI globally
npm install -g create-ai-spine-tool

# Verify installation
create-ai-spine-tool --version
```

### Method 2: npx (No Global Install)

```bash
# Use directly without installation
npx create-ai-spine-tool my-tool-name

# Always uses the latest version
npx create-ai-spine-tool@latest my-tool-name
```

### Method 3: Package Installation

```bash
# In your project directory
npm init -y
npm install @ai-spine/tools @ai-spine/tools-core

# Create tool programmatically
```

## Platform-Specific Instructions

### Windows

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Use the Windows Installer (.msi)
   - Check "Add to PATH" during installation

2. **Verify Installation**
   ```cmd
   node --version
   npm --version
   ```

3. **Install AI Spine Tools**
   ```cmd
   npm install -g create-ai-spine-tool
   ```

### macOS

1. **Install Node.js**
   ```bash
   # Using Homebrew (recommended)
   brew install node

   # Or download from nodejs.org
   ```

2. **Install AI Spine Tools**
   ```bash
   npm install -g create-ai-spine-tool
   ```

### Linux (Ubuntu/Debian)

1. **Install Node.js**
   ```bash
   # Update package index
   sudo apt update

   # Install Node.js and npm
   sudo apt install nodejs npm

   # Or use NodeSource repository for latest version
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install AI Spine Tools**
   ```bash
   npm install -g create-ai-spine-tool
   ```

## Development Environment Setup

### Visual Studio Code

1. **Install Extensions**
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier - Code formatter
   - REST Client (for API testing)

2. **Configure Settings**
   ```json
   {
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "typescript.preferences.includePackageJsonAutoImports": "auto"
   }
   ```

### Git Configuration

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main
```

## Verification

### Check Installation

```bash
# Verify CLI installation
create-ai-spine-tool --version
create-ai-spine-tool --help

# Verify Node.js and npm
node --version  # Should be 18.0 or higher
npm --version   # Should be 8.0 or higher
```

### Create Test Project

```bash
# Create a test tool
create-ai-spine-tool test-installation

# Follow the prompts, then:
cd test-installation
npm test
npm run build
```

If all commands succeed, your installation is working correctly!

## Troubleshooting

### Common Issues

#### Permission Errors (npm install -g)

**Error**: `EACCES: permission denied`

**Solution (macOS/Linux)**:
```bash
# Option 1: Use npx instead
npx create-ai-spine-tool my-tool

# Option 2: Configure npm to install globally without sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Solution (Windows)**:
- Run terminal as Administrator
- Or use npx method

#### Node.js Version Issues

**Error**: `node: command not found` or version too low

**Solution**:
```bash
# Check current version
node --version

# Update Node.js to latest LTS
# Visit https://nodejs.org and download latest LTS version
# Or use version managers like nvm
```

#### Network/Firewall Issues

**Error**: `ENOTFOUND`, `ETIMEDOUT`, or network errors

**Solution**:
```bash
# Check npm registry
npm config get registry

# Try different registry
npm config set registry https://registry.npmjs.org/

# Or use corporate proxy if needed
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

#### TypeScript Compilation Errors

**Error**: TypeScript errors during build

**Solution**:
```bash
# Install/update TypeScript globally
npm install -g typescript@latest

# Check version
tsc --version

# Clear npm cache
npm cache clean --force
```

### Getting Help

If you encounter issues not covered here:

1. **Check System Requirements**: Ensure Node.js version is 18+
2. **Clear Cache**: Run `npm cache clean --force`
3. **Reinstall**: Uninstall and reinstall the CLI
4. **Check Documentation**: Visit our [troubleshooting guide](../integration/troubleshooting.md)
5. **Community Support**: Ask on [GitHub Discussions](https://github.com/ai-spine/tools-sdk/discussions)

## Next Steps

After successful installation:

1. **[Quick Start Guide](./quick-start.md)** - Create your first AI tool in 5 minutes
2. **[Core Concepts](./concepts.md)** - Understand the framework architecture
3. **[Examples](../examples/README.md)** - Explore working tool examples
4. **[API Reference](../api-reference/README.md)** - Dive into the complete API

---

**Need help?** Join our [Discord community](https://discord.gg/ai-spine-tools) or check the [FAQ](../community/faq.md).