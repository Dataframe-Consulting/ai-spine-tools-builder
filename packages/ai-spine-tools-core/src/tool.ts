import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createHash, randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolMetadata,
  ToolSchema,
  ToolInput,
  ToolConfig,
  ToolHealthCheck,
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse
} from './types.js';
import { ZodSchemaValidator, ValidationResult } from './validation.js';
import { DocumentationGenerator } from './field-builders.js';

/**
 * Configuration options for Tool server setup
 * 
 * @example
 * ```typescript
 * const serverConfig: ToolServerConfig = {
 *   port: 3000,
 *   host: '0.0.0.0',
 *   cors: {
 *     origin: ['http://localhost:3000', 'https://myapp.com'],
 *     credentials: true
 *   },
 *   rateLimit: {
 *     windowMs: 15 * 60 * 1000, // 15 minutes
 *     max: 100 // limit each IP to 100 requests per windowMs
 *   },
 *   security: {
 *     apiKeys: ['your-api-key-here'],
 *     requireAuth: true
 *   },
 *   monitoring: {
 *     enableMetrics: true,
 *     metricsRetention: 24 * 60 * 60 * 1000 // 24 hours
 *   }
 * }
 * ```
 */
export interface ToolServerConfig {
  /** Port number for the HTTP server */
  port?: number;
  
  /** Host address to bind to */
  host?: string;
  
  /** CORS configuration */
  cors?: {
    /** Allowed origins for CORS */
    origin?: string | string[] | boolean;
    /** Whether to allow credentials */
    credentials?: boolean;
    /** Allowed headers */
    allowedHeaders?: string[];
    /** Allowed methods */
    methods?: string[];
  };
  
  /** Rate limiting configuration */
  rateLimit?: {
    /** Time window in milliseconds */
    windowMs?: number;
    /** Maximum requests per window */
    max?: number;
    /** Custom message for rate limit exceeded */
    message?: string;
    /** Skip successful requests in rate limit count */
    skipSuccessfulRequests?: boolean;
  };
  
  /** Security configuration */
  security?: {
    /** Valid API keys for authentication */
    apiKeys?: string[];
    /** Whether to require API key authentication */
    requireAuth?: boolean;
    /** Custom authentication function */
    customAuth?: (req: Request) => Promise<boolean>;
    /** Trusted proxy configuration */
    trustProxy?: boolean | number | string;
  };
  
  /** Monitoring and observability configuration */
  monitoring?: {
    /** Whether to enable performance metrics collection */
    enableMetrics?: boolean;
    /** How long to retain metrics in memory (milliseconds) */
    metricsRetention?: number;
    /** Custom metrics collector */
    customMetrics?: (metrics: ToolMetrics) => void;
  };
  
  /** Development mode settings */
  development?: {
    /** Enable detailed error messages */
    verboseErrors?: boolean;
    /** Enable hot reload (if supported) */
    hotReload?: boolean;
    /** Enable request/response logging */
    requestLogging?: boolean;
  };
  
  /** Timeout settings */
  timeouts?: {
    /** Request timeout in milliseconds */
    request?: number;
    /** Tool execution timeout in milliseconds */
    execution?: number;
    /** Server shutdown timeout in milliseconds */
    shutdown?: number;
  };
}

/**
 * Tool execution metrics and performance data
 */
export interface ToolMetrics {
  /** Total number of executions */
  totalExecutions: number;
  
  /** Number of successful executions */
  successfulExecutions: number;
  
  /** Number of failed executions */
  failedExecutions: number;
  
  /** Average execution time in milliseconds */
  averageExecutionTimeMs: number;
  
  /** Minimum execution time in milliseconds */
  minExecutionTimeMs: number;
  
  /** Maximum execution time in milliseconds */
  maxExecutionTimeMs: number;
  
  /** Error rate percentage (0-100) */
  errorRatePercent: number;
  
  /** Requests per minute */
  requestsPerMinute: number;
  
  /** Current memory usage in bytes */
  memoryUsageBytes: number;
  
  /** CPU usage percentage (0-100) */
  cpuUsagePercent: number;
  
