#!/usr/bin/env node

/**
 * Monorepo Management Script
 * Comprehensive tool for managing workspace dependencies, builds, and releases
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const semver = require('semver');

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
 * Comprehensive monorepo manager
 */
class MonorepoManager {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.rootDir = path.resolve(__dirname, '..');
    this.packagesDir = path.join(this.rootDir, 'packages');
    this.examplesDir = path.join(this.rootDir, 'examples');
    this.scriptsDir = path.join(this.rootDir, 'scripts');
    
    this.packages = this.discoverPackages();
    this.dependencyGraph = this.buildDependencyGraph();
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
      console.log(`${prefix[level]} ${message}`);
    }
  }

  /**
   * Discover all packages in the monorepo
   */
  discoverPackages() {
    const packages = new Map();
    
    // Discover packages
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
          type: 'package'
        });
      }
    }

    // Discover examples if they exist
    if (fs.existsSync(this.examplesDir)) {
      const exampleDirs = fs.readdirSync(this.examplesDir).filter(dir => 
        fs.statSync(path.join(this.examplesDir, dir)).isDirectory()
      );
      
      for (const dir of exampleDirs) {
        const examplePath = path.join(this.examplesDir, dir);
        const packageJsonPath = path.join(examplePath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          packages.set(packageJson.name || dir, {
            name: packageJson.name || dir,
            path: examplePath,
            packageJson,
            type: 'example'
          });
        }
      }
    }

    this.log(`Discovered ${packages.size} packages`, 'debug');
    return packages;
  }

  /**
   * Build dependency graph for proper build ordering
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
        internalDependencies: internalDeps,
        dependents: []
      });
    }

    // Build reverse dependencies
    for (const [name, pkg] of graph) {
      for (const dep of pkg.internalDependencies) {
        if (graph.has(dep)) {
          graph.get(dep).dependents.push(name);
        }
      }
    }

    return graph;
  }

  /**
   * Get packages in topological order (dependencies first)
   */
  getTopologicalOrder() {
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
   * Synchronize dependency versions across packages
   */
  async syncDependencyVersions() {
    this.log('Synchronizing dependency versions across packages...', 'info');
    
    const updates = new Map();
    const externalDeps = new Map();
    
    // Collect all external dependencies and their versions
    for (const [name, pkg] of this.dependencyGraph) {
      const allDeps = {
        ...pkg.packageJson.dependencies,
        ...pkg.packageJson.devDependencies
      };
      
      for (const [depName, version] of Object.entries(allDeps)) {
        if (!this.packages.has(depName)) { // External dependency
          if (!externalDeps.has(depName)) {
            externalDeps.set(depName, new Map());
          }
          const versionMap = externalDeps.get(depName);
          if (!versionMap.has(version)) {
            versionMap.set(version, []);
          }
          versionMap.get(version).push(name);
        }
      }
    }

    // Find version conflicts and suggest resolutions
    const conflicts = [];
    for (const [depName, versionMap] of externalDeps) {
      if (versionMap.size > 1) {
        const versions = Array.from(versionMap.keys());
        
        // Try to find a compatible version
        const latestVersion = versions.reduce((latest, current) => {
          try {
            return semver.gt(semver.coerce(current) || current, semver.coerce(latest) || latest) ? current : latest;
          } catch {
            return latest;
          }
        });

        conflicts.push({
          dependency: depName,
          versions: Array.from(versionMap.entries()),
          suggested: latestVersion
        });
      }
    }

    // Report conflicts
    if (conflicts.length > 0) {
      this.log(`Found ${conflicts.length} version conflicts:`, 'warning');
      for (const conflict of conflicts) {
        this.log(`  ${conflict.dependency}:`, 'warning');
        for (const [version, packages] of conflict.versions) {
          this.log(`    ${version} used by: ${packages.join(', ')}`, 'warning');
        }
        this.log(`    Suggested: ${conflict.suggested}`, 'info');
      }
    }

    // Sync external dependencies to resolve conflicts
    const externalUpdates = new Map();
    
    for (const conflict of conflicts) {
      const { dependency, versions, suggested } = conflict;
      
      // For each package using an older version, update to the suggested version
      for (const [version, packages] of versions) {
        if (version !== suggested) {
          for (const packageName of packages) {
            if (!externalUpdates.has(packageName)) {
              externalUpdates.set(packageName, []);
            }
            externalUpdates.get(packageName).push({
              dependency,
              oldVersion: version,
              newVersion: suggested
            });
          }
        }
      }
    }

    // Apply external dependency updates
    for (const [packageName, updates] of externalUpdates) {
      const pkg = this.dependencyGraph.get(packageName);
      if (!pkg) continue;

      let updated = false;
      const packageJsonPath = path.join(pkg.path, 'package.json');
      const packageJson = { ...pkg.packageJson };

      for (const update of updates) {
        // Check both dependencies and devDependencies
        for (const depType of ['dependencies', 'devDependencies']) {
          if (packageJson[depType] && packageJson[depType][update.dependency]) {
            if (packageJson[depType][update.dependency] === update.oldVersion) {
              this.log(`Updating ${packageName}: ${update.dependency} ${update.oldVersion} → ${update.newVersion}`, 'info');
              packageJson[depType][update.dependency] = update.newVersion;
              updated = true;
            }
          }
        }
      }

      // Write updated package.json
      if (updated && !this.dryRun) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        this.log(`Updated ${packageName} external dependencies`, 'success');
      }
    }

    // Sync internal dependencies
    const currentVersion = require(path.join(this.rootDir, 'package.json')).version;
    
    for (const [name, pkg] of this.dependencyGraph) {
      let updated = false;
      const packageJsonPath = path.join(pkg.path, 'package.json');
      const packageJson = { ...pkg.packageJson };

      // Update internal dependencies
      for (const depType of ['dependencies', 'devDependencies']) {
        if (packageJson[depType]) {
          for (const depName of Object.keys(packageJson[depType])) {
            if (this.packages.has(depName)) {
              const expectedVersion = `^${currentVersion}`;
              if (packageJson[depType][depName] !== expectedVersion) {
                this.log(`Updating ${name}: ${depName} ${packageJson[depType][depName]} → ${expectedVersion}`, 'info');
                packageJson[depType][depName] = expectedVersion;
                updated = true;
              }
            }
          }
        }
      }

      // Write updated package.json
      if (updated && !this.dryRun) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        this.log(`Updated ${name} dependencies`, 'success');
      }
    }

    const totalUpdates = externalUpdates.size;
    this.log(`Dependency sync completed: ${totalUpdates} packages updated`, 'success');

    return conflicts;
  }

  /**
   * Build all packages in dependency order
   */
  async buildPackages(parallel = true) {
    this.log('Building packages in dependency order...', 'info');
    
    const order = this.getTopologicalOrder();
    const results = new Map();

    if (parallel) {
      // Build packages that don't depend on each other in parallel
      const levels = this.getBuildLevels();
      
      for (let level = 0; level < levels.length; level++) {
        this.log(`Building level ${level + 1}/${levels.length}: ${levels[level].join(', ')}`, 'info');
        
        const promises = levels[level].map(async (pkgName) => {
          const pkg = this.dependencyGraph.get(pkgName);
          if (!pkg) return null;

          try {
            const startTime = Date.now();
            await this.buildPackage(pkg);
            const duration = Date.now() - startTime;
            
            results.set(pkgName, {
              success: true,
              duration,
              level
            });
            
            this.log(`Built ${pkgName} in ${duration}ms`, 'success');
            return { name: pkgName, success: true, duration };
          } catch (error) {
            results.set(pkgName, {
              success: false,
              error: error.message,
              level
            });
            
            this.log(`Failed to build ${pkgName}: ${error.message}`, 'error');
            return { name: pkgName, success: false, error: error.message };
          }
        });

        const levelResults = await Promise.all(promises);
        
        // Check if any builds failed at this level
        const failed = levelResults.filter(r => r && !r.success);
        if (failed.length > 0) {
          this.log(`${failed.length} packages failed to build at level ${level + 1}`, 'error');
          // Continue with remaining levels but mark as having failures
        }
      }
    } else {
      // Sequential build
      for (const pkgName of order) {
        const pkg = this.dependencyGraph.get(pkgName);
        if (!pkg) continue;

        try {
          const startTime = Date.now();
          await this.buildPackage(pkg);
          const duration = Date.now() - startTime;
          
          results.set(pkgName, { success: true, duration });
          this.log(`Built ${pkgName} in ${duration}ms`, 'success');
        } catch (error) {
          results.set(pkgName, { success: false, error: error.message });
          this.log(`Failed to build ${pkgName}: ${error.message}`, 'error');
          break; // Stop on first failure in sequential mode
        }
      }
    }

    return results;
  }

  /**
   * Get build levels for parallel building
   */
  getBuildLevels() {
    const levels = [];
    const processed = new Set();
    
    while (processed.size < this.dependencyGraph.size) {
      const currentLevel = [];
      
      for (const [name, pkg] of this.dependencyGraph) {
        if (processed.has(name)) continue;
        
        // Check if all dependencies are already processed
        const depsReady = pkg.internalDependencies.every(dep => processed.has(dep));
        
        if (depsReady) {
          currentLevel.push(name);
        }
      }
      
      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected');
      }
      
      for (const name of currentLevel) {
        processed.add(name);
      }
      
      levels.push(currentLevel);
    }
    
    return levels;
  }

  /**
   * Build a single package
   */
  async buildPackage(pkg) {
    return new Promise((resolve, reject) => {
      if (this.dryRun) {
        this.log(`[DRY RUN] Would build ${pkg.name}`, 'debug');
        return resolve();
      }

      const buildScript = pkg.packageJson.scripts?.build;
      if (!buildScript) {
        this.log(`No build script found for ${pkg.name}, skipping`, 'warning');
        return resolve();
      }

      const child = spawn('npm', ['run', 'build'], {
        cwd: pkg.path,
        stdio: this.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data;
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data;
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}. ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run tests across all packages
   */
  async runTests(parallel = true) {
    this.log('Running tests across all packages...', 'info');
    
    const results = new Map();
    const packagesWithTests = Array.from(this.dependencyGraph.values())
      .filter(pkg => pkg.packageJson.scripts?.test);

    if (packagesWithTests.length === 0) {
      this.log('No packages with test scripts found', 'warning');
      return results;
    }

    const runTest = async (pkg) => {
      try {
        const startTime = Date.now();
        await this.runPackageTests(pkg);
        const duration = Date.now() - startTime;
        
        results.set(pkg.name, {
          success: true,
          duration
        });
        
        this.log(`Tests passed for ${pkg.name} in ${duration}ms`, 'success');
        return { name: pkg.name, success: true, duration };
      } catch (error) {
        results.set(pkg.name, {
          success: false,
          error: error.message
        });
        
        this.log(`Tests failed for ${pkg.name}: ${error.message}`, 'error');
        return { name: pkg.name, success: false, error: error.message };
      }
    };

    if (parallel) {
      const promises = packagesWithTests.map(runTest);
      await Promise.all(promises);
    } else {
      for (const pkg of packagesWithTests) {
        await runTest(pkg);
      }
    }

    return results;
  }

  /**
   * Run tests for a single package
   */
  async runPackageTests(pkg) {
    return new Promise((resolve, reject) => {
      if (this.dryRun) {
        this.log(`[DRY RUN] Would run tests for ${pkg.name}`, 'debug');
        return resolve();
      }

      const child = spawn('npm', ['test'], {
        cwd: pkg.path,
        stdio: this.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data;
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data;
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with code ${code}. ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Update version across all packages
   */
  async updateVersion(newVersion, updateDependencies = true) {
    this.log(`Updating version to ${newVersion}...`, 'info');
    
    const rootPackageJsonPath = path.join(this.rootDir, 'package.json');
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    
    // Update root package.json
    if (!this.dryRun) {
      rootPackageJson.version = newVersion;
      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
    }
    
    this.log(`Updated root package version to ${newVersion}`, 'success');

    // Update all package versions
    for (const [name, pkg] of this.dependencyGraph) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      const packageJson = { ...pkg.packageJson };
      
      packageJson.version = newVersion;
      
      // Update internal dependencies if requested
      if (updateDependencies) {
        for (const depType of ['dependencies', 'devDependencies']) {
          if (packageJson[depType]) {
            for (const depName of Object.keys(packageJson[depType])) {
              if (this.packages.has(depName)) {
                packageJson[depType][depName] = `^${newVersion}`;
              }
            }
          }
        }
      }
      
      if (!this.dryRun) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      }
      
      this.log(`Updated ${name} version to ${newVersion}`, 'success');
    }
  }

  /**
   * Generate monorepo health report
   */
  generateHealthReport() {
    const report = {
      packages: this.packages.size,
      dependencies: {
        internal: 0,
        external: new Set(),
        conflicts: []
      },
      buildOrder: this.getTopologicalOrder(),
      coverage: {
        withTests: 0,
        withBuild: 0,
        withLint: 0
      }
    };

    // Analyze dependencies and scripts
    for (const [name, pkg] of this.dependencyGraph) {
      report.dependencies.internal += pkg.internalDependencies.length;
      
      const allDeps = {
        ...pkg.packageJson.dependencies,
        ...pkg.packageJson.devDependencies
      };
      
      for (const dep of Object.keys(allDeps)) {
        if (!this.packages.has(dep)) {
          report.dependencies.external.add(dep);
        }
      }

      // Check script coverage
      const scripts = pkg.packageJson.scripts || {};
      if (scripts.test) report.coverage.withTests++;
      if (scripts.build) report.coverage.withBuild++;
      if (scripts.lint) report.coverage.withLint++;
    }

    report.dependencies.external = report.dependencies.external.size;

    return report;
  }

  /**
   * Print comprehensive status report
   */
  printStatusReport() {
    console.log(`${colors.bold}${colors.cyan}📊 Monorepo Health Report${colors.reset}`);
    console.log('=' .repeat(60));

    const health = this.generateHealthReport();

    // Package overview
    console.log(`\n${colors.bold}📦 Package Overview${colors.reset}`);
    console.log(`Total packages: ${health.packages}`);
    console.log(`Internal dependencies: ${health.dependencies.internal}`);
    console.log(`External dependencies: ${health.dependencies.external}`);

    // Build order
    console.log(`\n${colors.bold}🔧 Build Order${colors.reset}`);
    const levels = this.getBuildLevels();
    for (let i = 0; i < levels.length; i++) {
      console.log(`Level ${i + 1}: ${levels[i].join(', ')}`);
    }

    // Script coverage
    console.log(`\n${colors.bold}📋 Script Coverage${colors.reset}`);
    console.log(`Packages with tests: ${health.coverage.withTests}/${health.packages}`);
    console.log(`Packages with build: ${health.coverage.withBuild}/${health.packages}`);
    console.log(`Packages with lint: ${health.coverage.withLint}/${health.packages}`);

    // Package details
    console.log(`\n${colors.bold}📝 Package Details${colors.reset}`);
    for (const [name, pkg] of this.dependencyGraph) {
      const deps = pkg.internalDependencies.length;
      const dependents = pkg.dependents.length;
      const scripts = Object.keys(pkg.packageJson.scripts || {}).length;
      
      console.log(`${name}:`);
      console.log(`  Dependencies: ${deps}, Dependents: ${dependents}, Scripts: ${scripts}`);
      console.log(`  Type: ${pkg.type}, Path: ${path.relative(this.rootDir, pkg.path)}`);
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
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    parallel: !args.includes('--sequential')
  };

  const manager = new MonorepoManager(options);

  try {
    switch (command) {
      case 'status':
        manager.printStatusReport();
        break;

      case 'sync-deps':
        await manager.syncDependencyVersions();
        break;

      case 'build':
        await manager.buildPackages(options.parallel);
        break;

      case 'test':
        await manager.runTests(options.parallel);
        break;

      case 'version':
        const newVersion = args[1];
        if (!newVersion) {
          console.error('Please provide a version: npm run monorepo version 1.2.3');
          process.exit(1);
        }
        await manager.updateVersion(newVersion);
        break;

      case 'health':
        const health = manager.generateHealthReport();
        console.log(JSON.stringify(health, null, 2));
        break;

      default:
        console.log(`${colors.bold}AI Spine Tools Monorepo Manager${colors.reset}`);
        console.log('');
        console.log('Usage: node scripts/monorepo-manager.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  status      Show monorepo status and package overview');
        console.log('  sync-deps   Synchronize dependency versions across packages');
        console.log('  build       Build all packages in dependency order');
        console.log('  test        Run tests across all packages');
        console.log('  version     Update version across all packages');
        console.log('  health      Generate health report (JSON format)');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v     Show detailed output');
        console.log('  --dry-run, -d     Show what would be done without executing');
        console.log('  --sequential      Build/test sequentially instead of parallel');
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

module.exports = { MonorepoManager };