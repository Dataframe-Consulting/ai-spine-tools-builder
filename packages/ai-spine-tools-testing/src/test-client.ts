import axios, { AxiosInstance } from 'axios';
import {
  ToolInput,
  ToolConfig,
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse,
  ToolError,
} from '@ai-spine/tools-core';

export interface TestClientOptions {
  baseURL: string;
  timeout?: number;
  apiKey?: string;
  retries?: number;
}

export interface TestExecutionResult {
  success: boolean;
  response?: AISpineExecuteResponse;
  error?: ToolError;
  duration: number;
}

export class AISpineTestClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(options: TestClientOptions) {
    this.retries = options.retries || 3;
    
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          throw new ToolError(
            error.response.data?.error_message || error.response.statusText,
            error.response.data?.error_code || 'HTTP_ERROR',
            {
              status: error.response.status,
              data: error.response.data,
            }
          );
        } else if (error.request) {
          throw new ToolError(
            'Network error: No response received',
            'NETWORK_ERROR',
            { originalError: error.message }
          );
        } else {
          throw new ToolError(
            `Request setup error: ${error.message}`,
            'REQUEST_ERROR',
            { originalError: error.message }
          );
        }
      }
    );
  }

  /**
   * Check if the tool is healthy and accessible
   */
  async healthCheck(): Promise<AISpineHealthResponse> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Execute a tool with input data
   */
  async execute(
    inputData: ToolInput,
    config?: ToolConfig,
    executionId?: string,
    metadata?: Record<string, any>
  ): Promise<TestExecutionResult> {
    const startTime = Date.now();

    try {
      const request: AISpineExecuteRequest = {
        tool_id: 'test-tool',
        input_data: inputData,
        config,
        execution_id: executionId,
        metadata,
      };

      const response = await this.client.post('/execute', request);
      const duration = Date.now() - startTime;

      return {
        success: true,
        response: response.data,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof ToolError ? error : new ToolError(String(error)),
        duration,
      };
    }
  }

  /**
   * Execute a tool and wait for completion (for async tools)
   */
  async executeAndWait(
    inputData: ToolInput,
    config?: ToolConfig,
    options: {
      timeout?: number;
      pollInterval?: number;
      executionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<TestExecutionResult> {
    const { timeout = 30000, pollInterval = 1000 } = options;
    
    // Execute the tool
    const executeResult = await this.execute(
      inputData,
      config,
      options.executionId,
      options.metadata
    );

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

    while (Date.now() - startTime < timeout) {
      await this.wait(pollInterval);

      try {
        const statusResponse = await this.client.get(`/executions/${executionId}`);
        const status = statusResponse.data;

        if (status.status === 'success' || status.status === 'error') {
          return {
            success: status.status === 'success',
            response: status,
            duration: Date.now() - startTime + executeResult.duration,
            error: status.status === 'error' ? new ToolError(status.error_message, status.error_code) : undefined,
          };
        }
      } catch (error) {
        // Continue polling if status endpoint doesn't exist
        continue;
      }
    }

    return {
      success: false,
      error: new ToolError('Execution timeout', 'TIMEOUT_ERROR'),
      duration: Date.now() - startTime + executeResult.duration,
    };
  }

  /**
   * Test tool with various input scenarios
   */
  async testToolScenarios(scenarios: Array<{
    name: string;
    input: ToolInput;
    config?: ToolConfig;
    expectSuccess: boolean;
    expectedError?: string;
    timeout?: number;
  }>): Promise<Array<{
    scenario: string;
    passed: boolean;
    result: TestExecutionResult;
    error?: string;
  }>> {
    const results = [];

    for (const scenario of scenarios) {
      try {
        const result = await this.execute(scenario.input, scenario.config);
        
        const passed = scenario.expectSuccess 
          ? result.success 
          : !result.success && (!scenario.expectedError || result.error?.message.includes(scenario.expectedError));

        results.push({
          scenario: scenario.name,
          passed,
          result,
          error: passed ? undefined : `Expected ${scenario.expectSuccess ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`,
        });
      } catch (error) {
        results.push({
          scenario: scenario.name,
          passed: false,
          result: {
            success: false,
            error: error instanceof ToolError ? error : new ToolError(String(error)),
            duration: 0,
          },
          error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  /**
   * Load test a tool with concurrent requests
   */
  async loadTest(
    inputData: ToolInput,
    options: {
      concurrency: number;
      requests: number;
      config?: ToolConfig;
      rampUpTime?: number;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errors: Array<{ error: string; count: number }>;
  }> {
    const { concurrency, requests, config, rampUpTime = 0 } = options;
    const results: TestExecutionResult[] = [];
    const errors: Record<string, number> = {};

    const startTime = Date.now();

    // Create batches of concurrent requests
    const batchSize = Math.ceil(requests / concurrency);
    const batches = [];

    for (let i = 0; i < requests; i += batchSize) {
      const batch = [];
      const batchEnd = Math.min(i + batchSize, requests);
      
      for (let j = i; j < batchEnd; j++) {
        batch.push(this.execute(inputData, config));
      }
      
      batches.push(batch);
    }

    // Execute batches with ramp-up
    for (let i = 0; i < batches.length; i++) {
      if (rampUpTime > 0 && i > 0) {
        await this.wait(rampUpTime / batches.length);
      }

      const batchResults = await Promise.all(batches[i]);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    failed.forEach(result => {
      const errorKey = result.error?.code || 'UNKNOWN_ERROR';
      errors[errorKey] = (errors[errorKey] || 0) + 1;
    });

    const responseTimes = results.map(r => r.duration);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const requestsPerSecond = (results.length / totalTime) * 1000;

    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errors: Object.entries(errors).map(([error, count]) => ({ error, count })),
    };
  }

  /**
   * Validate tool health and basic functionality
   */
  async validateTool(): Promise<{
    healthy: boolean;
    issues: string[];
    metadata?: AISpineHealthResponse;
  }> {
    const issues: string[] = [];

    try {
      // Test health endpoint
      const health = await this.healthCheck();
      
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
      }

      return {
        healthy: issues.length === 0,
        issues,
        metadata: health,
      };
    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        healthy: false,
        issues,
      };
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}