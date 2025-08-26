import axios, { AxiosInstance } from 'axios';
import {
  ToolInput,
  ToolConfig,
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse,
  ToolError,
  ToolSchema
} from '@ai-spine/tools-core';
import { EventEmitter } from 'events';

/**
 * Configuration options for the AISpineTestClient.
 * 
 * @interface TestClientOptions
 * @example
 * ```typescript
 * const clientOptions: TestClientOptions = {
 *   baseURL: 'http://localhost:3000',
 *   timeout: 10000,
 *   apiKey: 'your-api-key',
 *   retries: 3,
 *   retryDelay: 1000,
 *   enableMetrics: true,
 *   enableDetailedLogs: true
 * };
 * ```
 */
/**
 * Event data emitted when a request is made.
 */
export interface RequestEvent {
  requestId: number;
  method: string;
  url: string;
  data: any;
  timestamp: string;
}

/**
 * Event data emitted when a response is received.
 */
export interface ResponseEvent {
  requestId: number;
  status: number;
  duration: number;
  data: any;
  timestamp: string;
}

/**
 * Event data emitted when an error occurs.
 */
export interface ErrorEvent {
  requestId?: number;
  error: ToolError;
  duration?: number;
  timestamp: string;
  type?: string;
}

export interface TestClientOptions {
  /** Base URL of the tool server */
  baseURL: string;
  
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  
  /** API key for authentication */
  apiKey?: string;
  
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  
  /** Custom headers to include with all requests */
  headers?: Record<string, string>;
  
  /** Enable detailed request/response logging (default: false) */
  enableDetailedLogs?: boolean;
  
  /** Enable performance metrics collection (default: true) */
  enableMetrics?: boolean;
  
  /** Custom user agent string */
  userAgent?: string;
  
  /** Enable automatic response validation (default: true) */
  validateResponses?: boolean;
  
  /** Custom certificate authority for HTTPS requests */
  ca?: string | Buffer;
  
  /** Allow invalid SSL certificates (for testing only) */
  rejectUnauthorized?: boolean;
}

/**
 * Result of a test execution including detailed timing and metadata.
 * 
 * @interface TestExecutionResult
 * @example
 * ```typescript
 * const result: TestExecutionResult = {
 *   success: true,
 *   response: {
 *     execution_id: 'exec_123',
 *     status: 'success',
 *     output_data: { temperature: 22 },
 *     execution_time_ms: 1200,
 *     timestamp: '2024-01-15T10:30:00.000Z'
 *   },
 *   duration: 1250,
 *   requestSize: 156,
 *   responseSize: 312,
 *   httpStatus: 200,
 *   timing: {
 *     dns: 5,
 *     connect: 12,
 *     request: 45,
 *     response: 1188,
 *     total: 1250
 *   }
 * };
 * ```
 */
export interface TestExecutionResult {
  /** Whether the execution was successful */
  success: boolean;
  
  /** Tool execution response (present on success) */
  response?: AISpineExecuteResponse;
  
  /** Error information (present on failure) */
  error?: ToolError;
  
  /** Total request duration in milliseconds */
  duration: number;
  
  /** HTTP status code */
  httpStatus?: number;
  
  /** Request payload size in bytes */
  requestSize?: number;
  
  /** Response payload size in bytes */
  responseSize?: number;
  
  /** Detailed timing breakdown */
  timing?: {
    /** DNS lookup time in ms */
    dns?: number;
    /** Connection time in ms */
    connect?: number;
    /** Request send time in ms */
    request?: number;
    /** Response receive time in ms */
    response?: number;
    /** Total time in ms */
    total: number;
  };
  
  /** Response headers */
  headers?: Record<string, string>;
  
