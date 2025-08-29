/**
 * Rollup configuration for @ai-spine/tools-core
 * Core types, validation, and Tool class implementation
 */

import { createRollupConfig, EXTERNAL_DEPS, loadPackageJson } from '../../rollup.shared.js';

const packageJson = loadPackageJson('.');

export default createRollupConfig({
  packageName: 'core',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.core,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 150, // 150KB limit for core package
  isCli: false
});