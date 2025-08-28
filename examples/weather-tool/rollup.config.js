/**
 * Rollup configuration for weather-tool example
 */

const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');

module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
      declaration: true,
      declarationMap: true
    })
  ],
  external: [
    '@ai-spine/tools',
    'axios',
    'dotenv',
    'fs',
    'path',
    'http',
    'https',
    'util',
    'stream',
    'events',
    'crypto',
    'url',
    'os',
    'child_process',
    'zlib',
    'buffer',
    'assert',
    'querystring'
  ]
};
