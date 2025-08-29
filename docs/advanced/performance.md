# Performance Optimization Guide

Learn how to optimize your AI Spine tools for high performance, low latency, and efficient resource usage in production environments.

## Performance Fundamentals

### Key Performance Metrics

Monitor these critical metrics for your tools:

- **Response Time**: Target <200ms for simple operations, <2s for complex operations
- **Throughput**: Target >100 requests/second per tool instance
- **Memory Usage**: Keep baseline <100MB, peak <500MB per tool
- **CPU Usage**: Maintain <30% under normal load
- **Error Rate**: Keep <1% for production tools

### Performance Testing

Use the built-in testing utilities to benchmark your tools:

```typescript
import { testTool, MockAISpineClient } from '@ai-spine/tools-testing';
import { performance } from 'perf_hooks';

// Load testing example
async function loadTest(tool: Tool, concurrentUsers: number = 100, duration: number = 30000) {
  const client = new MockAISpineClient();
  const startTime = performance.now();
  const requests: Promise<any>[] = [];
  
  // Simulate concurrent users
  for (let i = 0; i < concurrentUsers; i++) {
    const userRequests = async () => {
      while (performance.now() - startTime < duration) {
        try {
          await client.execute(tool, {
            city: 'Madrid',
            units: 'celsius'
          });
        } catch (error) {
          console.error('Request failed:', error);
        }
        
        // Random delay between requests (0-1000ms)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      }
    };
    
    requests.push(userRequests());
  }
  
  await Promise.all(requests);
  
  // Get performance metrics
  const metrics = await tool.getMetrics();
  console.log('Load test results:', metrics);
}
```

## Optimization Strategies

### 1. Input Validation Optimization

Optimize validation for high-throughput scenarios:

```typescript
import { createTool, stringField } from '@ai-spine/tools';
import LRU from 'lru-cache';

// Cache validation results for repeated inputs
const validationCache = new LRU<string, boolean>({ max: 10000, ttl: 300000 }); // 5min TTL

const optimizedTool = createTool({
  metadata: {
    name: 'optimized-tool',
    version: '1.0.0',
    description: 'Performance-optimized tool',
    capabilities: ['fast-processing']
  },
  
  schema: {
    input: {
      // Use specific validation constraints to enable fast paths
      id: stringField({
        required: true,
        minLength: 10,
        maxLength: 10,
        pattern: '^[A-Z0-9]{10}$', // Specific pattern enables regex caching
        description: 'Unique identifier'
      }),
      
      // Limit array sizes for predictable performance
      tags: {
        type: 'array',
        required: false,
        maxItems: 20, // Prevent oversized arrays
        items: stringField({ maxLength: 50 })
      }
    },
    
    config: {
      cacheEnabled: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable result caching'
      }
    }
  },
  
  execute: async (input, config, context) => {
    // Fast validation cache check
    const inputKey = JSON.stringify(input);
    const cached = validationCache.get(inputKey);
    
    if (cached !== undefined) {
      // Skip re-validation for known good inputs
      console.log('Validation cache hit');
    }
    
    // Your optimized logic here
    return {
      status: 'success',
      data: { processed: true, id: input.id }
    };
  }
});
```

### 2. Caching Strategies

Implement multi-level caching for optimal performance:

```typescript
import Redis from 'ioredis';
import NodeCache from 'node-cache';

class MultiLevelCache {
  private memoryCache: NodeCache;
  private redisCache: Redis;
  
  constructor() {
    // L1: Memory cache (fastest, limited size)
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      maxKeys: 1000,
      useClones: false // Faster but requires careful object handling
    });
    
    // L2: Redis cache (shared across instances)
    this.redisCache = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }
  
  async get(key: string): Promise<any> {
    // Check L1 cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      return memoryResult;
    }
    
    // Check L2 cache
    try {
      const redisResult = await this.redisCache.get(key);
      if (redisResult) {
        const parsed = JSON.parse(redisResult);
        // Populate L1 cache for next access
        this.memoryCache.set(key, parsed, 60); // Shorter TTL in memory
        return parsed;
      }
    } catch (error) {
      console.warn('Redis cache error:', error);
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, value, Math.min(ttl, 300));
    
    try {
      await this.redisCache.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.warn('Redis cache set error:', error);
    }
  }
}

const cache = new MultiLevelCache();

const cachedTool = createTool({
  // ... metadata and schema
  
  execute: async (input, config, context) => {
    const cacheKey = `tool:${context.toolId}:${JSON.stringify(input)}`;
    
    // Try cache first
    if (config.cacheEnabled) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          cache: { hit: true, key: cacheKey }
        };
      }
    }
    
    // Execute expensive operation
    const result = await performExpensiveOperation(input);
    
    // Cache the result
    if (config.cacheEnabled && result.status === 'success') {
      await cache.set(cacheKey, result, 600); // 10 minutes
    }
    
    return {
      ...result,
      cache: { hit: false, key: cacheKey }
    };
  }
});
```

