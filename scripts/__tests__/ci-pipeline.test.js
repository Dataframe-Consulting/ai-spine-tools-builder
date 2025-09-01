/**
 * CI Pipeline Integration Tests
 * 
 * This test suite validates the CI pipeline scripts and configurations
 * to ensure they work correctly in various scenarios.
 * 
 * @group integration
 * @group ci-pipeline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('CI Pipeline Functionality', () => {
  const rootDir = path.join(__dirname, '..', '..');
  const scriptsDir = path.join(__dirname, '..');
  
  beforeAll(() => {
    // Ensure we're in the right directory
    expect(fs.existsSync(path.join(rootDir, 'package.json'))).toBe(true);
  });

  describe('GitHub Actions Workflows', () => {
    const workflowsDir = path.join(rootDir, '.github', 'workflows');
    
    test('should have main CI workflow file', () => {
      const ciWorkflowPath = path.join(workflowsDir, 'ci.yml');
      expect(fs.existsSync(ciWorkflowPath)).toBe(true);
      
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      expect(content).toContain('name: CI Pipeline');
      expect(content).toContain('on:');
      expect(content).toContain('jobs:');
    });

    test('should have PR checks workflow', () => {
      const prWorkflowPath = path.join(workflowsDir, 'pr-checks.yml');
      expect(fs.existsSync(prWorkflowPath)).toBe(true);
      
      const content = fs.readFileSync(prWorkflowPath, 'utf8');
      expect(content).toContain('name: PR Checks');
      expect(content).toContain('pull_request:');
    });

    test('CI workflow should include all required jobs', () => {
      const ciWorkflowPath = path.join(workflowsDir, 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      // Check for required job names
      const requiredJobs = [
        'preflight',
        'quality',
        'security', 
        'test',
        'build',
        'performance',
        'status'
      ];
      
      requiredJobs.forEach(job => {
        expect(content).toMatch(new RegExp(`\\s+${job}:`));
      });
    });

    test('CI workflow should use correct Node.js versions', () => {
      const ciWorkflowPath = path.join(workflowsDir, 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      expect(content).toContain('18.x');
      expect(content).toContain('20.x');
      expect(content).toContain('21.x');
    });

    test('CI workflow should test on multiple platforms', () => {
      const ciWorkflowPath = path.join(workflowsDir, 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      expect(content).toContain('ubuntu-latest');
      expect(content).toContain('windows-latest');  
      expect(content).toContain('macos-latest');
    });
  });

  describe('Dependabot Configuration', () => {
    test('should have dependabot configuration', () => {
      const dependabotPath = path.join(rootDir, '.github', 'dependabot.yml');
      expect(fs.existsSync(dependabotPath)).toBe(true);
      
      const content = fs.readFileSync(dependabotPath, 'utf8');
      expect(content).toContain('version: 2');
      expect(content).toContain('updates:');
      expect(content).toContain('package-ecosystem: "npm"');
    });

    test('dependabot should cover all packages', () => {
      const dependabotPath = path.join(rootDir, '.github', 'dependabot.yml');
      const content = fs.readFileSync(dependabotPath, 'utf8');
      
      // Check for main directories
      expect(content).toContain('directory: "/"');
      expect(content).toContain('/packages/ai-spine-tools-core');
      expect(content).toContain('/packages/ai-spine-tools');
      expect(content).toContain('/packages/ai-spine-tools-testing');
      expect(content).toContain('/packages/create-ai-spine-tool');
    });
  });

  describe('Security Configuration', () => {
    test('should have CodeQL configuration', () => {
      const codeqlPath = path.join(rootDir, '.github', 'codeql-config.yml');
      expect(fs.existsSync(codeqlPath)).toBe(true);
      
      const content = fs.readFileSync(codeqlPath, 'utf8');
      expect(content).toContain('name: "AI Spine Tools CodeQL Config"');
      expect(content).toContain('packs:');
    });

    test('should have audit-ci configuration', () => {
      const auditCiPath = path.join(rootDir, 'audit-ci.json');
      expect(fs.existsSync(auditCiPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(auditCiPath, 'utf8'));
      expect(config).toHaveProperty('high', true);
      expect(config).toHaveProperty('critical', true);
      expect(config).toHaveProperty('package-manager', 'npm');
    });
  });

  describe('Performance Testing Scripts', () => {
    test('should have performance test script', () => {
      const perfTestPath = path.join(scriptsDir, 'performance-test.js');
      expect(fs.existsSync(perfTestPath)).toBe(true);
      
      const content = fs.readFileSync(perfTestPath, 'utf8');
      expect(content).toContain('class PerformanceTester');
      expect(content).toContain('testToolCreation');
      expect(content).toContain('testRequestProcessing');
    });

    test('should have performance regression script', () => {
      const regressionTestPath = path.join(scriptsDir, 'performance-regression.js');
      expect(fs.existsSync(regressionTestPath)).toBe(true);
      
      const content = fs.readFileSync(regressionTestPath, 'utf8');
      expect(content).toContain('class RegressionAnalyzer');
      expect(content).toContain('runAnalysis');
    });

    test('performance test script should be executable', () => {
      const perfTestPath = path.join(scriptsDir, 'performance-test.js');
      
      // Test with dry run (no actual performance testing)
      expect(() => {
        const result = execSync(`node "${perfTestPath}" --test=tool-creation --iterations=1`, {
          cwd: rootDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
  });

  describe('API Analysis Scripts', () => {
    test('should have API extraction script', () => {
      const extractApiPath = path.join(scriptsDir, 'extract-api.js');
      expect(fs.existsSync(extractApiPath)).toBe(true);
      
      const content = fs.readFileSync(extractApiPath, 'utf8');
      expect(content).toContain('class APIExtractor');
      expect(content).toContain('extractAPI');
    });

    test('should have API comparison script', () => {
      const compareApiPath = path.join(scriptsDir, 'compare-api.js');
      expect(fs.existsSync(compareApiPath)).toBe(true);
      
      const content = fs.readFileSync(compareApiPath, 'utf8');
      expect(content).toContain('class APIComparator');
      expect(content).toContain('compareAPIs');
    });

    test('API extraction should handle missing build directory gracefully', () => {
      const extractApiPath = path.join(scriptsDir, 'extract-api.js');
      
      // Test with verbose flag to see what happens
      expect(() => {
        const result = execSync(`node "${extractApiPath}" --verbose`, {
          cwd: rootDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
  });

  describe('Script Integration', () => {
    test('scripts should have consistent error handling', () => {
      const scriptFiles = [
        'performance-test.js',
        'performance-regression.js', 
        'extract-api.js',
        'compare-api.js'
      ];
      
      scriptFiles.forEach(scriptFile => {
        const scriptPath = path.join(scriptsDir, scriptFile);
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Check for error handling patterns
        expect(content).toMatch(/catch\s*\(\s*error\s*\)/);
        expect(content).toMatch(/process\.exit\(1\)/);
        expect(content).toMatch(/console\.error|this\.log.*error/i);
      });
    });

    test('scripts should have CLI interfaces', () => {
      const scriptFiles = [
        'performance-test.js',
        'performance-regression.js',
        'extract-api.js',
        'compare-api.js'
      ];
      
      scriptFiles.forEach(scriptFile => {
        const scriptPath = path.join(scriptsDir, scriptFile);
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Check for CLI handling
        expect(content).toContain('if (require.main === module)');
        expect(content).toContain('process.argv');
      });
    });
  });

  describe('Configuration Validation', () => {
    test('package.json should have all required CI scripts', () => {
      const packagePath = path.join(rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const requiredScripts = [
        'build',
        'test',
        'lint', 
        'test:coverage',
        'build:verify',
        'prerelease'
      ];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });

    test('TypeScript configuration should be CI-friendly', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.compilerOptions).toHaveProperty('strict', true);
      expect(tsconfig.compilerOptions).toHaveProperty('noImplicitAny', true);
      expect(tsconfig.compilerOptions).toHaveProperty('sourceMap', true);
    });

    test('ESLint configuration should be appropriate for CI', () => {
      const eslintPath = path.join(rootDir, '.eslintrc.json');
      const eslintConfig = JSON.parse(fs.readFileSync(eslintPath, 'utf8'));
      
      expect(eslintConfig).toHaveProperty('extends');
      expect(eslintConfig).toHaveProperty('rules');
      expect(eslintConfig.rules).toHaveProperty('prettier/prettier', 'error');
    });
  });

  describe('Workflow Dependencies', () => {
    test('CI workflow should have proper job dependencies', () => {
      const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      // Check that jobs have proper dependencies
      expect(content).toMatch(/needs:\s*\[.*preflight.*\]/);
      expect(content).toMatch(/needs:\s*\[.*quality.*\]/);
      expect(content).toMatch(/needs:\s*\[.*build.*\]/);
    });

    test('CI workflow should have appropriate timeouts', () => {
      const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      // Check for timeout configurations
      expect(content).toContain('timeout-minutes:');
      
      // Should not have excessive timeouts
      const timeoutMatches = content.match(/timeout-minutes:\s*(\d+)/g);
      if (timeoutMatches) {
        timeoutMatches.forEach(match => {
          const timeout = parseInt(match.match(/\d+/)[0]);
          expect(timeout).toBeLessThanOrEqual(30); // Max 30 minutes per job
        });
      }
    });
  });

  describe('Environment Variables', () => {
    test('CI workflow should set appropriate environment variables', () => {
      const ciWorkflowPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
      const content = fs.readFileSync(ciWorkflowPath, 'utf8');
      
      expect(content).toContain('CI: true');
      expect(content).toContain('NODE_OPTIONS');
    });
  });
});