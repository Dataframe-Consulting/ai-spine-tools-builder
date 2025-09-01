/**
 * Rollup configuration for create-ai-spine-tool
 * CLI tool for scaffolding new AI Spine tools
 */

const {
  createCliConfig,
  EXTERNAL_DEPS,
  loadPackageJson,
} = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

module.exports = [
  // Main library build
  createCliConfig({
    input: 'src/index.ts',
    output: 'dist/index.js',
    external: EXTERNAL_DEPS.cli,
  }),

  // CLI executable build (skip banner since cli.ts already has shebang)
  createCliConfig({
    input: 'src/cli.ts',
    output: 'dist/cli.js',
    external: EXTERNAL_DEPS.cli,
    skipBanner: true,
  }),
];
