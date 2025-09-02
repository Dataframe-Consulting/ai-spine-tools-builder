/**
 * Rollup configuration for @ai-spine/tools-testing
 * Testing utilities and mock data generators
 */

const {
  createRollupConfig,
  EXTERNAL_DEPS,
  loadPackageJson,
} = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

const { createCliConfig } = require('../../rollup.shared.js');

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
    external: ['@ai-spine/tools-core'] // Only keep core as external, bundle other deps
  }),
  createCliConfig({
    input: 'src/example-validator-cli.ts', 
    output: 'dist/example-validator.js',
    external: ['@ai-spine/tools-core'] // Only keep core as external, bundle other deps
  })
];

module.exports = [...mainConfigs, ...cliConfigs];