  /** Server uptime in seconds */
  uptimeSeconds: number;
  
  /** Timestamp of last execution */
  lastExecutionAt?: Date;
  
  /** Recent error codes and their counts */
  recentErrors: Record<string, number>;
  
  /** Rate limiting statistics */
  rateLimiting?: {
    /** Total requests blocked */
    blockedRequests: number;
    /** Current rate limit status */
    currentWindowRequests: number;
    /** Rate limit window reset time */
    windowResetAt: Date;
  };
}

/**
 * Tool execution statistics for a single request
 */
interface ExecutionStats {
  executionId: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  success: boolean;
  errorCode?: string;
  memoryUsageBytes?: number;
  timestamp: Date;
}

/**
 * Current tool state
 */
export type ToolState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Events emitted by the Tool instance
 */
export interface ToolEvents {
  /** Emitted when tool state changes */
  stateChange: (oldState: ToolState, newState: ToolState) => void;
  
  /** Emitted before tool execution */
  beforeExecution: (context: ToolExecutionContext) => void;
  
  /** Emitted after tool execution */
  afterExecution: (context: ToolExecutionContext, result: ToolExecutionResult) => void;
  
  /** Emitted when an error occurs */
  error: (error: Error, context?: ToolExecutionContext) => void;
  
  /** Emitted when server starts */
  serverStarted: (port: number, host: string) => void;
  
  /** Emitted when server stops */
  serverStopped: () => void;
  
  /** Emitted for rate limit events */
  rateLimitExceeded: (ip: string, limit: number) => void;
}

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
export class Tool<TInput = ToolInput, TConfig = ToolConfig> {
  private readonly definition: ToolDefinition<TInput, TConfig>;
  private readonly validator: ZodSchemaValidator;
  private readonly documentationGenerator: DocumentationGenerator;
  
  private app: Application;
  private server: any;
  private state: ToolState = 'stopped';
  private config: ToolServerConfig = {};
  private toolConfig: TConfig | null = null;
  
  // Metrics and monitoring
  private startTime: number = Date.now();
  private executionHistory: ExecutionStats[] = [];
  private metrics: ToolMetrics;
  private eventListeners: Partial<ToolEvents> = {};
  
  // Security
  private validApiKeys: Set<string> = new Set();
  
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
  constructor(definition: ToolDefinition<TInput, TConfig>) {
    this.definition = definition;
    this.validator = new ZodSchemaValidator();
    this.documentationGenerator = new DocumentationGenerator();
    
    this.app = express();
    this.initializeMetrics();
    this.setupExpressApp();
    
    this.validateDefinition();
  }
  
  /**
   * Validates the tool definition for completeness and correctness
   * @private
   */
  private validateDefinition(): void {
    if (!this.definition.metadata?.name) {
      throw new ConfigurationError('Tool metadata must include a name');
    }
    
    if (!this.definition.metadata?.version) {
      throw new ConfigurationError('Tool metadata must include a version');
    }
    
    if (!this.definition.metadata?.description) {
      throw new ConfigurationError('Tool metadata must include a description');
    }
    
    if (!this.definition.schema) {
      throw new ConfigurationError('Tool must include a schema definition');
    }
    
    if (typeof this.definition.execute !== 'function') {
      throw new ConfigurationError('Tool must include an execute function');
    }
  }
  