  /** Retry information */
  retries?: {
    /** Number of retry attempts made */
    count: number;
    /** Reasons for retries */
    reasons: string[];
  };
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Performance metrics for tracking and analysis.
 * 
 * @interface PerformanceMetrics
 */
export interface PerformanceMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Minimum response time in ms */
  minResponseTime: number;
  /** Maximum response time in ms */
  maxResponseTime: number;
  /** Requests per second */
  requestsPerSecond: number;
  /** Error breakdown by type */
  errorBreakdown: Record<string, number>;
  /** Response time percentiles */
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

/**
 * Load testing configuration options.
 * 
 * @interface LoadTestOptions
 */
export interface LoadTestOptions {
  /** Number of concurrent users/connections */
  concurrency: number;
  /** Total number of requests to make */
  requests: number;
  /** Tool configuration to use */
  config?: ToolConfig;
  /** Ramp-up time in milliseconds */
  rampUpTime?: number;
  /** Duration to sustain load in milliseconds */
  duration?: number;
  /** Request rate (requests per second) */
  requestRate?: number;
  /** Think time between requests per user (ms) */
  thinkTime?: number;
  /** Custom request factory function */
  requestFactory?: () => ToolInput;
  /** Stop on first failure */
  stopOnFailure?: boolean;
}

/**
 * Comprehensive load test results with detailed analytics.
 * 
 * @interface LoadTestResult
 */
export interface LoadTestResult {
  /** Test configuration used */
  config: LoadTestOptions;
  /** Total test duration in ms */
  totalDuration: number;
  /** Performance metrics */
  metrics: PerformanceMetrics;
  /** Timeline of response times */
  timeline: Array<{
    timestamp: number;
    responseTime: number;
    success: boolean;
    error?: string;
  }>;
  /** Resource usage during test */
  resourceUsage?: {
    /** Peak memory usage in MB */
    peakMemoryMB?: number;
    /** Average CPU usage percentage */
    avgCpuUsage?: number;
  };
}

/**
 * Test scenario configuration.
 */
export interface TestScenario {
  /** Scenario name for identification */
  name: string;
  /** Input data for the test */
  input: ToolInput;
  /** Tool configuration (optional) */
  config?: ToolConfig;
  /** Whether this scenario should succeed */
  expectSuccess: boolean;
  /** Expected error message or code (for failure scenarios) */
  expectedError?: string;
  /** Custom timeout for this scenario */
  timeout?: number;
  /** Expected response validation function */
  validateResponse?: (response: any) => boolean;
  /** Scenario description */
  description?: string;
  /** Tags for categorizing scenarios */
  tags?: string[];
}

/**
 * Result of a scenario test.
 */
export interface ScenarioResult {
  /** Scenario name */
  scenario: string;
  /** Whether the test passed */
  passed: boolean;
  /** Execution result */
  result: TestExecutionResult;
  /** Error message if test failed */
  error?: string;
  /** Additional validation details */
  validationDetails?: {
    expectedSuccess: boolean;
    actualSuccess: boolean;
    expectedError?: string;
    actualError?: string;
    responseValidation?: boolean;
  };
}

/**
 * Comprehensive tool validation result.
 */
export interface ToolValidationResult {
  /** Overall validation status */
  healthy: boolean;
  /** List of validation issues found */
  issues: string[];
  /** Validation score (0-100) */
  score: number;
  /** Detailed test results */
  details: {
    health: {
      passed: boolean;
      response?: AISpineHealthResponse;
      error?: string;
    };
    schema: {
      passed: boolean;
      response?: any;
      error?: string;
    };
    basicExecution: {
      passed: boolean;
      result?: TestExecutionResult;
      error?: string;
    };
    endpoints: {
      health: boolean;
      schema: boolean;
      execute: boolean;
      metrics?: boolean;
    };
  };
  /** Performance characteristics */
  performance: {
    healthCheckTime: number;
    schemaRetrievalTime: number;
    basicExecutionTime: number;
  };
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Advanced test client for AI Spine tools with comprehensive testing capabilities.
 * Simulates how AI agents interact with tools and provides detailed analytics.
 * 
 * @class AISpineTestClient
 * @extends EventEmitter
 * @example
 * ```typescript
 * const client = new AISpineTestClient({
 *   baseURL: 'http://localhost:3000',
 *   apiKey: 'test-key',
 *   enableMetrics: true
 * });
 * 
 * // Execute single request
 * const result = await client.execute({ city: 'Madrid' });
 * 
 * // Run load test
 * const loadTestResult = await client.loadTest(
 *   { city: 'Madrid' },
 *   { concurrency: 10, requests: 100 }
 * );
 * 
 * // Get performance analytics
 * const analytics = client.getAnalytics();
 * ```
 */
export class AISpineTestClient extends EventEmitter {
  private client: AxiosInstance;
  private options: Required<TestClientOptions>;
  private metrics: {
    requests: TestExecutionResult[];
    startTime: number;
    errors: Array<{ timestamp: number; error: ToolError }>;
  };
  private requestId: number = 0;

  /**
   * Creates a new AISpineTestClient instance.
   * 
   * @param options - Configuration options for the client
   */
  constructor(options: TestClientOptions) {
    super();
    
    // Set defaults for all options
    this.options = {
      baseURL: options.baseURL,
      timeout: options.timeout || 10000,
      apiKey: options.apiKey || '',
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      headers: options.headers || {},
      enableDetailedLogs: options.enableDetailedLogs || false,
      enableMetrics: options.enableMetrics !== false,
      userAgent: options.userAgent || `AI-Spine-Test-Client/1.0.0`,
      validateResponses: options.validateResponses !== false,
      ca: options.ca || '',
      rejectUnauthorized: options.rejectUnauthorized !== false
    };
    
    this.metrics = {
      requests: [],
      startTime: Date.now(),
      errors: []
    };
    
    this.client = axios.create({
      baseURL: this.options.baseURL,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.options.userAgent,
        ...(this.options.apiKey && this.options.apiKey.length > 0 && { 'X-API-Key': this.options.apiKey }),
        ...this.options.headers,
      },
      ...(this.options.ca && this.options.ca.length > 0 && {
        httpsAgent: {
          ca: this.options.ca,
          rejectUnauthorized: this.options.rejectUnauthorized ?? true
        }
      })
    });

    // Add request interceptor for detailed logging and metrics
    this.client.interceptors.request.use(
      (config: any) => {
        const requestId = ++this.requestId;
        config.metadata = { requestId, startTime: Date.now() };
        
        if (this.options.enableDetailedLogs) {
          this.emit('request', {
            requestId,
            method: config.method?.toUpperCase() || 'GET',
            url: config.url || '',
            data: config.data,
            timestamp: new Date().toISOString()
          });
        }
        
        return config;
      },
      (error) => {
        this.emit('error', { type: 'request_setup', error });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and metrics
    this.client.interceptors.response.use(
      (response: any) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        if (this.options.enableDetailedLogs) {
          this.emit('response', {
            requestId: response.config.metadata?.requestId || 0,
            status: response.status,
            duration,
            data: response.data,
            timestamp: new Date().toISOString()
          });
        }
        
        return response;
      },
      (error: any) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);
        const toolError = this.createToolError(error, duration);
        
        if (this.options.enableMetrics) {
          this.metrics.errors.push({
            timestamp: Date.now(),
            error: toolError
          });
        }
        
        this.emit('error', {
          requestId: error.config?.metadata?.requestId || 0,
          error: toolError,
          duration,
          timestamp: new Date().toISOString()
        });
        
        throw toolError;
      }
    );
  }

