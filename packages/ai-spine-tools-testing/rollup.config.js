/**
 * Rollup configuration for @ai-spine/tools-testing
 * Testing utilities and AISpineTestClient with CLI tools
 */

import { createRollupConfig, createCliConfig, EXTERNAL_DEPS, loadPackageJson } from '../../rollup.shared.js';

const packageJson = loadPackageJson('.');

// Main library builds
const libraryConfigs = createRollupConfig({
  packageName: 'testing',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.testing,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 300, // 300KB limit for testing package
  isCli: false
});

// CLI tool configurations
const cliConfigs = [
  createCliConfig({
    input: 'src/template-validator-cli.ts',
    output: 'dist/template-validator.js',
    external: EXTERNAL_DEPS.testing
  }),
  createCliConfig({
    input: 'src/example-validator-cli.ts',
    output: 'dist/example-validator.js',
    external: EXTERNAL_DEPS.testing
  })
];

export default [
  ...libraryConfigs,
  ...cliConfigs
];