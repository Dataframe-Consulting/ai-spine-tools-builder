#!/usr/bin/env node

/**
 * Development Workflow Script
 * Manages development workflows including hot reload, cross-package linking, and dev servers
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Development workflow manager
 */
class DevWorkflowManager {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.rootDir = path.resolve(__dirname, '..');
    this.packagesDir = path.join(this.rootDir, 'packages');
    this.examplesDir = path.join(this.rootDir, 'examples');

    this.packages = this.discoverPackages();
    this.runningProcesses = new Map();
  }

  log(message, level = 'info') {
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✅${colors.reset}`,
      warning: `${colors.yellow}⚠️${colors.reset}`,
      error: `${colors.red}❌${colors.reset}`,
      debug: `${colors.cyan}🔍${colors.reset}`,
    };

    if (this.verbose || level !== 'debug') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${prefix[level]} ${message}`);
    }
  }

  /**
   * Discover all packages in the monorepo
   */
  discoverPackages() {
    const packages = new Map();

    // Discover packages
    if (fs.existsSync(this.packagesDir)) {
      const packageDirs = fs
        .readdirSync(this.packagesDir)
        .filter(dir =>
          fs.statSync(path.join(this.packagesDir, dir)).isDirectory()
        );

      for (const dir of packageDirs) {
        const packagePath = path.join(this.packagesDir, dir);
        const packageJsonPath = path.join(packagePath, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          packages.set(packageJson.name || dir, {
            name: packageJson.name || dir,
            path: packagePath,
            packageJson,
            type: 'package',
            directory: dir,
          });
        }
      }
    }

    // Discover examples
    if (fs.existsSync(this.examplesDir)) {
      const exampleDirs = fs
        .readdirSync(this.examplesDir)
        .filter(dir =>
          fs.statSync(path.join(this.examplesDir, dir)).isDirectory()
        );

      for (const dir of exampleDirs) {
        const examplePath = path.join(this.examplesDir, dir);
        const packageJsonPath = path.join(examplePath, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8')
          );
          packages.set(packageJson.name || dir, {
            name: packageJson.name || dir,
            path: examplePath,
            packageJson,
            type: 'example',
            directory: dir,
          });
        }
      }
    }

    this.log(`Discovered ${packages.size} packages`, 'debug');
    return packages;
  }

  /**
   * Start development servers for all packages that have dev scripts
   */
  async startDevServers(packageNames = []) {
    this.log('Starting development servers...', 'info');

    const packagesToStart =
      packageNames.length > 0
        ? Array.from(this.packages.values()).filter(pkg =>
            packageNames.includes(pkg.name)
          )
        : Array.from(this.packages.values());

    const packagesWithDev = packagesWithDev.filter(
      pkg => pkg.packageJson.scripts?.dev
    );

    if (packagesWithDev.length === 0) {
      this.log('No packages with dev scripts found', 'warning');
      return;
    }

    // Start each dev server
    for (const pkg of packagesWithDev) {
      await this.startDevServer(pkg);
    }

    // Set up signal handlers for graceful shutdown
    process.on('SIGINT', () => this.stopAllServers());
    process.on('SIGTERM', () => this.stopAllServers());

    this.log(
      `Started ${packagesWithDev.length} development servers`,
      'success'
    );
    this.log('Press Ctrl+C to stop all servers', 'info');

    // Keep the process running
    return new Promise(() => {});
  }

  /**
   * Start dev server for a single package
   */
  async startDevServer(pkg) {
    return new Promise((resolve, reject) => {
      this.log(`Starting dev server for ${pkg.name}...`, 'info');

      const child = spawn('npm', ['run', 'dev'], {
        cwd: pkg.path,
        stdio: this.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      this.runningProcesses.set(pkg.name, child);

      if (!this.verbose && child.stdout) {
        child.stdout.on('data', data => {
          const output = data.toString();
          if (
            output.includes('listening') ||
            output.includes('started') ||
            output.includes('ready')
          ) {
            this.log(`${pkg.name}: ${output.trim()}`, 'success');
          }
        });
      }

      if (!this.verbose && child.stderr) {
        child.stderr.on('data', data => {
          const error = data.toString();
          if (!error.includes('warning') && !error.includes('deprecated')) {
            this.log(`${pkg.name}: ${error.trim()}`, 'error');
          }
        });
      }

      child.on('close', code => {
        this.runningProcesses.delete(pkg.name);
        if (code === 0) {
          this.log(`Dev server for ${pkg.name} stopped gracefully`, 'info');
        } else {
          this.log(
            `Dev server for ${pkg.name} exited with code ${code}`,
            'warning'
          );
        }
        resolve();
      });

      child.on('error', error => {
        this.runningProcesses.delete(pkg.name);
        this.log(
          `Failed to start dev server for ${pkg.name}: ${error.message}`,
          'error'
        );
        reject(error);
      });

      // Give the server a moment to start
      setTimeout(() => {
        this.log(`Started dev server for ${pkg.name}`, 'success');
        resolve();
      }, 2000);
    });
  }

  /**
   * Stop all running dev servers
   */
  stopAllServers() {
    this.log('Stopping all development servers...', 'info');

    for (const [name, process] of this.runningProcesses) {
      this.log(`Stopping ${name}...`, 'info');
      process.kill('SIGTERM');
    }

    // Force kill after timeout
    setTimeout(() => {
      for (const [name, process] of this.runningProcesses) {
        this.log(`Force stopping ${name}...`, 'warning');
        process.kill('SIGKILL');
      }
      process.exit(0);
    }, 5000);
  }

  /**
   * Link packages for local development
   */
  async linkPackages() {
    this.log('Linking packages for local development...', 'info');

    const corePackages = Array.from(this.packages.values()).filter(
      pkg => pkg.type === 'package'
    );

    // First, run npm link in all core packages
    for (const pkg of corePackages) {
      try {
        this.log(`Creating global link for ${pkg.name}...`, 'info');
        execSync('npm link', {
          cwd: pkg.path,
          stdio: this.verbose ? 'inherit' : 'pipe',
        });
      } catch (error) {
        this.log(
          `Failed to create link for ${pkg.name}: ${error.message}`,
          'error'
        );
      }
    }

    // Then, link dependencies in packages that need them
    for (const pkg of Array.from(this.packages.values())) {
      const deps = {
        ...pkg.packageJson.dependencies,
        ...pkg.packageJson.devDependencies,
      };

      for (const depName of Object.keys(deps)) {
        if (this.packages.has(depName)) {
          try {
            this.log(`Linking ${depName} in ${pkg.name}...`, 'info');
            execSync(`npm link ${depName}`, {
              cwd: pkg.path,
              stdio: this.verbose ? 'inherit' : 'pipe',
            });
          } catch (error) {
            this.log(
              `Failed to link ${depName} in ${pkg.name}: ${error.message}`,
              'error'
            );
          }
        }
      }
    }

    this.log('Package linking completed', 'success');
  }

  /**
   * Unlink all packages
   */
  async unlinkPackages() {
    this.log('Unlinking packages...', 'info');

    for (const pkg of this.packages.values()) {
      try {
        this.log(`Unlinking ${pkg.name}...`, 'info');
        execSync('npm unlink', {
          cwd: pkg.path,
          stdio: this.verbose ? 'inherit' : 'pipe',
        });
      } catch (error) {
        // Ignore errors for unlinking
        this.log(`Could not unlink ${pkg.name} (might not be linked)`, 'debug');
      }
    }

    this.log('Package unlinking completed', 'success');
  }

  /**
   * Watch and rebuild packages on changes
   */
  async watchAndRebuild(packageNames = []) {
    this.log('Starting watch mode for packages...', 'info');

    const packagesToWatch =
      packageNames.length > 0
        ? Array.from(this.packages.values()).filter(pkg =>
            packageNames.includes(pkg.name)
          )
        : Array.from(this.packages.values()).filter(
            pkg => pkg.type === 'package'
          );

    const watchablePackages = packagesToWatch.filter(
      pkg =>
        pkg.packageJson.scripts?.dev ||
        pkg.packageJson.scripts?.watch ||
        pkg.packageJson.scripts?.['dev:watch']
    );

    if (watchablePackages.length === 0) {
      this.log('No packages with watch/dev scripts found', 'warning');
      return;
    }

    // Start watchers for each package
    for (const pkg of watchablePackages) {
      await this.startWatcher(pkg);
    }

    // Set up signal handlers for graceful shutdown
    process.on('SIGINT', () => this.stopAllWatchers());
    process.on('SIGTERM', () => this.stopAllWatchers());

    this.log(
      `Started watchers for ${watchablePackages.length} packages`,
      'success'
    );
    this.log('Press Ctrl+C to stop all watchers', 'info');

    // Keep the process running
    return new Promise(() => {});
  }

  /**
   * Start watcher for a single package
   */
  async startWatcher(pkg) {
    return new Promise(resolve => {
      const script =
        pkg.packageJson.scripts['dev:watch'] ||
        pkg.packageJson.scripts.dev ||
        pkg.packageJson.scripts.watch;

      const [command, ...args] = script.split(' ');

      this.log(`Starting watcher for ${pkg.name}...`, 'info');

      const child = spawn(command, args, {
        cwd: pkg.path,
        stdio: this.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      this.runningProcesses.set(`${pkg.name}-watch`, child);

      if (!this.verbose && child.stdout) {
        child.stdout.on('data', data => {
          const output = data.toString();
          if (
            output.includes('compiled') ||
            output.includes('built') ||
            output.includes('watching')
          ) {
            this.log(`${pkg.name}: ${output.trim()}`, 'success');
          }
        });
      }

      child.on('close', code => {
        this.runningProcesses.delete(`${pkg.name}-watch`);
        this.log(`Watcher for ${pkg.name} stopped`, 'info');
      });

      child.on('error', error => {
        this.runningProcesses.delete(`${pkg.name}-watch`);
        this.log(
          `Failed to start watcher for ${pkg.name}: ${error.message}`,
          'error'
        );
      });

      // Give the watcher a moment to start
      setTimeout(() => {
        this.log(`Started watcher for ${pkg.name}`, 'success');
        resolve();
      }, 1000);
    });
  }

  /**
   * Stop all watchers
   */
  stopAllWatchers() {
    this.log('Stopping all watchers...', 'info');

    for (const [name, process] of this.runningProcesses) {
      if (name.endsWith('-watch')) {
        this.log(`Stopping watcher ${name}...`, 'info');
        process.kill('SIGTERM');
      }
    }

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }

  /**
   * Run development environment health check
   */
  async healthCheck() {
    this.log('Running development environment health check...', 'info');

    const checks = [];

    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const requiredNode = '18.0.0';
      const satisfies = require('semver').gte(nodeVersion, requiredNode);
      checks.push({
        name: 'Node.js version',
        status: satisfies ? 'pass' : 'fail',
        details: `${nodeVersion} (required: >= ${requiredNode})`,
      });
    } catch (error) {
      checks.push({
        name: 'Node.js version',
        status: 'fail',
        details: error.message,
      });
    }

    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      checks.push({
        name: 'npm version',
        status: 'pass',
        details: npmVersion,
      });
    } catch (error) {
      checks.push({
        name: 'npm version',
        status: 'fail',
        details: 'npm not found',
      });
    }

    // Check if packages are built
    for (const pkg of this.packages.values()) {
      if (pkg.type === 'package') {
        const distPath = path.join(pkg.path, 'dist');
        const hasBuilt = fs.existsSync(distPath);
        checks.push({
          name: `${pkg.name} built`,
          status: hasBuilt ? 'pass' : 'warning',
          details: hasBuilt
            ? 'dist/ exists'
            : 'dist/ not found (run npm run build)',
        });
      }
    }

    // Check for common dev tools
    const devTools = ['git', 'code'];
    for (const tool of devTools) {
      try {
        execSync(`${tool} --version`, { stdio: 'pipe' });
        checks.push({
          name: tool,
          status: 'pass',
          details: 'available',
        });
      } catch (error) {
        checks.push({
          name: tool,
          status: 'info',
          details: 'not found (optional)',
        });
      }
    }

    // Print results
    console.log(
      `\n${colors.bold}${colors.cyan}🏥 Development Environment Health Check${colors.reset}`
    );
    console.log('='.repeat(60));

    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (const check of checks) {
      let statusColor = colors.green;
      let statusIcon = '✅';

      if (check.status === 'fail') {
        statusColor = colors.red;
        statusIcon = '❌';
        failCount++;
      } else if (check.status === 'warning') {
        statusColor = colors.yellow;
        statusIcon = '⚠️';
        warningCount++;
      } else if (check.status === 'info') {
        statusColor = colors.blue;
        statusIcon = 'ℹ️';
      } else {
        passCount++;
      }

      console.log(
        `${statusIcon} ${statusColor}${check.name}${colors.reset}: ${check.details}`
      );
    }

    console.log(
      `\n${colors.bold}Summary:${colors.reset} ${colors.green}${passCount} passed${colors.reset}, ${colors.yellow}${warningCount} warnings${colors.reset}, ${colors.red}${failCount} failed${colors.reset}`
    );

    if (failCount > 0) {
      console.log(
        `\n${colors.red}Some critical checks failed. Please address these issues before development.${colors.reset}`
      );
    } else if (warningCount > 0) {
      console.log(
        `\n${colors.yellow}Some optional checks have warnings. Development should work but might be improved.${colors.reset}`
      );
    } else {
      console.log(
        `\n${colors.green}All checks passed! Your development environment is ready.${colors.reset}`
      );
    }

    return { checks, passCount, failCount, warningCount };
  }

  /**
   * Print development workflow status
   */
  printStatus() {
    console.log(
      `${colors.bold}${colors.cyan}📊 Development Workflow Status${colors.reset}`
    );
    console.log('='.repeat(60));

    // Package overview
    console.log(`\n${colors.bold}📦 Package Overview${colors.reset}`);
    const packageTypes = Array.from(this.packages.values()).reduce(
      (acc, pkg) => {
        acc[pkg.type] = (acc[pkg.type] || 0) + 1;
        return acc;
      },
      {}
    );

    for (const [type, count] of Object.entries(packageTypes)) {
      console.log(`  ${type}: ${count}`);
    }

    // Development scripts
    console.log(`\n${colors.bold}🔧 Development Scripts${colors.reset}`);
    const scriptCounts = {
      dev: 0,
      watch: 0,
      start: 0,
      test: 0,
    };

    for (const pkg of this.packages.values()) {
      const scripts = pkg.packageJson.scripts || {};
      if (scripts.dev) scriptCounts.dev++;
      if (scripts.watch) scriptCounts.watch++;
      if (scripts.start) scriptCounts.start++;
      if (scripts.test) scriptCounts.test++;
    }

    for (const [script, count] of Object.entries(scriptCounts)) {
      console.log(`  ${script}: ${count} packages`);
    }

    // Running processes
    console.log(`\n${colors.bold}🏃 Running Processes${colors.reset}`);
    if (this.runningProcesses.size === 0) {
      console.log('  No development processes running');
    } else {
      for (const name of this.runningProcesses.keys()) {
        console.log(`  ${name}: running`);
      }
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  const manager = new DevWorkflowManager(options);

  try {
    switch (command) {
      case 'start':
        const packagesForStart = args
          .slice(1)
          .filter(arg => !arg.startsWith('--'));
        await manager.startDevServers(packagesForStart);
        break;

      case 'watch':
        const packagesForWatch = args
          .slice(1)
          .filter(arg => !arg.startsWith('--'));
        await manager.watchAndRebuild(packagesForWatch);
        break;

      case 'link':
        await manager.linkPackages();
        break;

      case 'unlink':
        await manager.unlinkPackages();
        break;

      case 'health':
        await manager.healthCheck();
        break;

      case 'status':
        manager.printStatus();
        break;

      default:
        console.log(
          `${colors.bold}AI Spine Tools Development Workflow Manager${colors.reset}`
        );
        console.log('');
        console.log(
          'Usage: node scripts/dev-workflow.js <command> [packages...] [options]'
        );
        console.log('');
        console.log('Commands:');
        console.log(
          '  start [pkg...]    Start development servers for packages'
        );
        console.log(
          '  watch [pkg...]    Watch and rebuild packages on changes'
        );
        console.log('  link              Link packages for local development');
        console.log('  unlink            Unlink all packages');
        console.log(
          '  health            Run development environment health check'
        );
        console.log(
          '  status            Show current development workflow status'
        );
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v     Show detailed output');
        console.log('');
        console.log('Examples:');
        console.log(
          '  node scripts/dev-workflow.js start                    # Start all dev servers'
        );
        console.log(
          '  node scripts/dev-workflow.js start @ai-spine/tools    # Start specific package'
        );
        console.log(
          '  node scripts/dev-workflow.js watch                    # Watch all packages'
        );
        console.log(
          '  node scripts/dev-workflow.js link                     # Link packages locally'
        );
        break;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DevWorkflowManager };
