# Monitoring and Observability

Comprehensive monitoring, logging, and observability setup for AI Spine tools to ensure reliability and performance in production.

## Overview

Monitoring AI Spine tools involves tracking performance metrics, health status, error rates, and business metrics. This guide covers instrumentation, metrics collection, alerting, and observability best practices.

## Metrics and Instrumentation

### Built-in Metrics

AI Spine tools automatically expose basic metrics:

```javascript
// Built-in metrics exposed at /metrics
const metrics = {
  http_requests_total: 'Counter of HTTP requests',
  http_request_duration_seconds: 'Histogram of request durations',
  tool_executions_total: 'Counter of tool executions',
  tool_execution_duration_seconds: 'Histogram of execution times',
  tool_execution_errors_total: 'Counter of execution errors',
  active_connections: 'Gauge of active connections',
  memory_usage_bytes: 'Current memory usage',
  cpu_usage_percent: 'Current CPU usage'
};
```

### Custom Metrics Implementation

```javascript
// metrics.js
const prometheus = require('prom-client');

// Create a registry
const register = new prometheus.Registry();

// Default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const toolExecutionDuration = new prometheus.Histogram({
  name: 'tool_execution_duration_seconds',
  help: 'Duration of tool executions',
  labelNames: ['tool_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register]
});

const queueSize = new prometheus.Gauge({
  name: 'queue_size_total',
  help: 'Number of items in queue',
  labelNames: ['queue_name'],
  registers: [register]
});

module.exports = {
  register,
  httpRequestsTotal,
  toolExecutionDuration,
  activeUsers,
  queueSize
};
```

### Instrumentation Middleware

```javascript
// monitoring-middleware.js
const { httpRequestsTotal, toolExecutionDuration } = require('./metrics');

function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    
    httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
      
    if (req.path.includes('/execute')) {
      toolExecutionDuration
        .labels(req.body?.toolName || 'unknown', res.statusCode < 400 ? 'success' : 'error')
        .observe(duration);
    }
  });
  
  next();
}

module.exports = metricsMiddleware;
```

## Health Checks

### Comprehensive Health Check System

```javascript
// health.js
const redis = require('redis');
const { Pool } = require('pg');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.setupChecks();
  }

  setupChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('redis', this.checkRedis.bind(this));
    this.checks.set('external_api', this.checkExternalAPI.bind(this));
    this.checks.set('disk_space', this.checkDiskSpace.bind(this));
    this.checks.set('memory', this.checkMemory.bind(this));
  }

  async checkDatabase() {
    try {
      const client = new Pool({ connectionString: process.env.DATABASE_URL });
      const result = await client.query('SELECT 1');
      await client.end();
      
      return {
        status: 'healthy',
        responseTime: Date.now(),
        details: { rowCount: result.rowCount }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  async checkRedis() {
    try {
      const client = redis.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.ping();
      await client.quit();
      
      return {
        status: 'healthy',
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  async checkExternalAPI() {
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/health`, {
        timeout: 5000
      });
      
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now(),
        details: { statusCode: response.status }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  async checkDiskSpace() {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      const freeSpace = stats.free / (1024 * 1024 * 1024); // GB
      
      return {
        status: freeSpace > 1 ? 'healthy' : 'unhealthy',
        details: { freeSpaceGB: freeSpace },
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        status: memUsagePercent < 90 ? 'healthy' : 'unhealthy',
        details: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          usagePercent: Math.round(memUsagePercent)
        },
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }

  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFn] of this.checks) {
      try {
        results[name] = await checkFn();
        if (results[name].status === 'unhealthy') {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now()
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

module.exports = HealthChecker;
```

## Logging Strategy

### Structured Logging

```javascript
// logger.js
const winston = require('winston');
const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Custom format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Production format
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: 'ai-spine-tool',
    version: process.env.npm_package_version
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Request logging middleware
logger.requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
  });
  
  next();
};

module.exports = logger;
```

### Error Tracking

```javascript
// error-tracking.js
const Sentry = require('@sentry/node');
const logger = require('./logger');

