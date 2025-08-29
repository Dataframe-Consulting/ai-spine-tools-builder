/**
 * Shared Rollup configuration for AI Spine Tools SDK
 * Provides optimized build configuration with multi-format output,
 * tree shaking, bundle analysis, and performance optimizations.
 */

const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser');
const dts = require('rollup-plugin-dts').default;
const { visualizer } = require('rollup-plugin-visualizer');
const filesize = require('rollup-plugin-filesize');
const progress = require('rollup-plugin-progress');
const { 
  rollupPerformancePlugin, 
  rollupIncrementalPlugin, 
  rollupMemoryMonitorPlugin 
} = require('./rollup.cache.js');

/**
 * Environment and build mode detection
 */
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isAnalyze = process.env.ANALYZE === 'true';
const isWatch = process.env.ROLLUP_WATCH === 'true';

/**
 * Common Node.js built-in modules that should be externalized
 */
const NODE_BUILTINS = [
  'fs', 'path', 'http', 'https', 'util', 'stream', 'events', 'crypto',
  'url', 'os', 'child_process', 'zlib', 'buffer', 'assert', 'querystring'
];

/**
 * Bundle size limits (in KB)
 */
const BUNDLE_SIZE_LIMITS = {
  core: 150,       // @ai-spine/tools-core
  tools: 200,      // @ai-spine/tools  
  testing: 300,    // @ai-spine/tools-testing
  cli: 500         // create-ai-spine-tool
};

/**
 * Create optimized Rollup configuration for a package
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.packageName - Name of the package
 * @param {string} options.input - Entry point file
 * @param {string[]} options.external - External dependencies
 * @param {Object} options.packageJson - Package.json content
 * @param {boolean} options.generateTypes - Whether to generate TypeScript declarations
 * @param {Object} options.bundleSizeLimit - Bundle size limit in KB
 * @param {boolean} options.isCli - Whether this is a CLI package
 * @returns {Array} Array of Rollup configurations
 */
