/**
 * Rollup configuration for create-ai-spine-tool
 * CLI tool for scaffolding AI Spine compatible tools
 */

import { createRollupConfig, createCliConfig, EXTERNAL_DEPS, loadPackageJson } from '../../rollup.shared.js';

const packageJson = loadPackageJson('.');

export default [
  // Main CLI executable
  createCliConfig({
    input: 'src/cli.ts',
    output: 'dist/cli.js',
    external: EXTERNAL_DEPS.cli
  }),
  
  // Library builds (ESM, CJS, TypeScript definitions)
  ...createRollupConfig({
    packageName: 'cli',
    input: 'src/index.ts',
    external: EXTERNAL_DEPS.cli,
    packageJson,
    generateTypes: true,
    bundleSizeLimit: 500,
    isCli: false
  })
];