/**
 * Rollup configuration for create-ai-spine-tool
 * CLI tool for scaffolding new AI Spine tools
 */

const {
  createRollupConfig,
  createCliConfig,
  EXTERNAL_DEPS,
  loadPackageJson,
} = require('../../rollup.shared.js');

const packageJson = loadPackageJson('.');

// Main library builds (ESM, CJS, and types)
const mainConfigs = createRollupConfig({
  packageName: 'create-ai-spine-tool',
  input: 'src/index.ts',
  external: EXTERNAL_DEPS.cli,
  packageJson,
  generateTypes: true,
  bundleSizeLimit: 500,
  isCli: true,
});

// CLI executable build (skip banner since cli.ts already has shebang)
// For CLI, we need to bundle most dependencies instead of externalizing them
const cliConfig = createCliConfig({
  input: 'src/cli.ts',
  output: 'dist/cli.js',
  external: ['fs', 'path', 'os', 'child_process'], // Only keep Node.js built-ins external
  skipBanner: true,
});

module.exports = [...mainConfigs, cliConfig];
