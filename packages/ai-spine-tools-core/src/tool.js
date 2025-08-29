"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const crypto_1 = require("crypto");
const perf_hooks_1 = require("perf_hooks");
const types_js_1 = require("./types.js");
const validation_js_1 = require("./validation.js");
const field_builders_js_1 = require("./field-builders.js");
/**
 * Core Tool class that manages the complete lifecycle of an AI Spine tool.
 * This class handles HTTP server setup, request processing, validation,
 * execution, monitoring, and security.
 *
 * @example
 * ```typescript
 * import { Tool, stringField, apiKeyField } from '@ai-spine/tools-core';
 *
 * const weatherTool = new Tool({
 *   metadata: {
 *     name: 'weather-tool',
 *     version: '1.0.0',
 *     description: 'Get weather information',
 *     capabilities: ['weather.current']
 *   },
 *   schema: {
 *     input: {
 *       city: stringField().required().minLength(2).build()
 *     },
 *     config: {
 *       apiKey: apiKeyField().required().envVar('WEATHER_API_KEY').build()
 *     }
 *   },
 *   execute: async (input, config, context) => {
 *     // Your tool logic here
 *     return {
 *       status: 'success',
 *       data: { temperature: 22, description: 'sunny' }
 *     };
 *   }
 * });
 *
 * // Start the tool server
 * await weatherTool.start({ port: 3000 });
 * ```
 */
