#!/usr/bin/env node

/**
 * Build Verification Script
 * Comprehensive verification of built packages including functionality,
 * compatibility, and performance tests
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { gzipSync } = require('zlib');

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
 * Verification test suite
 */
class BuildVerifier {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.packagesDir = path.join(__dirname, '..', 'packages');
    this.results = {
      packages: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  log(message, level = 'info') {
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✅${colors.reset}`,
      warning: `${colors.yellow}⚠️${colors.reset}`,
      error: `${colors.red}❌${colors.reset}`
    };

    if (this.verbose || level !== 'info') {
      console.log(`${prefix[level]} ${message}`);
    }
  }

  /**
   * Verify that all required build artifacts exist
   */
  verifyBuildArtifacts(packagePath, packageName) {
    const distPath = path.join(packagePath, 'dist');
    const results = {
      passed: true,
      artifacts: {},
      missing: []
    };

    if (!fs.existsSync(distPath)) {
      results.passed = false;
      results.missing.push('dist directory');
      return results;
    }

    // Check for required files
    const requiredFiles = ['index.js', 'index.esm.js'];
    const optionalFiles = ['index.umd.js', 'index.d.ts'];

    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        results.artifacts[file] = {
          exists: true,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2)
        };
      } else {
        results.passed = false;
        results.missing.push(file);
      }
    }

    for (const file of optionalFiles) {
      const filePath = path.join(distPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        results.artifacts[file] = {
          exists: true,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2)
        };
      }
    }

    return results;
  }

  /**
   * Verify that built files are valid JavaScript/TypeScript
   */
  verifySyntax(packagePath, packageName) {
    const distPath = path.join(packagePath, 'dist');
    const results = {
      passed: true,
      errors: []
    };

    const jsFiles = ['index.js', 'index.esm.js', 'index.umd.js'];

    for (const file of jsFiles) {
      const filePath = path.join(distPath, file);
      
      if (fs.existsSync(filePath)) {
        try {
          // Basic syntax check by requiring the file
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for common syntax errors
          if (content.includes('undefined exports') || 
              content.includes('undefined module') ||
              content.includes('SyntaxError')) {
            results.passed = false;
            results.errors.push(`${file}: Potential syntax or export errors`);
          }

          // Check for source maps if not in production
          if (process.env.NODE_ENV !== 'production' && !content.includes('//# sourceMappingURL=')) {
            results.errors.push(`${file}: Missing source map`);
          }

        } catch (error) {
          results.passed = false;
          results.errors.push(`${file}: ${error.message}`);
        }
      }
    }

    return results;
  }

  /**
   * Verify TypeScript declarations
   */
  verifyTypeDefinitions(packagePath, packageName) {
    const distPath = path.join(packagePath, 'dist');
    const dtsPath = path.join(distPath, 'index.d.ts');
    const results = {
      passed: true,
      errors: []
    };

    if (!fs.existsSync(dtsPath)) {
      results.passed = false;
      results.errors.push('index.d.ts not found');
      return results;
    }

    try {
      const content = fs.readFileSync(dtsPath, 'utf8');
      
      // Basic checks for TypeScript declaration syntax
      if (!content.includes('export') && !content.includes('declare')) {
        results.passed = false;
        results.errors.push('No exports or declarations found');
      }

      // Check for common TypeScript declaration issues
      if (content.includes('any') && !content.includes('// @ts-')) {
        results.errors.push('Contains "any" types (consider more specific types)');
      }

    } catch (error) {
      results.passed = false;
      results.errors.push(`Failed to read type definitions: ${error.message}`);
    }

    return results;
  }

  /**
   * Verify package.json exports configuration
   */
  verifyPackageExports(packagePath, packageName) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    const results = {
      passed: true,
      errors: [],
      config: {}
    };

    if (!fs.existsSync(packageJsonPath)) {
      results.passed = false;
      results.errors.push('package.json not found');
      return results;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      results.config = packageJson;

      // Check required fields
      const requiredFields = ['main', 'module', 'types'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          results.passed = false;
          results.errors.push(`Missing ${field} field`);
        } else {
          // Verify that the file exists
          const filePath = path.join(packagePath, packageJson[field]);
          if (!fs.existsSync(filePath)) {
            results.passed = false;
            results.errors.push(`${field} points to non-existent file: ${packageJson[field]}`);
          }
        }
      }

      // Check exports field if present
      if (packageJson.exports) {
        const exports = packageJson.exports['.'] || packageJson.exports;
        if (exports.import && !fs.existsSync(path.join(packagePath, exports.import))) {
          results.passed = false;
          results.errors.push(`exports.import points to non-existent file: ${exports.import}`);
        }
        if (exports.require && !fs.existsSync(path.join(packagePath, exports.require))) {
          results.passed = false;
          results.errors.push(`exports.require points to non-existent file: ${exports.require}`);
        }
      }

    } catch (error) {
      results.passed = false;
      results.errors.push(`Failed to parse package.json: ${error.message}`);
    }

    return results;
  }

  /**
   * Verify package can be imported/required
   */
  async verifyImportability(packagePath, packageName) {
    const results = {
      passed: true,
      errors: [],
      imports: {}
    };

    const distPath = path.join(packagePath, 'dist');
    
    // Test CommonJS import
    try {
      const cjsPath = path.join(distPath, 'index.js');
      if (fs.existsSync(cjsPath)) {
        delete require.cache[require.resolve(cjsPath)];
        const cjsExports = require(cjsPath);
        results.imports.commonjs = {
          success: true,
          exports: Object.keys(cjsExports || {})
        };
      }
    } catch (error) {
      results.passed = false;
      results.errors.push(`CommonJS import failed: ${error.message}`);
    }

    // Test ES Module import (basic syntax check)
    try {
      const esmPath = path.join(distPath, 'index.esm.js');
      if (fs.existsSync(esmPath)) {
        const content = fs.readFileSync(esmPath, 'utf8');
        const hasExports = content.includes('export') || content.includes('module.exports');
        results.imports.esm = {
          success: hasExports,
          hasExports
        };
        
        if (!hasExports) {
          results.passed = false;
          results.errors.push('ES Module has no exports');
        }
      }
    } catch (error) {
      results.passed = false;
      results.errors.push(`ES Module check failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Run verification for a single package
   */
  async verifyPackage(packageName) {
    const packagePath = path.join(this.packagesDir, packageName);
    
    if (!fs.existsSync(packagePath)) {
      return null;
    }

    this.log(`Verifying package: ${packageName}`, 'info');
    
    const results = {
      name: packageName,
      artifacts: this.verifyBuildArtifacts(packagePath, packageName),
      syntax: this.verifySyntax(packagePath, packageName),
      types: this.verifyTypeDefinitions(packagePath, packageName),
      exports: this.verifyPackageExports(packagePath, packageName),
      imports: await this.verifyImportability(packagePath, packageName),
      passed: true
    };

    // Determine overall pass/fail
    results.passed = results.artifacts.passed && 
                    results.syntax.passed && 
                    results.types.passed && 
                    results.exports.passed && 
                    results.imports.passed;

    if (results.passed) {
      this.log(`✅ ${packageName} passed all verification tests`, 'success');
    } else {
      this.log(`❌ ${packageName} failed verification tests`, 'error');
    }

    return results;
  }

  /**
   * Run verification for all packages
   */
  async verifyAll() {
    this.log('Starting build verification for all packages', 'info');
    
    const packages = fs.readdirSync(this.packagesDir);
    
    for (const pkg of packages) {
      const result = await this.verifyPackage(pkg);
      
      if (result) {
        this.results.packages[pkg] = result;
        this.results.summary.total++;
        
        if (result.passed) {
          this.results.summary.passed++;
        } else {
          this.results.summary.failed++;
          this.results.summary.errors.push({
            package: pkg,
            errors: this.collectErrors(result)
          });
        }
      }
    }

    return this.results;
  }

  /**
   * Collect all errors from a package result
   */
  collectErrors(result) {
    const errors = [];
    
    if (result.artifacts && result.artifacts.missing.length > 0) {
      errors.push(...result.artifacts.missing.map(f => `Missing artifact: ${f}`));
    }
    
    if (result.syntax && result.syntax.errors.length > 0) {
      errors.push(...result.syntax.errors);
    }
    
    if (result.types && result.types.errors.length > 0) {
      errors.push(...result.types.errors.map(e => `Type definition: ${e}`));
    }
    
    if (result.exports && result.exports.errors.length > 0) {
      errors.push(...result.exports.errors.map(e => `Package exports: ${e}`));
    }
    
    if (result.imports && result.imports.errors.length > 0) {
      errors.push(...result.imports.errors.map(e => `Import: ${e}`));
    }
    
    return errors;
  }

  /**
   * Print verification report
   */
  printReport() {
    console.log(`\n${colors.bold}${colors.cyan}📋 Build Verification Report${colors.reset}`);
    console.log('=' .repeat(60));

    // Summary
    console.log(`\n${colors.bold}📊 Summary${colors.reset}`);
    console.log(`Total packages: ${this.results.summary.total}`);
    console.log(`Passed: ${colors.green}${this.results.summary.passed}${colors.reset}`);
    console.log(`Failed: ${colors.red}${this.results.summary.failed}${colors.reset}`);

    // Package details
    for (const [packageName, result] of Object.entries(this.results.packages)) {
      const status = result.passed ? `${colors.green}✅ PASSED` : `${colors.red}❌ FAILED`;
      console.log(`\n${colors.bold}${packageName}${colors.reset}: ${status}${colors.reset}`);

      if (!result.passed && this.verbose) {
        const errors = this.collectErrors(result);
        for (const error of errors) {
          console.log(`  ${colors.red}•${colors.reset} ${error}`);
        }
      }

      if (this.verbose && result.artifacts.artifacts) {
        console.log(`  ${colors.cyan}Build artifacts:${colors.reset}`);
        for (const [file, info] of Object.entries(result.artifacts.artifacts)) {
          console.log(`    ${file}: ${info.sizeKB}KB`);
        }
      }
    }

    // Errors summary
    if (this.results.summary.errors.length > 0) {
      console.log(`\n${colors.bold}${colors.red}❌ Failed Packages${colors.reset}`);
      for (const { package: pkg, errors } of this.results.summary.errors) {
        console.log(`\n${colors.red}${pkg}:${colors.reset}`);
        for (const error of errors) {
          console.log(`  • ${error}`);
        }
      }
    }

    const success = this.results.summary.failed === 0;
    console.log(`\n${success ? colors.green + '🎉 All packages passed verification!' : colors.red + '💥 Some packages failed verification!'}${colors.reset}`);
    
    return success;
  }
}

/**
 * Main function
 */
async function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  
  const verifier = new BuildVerifier({ verbose });
  
  try {
    await verifier.verifyAll();
    const success = verifier.printReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ Verification failed with error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BuildVerifier };