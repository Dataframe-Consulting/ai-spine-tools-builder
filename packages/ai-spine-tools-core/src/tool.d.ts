import { Request } from 'express';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolMetadata,
  ToolSchema,
  ToolInput,
  ToolConfig,
} from './types.js';
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
 * Current tool state
 */
export type ToolState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error';
/**
 * Events emitted by the Tool instance
 */
export interface ToolEvents {
  /** Emitted when tool state changes */
  stateChange: (oldState: ToolState, newState: ToolState) => void;
  /** Emitted before tool execution */
  beforeExecution: (context: ToolExecutionContext) => void;
  /** Emitted after tool execution */
  afterExecution: (
    context: ToolExecutionContext,
    result: ToolExecutionResult
  ) => void;
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
export declare class Tool<TInput = ToolInput, TConfig = ToolConfig> {
  private readonly definition;
  private readonly validator;
  private app;
  private server;
  private state;
  private config;
  private toolConfig;
  private startTime;
  private executionHistory;
  private metrics;
  private eventListeners;
  private validApiKeys;
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
  constructor(definition: ToolDefinition<TInput, TConfig>);
  /**
   * Validates the tool definition for completeness and correctness
   * @private
   */
  private validateDefinition;
  /**
   * Initializes metrics tracking
   * @private
   */
  private initializeMetrics;
  /**
   * Sets up the Express.js application with middleware
   * @private
   */
  private setupExpressApp;
  /**
   * Applies CORS configuration
   * @private
   */
  private applyCorsConfiguration;
  /**
   * Applies rate limiting configuration
   * @private
   */
  private applyRateLimiting;
  /**
   * Sets up authentication middleware
   * @private
   */
  private setupAuthentication;
  /**
   * Sets up all HTTP endpoints with comprehensive middleware
   * @private
   */
  private setupRoutes;
  /**
   * Async error handler wrapper for route handlers
   * @private
   */
  private asyncErrorHandler;
  /**
   * Sends standardized error responses across all endpoints
   *
   * @param res Express response object
   * @param error Error details
   * @param requestId Optional request ID for tracking
   * @private
   */
  private sendStandardError;
  /**
   * Handles the /api/execute endpoint
   * @private
   */
  private handleExecute;
  /**
   * Executes the tool with timeout protection
   * @private
   */
  private executeWithTimeout;
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
  private handleHealth;
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
  private handleSchema;
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
  private handleMetrics;
  /**
   * Calculates trend direction for a series of data points
   * @private
   */
  private calculateTrend;
  /**
   * Calculates overall performance score (0-100)
   * @private
   */
  private calculatePerformanceScore;
  /**
   * Calculates availability percentage
   * @private
   */
  private calculateAvailability;
  /**
   * Calculates throughput score based on requests per minute
   * @private
   */
  private calculateThroughputScore;
  /**
   * Generates basic example input data for documentation
   * @private
   */
  private generateBasicExampleInput;
  /**
   * Generates OpenAPI request body schema for the execute endpoint
   * @private
   */
  private generateRequestBodySchema;
  /**
   * Records execution statistics
   * @private
   */
  private recordExecution;
  /**
   * Updates calculated metrics
   * @private
   */
  private updateMetrics;
  /**
   * Event emitter functionality
   * @private
   */
  private emit;
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
  setConfig(config: TConfig): Promise<void>;
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
  on<K extends keyof ToolEvents>(event: K, listener: ToolEvents[K]): void;
  /**
   * Removes an event listener
   *
   * @param event - Event name
   */
  off<K extends keyof ToolEvents>(event: K): void;
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
  start(config?: ToolServerConfig): Promise<void>;
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
  stop(): Promise<void>;
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
  restart(config?: ToolServerConfig): Promise<void>;
  /**
   * Sets the tool state and emits state change event
   * @private
   */
  private setState;
  /**
   * Gets the current tool state
   *
   * @returns Current tool state
   */
  getState(): ToolState;
  /**
   * Gets current tool metrics
   *
   * @returns Current metrics object
   */
  getMetrics(): ToolMetrics;
  /**
   * Gets tool metadata
   *
   * @returns Tool metadata object
   */
  getMetadata(): ToolMetadata;
  /**
   * Gets tool schema
   *
   * @returns Tool schema object
   */
  getSchema(): ToolSchema;
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
  test(
    input: TInput,
    config?: TConfig
  ): Promise<{
    valid: boolean;
    errors?: string[];
    result?: ToolExecutionResult;
  }>;
}
//# sourceMappingURL=tool.d.ts.map
