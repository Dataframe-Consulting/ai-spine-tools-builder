# CI/CD Setup Guide

Set up robust continuous integration and deployment pipelines for your AI Spine tools with automated testing, security scanning, and deployment.

## Overview

This guide covers:
- GitHub Actions workflows for CI/CD
- Multi-environment deployment strategies
- Automated testing and quality gates
- Security scanning and compliance
- Deployment rollback procedures

## GitHub Actions Setup

### Basic CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Test & Quality Gates
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Run type check
      run: npm run type-check
      
    - name: Run unit tests
      run: npm run test
      env:
        NODE_ENV: test
        
    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        TEST_DATABASE_URL: postgres://test:test@localhost:5432/testdb
        
    - name: Generate coverage report
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        file: ./coverage/lcov.info
        fail_ci_if_error: true

  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run npm audit
      run: npm audit --audit-level=moderate
      
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
        
    - name: Run CodeQL analysis
      uses: github/codeql-action/analyze@v2
      with:
        languages: typescript, javascript

  build:
    name: Build & Package
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Run build verification
      run: npm run verify-build
      
    - name: Package application
      run: npm pack
      
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: build-artifacts
        path: |
          dist/
          *.tgz
        retention-days: 7

  docker:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix=sha-
          type=raw,value=latest,enable={{is_default_branch}}
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
        format: 'sarif'
        output: 'trivy-results.sarif'
        
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event.workflow_run.conclusion == 'success'
    environment:
      name: staging
      url: https://staging-api.example.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'
        
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
        
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region us-west-2 --name staging-cluster
        
    - name: Deploy to staging
      run: |
        # Update deployment with new image
        kubectl set image deployment/ai-spine-tool \
          tool=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }} \
          -n staging
          
        # Wait for rollout to complete
        kubectl rollout status deployment/ai-spine-tool -n staging --timeout=300s
        
    - name: Run smoke tests
      run: |
        # Wait for service to be ready
        kubectl wait --for=condition=ready pod -l app=ai-spine-tool -n staging --timeout=300s
        
        # Get service URL
        SERVICE_URL=$(kubectl get service ai-spine-tool -n staging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        
        # Run smoke tests
        npm run test:smoke -- --url=https://$SERVICE_URL
        
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: "Staging deployment completed for ${{ github.sha }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    needs: deploy-staging
    environment:
      name: production
      url: https://api.example.com
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
        
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region us-west-2 --name production-cluster
        
    - name: Create deployment backup
      run: |
        # Backup current deployment
        kubectl get deployment ai-spine-tool -n production -o yaml > deployment-backup.yaml
        
        # Store backup as artifact
        echo "BACKUP_SHA=$(git rev-parse HEAD~1)" >> $GITHUB_ENV
        
    - name: Deploy to production
      run: |
        # Blue-green deployment strategy
        kubectl set image deployment/ai-spine-tool \
          tool=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }} \
          -n production
          
        # Wait for rollout
        kubectl rollout status deployment/ai-spine-tool -n production --timeout=600s
        
    - name: Run health checks
      run: |
        # Wait for pods to be ready
        kubectl wait --for=condition=ready pod -l app=ai-spine-tool -n production --timeout=300s
        
        # Get service URL
        SERVICE_URL=$(kubectl get service ai-spine-tool -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        
        # Run comprehensive health checks
        npm run test:health -- --url=https://$SERVICE_URL --timeout=30000
        
    - name: Validate deployment
      run: |
        # Run integration tests against production
        npm run test:integration:production
        
        # Check error rates
        npm run check-error-rates -- --duration=5m --threshold=1%
        
    - name: Rollback on failure
      if: failure()
      run: |
        echo "Deployment failed, rolling back..."
        kubectl apply -f deployment-backup.yaml -n production
        kubectl rollout status deployment/ai-spine-tool -n production --timeout=300s
        
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: "Production deployment ${{ job.status }} for version ${{ github.ref_name }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Multi-Environment Configuration

### Environment-Specific Settings

Create environment configuration files:

**`.env.development`**:
```bash
NODE_ENV=development
LOG_LEVEL=debug
API_TIMEOUT=30000
CACHE_TTL=300
DATABASE_URL=postgres://dev:dev@localhost:5432/devdb
REDIS_URL=redis://localhost:6379/0
EXTERNAL_API_URL=https://api-staging.external-service.com
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

**`.env.staging`**:
```bash
NODE_ENV=staging
LOG_LEVEL=info
API_TIMEOUT=15000
CACHE_TTL=600
DATABASE_URL=postgres://staging:${DB_PASSWORD}@staging-db.cluster.amazonaws.com:5432/stagingdb
REDIS_URL=redis://staging-redis.cluster.amazonaws.com:6379/0
EXTERNAL_API_URL=https://api-staging.external-service.com
RATE_LIMIT_REQUESTS=5000
RATE_LIMIT_WINDOW=3600
MONITORING_ENABLED=true
METRICS_ENDPOINT=https://metrics.staging.example.com
```

**`.env.production`**:
```bash
NODE_ENV=production
LOG_LEVEL=warn
API_TIMEOUT=10000
CACHE_TTL=1800
DATABASE_URL=postgres://prod:${DB_PASSWORD}@prod-db.cluster.amazonaws.com:5432/proddb
REDIS_URL=redis://prod-redis.cluster.amazonaws.com:6379/0
EXTERNAL_API_URL=https://api.external-service.com
RATE_LIMIT_REQUESTS=10000
RATE_LIMIT_WINDOW=3600
MONITORING_ENABLED=true
METRICS_ENDPOINT=https://metrics.example.com
SENTRY_DSN=${SENTRY_DSN}
```

### Kubernetes Manifests

**`k8s/base/deployment.yaml`**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-spine-tool
  labels:
    app: ai-spine-tool
    version: "1.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-spine-tool
  template:
    metadata:
      labels:
        app: ai-spine-tool
        version: "1.0"
    spec:
      containers:
      - name: tool
        image: ghcr.io/your-org/ai-spine-tool:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: ai-spine-tool-secrets
        - configMapRef:
            name: ai-spine-tool-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        lifecycle:
          preStop:
            exec:
              command: ["sh", "-c", "sleep 15"]
---
apiVersion: v1
kind: Service
metadata:
  name: ai-spine-tool
  labels:
    app: ai-spine-tool
spec:
  selector:
    app: ai-spine-tool
  ports:
  - port: 80
    targetPort: http
    name: http
  type: LoadBalancer
```

**`k8s/overlays/staging/kustomization.yaml`**:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: staging

resources:
- ../../base

patchesStrategicMerge:
- deployment-patch.yaml
- service-patch.yaml

configMapGenerator:
- name: ai-spine-tool-config
  literals:
  - LOG_LEVEL=info
  - CACHE_TTL=600
  - RATE_LIMIT_REQUESTS=5000

secretGenerator:
- name: ai-spine-tool-secrets
  literals:
  - DATABASE_URL=postgres://staging:password@staging-db:5432/stagingdb
  - REDIS_URL=redis://staging-redis:6379/0
  - EXTERNAL_API_KEY=staging-api-key
```

**`k8s/overlays/production/kustomization.yaml`**:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base

patchesStrategicMerge:
- deployment-patch.yaml
- hpa-patch.yaml

configMapGenerator:
- name: ai-spine-tool-config
  literals:
  - LOG_LEVEL=warn
  - CACHE_TTL=1800
  - RATE_LIMIT_REQUESTS=10000
  - MONITORING_ENABLED=true

secretGenerator:
- name: ai-spine-tool-secrets
  literals:
  - DATABASE_URL=postgres://prod:password@prod-db:5432/proddb
  - REDIS_URL=redis://prod-redis:6379/0
  - EXTERNAL_API_KEY=prod-api-key
  - SENTRY_DSN=https://your-sentry-dsn
```

## Testing in CI/CD

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc && npm run copy-assets",
    "build:docker": "docker build -t ai-spine-tool .",
    "start": "node dist/index.js",
    
    "test": "jest --coverage --passWithNoTests",
    "test:watch": "jest --watch",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:smoke": "node scripts/smoke-tests.js",
    "test:health": "node scripts/health-checks.js",
    "test:load": "node scripts/load-tests.js",
    "test:coverage": "jest --coverage --coverageReporters=lcov",
    
    "lint": "eslint src/ --ext .ts,.js",
    "lint:fix": "eslint src/ --ext .ts,.js --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write 'src/**/*.{ts,js,json}'",
    "format:check": "prettier --check 'src/**/*.{ts,js,json}'",
    
    "verify-build": "node scripts/verify-build.js",
    "check-dependencies": "npm audit --audit-level moderate",
    "check-outdated": "npm outdated",
    "check-error-rates": "node scripts/check-error-rates.js",
    
    "docker:build": "docker build -t ai-spine-tool .",
    "docker:run": "docker run -p 3000:3000 ai-spine-tool",
    "docker:test": "docker run --rm ai-spine-tool npm test"
  }
}
```

### Test Configuration

**`jest.config.js`**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts'
  ],
  
  // Module mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**`jest.integration.config.js`**:
```javascript
module.exports = {
  ...require('./jest.config.js'),
  
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts'
  ],
  
  // Integration test timeout
  testTimeout: 30000,
  
  // Run integration tests serially
  maxWorkers: 1,
  
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/integration.setup.ts'
  ]
};
```

### Test Scripts

**`scripts/smoke-tests.js`**:
```javascript
#!/usr/bin/env node

