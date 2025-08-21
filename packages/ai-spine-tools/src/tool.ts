import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  ToolMetadata,
  ToolSchema,
  ToolInput,
  ToolConfig,
  ToolContext,
  ToolExecutionResult,
  ToolHealthCheck,
  ToolDefinition,
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse,
  SchemaValidator,
  ToolUtils,
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
} from '@ai-spine/tools-core';

export interface ToolServerOptions {
  port?: number;
  host?: string;
  cors?: boolean;
  helmet?: boolean;
  compression?: boolean;
  apiKeyAuth?: boolean;
  validApiKeys?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CreateToolOptions<TInput extends ToolInput, TConfig extends ToolConfig> {
  metadata: ToolMetadata;
  schema: ToolSchema;
  execute: (input: TInput, config: TConfig, context: ToolContext) => Promise<any>;
  validateConfig?: (config: TConfig) => Promise<void>;
  onStartup?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}

export class Tool<TInput extends ToolInput = ToolInput, TConfig extends ToolConfig = ToolConfig> {
  private app: express.Application;
  private server?: any;
  private startTime: Date;
  private lastExecution?: Date;
  private executionCount = 0;
  private errorCount = 0;
  private totalExecutionTime = 0;

  constructor(
    private definition: ToolDefinition,
    private config: TConfig,
    private options: ToolServerOptions = {}
  ) {
    this.app = express();
    this.startTime = new Date();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security and optimization middleware
    if (this.options.helmet !== false) {
      this.app.use(helmet());
    }

    if (this.options.cors !== false) {
      this.app.use(cors());
    }

    if (this.options.compression !== false) {
      this.app.use(compression());
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // API key authentication middleware
    if (this.options.apiKeyAuth) {
      this.app.use(this.authMiddleware.bind(this));
    }

    // Request logging
    this.app.use(this.loggingMiddleware.bind(this));
  }

  private authMiddleware(req: Request, res: Response, next: express.NextFunction): void {
    // Skip auth for health check
    if (req.path === '/health') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        error_code: 'UNAUTHORIZED',
        error_message: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);
    const validKeys = this.options.validApiKeys || [];

    if (validKeys.length > 0 && !validKeys.includes(token)) {
      res.status(401).json({
        status: 'error',
        error_code: 'INVALID_API_KEY',
        error_message: 'Invalid API key',
      });
      return;
    }

    next();
  }

  private loggingMiddleware(req: Request, res: Response, next: express.NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'error' : 'info';
      
      this.log(level, `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });

    next();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', this.handleHealth.bind(this));

    // Execute endpoint
    this.app.post('/execute', this.handleExecute.bind(this));

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  private async handleHealth(req: Request, res: Response): Promise<void> {
    try {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      const errorRate = this.executionCount > 0 
        ? (this.errorCount / this.executionCount) * 100 
        : 0;
      const avgResponseTime = this.executionCount > 0 
        ? this.totalExecutionTime / this.executionCount 
        : 0;

      const health: AISpineHealthResponse = {
        status: 'healthy',
        version: this.definition.metadata.version,
        tool_metadata: this.definition.metadata,
        capabilities: this.definition.metadata.capabilities,
        uptime_seconds: uptime,
        last_execution: this.lastExecution?.toISOString(),
        error_rate_percent: Math.round(errorRate * 100) / 100,
        avg_response_time_ms: Math.round(avgResponseTime * 100) / 100,
      };

      res.json(health);
    } catch (error) {
      this.log('error', 'Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        version: this.definition.metadata.version,
        tool_metadata: this.definition.metadata,
        capabilities: this.definition.metadata.capabilities,
        uptime_seconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      });
    }
  }

  private async handleExecute(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const executionId = ToolUtils.generateExecutionId();

    try {
      const request = req.body as AISpineExecuteRequest;
      
      // Validate request structure
      if (!request || typeof request !== 'object') {
        throw new ValidationError('Request body must be a valid JSON object');
      }

      if (!request.input_data || typeof request.input_data !== 'object') {
        throw new ValidationError('input_data is required and must be an object');
      }

      // Validate input against schema
      SchemaValidator.validateInput(request.input_data, this.definition.schema.input);

      // Validate config against schema
      const config = { ...this.config, ...(request.config || {}) };
      SchemaValidator.validateConfig(config, this.definition.schema.config);

      // Create execution context
      const context: ToolContext = {
        execution_id: request.execution_id || executionId,
        tool_id: this.definition.metadata.name,
        timestamp: new Date(),
        metadata: request.metadata,
      };

      this.log('info', `Executing tool with ID: ${context.execution_id}`);

      // Execute the tool
      const result = await this.definition.execute(
        request.input_data as TInput,
        config as TConfig,
        context
      );

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.executionCount++;
      this.totalExecutionTime += executionTime;
      this.lastExecution = new Date();

      const response: AISpineExecuteResponse = {
        execution_id: context.execution_id,
        status: 'success',
        output_data: result,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
      };

      res.json(response);

      this.log('info', `Tool execution completed successfully in ${executionTime}ms`);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.errorCount++;
      this.executionCount++;
      this.totalExecutionTime += executionTime;

      this.log('error', 'Tool execution failed:', error);

      let errorResponse: AISpineExecuteResponse;

      if (error instanceof ToolError) {
        errorResponse = {
          execution_id: executionId,
          status: 'error',
          error_code: error.code,
          error_message: error.message,
          error_details: error.details,
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString(),
        };
      } else {
        errorResponse = {
          execution_id: executionId,
          status: 'error',
          error_code: 'UNEXPECTED_ERROR',
          error_message: ToolUtils.formatErrorMessage(error),
          execution_time_ms: executionTime,
          timestamp: new Date().toISOString(),
        };
      }

      const statusCode = error instanceof ValidationError ? 400 : 500;
      res.status(statusCode).json(errorResponse);
    }
  }

  private errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: express.NextFunction
  ): void {
    this.log('error', 'Unhandled error:', error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      status: 'error',
      error_code: 'INTERNAL_ERROR',
      error_message: 'An internal error occurred',
      execution_id: ToolUtils.generateExecutionId(),
      timestamp: new Date().toISOString(),
    });
  }

  private log(level: string, message: string, ...args: any[]): void {
    const logLevel = this.options.logLevel || 'info';
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    
    if (levels[level as keyof typeof levels] >= levels[logLevel]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
    }
  }

  /**
   * Start the tool server
   */
  async serve(options: Partial<ToolServerOptions> = {}): Promise<void> {
    const serverOptions = { ...this.options, ...options };
    const port = serverOptions.port || 3000;
    const host = serverOptions.host || '0.0.0.0';

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, host, () => {
        this.log('info', `🚀 Tool server running on http://${host}:${port}`);
        this.log('info', `📊 Health check: GET http://${host}:${port}/health`);
        this.log('info', `⚡ Execute: POST http://${host}:${port}/execute`);
        resolve();
      });

      this.server.on('error', (error: Error) => {
        this.log('error', 'Server failed to start:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the tool server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.log('info', 'Tool server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Get the Express app instance for advanced configuration
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return this.definition.metadata;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    executionCount: number;
    errorCount: number;
    avgExecutionTime: number;
    errorRate: number;
    uptime: number;
  } {
    return {
      executionCount: this.executionCount,
      errorCount: this.errorCount,
      avgExecutionTime: this.executionCount > 0 ? this.totalExecutionTime / this.executionCount : 0,
      errorRate: this.executionCount > 0 ? (this.errorCount / this.executionCount) * 100 : 0,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }
}