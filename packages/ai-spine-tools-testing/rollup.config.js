/**
 * Rollup configuration for @ai-spine/tools-testing
 * Testing utilities and mock data generators
 */

const {
  createRollupConfig,
  createCliConfig,
  EXTERNAL_DEPS,
  loadPackageJson,
} = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

const mainConfigs = createRollupConfig({
  packageName: 'testing',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.testing,
  packageJson,
  generateTypes: false, // Skip due to superagent type conflicts
  bundleSizeLimit: 300, // 300KB limit for testing package
  isCli: false,
});

const cliConfigs = [
  createCliConfig({
    input: 'src/template-validator-cli.ts',
    output: 'dist/template-validator.js',
    external: [], // Bundle all dependencies for CLI to be self-contained
  }),
  createCliConfig({
    input: 'src/example-validator-cli.ts',
    output: 'dist/example-validator.js',
    external: [], // Bundle all dependencies for CLI to be self-contained
  }),
];

module.exports = [...mainConfigs, ...cliConfigs];
