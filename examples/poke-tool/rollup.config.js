import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'auto'
    },
    {
      file: pkg.module || 'dist/index.mjs',
      format: 'es',
      sourcemap: !isProduction
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'fs',
    'path',
    'http',
    'https',
    'util',
    'stream',
    'events',
    'crypto'
  ],
  plugins: [
    resolve({
      preferBuiltins: true,
      exportConditions: ['node']
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProduction,
      inlineSources: !isProduction
    }),
    ...(isProduction ? [
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      })
    ] : [])
  ],
  onwarn: (warning, warn) => {
    // Suppress certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
};