/**
 * Rollup configuration for @ai-spine/tools-core
 * Core types, validation, and Tool class implementation
 */

const { createRollupConfig, EXTERNAL_DEPS, loadPackageJson } = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

module.exports = createRollupConfig({
  packageName: 'core',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.core,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 150, // 150KB limit for core package
  isCli: false
});