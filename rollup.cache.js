/**
 * Rollup Build Cache and Performance Configuration
 * Implements caching strategies and incremental build optimizations
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Cache configuration for Rollup builds
 */
class RollupCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'node_modules', '.cache', 'rollup');
    this.enabled = options.enabled !== false && process.env.NODE_ENV !== 'production';
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours
    this.verbose = options.verbose || false;
  }

  /**
   * Initialize cache directory
   */
  async init() {
    if (!this.enabled) return;
    
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      if (this.verbose) {
        console.log(`📁 Cache directory initialized: ${this.cacheDir}`);
      }
    } catch (error) {
      console.warn('Failed to initialize cache directory:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Generate cache key for a build configuration
   */
  generateCacheKey(input, config) {
    const configString = JSON.stringify({
      input,
      external: config.external,
      plugins: config.plugins?.map(p => p.name).filter(Boolean),
      output: config.output
    });

    return crypto.createHash('md5').update(configString).digest('hex');
  }

  /**
   * Check if cached build is valid
   */
  async isCacheValid(cacheKey, sourceFiles) {
    if (!this.enabled) return false;

    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    
    try {
      const cacheData = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
      
      // Check cache age
      if (Date.now() - cacheData.timestamp > this.maxAge) {
        return false;
      }

      // Check if source files have changed
      for (const [file, expectedHash] of Object.entries(cacheData.fileHashes)) {
        try {
          const currentHash = await this.getFileHash(file);
          if (currentHash !== expectedHash) {
            return false;
          }
        } catch {
          // File doesn't exist or can't be read
          return false;
        }
      }

      if (this.verbose) {
        console.log(`💾 Cache hit for key: ${cacheKey}`);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save build cache data
   */
  async saveCache(cacheKey, sourceFiles) {
    if (!this.enabled) return;

    const fileHashes = {};
    for (const file of sourceFiles) {
      try {
        fileHashes[file] = await this.getFileHash(file);
      } catch {
        // Skip files that can't be read
      }
    }

    const cacheData = {
      timestamp: Date.now(),
      fileHashes
    };

    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    
    try {
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
      if (this.verbose) {
        console.log(`💾 Cache saved for key: ${cacheKey}`);
      }
    } catch (error) {
      console.warn('Failed to save cache:', error.message);
    }
  }

  /**
   * Get file hash for cache validation
   */
  async getFileHash(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Clear cache directory
   */
  async clear() {
    if (!this.enabled) return;

    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      if (this.verbose) {
        console.log(`🗑️  Cache cleared: ${this.cacheDir}`);
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error.message);
    }
  }

  /**
   * Clean old cache files
   */
  async cleanup() {
    if (!this.enabled) return;

    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > this.maxAge) {
            await fs.unlink(filePath);
            if (this.verbose) {
              console.log(`🗑️  Cleaned old cache file: ${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup cache:', error.message);
    }
  }
}

/**
 * Performance monitoring plugin for Rollup
 */
function rollupPerformancePlugin(options = {}) {
  const startTimes = new Map();
  const verbose = options.verbose || false;
  
  return {
    name: 'performance-monitor',
    
    buildStart() {
      startTimes.set('build', Date.now());
      if (verbose) {
        console.log('⏱️  Build started');
      }
    },

    generateBundle() {
      startTimes.set('generate', Date.now());
    },

    writeBundle() {
      const buildTime = Date.now() - startTimes.get('build');
      const generateTime = startTimes.has('generate') ? 
        Date.now() - startTimes.get('generate') : 0;

      if (verbose || buildTime > 10000) { // Show if build takes more than 10 seconds
        console.log(`⏱️  Build completed in ${buildTime}ms (generation: ${generateTime}ms)`);
      }

      // Log performance warnings
      if (buildTime > 60000) { // 1 minute
        console.warn('⚠️  Build time exceeded 1 minute. Consider optimizing build configuration.');
      }
    }
  };
}

/**
 * Incremental build plugin
 * Skips rebuilds if source files haven't changed
 */
function rollupIncrementalPlugin(options = {}) {
  const cache = new RollupCache(options.cache);
  let cacheKey = null;
  let sourceFiles = [];

  return {
    name: 'incremental-build',
    
    async buildStart(inputOptions) {
      await cache.init();
      
      // Generate cache key based on configuration
      cacheKey = cache.generateCacheKey(inputOptions.input, inputOptions);
      
      // Collect source files for cache validation
      sourceFiles = Array.isArray(inputOptions.input) ? 
        inputOptions.input : [inputOptions.input];
    },

    async resolveId(id, importer) {
      // Collect resolved files for cache tracking
      if (importer && !id.startsWith('\0')) {
        const resolved = path.resolve(path.dirname(importer), id);
        if (!sourceFiles.includes(resolved)) {
          sourceFiles.push(resolved);
        }
      }
      return null; // Don't interfere with resolution
    },

    async generateBundle() {
      // Save cache after successful build
      if (cacheKey && sourceFiles.length > 0) {
        await cache.saveCache(cacheKey, sourceFiles);
      }
    }
  };
}

/**
 * Memory usage monitoring plugin
 */
function rollupMemoryMonitorPlugin(options = {}) {
  const threshold = options.threshold || 500 * 1024 * 1024; // 500MB default
  const verbose = options.verbose || false;

  return {
    name: 'memory-monitor',
    
    buildStart() {
      if (verbose) {
        const usage = process.memoryUsage();
        console.log(`💾 Memory usage at build start: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      }
    },

    generateBundle() {
      const usage = process.memoryUsage();
      
      if (verbose || usage.heapUsed > threshold) {
        console.log(`💾 Memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      }

      if (usage.heapUsed > threshold) {
        console.warn('⚠️  High memory usage detected. Consider reducing bundle size or splitting builds.');
      }
    }
  };
}

/**
 * Build stats collector
 */
class BuildStats {
  constructor() {
    this.stats = {
      builds: 0,
      totalTime: 0,
      averageTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }

  recordBuild(duration, cached = false) {
    this.stats.builds++;
    this.stats.totalTime += duration;
    this.stats.averageTime = this.stats.totalTime / this.stats.builds;
    
    if (cached) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
  }

  recordError() {
    this.stats.errors++;
  }

  getStats() {
    return { ...this.stats };
  }

  printStats() {
    const cacheRate = this.stats.builds > 0 ? 
      (this.stats.cacheHits / this.stats.builds * 100).toFixed(1) : 0;
    
    console.log('📊 Build Statistics:');
    console.log(`   Total builds: ${this.stats.builds}`);
    console.log(`   Average time: ${this.stats.averageTime.toFixed(0)}ms`);
    console.log(`   Cache hit rate: ${cacheRate}%`);
    console.log(`   Errors: ${this.stats.errors}`);
  }
}

// Global build stats instance
const globalBuildStats = new BuildStats();

// Export functions and classes
module.exports = {
  RollupCache,
  rollupPerformancePlugin,
  rollupIncrementalPlugin,
  rollupMemoryMonitorPlugin,
  BuildStats,
  globalBuildStats
};