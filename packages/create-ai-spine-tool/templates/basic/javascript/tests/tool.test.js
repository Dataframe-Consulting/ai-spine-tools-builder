{{#includeTests}}
const request = require('supertest');
const {{toolNameCamelCase}}Tool = require('../src/index');

describe('{{toolNamePascalCase}} Tool', () => {
  let app;

  beforeAll(async () => {
    app = {{toolNameCamelCase}}Tool.getApp();
  });

  afterAll(async () => {
    await {{toolNameCamelCase}}Tool.stop();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        tool_metadata: {
          name: '{{toolName}}',
          description: expect.any(String),
          capabilities: expect.any(Array),
        },
        uptime_seconds: expect.any(Number),
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute successfully with valid input', async () => {
      const input = {
        input_data: {
          message: 'Hello, World!',
          count: 2,
          uppercase: true,
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(200);

      expect(response.body).toMatchObject({
        execution_id: expect.any(String),
        status: 'success',
        output_data: {
          processed_message: 'HELLO, WORLD! HELLO, WORLD!',
          original_message: 'Hello, World!',
          transformations: {
            uppercase: true,
            count: 2,
          },
        },
        execution_time_ms: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should handle missing required fields', async () => {
      const input = {
        input_data: {
          // Missing required 'message' field
          count: 1,
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('Required field'),
      });
    });

    it('should handle invalid input types', async () => {
      const input = {
        input_data: {
          message: 'Hello',
          count: 'invalid', // Should be a number
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('must be of type number'),
      });
    });

    it('should respect field constraints', async () => {
      const input = {
        input_data: {
          message: 'Hello',
          count: 15, // Exceeds max value of 10
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('must be at most 10'),
      });
    });

    it('should use default values when fields are omitted', async () => {
      const input = {
        input_data: {
          message: 'Hello',
          // count and uppercase will use defaults
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(200);

      expect(response.body.output_data).toMatchObject({
        processed_message: 'Hello',
        transformations: {
          uppercase: false, // default value
          count: 1, // default value
        },
      });
    });

    it('should handle empty message gracefully', async () => {
      const input = {
        input_data: {
          message: '',
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('must be at least 1 characters'),
      });
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(1001); // Exceeds maxLength of 1000
      const input = {
        input_data: {
          message: longMessage,
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('must be at most 1000 characters'),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/execute')
        .send('invalid json')
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: expect.any(String),
        error_message: expect.any(String),
      });
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/execute')
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error_code: 'VALIDATION_ERROR',
        error_message: expect.stringContaining('Request body must be a valid JSON object'),
      });
    });
  });

  describe('Statistics and Metadata', () => {
    it('should track execution statistics', () => {
      const stats = {{toolNameCamelCase}}Tool.getStats();
      
      expect(stats).toMatchObject({
        executionCount: expect.any(Number),
        errorCount: expect.any(Number),
        avgExecutionTime: expect.any(Number),
        errorRate: expect.any(Number),
        uptime: expect.any(Number),
      });
    });

    it('should include metadata in responses', async () => {
      const input = {
        input_data: {
          message: 'Test',
        },
        metadata: {
          user_id: 'test-user',
          custom_field: 'custom_value',
        },
      };

      const response = await request(app)
        .post('/execute')
        .send(input)
        .expect(200);

      expect(response.body.output_data.metadata).toMatchObject({
        execution_id: expect.any(String),
        timestamp: expect.any(String),
        tool_version: '1.0.0',
      });
    });
  });
});
{{/includeTests}}