class ErrorTracker {
  constructor() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // Filter sensitive data
          if (event.request) {
            delete event.request.headers?.authorization;
            delete event.request.headers?.cookie;
          }
          return event;
        }
      });
    }
  }

  captureException(error, context = {}) {
    // Log locally
    logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      ...context
    });

    // Send to Sentry if configured
    if (process.env.SENTRY_DSN) {
      Sentry.withScope(scope => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureException(error);
      });
    }
  }

  captureMessage(message, level = 'info', context = {}) {
    logger[level](message, context);

    if (process.env.SENTRY_DSN && level === 'error') {
      Sentry.withScope(scope => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
        Sentry.captureMessage(message, level);
      });
    }
  }

  middleware() {
    return (error, req, res, next) => {
      this.captureException(error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          requestId: req.headers['x-request-id']
        });
      }

      next();
    };
  }
}

module.exports = new ErrorTracker();
```

## Prometheus Integration

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'ai-spine-tools'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

remote_write:
  - url: 'http://localhost:8086/api/v1/prom/write?db=monitoring'
```

### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: ai-spine-tool-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"

      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Slow requests detected"
          description: "95th percentile latency is {{ $value }}s"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

## Grafana Dashboards

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "AI Spine Tools Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Tool Execution Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(tool_executions_total[5m])",
            "legendFormat": "Executions/sec"
          },
          {
            "expr": "rate(tool_execution_errors_total[5m])",
            "legendFormat": "Errors/sec"
          }
        ]
      }
    ]
  }
}
```

## Application Performance Monitoring (APM)

### OpenTelemetry Integration

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'ai-spine-tool',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  instrumentations: []
});

sdk.start();

module.exports = sdk;
```

### Custom Tracing

```javascript
// custom-tracing.js
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('ai-spine-tool');

function instrumentToolExecution(toolName, executeFn) {
  return async function(...args) {
    const span = tracer.startSpan(`tool.execute.${toolName}`, {
      attributes: {
        'tool.name': toolName,
        'tool.args.count': args.length
      }
    });

    try {
      const result = await executeFn.apply(this, args);
      span.setAttributes({
        'tool.result.success': true,
        'tool.result.type': typeof result
      });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setAttributes({
        'tool.result.success': false,
        'tool.error.message': error.message
      });
      throw error;
    } finally {
      span.end();
    }
  };
}

module.exports = { instrumentToolExecution };
```

## Alerting and Notifications

### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@yourcompany.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:3001/alerts'

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@yourcompany.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#critical-alerts'

  - name: 'warning-alerts'
    email_configs:
      - to: 'team@yourcompany.com'
        subject: 'WARNING: {{ .GroupLabels.alertname }}'
```

### Slack Integration

```javascript
// slack-alerts.js
const { WebClient } = require('@slack/web-api');

class SlackAlerter {
  constructor(token, channel) {
    this.slack = new WebClient(token);
    this.channel = channel;
  }

  async sendAlert(alert) {
    try {
      await this.slack.chat.postMessage({
        channel: this.channel,
        attachments: [
          {
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            title: alert.summary,
            text: alert.description,
            fields: [
              {
                title: 'Severity',
                value: alert.severity,
                short: true
              },
              {
                title: 'Service',
                value: alert.service,
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date(alert.timestamp).toISOString(),
                short: false
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }
}

module.exports = SlackAlerter;
```

## Performance Monitoring

### Performance Metrics Collection

```javascript
// performance-monitor.js
const performanceHooks = require('perf_hooks');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    const obs = new performanceHooks.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(entry.name, entry.duration);
      }
    });
    
    obs.observe({ entryTypes: ['measure', 'function'] });
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.sum / metric.count;
  }

  getMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = { ...metric };
    }
    return result;
  }

  measure(name, fn) {
    return async (...args) => {
      const start = performanceHooks.performance.now();
      try {
        const result = await fn(...args);
        return result;
      } finally {
        const end = performanceHooks.performance.now();
        performanceHooks.performance.mark(`${name}-start`);
        performanceHooks.performance.mark(`${name}-end`);
        performanceHooks.performance.measure(name, `${name}-start`, `${name}-end`);
      }
    };
  }
}