### 3. Connection Pooling

Optimize external service connections:

```typescript
import { Pool } from 'pg'; // PostgreSQL example
import axios, { AxiosInstance } from 'axios';

class ConnectionManager {
  private dbPool: Pool;
  private httpClient: AxiosInstance;
  
  constructor() {
    // Database connection pool
    this.dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      
      // Pool configuration for performance
      min: 5,                    // Minimum connections
      max: 20,                   // Maximum connections
      idleTimeoutMillis: 30000,  // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Connection timeout
      acquireTimeoutMillis: 10000,   // Pool acquire timeout
      
      // Keep connections alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });
    
    // HTTP client with connection pooling
    this.httpClient = axios.create({
      timeout: 10000,
      maxRedirects: 3,
      
      // Keep-alive for connection reuse
      httpAgent: new (require('http').Agent)({ 
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 60000,
        freeSocketTimeout: 30000
      }),
      
      httpsAgent: new (require('https').Agent)({ 
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 60000,
        freeSocketTimeout: 30000
      })
    });
  }
  
  async queryDatabase(sql: string, params: any[] = []): Promise<any> {
    const client = await this.dbPool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release(); // Return to pool
    }
  }
  
  async makeHttpRequest(url: string, data?: any): Promise<any> {
    const response = await this.httpClient.post(url, data);
    return response.data;
  }
  
  async close(): Promise<void> {
    await this.dbPool.end();
  }
}

const connectionManager = new ConnectionManager();

const databaseTool = createTool({
  // ... metadata and schema
  
  execute: async (input, config, context) => {
    // Use pooled connections for better performance
    const results = await connectionManager.queryDatabase(
      'SELECT * FROM users WHERE city = $1',
      [input.city]
    );
    
    return {
      status: 'success',
      data: results
    };
  },
  
  cleanup: async () => {
    await connectionManager.close();
  }
});
```

### 4. Async Processing Optimization

Handle concurrent operations efficiently:

```typescript
import pLimit from 'p-limit';

const batchProcessingTool = createTool({
  // ... metadata and schema
  
  execute: async (input, config, context) => {
    const { items, batchSize = 10, maxConcurrency = 5 } = input;
    
    // Limit concurrent operations to prevent resource exhaustion
    const limit = pLimit(maxConcurrency);
    
    // Process items in batches
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch items concurrently (but within limits)
      const batchResults = await Promise.all(
        batch.map(item => 
          limit(async () => {
            try {
              return await processItem(item);
            } catch (error) {
              return { error: error.message, item };
            }
          })
        )
      );
      
      results.push(...batchResults);
      
      // Optional: Report progress
      if (context.debug?.enabled) {
        console.log(`Processed ${results.length}/${items.length} items`);
      }
    }
    
    return {
      status: 'success',
      data: {
        processedCount: results.length,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length,
        results
      }
    };
  }
});
```

### 5. Memory Management

Optimize memory usage for long-running processes:

```typescript
const memoryOptimizedTool = createTool({
  // ... metadata and schema
  
  execute: async (input, config, context) => {
    // Use streaming for large data processing
    if (input.dataSize === 'large') {
      return processDataStream(input);
    }
    
    // Clear references to prevent memory leaks
    let temporaryData: any[] = [];
    
    try {
      // Process data in chunks to limit memory usage
      const chunkSize = 1000;
      const results = [];
      
      for (let i = 0; i < input.data.length; i += chunkSize) {
        const chunk = input.data.slice(i, i + chunkSize);
        
        // Process chunk
        const chunkResult = await processChunk(chunk);
        results.push(chunkResult);
        
        // Force garbage collection hint for large processing
        if (i % (chunkSize * 10) === 0 && global.gc) {
          global.gc();
        }
      }
      
      return {
        status: 'success',
        data: results
      };
      
    } finally {
      // Clear temporary data
      temporaryData = [];
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }
});

async function processDataStream(input: any) {
  const { Readable } = require('stream');
  const { pipeline } = require('stream/promises');
  
  const results: any[] = [];
  
  const sourceStream = new Readable({
    objectMode: true,
    read() {
      // Your stream data source logic
    }
  });
  
  const processingStream = new (require('stream').Transform)({
    objectMode: true,
    transform(chunk: any, encoding: any, callback: Function) {
      // Process each chunk
      processItem(chunk).then(result => {
        callback(null, result);
      }).catch(error => {
        callback(error);
      });
    }
  });
  
  const collectorStream = new (require('stream').Writable)({
    objectMode: true,
    write(chunk: any, encoding: any, callback: Function) {
      results.push(chunk);
      callback();
    }
  });
  
  try {
    await pipeline(sourceStream, processingStream, collectorStream);
    
    return {
      status: 'success',
      data: { processed: results.length, results }
    };
  } catch (error) {
    return {
      status: 'error',
      error: {
        code: 'STREAM_PROCESSING_ERROR',
        message: error.message,
        type: 'execution_error'
      }
    };
  }
}
```