class Tool {
    /**
     * Creates a new Tool instance
     *
     * @param definition - Complete tool definition including metadata, schema, and execute function
     *
     * @example
     * ```typescript
     * const tool = new Tool({
     *   metadata: { name: 'my-tool', version: '1.0.0', description: 'A sample tool' },
     *   schema: { input: {}, config: {} },
     *   execute: async (input, config, context) => ({ status: 'success', data: {} })
     * });
     * ```
     */
    constructor(definition) {
        this.state = 'stopped';
        this.config = {};
        this.toolConfig = null;
        // Metrics and monitoring
        this.startTime = Date.now();
        this.executionHistory = [];
        this.eventListeners = {};
        // Security
        this.validApiKeys = new Set();
        this.definition = definition;
        this.validator = new validation_js_1.ZodSchemaValidator();
        this.app = (0, express_1.default)();
        this.initializeMetrics();
        this.setupExpressApp();
        this.validateDefinition();
    }
    /**
     * Validates the tool definition for completeness and correctness
     * @private
     */
    validateDefinition() {
        if (!this.definition.metadata?.name) {
            throw new types_js_1.ConfigurationError('Tool metadata must include a name');
        }
        if (!this.definition.metadata?.version) {
            throw new types_js_1.ConfigurationError('Tool metadata must include a version');
        }
        if (!this.definition.metadata?.description) {
            throw new types_js_1.ConfigurationError('Tool metadata must include a description');
        }
        if (!this.definition.schema) {
            throw new types_js_1.ConfigurationError('Tool must include a schema definition');
        }
        if (typeof this.definition.execute !== 'function') {
            throw new types_js_1.ConfigurationError('Tool must include an execute function');
        }
    }
    /**
     * Initializes metrics tracking
     * @private
     */
    initializeMetrics() {
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTimeMs: 0,
            minExecutionTimeMs: Infinity,
            maxExecutionTimeMs: 0,
            errorRatePercent: 0,
            requestsPerMinute: 0,
            memoryUsageBytes: 0,
            cpuUsagePercent: 0,
            uptimeSeconds: 0,
            recentErrors: {}
        };
    }
    /**
     * Sets up the Express.js application with middleware
     * @private
     */
    setupExpressApp() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));
        // Request parsing middleware
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // JSON parsing error handling middleware
        this.app.use((error, _req, res, next) => {
            if (error instanceof SyntaxError && 'body' in error) {
                return this.sendStandardError(res, {
                    code: 'INVALID_JSON',
                    message: 'Invalid JSON in request body',
                    type: 'client_error',
                    statusCode: 400,
                    details: {
                        error_message: 'Request body contains malformed JSON',
                        hint: 'Please ensure your JSON is properly formatted'
                    }
                });
            }
            next(error);
        });
        // Request ID middleware
        this.app.use((req, res, next) => {
            req.headers['x-request-id'] = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
            res.setHeader('X-Request-ID', req.headers['x-request-id']);
            next();
        });
        // Request logging middleware (development)
        this.app.use((req, _res, next) => {
            if (this.config.development?.requestLogging) {
                console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
            }
            next();
        });
    }
    /**
     * Applies CORS configuration
     * @private
     */
    applyCorsConfiguration() {
        if (this.config.cors) {
            this.app.use((0, cors_1.default)({
                origin: this.config.cors.origin || false,
                credentials: this.config.cors.credentials || false,
                allowedHeaders: this.config.cors.allowedHeaders || ['Content-Type', 'Authorization', 'X-API-Key'],
                methods: this.config.cors.methods || ['GET', 'POST', 'OPTIONS']
            }));
        }
    }
    /**
     * Applies rate limiting configuration
     * @private
     */
    applyRateLimiting() {
        if (this.config.rateLimit) {
            const limiter = (0, express_rate_limit_1.default)({
                windowMs: this.config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
                max: this.config.rateLimit.max || 100,
                message: this.config.rateLimit.message || 'Too many requests, please try again later',
                skipSuccessfulRequests: this.config.rateLimit.skipSuccessfulRequests || false,
                handler: (req, res) => {
                    this.emit('rateLimitExceeded', req.ip || 'unknown', this.config.rateLimit.max);
                    res.status(429).json({
                        error: {
                            code: 'RATE_LIMIT_EXCEEDED',
                            message: this.config.rateLimit.message || 'Too many requests, please try again later',
                            type: 'client_error',
                            retryAfterMs: this.config.rateLimit.windowMs
                        }
                    });
                }
            });
            this.app.use(limiter);
        }
    }
    /**
     * Sets up authentication middleware
     * @private
     */
    setupAuthentication() {
        if (!this.config.security?.requireAuth) {
            return;
        }
        this.app.use(async (req, res, next) => {
            try {
                // Skip authentication for health, monitoring, and documentation endpoints
                if (req.path === '/health' || req.path === '/metrics' || req.path === '/' || req.path === '/schema') {
                    return next();
                }
                let authenticated = false;
                // Check for API key authentication
                const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
                if (apiKey && this.validApiKeys.has(apiKey)) {
                    authenticated = true;
                    // Add API key hash to request for logging
                    req.headers['x-api-key-hash'] = (0, crypto_1.createHash)('sha256').update(apiKey).digest('hex').substring(0, 8);
                }
                // Check custom authentication
                if (!authenticated && this.config.security?.customAuth) {
                    authenticated = await this.config.security.customAuth(req);
                }
                if (!authenticated) {
                    return res.status(401).json({
                        error: {
                            code: 'AUTHENTICATION_REQUIRED',
                            message: 'Valid API key required',
                            type: 'client_error'
                        }
                    });
                }
                return next();
            }
            catch (error) {
                return res.status(500).json({
                    error: {
                        code: 'AUTHENTICATION_ERROR',
                        message: 'Authentication system error',
                        type: 'server_error'
                    }
                });
            }
        });
    }
    /**
     * Sets up all HTTP endpoints with comprehensive middleware
     * @private
     */
    setupRoutes() {
        // Request logging middleware
        this.app.use((req, _res, next) => {
            if (this.config.development?.requestLogging) {
                const requestId = (0, crypto_1.randomUUID)();
                req.headers['x-request-id'] = requestId;
                console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${requestId}`);
            }
            next();
        });
        // Request/Response tracking middleware
        this.app.use((req, res, next) => {
            const startTime = perf_hooks_1.performance.now();
            const toolVersion = this.definition.metadata.version;
            const requestLogging = this.config.development?.requestLogging;
            // Add request metadata
            res.locals.requestStart = startTime;
            res.locals.requestId = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
            // Track response
            const originalSend = res.send;
            res.send = function (body) {
                const endTime = perf_hooks_1.performance.now();
                const duration = endTime - startTime;
                // Add response headers
                res.set({
                    'X-Request-ID': res.locals.requestId,
                    'X-Response-Time': `${Math.round(duration)}ms`,
                    'X-Tool-Version': toolVersion
                });
                if (requestLogging) {
                    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${Math.round(duration)}ms`);
                }
                return originalSend.call(this, body);
            };
            next();
        });
        // Content type validation middleware
        this.app.use((req, res, next) => {
            if (req.method === 'POST' && req.path === '/api/execute') {
                if (!req.is('application/json')) {
                    return this.sendStandardError(res, {
                        code: 'INVALID_CONTENT_TYPE',
                        message: 'Content-Type must be application/json',
                        type: 'validation_error',
                        statusCode: 415
                    }, res.locals.requestId);
                }
            }
            next();
        });
        // POST /api/execute - Main tool execution endpoint
        this.app.post('/api/execute', this.asyncErrorHandler(async (req, res) => {
            await this.handleExecute(req, res);
        }));
        // GET /health - Health check endpoint
        this.app.get('/health', this.asyncErrorHandler(async (req, res) => {
            await this.handleHealth(req, res);
        }));
        // GET /schema - Schema documentation endpoint
        this.app.get('/schema', this.asyncErrorHandler(async (req, res) => {
            await this.handleSchema(req, res);
        }));
        // GET /metrics - Performance metrics endpoint
        this.app.get('/metrics', this.asyncErrorHandler(async (req, res) => {
            await this.handleMetrics(req, res);
        }));
        // GET / - Root endpoint with comprehensive tool information
        this.app.get('/', this.asyncErrorHandler(async (_req, res) => {
            this.updateMetrics(); // Ensure metrics are current
            const toolInfo = {
                name: this.definition.metadata.name,
                version: this.definition.metadata.version,
                description: this.definition.metadata.description,
                capabilities: this.definition.metadata.capabilities || [],
                author: this.definition.metadata.author,
                tags: this.definition.metadata.tags || [],
                status: this.state,
                uptime_seconds: this.metrics.uptimeSeconds,
                health: {
                    status: this.metrics.errorRatePercent > 50 ? 'unhealthy' :
                        this.metrics.errorRatePercent > 10 ? 'degraded' : 'healthy',
                    error_rate_percent: this.metrics.errorRatePercent,
                    avg_response_time_ms: this.metrics.averageExecutionTimeMs
                },
                endpoints: {
                    execute: {
                        method: 'POST',
                        path: '/api/execute',
                        description: 'Execute the tool with input data',
                        authentication_required: this.config.security?.requireAuth || false
                    },
                    health: {
                        method: 'GET',
                        path: '/health',
                        description: 'Get tool health status and metrics'
                    },
                    schema: {
                        method: 'GET',
                        path: '/schema',
                        description: 'Get OpenAPI schema documentation'
                    },
                    metrics: {
                        method: 'GET',
                        path: '/metrics',
                        description: 'Get detailed performance metrics'
                    },
                    info: {
                        method: 'GET',
                        path: '/',
                        description: 'Get basic tool information (this endpoint)'
                    }
                },
                configuration: {
                    rate_limiting: this.config.rateLimit ? {
                        window_ms: this.config.rateLimit.windowMs,
                        max_requests: this.config.rateLimit.max
                    } : null,
                    cors_enabled: !!this.config.cors,
                    authentication_enabled: this.config.security?.requireAuth || false,
                    monitoring_enabled: this.config.monitoring?.enableMetrics || false
                },
                runtime_info: {
                    node_version: process.version,
                    platform: process.platform,
                    pid: process.pid,
                    memory_usage_mb: Math.round(this.metrics.memoryUsageBytes / 1024 / 1024)
                },
                timestamp: new Date().toISOString()
            };
            res.json(toolInfo);
        }));
        // 404 handler for undefined routes
        this.app.use((req, res) => {
            this.sendStandardError(res, {
                code: 'ENDPOINT_NOT_FOUND',
                message: `Endpoint ${req.method} ${req.path} not found`,
                type: 'client_error',
                statusCode: 404,
                details: {
                    available_endpoints: [
                        'POST /api/execute',
                        'GET /health',
                        'GET /schema',
                        'GET /metrics',
                        'GET /'
                    ],
                    method_used: req.method,
                    path_requested: req.path
                }
            }, res.locals.requestId);
        });
        // Global error handler
        this.app.use((error, _req, res, _next) => {
            this.emit('error', error);
            this.sendStandardError(res, {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
                type: 'server_error',
                statusCode: 500,
                details: this.config.development?.verboseErrors ? {
                    error_message: error.message,
                    stack: error.stack
                } : undefined
            }, res.locals.requestId);
        });
    }
    /**
     * Async error handler wrapper for route handlers
     * @private
     */
    asyncErrorHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
    /**
     * Sends standardized error responses across all endpoints
     *
     * @param res Express response object
     * @param error Error details
     * @param requestId Optional request ID for tracking
     * @private
     */
    sendStandardError(res, error, requestId) {
        const errorResponse = {
            request_id: requestId || res.locals.requestId || (0, crypto_1.randomUUID)(),
            status: 'error',
            error: {
                code: error.code,
                message: error.message,
                type: error.type,
                retryable: error.retryable || false,
                retry_after_ms: error.retryAfterMs,
                details: error.details
            },
            timestamp: new Date().toISOString(),
            tool_info: {
                name: this.definition.metadata.name,
                version: this.definition.metadata.version
            }
        };
        // Add standard error headers
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Error-Code': error.code,
            'X-Error-Type': error.type
        });
        res.status(error.statusCode).json(errorResponse);
    }
    /**
     * Handles the /api/execute endpoint
     * @private
     */
    async handleExecute(req, res) {
        const executionId = (0, crypto_1.randomUUID)();
        const startTime = perf_hooks_1.performance.now();
        try {
            // Create execution context
            const context = {
                executionId,
                toolId: this.definition.metadata.name,
                toolVersion: this.definition.metadata.version,
                timestamp: new Date(),
                requestId: req.headers['x-request-id'],
                environment: process.env.NODE_ENV || 'development',
                performance: {
                    startTime,
                    timeoutMs: this.config.timeouts?.execution || 30000
                },
                security: {
                    apiKeyHash: req.headers['x-api-key-hash'],
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            };
            this.emit('beforeExecution', context);
            // Validate request format
            if (!req.body || typeof req.body !== 'object') {
                throw new types_js_1.ValidationError('Request body must be a JSON object');
            }
            const { input_data = {}, config = {} } = req.body;
            // Validate input data
            const inputValidation = await this.validator.validateInput(input_data, this.definition.schema.input);
            if (!inputValidation.success) {
                throw new types_js_1.ValidationError('Input validation failed', inputValidation.errors?.[0]?.path.join('.'), input_data);
            }
            // Use configured tool config if available, otherwise validate provided config
            let validatedConfig;
            if (this.toolConfig) {
                validatedConfig = this.toolConfig;
            }
            else {
                const configValidation = await this.validator.validateConfig(config, this.definition.schema.config);
                if (!configValidation.success) {
                    throw new types_js_1.ConfigurationError('Configuration validation failed', configValidation.errors?.map(e => e.path.join('.')));
                }
                validatedConfig = configValidation.data;
            }
            // Execute the tool
            const result = await this.executeWithTimeout(inputValidation.data, validatedConfig, context);
            const endTime = perf_hooks_1.performance.now();
            const executionTimeMs = endTime - startTime;
            // Record execution statistics
            this.recordExecution({
                executionId,
                startTime,
                endTime,
                durationMs: executionTimeMs,
                success: result.status === 'success',
                errorCode: result.error?.code,
                timestamp: new Date()
            });
            // Update timing in result
            if (result.timing) {
                result.timing.executionTimeMs = executionTimeMs;
                result.timing.completedAt = new Date().toISOString();
            }
            this.emit('afterExecution', context, result);
            // Send response
            const response = {
                execution_id: executionId,
                status: result.status === 'success' ? 'success' : 'error',
                output_data: result.data,
                error_code: result.error?.code,
                error_message: result.error?.message,
                error_details: result.error?.details,
                execution_time_ms: executionTimeMs,
                timestamp: new Date().toISOString()
            };
            const statusCode = result.status === 'success' ? 200 :
                result.error?.type === 'validation_error' ? 400 :
                    result.error?.type === 'configuration_error' ? 400 :
                        result.error?.type === 'timeout_error' ? 408 : 500;
            res.status(statusCode).json(response);
        }
        catch (error) {
            const endTime = perf_hooks_1.performance.now();
            const executionTimeMs = endTime - startTime;
            this.emit('error', error, { executionId });
            // Record failed execution
            this.recordExecution({
                executionId,
                startTime,
                endTime,
                durationMs: executionTimeMs,
                success: false,
                errorCode: error.code || 'UNKNOWN_ERROR',
                timestamp: new Date()
            });
            let statusCode = 500;
            let errorResponse;
            if (error instanceof types_js_1.ValidationError) {
                statusCode = 400;
                errorResponse = {
                    execution_id: executionId,
                    status: 'error',
                    error_code: error.code,
                    error_message: error.message,
                    error_details: error.details,
                    execution_time_ms: executionTimeMs,
                    timestamp: new Date().toISOString()
                };
            }
            else if (error instanceof types_js_1.ConfigurationError) {
                statusCode = 400;
                errorResponse = {
                    execution_id: executionId,
                    status: 'error',
                    error_code: error.code,
                    error_message: error.message,
                    error_details: error.details,
                    execution_time_ms: executionTimeMs,
                    timestamp: new Date().toISOString()
                };
            }
            else {
                errorResponse = {
                    execution_id: executionId,
                    status: 'error',
                    error_code: 'INTERNAL_ERROR',
                    error_message: 'An internal error occurred',
                    error_details: this.config.development?.verboseErrors ? error.message : undefined,
                    execution_time_ms: executionTimeMs,
                    timestamp: new Date().toISOString()
                };
            }
            res.status(statusCode).json(errorResponse);
        }
    }
    /**
     * Executes the tool with timeout protection
     * @private
     */
    async executeWithTimeout(input, config, context) {
        const timeoutMs = context.performance?.timeoutMs || 30000;
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new types_js_1.ExecutionError(`Tool execution timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            try {
                const result = await this.definition.execute(input, config, context);
                clearTimeout(timeoutId);
                resolve(result);
            }
            catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    /**
     * Handles the /health endpoint with comprehensive health monitoring
     *
     * This endpoint provides detailed health information including:
     * - Overall health status (healthy/degraded/unhealthy)
     * - Performance metrics and thresholds
     * - Custom health checks
     * - Dependency health verification
     * - System resource usage
     *
     * @private
     */
    async handleHealth(_req, res) {
        const healthCheckStart = perf_hooks_1.performance.now();
        try {
            let healthStatus = 'healthy';
            let details = {};
            let checks = {};
            // Update metrics before health check
            this.updateMetrics();
            // 1. Performance Health Checks
            checks.performance = {
                status: 'healthy',
                metrics: {
                    avg_response_time_ms: this.metrics.averageExecutionTimeMs,
                    error_rate_percent: this.metrics.errorRatePercent,
                    requests_per_minute: this.metrics.requestsPerMinute,
                    memory_usage_mb: Math.round(this.metrics.memoryUsageBytes / 1024 / 1024),
                    uptime_seconds: this.metrics.uptimeSeconds
                }
            };
            // Check performance thresholds
            if (this.metrics.averageExecutionTimeMs > 5000) {
                checks.performance.status = 'degraded';
                checks.performance.issues = checks.performance.issues || [];
                checks.performance.issues.push('High average response time');
                healthStatus = 'degraded';
            }
            if (this.metrics.errorRatePercent > 50) {
                checks.performance.status = 'unhealthy';
                checks.performance.issues = checks.performance.issues || [];
                checks.performance.issues.push('High error rate');
                healthStatus = 'unhealthy';
            }
            else if (this.metrics.errorRatePercent > 10) {
                checks.performance.status = 'degraded';
                checks.performance.issues = checks.performance.issues || [];
                checks.performance.issues.push('Elevated error rate');
                if (healthStatus === 'healthy')
                    healthStatus = 'degraded';
            }
            // Memory usage check
            const memoryUsageMB = this.metrics.memoryUsageBytes / 1024 / 1024;
            if (memoryUsageMB > 500) {
                checks.performance.status = 'degraded';
                checks.performance.issues = checks.performance.issues || [];
                checks.performance.issues.push('High memory usage');
                if (healthStatus === 'healthy')
                    healthStatus = 'degraded';
            }
            // 2. Tool State Health Check
            checks.tool_state = {
                status: this.state === 'running' ? 'healthy' : 'unhealthy',
                current_state: this.state,
                configuration_valid: !!this.toolConfig
            };
            if (this.state !== 'running') {
                healthStatus = 'unhealthy';
            }
            // 3. Recent Errors Analysis
            if (Object.keys(this.metrics.recentErrors).length > 0) {
                checks.recent_errors = {
                    status: 'warning',
                    error_types: this.metrics.recentErrors,
                    total_recent_errors: Object.values(this.metrics.recentErrors).reduce((a, b) => a + b, 0)
                };
            }
            // 4. Custom Health Check (if provided)
            if (this.definition.healthCheck) {
                try {
                    const customHealthStart = perf_hooks_1.performance.now();
                    const customHealth = await this.definition.healthCheck();
                    const customHealthDuration = perf_hooks_1.performance.now() - customHealthStart;
                    checks.custom = {
                        status: customHealth.status,
                        details: customHealth.details || {},
                        check_duration_ms: Math.round(customHealthDuration)
                    };
                    // Custom health check overrides if more severe
                    if (customHealth.status === 'unhealthy') {
                        healthStatus = 'unhealthy';
                    }
                    else if (customHealth.status === 'degraded' && healthStatus === 'healthy') {
                        healthStatus = 'degraded';
                    }
                    details = { ...details, ...customHealth.details };
                }
                catch (error) {
                    checks.custom = {
                        status: 'unhealthy',
                        error: 'Custom health check failed',
                        error_message: error.message
                    };
                    healthStatus = 'unhealthy';
                }
            }
            // 5. System Information
            const systemInfo = {
                node_version: process.version,
                platform: process.platform,
                architecture: process.arch,
                pid: process.pid
            };
            const healthCheckDuration = perf_hooks_1.performance.now() - healthCheckStart;
            // Build comprehensive health response
            const response = {
                status: healthStatus,
                version: this.definition.metadata.version,
                tool_metadata: {
                    name: this.definition.metadata.name,
                    description: this.definition.metadata.description,
                    version: this.definition.metadata.version,
                    capabilities: this.definition.metadata.capabilities,
                    author: this.definition.metadata.author,
                    tags: this.definition.metadata.tags
                },
                capabilities: this.definition.metadata.capabilities,
                uptime_seconds: this.metrics.uptimeSeconds,
                last_execution: this.metrics.lastExecutionAt?.toISOString(),
                error_rate_percent: this.metrics.errorRatePercent,
                avg_response_time_ms: this.metrics.averageExecutionTimeMs,
                checks,
                system_info: systemInfo,
                health_check_duration_ms: Math.round(healthCheckDuration),
                timestamp: new Date().toISOString()
            };
            // Add detailed metrics for degraded/unhealthy status
            if (healthStatus !== 'healthy') {
                response.detailed_metrics = {
                    total_executions: this.metrics.totalExecutions,
                    successful_executions: this.metrics.successfulExecutions,
                    failed_executions: this.metrics.failedExecutions,
                    min_response_time_ms: this.metrics.minExecutionTimeMs,
                    max_response_time_ms: this.metrics.maxExecutionTimeMs,
                    memory_usage_bytes: this.metrics.memoryUsageBytes,
                    recent_errors: this.metrics.recentErrors
                };
            }
            // Set appropriate HTTP status code
            const statusCode = healthStatus === 'healthy' ? 200 :
                healthStatus === 'degraded' ? 200 : 503;
            // Add custom headers
            res.set({
                'X-Health-Status': healthStatus,
                'X-Tool-Version': this.definition.metadata.version,
                'X-Uptime-Seconds': this.metrics.uptimeSeconds.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.status(statusCode).json(response);
        }
        catch (error) {
            const healthCheckDuration = perf_hooks_1.performance.now() - healthCheckStart;
            // Emergency health response for critical failures
            const emergencyResponse = {
                status: 'unhealthy',
                version: this.definition.metadata.version,
                tool_metadata: {
                    name: this.definition.metadata.name,
                    version: this.definition.metadata.version
                },
                capabilities: this.definition.metadata.capabilities,
                uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
                error: 'Health check system failure',
                error_message: error.message,
                health_check_duration_ms: Math.round(healthCheckDuration),
                timestamp: new Date().toISOString(),
                checks: {
                    health_system: {
                        status: 'unhealthy',
                        error: 'Health check endpoint failure'
                    }
                }
            };
            res.set({
                'X-Health-Status': 'unhealthy',
                'X-Tool-Version': this.definition.metadata.version,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.status(503).json(emergencyResponse);
        }
    }
    /**
     * Handles the /schema endpoint with comprehensive API documentation
     *
     * This endpoint provides complete OpenAPI 3.0.3 specification including:
     * - Tool metadata and capabilities
     * - Input/config schema definitions
     * - Endpoint documentation with examples
     * - Response schemas and error codes
     * - Integration guides and best practices
     *
     * @private
     */
    async handleSchema(_req, res) {
        const schemaGenerationStart = perf_hooks_1.performance.now();
        try {
            // Generate base OpenAPI documentation
            // TODO: Implement proper documentation generation
            const baseDocumentation = {
                openapi: '3.0.3',
                info: {
                    title: this.definition.metadata.name,
                    version: this.definition.metadata.version,
                    description: this.definition.metadata.description
                },
                paths: {},
                components: {
                    schemas: {}
                }
            };
            // const baseDocumentation = this.documentationGenerator.generateToolDocumentation(
            //   this.definition.schema,
            //   {
            //     name: this.definition.metadata.name,
            //     description: this.definition.metadata.description,
            //     version: this.definition.metadata.version
            //   }
            // );
            // Enhance with additional tool information
            const enhancedDocumentation = {
                ...baseDocumentation,
                info: {
                    ...baseDocumentation.info,
                    title: `${this.definition.metadata.name} API`,
                    description: `${this.definition.metadata.description}\n\n**Capabilities:** ${this.definition.metadata.capabilities?.join(', ') || 'Not specified'}\n\n**Author:** ${this.definition.metadata.author || 'Not specified'}`,
                    version: this.definition.metadata.version,
                    contact: this.definition.metadata.author ? {
                        name: this.definition.metadata.author
                    } : undefined,
                    license: this.definition.metadata.license ? {
                        name: this.definition.metadata.license
                    } : undefined,
                    'x-tool-metadata': this.definition.metadata,
                    'x-runtime-info': {
                        server_version: process.version,
                        uptime_seconds: this.metrics.uptimeSeconds,
                        last_updated: new Date().toISOString()
                    }
                },
                servers: [
                    {
                        url: `http://localhost:${this.config.port || 3000}`,
                        description: 'Local development server'
                    }
                ],
                paths: {
                    ...baseDocumentation.paths,
                    // Enhanced /api/execute endpoint documentation
                    '/api/execute': {
                        post: {
                            // ...baseDocumentation.paths['/api/execute']?.post, // Commented out - paths is empty
                            summary: 'Execute the AI Spine tool',
                            description: `Execute the ${this.definition.metadata.name} tool with provided input data. This endpoint validates the input against the tool's schema, executes the tool logic, and returns the result.`,
                            operationId: 'executeTool',
                            tags: ['Tool Execution'],
                            security: this.config.security?.requireAuth ? [
                                { 'apiKey': [] }
                            ] : [],
                            requestBody: {
                                required: true,
                                content: {
                                    'application/json': {
                                        schema: this.generateRequestBodySchema()
                                    }
                                }
                            },
                            responses: {
                                '200': {
                                    description: 'Tool executed successfully',
                                    headers: {
                                        'X-Execution-ID': {
                                            description: 'Unique execution identifier',
                                            schema: { type: 'string' }
                                        },
                                        'X-Execution-Time-Ms': {
                                            description: 'Execution time in milliseconds',
                                            schema: { type: 'number' }
                                        }
                                    },
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    execution_id: {
                                                        type: 'string',
                                                        description: 'Unique identifier for this execution',
                                                        example: 'exec_1234567890abcdef'
                                                    },
                                                    status: {
                                                        type: 'string',
                                                        enum: ['success'],
                                                        description: 'Execution status'
                                                    },
                                                    output_data: {
                                                        type: 'object',
                                                        description: 'Tool execution results'
                                                    },
                                                    execution_time_ms: {
                                                        type: 'number',
                                                        description: 'Total execution time in milliseconds',
                                                        example: 1250
                                                    },
                                                    timestamp: {
                                                        type: 'string',
                                                        format: 'date-time',
                                                        description: 'Response timestamp'
                                                    }
                                                },
                                                required: ['execution_id', 'status', 'execution_time_ms', 'timestamp']
                                            }
                                        }
                                    }
                                },
                                '400': {
                                    description: 'Invalid input or configuration',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    execution_id: { type: 'string' },
                                                    status: { type: 'string', enum: ['error'] },
                                                    error_code: {
                                                        type: 'string',
                                                        enum: ['VALIDATION_ERROR', 'CONFIGURATION_ERROR'],
                                                        description: 'Error classification code'
                                                    },
                                                    error_message: {
                                                        type: 'string',
                                                        description: 'Human-readable error description'
                                                    },
                                                    error_details: {
                                                        type: 'array',
                                                        items: { type: 'string' },
                                                        description: 'Detailed validation error messages'
                                                    },
                                                    execution_time_ms: { type: 'number' },
                                                    timestamp: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                },
                                '401': {
                                    description: 'Authentication required',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    error: {
                                                        type: 'object',
                                                        properties: {
                                                            code: { type: 'string', example: 'AUTHENTICATION_REQUIRED' },
                                                            message: { type: 'string', example: 'API key is required' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                '408': {
                                    description: 'Request timeout',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    execution_id: { type: 'string' },
                                                    status: { type: 'string', enum: ['error'] },
                                                    error_code: { type: 'string', example: 'TIMEOUT_ERROR' },
                                                    error_message: { type: 'string' },
                                                    execution_time_ms: { type: 'number' },
                                                    timestamp: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                },
                                '429': {
                                    description: 'Rate limit exceeded',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    error: {
                                                        type: 'object',
                                                        properties: {
                                                            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                                                            message: { type: 'string' },
                                                            retry_after_ms: { type: 'number' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                '500': {
                                    description: 'Internal server error',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    execution_id: { type: 'string' },
                                                    status: { type: 'string', enum: ['error'] },
                                                    error_code: { type: 'string', example: 'INTERNAL_ERROR' },
                                                    error_message: { type: 'string' },
                                                    execution_time_ms: { type: 'number' },
                                                    timestamp: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // Health endpoint documentation
                    '/health': {
                        get: {
                            summary: 'Health check endpoint',
                            description: 'Get comprehensive health status and performance metrics for the tool',
                            operationId: 'getHealth',
                            tags: ['Health & Monitoring'],
                            responses: {
                                '200': {
                                    description: 'Tool is healthy or degraded',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    status: {
                                                        type: 'string',
                                                        enum: ['healthy', 'degraded'],
                                                        description: 'Overall health status'
                                                    },
                                                    version: { type: 'string' },
                                                    tool_metadata: { type: 'object' },
                                                    capabilities: { type: 'array', items: { type: 'string' } },
                                                    uptime_seconds: { type: 'number' },
                                                    error_rate_percent: { type: 'number' },
                                                    avg_response_time_ms: { type: 'number' },
                                                    checks: { type: 'object' },
                                                    system_info: { type: 'object' },
                                                    health_check_duration_ms: { type: 'number' },
                                                    timestamp: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                },
                                '503': {
                                    description: 'Tool is unhealthy',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    status: { type: 'string', enum: ['unhealthy'] },
                                                    error: { type: 'string' },
                                                    version: { type: 'string' },
                                                    uptime_seconds: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // Metrics endpoint documentation
                    '/metrics': {
                        get: {
                            summary: 'Performance metrics',
                            description: 'Get detailed performance and usage metrics',
                            operationId: 'getMetrics',
                            tags: ['Health & Monitoring'],
                            responses: {
                                '200': {
                                    description: 'Metrics retrieved successfully',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    totalExecutions: { type: 'number' },
                                                    successfulExecutions: { type: 'number' },
                                                    failedExecutions: { type: 'number' },
                                                    averageExecutionTimeMs: { type: 'number' },
                                                    minExecutionTimeMs: { type: 'number' },
                                                    maxExecutionTimeMs: { type: 'number' },
                                                    errorRatePercent: { type: 'number' },
                                                    requestsPerMinute: { type: 'number' },
                                                    memoryUsageBytes: { type: 'number' },
                                                    uptimeSeconds: { type: 'number' },
                                                    recentErrors: { type: 'object' },
                                                    lastExecutionAt: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // Root endpoint documentation
                    '/': {
                        get: {
                            summary: 'Tool information',
                            description: 'Get basic tool information and available endpoints',
                            operationId: 'getToolInfo',
                            tags: ['Information'],
                            responses: {
                                '200': {
                                    description: 'Tool information retrieved successfully',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    version: { type: 'string' },
                                                    description: { type: 'string' },
                                                    capabilities: { type: 'array', items: { type: 'string' } },
                                                    status: { type: 'string' },
                                                    endpoints: { type: 'object' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Security schemes
                components: {
                    ...baseDocumentation.components,
                    securitySchemes: {
                        apiKey: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'X-API-Key',
                            description: 'API key for tool authentication. Can also be provided as "Authorization: Bearer <key>"'
                        }
                    },
                    schemas: {
                        ...baseDocumentation.components?.schemas,
                        Error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Error code' },
                                message: { type: 'string', description: 'Error message' },
                                type: { type: 'string', description: 'Error type' },
                                retryable: { type: 'boolean', description: 'Whether the error is retryable' },
                                retryAfterMs: { type: 'number', description: 'Milliseconds to wait before retry' }
                            }
                        }
                    }
                },
                // Tags for organization
                tags: [
                    {
                        name: 'Tool Execution',
                        description: 'Core tool execution endpoints'
                    },
                    {
                        name: 'Health & Monitoring',
                        description: 'Health checks and performance monitoring'
                    },
                    {
                        name: 'Information',
                        description: 'Tool information and discovery'
                    }
                ],
                // External documentation
                externalDocs: {
                    description: 'AI Spine Tools SDK Documentation',
                    url: 'https://github.com/your-org/ai-spine-tools-sdk'
                },
                // Custom extensions
                'x-tool-config': {
                    authentication_required: this.config.security?.requireAuth || false,
                    rate_limiting: this.config.rateLimit ? {
                        window_ms: this.config.rateLimit.windowMs,
                        max_requests: this.config.rateLimit.max
                    } : null,
                    cors_enabled: !!this.config.cors,
                    monitoring_enabled: this.config.monitoring?.enableMetrics || false
                },
                'x-integration-examples': {
                    curl: {
                        basic_execution: `curl -X POST ${this.config.port ? `http://localhost:${this.config.port}` : 'http://localhost:3000'}/api/execute \\
  -H "Content-Type: application/json" \\${this.config.security?.requireAuth ? `
  -H "X-API-Key: your-api-key" \\` : ''}
  -d '${JSON.stringify({
                            input_data: this.generateBasicExampleInput()
                        }, null, 2).replace(/\n/g, '\n      ')}'`,
                        health_check: `curl ${this.config.port ? `http://localhost:${this.config.port}` : 'http://localhost:3000'}/health`,
                        schema: `curl ${this.config.port ? `http://localhost:${this.config.port}` : 'http://localhost:3000'}/schema`
                    },
                    javascript: {
                        basic_execution: `const response = await fetch('${this.config.port ? `http://localhost:${this.config.port}` : 'http://localhost:3000'}/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',${this.config.security?.requireAuth ? `
    'X-API-Key': 'your-api-key',` : ''}
  },
  body: JSON.stringify({
    input_data: ${JSON.stringify(this.generateBasicExampleInput(), null, 6).replace(/\n/g, '\n    ')}
  })
});

const result = await response.json();
console.log(result);`
                    },
                    python: {
                        basic_execution: `import requests

response = requests.post('${this.config.port ? `http://localhost:${this.config.port}` : 'http://localhost:3000'}/api/execute', 
    json={
        'input_data': ${JSON.stringify(this.generateBasicExampleInput(), null, 8).replace(/\n/g, '\n        ')}
    },${this.config.security?.requireAuth ? `
    headers={'X-API-Key': 'your-api-key'},` : ''}
)

result = response.json()
print(result)`
                    }
                }
            };
            const schemaGenerationDuration = perf_hooks_1.performance.now() - schemaGenerationStart;
            // Add generation metadata
            enhancedDocumentation['x-generation-info'] = {
                generated_at: new Date().toISOString(),
                generation_time_ms: Math.round(schemaGenerationDuration),
                sdk_version: '1.0.0',
                tool_state: this.state
            };
            // Set appropriate headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
                'X-Schema-Version': this.definition.metadata.version,
                'X-Generation-Time': Math.round(schemaGenerationDuration).toString()
            });
            res.json(enhancedDocumentation);
        }
        catch (error) {
            const schemaGenerationDuration = perf_hooks_1.performance.now() - schemaGenerationStart;
            // Detailed error response for schema generation failures
            const errorResponse = {
                error: {
                    code: 'SCHEMA_GENERATION_ERROR',
                    message: 'Failed to generate API schema documentation',
                    type: 'server_error',
                    details: {
                        error_message: error.message,
                        generation_time_ms: Math.round(schemaGenerationDuration),
                        timestamp: new Date().toISOString()
                    }
                },
                fallback_info: {
                    tool_name: this.definition.metadata.name,
                    tool_version: this.definition.metadata.version,
                    available_endpoints: [
                        'POST /api/execute - Execute the tool',
                        'GET /health - Health check',
                        'GET /metrics - Performance metrics',
                        'GET /schema - This endpoint (when working)',
                        'GET / - Basic tool information'
                    ]
                }
            };
            res.status(500).json(errorResponse);
        }
    }
    /**
     * Handles the /metrics endpoint with detailed performance analytics
     *
     * This endpoint provides comprehensive performance metrics including:
     * - Execution statistics and trends
     * - Response time analytics
     * - Error tracking and categorization
     * - Resource usage monitoring
     * - Rate limiting statistics
     *
     * @private
     */
    async handleMetrics(_req, res) {
        const metricsGenerationStart = perf_hooks_1.performance.now();
        try {
            // Update metrics to ensure current data
            this.updateMetrics();
            // Calculate additional analytics
            const now = Date.now();
            const oneHourAgo = now - 60 * 60 * 1000;
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const recentExecutions = this.executionHistory.filter(e => now - e.timestamp.getTime() < (this.config.monitoring?.metricsRetention || 24 * 60 * 60 * 1000));
            const hourlyExecutions = recentExecutions.filter(e => e.timestamp.getTime() > oneHourAgo);
            const dailyExecutions = recentExecutions.filter(e => e.timestamp.getTime() > oneDayAgo);
            // Calculate success rates by time period
            const hourlySuccessRate = hourlyExecutions.length > 0
                ? (hourlyExecutions.filter(e => e.success).length / hourlyExecutions.length) * 100
                : 100;
            const dailySuccessRate = dailyExecutions.length > 0
                ? (dailyExecutions.filter(e => e.success).length / dailyExecutions.length) * 100
                : 100;
            // Performance percentiles calculation
            const responseTimes = recentExecutions.map(e => e.durationMs || 0);
            responseTimes.sort((a, b) => a - b);
            const getPercentile = (arr, percentile) => {
                if (arr.length === 0)
                    return 0;
                const index = Math.ceil((percentile / 100) * arr.length) - 1;
                return arr[index] || 0;
            };
            // Enhanced metrics response
            const enhancedMetrics = {
                // Core metrics (existing)
                ...this.metrics,
                // Time-based analytics
                analytics: {
                    success_rates: {
                        overall_percent: 100 - this.metrics.errorRatePercent,
                        last_hour_percent: hourlySuccessRate,
                        last_24h_percent: dailySuccessRate
                    },
                    execution_counts: {
                        total: this.metrics.totalExecutions,
                        last_hour: hourlyExecutions.length,
                        last_24h: dailyExecutions.length,
                        successful: this.metrics.successfulExecutions,
                        failed: this.metrics.failedExecutions
                    },
                    response_time_distribution: {
                        p50_ms: getPercentile(responseTimes, 50),
                        p75_ms: getPercentile(responseTimes, 75),
                        p90_ms: getPercentile(responseTimes, 90),
                        p95_ms: getPercentile(responseTimes, 95),
                        p99_ms: getPercentile(responseTimes, 99),
                        min_ms: this.metrics.minExecutionTimeMs,
                        max_ms: this.metrics.maxExecutionTimeMs,
                        avg_ms: this.metrics.averageExecutionTimeMs
                    },
                    error_breakdown: this.metrics.recentErrors,
                    trend_indicators: {
                        execution_trend: this.calculateTrend(recentExecutions.map(e => ({
                            timestamp: e.timestamp.getTime(),
                            value: 1
                        }))),
                        response_time_trend: this.calculateTrend(recentExecutions.map(e => ({
                            timestamp: e.timestamp.getTime(),
                            value: e.durationMs || 0
                        }))),
                        error_rate_trend: this.calculateTrend(recentExecutions.map(e => ({
                            timestamp: e.timestamp.getTime(),
                            value: e.success ? 0 : 1
                        })))
                    }
                },
                // System health indicators
                health_indicators: {
                    status: this.metrics.errorRatePercent > 50 ? 'critical' :
                        this.metrics.errorRatePercent > 10 ? 'warning' : 'healthy',
                    performance_score: this.calculatePerformanceScore(),
                    availability_percent: this.calculateAvailability(),
                    throughput_score: this.calculateThroughputScore()
                },
                // Resource utilization
                resources: {
                    memory: {
                        used_bytes: this.metrics.memoryUsageBytes,
                        used_mb: Math.round(this.metrics.memoryUsageBytes / 1024 / 1024),
                        heap_info: process.memoryUsage()
                    },
                    cpu: {
                        usage_percent: this.metrics.cpuUsagePercent || 0
                    },
                    network: {
                        requests_per_minute: this.metrics.requestsPerMinute,
                        active_connections: this.executionHistory.filter(e => now - e.timestamp.getTime() < 60000 // Last minute
                        ).length
                    }
                },
                // Tool configuration impact
                configuration_metrics: {
                    rate_limiting: this.config.rateLimit ? {
                        ...this.metrics.rateLimiting,
                        efficiency_percent: this.metrics.rateLimiting ?
                            ((this.metrics.rateLimiting.currentWindowRequests / (this.config.rateLimit.max || 1)) * 100) : 0
                    } : null,
                    authentication_enabled: this.config.security?.requireAuth || false,
                    monitoring_overhead_ms: Math.round(perf_hooks_1.performance.now() - metricsGenerationStart)
                },
                // Metadata
                metrics_metadata: {
                    generated_at: new Date().toISOString(),
                    generation_time_ms: Math.round(perf_hooks_1.performance.now() - metricsGenerationStart),
                    retention_period_ms: this.config.monitoring?.metricsRetention || 24 * 60 * 60 * 1000,
                    data_points_included: recentExecutions.length,
                    uptime_seconds: this.metrics.uptimeSeconds
                }
            };
            // Set appropriate headers
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Metrics-Generated': new Date().toISOString(),
                'X-Data-Points': recentExecutions.length.toString()
            });
            res.json(enhancedMetrics);
        }
        catch (error) {
            const metricsGenerationDuration = perf_hooks_1.performance.now() - metricsGenerationStart;
            this.sendStandardError(res, {
                code: 'METRICS_GENERATION_ERROR',
                message: 'Failed to generate performance metrics',
                type: 'server_error',
                statusCode: 500,
                details: {
                    error_message: error.message,
                    generation_time_ms: Math.round(metricsGenerationDuration),
                    fallback_metrics: {
                        uptime_seconds: this.metrics.uptimeSeconds,
                        total_executions: this.metrics.totalExecutions,
                        error_rate_percent: this.metrics.errorRatePercent
                    }
                }
            }, res.locals.requestId);
        }
    }
    /**
     * Calculates trend direction for a series of data points
     * @private
     */
    calculateTrend(dataPoints) {
        if (dataPoints.length < 2)
            return 'insufficient_data';
        // Simple linear regression slope calculation
        const n = dataPoints.length;
        const sumX = dataPoints.reduce((sum, point) => sum + point.timestamp, 0);
        const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
        const sumXY = dataPoints.reduce((sum, point) => sum + (point.timestamp * point.value), 0);
        const sumXX = dataPoints.reduce((sum, point) => sum + (point.timestamp * point.timestamp), 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        // Determine trend based on slope
        if (Math.abs(slope) < 0.001)
            return 'stable';
        return slope > 0 ? 'increasing' : 'decreasing';
    }
    /**
     * Calculates overall performance score (0-100)
     * @private
     */
    calculatePerformanceScore() {
        let score = 100;
        // Deduct points for high error rate
        score -= this.metrics.errorRatePercent * 2;
        // Deduct points for slow response times
        if (this.metrics.averageExecutionTimeMs > 1000) {
            score -= Math.min(30, (this.metrics.averageExecutionTimeMs - 1000) / 100);
        }
        // Deduct points for high memory usage
        const memoryUsageMB = this.metrics.memoryUsageBytes / 1024 / 1024;
        if (memoryUsageMB > 100) {
            score -= Math.min(20, (memoryUsageMB - 100) / 20);
        }
        return Math.max(0, Math.round(score));
    }
    /**
     * Calculates availability percentage
     * @private
     */
    calculateAvailability() {
        if (this.metrics.totalExecutions === 0)
            return 100;
        return Math.round(((this.metrics.totalExecutions - this.metrics.failedExecutions) / this.metrics.totalExecutions) * 100);
    }
    /**
     * Calculates throughput score based on requests per minute
     * @private
     */
    calculateThroughputScore() {
        const rpm = this.metrics.requestsPerMinute;
        if (rpm === 0)
            return 0;
        if (rpm >= 60)
            return 100; // Excellent throughput
        if (rpm >= 30)
            return 80; // Good throughput
        if (rpm >= 10)
            return 60; // Fair throughput
        if (rpm >= 1)
            return 40; // Low throughput
        return 20; // Very low throughput
    }
    /**
     * Generates basic example input data for documentation
     * @private
     */
    generateBasicExampleInput() {
        const inputSchema = this.definition.schema.input;
        if (!inputSchema || Object.keys(inputSchema).length === 0) {
            return {};
        }
        const exampleInput = {};
        for (const [key, field] of Object.entries(inputSchema)) {
            if (field.example !== undefined) {
                exampleInput[key] = field.example;
            }
            else {
                // Generate basic example based on field type
                switch (field.type) {
                    case 'string':
                        exampleInput[key] = field.format === 'email' ? 'example@email.com' :
                            field.format === 'url' ? 'https://example.com' :
                                'example';
                        break;
                    case 'number':
                        exampleInput[key] = 42;
                        break;
                    case 'boolean':
                        exampleInput[key] = true;
                        break;
                    case 'array':
                        exampleInput[key] = ['example'];
                        break;
                    case 'object':
                        exampleInput[key] = {};
                        break;
                    case 'enum':
                        // Note: ToolInputField doesn't have values property in current types
                        exampleInput[key] = 'option1';
                        break;
                    default:
                        exampleInput[key] = 'example';
                }
            }
        }
        return exampleInput;
    }
    /**
     * Generates OpenAPI request body schema for the execute endpoint
     * @private
     */
    generateRequestBodySchema() {
        const schema = {
            type: 'object',
            properties: {},
            required: []
        };
        // Add input_data property if input schema exists
        if (this.definition.schema.input && Object.keys(this.definition.schema.input).length > 0) {
            schema.properties.input_data = {
                type: 'object',
                properties: {},
                required: []
            };
            // Generate schema for each input field
            for (const [key, field] of Object.entries(this.definition.schema.input)) {
                schema.properties.input_data.properties[key] = field_builders_js_1.DocumentationGenerator.generateOpenAPISchema(field);
                if (field.required) {
                    schema.properties.input_data.required.push(key);
                }
            }
            schema.required.push('input_data');
        }
        // Add config property if config schema exists
        if (this.definition.schema.config && Object.keys(this.definition.schema.config).length > 0) {
            schema.properties.config = {
                type: 'object',
                properties: {},
                required: []
            };
            // Generate schema for each config field
            for (const [key, field] of Object.entries(this.definition.schema.config)) {
                schema.properties.config.properties[key] = field_builders_js_1.DocumentationGenerator.generateOpenAPISchema(field);
                if (field.required) {
                    schema.properties.config.required.push(key);
                }
            }
        }
        return schema;
    }
    /**
     * Records execution statistics
     * @private
     */
    recordExecution(stats) {
        this.executionHistory.push(stats);
        // Keep only recent executions to prevent memory leak
        const maxHistory = 1000;
        if (this.executionHistory.length > maxHistory) {
            this.executionHistory = this.executionHistory.slice(-maxHistory);
        }
        // Update error counts
        if (!stats.success && stats.errorCode) {
            this.metrics.recentErrors[stats.errorCode] = (this.metrics.recentErrors[stats.errorCode] || 0) + 1;
        }
        this.updateMetrics();
    }
    /**
     * Updates calculated metrics
     * @private
     */
    updateMetrics() {
        const now = Date.now();
        const recentExecutions = this.executionHistory.filter(e => now - e.timestamp.getTime() < (this.config.monitoring?.metricsRetention || 24 * 60 * 60 * 1000));
        this.metrics.totalExecutions = recentExecutions.length;
        this.metrics.successfulExecutions = recentExecutions.filter(e => e.success).length;
        this.metrics.failedExecutions = recentExecutions.filter(e => !e.success).length;
        if (recentExecutions.length > 0) {
            const durations = recentExecutions.map(e => e.durationMs || 0);
            this.metrics.averageExecutionTimeMs = durations.reduce((a, b) => a + b, 0) / durations.length;
            this.metrics.minExecutionTimeMs = Math.min(...durations);
            this.metrics.maxExecutionTimeMs = Math.max(...durations);
            this.metrics.lastExecutionAt = new Date(Math.max(...recentExecutions.map(e => e.timestamp.getTime())));
        }
        this.metrics.errorRatePercent = this.metrics.totalExecutions > 0
            ? (this.metrics.failedExecutions / this.metrics.totalExecutions) * 100
            : 0;
        // Calculate requests per minute
        const oneMinuteAgo = now - 60 * 1000;
        const recentMinuteExecutions = recentExecutions.filter(e => e.timestamp.getTime() > oneMinuteAgo);
        this.metrics.requestsPerMinute = recentMinuteExecutions.length;
        this.metrics.uptimeSeconds = Math.floor((now - this.startTime) / 1000);
        // Update memory usage
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsageBytes = memUsage.heapUsed;
        // Clean old error counts
        const oldErrors = Object.keys(this.metrics.recentErrors);
        for (const errorCode of oldErrors) {
            const errorCount = this.metrics.recentErrors[errorCode];
            if (errorCount === 0) {
                delete this.metrics.recentErrors[errorCode];
            }
        }
        // Call custom metrics handler if configured
        if (this.config.monitoring?.customMetrics) {
            this.config.monitoring.customMetrics(this.metrics);
        }
    }
    /**
     * Event emitter functionality
     * @private
     */
    emit(event, ...args) {
        const listener = this.eventListeners[event];
        if (listener) {
            listener(...args);
        }
    }
    /**
     * Sets the tool configuration
     *
     * @param config - Tool configuration object
     *
     * @example
     * ```typescript
     * await tool.setConfig({
     *   apiKey: 'your-api-key-here',
     *   timeout: 30000
     * });
     * ```
     */
    async setConfig(config) {
        const validation = await this.validator.validateConfig(config, this.definition.schema.config);
        if (!validation.success) {
            throw new types_js_1.ConfigurationError('Configuration validation failed', validation.errors?.map(e => e.path.join('.')));
        }
        this.toolConfig = validation.data;
        // Call setup function if provided
        if (this.definition.setup) {
            await this.definition.setup(this.toolConfig);
        }
    }
    /**
     * Adds an event listener
     *
     * @param event - Event name
     * @param listener - Event listener function
     *
     * @example
     * ```typescript
     * tool.on('beforeExecution', (context) => {
     *   console.log(`Executing tool for request ${context.requestId}`);
     * });
     * ```
     */
    on(event, listener) {
        this.eventListeners[event] = listener;
    }
    /**
     * Removes an event listener
     *
     * @param event - Event name
     */
    off(event) {
        delete this.eventListeners[event];
    }
    /**
     * Starts the tool server
     *
     * @param config - Server configuration options
     * @returns Promise that resolves when server is started
     *
     * @example
     * ```typescript
     * await tool.start({
     *   port: 3000,
     *   host: '0.0.0.0',
     *   security: {
     *     apiKeys: ['your-api-key'],
     *     requireAuth: true
     *   }
     * });
     * ```
     */
    async start(config = {}) {
        if (this.state !== 'stopped') {
            throw new Error(`Cannot start tool in state: ${this.state}`);
        }
        this.setState('starting');
        this.config = { ...config };
        // Recreate Express app to ensure clean middleware stack
        this.app = (0, express_1.default)();
        this.setupExpressApp();
        try {
            // Set up API keys for authentication
            if (this.config.security?.apiKeys) {
                this.validApiKeys = new Set(this.config.security.apiKeys);
            }
            // Set trust proxy if configured
            if (this.config.security?.trustProxy !== undefined) {
                this.app.set('trust proxy', this.config.security.trustProxy);
            }
            // Apply middleware in correct order
            this.applyCorsConfiguration();
            this.applyRateLimiting();
            this.setupAuthentication();
            this.setupRoutes();
            // Start server
            const port = this.config.port !== undefined ? this.config.port : 3000;
            const host = this.config.host || '0.0.0.0';
            await new Promise((resolve, reject) => {
                this.server = this.app.listen(port, host, () => {
                    this.setState('running');
                    this.startTime = Date.now(); // Set actual start time when server is running
                    this.emit('serverStarted', port, host);
                    resolve();
                });
                this.server.on('error', reject);
            });
            console.log(`🚀 Tool "${this.definition.metadata.name}" v${this.definition.metadata.version} started on ${host}:${port}`);
        }
        catch (error) {
            this.setState('error');
            throw new types_js_1.ExecutionError(`Failed to start tool server: ${error.message}`, error);
        }
    }
    /**
     * Stops the tool server
     *
     * @returns Promise that resolves when server is stopped
     *
     * @example
     * ```typescript
     * await tool.stop();
     * ```
     */
    async stop() {
        if (this.state !== 'running') {
            throw new Error(`Cannot stop tool in state: ${this.state}`);
        }
        this.setState('stopping');
        try {
            if (this.server) {
                await new Promise((resolve, reject) => {
                    const timeout = this.config.timeouts?.shutdown || 10000;
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Server shutdown timed out'));
                    }, timeout);
                    this.server.close((error) => {
                        clearTimeout(timeoutId);
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
            // Call cleanup function if provided
            if (this.definition.cleanup) {
                await this.definition.cleanup();
            }
            this.setState('stopped');
            this.emit('serverStopped');
            console.log(`✅ Tool "${this.definition.metadata.name}" stopped successfully`);
        }
        catch (error) {
            this.setState('error');
            throw new types_js_1.ExecutionError(`Failed to stop tool server: ${error.message}`, error);
        }
    }
    /**
     * Restarts the tool server with optional new configuration
     *
     * @param config - Optional new configuration
     * @returns Promise that resolves when server is restarted
     *
     * @example
     * ```typescript
     * await tool.restart({ port: 3001 });
     * ```
     */
    async restart(config) {
        if (this.state === 'running') {
            await this.stop();
        }
        if (config) {
            this.config = { ...this.config, ...config };
        }
        await this.start(this.config);
    }
    /**
     * Sets the tool state and emits state change event
     * @private
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChange', oldState, newState);
    }
    /**
     * Gets the current tool state
     *
     * @returns Current tool state
     */
    getState() {
        return this.state;
    }
    /**
     * Gets current tool metrics
     *
     * @returns Current metrics object
     */
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    /**
     * Gets tool metadata
     *
     * @returns Tool metadata object
     */
    getMetadata() {
        return this.definition.metadata;
    }
    /**
     * Gets tool schema
     *
     * @returns Tool schema object
     */
    getSchema() {
        return this.definition.schema;
    }
    /**
     * Tests tool execution with provided input (dry run)
     *
     * @param input - Test input data
     * @param config - Optional configuration (uses set config if not provided)
     * @returns Validation result and execution result if successful
     *
     * @example
     * ```typescript
     * const testResult = await tool.test({
     *   city: 'Madrid',
     *   units: 'metric'
     * });
     *
     * if (testResult.valid) {
     *   console.log('Test execution result:', testResult.result);
     * }
     * ```
     */
    async test(input, config) {
        try {
            // Validate input
            const inputValidation = await this.validator.validateInput(input, this.definition.schema.input);
            if (!inputValidation.success) {
                return {
                    valid: false,
                    errors: inputValidation.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
                };
            }
            // Use provided config or tool config
            let validatedConfig;
            if (config) {
                const configValidation = await this.validator.validateConfig(config, this.definition.schema.config);
                if (!configValidation.success) {
                    return {
                        valid: false,
                        errors: configValidation.errors?.map(e => `config.${e.path.join('.')}: ${e.message}`)
                    };
                }
                validatedConfig = configValidation.data;
            }
            else if (this.toolConfig) {
                validatedConfig = this.toolConfig;
            }
            else {
                return {
                    valid: false,
                    errors: ['No configuration provided and no tool configuration set']
                };
            }
            // Create test execution context
            const context = {
                executionId: `test-${(0, crypto_1.randomUUID)()}`,
                toolId: this.definition.metadata.name,
                toolVersion: this.definition.metadata.version,
                timestamp: new Date(),
                environment: 'test',
                performance: {
                    startTime: perf_hooks_1.performance.now()
                },
                flags: {
                    dryRun: true
                }
            };
            // Execute tool
            const result = await this.definition.execute(inputValidation.data, validatedConfig, context);
            return {
                valid: true,
                result
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }
}
exports.Tool = Tool;
//# sourceMappingURL=tool.js.map