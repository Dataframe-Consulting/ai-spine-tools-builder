/**
 * Rollup configuration for create-ai-spine-tool
 * CLI tool for scaffolding AI Spine compatible tools
 */

import { createCliConfig, EXTERNAL_DEPS, loadPackageJson } from '../../rollup.shared.js';

const packageJson = loadPackageJson('.');

export default [
  // Main CLI executable
  createCliConfig({
    input: 'src/cli.ts',
    output: 'dist/cli.js',
    external: EXTERNAL_DEPS.cli
  }),
  
  // Library entry point (for programmatic usage)
  createCliConfig({
    input: 'src/index.ts',
    output: 'dist/index.js',
    external: EXTERNAL_DEPS.cli
  })
];