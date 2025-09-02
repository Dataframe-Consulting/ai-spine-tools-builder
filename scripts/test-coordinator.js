#!/usr/bin/env node

/**
 * Test Coordination Script
 * Manages testing across packages with coverage aggregation and reporting
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
 * Test coordinator for monorepo
 */
class TestCoordinator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.coverage = options.coverage || false;
    this.parallel = options.parallel !== false; // Default to true
    this.watch = options.watch || false;
    this.rootDir = path.resolve(__dirname, '..');
    this.packagesDir = path.join(this.rootDir, 'packages');
    this.examplesDir = path.join(this.rootDir, 'examples');

    this.packages = this.discoverPackages();
    this.testResults = new Map();
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
   * Discover all packages with tests
   */
  discoverPackages() {
    const packages = [];

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

          // Check if package has test script
          if (packageJson.scripts && packageJson.scripts.test) {
            packages.push({
              name: packageJson.name || dir,
              path: packagePath,
              packageJson,
              type: 'package',
              directory: dir,
              hasTests: this.hasTestFiles(packagePath),
            });
          }
        }
      }
    }

    // Discover examples with tests
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

          if (packageJson.scripts && packageJson.scripts.test) {
            packages.push({
              name: packageJson.name || dir,
              path: examplePath,
              packageJson,
              type: 'example',
              directory: dir,
              hasTests: this.hasTestFiles(examplePath),
            });
          }
        }
      }
    }

    this.log(
      `Discovered ${packages.length} packages with test scripts`,
      'debug'
    );
    return packages;
  }

  /**
   * Check if a package has test files
   */
  hasTestFiles(packagePath) {
    const testPaths = [
      path.join(packagePath, 'src', '__tests__'),
      path.join(packagePath, 'tests'),
      path.join(packagePath, 'test'),
      path.join(packagePath, '__tests__'),
    ];

    for (const testPath of testPaths) {
      if (fs.existsSync(testPath)) {
        const files = fs.readdirSync(testPath, { recursive: true });
        const testFiles = files.filter(file =>
          /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(file.toString())
        );

        if (testFiles.length > 0) {
          return { path: testPath, count: testFiles.length };
        }
      }
    }

    // Also check for test files in src directory
    const srcPath = path.join(packagePath, 'src');
    if (fs.existsSync(srcPath)) {
      try {
        const files = this.findTestFiles(srcPath);
        if (files.length > 0) {
          return { path: srcPath, count: files.length };
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return null;
  }

  /**
   * Recursively find test files
   */
  findTestFiles(dir) {
    let testFiles = [];

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          testFiles = testFiles.concat(this.findTestFiles(filePath));
        } else if (/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(file)) {
          testFiles.push(filePath);
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return testFiles;
  }

  /**
   * Run tests for all packages
   */
  async runAllTests(packageNames = []) {
    this.log('Starting test execution across packages...', 'info');

    const packagesToTest =
      packageNames.length > 0
        ? this.packages.filter(pkg => packageNames.includes(pkg.name))
        : this.packages;

    if (packagesToTest.length === 0) {
      this.log('No packages with tests found', 'warning');
      return;
    }

    let results;
    if (this.parallel) {
      results = await this.runTestsParallel(packagesToTest);
    } else {
      results = await this.runTestsSequential(packagesToTest);
    }

    this.generateTestReport(results);
    return results;
  }

  /**
   * Run tests in parallel
   */
  async runTestsParallel(packages) {
    this.log(
      `Running tests for ${packages.length} packages in parallel...`,
      'info'
    );

    const promises = packages.map(pkg => this.runPackageTests(pkg));
    const results = await Promise.allSettled(promises);

    const successResults = [];
    const failedResults = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pkg = packages[i];

      if (result.status === 'fulfilled') {
        successResults.push({ package: pkg, result: result.value });
      } else {
        failedResults.push({ package: pkg, error: result.reason });
      }
    }

    return { success: successResults, failed: failedResults };
  }

  /**
   * Run tests sequentially
   */
  async runTestsSequential(packages) {
    this.log(
      `Running tests for ${packages.length} packages sequentially...`,
      'info'
    );

    const successResults = [];
    const failedResults = [];

    for (const pkg of packages) {
      try {
        const result = await this.runPackageTests(pkg);
        successResults.push({ package: pkg, result });
      } catch (error) {
        failedResults.push({ package: pkg, error });

        // In sequential mode, we might want to stop on first failure
        if (!this.verbose) {
          this.log(
            `Tests failed for ${pkg.name}, stopping sequential execution`,
            'error'
          );
          break;
        }
      }
    }

    return { success: successResults, failed: failedResults };
  }

  /**
   * Run tests for a single package
   */
  async runPackageTests(pkg) {
    return new Promise((resolve, reject) => {
      this.log(`Running tests for ${pkg.name}...`, 'info');

      const testCommand = this.coverage ? 'test:coverage' : 'test';
      const script =
        pkg.packageJson.scripts[testCommand] || pkg.packageJson.scripts.test;

      const startTime = Date.now();
      const child = spawn(
        'npm',
        [
          'run',
          this.coverage && pkg.packageJson.scripts['test:coverage']
            ? 'test:coverage'
            : 'test',
        ],
        {
          cwd: pkg.path,
          stdio: this.verbose ? 'inherit' : 'pipe',
          shell: true,
          env: {
            ...process.env,
            CI: 'true', // Ensure tests run in CI mode
          },
        }
      );

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', data => {
          stdout += data;
          if (this.verbose) {
            process.stdout.write(`[${pkg.name}] ${data}`);
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', data => {
          stderr += data;
          if (this.verbose) {
            process.stderr.write(`[${pkg.name}] ${data}`);
          }
        });
      }

      child.on('close', code => {
        const duration = Date.now() - startTime;
        const result = {
          code,
          duration,
          stdout,
          stderr,
          coverage: this.extractCoverage(stdout),
          testStats: this.extractTestStats(stdout),
        };

        this.testResults.set(pkg.name, result);

        if (code === 0) {
          this.log(`Tests passed for ${pkg.name} (${duration}ms)`, 'success');
          resolve(result);
        } else {
          this.log(`Tests failed for ${pkg.name} (${duration}ms)`, 'error');
          reject(new Error(`Tests failed with code ${code}. ${stderr}`));
        }
      });

      child.on('error', error => {
        const duration = Date.now() - startTime;
        this.log(
          `Failed to run tests for ${pkg.name}: ${error.message}`,
          'error'
        );
        reject(error);
      });
    });
  }

  /**
   * Extract coverage information from test output
   */
  extractCoverage(output) {
    // Look for Jest coverage output
    const coverageRegex =
      /All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/;
    const match = output.match(coverageRegex);

    if (match) {
      return {
        statements: parseFloat(match[1]),
        branches: parseFloat(match[2]),
        functions: parseFloat(match[3]),
        lines: parseFloat(match[4]),
      };
    }

    return null;
  }

  /**
   * Extract test statistics from output
   */
  extractTestStats(output) {
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: 0,
    };

    // Jest output patterns
    const testSuiteMatch = output.match(
      /Test Suites: (\d+) passed.*?(\d+) total/
    );
    if (testSuiteMatch) {
      stats.suites = parseInt(testSuiteMatch[2]);
    }

    const testMatch = output.match(/Tests:\s+(\d+) passed.*?(\d+) total/);
    if (testMatch) {
      stats.passed = parseInt(testMatch[1]);
      stats.total = parseInt(testMatch[2]);
      stats.failed = stats.total - stats.passed;
    }

    return stats;
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(results) {
    console.log(
      `\n${colors.bold}${colors.cyan}📊 Test Execution Report${colors.reset}`
    );
    console.log('='.repeat(60));

    const { success, failed } = results;
    const totalPackages = success.length + failed.length;

    // Summary
    console.log(`\n${colors.bold}📋 Summary${colors.reset}`);
    console.log(`Total packages tested: ${totalPackages}`);
    console.log(`Passed: ${colors.green}${success.length}${colors.reset}`);
    console.log(`Failed: ${colors.red}${failed.length}${colors.reset}`);

    // Timing information
    let totalDuration = 0;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const { result } of success) {
      totalDuration += result.duration;
      if (result.testStats) {
        totalTests += result.testStats.total;
        totalPassed += result.testStats.passed;
        totalFailed += result.testStats.failed;
      }
    }

    console.log(`\n${colors.bold}🕐 Timing${colors.reset}`);
    console.log(`Total test time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(
      `Average time per package: ${(totalDuration / totalPackages / 1000).toFixed(2)}s`
    );

    console.log(`\n${colors.bold}🧪 Test Statistics${colors.reset}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed tests: ${colors.green}${totalPassed}${colors.reset}`);
    console.log(`Failed tests: ${colors.red}${totalFailed}${colors.reset}`);

    // Coverage summary
    if (this.coverage) {
      console.log(`\n${colors.bold}📈 Coverage Summary${colors.reset}`);
      const coverageData = [];

      for (const { package: pkg, result } of success) {
        if (result.coverage) {
          coverageData.push({
            name: pkg.name,
            ...result.coverage,
          });
        }
      }

      if (coverageData.length > 0) {
        const avgCoverage = {
          statements:
            coverageData.reduce((sum, c) => sum + c.statements, 0) /
            coverageData.length,
          branches:
            coverageData.reduce((sum, c) => sum + c.branches, 0) /
            coverageData.length,
          functions:
            coverageData.reduce((sum, c) => sum + c.functions, 0) /
            coverageData.length,
          lines:
            coverageData.reduce((sum, c) => sum + c.lines, 0) /
            coverageData.length,
        };

        console.log(
          `Average statements: ${avgCoverage.statements.toFixed(1)}%`
        );
        console.log(`Average branches: ${avgCoverage.branches.toFixed(1)}%`);
        console.log(`Average functions: ${avgCoverage.functions.toFixed(1)}%`);
        console.log(`Average lines: ${avgCoverage.lines.toFixed(1)}%`);
      }
    }

    // Detailed results
    if (success.length > 0) {
      console.log(
        `\n${colors.bold}${colors.green}✅ Successful Packages${colors.reset}`
      );
      for (const { package: pkg, result } of success) {
        console.log(`  ${pkg.name}: ${(result.duration / 1000).toFixed(2)}s`);
        if (result.testStats && result.testStats.total > 0) {
          console.log(
            `    Tests: ${result.testStats.passed}/${result.testStats.total} passed`
          );
        }
        if (result.coverage) {
          console.log(`    Coverage: ${result.coverage.lines}% lines`);
        }
      }
    }

    if (failed.length > 0) {
      console.log(
        `\n${colors.bold}${colors.red}❌ Failed Packages${colors.reset}`
      );
      for (const { package: pkg, error } of failed) {
        console.log(
          `  ${colors.red}${pkg.name}${colors.reset}: ${error.message.split('\n')[0]}`
        );
      }
    }

    // Final status
    const overallSuccess = failed.length === 0;
    console.log(
      `\n${overallSuccess ? colors.green + '🎉 All tests passed!' : colors.red + '💥 Some tests failed!'}${colors.reset}`
    );

    return overallSuccess;
  }

  /**
   * Watch mode - run tests when files change
   */
  async watchMode() {
    this.log('Starting test watch mode...', 'info');

    // This is a simplified implementation - in real world you'd use chokidar or similar
    const watchPackages = this.packages.filter(
      pkg => pkg.packageJson.scripts['test:watch'] || pkg.hasTests
    );

    if (watchPackages.length === 0) {
      this.log('No packages with watch capabilities found', 'warning');
      return;
    }

    this.log(
      `Watching ${watchPackages.length} packages for changes...`,
      'info'
    );

    // Start watchers for each package
    const watchers = [];

    for (const pkg of watchPackages) {
      try {
        const watcher = spawn('npm', ['run', 'test:watch'], {
          cwd: pkg.path,
          stdio: 'inherit',
          shell: true,
        });

        watchers.push({ package: pkg, watcher });
        this.log(`Started watcher for ${pkg.name}`, 'success');
      } catch (error) {
        this.log(
          `Failed to start watcher for ${pkg.name}: ${error.message}`,
          'error'
        );
      }
    }

    // Cleanup on exit
    process.on('SIGINT', () => {
      this.log('Stopping all watchers...', 'info');
      for (const { watcher } of watchers) {
        watcher.kill('SIGTERM');
      }
      process.exit(0);
    });

    // Keep the process running
    return new Promise(() => {});
  }

  /**
   * Generate test badges for README files
   */
  generateTestBadges() {
    this.log('Generating test badges...', 'info');

    const badges = new Map();

    for (const [packageName, result] of this.testResults) {
      const passed = result.code === 0;
      const badge = passed
        ? '![Tests](https://img.shields.io/badge/tests-passing-brightgreen)'
        : '![Tests](https://img.shields.io/badge/tests-failing-red)';

      badges.set(packageName, {
        testBadge: badge,
        coverage: result.coverage
          ? `![Coverage](https://img.shields.io/badge/coverage-${result.coverage.lines}%25-${result.coverage.lines > 80 ? 'brightgreen' : result.coverage.lines > 60 ? 'yellow' : 'red'})`
          : null,
      });
    }

    return badges;
  }

  /**
   * Print test overview
   */
  printTestOverview() {
    console.log(`${colors.bold}${colors.cyan}🧪 Test Overview${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`\n${colors.bold}📦 Packages with Tests${colors.reset}`);
    for (const pkg of this.packages) {
      const testInfo = pkg.hasTests;
      const status = testInfo
        ? `${testInfo.count} test files`
        : 'No tests found';
      const testScript = pkg.packageJson.scripts.test || 'No test script';

      console.log(`${pkg.name}:`);
      console.log(`  Type: ${pkg.type}`);
      console.log(`  Tests: ${status}`);
      console.log(`  Script: ${testScript}`);

      if (testInfo) {
        console.log(
          `  Location: ${path.relative(this.rootDir, testInfo.path)}`
        );
      }
    }

    // Test script analysis
    console.log(`\n${colors.bold}🔧 Test Configuration${colors.reset}`);
    const testRunners = {};
    const testScripts = {};

    for (const pkg of this.packages) {
      const scripts = pkg.packageJson.scripts || {};

      // Detect test runner
      if (scripts.test) {
        if (scripts.test.includes('jest')) {
          testRunners.jest = (testRunners.jest || 0) + 1;
        } else if (scripts.test.includes('mocha')) {
          testRunners.mocha = (testRunners.mocha || 0) + 1;
        } else if (scripts.test.includes('vitest')) {
          testRunners.vitest = (testRunners.vitest || 0) + 1;
        } else {
          testRunners.other = (testRunners.other || 0) + 1;
        }
      }

      // Count script types
      for (const script of ['test', 'test:watch', 'test:coverage']) {
        if (scripts[script]) {
          testScripts[script] = (testScripts[script] || 0) + 1;
        }
      }
    }

    console.log('Test runners:');
    for (const [runner, count] of Object.entries(testRunners)) {
      console.log(`  ${runner}: ${count} packages`);
    }

    console.log('Available scripts:');
    for (const [script, count] of Object.entries(testScripts)) {
      console.log(`  ${script}: ${count} packages`);
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
    coverage: args.includes('--coverage') || args.includes('-c'),
    parallel: !args.includes('--sequential'),
    watch: args.includes('--watch') || args.includes('-w'),
  };

  const coordinator = new TestCoordinator(options);

  try {
    switch (command) {
      case 'run':
        const packagesForTest = args
          .slice(1)
          .filter(arg => !arg.startsWith('--'));
        if (options.watch) {
          await coordinator.watchMode();
        } else {
          const success = await coordinator.runAllTests(packagesForTest);
          process.exit(success ? 0 : 1);
        }
        break;

      case 'watch':
        await coordinator.watchMode();
        break;

      case 'overview':
        coordinator.printTestOverview();
        break;

      case 'badges':
        const badges = coordinator.generateTestBadges();
        console.log(JSON.stringify(Object.fromEntries(badges), null, 2));
        break;

      default:
        console.log(
          `${colors.bold}AI Spine Tools Test Coordinator${colors.reset}`
        );
        console.log('');
        console.log(
          'Usage: node scripts/test-coordinator.js <command> [packages...] [options]'
        );
        console.log('');
        console.log('Commands:');
        console.log(
          '  run [pkg...]      Run tests for specified packages (or all)'
        );
        console.log('  watch             Run tests in watch mode');
        console.log('  overview          Show test configuration overview');
        console.log('  badges            Generate test badges');
        console.log('');
        console.log('Options:');
        console.log('  --verbose, -v     Show detailed output');
        console.log('  --coverage, -c    Include coverage reporting');
        console.log(
          '  --sequential      Run tests sequentially instead of parallel'
        );
        console.log('  --watch, -w       Run in watch mode');
        console.log('');
        console.log('Examples:');
        console.log(
          '  node scripts/test-coordinator.js run                       # Run all tests'
        );
        console.log(
          '  node scripts/test-coordinator.js run @ai-spine/tools       # Run specific package'
        );
        console.log(
          '  node scripts/test-coordinator.js run --coverage           # Run with coverage'
        );
        console.log(
          '  node scripts/test-coordinator.js watch                    # Watch mode'
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

module.exports = { TestCoordinator };