function createRollupConfig(options) {
  const {
    packageName,
    input = 'src/index.ts',
    external = [],
    packageJson,
    generateTypes = true,
    bundleSizeLimit,
    isCli = false
  } = options;

  // Combine external dependencies
  const allExternal = [
    ...NODE_BUILTINS,
    ...external,
    ...(packageJson?.dependencies ? Object.keys(packageJson.dependencies) : []),
    ...(packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies) : [])
  ];

  // Performance monitoring plugins (always enabled)
  const performancePlugins = [
    rollupPerformancePlugin({
      verbose: isDevelopment || isWatch
    }),
    rollupMemoryMonitorPlugin({
      verbose: isDevelopment,
      threshold: 500 * 1024 * 1024 // 500MB threshold
    })
  ];

  // Incremental build plugin (only in development)
  const incrementalPlugins = isDevelopment ? [
    rollupIncrementalPlugin({
      cache: {
        enabled: true,
        verbose: isWatch,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  ] : [];

  // Common plugins for all builds
  const basePlugins = [
    // Performance monitoring
    ...performancePlugins,
    
    // Incremental builds for development
    ...incrementalPlugins,

    // Progress indicator for long builds
    progress({
      clearLine: false
    }),

    // Node.js module resolution
    resolve({
      preferBuiltins: true,
      exportConditions: ['node'],
      browser: false
    }),

    // CommonJS module handling
    commonjs({
      ignoreDynamic: true
    }),

    // JSON import support
    json(),

    // TypeScript compilation
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProduction,
      inlineSources: !isProduction,
      declaration: false, // Handled separately
      declarationMap: false,
      module: 'ESNext' // Ensure ES modules output
    })
  ];

  // Production-specific plugins
  const productionPlugins = isProduction && !isCli ? [
    // Minification and optimization (disabled for CLI packages due to compatibility issues)
    terser({
      ecma: 2018, // Support ES2018 syntax for broader compatibility
      compress: {
        drop_console: ['log', 'info'], // Keep warn and error
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      format: {
        comments: false,
        semicolons: false
      },
      mangle: {
        reserved: ['Tool', 'createTool'] // Preserve public API names
      }
    }),

    // Bundle size monitoring
    filesize({
      showBeforeSize: 'build',
      showGzippedSize: true,
      showBrotliSize: true,
      reporter: (options, bundle, { bundleSize, gzipSize, brotliSize }) => {
        const limit = bundleSizeLimit || BUNDLE_SIZE_LIMITS[packageName] || 500;
        const sizeInKb = bundleSize / 1024;
        
        console.log(`📦 ${packageName}: ${sizeInKb.toFixed(2)}KB (gzipped: ${(gzipSize/1024).toFixed(2)}KB)`);
        
        if (sizeInKb > limit) {
          console.warn(`⚠️  Bundle size exceeds limit of ${limit}KB`);
        }
      }
    })
  ] : [];

  // Analysis plugins
  const analysisPlugins = isAnalyze ? [
    visualizer({
      filename: `dist/bundle-analysis-${packageName}.html`,
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ] : [];

  const configs = [];

  // ES Module build
  configs.push({
    input,
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: !isProduction,
      exports: 'named',
      // Optimize for ES module loading
      hoistTransitiveImports: false,
      interop: 'auto'
    },
    plugins: [
      ...basePlugins,
      ...productionPlugins,
      ...analysisPlugins
    ],
    external: allExternal,
    treeshake: {
      moduleSideEffects: false,
      unknownGlobalSideEffects: false,
      tryCatchDeoptimization: false
    },
    onwarn: handleWarnings
  });

  // CommonJS build
  configs.push({
    input,
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named',
      // Optimize for Node.js
      interop: 'auto',
      esModule: false
    },
    plugins: [
      ...basePlugins,
      ...productionPlugins
    ],
    external: allExternal,
    treeshake: {
      moduleSideEffects: false,
      unknownGlobalSideEffects: false
    },
    onwarn: handleWarnings
  });

  // UMD build for browser compatibility (only for core packages)
  if (!isCli && packageName !== 'testing') {
    configs.push({
      input,
      output: {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: packageName.replace('@ai-spine/', '').replace(/-([a-z])/g, (_, char) => char.toUpperCase()),
        sourcemap: !isProduction,
        exports: 'named',
        globals: {
          'express': 'Express',
          'zod': 'Zod'
        }
      },
      plugins: [
        ...basePlugins,
        ...productionPlugins
      ],
      external: allExternal.filter(dep => !NODE_BUILTINS.includes(dep)),
      treeshake: {
        moduleSideEffects: false
      },
      onwarn: handleWarnings
    });
  }

  // TypeScript declarations
  if (generateTypes) {
    configs.push({
      input,
      output: {
        file: 'dist/index.d.ts',
        format: 'esm'
      },
      plugins: [
        dts({
          respectExternal: true,
          compilerOptions: {
            preserveSymlinks: false,
            declaration: true,
            declarationMap: false
          }
        })
      ],
      external: allExternal,
      onwarn: handleWarnings
    });
  }

  return configs;
}

/**
 * Create CLI-specific Rollup configuration
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.input - Entry point file
 * @param {string} options.output - Output file
 * @param {string[]} options.external - External dependencies
 * @param {boolean} options.skipBanner - Skip adding shebang banner (when file already has one)
 * @returns {Object} Rollup configuration
 */
function createCliConfig(options) {
  const { input, output, external = [], skipBanner = false } = options;

  const allExternal = [
    ...NODE_BUILTINS,
    ...external
  ];

  return {
    input,
    output: {
      file: output,
      format: 'cjs',
      sourcemap: !isProduction,
      banner: skipBanner ? undefined : '#!/usr/bin/env node',
      exports: 'auto'
    },
    plugins: [
      progress(),
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: !isProduction,
        declaration: false,
        module: 'ESNext' // Ensure ES modules output
      }),
      // Note: Production optimizations disabled for CLI builds to avoid compatibility issues
      // CLI tools don't need aggressive minification and it can cause Terser issues
    ],
    external: allExternal,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: handleWarnings
  };
}

/**
 * Handle Rollup warnings consistently
 */
function handleWarnings(warning, warn) {
  // Suppress common false positives
  if (warning.code === 'THIS_IS_UNDEFINED') return;
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    // Allow circular dependencies in specific cases
    if (warning.message.includes('node_modules')) return;
  }
  if (warning.code === 'EVAL') {
    console.warn('⚠️  eval() usage detected:', warning.message);
    return;
  }
  
  // Show all other warnings
  warn(warning);
}

/**
 * Utility to load package.json
 */
function loadPackageJson(packagePath) {
  try {
    return require(`${packagePath}/package.json`);
  } catch (error) {
    console.warn(`Warning: Could not load package.json from ${packagePath}`);
    return {};
  }
}

/**
 * Export commonly used external dependencies for different package types
 */
const EXTERNAL_DEPS = {
  core: [
    'express', 'cors', 'helmet', 'express-rate-limit', 'zod'
  ],
  tools: [
    '@ai-spine/tools-core', 'express', 'cors', 'helmet', 'compression'
  ],
  testing: [
    '@ai-spine/tools-core', 'axios', 'supertest', 'fs-extra', 'mustache', 'chalk', '@faker-js/faker', 'form-data'
  ],
  cli: [
    'commander', 'inquirer', 'chalk', 'ora', 'fs-extra', 'mustache', 'validate-npm-package-name'
  ]
};

// Export functions and constants
module.exports = {
  createRollupConfig,
  createCliConfig,
  loadPackageJson,
  EXTERNAL_DEPS
};