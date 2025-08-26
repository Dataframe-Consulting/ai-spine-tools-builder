import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '{{toolNamePascalCase}}',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['cjs', 'es']
    },
    rollupOptions: {
      external: [
        'express',
        'cors',
        'helmet',
        'compression',
        'morgan',
        'dotenv',
        'winston',
        'joi',
        'axios',
        'fs',
        'path',
        'http',
        'https',
        'util',
        'stream',
        'events',
        'crypto'
      ],
      output: {
        globals: {
          'express': 'express',
          'cors': 'cors'
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    target: 'node18'
  },
  plugins: [
    {{#isTypeScript}}
    dts({
      outputDir: 'dist/types',
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      copyDtsFiles: true
    })
    {{/isTypeScript}}
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});