## Production Performance Monitoring

### Built-in Metrics

Monitor your tools using the built-in metrics system:

```typescript
// Get comprehensive metrics
const metrics = await tool.getMetrics();

console.log('Performance Metrics:', {
  // Request metrics
  totalRequests: metrics.requests.total,
  requestsPerSecond: metrics.requests.ratePerSecond,
  avgResponseTime: metrics.requests.avgResponseTimeMs,
  
  // Error metrics
  errorRate: metrics.errors.rate,
  errorCount: metrics.errors.total,
  
  // Resource metrics
  memoryUsage: metrics.resources.memoryUsageBytes,
  cpuUsage: metrics.resources.cpuUsagePercent,
  
  // Cache metrics
  cacheHitRate: metrics.cache?.hitRate || 0,
  
  // Custom metrics
  databaseConnections: metrics.custom?.databaseConnections || 0
});
```

### Custom Performance Tracking

Add custom performance tracking:

```typescript
class PerformanceTracker {
  private metrics: Map<string, any> = new Map();
  
  startTimer(name: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_duration_ms`, duration);
      return duration;
    };
  }
  
  recordMetric(name: string, value: number): void {
    const existing = this.metrics.get(name) || { sum: 0, count: 0, min: Infinity, max: -Infinity };
    
    existing.sum += value;
    existing.count++;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.avg = existing.sum / existing.count;
    
    this.metrics.set(name, existing);
  }
  
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }
  
  reset(): void {
    this.metrics.clear();
  }
}

const perfTracker = new PerformanceTracker();

const trackedTool = createTool({
  // ... metadata and schema
  
  execute: async (input, config, context) => {
    const endTimer = perfTracker.startTimer('total_execution');
    
    try {
      // Track database query performance
      const dbEndTimer = perfTracker.startTimer('database_query');
      const dbResult = await queryDatabase(input.query);
      dbEndTimer();
      
      // Track API call performance
      const apiEndTimer = perfTracker.startTimer('external_api_call');
      const apiResult = await callExternalAPI(input.params);
      apiEndTimer();
      
      // Track processing performance
      const processEndTimer = perfTracker.startTimer('data_processing');
      const processedData = await processData(dbResult, apiResult);
      processEndTimer();
      
      return {
        status: 'success',
        data: processedData,
        metadata: {
          performance: perfTracker.getMetrics()
        }
      };
      
    } finally {
      endTimer();
    }
  }
});
```

## Performance Best Practices

### 1. Tool Design Principles

```typescript
// ✅ Good: Specific, focused tool
const weatherTool = createTool({
  metadata: {
    name: 'weather-lookup',
    description: 'Get current weather for a specific city',
    capabilities: ['weather.current'] // Single, clear capability
  },
  // Focused schema with clear constraints
  schema: {
    input: {
      city: stringField({ required: true, maxLength: 100 }),
      units: enumField(['celsius', 'fahrenheit'], { default: 'celsius' })
    }
  }
});

// ❌ Avoid: Overly broad, complex tools
const everythingTool = createTool({
  metadata: {
    name: 'do-everything',
    description: 'Does weather, emails, database queries, and more',
    capabilities: ['weather', 'email', 'database', 'files', 'api'] // Too broad
  }
});
```

### 2. Input Validation Optimization

```typescript
// ✅ Good: Efficient validation
const optimizedSchema = {
  input: {
    // Use specific constraints for faster validation
    id: stringField({
      required: true,
      minLength: 8,
      maxLength: 8,
      pattern: '^[A-Z0-9]{8}$' // Specific pattern
    }),
    
    // Limit collection sizes
    tags: arrayField(stringField({ maxLength: 50 }), {
      maxItems: 10,
      uniqueItems: true
    }),
    
    // Use enums instead of free-form text when possible
    category: enumField(['urgent', 'normal', 'low'], {
      default: 'normal'
    })
  }
};

