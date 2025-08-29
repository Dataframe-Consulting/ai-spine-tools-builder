# Troubleshooting Guide

Comprehensive troubleshooting guide for common issues with AI Spine tools, including diagnostic procedures, solutions, and preventive measures.

## Overview

This guide helps diagnose and resolve common issues encountered when developing, deploying, and running AI Spine tools. Each section includes symptoms, causes, diagnostic steps, and solutions.

## Tool Creation Issues

### Tool Registration Failures

**Symptoms:**
- Tool fails to register with AI Spine
- Registration endpoint returns 400/500 errors
- Tool metadata not accepted

**Common Causes:**
- Invalid metadata format
- Missing required fields
- Schema validation errors
- Authentication issues

**Diagnostic Steps:**

```bash
# Check tool metadata
curl -X GET http://localhost:3000/metadata

# Validate schema format
node -e "console.log(JSON.stringify(require('./tool-definition.json'), null, 2))"

# Test registration endpoint
curl -X POST http://ai-spine-server/tools/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @tool-definition.json
```

**Solutions:**

```javascript
// Ensure proper metadata format
const metadata = {
  name: "my-tool",
  version: "1.0.0",
  description: "Tool description",
  // All required fields must be present
  author: "Your Name",
  category: "utilities"
};

// Validate before registration
const { z } = require('zod');
const metadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10),
  author: z.string().min(1),
  category: z.string().min(1)
});

try {
  metadataSchema.parse(metadata);
  console.log("Metadata is valid");
} catch (error) {
  console.error("Validation errors:", error.errors);
}
```

### Schema Validation Errors

**Symptoms:**
- Tool execution fails with validation errors
- Input parameters rejected
- Type conversion errors

**Common Causes:**
- Mismatched field types
- Missing required fields
- Invalid field constraints
- Wrong data format

**Diagnostic Steps:**

```javascript
// Debug schema validation
const { createTool } = require('@ai-spine/tools');

const tool = createTool({
  metadata: { /* ... */ },
  schema: {
    input: {
      textField: stringField({
        description: "Text input",
        required: true,
        minLength: 5
      }),
      numberField: numberField({
        description: "Number input",
        required: true,
        min: 0,
        max: 100
      })
    }
  },
  execute: async ({ input }) => {
    // Debug received input
    console.log("Received input:", JSON.stringify(input, null, 2));
    console.log("Input types:", Object.entries(input).map(([k, v]) => [k, typeof v]));
    
    // Validate manually
    if (typeof input.textField !== 'string') {
      throw new Error(`Expected string for textField, got ${typeof input.textField}`);
    }
    
    return { success: true };
  }
});
```

**Solutions:**

```javascript
// Use proper field builders with validation
const { stringField, numberField, arrayField } = require('@ai-spine/tools-core');

// Correct field definition
const schema = {
  input: {
    text: stringField({
      description: "Input text",
      required: true,
      minLength: 1,
      maxLength: 1000
    }),
    count: numberField({
      description: "Count parameter",
      required: false,
      default: 1,
      min: 1,
      max: 100,
      integer: true
    }),
    options: arrayField({
      description: "List of options",
      required: false,
      default: [],
      itemType: "string",
      minItems: 0,
      maxItems: 10
    })
  }
};

// Validate input in execution
execute: async ({ input, config }) => {
  // Additional runtime validation if needed
  if (input.text && input.text.length === 0) {
    throw new Error("Text field cannot be empty");
  }
  
  return { result: "success" };
}
```

## Runtime Errors

### Tool Execution Timeouts

**Symptoms:**
- Tool executions hang indefinitely
- Timeout errors in logs
- Client connections drop

**Common Causes:**
- Long-running operations without proper async handling
- Blocking synchronous operations
- Network timeouts
- Resource exhaustion

**Diagnostic Steps:**

```javascript
// Add execution timing
const { performance } = require('perf_hooks');

execute: async ({ input }) => {
  const startTime = performance.now();
  console.log('Execution started at:', new Date().toISOString());
  
  try {
    // Your tool logic here
    const result = await performOperation(input);
    
    const duration = performance.now() - startTime;
    console.log(`Execution completed in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`Execution failed after ${duration}ms:`, error);
    throw error;
  }
}

