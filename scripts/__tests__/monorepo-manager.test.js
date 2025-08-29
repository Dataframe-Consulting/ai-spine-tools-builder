/**
 * Tests for MonorepoManager
 */

const fs = require('fs');
const path = require('path');
const { MonorepoManager } = require('../monorepo-manager');

// Mock file system operations
jest.mock('fs');
jest.mock('child_process');

describe('MonorepoManager', () => {
  let manager;
  let mockPackages;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock file system structure
    mockPackages = {
      '@ai-spine/tools-core': {
        name: '@ai-spine/tools-core',
        version: '1.0.0',
        dependencies: {},
        devDependencies: {}
      },
      '@ai-spine/tools': {
        name: '@ai-spine/tools',
        version: '1.0.0',
        dependencies: {
          '@ai-spine/tools-core': '^1.0.0'
        }
      }
    };

    // Mock fs.readdirSync to return package directories
    fs.readdirSync.mockImplementation((dirPath) => {
      if (dirPath.includes('packages')) {
        return Object.keys(mockPackages).map(name => name.replace('@ai-spine/', ''));
      }
      return [];
    });

    // Mock fs.statSync to return directory info
    fs.statSync.mockReturnValue({ isDirectory: () => true });

    // Mock fs.existsSync to return true for package.json files
    fs.existsSync.mockImplementation((filePath) => {
      return filePath.includes('package.json');
    });

    // Mock fs.readFileSync to return package.json content
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('package.json')) {
        const packageName = Object.keys(mockPackages).find(name => 
          filePath.includes(name.replace('@ai-spine/', ''))
        );
        if (packageName) {
          return JSON.stringify(mockPackages[packageName]);
        }
      }
      return '{}';
    });

    manager = new MonorepoManager({ verbose: false });
  });

  describe('Package Discovery', () => {
    it('should discover packages correctly', () => {
      expect(manager.packages.size).toBe(2);
      expect(manager.packages.has('@ai-spine/tools-core')).toBe(true);
      expect(manager.packages.has('@ai-spine/tools')).toBe(true);
    });

    it('should build dependency graph', () => {
      const corePackage = manager.dependencyGraph.get('@ai-spine/tools-core');
      const toolsPackage = manager.dependencyGraph.get('@ai-spine/tools');

      expect(corePackage.internalDependencies).toHaveLength(0);
      expect(toolsPackage.internalDependencies).toContain('@ai-spine/tools-core');
    });

    it('should determine topological order', () => {
      const order = manager.getTopologicalOrder();
      
      expect(order).toEqual(['@ai-spine/tools-core', '@ai-spine/tools']);
    });
  });

  describe('Version Management', () => {
    beforeEach(() => {
      // Mock fs.writeFileSync
      fs.writeFileSync.mockImplementation(() => {});
    });

    it('should update versions across packages', async () => {
      await manager.updateVersion('1.1.0');

      // Should have called writeFileSync for each package + root
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    });

    it('should sync dependency versions', async () => {
      const conflicts = await manager.syncDependencyVersions();
      
      expect(conflicts).toEqual([]);
    });
  });

  describe('Build Management', () => {
    const { spawn } = require('child_process');

    beforeEach(() => {
      // Mock child process for build commands
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success
          }
        }),
        stdout: null,
        stderr: null
      };
      
      spawn.mockReturnValue(mockChild);
    });

    it('should build packages in dependency order', async () => {
      const results = await manager.buildPackages(false); // Sequential
      
      expect(results.size).toBe(2);
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('should handle build failures', async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Failure
          }
        }),
        stdout: null,
        stderr: null
      };
      
      spawn.mockReturnValue(mockChild);

      const results = await manager.buildPackages(false);
      
      expect(results.has('@ai-spine/tools-core')).toBe(true);
    });
  });

  describe('Health Reporting', () => {
    it('should generate health report', () => {
      const health = manager.generateHealthReport();
      
      expect(health).toHaveProperty('packages');
      expect(health).toHaveProperty('dependencies');
      expect(health).toHaveProperty('buildOrder');
      expect(health).toHaveProperty('coverage');

      expect(health.packages).toBe(2);
      expect(health.buildOrder).toEqual(['@ai-spine/tools-core', '@ai-spine/tools']);
    });
  });

  describe('Error Handling', () => {
    it('should detect circular dependencies', () => {
      // Modify mock to create circular dependency
      mockPackages['@ai-spine/tools-core'].dependencies = {
        '@ai-spine/tools': '^1.0.0'
      };

      expect(() => {
        new MonorepoManager({ verbose: false });
      }).toThrow('Circular dependency detected');
    });

    it('should handle missing package.json files', () => {
      fs.existsSync.mockReturnValue(false);

      const emptyManager = new MonorepoManager({ verbose: false });
      expect(emptyManager.packages.size).toBe(0);
    });
  });
});