/**
 * @fileoverview Tests for Release Automation System (Step 7.2)
 * 
 * Tests cover all aspects of the release automation including:
 * - Version management and coordination
 * - Semantic versioning enforcement  
 * - Changelog generation
 * - NPM publishing workflow
 * - Git tag management
 * - Rollback procedures
 * - Error handling and validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

// Mock the ReleaseManager to avoid actual git/npm operations in tests
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn()
}));

const { ReleaseManager } = require('../release-manager');

describe('Release Automation System (Step 7.2)', () => {
  let releaseManager;
  let mockPackages;
  let testTempDir;

  beforeAll(() => {
    // Create a temporary directory for testing
    testTempDir = path.join(__dirname, 'temp-release-test');
    if (!fs.existsSync(testTempDir)) {
      fs.mkdirSync(testTempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock file system operations
    mockPackages = [
      {
        name: '@ai-spine/tools-core',
        path: path.join(testTempDir, 'packages/ai-spine-tools-core'),
        packageJson: {
          name: '@ai-spine/tools-core',
          version: '1.0.0'
        },
        directory: 'ai-spine-tools-core'
      },
      {
        name: '@ai-spine/tools',
        path: path.join(testTempDir, 'packages/ai-spine-tools'),
        packageJson: {
          name: '@ai-spine/tools',
          version: '1.0.0',
          dependencies: {
            '@ai-spine/tools-core': '^1.0.0'
          }
        },
        directory: 'ai-spine-tools'
      }
    ];

    // Create mock root package.json
    const rootPackageJson = {
      name: 'ai-spine-tools-sdk',
      version: '1.0.0',
      workspaces: ['packages/*']
    };

    fs.writeFileSync(
      path.join(testTempDir, 'package.json'),
      JSON.stringify(rootPackageJson, null, 2)
    );

    // Create mock package directories and package.json files
    mockPackages.forEach(pkg => {
      fs.mkdirSync(pkg.path, { recursive: true });
      fs.writeFileSync(
        path.join(pkg.path, 'package.json'),
        JSON.stringify(pkg.packageJson, null, 2)
      );
    });

    releaseManager = new ReleaseManager({
      verbose: false,
      dryRun: true
    });

    // Override rootDir for testing
    releaseManager.rootDir = testTempDir;
    releaseManager.packagesDir = path.join(testTempDir, 'packages');
    releaseManager.packages = mockPackages;
    releaseManager.currentVersion = '1.0.0';
  });

  describe('Version Management and Coordination', () => {
    test('should coordinate versions across all packages', async () => {
      const newVersion = await releaseManager.bumpVersion('minor');
      
      expect(newVersion).toBe('1.1.0');
      
      // Verify all packages would be updated
      const rootPackageJson = JSON.parse(
        fs.readFileSync(path.join(testTempDir, 'package.json'), 'utf8')
      );
      expect(rootPackageJson.version).toBe('1.1.0');
    });

    test('should update internal dependencies correctly', async () => {
      await releaseManager.bumpVersion('minor');
      
      // Check that internal dependencies are updated
      const toolsPackageJson = JSON.parse(
        fs.readFileSync(path.join(testTempDir, 'packages/ai-spine-tools/package.json'), 'utf8')
      );
      
      expect(toolsPackageJson.dependencies['@ai-spine/tools-core']).toBe('^1.1.0');
    });

    test('should validate version format correctness', async () => {
      await expect(releaseManager.bumpVersion('invalid'))
        .rejects.toThrow('Invalid version');
    });

    test('should handle custom version specification', async () => {
      const customVersion = '2.0.0-beta.1';
      const newVersion = await releaseManager.bumpVersion(null, customVersion);
      
      expect(newVersion).toBe(customVersion);
      expect(semver.valid(newVersion)).toBeTruthy();
    });
  });

  describe('Semantic Versioning Enforcement', () => {
    test('should suggest correct version bump for breaking changes', () => {
      const commits = [
        {
          hash: 'abc123',
          message: 'feat!: redesign API interface'
        }
      ];
      
      const analysis = releaseManager.analyzeCommits(commits);
      
      expect(analysis.suggestedBump).toBe('major');
      expect(analysis.breaking.length).toBe(1);
    });

    test('should suggest minor bump for new features', () => {
      const commits = [
        {
          hash: 'def456',
          message: 'feat(core): add new tool builder'
        }
      ];
      
      const analysis = releaseManager.analyzeCommits(commits);
      
      expect(analysis.suggestedBump).toBe('minor');
      expect(analysis.features.length).toBe(1);
    });

    test('should suggest patch bump for bug fixes', () => {
      const commits = [
        {
          hash: 'ghi789',
          message: 'fix(validation): handle edge case'
        }
      ];
      
      const analysis = releaseManager.analyzeCommits(commits);
      
      expect(analysis.suggestedBump).toBe('patch');
      expect(analysis.fixes.length).toBe(1);
    });

    test('should validate version bump matches change significance', () => {
      const analysis = {
        breaking: [{ hash: 'abc', message: 'breaking change' }],
        features: [],
        fixes: [],
        other: [],
        suggestedBump: 'major'
      };

      const validation = releaseManager.validateSemanticVersioning('1.0.0', '2.0.0', analysis);
      
      expect(validation.isValid).toBe(true);
      expect(validation.bumpType).toBe('major');
    });

    test('should warn when version bump is insufficient', () => {
      const logSpy = jest.spyOn(releaseManager, 'log').mockImplementation();
      
      const analysis = {
        breaking: [{ hash: 'abc', message: 'breaking change' }],
        features: [],
        fixes: [],
        other: [],
        suggestedBump: 'major'
      };

      releaseManager.validateSemanticVersioning('1.0.0', '1.0.1', analysis);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Version bump'),
        'warning'
      );
    });
  });

  describe('Changelog Generation', () => {
    test('should generate well-formatted changelog', () => {
      const analysis = {
        breaking: [
          {
            hash: 'abc123',
            type: 'feat',
            scope: 'api',
            breaking: true,
            description: 'redesign authentication system',
            raw: 'feat(api)!: redesign authentication system\n\nBREAKING CHANGE: API keys now required'
          }
        ],
        features: [
          {
            hash: 'def456',
            type: 'feat',
            scope: 'tools',
            breaking: false,
            description: 'add database tool builder',
            raw: 'feat(tools): add database tool builder'
          }
        ],
        fixes: [
          {
            hash: 'ghi789',
            type: 'fix',
            scope: 'validation',
            breaking: false,
            description: 'handle null input gracefully',
            raw: 'fix(validation): handle null input gracefully'
          }
        ],
        other: [
          {
            hash: 'jkl012',
            type: 'docs',
            scope: null,
            breaking: false,
            description: 'update API documentation',
            raw: 'docs: update API documentation'
          }
        ],
        suggestedBump: 'major'
      };

      const changelog = releaseManager.generateChangelog(analysis, '2.0.0');
      
      expect(changelog).toContain('## [2.0.0]');
      expect(changelog).toContain('### 💥 BREAKING CHANGES');
      expect(changelog).toContain('### 🚀 Features');
      expect(changelog).toContain('### 🐛 Bug Fixes');
      expect(changelog).toContain('### 📚 Docs');
      expect(changelog).toContain('### 🔄 Migration Guide');
      expect(changelog).toContain('redesign authentication system');
      expect(changelog).toContain('API keys now required');
    });

    test('should include package information in changelog', () => {
      const analysis = {
        breaking: [],
        features: [],
        fixes: [],
        other: [],
        suggestedBump: 'patch'
      };

      const changelog = releaseManager.generateChangelog(analysis, '1.0.1');
      
      expect(changelog).toContain('### 📦 Packages Updated');
      expect(changelog).toContain('@ai-spine/tools-core@1.0.1');
      expect(changelog).toContain('@ai-spine/tools@1.0.1');
    });

    test('should generate commit links for GitHub integration', () => {
      const analysis = {
        breaking: [],
        features: [
          {
            hash: 'abc123',
            type: 'feat',
            scope: 'core',
            breaking: false,
            description: 'add new feature',
            raw: 'feat(core): add new feature'
          }
        ],
        fixes: [],
        other: [],
        suggestedBump: 'minor'
      };

      const changelog = releaseManager.generateChangelog(analysis, '1.1.0');
      
      expect(changelog).toContain('([abc123](../../commit/abc123))');
      expect(changelog).toContain('**Full Changelog**: [View all changes]');
    });
  });

  describe('NPM Publishing Workflow', () => {
    test('should publish packages in correct order', async () => {
      execSync.mockImplementation((command, options) => {
        if (command === 'npm run build') return '';
        if (command === 'npm pack --dry-run') return '';
        if (command === 'npm publish --access public') return '';
        if (command.includes('npm view')) return ''; // Package doesn't exist
        return '';
      });

      const results = await releaseManager.publishPackages({ dryRun: false });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'published')).toBe(true);
    });

    test('should skip publishing if version already exists', async () => {
      execSync.mockImplementation((command, options) => {
        if (command.includes('npm view')) return '1.0.0'; // Version exists
        return '';
      });

      const results = await releaseManager.publishPackages({ dryRun: false });
      
      expect(results.every(r => r.status === 'skipped')).toBe(true);
    });

    test('should handle publishing failures gracefully', async () => {
      execSync.mockImplementation((command, options) => {
        if (command === 'npm publish --access public') {
          throw new Error('Publishing failed');
        }
        return '';
      });

      await expect(releaseManager.publishPackages({ dryRun: false }))
        .rejects.toThrow('Publishing failed');
    });

    test('should verify published packages are available', async () => {
      execSync.mockImplementation((command, options) => {
        if (command.includes('npm view')) {
          // Simulate package becoming available after some attempts
          if (command.includes('@ai-spine/tools-core')) return '1.1.0';
          if (command.includes('@ai-spine/tools')) return '1.1.0';
        }
        return '';
      });

      const results = await releaseManager.verifyPublishedPackages('1.1.0', {
        timeout: 10000
      });
      
      expect(results.every(r => r.status === 'verified')).toBe(true);
    });
  });

  describe('Git Tag Management', () => {
    test('should create git tag with correct format', () => {
      execSync.mockImplementation(() => '');
      
      releaseManager.dryRun = false;
      releaseManager.createGitTag('1.1.0');
      
      expect(execSync).toHaveBeenCalledWith('git add .');
      expect(execSync).toHaveBeenCalledWith('git commit -m "chore(release): 1.1.0"');
      expect(execSync).toHaveBeenCalledWith('git tag v1.1.0');
    });

    test('should handle git tag creation failures', () => {
      execSync.mockImplementation(() => {
        throw new Error('Git operation failed');
      });
      
      releaseManager.dryRun = false;
      
      expect(() => releaseManager.createGitTag('1.1.0'))
        .toThrow('Git operation failed');
    });
  });

  describe('Rollback Procedures', () => {
    test('should perform rollback with force flag', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('npm view')) return '1.1.0'; // Version exists
        return '';
      });

      const results = await releaseManager.rollbackRelease('1.1.0', {
        force: true,
        unpublish: true
      });
      
      expect(results.some(r => r.action === 'remove_tag')).toBe(true);
      expect(results.some(r => r.action === 'unpublish')).toBe(true);
    });

    test('should require force flag for rollback', async () => {
      await expect(releaseManager.rollbackRelease('1.1.0', { force: false }))
        .rejects.toThrow('Rollback requires --force flag');
    });

    test('should handle rollback of non-existent versions', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('npm view')) return ''; // Version doesn't exist
        return '';
      });

      const results = await releaseManager.rollbackRelease('1.1.0', {
        force: true,
        unpublish: true
      });
      
      expect(results.some(r => r.status === 'not_found')).toBe(true);
    });
  });

  describe('Pre-release Testing and Validation', () => {
    test('should run comprehensive pre-release checks', async () => {
      execSync.mockImplementation((command) => {
        if (command === 'git status --porcelain') return '';
        if (command === 'git branch --show-current') return 'main';
        if (command === 'npm test') return '';
        if (command === 'npm run build') return '';
        return '';
      });

      const results = await releaseManager.runPreReleaseChecks();
      
      expect(results.every(r => r.passed)).toBe(true);
    });

    test('should fail pre-release checks for dirty working directory', async () => {
      execSync.mockImplementation((command) => {
        if (command === 'git status --porcelain') return 'M package.json';
        return '';
      });

      await expect(releaseManager.runPreReleaseChecks())
        .rejects.toThrow('Pre-release checks failed');
    });

    test('should fail pre-release checks for test failures', async () => {
      execSync.mockImplementation((command) => {
        if (command === 'git status --porcelain') return '';
        if (command === 'git branch --show-current') return 'main';
        if (command === 'npm test') throw new Error('Tests failed');
        return '';
      });

      await expect(releaseManager.runPreReleaseChecks())
        .rejects.toThrow('Pre-release checks failed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const commits = releaseManager.getCommitsSinceLastRelease();
      expect(commits).toEqual([]);
    });

    test('should handle malformed commit messages gracefully', () => {
      const commits = [
        { hash: 'abc123', message: 'invalid commit format' },
        { hash: 'def456', message: '' },
        { hash: 'ghi789', message: 'feat: valid commit' }
      ];

      const analysis = releaseManager.analyzeCommits(commits);
      
      expect(analysis.other.length).toBe(2); // Invalid commits go to 'other'
      expect(analysis.features.length).toBe(1);
    });

    test('should handle network errors during npm operations', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('npm view')) {
          throw new Error('Network error');
        }
        return '';
      });

      const results = await releaseManager.verifyPublishedPackages('1.1.0', {
        timeout: 5000
      });
      
      expect(results.every(r => ['failed', 'timeout'].includes(r.status))).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should perform complete release workflow', async () => {
      // Mock all external dependencies
      execSync.mockImplementation((command, options) => {
        if (command === 'git status --porcelain') return '';
        if (command === 'git branch --show-current') return 'main';
        if (command === 'npm test') return '';
        if (command === 'npm run build') return '';
        if (command.includes('git log')) return 'abc123 feat: add new feature';
        if (command.includes('npm view')) return ''; // Package doesn't exist
        if (command === 'npm run build') return '';
        if (command === 'npm pack --dry-run') return '';
        if (command === 'npm publish --access public') return '';
        return '';
      });

      const result = await releaseManager.performRelease({
        bumpType: 'minor',
        skipPublish: true, // Skip for test
        skipChecks: false
      });
      
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.commits).toBeGreaterThanOrEqual(0);
      expect(result.changes).toBeDefined();
    });

    test('should handle release with publishing enabled', async () => {
      execSync.mockImplementation((command, options) => {
        if (command === 'git status --porcelain') return '';
        if (command === 'git branch --show-current') return 'main';
        if (command === 'npm test') return '';
        if (command === 'npm run build') return '';
        if (command.includes('git log')) return 'def456 fix: bug fix';
        if (command.includes('npm view')) return ''; // Package doesn't exist initially
        if (command === 'npm publish --access public') return '';
        return '';
      });

      releaseManager.dryRun = false;
      
      const result = await releaseManager.performRelease({
        bumpType: 'patch',
        skipPublish: false,
        skipVerify: true, // Skip verification for test speed
        skipChecks: false
      });
      
      expect(result.publishResults).toBeDefined();
      expect(result.publishResults.length).toBe(2);
    });
  });

  describe('Configuration and Options', () => {
    test('should respect dry-run mode', async () => {
      const manager = new ReleaseManager({ dryRun: true });
      manager.rootDir = testTempDir;
      manager.packages = mockPackages;
      manager.currentVersion = '1.0.0';

      const results = await manager.publishPackages();
      
      expect(results.every(r => r.status === 'dry_run')).toBe(true);
    });

    test('should support verbose logging', () => {
      const manager = new ReleaseManager({ verbose: true });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      manager.log('Test message', 'debug');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle custom changelog options', () => {
      const analysis = {
        breaking: [],
        features: [],
        fixes: [],
        other: [],
        suggestedBump: 'patch'
      };

      const changelog = releaseManager.generateChangelog(analysis, '1.0.1', {
        includeCommitLinks: false,
        includePackageInfo: false
      });
      
      expect(changelog).not.toContain('### 📦 Packages Updated');
      expect(changelog).not.toContain('](../../commit/');
    });
  });
});