module.exports = new PerformanceMonitor();
```

## Database Monitoring

### Database Query Monitoring

```javascript
// db-monitor.js
const { Pool } = require('pg');
const { performance } = require('perf_hooks');

class DatabaseMonitor {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this.queryStats = new Map();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Override pool.query to add monitoring
    const originalQuery = this.pool.query.bind(this.pool);
    
    this.pool.query = async (text, params, callback) => {
      const start = performance.now();
      const queryKey = this.normalizeQuery(text);

      try {
        const result = await originalQuery(text, params, callback);
        this.recordQuery(queryKey, performance.now() - start, 'success');
        return result;
      } catch (error) {
        this.recordQuery(queryKey, performance.now() - start, 'error');
        throw error;
      }
    };
  }

  normalizeQuery(query) {
    // Remove parameters and normalize whitespace
    return query
      .replace(/\$\d+/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  recordQuery(queryKey, duration, status) {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        avgDuration: 0
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    
    if (status === 'error') {
      stats.errors++;
    }
  }

  getQueryStats() {
    const result = {};
    for (const [query, stats] of this.queryStats) {
      result[query] = {
        ...stats,
        errorRate: stats.errors / stats.count
      };
    }
    return result;
  }
}

module.exports = DatabaseMonitor;
```

## Monitoring Dashboard

### Express Monitoring Endpoints

```javascript
// monitoring-routes.js
const express = require('express');
const router = express.Router();
const { register } = require('./metrics');
const HealthChecker = require('./health');
const PerformanceMonitor = require('./performance-monitor');

const healthChecker = new HealthChecker();

// Prometheus metrics endpoint
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = await healthChecker.runHealthChecks();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Readiness check
router.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// Performance metrics
router.get('/performance', (req, res) => {
  res.json({
    metrics: PerformanceMonitor.getMetrics(),
    timestamp: new Date().toISOString()
  });
});

// System info
router.get('/info', (req, res) => {
  res.json({
    version: process.env.npm_package_version,
    node_version: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    cpu_usage: process.cpuUsage(),
    env: process.env.NODE_ENV
  });
});

module.exports = router;
```

## Best Practices

### Monitoring Strategy

1. **Golden Signals**
   - **Latency**: Track response times and execution duration
   - **Traffic**: Monitor request rates and concurrent users
   - **Errors**: Track error rates and types
   - **Saturation**: Monitor resource utilization

2. **Alert Fatigue Prevention**
   - Use appropriate thresholds
   - Implement alert escalation
   - Group related alerts
   - Provide actionable information

3. **Observability Principles**
   - Use structured logging
   - Implement distributed tracing
   - Collect business metrics
   - Monitor user experience

### Performance Baselines

```javascript
// Define acceptable performance thresholds
const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    p50: 100,  // 50th percentile < 100ms
    p95: 500,  // 95th percentile < 500ms
    p99: 1000  // 99th percentile < 1s
  },
  errorRate: 0.01,     // < 1% error rate
  availability: 0.999,  // 99.9% uptime
  memoryUsage: 0.8,    // < 80% memory usage
  cpuUsage: 0.7        // < 70% CPU usage
};
```

## Troubleshooting

### Common Monitoring Issues

1. **Missing Metrics**
   - Verify Prometheus scraping configuration
   - Check network connectivity
   - Validate metrics endpoint accessibility

2. **High Cardinality Metrics**
   - Limit label values
   - Use appropriate aggregation
   - Implement metric cleanup

3. **Alert Noise**
   - Adjust thresholds based on baseline
   - Implement alert dependencies
   - Use alert inhibition rules

## Next Steps

- [Troubleshooting Guide](troubleshooting.md)
- [Docker Integration](docker.md)
- [Performance Optimization](../guides/optimization.md)
- [Security Monitoring](../advanced/security.md)