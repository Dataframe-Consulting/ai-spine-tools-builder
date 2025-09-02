#!/usr/bin/env node

/**
 * Bundle Size Check Script
 * Verifies that built packages stay within defined size limits
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Bundle size limits in KB
const BUNDLE_SIZE_LIMITS = {
  '@ai-spine/tools-core': 150,
  '@ai-spine/tools': 200,
  '@ai-spine/tools-testing': 300,
  'create-ai-spine-tool': 500,
};

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

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2);
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);

    return {
      raw: stats.size,
      gzipped: gzipped.length,
    };
  } catch (error) {
    return null;
  }
}

function checkPackageBundles(packageName, packagePath) {
  const distPath = path.join(packagePath, 'dist');

  if (!fs.existsSync(distPath)) {
    console.log(
      `${colors.yellow}⚠️  No dist folder found for ${packageName}${colors.reset}`
    );
    return { passed: true, sizes: [] };
  }

  const bundleFiles = [
    'index.js', // CommonJS
    'index.esm.js', // ES Module
    'index.umd.js', // UMD (if exists)
  ];

  const results = [];
  let passed = true;
  const limit = BUNDLE_SIZE_LIMITS[packageName] || 1000; // Default 1MB limit

  console.log(`\n${colors.bold}📦 ${packageName}${colors.reset}`);
  console.log(`${colors.cyan}   Limit: ${limit}KB${colors.reset}`);

  for (const file of bundleFiles) {
    const filePath = path.join(distPath, file);
    const sizes = getFileSize(filePath);

    if (sizes) {
      const rawSizeKB = formatBytes(sizes.raw);
      const gzippedSizeKB = formatBytes(sizes.gzipped);

      const exceedsLimit = sizes.raw / 1024 > limit;
      const status = exceedsLimit
        ? `${colors.red}❌ EXCEEDS LIMIT`
        : `${colors.green}✅ OK`;

      console.log(
        `   ${file.padEnd(15)} ${rawSizeKB.padStart(8)}KB (${gzippedSizeKB.padStart(8)}KB gzipped) ${status}${colors.reset}`
      );

      if (exceedsLimit) {
        passed = false;
      }

      results.push({
        file,
        rawSize: sizes.raw,
        gzippedSize: sizes.gzipped,
        exceedsLimit,
      });
    }
  }

  // Check TypeScript declarations
  const dtsPath = path.join(distPath, 'index.d.ts');
  const dtsSize = getFileSize(dtsPath);
  if (dtsSize) {
    const dtsSizeKB = formatBytes(dtsSize.raw);
    console.log(
      `   ${'index.d.ts'.padEnd(15)} ${dtsSizeKB.padStart(8)}KB ${colors.blue}(types)${colors.reset}`
    );
  }

  return { passed, sizes: results };
}

function main() {
  console.log(
    `${colors.bold}${colors.cyan}🔍 Bundle Size Analysis${colors.reset}`
  );
  console.log('='.repeat(50));

  const packagesDir = path.join(__dirname, '..', 'packages');
  const packages = fs.readdirSync(packagesDir);

  let allPassed = true;
  const summary = {};

  for (const pkg of packages) {
    const packagePath = path.join(packagesDir, pkg);
    const packageJsonPath = path.join(packagePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageName = packageJson.name;

    const result = checkPackageBundles(packageName, packagePath);
    summary[packageName] = result;

    if (!result.passed) {
      allPassed = false;
    }
  }

  // Print summary
  console.log(`\n${colors.bold}📊 Summary${colors.reset}`);
  console.log('='.repeat(50));

  for (const [packageName, result] of Object.entries(summary)) {
    const status = result.passed
      ? `${colors.green}✅ PASSED`
      : `${colors.red}❌ FAILED`;
    const totalFiles = result.sizes.length;
    const exceedingFiles = result.sizes.filter(s => s.exceedsLimit).length;

    console.log(
      `${packageName}: ${status}${colors.reset} (${totalFiles} files, ${exceedingFiles} exceeding limits)`
    );
  }

  if (allPassed) {
    console.log(
      `\n${colors.bold}${colors.green}🎉 All packages passed bundle size checks!${colors.reset}`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.bold}${colors.red}💥 Some packages exceeded bundle size limits!${colors.reset}`
    );
    console.log(`${colors.yellow}Consider:${colors.reset}`);
    console.log('- Reviewing dependencies and removing unused ones');
    console.log('- Checking for duplicate dependencies');
    console.log('- Using dynamic imports for large optional features');
    console.log('- Running bundle analyzer: npm run build:analyze');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkPackageBundles,
  BUNDLE_SIZE_LIMITS,
};
