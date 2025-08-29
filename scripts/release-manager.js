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
  generateChangelog(analysis, newVersion) {
    const date = new Date().toISOString().split('T')[0];
    let changelog = `# Changelog\n\n## [${newVersion}] - ${date}\n\n`;

    if (analysis.breaking.length > 0) {
      changelog += '### 💥 BREAKING CHANGES\n\n';
      for (const commit of analysis.breaking) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        changelog += `- ${scope} ${commit.description} ([${commit.hash}])\n`;
      }
      changelog += '\n';
    }

    if (analysis.features.length > 0) {
      changelog += '### 🚀 Features\n\n';
      for (const commit of analysis.features) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        changelog += `- ${scope} ${commit.description} ([${commit.hash}])\n`;
      }
      changelog += '\n';
    }

    if (analysis.fixes.length > 0) {
      changelog += '### 🐛 Bug Fixes\n\n';
      for (const commit of analysis.fixes) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        changelog += `- ${scope} ${commit.description} ([${commit.hash}])\n`;
      }
      changelog += '\n';
    }

    if (analysis.other.length > 0) {
      changelog += '### 🔧 Other Changes\n\n';
      for (const commit of analysis.other) {
        const scope = commit.scope ? ` **${commit.scope}**:` : '';
        changelog += `- ${scope} ${commit.description} ([${commit.hash}])\n`;
      }
      changelog += '\n';
    }

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
   * Bump version in all packages
   */
  async bumpVersion(bumpType, customVersion = null) {
    let newVersion;
    
    if (customVersion) {
      newVersion = customVersion;
    } else {
      newVersion = semver.inc(this.currentVersion, bumpType);
    }

    if (!semver.valid(newVersion)) {
      throw new Error(`Invalid version: ${newVersion}`);
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
    const { bumpType, customVersion, skipChecks = false } = options;

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
      const newVersion = await this.bumpVersion(finalBumpType, customVersion);
      
      // Generate and update changelog
      const changelogContent = this.generateChangelog(analysis, newVersion);
      this.updateChangelogFile(changelogContent);
      
      // Create git tag
      this.createGitTag(newVersion);
      
      this.log(`🎉 Release ${newVersion} completed successfully!`, 'success');
      this.log('', 'info');
      this.log('Next steps:', 'info');
      this.log('1. Push changes: git push && git push --tags', 'info');
      this.log('2. Publish packages: npm run publish:all', 'info');
      
      return {
        version: newVersion,
        commits: commits.length,
        changes: analysis
      };

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
        console.log('  preview [bump]    Preview the next release');
        console.log('  bump <type>       Bump version (patch|minor|major)');
        console.log('  release [bump]    Perform full release process');
        console.log('  changelog [bump]  Generate changelog');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v     Show detailed output');
        console.log('  --dry-run, -d     Show what would be done without executing');
        console.log('  --skip-checks     Skip pre-release checks');
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