// ❌ Avoid: Inefficient validation
const inefficientSchema = {
  input: {
    // Unbounded validation
    description: stringField({ required: true }), // No max length
    
    // Complex regex that's expensive to evaluate
    complexField: stringField({
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+'
    }),
    
    // Unlimited array size
    items: arrayField(objectField({})) // No size limits
  }
};
```

### 3. Resource Management

```typescript
// ✅ Good: Proper resource management
const resourceManagedTool = createTool({
  setup: async (config) => {
    // Initialize connections during setup
    await initializeConnections(config);
  },
  
  execute: async (input, config, context) => {
    // Use connection pools, don't create new connections
    const result = await useExistingConnection(input);
    
    // Set appropriate timeouts
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), 30000);
    });
    
    const operationPromise = performOperation(input);
    
    return Promise.race([operationPromise, timeoutPromise]);
  },
  
  cleanup: async () => {
    // Clean up resources properly
    await closeConnections();
  }
});

// ❌ Avoid: Resource leaks
const resourceLeakyTool = createTool({
  execute: async (input, config, context) => {
    // Creates new connection every time
    const connection = await createNewConnection(config);
    
    // No timeout - can hang forever
    const result = await performLongOperation(input);
    
    // Connection never closed - memory leak!
    return { status: 'success', data: result };
  }
});
```

### 4. Error Handling for Performance

```typescript
// ✅ Good: Fast-fail error handling
const fastFailTool = createTool({
  execute: async (input, config, context) => {
    // Validate critical requirements early
    if (!input.requiredField) {
      return {
        status: 'error',
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Required field is missing',
          type: 'validation_error'
        }
      };
    }
    
    // Use circuit breaker pattern for external services
    if (await isExternalServiceDown()) {
      return {
        status: 'error',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'External service is currently unavailable',
          type: 'network_error',
          retryable: true,
          retryAfterMs: 30000
        }
      };
    }
    
    // Continue with execution
    return await performOperation(input);
  }
});
```

## Deployment Performance Configuration

### Environment Variables for Performance

```bash
# Node.js performance tuning
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# Tool-specific performance settings
AI_SPINE_CACHE_TTL=600
AI_SPINE_MAX_CONNECTIONS=20
AI_SPINE_REQUEST_TIMEOUT=30000
AI_SPINE_ENABLE_COMPRESSION=true
AI_SPINE_WORKER_THREADS=4

# Database performance
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Redis cache performance
REDIS_MAX_CONNECTIONS=10
REDIS_COMMAND_TIMEOUT=5000
REDIS_RETRY_DELAY=100
```

### Docker Performance Configuration

```dockerfile
# Multi-stage build for smaller images
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app

# Performance optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy only production files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Run as non-root user for security and performance
USER node

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Kubernetes Performance Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-spine-tool
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: tool
        image: your-tool:latest
        ports:
        - containerPort: 3000
        
        # Resource limits for performance
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        # Performance-oriented environment
        env:
        - name: NODE_ENV
          value: "production"
        - name: NODE_OPTIONS
          value: "--max-old-space-size=512"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# Horizontal Pod Autoscaler for performance scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-spine-tool-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-spine-tool
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Performance Troubleshooting

### Common Performance Issues

1. **High Response Times**
   - Check for blocking operations in the main thread
   - Review database query performance
   - Verify external API response times
   - Check for memory leaks causing GC pressure

2. **Memory Leaks**
   - Monitor heap usage over time
   - Check for unclosed connections
   - Review event listener cleanup
   - Verify cache size limits

3. **CPU Usage Spikes**
   - Profile CPU-intensive operations
   - Check for inefficient algorithms
   - Review regex performance
   - Monitor JSON parsing overhead

4. **Connection Pool Exhaustion**
   - Review pool configuration
   - Check for connection leaks
   - Monitor connection lifetime
   - Verify proper error handling

### Performance Debugging Tools

```bash
# Node.js profiling
node --prof your-tool.js
node --prof-process isolate-*.log

# Memory usage monitoring
node --inspect your-tool.js
# Then use Chrome DevTools

# Event loop lag monitoring
npm install --save clinic
clinic doctor -- node your-tool.js
```

---

**Next Steps:**
- [Security Implementation](./security.md)
- [Testing Strategies](./testing.md)
- [Error Handling](./error-handling.md)
- [Monitoring Guide](../integration/monitoring.md)