  /**
   * Initializes metrics tracking
   * @private
   */
  private initializeMetrics(): void {
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
  private setupExpressApp(): void {
    // Security middleware
    this.app.use(helmet({
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
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request ID middleware
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });
    
    // Request logging middleware (development)
    this.app.use((req, res, next) => {
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
  private applyCorsConfiguration(): void {
    if (this.config.cors) {
      this.app.use(cors({
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
  private applyRateLimiting(): void {
    if (this.config.rateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
        max: this.config.rateLimit.max || 100,
        message: this.config.rateLimit.message || 'Too many requests, please try again later',
        skipSuccessfulRequests: this.config.rateLimit.skipSuccessfulRequests || false,
        handler: (req, res) => {
          this.emit('rateLimitExceeded', req.ip, this.config.rateLimit!.max!);
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: this.config.rateLimit!.message || 'Too many requests, please try again later',
              type: 'client_error',
              retryAfterMs: this.config.rateLimit!.windowMs
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
  private setupAuthentication(): void {
    if (!this.config.security?.requireAuth) {
      return;
    }
    
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        let authenticated = false;
        
        // Check for API key authentication
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (apiKey && this.validApiKeys.has(apiKey as string)) {
          authenticated = true;
          // Add API key hash to request for logging
          req.headers['x-api-key-hash'] = createHash('sha256').update(apiKey as string).digest('hex').substring(0, 8);
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
        
        next();
      } catch (error) {
        res.status(500).json({
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
   * Sets up all HTTP endpoints
   * @private
   */
  private setupRoutes(): void {
    // POST /api/execute - Main tool execution endpoint
    this.app.post('/api/execute', async (req: Request, res: Response) => {
      await this.handleExecute(req, res);
    });
    
    // GET /health - Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      await this.handleHealth(req, res);
    });
    
    // GET /schema - Schema documentation endpoint
    this.app.get('/schema', async (req: Request, res: Response) => {
      await this.handleSchema(req, res);
    });
    
    // GET /metrics - Performance metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      await this.handleMetrics(req, res);
    });
    
    // GET / - Root endpoint with basic info
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: this.definition.metadata.name,
        version: this.definition.metadata.version,
        description: this.definition.metadata.description,
        capabilities: this.definition.metadata.capabilities,
        endpoints: {
          execute: '/api/execute',
          health: '/health',
          schema: '/schema',
          metrics: '/metrics'
        }
      });
    });
    
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint ${req.method} ${req.originalUrl} not found`,
          type: 'client_error'
        }
      });
    });
    
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      
      const isDevelopment = this.config.development?.verboseErrors;
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
          type: 'server_error',
          ...(isDevelopment && { 
            details: error.message,
            stackTrace: error.stack 
          })
        }
      });
    });
  }
  
  /**
   * Handles the /api/execute endpoint
   * @private
   */
  private async handleExecute(req: Request, res: Response): Promise<void> {
    const executionId = randomUUID();
    const startTime = performance.now();
    
    try {
      // Create execution context
      const context: ToolExecutionContext = {
        executionId,
        toolId: this.definition.metadata.name,
        toolVersion: this.definition.metadata.version,
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] as string,
        environment: process.env.NODE_ENV || 'development',
        performance: {
          startTime,
          timeoutMs: this.config.timeouts?.execution || 30000
        },
        security: {
          apiKeyHash: req.headers['x-api-key-hash'] as string,
          sourceIp: req.ip,
          userAgent: req.headers['user-agent']
        }
      };
      
      this.emit('beforeExecution', context);
      
      // Validate request format
      if (!req.body || typeof req.body !== 'object') {
        throw new ValidationError('Request body must be a JSON object');
      }
      
      const { input_data = {}, config = {} } = req.body as AISpineExecuteRequest;
      
      // Validate input data
      const inputValidation = await this.validator.validateInput(
        input_data,
        this.definition.schema.input
      );
      
      if (!inputValidation.success) {
        throw new ValidationError(
          'Input validation failed',
          inputValidation.errors?.[0]?.path.join('.'),
          input_data
        );
      }
      
      // Use configured tool config if available, otherwise validate provided config
      let validatedConfig: TConfig;
      if (this.toolConfig) {
        validatedConfig = this.toolConfig;
      } else {
        const configValidation = await this.validator.validateConfig(
          config,
          this.definition.schema.config
        );
        
        if (!configValidation.success) {
          throw new ConfigurationError(
            'Configuration validation failed',
            configValidation.errors?.map(e => e.path.join('.'))
          );
        }
        
        validatedConfig = configValidation.data as TConfig;
      }
      
      // Execute the tool
      const result = await this.executeWithTimeout(
        inputValidation.data as TInput,
        validatedConfig,
        context
      );
      
      const endTime = performance.now();
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
      const response: AISpineExecuteResponse = {
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
      
    } catch (error) {
      const endTime = performance.now();
      const executionTimeMs = endTime - startTime;
      
      this.emit('error', error as Error, { executionId } as ToolExecutionContext);
      
      // Record failed execution
      this.recordExecution({
        executionId,
        startTime,
        endTime,
        durationMs: executionTimeMs,
        success: false,
        errorCode: (error as ToolError).code || 'UNKNOWN_ERROR',
        timestamp: new Date()
      });
      
      let statusCode = 500;
      let errorResponse: any;
      
      if (error instanceof ValidationError) {
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
      } else if (error instanceof ConfigurationError) {
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
      } else {
        errorResponse = {
          execution_id: executionId,
          status: 'error',
          error_code: 'INTERNAL_ERROR',
          error_message: 'An internal error occurred',
          error_details: this.config.development?.verboseErrors ? (error as Error).message : undefined,
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
  private async executeWithTimeout(
    input: TInput,
    config: TConfig,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const timeoutMs = context.performance?.timeoutMs || 30000;
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ExecutionError(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      try {
        const result = await this.definition.execute(input, config, context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Handles the /health endpoint
   * @private
   */
  private async handleHealth(req: Request, res: Response): Promise<void> {
    try {
      let healthStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let details: Record<string, any> = {};
      
      // Run custom health check if available
      if (this.definition.healthCheck) {
        const customHealth = await this.definition.healthCheck();
        healthStatus = customHealth.status;
        details = customHealth.details || {};
      }
      
      // Check error rate
      if (this.metrics.errorRatePercent > 50) {
        healthStatus = 'degraded';
        details.errorRate = `${this.metrics.errorRatePercent}%`;
      }
      
      const response: AISpineHealthResponse = {
        status: healthStatus,
        version: this.definition.metadata.version,
        tool_metadata: this.definition.metadata,
        capabilities: this.definition.metadata.capabilities,
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        last_execution: this.metrics.lastExecutionAt?.toISOString(),
        error_rate_percent: this.metrics.errorRatePercent,
        avg_response_time_ms: this.metrics.averageExecutionTimeMs
      };
      
      const statusCode = healthStatus === 'healthy' ? 200 :
                        healthStatus === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(response);
      
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        version: this.definition.metadata.version,
        tool_metadata: this.definition.metadata,
        capabilities: this.definition.metadata.capabilities,
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        error: 'Health check failed'
      });
    }
  }
  
  /**
   * Handles the /schema endpoint
   * @private
   */
  private async handleSchema(req: Request, res: Response): Promise<void> {
    try {
      const documentation = this.documentationGenerator.generateToolDocumentation(
        this.definition.schema,
        {
          name: this.definition.metadata.name,
          description: this.definition.metadata.description,
          version: this.definition.metadata.version
        }
      );
      
      res.json(documentation);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'SCHEMA_GENERATION_ERROR',
          message: 'Failed to generate schema documentation',
          type: 'server_error'
        }
      });
    }
  }
  
  /**
   * Handles the /metrics endpoint
   * @private
   */
  private async handleMetrics(req: Request, res: Response): Promise<void> {
    try {
      this.updateMetrics();
      res.json(this.metrics);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve metrics',
          type: 'server_error'
        }
      });
    }
  }
  
  /**
   * Records execution statistics
   * @private
   */
  private recordExecution(stats: ExecutionStats): void {
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
  private updateMetrics(): void {
    const now = Date.now();
    const recentExecutions = this.executionHistory.filter(e => 
      now - e.timestamp.getTime() < (this.config.monitoring?.metricsRetention || 24 * 60 * 60 * 1000)
    );
    
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
    const oneHourAgo = now - 60 * 60 * 1000;
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
  private emit<K extends keyof ToolEvents>(event: K, ...args: Parameters<ToolEvents[K]>): void {
    const listener = this.eventListeners[event];
    if (listener) {
      (listener as any)(...args);
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
  public async setConfig(config: TConfig): Promise<void> {
    const validation = await this.validator.validateConfig(
      config as any,
      this.definition.schema.config
    );
    
    if (!validation.success) {
      throw new ConfigurationError(
        'Configuration validation failed',
        validation.errors?.map(e => e.path.join('.'))
      );
    }
    
    this.toolConfig = validation.data as TConfig;
    
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
  public on<K extends keyof ToolEvents>(event: K, listener: ToolEvents[K]): void {
    this.eventListeners[event] = listener;
  }
  
  /**
   * Removes an event listener
   * 
   * @param event - Event name
   */
  public off<K extends keyof ToolEvents>(event: K): void {
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
  public async start(config: ToolServerConfig = {}): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start tool in state: ${this.state}`);
    }
    
    this.setState('starting');
    this.config = { ...config };
    
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
      const port = this.config.port || 3000;
      const host = this.config.host || '0.0.0.0';
      
      await new Promise<void>((resolve, reject) => {
        this.server = this.app.listen(port, host, () => {
          this.setState('running');
          this.emit('serverStarted', port, host);
          resolve();
        });
        
        this.server.on('error', reject);
      });
      
      console.log(`🚀 Tool "${this.definition.metadata.name}" v${this.definition.metadata.version} started on ${host}:${port}`);
      
    } catch (error) {
      this.setState('error');
      throw new ExecutionError(`Failed to start tool server: ${(error as Error).message}`, error as Error);
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
  public async stop(): Promise<void> {
    if (this.state !== 'running') {
      throw new Error(`Cannot stop tool in state: ${this.state}`);
    }
    
    this.setState('stopping');
    
    try {
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          const timeout = this.config.timeouts?.shutdown || 10000;
          
          const timeoutId = setTimeout(() => {
            reject(new Error('Server shutdown timed out'));
          }, timeout);
          
          this.server.close((error: any) => {
            clearTimeout(timeoutId);
            if (error) {
              reject(error);
            } else {
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
      
    } catch (error) {
      this.setState('error');
      throw new ExecutionError(`Failed to stop tool server: ${(error as Error).message}`, error as Error);
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
  public async restart(config?: ToolServerConfig): Promise<void> {
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
  private setState(newState: ToolState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChange', oldState, newState);
  }
  
  /**
   * Gets the current tool state
   * 
   * @returns Current tool state
   */
  public getState(): ToolState {
    return this.state;
  }
  
  /**
   * Gets current tool metrics
   * 
   * @returns Current metrics object
   */
  public getMetrics(): ToolMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  /**
   * Gets tool metadata
   * 
   * @returns Tool metadata object
   */
  public getMetadata(): ToolMetadata {
    return this.definition.metadata;
  }
  
  /**
   * Gets tool schema
   * 
   * @returns Tool schema object
   */
  public getSchema(): ToolSchema {
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
  public async test(input: TInput, config?: TConfig): Promise<{
    valid: boolean;
    errors?: string[];
    result?: ToolExecutionResult;
  }> {
    try {
      // Validate input
      const inputValidation = await this.validator.validateInput(
        input as any,
        this.definition.schema.input
      );
      
      if (!inputValidation.success) {
        return {
          valid: false,
          errors: inputValidation.errors?.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      
      // Use provided config or tool config
      let validatedConfig: TConfig;
      if (config) {
        const configValidation = await this.validator.validateConfig(
          config as any,
          this.definition.schema.config
        );
        
        if (!configValidation.success) {
          return {
            valid: false,
            errors: configValidation.errors?.map(e => `config.${e.path.join('.')}: ${e.message}`)
          };
        }
        
        validatedConfig = configValidation.data as TConfig;
      } else if (this.toolConfig) {
        validatedConfig = this.toolConfig;
      } else {
        return {
          valid: false,
          errors: ['No configuration provided and no tool configuration set']
        };
      }
      
      // Create test execution context
      const context: ToolExecutionContext = {
        executionId: `test-${randomUUID()}`,
        toolId: this.definition.metadata.name,
        toolVersion: this.definition.metadata.version,
        timestamp: new Date(),
        environment: 'test',
        performance: {
          startTime: performance.now()
        },
        flags: {
          dryRun: true
        }
      };
      
      // Execute tool
      const result = await this.definition.execute(
        inputValidation.data as TInput,
        validatedConfig,
        context
      );
      
      return {
        valid: true,
        result
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }
}