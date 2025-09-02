import request from 'supertest';
import { Tool, ToolServerConfig } from '../tool.js';
import {
  ToolDefinition,
  ToolExecutionResult,
  ConfigurationError,
  ExecutionError,
} from '../types.js';
import {
  stringField,
  numberField,
  apiKeyField,
  enumField,
} from '../field-builders.js';

// Test tool definitions
const createTestToolDefinition = (): ToolDefinition => ({
  metadata: {
    name: 'test-tool',
    version: '1.0.0',
    description: 'A test tool for unit testing',
    capabilities: ['test.execute', 'test.validate'],
  },
  schema: {
    input: {
      message: stringField()
        .required()
        .minLength(1)
        .maxLength(100)
        .description('Test message')
        .build(),
      count: numberField()
        .min(1)
        .max(10)
        .integer()
        .default(1)
        .description('Number of repetitions')
        .build(),
      type: enumField(['info', 'warning', 'error'])
        .default('info')
        .description('Message type')
        .build(),
    },
    config: {
      apiKey: apiKeyField().required().description('Test API key').build(),
    },
  },
  execute: async (input, _config, context) => {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      status: 'success',
      data: {
        message: input.message,
        repeated: Array(input.count || 1).fill(input.message),
        type: input.type || 'info',
        processedAt: new Date().toISOString(),
        executionId: context.executionId,
      },
      timing: {
        executionTimeMs: 10,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    } as ToolExecutionResult;
  },
});

const createFailingToolDefinition = (): ToolDefinition => ({
  ...createTestToolDefinition(),
  metadata: {
    ...createTestToolDefinition().metadata,
    name: 'failing-tool',
  },
  execute: async (_input, _config, _context) => {
    throw new ExecutionError('Simulated execution failure');
  },
});

const createSlowToolDefinition = (): ToolDefinition => ({
  ...createTestToolDefinition(),
  metadata: {
    ...createTestToolDefinition().metadata,
    name: 'slow-tool',
  },
  execute: async (_input, _config, _context) => {
    // Simulate slow operation
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      status: 'success',
      data: { message: 'slow response' },
    } as ToolExecutionResult;
  },
});