// Monitor for hanging operations
const withTimeout = (promise, timeoutMs = 30000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};
```

**Solutions:**

```javascript
// Implement proper async patterns
execute: async ({ input }) => {
  try {
    // Use timeout for external calls
    const result = await withTimeout(
      fetch(input.url, { 
        timeout: 10000,
        signal: AbortSignal.timeout(10000)
      }),
      15000 // 15s total timeout
    );
    
    return { data: await result.json() };
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('Operation timed out. Please try again with a shorter request.');
    }
    throw error;
  }
}

// Handle long operations with progress
execute: async ({ input, onProgress }) => {
  const items = input.items;
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    // Report progress
    if (onProgress) {
      onProgress({
        completed: i,
        total: items.length,
        message: `Processing item ${i + 1} of ${items.length}`
      });
    }
    
    // Process with individual timeout
    const result = await withTimeout(
      processItem(items[i]),
      5000 // 5s per item
    );
    
    results.push(result);
  }
  
  return { results };
}
```

### Memory Leaks

**Symptoms:**
- Memory usage continuously grows
- Out of memory errors
- Performance degradation over time
- Process crashes

**Diagnostic Steps:**

```javascript
// Memory monitoring
const monitorMemory = () => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB'
  });
};

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);

// Heap dump for analysis
if (process.env.NODE_ENV === 'development') {
  const v8 = require('v8');
  const fs = require('fs');
  
  // Generate heap snapshot
  const heapSnapshot = v8.getHeapSnapshot();
  const fileName = `heap-${Date.now()}.heapsnapshot`;
  const fileStream = fs.createWriteStream(fileName);
  heapSnapshot.pipe(fileStream);
}
```

**Solutions:**

```javascript
// Proper resource cleanup
execute: async ({ input }) => {
  let connection;
  let stream;
  
  try {
    connection = await createDatabaseConnection();
    stream = fs.createReadStream(input.filePath);
    
    const result = await processStream(stream, connection);
    return result;
  } finally {
    // Always cleanup resources
    if (stream) {
      stream.destroy();
    }
    if (connection) {
      await connection.close();
    }
  }
}

// Use WeakMap for caching to prevent memory leaks
const cache = new WeakMap();

// Limit cache size
class LimitedCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## Network and Connectivity Issues

### Connection Failures

**Symptoms:**
- Cannot connect to AI Spine server
- Network timeouts
- DNS resolution failures
- Certificate errors

**Diagnostic Steps:**

```bash
# Test network connectivity
ping ai-spine-server.example.com

# Test DNS resolution
nslookup ai-spine-server.example.com

# Test SSL certificate
openssl s_client -connect ai-spine-server.example.com:443 -servername ai-spine-server.example.com

# Test HTTP connectivity
curl -v https://ai-spine-server.example.com/health

# Check firewall rules
telnet ai-spine-server.example.com 443
```

**Solutions:**

```javascript
// Implement connection retry logic
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Use in tool execution
execute: async ({ input }) => {
  return await retry(async () => {
    const response = await fetch(input.apiUrl, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'AI-Spine-Tool/1.0.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }, 3, 1000);
}

// Handle certificate issues in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
```

### Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests errors
- Requests being blocked
- Temporary service unavailability

**Diagnostic Steps:**

```javascript
// Track request rates
class RateLimitTracker {
  constructor() {
    this.requests = [];
  }
  
  addRequest() {
    const now = Date.now();
    this.requests.push(now);
    
    // Clean old requests (older than 1 minute)
    this.requests = this.requests.filter(time => now - time < 60000);
  }
  
  getRequestRate() {
    return this.requests.length; // Requests per minute
  }
  
  canMakeRequest(limit = 100) {
    return this.getRequestRate() < limit;
  }
}

const rateLimitTracker = new RateLimitTracker();
```

**Solutions:**

```javascript
// Implement rate limiting
const RateLimiter = require('limiter').RateLimiter;
const limiter = new RateLimiter(10, 'second'); // 10 requests per second

execute: async ({ input }) => {
  // Wait for rate limit
  await new Promise(resolve => {
    limiter.removeTokens(1, resolve);
  });
  
  try {
    return await makeAPICall(input);
  } catch (error) {
    if (error.status === 429) {
      // Extract retry delay from headers
      const retryAfter = error.headers['retry-after'] || 60;
      console.log(`Rate limited, waiting ${retryAfter} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await makeAPICall(input); // Retry once
    }
    throw error;
  }
}

// Implement circuit breaker pattern
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Database Issues

### Connection Pool Exhaustion

**Symptoms:**
- Database connection errors
- Timeout waiting for connection
- "Too many connections" errors

**Diagnostic Steps:**

