#!/usr/bin/env node

/**
 * Dependency Analysis Script
 * Analyzes package dependencies, detects duplicates, and suggests optimizations
 */

const fs = require('fs');
const path = require('path');

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

function analyzePackageDependencies(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  return {
    name: packageJson.name || packageName,
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    peerDependencies: packageJson.peerDependencies || {},
    version: packageJson.version,
  };
}

function findDuplicateDependencies(packages) {
  const allDeps = new Map();
  const duplicates = new Map();

  // Collect all dependencies with their versions
  for (const pkg of packages) {
    const allPackageDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [depName, version] of Object.entries(allPackageDeps)) {
      if (!allDeps.has(depName)) {
        allDeps.set(depName, new Map());
      }

      const versionMap = allDeps.get(depName);
      if (!versionMap.has(version)) {
        versionMap.set(version, []);
      }

      versionMap.get(version).push(pkg.name);
    }
  }

  // Find duplicates (same dependency with different versions)
  for (const [depName, versionMap] of allDeps.entries()) {
    if (versionMap.size > 1) {
      duplicates.set(depName, Array.from(versionMap.entries()));
    }
  }

  return duplicates;
}

function analyzeExternalDependencies(packages) {
  const analysis = {
    totalDependencies: 0,
    heavyDependencies: [],
    securityRisks: [],
    recommendations: [],
  };

  // Known heavy dependencies (>1MB)
  const heavyDeps = [
    'webpack',
    'rollup',
    '@rollup/plugin-typescript',
    'typescript',
    'jest',
    '@types/node',
    'eslint',
    'prettier',
  ];

  // Dependencies that should be peer dependencies
  const shouldBePeer = ['typescript', 'express', 'react', 'vue', 'angular'];

  for (const pkg of packages) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    analysis.totalDependencies += Object.keys(allDeps).length;

    for (const [depName, version] of Object.entries(allDeps)) {
      // Check for heavy dependencies - only flag if they're in runtime dependencies, not devDependencies
      if (heavyDeps.includes(depName) && pkg.dependencies[depName]) {
        analysis.heavyDependencies.push({
          package: pkg.name,
          dependency: depName,
          version,
          type: 'heavy',
        });
      }

      // Check for dependencies that should be peer dependencies - only for runtime dependencies
      if (
        shouldBePeer.includes(depName) &&
        pkg.dependencies[depName] &&
        !pkg.peerDependencies[depName]
      ) {
        analysis.recommendations.push({
          package: pkg.name,
          dependency: depName,
          suggestion: `Consider moving '${depName}' to peerDependencies`,
          type: 'peer-dependency',
        });
      }

      // Check for wildcard versions (security risk)
      if (version.includes('*') || version.startsWith('>')) {
        analysis.securityRisks.push({
          package: pkg.name,
          dependency: depName,
          version,
          risk: 'unpinned-version',
        });
      }
    }
  }

  return analysis;
}

function generateOptimizationSuggestions(packages, duplicates, analysis) {
  const suggestions = [];

  // Duplicate dependency suggestions
  if (duplicates.size > 0) {
    suggestions.push({
      type: 'duplicates',
      severity: 'high',
      message: `Found ${duplicates.size} duplicate dependencies with different versions`,
      details: Array.from(duplicates.entries()).map(([dep, versions]) => ({
        dependency: dep,
        versions: versions.map(([version, packages]) => ({
          version,
          packages,
        })),
      })),
    });
  }

  // Bundle size optimization
  if (analysis.heavyDependencies.length > 0) {
    suggestions.push({
      type: 'bundle-size',
      severity: 'medium',
      message: 'Heavy dependencies detected that may increase bundle size',
      details: analysis.heavyDependencies.map(dep => ({
        package: dep.package,
        dependency: dep.dependency,
        suggestion: 'Consider if this dependency is necessary for runtime',
      })),
    });
  }

  // Security suggestions
  if (analysis.securityRisks.length > 0) {
    suggestions.push({
      type: 'security',
      severity: 'high',
      message: 'Dependencies with unpinned versions detected',
      details: analysis.securityRisks.map(risk => ({
        package: risk.package,
        dependency: risk.dependency,
        version: risk.version,
        suggestion: 'Pin to specific version for security and reproducibility',
      })),
    });
  }

  return suggestions;
}