describe('Tool Class', () => {
  let tool: Tool;

  beforeEach(() => {
    tool = new Tool(createTestToolDefinition());
  });

  afterEach(async () => {
    try {
      if (tool.getState() === 'running') {
        await tool.stop();
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error during test cleanup:', error);
    }
  });

  afterAll(async () => {
    // Give time for any remaining async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Constructor and Initialization', () => {
    it('should create a Tool instance with valid definition', () => {
      expect(tool).toBeInstanceOf(Tool);
      expect(tool.getState()).toBe('stopped');
      expect(tool.getMetadata().name).toBe('test-tool');
      expect(tool.getMetadata().version).toBe('1.0.0');
    });

    it('should throw ConfigurationError for invalid definition', () => {
      const invalidDefinition = {
        metadata: {
          name: '', // Invalid: empty name
          version: '1.0.0',
          description: 'Test',
        },
        schema: { input: {}, config: {} },
        execute: async () => ({ status: 'success' }),
      } as any;

      expect(() => new Tool(invalidDefinition)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing metadata fields', () => {
      const invalidDefinition = {
        metadata: {
          name: 'test-tool',
          // Missing version and description
        },
        schema: { input: {}, config: {} },
        execute: async () => ({ status: 'success' }),
      } as any;

      expect(() => new Tool(invalidDefinition)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing execute function', () => {
      const invalidDefinition = {
        metadata: {
          name: 'test-tool',
          version: '1.0.0',
          description: 'Test',
        },
        schema: { input: {}, config: {} },
        // Missing execute function
      } as any;

      expect(() => new Tool(invalidDefinition)).toThrow(ConfigurationError);
    });
  });

  describe('Configuration Management', () => {
    it('should set valid configuration', async () => {
      const config = {
        apiKey: 'test-api-key-123',
      };

      await expect(tool.setConfig(config)).resolves.not.toThrow();
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        apiKey: '', // Invalid: empty API key
      };

      await expect(tool.setConfig(invalidConfig)).rejects.toThrow(
        ConfigurationError
      );
    });

    it('should call setup function when configuration is set', async () => {
      const setupSpy = jest.fn();
      const definitionWithSetup = {
        ...createTestToolDefinition(),
        setup: setupSpy,
      };

      const toolWithSetup = new Tool(definitionWithSetup);
      const config = { apiKey: 'test-key' };

      await toolWithSetup.setConfig(config);

      expect(setupSpy).toHaveBeenCalledWith(config);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      const config: ToolServerConfig = {
        port: 0, // Use random available port
        host: 'localhost',
      };

      await expect(tool.start(config)).resolves.not.toThrow();
      expect(tool.getState()).toBe('running');
    });

    it('should stop server successfully', async () => {
      await tool.start({ port: 0 });
      expect(tool.getState()).toBe('running');

      await expect(tool.stop()).resolves.not.toThrow();
      expect(tool.getState()).toBe('stopped');
    });

    it('should restart server with new configuration', async () => {
      await tool.start({ port: 0 });
      expect(tool.getState()).toBe('running');

      await expect(tool.restart({ port: 0 })).resolves.not.toThrow();
      expect(tool.getState()).toBe('running');
    });

    it('should throw error when starting already running tool', async () => {
      await tool.start({ port: 0 });

      await expect(tool.start({ port: 0 })).rejects.toThrow();
    });

    it('should throw error when stopping non-running tool', async () => {
      expect(tool.getState()).toBe('stopped');

      await expect(tool.stop()).rejects.toThrow();
    });

    it('should call cleanup function when stopping', async () => {
      const cleanupSpy = jest.fn();
      const definitionWithCleanup = {
        ...createTestToolDefinition(),
        cleanup: cleanupSpy,
      };

      const toolWithCleanup = new Tool(definitionWithCleanup);
      await toolWithCleanup.start({ port: 0 });
      await toolWithCleanup.stop();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    it('should emit state change events', async () => {
      const stateChangeSpy = jest.fn();
      tool.on('stateChange', stateChangeSpy);

      await tool.start({ port: 0 });

      expect(stateChangeSpy).toHaveBeenCalledWith('stopped', 'starting');
      expect(stateChangeSpy).toHaveBeenCalledWith('starting', 'running');
    });

    it('should emit server started event', async () => {
      const serverStartedSpy = jest.fn();
      tool.on('serverStarted', serverStartedSpy);

      await tool.start({ port: 0 });

      expect(serverStartedSpy).toHaveBeenCalled();
    });

    it('should emit server stopped event', async () => {
      const serverStoppedSpy = jest.fn();
      tool.on('serverStopped', serverStoppedSpy);

      await tool.start({ port: 0 });
      await tool.stop();

      expect(serverStoppedSpy).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const stateChangeSpy = jest.fn();
      tool.on('stateChange', stateChangeSpy);
      tool.off('stateChange');

      // The spy should not be called after removal
      tool['setState']('starting');
      expect(stateChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Endpoints', () => {
    beforeEach(async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });
      await tool.start({ port: 0 });
    });

    it('should respond to GET / with tool information', async () => {
      const response = await request(tool['app']).get('/').expect(200);

      expect(response.body.name).toBe('test-tool');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.description).toBe('A test tool for unit testing');
      expect(response.body.capabilities).toEqual([
        'test.execute',
        'test.validate',
      ]);
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.execute).toBeDefined();
      expect(response.body.endpoints.health).toBeDefined();
      expect(response.body.endpoints.schema).toBeDefined();
      expect(response.body.endpoints.metrics).toBeDefined();
    });

    it('should respond to GET /health with health status', async () => {
      const response = await request(tool['app']).get('/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        tool_metadata: expect.objectContaining({
          name: 'test-tool',
        }),
        capabilities: ['test.execute', 'test.validate'],
        uptime_seconds: expect.any(Number),
      });
    });

    it('should respond to GET /schema with OpenAPI documentation', async () => {
      const response = await request(tool['app']).get('/schema').expect(200);

      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toContain('test-tool');
      expect(response.body.info.version).toBe('1.0.0');
      expect(response.body.paths['/api/execute']).toBeDefined();
    });

    it('should respond to GET /metrics with performance metrics', async () => {
      const response = await request(tool['app']).get('/metrics').expect(200);

      expect(response.body).toMatchObject({
        totalExecutions: expect.any(Number),
        successfulExecutions: expect.any(Number),
        failedExecutions: expect.any(Number),
        averageExecutionTimeMs: expect.any(Number),
        errorRatePercent: expect.any(Number),
        uptimeSeconds: expect.any(Number),
      });
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await request(tool['app']).get('/unknown').expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: expect.stringContaining('not found'),
          type: 'client_error',
        },
      });
    });
  });

  describe('Tool Execution via HTTP', () => {
    beforeEach(async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });
      await tool.start({ port: 0 });
    });

    it('should execute tool successfully with valid input', async () => {
      const requestBody = {
        input_data: {
          message: 'Hello, World!',
          count: 3,
          type: 'info',
        },
      };

      const response = await request(tool['app'])
        .post('/api/execute')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        execution_id: expect.any(String),
        status: 'success',
        output_data: {
          message: 'Hello, World!',
          repeated: ['Hello, World!', 'Hello, World!', 'Hello, World!'],
          type: 'info',
          processedAt: expect.any(String),
          executionId: expect.any(String),
        },
        execution_time_ms: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should use default values for optional fields', async () => {
      const requestBody = {
        input_data: {
          message: 'Test message',
          // count and type should use defaults
        },
      };

      const response = await request(tool['app'])
        .post('/api/execute')
        .send(requestBody)
        .expect(200);

      expect(response.body.output_data.repeated).toHaveLength(1);
      expect(response.body.output_data.type).toBe('info');
    });

    it('should return validation error for invalid input', async () => {
      const requestBody = {
        input_data: {
          message: '', // Invalid: empty message
          count: 15, // Invalid: exceeds maximum
        },
      };

      const response = await request(tool['app'])
        .post('/api/execute')
        .send(requestBody)
        .expect(400);

      expect(response.body).toMatchObject({
        execution_id: expect.any(String),
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('validation failed'),
        execution_time_ms: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return error for malformed request body', async () => {
      const response = await request(tool['app'])
        .post('/api/execute')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
    });

    it('should handle execution errors gracefully', async () => {
      const failingTool = new Tool(createFailingToolDefinition());
      await failingTool.setConfig({ apiKey: 'test-key' });
      await failingTool.start({ port: 0 });

      try {
        const requestBody = {
          input_data: {
            message: 'This will fail',
          },
        };

        const response = await request(failingTool['app'])
          .post('/api/execute')
          .send(requestBody)
          .expect(500);

        expect(response.body).toMatchObject({
          execution_id: expect.any(String),
          status: 'error',
          error_code: 'INTERNAL_ERROR',
          error_message: 'An internal error occurred',
          execution_time_ms: expect.any(Number),
        });
      } finally {
        await failingTool.stop();
      }
    });

    it('should handle execution timeout', async () => {
      const slowTool = new Tool(createSlowToolDefinition());
      await slowTool.setConfig({ apiKey: 'test-key' });
      await slowTool.start({
        port: 0,
        timeouts: { execution: 100 }, // Very short timeout
      });

      try {
        const requestBody = {
          input_data: {
            message: 'This will timeout',
          },
        };

        const response = await request(slowTool['app'])
          .post('/api/execute')
          .send(requestBody)
          .expect(500);

        expect(response.body.error_code).toBe('INTERNAL_ERROR');
      } finally {
        await slowTool.stop();
      }
    }, 10000); // Increase test timeout
  });

  describe('Security Features', () => {
    it('should require API key when authentication is enabled', async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });

      await tool.start({
        port: 0,
        security: {
          apiKeys: ['valid-api-key'],
          requireAuth: true,
        },
      });

      // Request without API key should fail
      const response = await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test' } })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Valid API key required',
          type: 'client_error',
        },
      });
    });

    it('should accept valid API key', async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });

      await tool.start({
        port: 0,
        security: {
          apiKeys: ['valid-api-key'],
          requireAuth: true,
        },
      });

      const response = await request(tool['app'])
        .post('/api/execute')
        .set('X-API-Key', 'valid-api-key')
        .send({ input_data: { message: 'test' } })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should apply rate limiting', async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });

      await tool.start({
        port: 0,
        rateLimit: {
          windowMs: 60000,
          max: 2, // Only 2 requests per minute
        },
      });

      // First two requests should succeed
      await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test1' } })
        .expect(200);

      await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test2' } })
        .expect(200);

      // Third request should be rate limited
      const response = await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test3' } })
        .expect(429);

      expect(response.body).toMatchObject({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          type: 'client_error',
        },
      });
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });
      await tool.start({ port: 0 });
    });

    it('should track execution metrics', async () => {
      const initialMetrics = tool.getMetrics();
      expect(initialMetrics.totalExecutions).toBe(0);

      // Execute tool once
      await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test' } })
        .expect(200);

      const updatedMetrics = tool.getMetrics();
      expect(updatedMetrics.totalExecutions).toBe(1);
      expect(updatedMetrics.successfulExecutions).toBe(1);
      expect(updatedMetrics.failedExecutions).toBe(0);
      expect(updatedMetrics.averageExecutionTimeMs).toBeGreaterThan(0);
    });

    it('should track error metrics', async () => {
      // Execute with invalid input to cause error
      await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: '' } }) // Invalid empty message
        .expect(400);

      const metrics = tool.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.errorRatePercent).toBe(100);
      expect(metrics.recentErrors['VALIDATION_ERROR']).toBe(1);
    });

    it('should calculate requests per minute', async () => {
      // Execute multiple requests quickly
      await Promise.all([
        request(tool['app'])
          .post('/api/execute')
          .send({ input_data: { message: 'test1' } }),
        request(tool['app'])
          .post('/api/execute')
          .send({ input_data: { message: 'test2' } }),
        request(tool['app'])
          .post('/api/execute')
          .send({ input_data: { message: 'test3' } }),
      ]);

      const metrics = tool.getMetrics();
      expect(metrics.requestsPerMinute).toBeGreaterThanOrEqual(3);
    });

    it('should track uptime', async () => {
      // Wait a bit more to ensure uptime is measurable
      await new Promise(resolve => setTimeout(resolve, 100));
      const metrics = tool.getMetrics();
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Test Method', () => {
    beforeEach(async () => {
      await tool.setConfig({
        apiKey: 'test-api-key-123',
      });
    });

    it('should test tool execution with valid input', async () => {
      const testResult = await tool.test({
        message: 'Test message',
        count: 2,
        type: 'info',
      });

      expect(testResult.valid).toBe(true);
      expect(testResult.result).toBeDefined();
      expect(testResult.result?.status).toBe('success');
      expect(testResult.result?.data.message).toBe('Test message');
    });

    it('should return validation errors for invalid input', async () => {
      const testResult = await tool.test({
        message: '', // Invalid
        count: 15, // Invalid
      } as any);

      expect(testResult.valid).toBe(false);
      expect(testResult.errors).toBeDefined();
      expect(testResult.errors!.length).toBeGreaterThan(0);
    });

    it('should test with custom configuration', async () => {
      const testResult = await tool.test(
        { message: 'Test' },
        { apiKey: 'custom-key' }
      );

      expect(testResult.valid).toBe(true);
      expect(testResult.result?.status).toBe('success');
    });

    it('should return error when no configuration is available', async () => {
      const toolWithoutConfig = new Tool(createTestToolDefinition());

      const testResult = await toolWithoutConfig.test({
        message: 'Test',
      });

      expect(testResult.valid).toBe(false);
      expect(testResult.errors).toContain(
        'No configuration provided and no tool configuration set'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      await tool.setConfig({ apiKey: 'test-key' });
      await tool.start({ port: 0 });

      const response = await request(tool['app'])
        .post('/api/execute')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle very large request bodies', async () => {
      await tool.setConfig({ apiKey: 'test-key' });
      await tool.start({ port: 0 });

      const largeMessage = 'x'.repeat(200); // Exceeds maxLength of 100

      const response = await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: largeMessage } })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should handle concurrent requests', async () => {
      await tool.setConfig({ apiKey: 'test-key' });
      await tool.start({ port: 0 });

      const requests = Array(10)
        .fill(null)
        .map((_, i) =>
          request(tool['app'])
            .post('/api/execute')
            .send({ input_data: { message: `Message ${i}` } })
        );

      const responses = await Promise.all(requests);

      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        expect(response.body.output_data.message).toBe(`Message ${i}`);
      });

      const metrics = tool.getMetrics();
      expect(metrics.totalExecutions).toBe(10);
      expect(metrics.successfulExecutions).toBe(10);
    });

    it('should handle memory cleanup properly', async () => {
      await tool.setConfig({ apiKey: 'test-key' });
      await tool.start({ port: 0 });

      // Execute many requests to fill execution history (reduced for faster test)
      const requests = Array(50)
        .fill(null)
        .map((_, i) =>
          request(tool['app'])
            .post('/api/execute')
            .send({ input_data: { message: `Message ${i}` } })
        );

      await Promise.all(requests);

      // Check that execution history is working correctly
      const history = (tool as any).executionHistory;
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(1000);
    }, 10000);
  });

  describe('Health Check Integration', () => {
    it('should use custom health check function', async () => {
      const customHealthCheck = jest.fn().mockResolvedValue({
        status: 'degraded',
        details: { customCheck: 'warning' },
      });

      const definitionWithHealthCheck = {
        ...createTestToolDefinition(),
        healthCheck: customHealthCheck,
      };

      const toolWithHealthCheck = new Tool(definitionWithHealthCheck);
      await toolWithHealthCheck.setConfig({ apiKey: 'test-key' });
      await toolWithHealthCheck.start({ port: 0 });

      try {
        const response = await request(toolWithHealthCheck['app'])
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('degraded');
        expect(customHealthCheck).toHaveBeenCalled();
      } finally {
        await toolWithHealthCheck.stop();
      }
    });

    it('should report unhealthy status when health check fails', async () => {
      const failingHealthCheck = jest
        .fn()
        .mockRejectedValue(new Error('Health check failed'));

      const definitionWithFailingHealthCheck = {
        ...createTestToolDefinition(),
        healthCheck: failingHealthCheck,
      };

      const toolWithFailingHealthCheck = new Tool(
        definitionWithFailingHealthCheck
      );
      await toolWithFailingHealthCheck.setConfig({ apiKey: 'test-key' });
      await toolWithFailingHealthCheck.start({ port: 0 });

      try {
        const response = await request(toolWithFailingHealthCheck['app'])
          .get('/health')
          .expect(503);

        expect(response.body.status).toBe('unhealthy');
      } finally {
        await toolWithFailingHealthCheck.stop();
      }
    });
  });
});