```javascript
// Monitor connection pool
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', (client) => {
  console.log('New client connected');
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Check active connections
setInterval(() => {
  console.log('Pool status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 30000);
```

**Solutions:**

```javascript
// Proper connection management
execute: async ({ input }) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [input.userId]
    );
    
    await client.query('COMMIT');
    return { user: result.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Always release the client
    client.release();
  }
}

// Use connection with timeout
const queryWithTimeout = async (query, params, timeoutMs = 5000) => {
  const client = await pool.connect();
  
  try {
    const queryPromise = client.query(query, params);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
    });
    
    return await Promise.race([queryPromise, timeoutPromise]);
  } finally {
    client.release();
  }
};
```

### Query Performance Issues

**Symptoms:**
- Slow query execution
- Database timeouts
- High CPU usage on database server

**Diagnostic Steps:**

```sql
-- Check slow queries (PostgreSQL)
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;
```

**Solutions:**

```javascript
// Add query monitoring
const monitorQuery = (query, params) => {
  const start = Date.now();
  
  return async (client) => {
    try {
      const result = await client.query(query, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) { // Log slow queries
        console.warn(`Slow query (${duration}ms):`, query.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Query failed after ${duration}ms:`, error);
      throw error;
    }
  };
};

// Implement query optimization
execute: async ({ input }) => {
  const client = await pool.connect();
  
  try {
    // Use indexes and limit results
    const result = await client.query(`
      SELECT u.id, u.name, u.email 
      FROM users u 
      WHERE u.created_at >= $1 
      AND u.status = 'active'
      ORDER BY u.created_at DESC 
      LIMIT $2
    `, [input.since, input.limit || 100]);
    
    return { users: result.rows };
  } finally {
    client.release();
  }
}
```

## Debugging Tools and Techniques

### Logging and Debugging

```javascript
// Enhanced logging
const debug = require('debug')('ai-spine:tool');

execute: async ({ input, config }) => {
  debug('Execution started with input: %O', input);
  
  try {
    // Step-by-step debugging
    debug('Step 1: Validating input');
    validateInput(input);
    
    debug('Step 2: Processing data');
    const processed = await processData(input.data);
    debug('Processed %d items', processed.length);
    
    debug('Step 3: Generating output');
    const result = generateOutput(processed);
    
    debug('Execution completed successfully');
    return result;
  } catch (error) {
    debug('Execution failed: %s', error.message);
    debug('Stack trace: %s', error.stack);
    throw error;
  }
}

// Conditional debugging based on environment
const createDebugLogger = (namespace) => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    return require('debug')(namespace);
  }
  return () => {}; // No-op in production
};
```

### Performance Profiling

```javascript
// CPU profiling
const { performance, PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

obs.observe({ entryTypes: ['measure'], buffered: true });

execute: async ({ input }) => {
  performance.mark('execution-start');
  
  performance.mark('validation-start');
  await validateInput(input);
  performance.mark('validation-end');
  performance.measure('Input Validation', 'validation-start', 'validation-end');
  
  performance.mark('processing-start');
  const result = await processData(input);
  performance.mark('processing-end');
  performance.measure('Data Processing', 'processing-start', 'processing-end');
  
  performance.mark('execution-end');
  performance.measure('Total Execution', 'execution-start', 'execution-end');
  
  return result;
}
```

## Environment-Specific Issues

### Development Environment

**Common Issues:**
- Port conflicts
- Missing environment variables
- Hot reload problems
- CORS errors

**Solutions:**

```javascript
// Environment configuration validation
const requiredEnvVars = ['DATABASE_URL', 'API_KEY', 'PORT'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// Dynamic port assignment
const PORT = process.env.PORT || findAvailablePort(3000);

// CORS configuration for development
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }));
}
```

### Production Environment

**Common Issues:**
- Resource limits
- Security restrictions
- Load balancer configuration
- SSL certificate problems

**Solutions:**

```javascript
// Resource monitoring
const monitorResources = () => {
  const usage = process.resourceUsage();
  const memory = process.memoryUsage();
  
  console.log('Resource Usage:', {
    userCPUTime: usage.userCPUTime,
    systemCPUTime: usage.systemCPUTime,
    maxRSS: usage.maxRSS,
    memoryHeapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
  });
  
  // Alert if usage is too high
  if (memory.heapUsed / memory.heapTotal > 0.9) {
    console.warn('High memory usage detected!');
  }
};