const axios = require('axios');

const baseUrl = process.env.SERVICE_URL || 'http://localhost:3000';
const timeout = parseInt(process.env.TIMEOUT || '10000');

async function runSmokeTests() {
  console.log(`Running smoke tests against ${baseUrl}`);
  
  try {
    // Health check
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`, { timeout });
    
    if (healthResponse.data.status !== 'healthy') {
      throw new Error(`Health check failed: ${healthResponse.data.status}`);
    }
    
    // Schema endpoint
    console.log('Testing schema endpoint...');
    const schemaResponse = await axios.get(`${baseUrl}/schema`, { timeout });
    
    if (!schemaResponse.data.metadata) {
      throw new Error('Schema endpoint missing metadata');
    }
    
    // Execute endpoint
    console.log('Testing execute endpoint...');
    const executeResponse = await axios.post(`${baseUrl}/api/execute`, {
      input_data: { test: true }
    }, { timeout });
    
    if (!executeResponse.data.execution_id) {
      throw new Error('Execute endpoint missing execution_id');
    }
    
    console.log('✅ All smoke tests passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Smoke tests failed:', error.message);
    process.exit(1);
  }
}

runSmokeTests();
```

**`scripts/health-checks.js`**:
```javascript
#!/usr/bin/env node

const axios = require('axios');

const baseUrl = process.env.SERVICE_URL || 'http://localhost:3000';
const timeout = parseInt(process.env.TIMEOUT || '30000');
const maxRetries = 5;
const retryDelay = 5000;

async function runHealthChecks() {
  console.log(`Running comprehensive health checks against ${baseUrl}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Basic health check
      const healthResponse = await axios.get(`${baseUrl}/health`, { timeout });
      const health = healthResponse.data;
      
      // Validate health response structure
      if (health.status !== 'healthy') {
        throw new Error(`Service not healthy: ${health.status}`);
      }
      
      if (!health.metadata || !health.uptime_seconds) {
        throw new Error('Health response missing required fields');
      }
      
      // Check metrics if available
      try {
        const metricsResponse = await axios.get(`${baseUrl}/metrics`, { timeout });
        const metrics = metricsResponse.data;
        
        // Validate key metrics
        if (metrics.error_rate_percent > 5) {
          throw new Error(`High error rate: ${metrics.error_rate_percent}%`);
        }
        
        if (metrics.avg_response_time_ms > 5000) {
          throw new Error(`High response time: ${metrics.avg_response_time_ms}ms`);
        }
        
      } catch (metricsError) {
        console.warn('Metrics endpoint not available or failed');
      }
      
      // Test actual functionality
      const testInput = { test: true, timestamp: Date.now() };
      const executeResponse = await axios.post(`${baseUrl}/api/execute`, {
        input_data: testInput
      }, { timeout });
      
      if (executeResponse.data.status !== 'success' && executeResponse.data.status !== 'error') {
        throw new Error('Execute endpoint returned invalid status');
      }
      
      console.log(`✅ Health check passed (attempt ${attempt}/${maxRetries})`);
      console.log(`   Status: ${health.status}`);
      console.log(`   Uptime: ${health.uptime_seconds}s`);
      console.log(`   Version: ${health.metadata.version || 'unknown'}`);
      
      process.exit(0);
      
    } catch (error) {
      console.error(`❌ Health check failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All health check attempts failed');
        process.exit(1);
      }
      
      console.log(`Retrying in ${retryDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

runHealthChecks();
```

## Deployment Strategies

### Blue-Green Deployment

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

NAMESPACE=${1:-production}
IMAGE_TAG=${2:-latest}
REGISTRY="ghcr.io/your-org/ai-spine-tool"

echo "Starting blue-green deployment to $NAMESPACE"

# Current active deployment (blue or green)
CURRENT_COLOR=$(kubectl get deployment ai-spine-tool-blue -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null)
if [ "$CURRENT_COLOR" -gt 0 ]; then
    ACTIVE_COLOR="blue"
    INACTIVE_COLOR="green"
else
    ACTIVE_COLOR="green"
    INACTIVE_COLOR="blue"
fi

echo "Current active: $ACTIVE_COLOR, deploying to: $INACTIVE_COLOR"

# Deploy to inactive environment
kubectl set image deployment/ai-spine-tool-$INACTIVE_COLOR \
    tool=$REGISTRY:$IMAGE_TAG -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/ai-spine-tool-$INACTIVE_COLOR -n $NAMESPACE --timeout=300s

# Scale up inactive deployment
kubectl scale deployment ai-spine-tool-$INACTIVE_COLOR --replicas=3 -n $NAMESPACE

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=ai-spine-tool,color=$INACTIVE_COLOR -n $NAMESPACE --timeout=300s

# Run health checks against inactive deployment
SERVICE_URL=$(kubectl get service ai-spine-tool-$INACTIVE_COLOR -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
npm run test:health -- --url=https://$SERVICE_URL

# Switch traffic to new deployment
kubectl patch service ai-spine-tool -n $NAMESPACE -p '{"spec":{"selector":{"color":"'$INACTIVE_COLOR'"}}}'

# Wait and verify traffic switch
sleep 30
npm run test:smoke -- --url=https://api.example.com

# Scale down old deployment
kubectl scale deployment ai-spine-tool-$ACTIVE_COLOR --replicas=0 -n $NAMESPACE

echo "Blue-green deployment completed successfully"
```

### Canary Deployment

```yaml
# canary-deployment.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: ai-spine-tool
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      # Canary deployment configuration
      steps:
      - setWeight: 10    # Start with 10% traffic
      - pause:           # Manual approval gate
          duration: 300s # Auto-continue after 5min
      - setWeight: 25    # Increase to 25%
      - pause:
          duration: 300s
      - setWeight: 50    # Increase to 50%
      - pause:
          duration: 300s
      - setWeight: 75    # Increase to 75%
      - pause:
          duration: 300s
      # 100% traffic automatically
      
      # Analysis during rollout
      analysis:
        templates:
        - templateName: success-rate
        - templateName: latency-p99
        args:
        - name: service-name
          value: ai-spine-tool
        
      # Traffic routing
      trafficRouting:
        istio:
          virtualService:
            name: ai-spine-tool-vs
          destinationRule:
            name: ai-spine-tool-dr
            canarySubsetName: canary
            stableSubsetName: stable
  
  selector:
    matchLabels:
      app: ai-spine-tool
  
  template:
    metadata:
      labels:
        app: ai-spine-tool
    spec:
      containers:
      - name: tool
        image: ghcr.io/your-org/ai-spine-tool:latest
        # ... container spec
```

## Monitoring and Alerting

### Prometheus Metrics

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
    - job_name: 'ai-spine-tools'
      static_configs:
      - targets: ['ai-spine-tool:3000']
      metrics_path: '/metrics'
      scrape_interval: 30s
      
    rule_files:
    - "alert_rules.yml"
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets: ['alertmanager:9093']
  
  alert_rules.yml: |
    groups:
    - name: ai-spine-tool-alerts
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: LowSuccessRate
        expr: rate(http_requests_total{status="200"}[5m]) / rate(http_requests_total[5m]) < 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Low success rate detected"
          description: "Success rate is {{ $value | humanizePercentage }}"
```

### Deployment Notifications

**`scripts/notify-deployment.js`**:
```javascript
#!/usr/bin/env node

const axios = require('axios');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DEPLOYMENT_STATUS = process.env.DEPLOYMENT_STATUS || 'success';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
const VERSION = process.env.VERSION || 'unknown';
const COMMIT_SHA = process.env.GITHUB_SHA || 'unknown';

async function sendNotification() {
  if (!SLACK_WEBHOOK_URL) {
    console.log('No Slack webhook configured, skipping notification');
    return;
  }
  
  const color = DEPLOYMENT_STATUS === 'success' ? 'good' : 'danger';
  const emoji = DEPLOYMENT_STATUS === 'success' ? '🚀' : '💥';
  
  const message = {
    text: `${emoji} Deployment ${DEPLOYMENT_STATUS.toUpperCase()}`,
    attachments: [{
      color: color,
      fields: [
        {
          title: 'Environment',
          value: ENVIRONMENT,
          short: true
        },
        {
          title: 'Version',
          value: VERSION,
          short: true
        },
        {
          title: 'Commit',
          value: COMMIT_SHA.substring(0, 8),
          short: true
        },
        {
          title: 'Time',
          value: new Date().toISOString(),
          short: true
        }
      ]
    }]
  };
  
  try {
    await axios.post(SLACK_WEBHOOK_URL, message);
    console.log('Deployment notification sent successfully');
  } catch (error) {
    console.error('Failed to send deployment notification:', error.message);
  }
}

sendNotification();
```

---

**Next Steps:**
- [Docker Deployment](./docker.md)
- [Monitoring & Observability](./monitoring.md)
- [Cloud Platform Guides](./cloud.md)
- [Troubleshooting](./troubleshooting.md)