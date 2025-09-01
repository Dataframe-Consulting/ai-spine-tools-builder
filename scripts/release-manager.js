#!/usr/bin/env node

/**
 * Release Management Script
 * Handles version bumping, changelog generation, and coordinated releases
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
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
 * Release manager for monorepo
 */
class ReleaseManager {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.rootDir = path.resolve(__dirname, '..');
    this.packagesDir = path.join(this.rootDir, 'packages');
    
    this.currentVersion = this.getCurrentVersion();
    this.packages = this.discoverPackages();
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
   * Get current version from root package.json
   */
  getCurrentVersion() {
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  }

  /**
   * Discover all packages in the monorepo
   */
  discoverPackages() {
    const packages = [];
    const packageDirs = fs.readdirSync(this.packagesDir).filter(dir => 
      fs.statSync(path.join(this.packagesDir, dir)).isDirectory()
    );
    
    for (const dir of packageDirs) {
      const packagePath = path.join(this.packagesDir, dir);
      const packageJsonPath = path.join(packagePath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packages.push({
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
   * Get git commits since last release
   */
  getCommitsSinceLastRelease() {
    try {
      const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      this.log(`Last tag: ${lastTag}`, 'debug');
      
      const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, { 
        encoding: 'utf8' 
      }).trim();
      
      if (!commits) return [];
      
      return commits.split('\n').map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' ')
        };
      });
    } catch (error) {
      this.log('No previous tags found, getting all commits', 'warning');
      try {
        const commits = execSync('git log --oneline --no-merges', { 
          encoding: 'utf8' 
        }).trim();
        
        if (!commits) return [];
        
        return commits.split('\n').map(line => {
          const [hash, ...messageParts] = line.split(' ');
          return {
            hash,
            message: messageParts.join(' ')
          };
        });
      } catch (err) {
        this.log('Could not retrieve git commits', 'warning');
        return [];
      }
    }
  }

  /**
   * Analyze commits using conventional commit format
   */
  analyzeCommits(commits) {
    const analysis = {
      breaking: [],
      features: [],
      fixes: [],
      other: [],
      suggestedBump: 'patch'
    };

    const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?(!)?: (.+)$/;

    for (const commit of commits) {
      const match = commit.message.match(conventionalCommitRegex);
      
      if (match) {
        const [, type, scope, breaking, description] = match;
        
        const commitInfo = {
          hash: commit.hash,
          type,
          scope: scope ? scope.slice(1, -1) : null, // Remove parentheses
          breaking: Boolean(breaking),
          description,
          raw: commit.message
        };

        if (commitInfo.breaking || commit.message.includes('BREAKING CHANGE')) {
          analysis.breaking.push(commitInfo);
          analysis.suggestedBump = 'major';
        } else if (type === 'feat') {
          analysis.features.push(commitInfo);
          if (analysis.suggestedBump === 'patch') {
            analysis.suggestedBump = 'minor';
          }
        } else if (type === 'fix') {
          analysis.fixes.push(commitInfo);
          // Keep current bump level (patch is default)
        } else {
          analysis.other.push(commitInfo);
        }
      } else {
        // Non-conventional commit
        analysis.other.push({
          hash: commit.hash,
          type: 'other',
          scope: null,
          breaking: false,
          description: commit.message,
          raw: commit.message
        });
      }
    }

    return analysis;
  }

