import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { EventEmitter } from 'events';
import {
  AISpineTestClient,
  TestClientOptions,
  TestExecutionResult,
  TestScenario,
  LoadTestOptions,
  ToolValidationResult
} from './test-client';
import { ToolError } from '@ai-spine/tools-core';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('AISpineTestClient', () => {
  let client: AISpineTestClient;
  let mockAxiosInstance: {
    get: Mock;
    post: Mock;
    create: Mock;
    interceptors: {
      request: { use: Mock };
      response: { use: Mock };
    };
  };

  const defaultOptions: TestClientOptions = {
    baseURL: 'http://localhost:3000',
    timeout: 5000,
    enableMetrics: true,
    enableDetailedLogs: false
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      create: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    
    client = new AISpineTestClient(defaultOptions);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const testClient = new AISpineTestClient({ baseURL: 'http://test.com' });
      expect(testClient).toBeInstanceOf(AISpineTestClient);
      expect(testClient).toBeInstanceOf(EventEmitter);
    });

    it('should merge custom options with defaults', () => {
      const customOptions: TestClientOptions = {
        baseURL: 'https://api.example.com',
        timeout: 15000,
        apiKey: 'test-key',
        retries: 5,
        enableMetrics: false
      };

      const testClient = new AISpineTestClient(customOptions);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.example.com',
          timeout: 15000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health response on successful call', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        version: '1.0.0',
        tool_metadata: { name: 'test-tool', version: '1.0.0' },
        capabilities: ['test'],
        uptime_seconds: 300
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockHealthResponse
      });

      const result = await client.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockHealthResponse);
    });

    it('should throw ToolError on health check failure', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.healthCheck()).rejects.toThrow(ToolError);
      await expect(client.healthCheck()).rejects.toThrow('Health check failed');
    });

    it('should validate health response when validation is enabled', async () => {
      const invalidHealthResponse = {
        status: 'healthy'
        // Missing required fields
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: invalidHealthResponse
      });

      const validatingClient = new AISpineTestClient({
        ...defaultOptions,
        validateResponses: true
      });

      await expect(validatingClient.healthCheck()).rejects.toThrow(ToolError);
    });
  });

  describe('getSchema', () => {
    it('should return schema response on successful call', async () => {
      const mockSchemaResponse = {
        metadata: { name: 'test-tool' },
        schema: {
          input: { city: { type: 'string', required: true } },
          config: {}
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockSchemaResponse
      });

      const result = await client.getSchema();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/schema');
      expect(result).toEqual(mockSchemaResponse);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics response on successful call', async () => {
      const mockMetricsResponse = {
        requests_count: 100,
        avg_response_time_ms: 250,
        error_rate_percent: 2.5
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockMetricsResponse
      });

      const result = await client.getMetrics();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics');
      expect(result).toEqual(mockMetricsResponse);
    });
  });

  describe('execute', () => {
    it('should execute tool with input data successfully', async () => {
      const inputData = { city: 'Madrid' };
      const mockResponse = {
        execution_id: 'exec_123',
        status: 'success',
        output_data: { temperature: 22 },
        execution_time_ms: 500,
        timestamp: '2024-01-15T10:30:00.000Z'
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockResponse,
        headers: { 'content-type': 'application/json' }
      });

      const result = await client.execute(inputData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({
          tool_id: 'test-tool',
          input_data: inputData
        }),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
      expect(result.response).toEqual(mockResponse);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.httpStatus).toBe(200);
    });

    it('should handle execution errors gracefully', async () => {
      const inputData = { city: 'Madrid' };
      const error = new Error('Network timeout');

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      const result = await client.execute(inputData);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ToolError);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should retry on retryable errors', async () => {
      const inputData = { city: 'Madrid' };
      const networkError = {
        message: 'Network error',
        request: {} // This makes it a network error
      };

      // First call fails, second succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'success' },
          headers: {}
        });

      const result = await client.execute(inputData, undefined, { retryCount: 1 });

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.retries?.count).toBe(1);
    });

    it('should include custom options in request', async () => {
      const inputData = { city: 'Madrid' };
      const config = { apiKey: 'test-key' };
      const options = {
        executionId: 'custom-exec-id',
        timeout: 3000,
        metadata: { source: 'test' }
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      await client.execute(inputData, config, options);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/execute',
        expect.objectContaining({
          tool_id: 'test-tool',
          input_data: inputData,
          config,
          execution_id: 'custom-exec-id',
          metadata: { source: 'test' }
        }),
        expect.objectContaining({
          timeout: 3000
        })
      );
    });
  });

  describe('testToolScenarios', () => {
    it('should run multiple test scenarios sequentially', async () => {
      const scenarios: TestScenario[] = [
        {
          name: 'Valid input',
          input: { city: 'Madrid' },
          expectSuccess: true
        },
        {
          name: 'Invalid input',
          input: { city: '' },
          expectSuccess: false,
          expectedError: 'VALIDATION_ERROR'
        }
      ];

      // Mock successful response for first scenario
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { status: 'success', output_data: {} },
        headers: {}
      });

      // Mock error response for second scenario
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error_code: 'VALIDATION_ERROR', error_message: 'Invalid input' }
        }
      });

      const result = await client.testToolScenarios(scenarios);

      expect(result.summary.total).toBe(2);
      expect(result.summary.passed).toBe(2); // Both should pass their expectations
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].passed).toBe(true);
      expect(result.results[1].passed).toBe(true); // Expects failure and gets it
    });

    it('should run scenarios in parallel when specified', async () => {
      const scenarios: TestScenario[] = [
        { name: 'Test 1', input: { city: 'Madrid' }, expectSuccess: true },
        { name: 'Test 2', input: { city: 'Barcelona' }, expectSuccess: true }
      ];

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      const result = await client.testToolScenarios(scenarios, {
        parallel: true,
        maxConcurrency: 2
      });

      expect(result.summary.total).toBe(2);
      expect(result.summary.passed).toBe(2);
    });
  });

  describe('validateTool', () => {
    it('should perform comprehensive tool validation', async () => {
      // Mock health check
      mockAxiosInstance.get.mockImplementation((url) => {
        switch (url) {
          case '/health':
            return Promise.resolve({
              data: {
                status: 'healthy',
                version: '1.0.0',
                tool_metadata: { name: 'test-tool', version: '1.0.0' },
                capabilities: ['test'],
                uptime_seconds: 300
              }
            });
          case '/schema':
            return Promise.resolve({
              data: {
                metadata: { name: 'test-tool' },
                schema: { input: {}, config: {} }
              }
            });
          case '/metrics':
            return Promise.resolve({
              data: { requests: 100 }
            });
          default:
            return Promise.reject(new Error('Not found'));
        }
      });

      // Mock basic execution test
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      const result = await client.validateTool({ city: 'Madrid' });

      expect(result.healthy).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.details.health.passed).toBe(true);
      expect(result.details.schema.passed).toBe(true);
      expect(result.details.basicExecution.passed).toBe(true);
      expect(result.details.endpoints.health).toBe(true);
      expect(result.details.endpoints.schema).toBe(true);
      expect(result.details.endpoints.execute).toBe(true);
      expect(result.details.endpoints.metrics).toBe(true);
    });

    it('should identify issues and provide recommendations', async () => {
      // Mock unhealthy response
      mockAxiosInstance.get.mockRejectedValue(new Error('Health check failed'));

      const result = await client.validateTool();

      expect(result.healthy).toBe(false);
      expect(result.issues).toContain('Health check failed: Health check failed');
      expect(result.score).toBeLessThan(70);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('loadTest', () => {
    it('should perform basic load test', async () => {
      const inputData = { city: 'Madrid' };
      const options: LoadTestOptions = {
        concurrency: 2,
        requests: 4
      };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      const result = await client.loadTest(inputData, options);

      expect(result.config).toEqual(options);
      expect(result.metrics.totalRequests).toBe(4);
      expect(result.metrics.successfulRequests).toBe(4);
      expect(result.metrics.failedRequests).toBe(0);
      expect(result.timeline).toHaveLength(4);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('should handle mixed success/failure scenarios in load test', async () => {
      const inputData = { city: 'Madrid' };
      const options: LoadTestOptions = {
        concurrency: 1,
        requests: 2
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({
          status: 200,
          data: { status: 'success' },
          headers: {}
        })
        .mockRejectedValueOnce(new Error('Server error'));

      const result = await client.loadTest(inputData, options);

      expect(result.metrics.totalRequests).toBe(2);
      expect(result.metrics.successfulRequests).toBe(1);
      expect(result.metrics.failedRequests).toBe(1);
      expect(result.metrics.errorBreakdown['EXECUTION_ERROR']).toBe(1);
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      // Execute some requests to generate analytics data
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      await client.execute({ city: 'Madrid' });
      await client.execute({ city: 'Barcelona' });
    });

    it('should provide analytics data', () => {
      const analytics = client.getAnalytics();

      expect(analytics.totalRequests).toBe(2);
      expect(analytics.successfulRequests).toBe(2);
      expect(analytics.failedRequests).toBe(0);
      expect(analytics.successRate).toBe(100);
      expect(analytics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should export analytics in different formats', () => {
      const jsonExport = client.exportAnalytics('json');
      const csvExport = client.exportAnalytics('csv');
      const summaryExport = client.exportAnalytics('summary');

      expect(JSON.parse(jsonExport)).toHaveProperty('analytics');
      expect(csvExport).toContain('timestamp,success,duration');
      expect(summaryExport).toContain('AI Spine Test Client Analytics Summary');
    });

    it('should reset analytics data', () => {
      client.resetAnalytics();
      const analytics = client.getAnalytics();

      expect(analytics.totalRequests).toBe(0);
      expect(analytics.successfulRequests).toBe(0);
      expect(analytics.failedRequests).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit events during operations', async () => {
      const eventClient = new AISpineTestClient({
        ...defaultOptions,
        enableDetailedLogs: true
      });

      const requestSpy = vi.fn();
      const responseSpy = vi.fn();
      const executionSpy = vi.fn();

      eventClient.on('request', requestSpy);
      eventClient.on('response', responseSpy);
      eventClient.on('execution', executionSpy);

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: { status: 'success' },
        headers: {}
      });

      await eventClient.execute({ city: 'Madrid' });

      expect(executionSpy).toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    it('should create a new client with same configuration', () => {
      const clonedClient = client.clone();

      expect(clonedClient).toBeInstanceOf(AISpineTestClient);
      expect(clonedClient).not.toBe(client);
    });
  });

  describe('close', () => {
    it('should emit closing and closed events', async () => {
      const closingSpy = vi.fn();
      const closedSpy = vi.fn();

      client.on('client_closing', closingSpy);
      client.on('client_closed', closedSpy);

      await client.close();

      expect(closingSpy).toHaveBeenCalled();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should create appropriate ToolError from axios errors', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            error_code: 'INTERNAL_ERROR',
            error_message: 'Something went wrong'
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(serverError);

      const result = await client.execute({ city: 'Madrid' });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ToolError);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Something went wrong');
      expect(result.httpStatus).toBe(500);
    });

    it('should categorize different error types correctly', async () => {
      const networkError = {
        request: {},
        message: 'Network Error'
      };

      const requestError = {
        message: 'Request setup error'
      };

      // Test network error
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);
      let result = await client.execute({ city: 'Madrid' });
      expect(result.error?.code).toBe('NETWORK_ERROR');

      // Test request error  
      mockAxiosInstance.post.mockRejectedValueOnce(requestError);
      result = await client.execute({ city: 'Madrid' });
      expect(result.error?.code).toBe('REQUEST_ERROR');
    });
  });
});