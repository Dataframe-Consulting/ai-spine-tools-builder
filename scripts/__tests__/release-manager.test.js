/**
 * Tests for ReleaseManager
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ReleaseManager } = require('../release-manager');

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('semver');

describe('ReleaseManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock root package.json
    fs.readFileSync.mockImplementation(filePath => {
      if (filePath.includes('package.json')) {
        return JSON.stringify({
          name: 'ai-spine-tools-sdk',
          version: '1.0.0',
        });
      }
      return '{}';
    });

    // Mock file system for package discovery
    fs.readdirSync.mockReturnValue(['ai-spine-tools-core', 'ai-spine-tools']);
    fs.statSync.mockReturnValue({ isDirectory: () => true });
    fs.existsSync.mockReturnValue(true);

    manager = new ReleaseManager({ verbose: false });
  });

  describe('Version Detection', () => {
    it('should get current version from root package', () => {
      expect(manager.currentVersion).toBe('1.0.0');
    });
  });

  describe('Commit Analysis', () => {
    beforeEach(() => {
      // Mock git commands
      execSync.mockImplementation(command => {
        if (command.includes('git describe --tags')) {
          return 'v0.9.0';
        }
        if (command.includes('git log')) {
          return 'abc123 feat: add new feature\ndef456 fix: resolve bug\nghi789 docs: update readme';
        }
        return '';
      });
    });

    it('should parse conventional commits correctly', () => {
      const commits = manager.getCommitsSinceLastRelease();
      const analysis = manager.analyzeCommits(commits);

      expect(analysis.features).toHaveLength(1);
      expect(analysis.fixes).toHaveLength(1);
      expect(analysis.other).toHaveLength(1);
      expect(analysis.suggestedBump).toBe('minor');
    });

    it('should detect breaking changes', () => {
      execSync.mockImplementation(command => {
        if (command.includes('git log')) {
          return 'abc123 feat!: breaking change\ndef456 fix: normal fix';
        }
        return 'v0.9.0';
      });

      const commits = manager.getCommitsSinceLastRelease();
      const analysis = manager.analyzeCommits(commits);

      expect(analysis.breaking).toHaveLength(1);
      expect(analysis.suggestedBump).toBe('major');
    });
  });

  describe('Changelog Generation', () => {
    it('should generate formatted changelog', () => {
      const analysis = {
        breaking: [
          { hash: 'abc123', description: 'Breaking change', scope: 'api' },
        ],
        features: [
          { hash: 'def456', description: 'New feature', scope: 'core' },
        ],
        fixes: [{ hash: 'ghi789', description: 'Bug fix', scope: null }],
        other: [],
      };

      const changelog = manager.generateChangelog(analysis, '2.0.0');

      expect(changelog).toContain('## [2.0.0]');
      expect(changelog).toContain('### 💥 BREAKING CHANGES');
      expect(changelog).toContain('### 🚀 Features');
      expect(changelog).toContain('### 🐛 Bug Fixes');
      expect(changelog).toContain('Breaking change');
      expect(changelog).toContain('New feature');
      expect(changelog).toContain('Bug fix');
    });
  });

  describe('Version Bumping', () => {
    beforeEach(() => {
      fs.writeFileSync.mockImplementation(() => {});

      // Mock semver
      const semver = require('semver');
      semver.inc.mockImplementation((version, type) => {
        if (type === 'patch') return '1.0.1';
        if (type === 'minor') return '1.1.0';
        if (type === 'major') return '2.0.0';
        return version;
      });
      semver.valid.mockReturnValue(true);
    });

    it('should bump version across all packages', async () => {
      const newVersion = await manager.bumpVersion('minor');

      expect(newVersion).toBe('1.1.0');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should use custom version when provided', async () => {
      const newVersion = await manager.bumpVersion('patch', '1.2.3');

      expect(newVersion).toBe('1.2.3');
    });
  });

  describe('Pre-release Checks', () => {
    beforeEach(() => {
      // Mock git status checks
      execSync.mockImplementation(command => {
        if (command.includes('git status --porcelain')) {
          return ''; // Clean working directory
        }
        if (command.includes('git branch --show-current')) {
          return 'main';
        }
        if (command === 'npm test') {
          return 'All tests passed';
        }
        if (command === 'npm run build') {
          return 'Build successful';
        }
        return '';
      });
    });

    it('should pass all pre-release checks', async () => {
      const results = await manager.runPreReleaseChecks();

      expect(results).toHaveLength(4);
      expect(results.every(r => r.passed)).toBe(true);
    });

    it('should fail on uncommitted changes', async () => {
      execSync.mockImplementation(command => {
        if (command.includes('git status --porcelain')) {
          return 'M package.json'; // Uncommitted changes
        }
        return '';
      });

      await expect(manager.runPreReleaseChecks()).rejects.toThrow();
    });

    it('should fail on wrong branch', async () => {
      execSync.mockImplementation(command => {
        if (command.includes('git branch --show-current')) {
          return 'feature-branch';
        }
        return '';
      });

      await expect(manager.runPreReleaseChecks()).rejects.toThrow();
    });
  });

  describe('Full Release Process', () => {
    beforeEach(() => {
      // Mock all necessary functions
      manager.runPreReleaseChecks = jest.fn().mockResolvedValue([]);
      manager.getCommitsSinceLastRelease = jest.fn().mockReturnValue([]);
      manager.analyzeCommits = jest.fn().mockReturnValue({
        suggestedBump: 'patch',
        breaking: [],
        features: [],
        fixes: [],
        other: [],
      });
      manager.bumpVersion = jest.fn().mockResolvedValue('1.0.1');
      manager.updateChangelogFile = jest.fn();
      manager.createGitTag = jest.fn();
    });

    it('should perform full release process', async () => {
      const result = await manager.performRelease();

      expect(result.version).toBe('1.0.1');
      expect(result.commits).toBe(0);
      expect(manager.runPreReleaseChecks).toHaveBeenCalled();
      expect(manager.bumpVersion).toHaveBeenCalled();
      expect(manager.createGitTag).toHaveBeenCalled();
    });

    it('should skip checks when requested', async () => {
      await manager.performRelease({ skipChecks: true });

      expect(manager.runPreReleaseChecks).not.toHaveBeenCalled();
    });

    it('should use custom bump type', async () => {
      await manager.performRelease({ bumpType: 'major' });

      expect(manager.bumpVersion).toHaveBeenCalledWith('major', undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle git command failures gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      const commits = manager.getCommitsSinceLastRelease();
      expect(commits).toEqual([]);
    });

    it('should handle file system errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        new ReleaseManager();
      }).toThrow();
    });
  });
});