  /**
   * Generate changelog based on commit analysis
   */
  generateChangelog(analysis, newVersion, options = {}) {
    const { 
      format = 'markdown',
      includeCommitLinks = true,
      includePackageInfo = true,
      includePerformanceMetrics = false 
    } = options;
    
    const date = new Date().toISOString().split('T')[0];
    let changelog = `# Changelog\n\n## [${newVersion}] - ${date}\n\n`;

    // Add release summary
    const totalCommits = analysis.breaking.length + analysis.features.length + 
                        analysis.fixes.length + analysis.other.length;
    
    changelog += `**Release Summary**: ${totalCommits} commits processed\n\n`;
    
    if (includePackageInfo) {
      changelog += '### 📦 Packages Updated\n\n';
      this.packages.forEach(pkg => {
        changelog += `- \`${pkg.packageJson.name}@${newVersion}\`\n`;
      });
      changelog += '\n';
    }

    if (analysis.breaking.length > 0) {
      changelog += '### 💥 BREAKING CHANGES\n\n';
      for (const commit of analysis.breaking) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        const commitLink = includeCommitLinks ? ` ([${commit.hash}](../../commit/${commit.hash}))` : ` (${commit.hash})`;
        changelog += `- ${scope} ${commit.description}${commitLink}\n`;
        
        // Add more details for breaking changes
        if (commit.raw.includes('BREAKING CHANGE:')) {
          const breakingDetails = commit.raw.split('BREAKING CHANGE:')[1];
          if (breakingDetails) {
            changelog += `  \n  **Breaking Change Details:** ${breakingDetails.trim()}\n`;
          }
        }
      }
      changelog += '\n';
    }