function printAnalysisReport(packages, duplicates, analysis, suggestions) {
  console.log(
    `${colors.bold}${colors.cyan}🔍 Dependency Analysis Report${colors.reset}`
  );
  console.log('='.repeat(60));

  // Package overview
  console.log(`\n${colors.bold}📦 Package Overview${colors.reset}`);
  for (const pkg of packages) {
    const depCount = Object.keys(pkg.dependencies).length;
    const devDepCount = Object.keys(pkg.devDependencies).length;
    const peerDepCount = Object.keys(pkg.peerDependencies).length;

    console.log(`${pkg.name}:`);
    console.log(
      `  Dependencies: ${depCount}, DevDependencies: ${devDepCount}, PeerDependencies: ${peerDepCount}`
    );
  }

  // Duplicates
  if (duplicates.size > 0) {
    console.log(
      `\n${colors.bold}${colors.red}⚠️  Duplicate Dependencies${colors.reset}`
    );
    for (const [depName, versions] of duplicates.entries()) {
      console.log(`${colors.yellow}${depName}:${colors.reset}`);
      for (const [version, packages] of versions) {
        console.log(`  ${version} used by: ${packages.join(', ')}`);
      }
    }
  }

  // Optimization suggestions
  if (suggestions.length > 0) {
    console.log(`\n${colors.bold}💡 Optimization Suggestions${colors.reset}`);
    for (const suggestion of suggestions) {
      const severityColor =
        suggestion.severity === 'high'
          ? colors.red
          : suggestion.severity === 'medium'
            ? colors.yellow
            : colors.green;

      console.log(
        `\n${severityColor}${suggestion.severity.toUpperCase()}:${colors.reset} ${suggestion.message}`
      );

      if (suggestion.details && suggestion.details.length > 0) {
        suggestion.details.forEach(detail => {
          if (suggestion.type === 'duplicates') {
            console.log(`  ${colors.cyan}${detail.dependency}:${colors.reset}`);
            detail.versions.forEach(v => {
              console.log(`    ${v.version} -> ${v.packages.join(', ')}`);
            });
          } else {
            console.log(
              `  ${detail.package}: ${detail.dependency} ${detail.suggestion || ''}`
            );
          }
        });
      }
    }
  }

  // Summary
  console.log(`\n${colors.bold}📊 Summary${colors.reset}`);
  console.log(`Total packages analyzed: ${packages.length}`);
  console.log(`Total dependencies: ${analysis.totalDependencies}`);
  console.log(`Duplicate dependencies: ${duplicates.size}`);
  console.log(`Heavy dependencies: ${analysis.heavyDependencies.length}`);
  console.log(`Security risks: ${analysis.securityRisks.length}`);
  console.log(`Optimization suggestions: ${suggestions.length}`);

  const hasIssues = duplicates.size > 0 || analysis.securityRisks.length > 0;
  if (hasIssues) {
    console.log(
      `\n${colors.red}${colors.bold}❌ Issues found that should be addressed${colors.reset}`
    );
    return false;
  } else {
    console.log(
      `\n${colors.green}${colors.bold}✅ No critical issues found${colors.reset}`
    );
    return true;
  }
}

function main() {
  const packagesDir = path.join(__dirname, '..', 'packages');
  const packageDirs = fs.readdirSync(packagesDir);

  const packages = [];

  for (const dir of packageDirs) {
    const packagePath = path.join(packagesDir, dir);
    const analysis = analyzePackageDependencies(packagePath, dir);

    if (analysis) {
      packages.push(analysis);
    }
  }

  if (packages.length === 0) {
    console.log(`${colors.red}No packages found for analysis${colors.reset}`);
    process.exit(1);
  }

  const duplicates = findDuplicateDependencies(packages);
  const analysis = analyzeExternalDependencies(packages);
  const suggestions = generateOptimizationSuggestions(
    packages,
    duplicates,
    analysis
  );

  const success = printAnalysisReport(
    packages,
    duplicates,
    analysis,
    suggestions
  );

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzePackageDependencies,
  findDuplicateDependencies,
  analyzeExternalDependencies,
  generateOptimizationSuggestions,
};
