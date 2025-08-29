# Docker Integration

Learn how to containerize and deploy AI Spine tools using Docker for scalable, portable deployments.

## Overview

Docker provides an excellent way to package and deploy AI Spine tools with all their dependencies. This guide covers containerization strategies, best practices, and deployment patterns.

## Basic Containerization

### Dockerfile Template

```dockerfile
# Use Node.js 18+ LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S tooluser && \
    adduser -S tooluser -u 1001 -G tooluser

# Set ownership and switch to non-root user
RUN chown -R tooluser:tooluser /app
USER tooluser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the tool
CMD ["npm", "start"]
```

### Multi-stage Build

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN addgroup -g 1001 -S tooluser && \
    adduser -S tooluser -u 1001 -G tooluser && \
    chown -R tooluser:tooluser /app

USER tooluser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

## Environment Configuration

### Environment Variables

```bash
# .env.docker
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# AI Spine Configuration
AI_SPINE_TOOL_NAME=my-tool
AI_SPINE_TOOL_VERSION=1.0.0
AI_SPINE_HEALTH_CHECK=true

# External Service URLs
DATABASE_URL=postgresql://user:pass@db:5432/tooldb
REDIS_URL=redis://redis:6379
API_BASE_URL=https://api.example.com

# Security
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://your-app.com,https://staging.your-app.com
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  ai-spine-tool:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.docker
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    networks:
      - ai-spine-network
    volumes:
      - tool-logs:/app/logs

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks:
      - ai-spine-network
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: tooldb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    networks:
      - ai-spine-network
    volumes:
      - postgres-data:/var/lib/postgresql/data

networks:
  ai-spine-network:
    driver: bridge

volumes:
  tool-logs:
  redis-data:
  postgres-data:
```

## Development with Docker

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  ai-spine-tool:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    env_file:
      - .env.dev
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    networks:
      - ai-spine-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - ai-spine-network

networks:
  ai-spine-network:
    driver: bridge
```

### Development Dockerfile

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Install development dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 9229

# Development command with hot reload
CMD ["npm", "run", "dev"]
```

## Production Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'

services:
  ai-spine-tool:
    image: your-registry/ai-spine-tool:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    secrets:
      - api_key
      - jwt_secret
    networks:
      - ai-spine-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - ai-spine-tool
    networks:
      - ai-spine-network

secrets:
  api_key:
    external: true
  jwt_secret:
    external: true

networks:
  ai-spine-network:
    driver: overlay
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-spine-tool
  labels:
    app: ai-spine-tool
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-spine-tool
  template:
    metadata:
      labels:
        app: ai-spine-tool
    spec:
      containers:
      - name: ai-spine-tool
        image: your-registry/ai-spine-tool:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-spine-secrets
              key: api-key
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: ai-spine-tool-service
spec:
  selector:
    app: ai-spine-tool
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Security Best Practices

### Container Security

```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine

# Update packages and install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S tooluser && \
    adduser -S tooluser -u 1001 -G tooluser

WORKDIR /app

# Set proper ownership
RUN chown -R tooluser:tooluser /app

# Switch to non-root user early
USER tooluser

# Copy and install dependencies
COPY --chown=tooluser:tooluser package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=tooluser:tooluser dist/ ./dist/

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Health check as non-root
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Secrets Management

```bash
# Docker Secrets (Swarm)
echo "your-api-key" | docker secret create api_key -
echo "your-jwt-secret" | docker secret create jwt_secret -

# Kubernetes Secrets
kubectl create secret generic ai-spine-secrets \
  --from-literal=api-key="your-api-key" \
  --from-literal=jwt-secret="your-jwt-secret"
```

## Monitoring and Logging

### Logging Configuration

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: '/app/logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/app/logs/combined.log' 
    })
  ]
});

module.exports = logger;
```

### Health Checks

```javascript
// health.js
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check external dependencies
    const checks = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalAPI()
    ]);

    const allHealthy = checks.every(check => check.healthy);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/ready', (req, res) => {
  // Basic readiness check
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
```

## Performance Optimization

### Build Optimization

```dockerfile
# Optimized multi-stage build
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:18-alpine AS runtime
RUN apk add --no-cache dumb-init
WORKDIR /app

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN addgroup -g 1001 -S tooluser && \
    adduser -S tooluser -u 1001 -G tooluser && \
    chown -R tooluser:tooluser /app

USER tooluser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Resource Management

```yaml
# Resource limits and requests
resources:
  limits:
    cpu: "1"
    memory: "1Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"

# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-spine-tool-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-spine-tool
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

1. **Container Fails to Start**
   ```bash
   # Check logs
   docker logs container-name
   
   # Check resource constraints
   docker stats container-name
   
   # Inspect container
   docker inspect container-name
   ```

2. **Health Check Failures**
   ```bash
   # Test health endpoint manually
   docker exec container-name curl http://localhost:3000/health
   
   # Check health check logs
   docker inspect --format='{{.State.Health}}' container-name
   ```

3. **Permission Issues**
   ```bash
   # Check user permissions
   docker exec container-name id
   
   # Check file ownership
   docker exec container-name ls -la /app
   ```

## Next Steps

- [Monitoring Integration](monitoring.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Security Best Practices](../advanced/security.md)
- [Performance Optimization](../guides/optimization.md)