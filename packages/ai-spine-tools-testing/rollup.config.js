/**
 * Rollup configuration for @ai-spine/tools-testing
 * Testing utilities and mock data generators
 */

const { createRollupConfig, EXTERNAL_DEPS, loadPackageJson } = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

module.exports = createRollupConfig({
  packageName: 'testing',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.testing,
  packageJson,
  generateTypes: false, // Skip due to superagent type conflicts
  bundleSizeLimit: 300, // 300KB limit for testing package
  isCli: false
});