    if (analysis.features.length > 0) {
      changelog += '### 🚀 Features\n\n';
      for (const commit of analysis.features) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        const commitLink = includeCommitLinks ? ` ([${commit.hash}](../../commit/${commit.hash}))` : ` (${commit.hash})`;
        changelog += `- ${scope} ${commit.description}${commitLink}\n`;
      }
      changelog += '\n';
    }

    if (analysis.fixes.length > 0) {
      changelog += '### 🐛 Bug Fixes\n\n';
      for (const commit of analysis.fixes) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        const commitLink = includeCommitLinks ? ` ([${commit.hash}](../../commit/${commit.hash}))` : ` (${commit.hash})`;
        changelog += `- ${scope} ${commit.description}${commitLink}\n`;
      }
      changelog += '\n';
    }

    // Group other changes by type
    const otherByType = {};
    for (const commit of analysis.other) {
      if (!otherByType[commit.type]) {
        otherByType[commit.type] = [];
      }
      otherByType[commit.type].push(commit);
    }

    const typeEmojis = {
      docs: '📚',
      style: '🎨', 
      refactor: '♻️',
      perf: '⚡',
      test: '🧪',
      chore: '🔧',
      ci: '👷',
      build: '📦'
    };

    for (const [type, commits] of Object.entries(otherByType)) {
      if (commits.length > 0) {
        const emoji = typeEmojis[type] || '🔧';
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        changelog += `### ${emoji} ${typeName}\n\n`;
        
        for (const commit of commits) {
          const scope = commit.scope ? ` **${commit.scope}**:` : '';
          const commitLink = includeCommitLinks ? ` ([${commit.hash}](../../commit/${commit.hash}))` : ` (${commit.hash})`;
          changelog += `- ${scope} ${commit.description}${commitLink}\n`;
        }
        changelog += '\n';
      }
    }

    // Add migration guide for breaking changes
    if (analysis.breaking.length > 0) {
      changelog += '### 🔄 Migration Guide\n\n';
      changelog += 'This release contains breaking changes. Please review the following:\n\n';
      
      for (const commit of analysis.breaking) {
        changelog += `1. **${commit.scope || 'General'}**: ${commit.description}\n`;
        changelog += '   - Review your implementation for compatibility\n';
        changelog += '   - Update your code according to the new API\n';
        changelog += '   - Test thoroughly before upgrading\n\n';
      }
    }

    // Add footer with useful links
    changelog += '---\n\n';
    changelog += `**Full Changelog**: [View all changes](../../compare/v${this.currentVersion}...v${newVersion})\n`;
    changelog += `**Documentation**: [View updated docs](../../tree/v${newVersion})\n`;
    changelog += `**NPM Packages**: All packages are published with version \`${newVersion}\`\n\n`;

    return changelog;
  }

  /**
   * Update changelog file
   */
  updateChangelogFile(changelogContent) {
    const changelogPath = path.join(this.rootDir, 'CHANGELOG.md');
    
    if (fs.existsSync(changelogPath)) {
      const existingChangelog = fs.readFileSync(changelogPath, 'utf8');
      const newChangelog = changelogContent + '\n' + existingChangelog;
      
      if (!this.dryRun) {
        fs.writeFileSync(changelogPath, newChangelog);
      }
      
      this.log('Updated existing CHANGELOG.md', 'success');
    } else {
      if (!this.dryRun) {
        fs.writeFileSync(changelogPath, changelogContent);
      }
      
      this.log('Created new CHANGELOG.md', 'success');
    }
  }

  /**
   * Validate semantic versioning rules
   */
  validateSemanticVersioning(currentVersion, newVersion, analysis) {
    const currentSemver = semver.parse(currentVersion);
    const newSemver = semver.parse(newVersion);
    
    if (!currentSemver || !newSemver) {
      throw new Error(`Invalid version format. Current: ${currentVersion}, New: ${newVersion}`);
    }

    // Ensure version is actually bumped
    if (!semver.gt(newVersion, currentVersion)) {
      throw new Error(`New version ${newVersion} must be greater than current version ${currentVersion}`);
    }

    // Check if version bump matches the changes
    const actualBump = semver.diff(currentVersion, newVersion);
    const expectedBump = analysis.suggestedBump;

    const bumpHierarchy = { patch: 0, minor: 1, major: 2 };
    const actualLevel = bumpHierarchy[actualBump] || 0;
    const expectedLevel = bumpHierarchy[expectedBump] || 0;

    if (actualLevel < expectedLevel) {
      this.log(`⚠️ Warning: Version bump '${actualBump}' may be insufficient for the changes made`, 'warning');
      this.log(`   Expected: '${expectedBump}' based on commit analysis`, 'warning');
      this.log(`   Breaking changes: ${analysis.breaking.length}`, 'warning');
      this.log(`   Features: ${analysis.features.length}`, 'warning');
      this.log(`   Bug fixes: ${analysis.fixes.length}`, 'warning');
      
      // Don't fail, but warn the user
      this.log('   Continuing with specified version bump...', 'warning');
    } else if (actualLevel > expectedLevel) {
      this.log(`ℹ️ Version bump '${actualBump}' is higher than suggested '${expectedBump}'`, 'info');
      this.log('   This is acceptable for ensuring proper semantic versioning', 'info');
    }

    // Additional validations
    if (analysis.breaking.length > 0 && actualBump !== 'major') {
      this.log(`⚠️ Warning: Breaking changes detected but version bump is '${actualBump}', not 'major'`, 'warning');
    }

    return {
      currentVersion,
      newVersion,
      bumpType: actualBump,
      expectedBumpType: expectedBump,
      isValid: true,
      warnings: []
    };
  }

  /**
   * Bump version in all packages
   */
  async bumpVersion(bumpType, customVersion = null, analysis = null) {
    let newVersion;
    
    if (customVersion) {
      newVersion = customVersion;
    } else {
      newVersion = semver.inc(this.currentVersion, bumpType);
    }

    if (!semver.valid(newVersion)) {
      throw new Error(`Invalid version: ${newVersion}`);
    }

    // Validate semantic versioning if analysis is provided
    if (analysis) {
      this.validateSemanticVersioning(this.currentVersion, newVersion, analysis);
    }

    this.log(`Bumping version from ${this.currentVersion} to ${newVersion}`, 'info');

    // Update root package.json
    const rootPackageJsonPath = path.join(this.rootDir, 'package.json');
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    
    if (!this.dryRun) {
      rootPackageJson.version = newVersion;
      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
    }
    
    this.log(`Updated root package version to ${newVersion}`, 'success');

    // Update all package versions and internal dependencies
    for (const pkg of this.packages) {
      const packageJsonPath = path.join(pkg.path, 'package.json');
      const packageJson = { ...pkg.packageJson };
      
      packageJson.version = newVersion;
      
      // Update internal dependencies
      for (const depType of ['dependencies', 'devDependencies']) {
        if (packageJson[depType]) {
          for (const [depName, depVersion] of Object.entries(packageJson[depType])) {
            // Check if this is an internal dependency
            const isInternalDep = this.packages.some(p => p.name === depName);
            if (isInternalDep) {
              packageJson[depType][depName] = `^${newVersion}`;
            }
          }
        }
      }
      
      if (!this.dryRun) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      }
      
      this.log(`Updated ${pkg.name} version to ${newVersion}`, 'success');
    }

    return newVersion;
  }

  /**
   * Create git tag
   */
  createGitTag(version) {
    const tagName = `v${version}`;
    
    if (!this.dryRun) {
      try {
        execSync(`git add .`);
        execSync(`git commit -m "chore(release): ${version}"`);
        execSync(`git tag ${tagName}`);
        
        this.log(`Created git tag: ${tagName}`, 'success');
      } catch (error) {
        this.log(`Failed to create git tag: ${error.message}`, 'error');
        throw error;
      }
    } else {
      this.log(`[DRY RUN] Would create git tag: ${tagName}`, 'debug');
    }
  }

  /**
   * Publish packages to npm registry
   */
  async publishPackages(options = {}) {
    const { dryRun = this.dryRun, skipVersionCheck = false } = options;
    
    this.log('Publishing packages to npm registry...', 'info');
    
    const publishResults = [];
    
    for (const pkg of this.packages) {
      try {
        const packagePath = pkg.path;
        const packageJson = pkg.packageJson;
        const packageName = packageJson.name;
        const packageVersion = packageJson.version;
        
        this.log(`Publishing ${packageName}@${packageVersion}...`, 'info');
        
        // Check if version already exists on npm
        if (!skipVersionCheck && !dryRun) {
          try {
            const existingVersion = execSync(
              `npm view "${packageName}@${packageVersion}" version 2>/dev/null || echo ""`, 
              { encoding: 'utf8' }
            ).trim();
            
            if (existingVersion === packageVersion) {
              this.log(`Version ${packageVersion} already exists for ${packageName}, skipping`, 'warning');
              publishResults.push({ 
                package: packageName, 
                version: packageVersion, 
                status: 'skipped',
                reason: 'Version already exists'
              });
              continue;
            }
          } catch (error) {
            this.log(`Could not check existing version for ${packageName}: ${error.message}`, 'warning');
          }
        }
        
        // Build package before publishing
        try {
          this.log(`Building ${packageName}...`, 'info');
          execSync('npm run build', { 
            cwd: packagePath,
            stdio: this.verbose ? 'inherit' : 'pipe'
          });
          this.log(`Build completed for ${packageName}`, 'success');
        } catch (error) {
          this.log(`Build failed for ${packageName}: ${error.message}`, 'error');
          throw error;
        }
        
        // Verify package can be packed
        if (!dryRun) {
          try {
            execSync('npm pack --dry-run', { 
              cwd: packagePath,
              stdio: this.verbose ? 'inherit' : 'pipe'
            });
            this.log(`Package verification passed for ${packageName}`, 'success');
          } catch (error) {
            this.log(`Package verification failed for ${packageName}: ${error.message}`, 'error');
            throw error;
          }
        }
        
        // Publish package
        if (dryRun) {
          this.log(`[DRY RUN] Would publish ${packageName}@${packageVersion}`, 'debug');
          publishResults.push({ 
            package: packageName, 
            version: packageVersion, 
            status: 'dry_run'
          });
        } else {
          try {
            execSync('npm publish --access public', { 
              cwd: packagePath,
              stdio: this.verbose ? 'inherit' : 'pipe'
            });
            
            this.log(`Successfully published ${packageName}@${packageVersion}`, 'success');
            publishResults.push({ 
              package: packageName, 
              version: packageVersion, 
              status: 'published'
            });
            
            // Wait a bit between publishes to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            this.log(`Failed to publish ${packageName}: ${error.message}`, 'error');
            publishResults.push({ 
              package: packageName, 
              version: packageVersion, 
              status: 'failed',
              error: error.message
            });
            throw error;
          }
        }
        
      } catch (error) {
        this.log(`Error processing package ${pkg.name}: ${error.message}`, 'error');
        publishResults.push({ 
          package: pkg.name, 
          version: pkg.packageJson.version, 
          status: 'failed',
          error: error.message
        });
        throw error;
      }
    }
    
    return publishResults;
  }

  /**
   * Verify published packages are available
   */
  async verifyPublishedPackages(version, options = {}) {
    const { timeout = 60000 } = options; // 1 minute timeout
    
    this.log('Verifying published packages are available...', 'info');
    
    const verificationResults = [];
    const startTime = Date.now();
    
    for (const pkg of this.packages) {
      const packageName = pkg.packageJson.name;
      let verified = false;
      let attempts = 0;
      const maxAttempts = 12; // 1 minute with 5-second intervals
      
      this.log(`Verifying ${packageName}@${version}...`, 'info');
      
      while (!verified && attempts < maxAttempts && (Date.now() - startTime) < timeout) {
        try {
          const availableVersion = execSync(
            `npm view "${packageName}@${version}" version 2>/dev/null || echo ""`, 
            { encoding: 'utf8' }
          ).trim();
          
          if (availableVersion === version) {
            verified = true;
            this.log(`✅ ${packageName}@${version} is available on npm`, 'success');
            verificationResults.push({
              package: packageName,
              version,
              status: 'verified',
              attempts: attempts + 1
            });
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              this.log(`Waiting for ${packageName}@${version} to propagate... (attempt ${attempts}/${maxAttempts})`, 'debug');
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            this.log(`Failed to verify ${packageName}@${version}: ${error.message}`, 'error');
            verificationResults.push({
              package: packageName,
              version,
              status: 'failed',
              error: error.message,
              attempts
            });
          } else {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (!verified && attempts >= maxAttempts) {
        this.log(`❌ ${packageName}@${version} verification timed out`, 'error');
        verificationResults.push({
          package: packageName,
          version,
          status: 'timeout',
          attempts
        });
      }
    }
    
    return verificationResults;
  }

  /**
   * Rollback a release (unpublish packages if needed)
   */
  async rollbackRelease(version, options = {}) {
    const { force = false, unpublish = false } = options;
    
    this.log(`Starting rollback for version ${version}...`, 'warning');
    
    if (!force) {
      this.log('Rollback is a destructive operation. Use --force to confirm.', 'error');
      throw new Error('Rollback requires --force flag');
    }
    
    const rollbackResults = [];
    
    try {
      // Remove git tag
      try {
        execSync(`git tag -d v${version}`);
        execSync(`git push origin :refs/tags/v${version}`);
        this.log(`Removed git tag v${version}`, 'success');
        rollbackResults.push({ action: 'remove_tag', status: 'success' });
      } catch (error) {
        this.log(`Failed to remove git tag: ${error.message}`, 'error');
        rollbackResults.push({ action: 'remove_tag', status: 'failed', error: error.message });
      }
      
      // Unpublish packages if requested
      if (unpublish) {
        this.log('⚠️ Unpublishing packages from npm...', 'warning');
        
        for (const pkg of this.packages) {
          try {
            const packageName = pkg.packageJson.name;
            
            // Check if package version exists
            const existingVersion = execSync(
              `npm view "${packageName}@${version}" version 2>/dev/null || echo ""`, 
              { encoding: 'utf8' }
            ).trim();
            
            if (existingVersion === version) {
              if (!this.dryRun) {
                execSync(`npm unpublish "${packageName}@${version}" --force`, {
                  stdio: this.verbose ? 'inherit' : 'pipe'
                });
                this.log(`Unpublished ${packageName}@${version}`, 'success');
              } else {
                this.log(`[DRY RUN] Would unpublish ${packageName}@${version}`, 'debug');
              }
              
              rollbackResults.push({ 
                action: 'unpublish', 
                package: packageName, 
                status: 'success' 
              });
            } else {
              this.log(`Package ${packageName}@${version} not found on npm`, 'warning');
              rollbackResults.push({ 
                action: 'unpublish', 
                package: packageName, 
                status: 'not_found' 
              });
            }
            
          } catch (error) {
            this.log(`Failed to unpublish ${pkg.packageJson.name}@${version}: ${error.message}`, 'error');
            rollbackResults.push({ 
              action: 'unpublish', 
              package: pkg.packageJson.name, 
              status: 'failed', 
              error: error.message 
            });
          }
        }
      }
      
      this.log(`Rollback for version ${version} completed`, 'success');
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      throw error;
    }
    
    return rollbackResults;
  }

  /**
   * Run pre-release checks
   */
  async runPreReleaseChecks() {
    this.log('Running pre-release checks...', 'info');
    
    const checks = [
      {
        name: 'Git working directory clean',
        check: () => {
          try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            return status.trim() === '';
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'On main/master branch',
        check: () => {
          try {
            const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            return ['main', 'master'].includes(branch);
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Tests passing',
        check: async () => {
          try {
            if (this.dryRun) return true;
            execSync('npm test', { stdio: 'pipe' });
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Build passing',
        check: async () => {
          try {
            if (this.dryRun) return true;
            execSync('npm run build', { stdio: 'pipe' });
            return true;
          } catch (error) {
            return false;
          }
        }
      }
    ];

    const results = [];
    
    for (const check of checks) {
      try {
        const result = await check.check();
        results.push({ name: check.name, passed: result });
        
        if (result) {
          this.log(`✅ ${check.name}`, 'success');
        } else {
          this.log(`❌ ${check.name}`, 'error');
        }
      } catch (error) {
        results.push({ name: check.name, passed: false, error: error.message });
        this.log(`❌ ${check.name}: ${error.message}`, 'error');
      }
    }

    const allPassed = results.every(r => r.passed);
    
    if (!allPassed) {
      throw new Error('Pre-release checks failed. Please fix the issues and try again.');
    }

    this.log('All pre-release checks passed', 'success');
    return results;
  }

  /**
   * Perform a full release
   */
  async performRelease(options = {}) {
    const { 
      bumpType, 
      customVersion, 
      skipChecks = false,
      skipPublish = false,
      skipVerify = false
    } = options;

    try {
      // Run pre-release checks
      if (!skipChecks) {
        await this.runPreReleaseChecks();
      }

      // Analyze commits to determine version bump
      const commits = this.getCommitsSinceLastRelease();
      const analysis = this.analyzeCommits(commits);
      
      this.log(`Found ${commits.length} commits since last release`, 'info');
      this.log(`Suggested version bump: ${analysis.suggestedBump}`, 'info');

      // Determine final version bump
      const finalBumpType = bumpType || analysis.suggestedBump;
      
      // Bump version
      const newVersion = await this.bumpVersion(finalBumpType, customVersion, analysis);
      
      // Generate and update changelog
      const changelogContent = this.generateChangelog(analysis, newVersion);
      this.updateChangelogFile(changelogContent);
      
      // Create git tag
      this.createGitTag(newVersion);
      
      const releaseResult = {
        version: newVersion,
        commits: commits.length,
        changes: analysis
      };
      
      // Publish packages if not skipped
      if (!skipPublish && !this.dryRun) {
        this.log('Publishing packages to npm registry...', 'info');
        try {
          const publishResults = await this.publishPackages({
            dryRun: this.dryRun,
            skipVersionCheck: false
          });
          releaseResult.publishResults = publishResults;
          
          // Verify publication if not skipped
          if (!skipVerify) {
            this.log('Verifying published packages...', 'info');
            const verificationResults = await this.verifyPublishedPackages(newVersion, {
              timeout: 120000 // 2 minutes for release verification
            });
            releaseResult.verificationResults = verificationResults;
            
            const allVerified = verificationResults.every(r => r.status === 'verified');
            if (!allVerified) {
              this.log('⚠️ Some packages could not be verified, but release continues', 'warning');
            }
          }
          
        } catch (publishError) {
          this.log(`Publishing failed: ${publishError.message}`, 'error');
          this.log('Release created but packages not published. You can publish manually later.', 'warning');
          releaseResult.publishError = publishError.message;
        }
      }
      
      this.log(`🎉 Release ${newVersion} completed successfully!`, 'success');
      this.log('', 'info');
      
      if (skipPublish || this.dryRun) {
        this.log('Next steps:', 'info');
        this.log('1. Push changes: git push && git push --tags', 'info');
        this.log('2. Publish packages: node scripts/release-manager.js publish', 'info');
      } else if (releaseResult.publishError) {
        this.log('Manual steps required:', 'info');
        this.log('1. Fix publishing issue and retry: node scripts/release-manager.js publish', 'info');
        this.log('2. Or rollback: node scripts/release-manager.js rollback ' + newVersion + ' --force', 'info');
      } else {
        this.log('Release complete! Packages are available on npm:', 'success');
        this.packages.forEach(pkg => {
          this.log(`  npm install ${pkg.packageJson.name}@${newVersion}`, 'info');
        });
      }
      
      return releaseResult;

    } catch (error) {
      this.log(`Release failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Print release preview
   */
  printReleasePreview(bumpType = null) {
    const commits = this.getCommitsSinceLastRelease();
    const analysis = this.analyzeCommits(commits);
    
    const finalBumpType = bumpType || analysis.suggestedBump;
    const newVersion = semver.inc(this.currentVersion, finalBumpType);

    console.log(`${colors.bold}${colors.cyan}📋 Release Preview${colors.reset}`);
    console.log('=' .repeat(60));
    
    console.log(`\nCurrent version: ${this.currentVersion}`);
    console.log(`New version: ${colors.green}${newVersion}${colors.reset}`);
    console.log(`Version bump: ${finalBumpType}`);
    console.log(`Commits since last release: ${commits.length}`);
    
    if (analysis.breaking.length > 0) {
      console.log(`\n${colors.red}💥 Breaking changes: ${analysis.breaking.length}${colors.reset}`);
      analysis.breaking.forEach(commit => {
        console.log(`  • ${commit.description}`);
      });
    }
    
    if (analysis.features.length > 0) {
      console.log(`\n${colors.green}🚀 Features: ${analysis.features.length}${colors.reset}`);
      analysis.features.forEach(commit => {
        console.log(`  • ${commit.description}`);
      });
    }
    
    if (analysis.fixes.length > 0) {
      console.log(`\n${colors.yellow}🐛 Bug fixes: ${analysis.fixes.length}${colors.reset}`);
      analysis.fixes.forEach(commit => {
        console.log(`  • ${commit.description}`);
      });
    }

    console.log(`\n${colors.cyan}Packages to update:${colors.reset}`);
    this.packages.forEach(pkg => {
      console.log(`  • ${pkg.name}`);
    });
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
    skipChecks: args.includes('--skip-checks')
  };

  const manager = new ReleaseManager(options);

  try {
    switch (command) {
      case 'preview':
        const bumpType = args[1]; // patch, minor, major
        manager.printReleasePreview(bumpType);
        break;

      case 'bump':
        const type = args[1] || 'patch';
        await manager.bumpVersion(type);
        break;

      case 'release':
        const releaseOptions = {
          bumpType: args[1], // patch, minor, major
          skipChecks: options.skipChecks
        };
        await manager.performRelease(releaseOptions);
        break;

      case 'publish':
        const publishResults = await manager.publishPackages({
          dryRun: options.dryRun,
          skipVersionCheck: args.includes('--skip-version-check')
        });
        
        console.log('\n📦 Publishing Results:');
        publishResults.forEach(result => {
          const status = result.status === 'published' ? '✅' : 
                        result.status === 'skipped' ? '⚠️' :
                        result.status === 'dry_run' ? '🏃' : '❌';
          console.log(`  ${status} ${result.package}@${result.version} - ${result.status}`);
          if (result.reason) console.log(`    ${result.reason}`);
          if (result.error) console.log(`    Error: ${result.error}`);
        });
        break;

      case 'verify':
        const verifyVersion = args[1] || manager.currentVersion;
        const verificationResults = await manager.verifyPublishedPackages(verifyVersion, {
          timeout: args.includes('--timeout') ? parseInt(args[args.indexOf('--timeout') + 1]) : 60000
        });
        
        console.log(`\n🔍 Verification Results for v${verifyVersion}:`);
        verificationResults.forEach(result => {
          const status = result.status === 'verified' ? '✅' : 
                        result.status === 'timeout' ? '⏰' : '❌';
          console.log(`  ${status} ${result.package}@${result.version} - ${result.status}`);
          if (result.error) console.log(`    Error: ${result.error}`);
          if (result.attempts) console.log(`    Attempts: ${result.attempts}`);
        });
        break;

      case 'rollback':
        const rollbackVersion = args[1];
        if (!rollbackVersion) {
          console.error(`${colors.red}❌ Error: Version required for rollback${colors.reset}`);
          process.exit(1);
        }
        
        const rollbackOptions = {
          force: args.includes('--force'),
          unpublish: args.includes('--unpublish')
        };
        
        if (!rollbackOptions.force) {
          console.log(`${colors.yellow}⚠️ Rollback is a destructive operation. Use --force to confirm.${colors.reset}`);
          process.exit(1);
        }
        
        const rollbackResults = await manager.rollbackRelease(rollbackVersion, rollbackOptions);
        
        console.log(`\n🔄 Rollback Results for v${rollbackVersion}:`);
        rollbackResults.forEach(result => {
          const status = result.status === 'success' ? '✅' : 
                        result.status === 'not_found' ? '⚠️' : '❌';
          console.log(`  ${status} ${result.action}${result.package ? ` (${result.package})` : ''} - ${result.status}`);
          if (result.error) console.log(`    Error: ${result.error}`);
        });
        break;

      case 'changelog':
        const commits = manager.getCommitsSinceLastRelease();
        const analysis = manager.analyzeCommits(commits);
        const version = semver.inc(manager.currentVersion, args[1] || 'patch');
        const changelog = manager.generateChangelog(analysis, version);
        console.log(changelog);
        break;

      default:
        console.log(`${colors.bold}AI Spine Tools Release Manager${colors.reset}`);
        console.log('');
        console.log('Usage: node scripts/release-manager.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  preview [bump]           Preview the next release');
        console.log('  bump <type>              Bump version (patch|minor|major)');
        console.log('  release [bump]           Perform full release process');
        console.log('  publish                  Publish packages to npm registry');
        console.log('  verify [version]         Verify published packages are available');
        console.log('  rollback <version>       Rollback a release (requires --force)');
        console.log('  changelog [bump]         Generate changelog');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v            Show detailed output');
        console.log('  --dry-run, -d            Show what would be done without executing');
        console.log('  --skip-checks            Skip pre-release checks');
        console.log('  --skip-version-check     Skip npm version existence check');
        console.log('  --force                  Force destructive operations (rollback)');
        console.log('  --unpublish              Unpublish packages during rollback');
        console.log('  --timeout <ms>           Timeout for verification (default: 60000)');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/release-manager.js preview minor');
        console.log('  node scripts/release-manager.js release minor --dry-run');
        console.log('  node scripts/release-manager.js publish --verbose');
        console.log('  node scripts/release-manager.js verify 1.2.3');
        console.log('  node scripts/release-manager.js rollback 1.2.3 --force --unpublish');
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

module.exports = { ReleaseManager };