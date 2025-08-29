/**
 * Rollup configuration for @ai-spine/tools
 * Main SDK package with Tool creation utilities
 */

const { createRollupConfig, EXTERNAL_DEPS, loadPackageJson } = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

module.exports = createRollupConfig({
  packageName: 'tools',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.tools,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 200, // 200KB limit for tools package
  isCli: false
});