setInterval(monitorResources, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connections
  if (pool) {
    await pool.end();
  }
  
  process.exit(0);
});
```

## Recovery Procedures

### Automated Recovery

```javascript
// Health-based restart
const restartThreshold = 5;
let consecutiveFailures = 0;

const healthCheck = async () => {
  try {
    await performHealthChecks();
    consecutiveFailures = 0;
  } catch (error) {
    consecutiveFailures++;
    console.error(`Health check failed (${consecutiveFailures}/${restartThreshold}):`, error);
    
    if (consecutiveFailures >= restartThreshold) {
      console.error('Too many consecutive failures, initiating restart...');
      process.exit(1); // Let process manager restart
    }
  }
};

setInterval(healthCheck, 30000);

// Memory-based restart
const checkMemoryUsage = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 1000) { // 1GB limit
    console.error(`Memory usage too high (${heapUsedMB}MB), restarting...`);
    process.exit(1);
  }
};

setInterval(checkMemoryUsage, 60000);
```

## Monitoring and Alerting Setup

### Error Tracking

```javascript
// Comprehensive error tracking
class ErrorTracker {
  constructor() {
    this.errors = new Map();
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      consecutiveErrors: 10
    };
  }
  
  trackError(error, context = {}) {
    const errorKey = error.message;
    const now = Date.now();
    
    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        contexts: []
      });
    }
    
    const errorData = this.errors.get(errorKey);
    errorData.count++;
    errorData.lastSeen = now;
    errorData.contexts.push({ ...context, timestamp: now });
    
    // Check alert thresholds
    this.checkAlertConditions(errorKey, errorData);
  }
  
  checkAlertConditions(errorKey, errorData) {
    const recentErrors = errorData.contexts.filter(
      ctx => Date.now() - ctx.timestamp < 300000 // Last 5 minutes
    );
    
    if (recentErrors.length >= this.alertThresholds.consecutiveErrors) {
      this.sendAlert(`High error frequency: ${errorKey}`, {
        errorCount: recentErrors.length,
        timeframe: '5 minutes'
      });
    }
  }
  
  sendAlert(message, data) {
    console.error('ALERT:', message, data);
    // Send to monitoring system
  }
  
  getErrorSummary() {
    const summary = {};
    for (const [errorKey, errorData] of this.errors) {
      summary[errorKey] = {
        count: errorData.count,
        firstSeen: new Date(errorData.firstSeen).toISOString(),
        lastSeen: new Date(errorData.lastSeen).toISOString()
      };
    }
    return summary;
  }
}

const errorTracker = new ErrorTracker();

// Use in error handling
process.on('uncaughtException', (error) => {
  errorTracker.trackError(error, { type: 'uncaught_exception' });
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorTracker.trackError(new Error(reason), { 
    type: 'unhandled_rejection',
    promise: promise.toString() 
  });
  console.error('Unhandled Rejection:', reason);
});
```

## Best Practices for Troubleshooting

### Preventive Measures

1. **Comprehensive Testing**
   - Unit tests for all critical functions
   - Integration tests for external dependencies
   - Load tests for performance verification
   - Chaos engineering for resilience testing

2. **Monitoring and Observability**
   - Detailed logging at appropriate levels
   - Metrics collection for all operations
   - Distributed tracing for complex flows
   - Real-time alerting for critical issues

3. **Error Handling**
   - Graceful degradation patterns
   - Circuit breakers for external services
   - Retry logic with exponential backoff
   - Proper error classification and reporting

4. **Resource Management**
   - Connection pooling and proper cleanup
   - Memory leak detection and prevention
   - Rate limiting and throttling
   - Resource monitoring and alerting

### Diagnostic Checklist

When encountering issues, follow this systematic approach:

1. **Identify the Problem**
   - What is the exact error message?
   - When did the issue start occurring?
   - Is it affecting all users or specific cases?
   - Can you reproduce the issue?

2. **Gather Information**
   - Check application logs
   - Review system metrics
   - Examine error tracking data
   - Check external service status

3. **Isolate the Cause**
   - Test individual components
   - Check recent changes
   - Verify configuration settings
   - Test with minimal inputs

4. **Implement Solution**
   - Apply the fix
   - Test thoroughly
   - Monitor for improvements
   - Document the resolution

5. **Prevent Recurrence**
   - Add monitoring for the issue
   - Implement additional tests
   - Update documentation
   - Review processes for gaps

## Next Steps

- [Docker Integration](docker.md)
- [Monitoring Setup](monitoring.md)
- [Performance Optimization](../guides/optimization.md)
- [Security Best Practices](../advanced/security.md)