/**
 * Rollup configuration for @ai-spine/tools
 * Main framework with createTool factory and field builders
 */

import { createRollupConfig, EXTERNAL_DEPS, loadPackageJson } from '../../rollup.shared.js';

const packageJson = loadPackageJson('.');

export default createRollupConfig({
  packageName: 'tools',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.tools,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 200, // 200KB limit for main tools package
  isCli: false
});