  /**
   * Creates a ToolError from an Axios error with appropriate categorization.
   * 
   * @private
   * @param error - The Axios error
   * @param duration - Request duration in milliseconds
   * @returns Formatted ToolError
   */
  private createToolError(error: any, duration: number): ToolError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      return new ToolError(
        data?.error_message || data?.message || error.response.statusText,
        data?.error_code || this.getErrorCodeFromStatus(status),
        {
          status,
          data,
          duration,
          retryable: this.isRetryableStatus(status)
        }
      );
    } else if (error.request) {
      // Network error - no response received
      return new ToolError(
        'Network error: No response received',
        'NETWORK_ERROR',
        { 
          originalError: error.message,
          duration,
          retryable: true
        }
      );
    } else {
      // Request setup error
      return new ToolError(
        `Request setup error: ${error.message}`,
        'REQUEST_ERROR',
        { 
          originalError: error.message,
          duration,
          retryable: false
        }
      );
    }
  }

  /**
   * Maps HTTP status codes to error codes.
   * 
   * @private
   * @param status - HTTP status code
   * @returns Error code string
   */
  private getErrorCodeFromStatus(status: number): string {
    if (status >= 400 && status < 500) {
      switch (status) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 409: return 'CONFLICT';
        case 422: return 'VALIDATION_ERROR';
        case 429: return 'RATE_LIMITED';
        default: return 'CLIENT_ERROR';
      }
    } else if (status >= 500) {
      switch (status) {
        case 500: return 'INTERNAL_SERVER_ERROR';
        case 502: return 'BAD_GATEWAY';
        case 503: return 'SERVICE_UNAVAILABLE';
        case 504: return 'GATEWAY_TIMEOUT';
        default: return 'SERVER_ERROR';
      }
    }
    return 'HTTP_ERROR';
  }

  /**
   * Determines if an HTTP status code indicates a retryable error.
   * 
   * @private
   * @param status - HTTP status code
   * @returns Whether the error is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Check if the tool is healthy and accessible.
   * 
   * @returns Promise resolving to health check response
   * @throws ToolError if health check fails
   * 
   * @example
   * ```typescript
   * const health = await client.healthCheck();
   * console.log(`Tool status: ${health.status}`);
   * console.log(`Uptime: ${health.uptime_seconds}s`);
   * ```
   */
  async healthCheck(): Promise<AISpineHealthResponse> {
    try {
      const response = await this.client.get('/health');
      
      if (this.options.validateResponses) {
        this.validateHealthResponse(response.data);
      }
      
      return response.data;
    } catch (error) {
      throw error instanceof ToolError ? error : new ToolError(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        'HEALTH_CHECK_ERROR'
      );
    }
  }

  /**
   * Get the tool's schema and metadata.
   * 
   * @returns Promise resolving to tool schema
   * @throws ToolError if schema retrieval fails
   * 
   * @example
   * ```typescript
   * const schema = await client.getSchema();
   * console.log('Tool capabilities:', schema.metadata.capabilities);
   * ```
   */
  async getSchema(): Promise<{ metadata: any; schema: ToolSchema }> {
    try {
      const response = await this.client.get('/schema');
      return response.data;
    } catch (error) {
      throw error instanceof ToolError ? error : new ToolError(
        `Schema retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        'SCHEMA_ERROR'
      );
    }
  }

  /**
   * Get current performance metrics.
   * 
   * @returns Promise resolving to metrics response
   * @throws ToolError if metrics retrieval fails
   * 
   * @example
   * ```typescript
   * const metrics = await client.getMetrics();
   * console.log(`Average response time: ${metrics.avg_response_time_ms}ms`);
   * ```
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await this.client.get('/metrics');
      return response.data;
    } catch (error) {
      throw error instanceof ToolError ? error : new ToolError(
        `Metrics retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        'METRICS_ERROR'
      );
    }
  }

  /**
   * Validates health response structure.
   * 
   * @private
   * @param data - Health response data
   * @throws ToolError if validation fails
   */
  private validateHealthResponse(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new ToolError('Health response must be an object', 'INVALID_HEALTH_RESPONSE');
    }
    
    const requiredFields = ['status', 'tool_metadata', 'uptime_seconds'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      throw new ToolError(
        `Health response missing required fields: ${missingFields.join(', ')}`,
        'INVALID_HEALTH_RESPONSE',
        { missingFields }
      );
    }
    
    // Validate nested tool_metadata structure
    if (data.tool_metadata && typeof data.tool_metadata === 'object') {
      const metadataFields = ['name', 'version'];
      const missingMetadataFields = metadataFields.filter(field => !(field in data.tool_metadata));
      
      if (missingMetadataFields.length > 0) {
        throw new ToolError(
          `Tool metadata missing required fields: ${missingMetadataFields.join(', ')}`,
          'INVALID_HEALTH_RESPONSE',
          { missingMetadataFields }
        );
      }
    }
  }

  /**
   * Execute a tool with input data and comprehensive result tracking.
   * 
   * @param inputData - Tool input data
   * @param config - Tool configuration (optional)
   * @param options - Execution options
   * @returns Promise resolving to detailed execution result
   * 
   * @example
   * ```typescript
   * const result = await client.execute(
   *   { city: 'Madrid' },
   *   { apiKey: 'your-api-key' },
   *   {
   *     executionId: 'custom-id',
   *     timeout: 5000,
   *     metadata: { source: 'test-suite' }
   *   }
   * );
   * 
   * if (result.success) {
   *   console.log('Result:', result.response?.output_data);
   *   console.log('Duration:', result.duration, 'ms');
   * } else {
   *   console.error('Error:', result.error?.message);
   * }
   * ```
   */
  async execute(
    inputData: ToolInput,
    config?: ToolConfig,
    options: {
      executionId?: string;
      metadata?: Record<string, any>;
      timeout?: number;
      retryCount?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<TestExecutionResult> {
    const startTime = Date.now();
    const requestStartTime = process.hrtime.bigint();
    const retryCount = options.retryCount ?? this.options.retries;
    let lastError: ToolError | undefined;
    const retryReasons: string[] = [];

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const request: AISpineExecuteRequest = {
          tool_id: 'test-tool',
          input_data: inputData,
          config,
          execution_id: options.executionId || this.generateExecutionId(),
          metadata: options.metadata,
        };

        const requestSize = JSON.stringify(request).length;
        
        // Create axios config with custom timeout if provided
        const axiosConfig: any = {
          timeout: options.timeout || this.options.timeout,
          headers: options.headers || {}
        };

        const response = await this.client.post('/api/execute', request, axiosConfig);
        const endTime = process.hrtime.bigint();
        const duration = Date.now() - startTime;
        const responseSize = JSON.stringify(response.data).length;

        // Calculate detailed timing
        const totalNs = Number(endTime - requestStartTime);
        const totalMs = totalNs / 1_000_000;

        const result: TestExecutionResult = {
          success: true,
          response: response.data,
          duration,
          httpStatus: response.status,
          requestSize,
          responseSize,
          timing: {
            total: totalMs,
            // Note: Detailed timing breakdown would require custom axios adapter
            // For now, we provide total time
          },
          headers: response.headers as Record<string, string>,
          retries: attempt > 0 ? {
            count: attempt,
            reasons: retryReasons
          } : undefined,
          metadata: {
            attempt: attempt + 1,
            totalAttempts: retryCount + 1
          }
        };

        if (this.options.enableMetrics) {
          this.metrics.requests.push(result);
        }

        this.emit('execution', result);
        return result;

      } catch (error) {
        const duration = Date.now() - startTime;
        const toolError = error instanceof ToolError ? error : 
          new ToolError(String(error), 'EXECUTION_ERROR');
        
        lastError = toolError;

        // Check if we should retry
        if (attempt < retryCount && this.shouldRetry(toolError)) {
          retryReasons.push(`Attempt ${attempt + 1}: ${toolError.code}`);
          await this.delay(this.options.retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }

        // Final failure
        const result: TestExecutionResult = {
          success: false,
          error: toolError,
          duration,
          httpStatus: (toolError.details as any)?.status,
          retries: attempt > 0 ? {
            count: attempt,
            reasons: retryReasons
          } : undefined,
          metadata: {
            attempt: attempt + 1,
            totalAttempts: retryCount + 1,
            finalError: true
          }
        };

        if (this.options.enableMetrics) {
          this.metrics.requests.push(result);
        }

        this.emit('execution', result);
        return result;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new ToolError('Unknown execution error');
  }

  /**
   * Determines if an error is retryable.
   * 
   * @private
   * @param error - The error to check
   * @returns Whether the error should be retried
   */
  private shouldRetry(error: ToolError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVICE_UNAVAILABLE',
      'BAD_GATEWAY',
      'GATEWAY_TIMEOUT',
      'RATE_LIMITED'
    ];
    
    return retryableCodes.includes(error.code) || 
           (error.details as any)?.retryable === true;
  }

  /**
   * Generates a unique execution ID.
   * 
   * @private
   * @returns Unique execution ID string
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delays execution for the specified number of milliseconds.
   * 
   * @private
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a tool and wait for completion (for async tools).
   * Supports polling for long-running operations.
   */
  async executeAndWait(
    inputData: ToolInput,
    config?: ToolConfig,
    options: {
      timeout?: number;
      pollInterval?: number;
      executionId?: string;
      metadata?: Record<string, any>;
      maxPolls?: number;
      onProgress?: (status: any) => void;
    } = {}
  ): Promise<TestExecutionResult> {
    const { 
      timeout = 30000, 
      pollInterval = 1000, 
      maxPolls = Math.floor(timeout / pollInterval),
      onProgress
    } = options;
    
    // Execute the tool
    const executeResult = await this.execute(inputData, config, {
      executionId: options.executionId,
      metadata: options.metadata
    });

    if (!executeResult.success || !executeResult.response) {
      return executeResult;
    }

    // If the response indicates completion, return immediately
    if (executeResult.response.status === 'success' || executeResult.response.status === 'error') {
      return executeResult;
    }

    // Poll for completion (for async tools)
    const startTime = Date.now();
    const executionId = executeResult.response.execution_id;
    let pollCount = 0;

    while (Date.now() - startTime < timeout && pollCount < maxPolls) {
      await this.delay(pollInterval);
      pollCount++;

      try {
        const statusResponse = await this.client.get(`/api/executions/${executionId}`);
        const status = statusResponse.data;

        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }

        if (status.status === 'success' || status.status === 'error') {
          const totalDuration = Date.now() - startTime + executeResult.duration;
          
          return {
            success: status.status === 'success',
            response: status,
            duration: totalDuration,
            httpStatus: 200,
            error: status.status === 'error' ? new ToolError(
              status.error_message, 
              status.error_code
            ) : undefined,
            metadata: {
              ...executeResult.metadata,
              pollingCompleted: true,
              pollCount,
              totalWaitTime: totalDuration - executeResult.duration
            }
          };
        }
      } catch (error) {
        // Continue polling if status endpoint doesn't exist or fails
        if (this.options.enableDetailedLogs) {
          this.emit('polling_error', {
            executionId,
            pollCount,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        continue;
      }
    }

    // Timeout or max polls reached
    return {
      success: false,
      error: new ToolError(
        pollCount >= maxPolls ? 'Maximum polling attempts reached' : 'Execution timeout',
        'TIMEOUT_ERROR'
      ),
      duration: Date.now() - startTime + executeResult.duration,
      httpStatus: 408,
      metadata: {
        ...executeResult.metadata,
        timedOut: true,
        pollCount,
        maxPolls
      }
    };
  }

  /**
   * Test tool with various input scenarios and comprehensive result analysis.
   * Runs multiple test cases and provides detailed pass/fail analysis.
   */
  async testToolScenarios(
    scenarios: TestScenario[],
    options: {
      parallel?: boolean;
      maxConcurrency?: number;
      stopOnFirstFailure?: boolean;
      includeDetailedResults?: boolean;
    } = {}
  ): Promise<{
    results: ScenarioResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      duration: number;
      passRate: number;
    };
  }> {
    const startTime = Date.now();
    const { parallel = false, maxConcurrency = 5, stopOnFirstFailure = false } = options;
    const results: ScenarioResult[] = [];

    if (parallel) {
      // Run scenarios in parallel with concurrency control
      const chunks = this.chunkArray(scenarios, maxConcurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(scenario => this.runSingleScenario(scenario));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        if (stopOnFirstFailure && chunkResults.some(r => !r.passed)) {
          break;
        }
      }
    } else {
      // Run scenarios sequentially
      for (const scenario of scenarios) {
        const result = await this.runSingleScenario(scenario);
        results.push(result);
        
        if (stopOnFirstFailure && !result.passed) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    return {
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        duration,
        passRate: results.length > 0 ? (passed / results.length) * 100 : 0
      }
    };
  }

  /**
   * Runs a single test scenario with detailed validation.
   * 
   * @private
   * @param scenario - The test scenario to run
   * @returns Promise resolving to scenario result
   */
  private async runSingleScenario(scenario: TestScenario): Promise<ScenarioResult> {
    try {
      const result = await this.execute(scenario.input, scenario.config, {
        timeout: scenario.timeout
      });
      
      const validationDetails = {
        expectedSuccess: scenario.expectSuccess,
        actualSuccess: result.success,
        expectedError: scenario.expectedError,
        actualError: result.error?.message || result.error?.code,
        responseValidation: scenario.validateResponse ? 
          scenario.validateResponse(result.response?.output_data) : undefined
      };

      let passed = scenario.expectSuccess === result.success;
      
      // Additional validation for error scenarios
      if (!scenario.expectSuccess && scenario.expectedError) {
        const errorMatch = result.error && (
          result.error.message.includes(scenario.expectedError) ||
          result.error.code.includes(scenario.expectedError)
        );
        passed = passed && !!errorMatch;
      }
      
      // Custom response validation
      if (passed && scenario.validateResponse && result.success) {
        passed = scenario.validateResponse(result.response?.output_data);
      }

      return {
        scenario: scenario.name,
        passed,
        result,
        validationDetails,
        error: passed ? undefined : this.getScenarioErrorMessage(scenario, result, validationDetails)
      };
      
    } catch (error) {
      return {
        scenario: scenario.name,
        passed: false,
        result: {
          success: false,
          error: error instanceof ToolError ? error : new ToolError(String(error)),
          duration: 0
        },
        error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generates detailed error message for failed scenarios.
   * 
   * @private
   */
  private getScenarioErrorMessage(
    scenario: TestScenario, 
    result: TestExecutionResult, 
    validation: any
  ): string {
    const parts = [];
    
    if (scenario.expectSuccess !== result.success) {
      parts.push(`Expected ${scenario.expectSuccess ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`);
    }
    
    if (scenario.expectedError && (!result.error || 
        (!result.error.message.includes(scenario.expectedError) && 
         !result.error.code.includes(scenario.expectedError)))) {
      parts.push(`Expected error containing '${scenario.expectedError}', got '${result.error?.message || 'none'}'`);
    }
    
    if (validation.responseValidation === false) {
      parts.push('Custom response validation failed');
    }
    
    return parts.join('; ');
  }

  /**
   * Splits an array into chunks of specified size.
   * 
   * @private
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Perform comprehensive load testing with detailed analytics.
   * Simulates multiple concurrent users making requests to test performance and stability.
   */
  async loadTest(
    inputData: ToolInput | (() => ToolInput),
    options: LoadTestOptions
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    
    this.emit('loadtest_start', { options, startTime });

    try {
      if (options.duration) {
        // Duration-based load test
        return await this.runDurationBasedLoadTest(inputData, options, startTime);
      } else {
        // Request count-based load test
        return await this.runCountBasedLoadTest(inputData, options, startTime);
      }
    } catch (error) {
      this.emit('loadtest_error', { error, duration: Date.now() - startTime });
      throw error;
    }
  }

  /**
   * Runs a count-based load test.
   * 
   * @private
   */
  private async runCountBasedLoadTest(
    inputData: ToolInput | (() => ToolInput),
    options: LoadTestOptions,
    startTime: number
  ): Promise<LoadTestResult> {
    const { concurrency, requests, config, rampUpTime = 0, thinkTime = 0, requestFactory, stopOnFailure = false } = options;
    const results: TestExecutionResult[] = [];
    const timeline: LoadTestResult['timeline'] = [];
    const errors: Record<string, number> = {};
    let shouldStop = false;

    // Create worker promises for concurrent users
    const workers: Promise<void>[] = [];
    const requestsPerWorker = Math.ceil(requests / concurrency);

    for (let workerId = 0; workerId < concurrency; workerId++) {
      const workerPromise = this.createLoadTestWorker({
        workerId,
        requestsToMake: Math.min(requestsPerWorker, requests - (workerId * requestsPerWorker)),
        inputData: inputData,
        config,
        thinkTime,
        requestFactory,
        rampUpDelay: (rampUpTime / concurrency) * workerId,
        onResult: (result, timestamp) => {
          results.push(result);
          timeline.push({
            timestamp,
            responseTime: result.duration,
            success: result.success,
            error: result.error?.code
          });
          
          if (!result.success) {
            const errorKey = result.error?.code || 'UNKNOWN_ERROR';
            errors[errorKey] = (errors[errorKey] || 0) + 1;
            
            if (stopOnFailure) {
              shouldStop = true;
            }
          }
        },
        shouldStop: () => shouldStop
      });
      
      workers.push(workerPromise);
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return this.calculateLoadTestResult({
      config: options,
      totalDuration,
      results,
      timeline,
      errors
    });
  }

  /**
   * Creates a load test worker that makes requests according to the test plan.
   * 
   * @private
   */
  private async createLoadTestWorker(options: {
    workerId: number;
    requestsToMake: number;
    inputData: ToolInput | (() => ToolInput);
    config?: ToolConfig;
    thinkTime: number;
    requestFactory?: () => ToolInput;
    rampUpDelay: number;
    onResult: (result: TestExecutionResult, timestamp: number) => void;
    shouldStop: () => boolean;
  }): Promise<void> {
    const { 
      workerId, 
      requestsToMake, 
      inputData, 
      config, 
      thinkTime, 
      requestFactory, 
      rampUpDelay, 
      onResult, 
      shouldStop 
    } = options;

    // Apply ramp-up delay
    if (rampUpDelay > 0) {
      await this.delay(rampUpDelay);
    }

    for (let i = 0; i < requestsToMake && !shouldStop(); i++) {
      try {
        // Generate request data
        let requestInput: ToolInput;
        if (requestFactory) {
          requestInput = requestFactory();
        } else if (typeof inputData === 'function') {
          requestInput = inputData();
        } else {
          requestInput = inputData;
        }

        // Execute request
        const result = await this.execute(requestInput, config, {
          metadata: { workerId, requestIndex: i }
        });
        
        onResult(result, Date.now());
        
        // Apply think time between requests
        if (thinkTime > 0 && i < requestsToMake - 1) {
          await this.delay(thinkTime);
        }
        
      } catch (error) {
        const errorResult: TestExecutionResult = {
          success: false,
          error: error instanceof ToolError ? error : new ToolError(String(error)),
          duration: 0
        };
        
        onResult(errorResult, Date.now());
      }
    }
  }

  /**
   * Runs a duration-based load test.
   * 
   * @private
   */
  private async runDurationBasedLoadTest(
    inputData: ToolInput | (() => ToolInput),
    options: LoadTestOptions,
    startTime: number
  ): Promise<LoadTestResult> {
    if (!options.duration || options.duration <= 0) {
      throw new ToolError('Invalid duration for duration-based load test', 'INVALID_CONFIGURATION');
    }
    
    const { concurrency, duration, config, rampUpTime = 0, thinkTime = 0, requestFactory, stopOnFailure = false } = options;
    const results: TestExecutionResult[] = [];
    const timeline: LoadTestResult['timeline'] = [];
    const errors: Record<string, number> = {};
    let shouldStop = false;
    
    const endTime = startTime + duration;
    
    // Create worker promises for concurrent users
    const workers: Promise<void>[] = [];
    
    for (let workerId = 0; workerId < concurrency; workerId++) {
      const workerPromise = this.createDurationBasedLoadTestWorker({
        workerId,
        endTime,
        inputData,
        config,
        thinkTime,
        requestFactory,
        rampUpDelay: (rampUpTime / concurrency) * workerId,
        onResult: (result, timestamp) => {
          results.push(result);
          timeline.push({
            timestamp,
            responseTime: result.duration,
            success: result.success,
            error: result.error?.code
          });
          
          if (!result.success) {
            const errorKey = result.error?.code || 'UNKNOWN_ERROR';
            errors[errorKey] = (errors[errorKey] || 0) + 1;
            
            if (stopOnFailure) {
              shouldStop = true;
            }
          }
        },
        shouldStop: () => shouldStop
      });
      
      workers.push(workerPromise);
    }
    
    // Wait for all workers to complete or timeout
    await Promise.all(workers);
    
    const totalDuration = Date.now() - startTime;
    
    return this.calculateLoadTestResult({
      config: { ...options, requests: results.length },
      totalDuration,
      results,
      timeline,
      errors
    });
  }
  
  /**
   * Creates a duration-based load test worker.
   * 
   * @private
   */
  private async createDurationBasedLoadTestWorker(options: {
    workerId: number;
    endTime: number;
    inputData: ToolInput | (() => ToolInput);
    config?: ToolConfig;
    thinkTime: number;
    requestFactory?: () => ToolInput;
    rampUpDelay: number;
    onResult: (result: TestExecutionResult, timestamp: number) => void;
    shouldStop: () => boolean;
  }): Promise<void> {
    const { 
      workerId, 
      endTime, 
      inputData, 
      config, 
      thinkTime, 
      requestFactory, 
      rampUpDelay, 
      onResult, 
      shouldStop 
    } = options;
    
    // Apply ramp-up delay
    if (rampUpDelay > 0) {
      await this.delay(rampUpDelay);
    }
    
    let requestIndex = 0;
    while (Date.now() < endTime && !shouldStop()) {
      try {
        // Generate request data
        let requestInput: ToolInput;
        if (requestFactory) {
          requestInput = requestFactory();
        } else if (typeof inputData === 'function') {
          requestInput = inputData();
        } else {
          requestInput = inputData;
        }
        
        // Execute request
        const result = await this.execute(requestInput, config, {
          metadata: { workerId, requestIndex }
        });
        
        onResult(result, Date.now());
        requestIndex++;
        
        // Apply think time between requests
        if (thinkTime > 0) {
          await this.delay(thinkTime);
        }
        
      } catch (error) {
        const errorResult: TestExecutionResult = {
          success: false,
          error: error instanceof ToolError ? error : new ToolError(String(error)),
          duration: 0
        };
        
        onResult(errorResult, Date.now());
        requestIndex++;
      }
    }
  }

  /**
   * Calculates comprehensive load test results with analytics.
   * 
   * @private
   */
  private calculateLoadTestResult(data: {
    config: LoadTestOptions;
    totalDuration: number;
    results: TestExecutionResult[];
    timeline: LoadTestResult['timeline'];
    errors: Record<string, number>;
  }): LoadTestResult {
    const { config, totalDuration, results, timeline, errors } = data;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const responseTimes = results.map(r => r.duration).sort((a, b) => a - b);

    const metrics: PerformanceMetrics = {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: results.length > 0 ? (results.length / totalDuration) * 1000 : 0,
      errorBreakdown: errors,
      percentiles: this.calculatePercentiles(responseTimes)
    };

    return {
      config,
      totalDuration,
      metrics,
      timeline,
      resourceUsage: {
        // Would need actual memory/CPU monitoring in real implementation
        peakMemoryMB: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };
  }

  /**
   * Calculates response time percentiles.
   * 
   * @private
   */
  private calculatePercentiles(sortedTimes: number[]) {
    if (sortedTimes.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      return sortedTimes[Math.max(0, Math.min(index, sortedTimes.length - 1))];
    };

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  /**
   * Comprehensive tool validation including health, schema, and basic functionality tests.
   * This is a high-level validation that checks multiple aspects of tool operation.
   */
  async validateTool(
    basicTestInput?: ToolInput,
    config?: ToolConfig
  ): Promise<ToolValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const details: ToolValidationResult['details'] = {
      health: { passed: false },
      schema: { passed: false },
      basicExecution: { passed: false },
      endpoints: {
        health: false,
        schema: false,
        execute: false
      }
    };
    const performance = {
      healthCheckTime: 0,
      schemaRetrievalTime: 0,
      basicExecutionTime: 0
    };

    // Test 1: Health Check
    try {
      const healthStart = Date.now();
      const health = await this.healthCheck();
      performance.healthCheckTime = Date.now() - healthStart;
      
      details.health.passed = true;
      details.health.response = health;
      details.endpoints.health = true;
      
      // Validate health response
      if (health.status !== 'healthy') {
        issues.push(`Tool status is ${health.status}, expected 'healthy'`);
      }

      if (!health.tool_metadata?.name) {
        issues.push('Tool metadata missing name');
      }

      if (!health.tool_metadata?.version) {
        issues.push('Tool metadata missing version');
      }

      if (!Array.isArray(health.capabilities)) {
        issues.push('Tool capabilities should be an array');
      } else if (health.capabilities.length === 0) {
        recommendations.push('Consider defining specific capabilities for better tool discovery');
      }
      
      if (performance.healthCheckTime > 5000) {
        recommendations.push('Health check is slow (>5s), consider optimization');
      }
      
    } catch (error) {
      details.health.error = error instanceof Error ? error.message : String(error);
      issues.push(`Health check failed: ${details.health.error}`);
    }

    // Test 2: Schema Retrieval
    try {
      const schemaStart = Date.now();
      const schema = await this.getSchema();
      performance.schemaRetrievalTime = Date.now() - schemaStart;
      
      details.schema.passed = true;
      details.schema.response = schema;
      details.endpoints.schema = true;
      
      // Validate schema structure
      if (!schema.schema?.input) {
        issues.push('Tool schema missing input definition');
      }
      
      if (!schema.metadata) {
        issues.push('Schema missing metadata');
      }
      
    } catch (error) {
      details.schema.error = error instanceof Error ? error.message : String(error);
      issues.push(`Schema retrieval failed: ${details.schema.error}`);
      recommendations.push('Ensure /schema endpoint is properly implemented');
    }

    // Test 3: Basic Execution (if test input provided)
    if (basicTestInput) {
      try {
        const execStart = Date.now();
        const result = await this.execute(basicTestInput, config);
        performance.basicExecutionTime = Date.now() - execStart;
        
        details.basicExecution.passed = result.success;
        details.basicExecution.result = result;
        details.endpoints.execute = true;
        
        if (!result.success) {
          issues.push(`Basic execution failed: ${result.error?.message}`);
        }
        
        if (performance.basicExecutionTime > 30000) {
          recommendations.push('Basic execution is very slow (>30s), consider optimization');
        }
        
      } catch (error) {
        details.basicExecution.error = error instanceof Error ? error.message : String(error);
        issues.push(`Basic execution test failed: ${details.basicExecution.error}`);
      }
    }

    // Test 4: Metrics Endpoint (optional)
    try {
      await this.getMetrics();
      details.endpoints.metrics = true;
    } catch (error) {
      // Metrics endpoint is optional, so this is just informational
      recommendations.push('Consider implementing /metrics endpoint for better observability');
    }

    // Calculate overall score
    const maxScore = 100;
    let score = maxScore;
    
    // Deduct points for issues
    score -= issues.length * 15; // 15 points per issue
    
    // Bonus points for good performance
    if (performance.healthCheckTime < 1000) score += 5;
    if (performance.schemaRetrievalTime < 1000) score += 5;
    if (details.endpoints.metrics) score += 10;
    
    score = Math.max(0, Math.min(maxScore, score));

    // Add general recommendations
    if (score < 70) {
      recommendations.push('Tool has significant issues that should be addressed');
    } else if (score < 85) {
      recommendations.push('Tool is functional but has room for improvement');
    }

    return {
      healthy: issues.length === 0,
      issues,
      score,
      details,
      performance,
      recommendations
    };
  }

  /**
   * Get client analytics and performance data.
   * 
   * @returns Analytics data for all requests made by this client
   * 
   * @example
   * ```typescript
   * const analytics = client.getAnalytics();
   * console.log(`Success rate: ${analytics.successRate.toFixed(2)}%`);
   * console.log(`Average response time: ${analytics.averageResponseTime}ms`);
   * ```
   */
  getAnalytics(): {
    sessionDuration: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorBreakdown: Record<string, number>;
    responseTimePercentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } {
    if (!this.options.enableMetrics || this.metrics.requests.length === 0) {
      return {
        sessionDuration: Date.now() - this.metrics.startTime,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorBreakdown: {},
        responseTimePercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }
      };
    }

    const sessionDuration = Date.now() - this.metrics.startTime;
    const successful = this.metrics.requests.filter(r => r.success);
    const failed = this.metrics.requests.filter(r => !r.success);
    const responseTimes = this.metrics.requests.map(r => r.duration).sort((a, b) => a - b);
    
    const errorBreakdown: Record<string, number> = {};
    failed.forEach(request => {
      const errorCode = request.error?.code || 'UNKNOWN_ERROR';
      errorBreakdown[errorCode] = (errorBreakdown[errorCode] || 0) + 1;
    });

    return {
      sessionDuration,
      totalRequests: this.metrics.requests.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      successRate: (successful.length / this.metrics.requests.length) * 100,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: sessionDuration > 0 ? (this.metrics.requests.length / sessionDuration) * 1000 : 0,
      errorBreakdown,
      responseTimePercentiles: this.calculatePercentiles(responseTimes)
    };
  }

  /**
   * Reset client metrics and analytics data.
   * 
   * @example
   * ```typescript
   * client.resetAnalytics();
   * console.log('Analytics data cleared');
   * ```
   */
  resetAnalytics(): void {
    this.metrics = {
      requests: [],
      startTime: Date.now(),
      errors: []
    };
    
    this.emit('analytics_reset', { timestamp: Date.now() });
  }

  /**
   * Export analytics data in various formats.
   * 
   * @param format - Export format
   * @returns Formatted analytics data
   * 
   * @example
   * ```typescript
   * const csvData = client.exportAnalytics('csv');
   * const jsonData = client.exportAnalytics('json');
   * ```
   */
  exportAnalytics(format: 'json' | 'csv' | 'summary'): string {
    const analytics = this.getAnalytics();
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          analytics,
          requests: this.metrics.requests,
          errors: this.metrics.errors
        }, null, 2);
        
      case 'csv':
        const headers = 'timestamp,success,duration,httpStatus,error,requestSize,responseSize';
        const rows = this.metrics.requests.map(req => 
          `${new Date().toISOString()},${req.success},${req.duration},${req.httpStatus || ''},${req.error?.code || ''},${req.requestSize || ''},${req.responseSize || ''}`
        );
        return [headers, ...rows].join('\n');
        
      case 'summary':
        return `AI Spine Test Client Analytics Summary\n` +
               `=====================================\n` +
               `Session Duration: ${(analytics.sessionDuration / 1000).toFixed(2)}s\n` +
               `Total Requests: ${analytics.totalRequests}\n` +
               `Success Rate: ${analytics.successRate.toFixed(2)}%\n` +
               `Average Response Time: ${analytics.averageResponseTime.toFixed(2)}ms\n` +
               `Requests per Second: ${analytics.requestsPerSecond.toFixed(2)}\n` +
               `Response Time Percentiles:\n` +
               `  P50: ${analytics.responseTimePercentiles.p50}ms\n` +
               `  P90: ${analytics.responseTimePercentiles.p90}ms\n` +
               `  P95: ${analytics.responseTimePercentiles.p95}ms\n` +
               `  P99: ${analytics.responseTimePercentiles.p99}ms\n`;
               
      default:
        throw new ToolError(`Unsupported export format: ${format}`, 'INVALID_FORMAT');
    }
  }

  /**
   * Close the client and clean up resources.
   * 
   * @example
   * ```typescript
   * await client.close();
   * console.log('Client closed');
   * ```
   */
  async close(): Promise<void> {
    this.emit('client_closing');
    this.removeAllListeners();
    
    // If we had persistent connections, we would close them here
    // For now, axios handles connection pooling automatically
    
    this.emit('client_closed');
  }

  /**
   * Create a new client instance with the same configuration.
   * 
   * @returns New AISpineTestClient instance
   */
  clone(): AISpineTestClient {
    return new AISpineTestClient(this.options);
  }
}