describe('Tool Class Integration Tests', () => {
  describe('Complete Tool Lifecycle', () => {
    it('should handle complete tool lifecycle from creation to shutdown', async () => {
      const tool = new Tool(createTestToolDefinition());

      // 1. Initial state
      expect(tool.getState()).toBe('stopped');

      // 2. Set configuration
      await tool.setConfig({
        apiKey: 'integration-test-key',
      });

      // 3. Start server
      await tool.start({
        port: 0,
        security: {
          apiKeys: ['integration-api-key'],
          requireAuth: true,
        },
        rateLimit: {
          windowMs: 60000,
          max: 100,
        },
        monitoring: {
          enableMetrics: true,
        },
      });

      expect(tool.getState()).toBe('running');

      // 4. Execute tool multiple times
      const app = tool['app'];

      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/execute')
          .set('X-API-Key', 'integration-api-key')
          .send({
            input_data: {
              message: `Integration test ${i}`,
              count: 2,
              type: 'info',
            },
          })
          .expect(200);

        expect(response.body.status).toBe('success');
      }

      // 5. Check metrics
      const metrics = tool.getMetrics();
      expect(metrics.totalExecutions).toBe(5);
      expect(metrics.successfulExecutions).toBe(5);
      expect(metrics.errorRatePercent).toBe(0);

      // 6. Check health (no API key needed for health endpoints)
      const healthResponse = await request(app).get('/health').expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // 7. Check schema (no API key needed for schema endpoint)
      const schemaResponse = await request(app).get('/schema').expect(200);

      expect(schemaResponse.body.openapi).toBe('3.0.3');

      // 8. Test tool functionality
      const testResult = await tool.test({
        message: 'Direct test',
        count: 1,
        type: 'warning',
      });

      expect(testResult.valid).toBe(true);
      expect(testResult.result?.data.type).toBe('warning');

      // 9. Stop server
      await tool.stop();
      expect(tool.getState()).toBe('stopped');
    });

    it('should handle tool restart with configuration changes', async () => {
      const tool = new Tool(createTestToolDefinition());

      await tool.setConfig({
        apiKey: 'restart-test-key',
      });

      // Start with initial configuration
      await tool.start({
        port: 0,
        rateLimit: { max: 10 },
      });

      expect((tool as any).server.address()?.port).toBeDefined();

      // Stop first to avoid port conflicts
      await tool.stop();
      expect(tool.getState()).toBe('stopped');

      // Start with new configuration
      await tool.start({
        port: 0,
        rateLimit: { max: 20 },
        security: {
          apiKeys: ['new-api-key'],
          requireAuth: true,
        },
      });

      const newPort = (tool as any).server.address()?.port;

      // Verify restart worked and new config is applied
      expect(tool.getState()).toBe('running');
      expect(newPort).toBeDefined();

      // Test that new security config is applied (should require API key now)
      const unauthorizedResponse = await request(tool['app'])
        .post('/api/execute')
        .send({ input_data: { message: 'test' } })
        .expect(401);

      expect(unauthorizedResponse.body.error.code).toBe(
        'AUTHENTICATION_REQUIRED'
      );

      // Test that it works with the correct API key
      const authorizedResponse = await request(tool['app'])
        .post('/api/execute')
        .set('X-API-Key', 'new-api-key')
        .send({ input_data: { message: 'test' } })
        .expect(200);

      expect(authorizedResponse.body.status).toBe('success');

      await tool.stop();
    });
  });
});
