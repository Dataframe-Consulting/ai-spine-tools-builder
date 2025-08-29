#!/usr/bin/env node

/**
 * Release Automation Script
 * Comprehensive automation for npm registry publishing, CI/CD integration, and deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Release automation manager
 */
class ReleaseAutomation {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.registry = options.registry || 'https://registry.npmjs.org/';
    this.rootDir = path.resolve(__dirname, '..');
    this.packagesDir = path.join(this.rootDir, 'packages');
    
    this.packages = this.discoverPackages();
    this.dependencyGraph = this.buildDependencyGraph();
    this.publishOrder = this.getPublishOrder();
  }

  log(message, level = 'info') {
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✅${colors.reset}`,
      warning: `${colors.yellow}⚠️${colors.reset}`,
      error: `${colors.red}❌${colors.reset}`,
      debug: `${colors.cyan}🔍${colors.reset}`
    };

    if (this.verbose || level !== 'debug') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${prefix[level]} ${message}`);
    }
  }

  /**
   * Discover all packages
   */
  discoverPackages() {
    const packages = new Map();
    const packageDirs = fs.readdirSync(this.packagesDir).filter(dir => 
      fs.statSync(path.join(this.packagesDir, dir)).isDirectory()
    );
    
    for (const dir of packageDirs) {
      const packagePath = path.join(this.packagesDir, dir);
      const packageJsonPath = path.join(packagePath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packages.set(packageJson.name || dir, {
          name: packageJson.name || dir,
          path: packagePath,
          packageJson,
          directory: dir
        });
      }
    }

    return packages;
  }

  /**
   * Build dependency graph for publishing order
   */
  buildDependencyGraph() {
    const graph = new Map();
    
    for (const [name, pkg] of this.packages) {
      const deps = {
        ...pkg.packageJson.dependencies,
        ...pkg.packageJson.devDependencies,
        ...pkg.packageJson.peerDependencies
      };
      
      const internalDeps = [];
      for (const depName of Object.keys(deps)) {
        if (this.packages.has(depName)) {
          internalDeps.push(depName);
        }
      }
      
      graph.set(name, {
        ...pkg,
        internalDependencies: internalDeps
      });
    }

    return graph;
  }

  /**
   * Get packages in topological order for publishing
   */
  getPublishOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving ${name}`);
      }

      visiting.add(name);
      
      const pkg = this.dependencyGraph.get(name);
      if (pkg) {
        for (const dep of pkg.internalDependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.dependencyGraph.keys()) {
      visit(name);
    }

    return order;
  }

  /**
   * Check npm authentication
   */
  async checkNpmAuth() {
    try {
      const user = execSync('npm whoami', { encoding: 'utf8', stdio: 'pipe' }).trim();
      this.log(`Authenticated as npm user: ${user}`, 'success');
      return user;
    } catch (error) {
      throw new Error('Not logged in to npm. Run: npm login');
    }
  }

  /**
   * Check if package version exists on registry
   */
  async checkPackageVersion(packageName, version) {
    try {
      const result = execSync(`npm view ${packageName}@${version} version`, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      }).trim();
      
      return result === version;
    } catch (error) {
      // Package version doesn't exist
      return false;
    }
  }

  /**
   * Run pre-publish checks
   */
  async runPrePublishChecks() {
    this.log('Running pre-publish checks...', 'info');
    
    const checks = [
      {
        name: 'npm authentication',
        check: () => this.checkNpmAuth()
      },
      {
        name: 'packages built',
        check: () => this.checkPackagesBuilt()
      },
      {
        name: 'tests passing',
        check: () => this.runTests()
      },
      {
        name: 'no uncommitted changes',
        check: () => this.checkGitStatus()
      },
      {
        name: 'version consistency',
        check: () => this.checkVersionConsistency()
      }
    ];

    const results = [];
    
    for (const check of checks) {
      try {
        this.log(`Checking ${check.name}...`, 'debug');
        const result = await check.check();
        results.push({ name: check.name, passed: true, result });
        this.log(`✅ ${check.name}`, 'success');
      } catch (error) {
        results.push({ name: check.name, passed: false, error: error.message });
        
        if (this.force) {
          this.log(`⚠️  ${check.name}: ${error.message} (forced continue)`, 'warning');
        } else {
          this.log(`❌ ${check.name}: ${error.message}`, 'error');
        }
      }
    }

    const allPassed = results.every(r => r.passed);
    
    if (!allPassed && !this.force) {
      throw new Error('Pre-publish checks failed. Use --force to override or fix the issues.');
    }

    return results;
  }

  /**
   * Check if all packages are built
   */
  checkPackagesBuilt() {
    for (const [name, pkg] of this.packages) {
      const distPath = path.join(pkg.path, 'dist');
      if (!fs.existsSync(distPath)) {
        throw new Error(`Package ${name} not built. Run: npm run build`);
      }
    }
    
    return true;
  }

  /**
   * Run tests
   */
  runTests() {
    if (this.dryRun) {
      this.log('[DRY RUN] Would run tests', 'debug');
      return true;
    }

    try {
      execSync('npm test', { stdio: 'pipe' });
      return true;
    } catch (error) {
      throw new Error('Tests failed');
    }
  }

  /**
   * Check git status
   */
  checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim() !== '') {
        throw new Error('Uncommitted changes detected');
      }
      return true;
    } catch (error) {
      throw new Error('Git status check failed');
    }
  }

  /**
   * Check version consistency
   */
  checkVersionConsistency() {
    const rootVersion = require(path.join(this.rootDir, 'package.json')).version;
    
    for (const [name, pkg] of this.packages) {
      if (pkg.packageJson.version !== rootVersion) {
        throw new Error(`Version mismatch: ${name} is ${pkg.packageJson.version}, root is ${rootVersion}`);
      }
    }

    return true;
  }

  /**
   * Publish all packages
   */
  async publishPackages() {
    this.log('Publishing packages in dependency order...', 'info');
    
    const results = [];
    let publishedCount = 0;
    let skippedCount = 0;

    for (const packageName of this.publishOrder) {
      const pkg = this.dependencyGraph.get(packageName);
      if (!pkg) continue;

      try {
        this.log(`Publishing ${packageName}...`, 'info');
        
        // Check if version already exists
        const exists = await this.checkPackageVersion(packageName, pkg.packageJson.version);
        
        if (exists && !this.force) {
          this.log(`Skipping ${packageName}@${pkg.packageJson.version} (already exists)`, 'warning');
          skippedCount++;
          results.push({ package: packageName, status: 'skipped', reason: 'version exists' });
          continue;
        }

        const result = await this.publishPackage(pkg);
        results.push({ package: packageName, status: 'success', result });
        publishedCount++;
        
        this.log(`Published ${packageName}@${pkg.packageJson.version}`, 'success');
        
        // Wait a bit between publishes to avoid rate limiting
        if (publishedCount > 0) {
          await this.delay(2000);
        }

      } catch (error) {
        this.log(`Failed to publish ${packageName}: ${error.message}`, 'error');
        results.push({ package: packageName, status: 'failed', error: error.message });
        
        if (!this.force) {
          throw error;
        }
      }
    }

    this.log(`Publishing completed: ${publishedCount} published, ${skippedCount} skipped`, 'success');
    return results;
  }

  /**
   * Publish a single package
   */
  async publishPackage(pkg) {
    if (this.dryRun) {
      this.log(`[DRY RUN] Would publish ${pkg.name}`, 'debug');
      return { dryRun: true };
    }

    return new Promise((resolve, reject) => {
      const publishCommand = [
        'npm', 'publish',
        '--access', 'public',
        '--registry', this.registry
      ];

      const child = exec(publishCommand.join(' '), {
        cwd: pkg.path,
        encoding: 'utf8'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data;
        if (this.verbose) {
          console.log(`[${pkg.name}] ${data}`);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data;
        if (this.verbose) {
          console.error(`[${pkg.name}] ${data}`);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Publish failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Verify published packages
   */
  async verifyPublishedPackages() {
    this.log('Verifying published packages...', 'info');
    
    const results = [];
    
    for (const packageName of this.publishOrder) {
      const pkg = this.dependencyGraph.get(packageName);
      if (!pkg) continue;

      try {
        // Check if package exists on registry
        const exists = await this.checkPackageVersion(packageName, pkg.packageJson.version);
        
        if (exists) {
          // Try to install and verify
          const tempDir = path.join(require('os').tmpdir(), `verify-${packageName}-${Date.now()}`);
          fs.mkdirSync(tempDir, { recursive: true });
          
          try {
            execSync(`npm install ${packageName}@${pkg.packageJson.version}`, {
              cwd: tempDir,
              stdio: 'pipe'
            });
            
            this.log(`Verified ${packageName}@${pkg.packageJson.version}`, 'success');
            results.push({ package: packageName, status: 'verified' });
          } finally {
            // Cleanup
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } else {
          results.push({ package: packageName, status: 'not-found' });
        }
      } catch (error) {
        this.log(`Verification failed for ${packageName}: ${error.message}`, 'error');
        results.push({ package: packageName, status: 'error', error: error.message });
      }
    }

    return results;
  }

  /**
   * Create GitHub release
   */
  async createGitHubRelease() {
    this.log('Creating GitHub release...', 'info');
    
    const rootPackage = require(path.join(this.rootDir, 'package.json'));
    const version = rootPackage.version;
    const tagName = `v${version}`;

    try {
      // Check if gh CLI is available
      execSync('gh --version', { stdio: 'pipe' });
      
      if (this.dryRun) {
        this.log(`[DRY RUN] Would create GitHub release ${tagName}`, 'debug');
        return { dryRun: true };
      }

      // Generate release notes
      const releaseNotes = this.generateReleaseNotes();
      
      const releaseCommand = [
        'gh', 'release', 'create', tagName,
        '--title', `Release ${version}`,
        '--notes', `"${releaseNotes}"`
      ];

      execSync(releaseCommand.join(' '), { stdio: 'pipe' });
      
      this.log(`Created GitHub release: ${tagName}`, 'success');
      return { tag: tagName, notes: releaseNotes };
      
    } catch (error) {
      if (error.message.includes('gh: command not found')) {
        this.log('GitHub CLI not found, skipping GitHub release', 'warning');
        return { skipped: true, reason: 'gh CLI not available' };
      }
      
      throw error;
    }
  }

  /**
   * Generate release notes
   */
  generateReleaseNotes() {
    const rootPackage = require(path.join(this.rootDir, 'package.json'));
    const version = rootPackage.version;
    
    let notes = `# AI Spine Tools SDK v${version}\n\n`;
    
    // Add package versions
    notes += '## Published Packages\n\n';
    for (const packageName of this.publishOrder) {
      const pkg = this.dependencyGraph.get(packageName);
      if (pkg) {
        notes += `- \`${packageName}@${pkg.packageJson.version}\`\n`;
      }
    }
    
    notes += '\n## Installation\n\n';
    notes += '```bash\n';
    notes += 'npm install @ai-spine/tools\n';
    notes += 'npm install -g create-ai-spine-tool\n';
    notes += '```\n\n';
    
    notes += '## What\'s Changed\n\n';
    notes += 'See [CHANGELOG.md](CHANGELOG.md) for detailed changes.\n';
    
    return notes;
  }

  /**
   * Update package registry information
   */
  async updateRegistryInfo() {
    this.log('Updating registry information...', 'info');
    
    // This could include updating package tags, descriptions, etc.
    const updates = [];
    
    for (const packageName of this.publishOrder) {
      const pkg = this.dependencyGraph.get(packageName);
      if (!pkg) continue;

      try {
        if (this.dryRun) {
          this.log(`[DRY RUN] Would update registry info for ${packageName}`, 'debug');
          continue;
        }

        // Add latest tag
        execSync(`npm dist-tag add ${packageName}@${pkg.packageJson.version} latest`, {
          stdio: 'pipe'
        });
        
        updates.push({ package: packageName, action: 'tagged-latest' });
        
      } catch (error) {
        this.log(`Failed to update registry info for ${packageName}: ${error.message}`, 'warning');
      }
    }

    return updates;
  }

  /**
   * Send notifications
   */
  async sendNotifications(results) {
    this.log('Sending notifications...', 'info');
    
    // This could integrate with Slack, Discord, email, etc.
    const notifications = [];
    
    // For now, just log the results
    console.log(`\n${colors.bold}${colors.cyan}📢 Release Notification${colors.reset}`);
    console.log('=' .repeat(60));
    
    const published = results.filter(r => r.status === 'success');
    const skipped = results.filter(r => r.status === 'skipped');
    const failed = results.filter(r => r.status === 'failed');
    
    console.log(`Published: ${published.length} packages`);
    console.log(`Skipped: ${skipped.length} packages`);
    console.log(`Failed: ${failed.length} packages`);
    
    if (published.length > 0) {
      console.log('\nPublished packages:');
      for (const { package: pkg } of published) {
        const packageInfo = this.dependencyGraph.get(pkg);
        console.log(`  • ${pkg}@${packageInfo.packageJson.version}`);
      }
    }
    
    notifications.push({ type: 'console', published, skipped, failed });
    
    return notifications;
  }

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Full automated release process
   */
  async performFullRelease() {
    try {
      this.log('Starting automated release process...', 'info');
      
      // Pre-publish checks
      const checkResults = await this.runPrePublishChecks();
      
      // Publish packages
      const publishResults = await this.publishPackages();
      
      // Verify published packages
      const verifyResults = await this.verifyPublishedPackages();
      
      // Update registry info
      const registryUpdates = await this.updateRegistryInfo();
      
      // Create GitHub release
      const githubRelease = await this.createGitHubRelease();
      
      // Send notifications
      const notifications = await this.sendNotifications(publishResults);
      
      this.log('🎉 Automated release process completed successfully!', 'success');
      
      return {
        checks: checkResults,
        publishing: publishResults,
        verification: verifyResults,
        registry: registryUpdates,
        github: githubRelease,
        notifications
      };
      
    } catch (error) {
      this.log(`Automated release failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Print release status
   */
  printStatus() {
    console.log(`${colors.bold}${colors.cyan}🚀 Release Automation Status${colors.reset}`);
    console.log('=' .repeat(60));
    
    console.log(`\n${colors.bold}📦 Packages to Publish${colors.reset}`);
    for (const packageName of this.publishOrder) {
      const pkg = this.dependencyGraph.get(packageName);
      if (pkg) {
        console.log(`  ${pkg.name}@${pkg.packageJson.version}`);
      }
    }
    
    console.log(`\n${colors.bold}🔗 Publish Order${colors.reset}`);
    console.log(`  ${this.publishOrder.join(' → ')}`);
    
    console.log(`\n${colors.bold}⚙️  Configuration${colors.reset}`);
    console.log(`  Registry: ${this.registry}`);
    console.log(`  Dry run: ${this.dryRun ? 'Yes' : 'No'}`);
    console.log(`  Force: ${this.force ? 'Yes' : 'No'}`);
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
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    force: args.includes('--force') || args.includes('-f'),
    registry: (() => {
      const regIndex = args.findIndex(arg => arg === '--registry');
      return regIndex !== -1 && args[regIndex + 1] ? args[regIndex + 1] : undefined;
    })()
  };

  const automation = new ReleaseAutomation(options);

  try {
    switch (command) {
      case 'publish':
        await automation.runPrePublishChecks();
        await automation.publishPackages();
        break;

      case 'verify':
        await automation.verifyPublishedPackages();
        break;

      case 'release':
        await automation.performFullRelease();
        break;

      case 'status':
        automation.printStatus();
        break;

      case 'github':
        await automation.createGitHubRelease();
        break;

      default:
        console.log(`${colors.bold}AI Spine Tools Release Automation${colors.reset}`);
        console.log('');
        console.log('Usage: node scripts/release-automation.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  publish       Publish packages to npm registry');
        console.log('  verify        Verify published packages');
        console.log('  release       Run full automated release process');
        console.log('  github        Create GitHub release');
        console.log('  status        Show release automation status');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v     Show detailed output');
        console.log('  --dry-run, -d     Show what would be done without executing');
        console.log('  --force, -f       Force publish even if checks fail');
        console.log('  --registry URL    Use custom npm registry');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/release-automation.js publish           # Publish all packages');
        console.log('  node scripts/release-automation.js release           # Full release process');
        console.log('  node scripts/release-automation.js publish --dry-run # Test publish');
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

module.exports = { ReleaseAutomation };