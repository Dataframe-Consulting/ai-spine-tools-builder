/**
 * Tests for TestCoordinator
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { TestCoordinator } = require('../test-coordinator');

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');

describe('TestCoordinator', () => {
  let coordinator;
  let mockPackages;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock packages with test scripts
    mockPackages = {
      'ai-spine-tools-core': {
        name: '@ai-spine/tools-core',
        scripts: { test: 'jest' }
      },
      'ai-spine-tools': {
        name: '@ai-spine/tools',
        scripts: { test: 'jest', 'test:coverage': 'jest --coverage' }
      }
    };

    // Mock file system
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath.includes('packages')) {
        return Object.keys(mockPackages);
      }
      return [];
    });

    fs.statSync.mockReturnValue({ isDirectory: () => true });
    fs.existsSync.mockReturnValue(true);

    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('package.json')) {
        const packageName = Object.keys(mockPackages).find(name => 
          filePath.includes(name)
        );
        if (packageName) {
          return JSON.stringify(mockPackages[packageName]);
        }
      }
      return '{}';
    });

    coordinator = new TestCoordinator({ verbose: false });
  });

  describe('Package Discovery', () => {
    it('should discover packages with test scripts', () => {
      expect(coordinator.packages).toHaveLength(2);
      expect(coordinator.packages.every(pkg => pkg.packageJson.scripts.test)).toBe(true);
    });

    it('should detect test files', () => {
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('__tests__')) return true;
        return path.includes('package.json');
      });

      fs.readdirSync.mockImplementation((path, options) => {
        if (path.includes('__tests__')) {
          return ['example.test.js', 'another.spec.ts'];
        }
        return [];
      });

      const testInfo = coordinator.hasTestFiles('/mock/package/path');
      expect(testInfo).toBeTruthy();
      expect(testInfo.count).toBe(2);
    });
  });

  describe('Test Execution', () => {
    let mockChild;

    beforeEach(() => {
      mockChild = {
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      spawn.mockReturnValue(mockChild);
    });

    it('should run tests for single package', async () => {
      // Mock successful test run
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10); // Success
        }
      });

      const testPromise = coordinator.runPackageTests(coordinator.packages[0]);
      
      // Trigger close event
      const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(0);

      const result = await testPromise;
      expect(result.code).toBe(0);
    });

    it('should handle test failures', async () => {
      // Mock failed test run
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10); // Failure
        }
      });

      const testPromise = coordinator.runPackageTests(coordinator.packages[0]);
      
      // Trigger close event
      const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(1);

      await expect(testPromise).rejects.toThrow();
    });

    it('should run tests in parallel', async () => {
      // Mock successful runs
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      coordinator.runPackageTests = jest.fn().mockResolvedValue({ code: 0, duration: 100 });

      const results = await coordinator.runTestsParallel(coordinator.packages);
      
      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(coordinator.runPackageTests).toHaveBeenCalledTimes(2);
    });

    it('should run tests sequentially', async () => {
      coordinator.runPackageTests = jest.fn().mockResolvedValue({ code: 0, duration: 100 });

      const results = await coordinator.runTestsSequential(coordinator.packages);
      
      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
    });
  });

  describe('Coverage Extraction', () => {
    it('should extract Jest coverage information', () => {
      const output = `
        Test Suites: 2 passed, 2 total
        Tests:       10 passed, 10 total
        All files    |   85.5  |   90.2  |   75.8  |   88.1
      `;

      const coverage = coordinator.extractCoverage(output);
      
      expect(coverage).toEqual({
        statements: 85.5,
        branches: 90.2,
        functions: 75.8,
        lines: 88.1
      });
    });

    it('should extract test statistics', () => {
      const output = `
        Test Suites: 2 passed, 2 total
        Tests:       8 passed, 10 total
      `;

      const stats = coordinator.extractTestStats(output);
      
      expect(stats.passed).toBe(8);
      expect(stats.total).toBe(10);
      expect(stats.failed).toBe(2);
      expect(stats.suites).toBe(2);
    });

    it('should handle missing coverage data', () => {
      const output = 'No coverage information';
      const coverage = coordinator.extractCoverage(output);
      
      expect(coverage).toBeNull();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive test report', () => {
      const results = {
        success: [
          {
            package: { name: '@ai-spine/tools-core' },
            result: {
              duration: 1000,
              testStats: { total: 10, passed: 10, failed: 0 },
              coverage: { lines: 85 }
            }
          }
        ],
        failed: []
      };

      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = coordinator.generateTestReport(results);

      expect(success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      // Check that report contains expected sections
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Test Execution Report');
      expect(output).toContain('Summary');
      
      consoleSpy.mockRestore();
    });

    it('should handle failed tests in report', () => {
      const results = {
        success: [],
        failed: [
          {
            package: { name: '@ai-spine/tools' },
            error: new Error('Tests failed')
          }
        ]
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = coordinator.generateTestReport(results);

      expect(success).toBe(false);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Failed Packages');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Analysis', () => {
    it('should print test overview', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      coordinator.printTestOverview();

      expect(consoleSpy).toHaveBeenCalled();
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Test Overview');
      expect(output).toContain('Packages with Tests');
      
      consoleSpy.mockRestore();
    });

    it('should detect test runners', () => {
      coordinator.printTestOverview();
      
      // Should detect Jest as test runner for both packages
      expect(coordinator.packages.every(pkg => 
        pkg.packageJson.scripts.test.includes('jest')
      )).toBe(true);
    });
  });

  describe('Badge Generation', () => {
    beforeEach(() => {
      coordinator.testResults.set('@ai-spine/tools-core', {
        code: 0,
        coverage: { lines: 85 }
      });
      coordinator.testResults.set('@ai-spine/tools', {
        code: 1,
        coverage: { lines: 60 }
      });
    });

    it('should generate test badges', () => {
      const badges = coordinator.generateTestBadges();
      
      expect(badges.has('@ai-spine/tools-core')).toBe(true);
      expect(badges.has('@ai-spine/tools')).toBe(true);
      
      const coreBadges = badges.get('@ai-spine/tools-core');
      expect(coreBadges.testBadge).toContain('passing');
      expect(coreBadges.coverage).toContain('85%');
      
      const toolsBadges = badges.get('@ai-spine/tools');
      expect(toolsBadges.testBadge).toContain('failing');
    });
  });

  describe('Error Handling', () => {
    it('should handle spawn errors', async () => {
      spawn.mockImplementation(() => {
        const child = {
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Spawn failed')), 10);
            }
          }),
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() }
        };
        return child;
      });

      await expect(coordinator.runPackageTests(coordinator.packages[0])).rejects.toThrow('Spawn failed');
    });

    it('should handle missing test scripts gracefully', () => {
      mockPackages['ai-spine-tools-core'].scripts = {}; // Remove test script
      
      const newCoordinator = new TestCoordinator({ verbose: false });
      expect(newCoordinator.packages).toHaveLength(1); // Only one package has test script
    });
  });
});