/**
 * Test suite for core type definitions and field builders.
 * This ensures that all types are properly defined and the field builder API works as expected.
 */

import {
  ToolMetadata,
  ToolSchema,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  stringField,
  numberField,
  booleanField,
  enumField,
  arrayField,
  objectField,
  apiKeyField,
  configStringField,
  emailField,
  urlField,
  uuidField,
} from '../index.js';

describe('Core Types', () => {
  describe('ToolMetadata', () => {
    it('should allow creating basic metadata', () => {
      const metadata: ToolMetadata = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'A test tool',
        capabilities: ['test.execute'],
      };

      expect(metadata.name).toBe('test-tool');
      expect(metadata.capabilities).toContain('test.execute');
    });

    it('should allow creating metadata with all optional fields', () => {
      const metadata: ToolMetadata = {
        name: 'advanced-tool',
        version: '2.1.0',
        description: 'An advanced test tool',
        capabilities: ['advanced.execute', 'advanced.analyze'],
        author: 'Test Author',
        license: 'MIT',
        homepage: 'https://example.com',
        repository: 'https://github.com/example/tool.git',
        tags: ['ai', 'automation'],
        minSdkVersion: '1.0.0',
        requirements: {
          apiKeys: ['TEST_API_KEY'],
          permissions: ['network-access'],
          runtimeDependencies: ['node:18+'],
        },
        deprecation: {
          deprecated: false,
        },
      };

      expect(metadata.tags).toContain('ai');
      expect(metadata.requirements?.apiKeys).toContain('TEST_API_KEY');
    });
  });

  describe('ToolExecutionContext', () => {
    it('should allow creating execution context with required fields', () => {
      const context: ToolExecutionContext = {
        executionId: 'exec_123',
        toolId: 'test-tool',
        toolVersion: '1.0.0',
        timestamp: new Date(),
      };

      expect(context.executionId).toBe('exec_123');
      expect(context.toolId).toBe('test-tool');
    });

    it('should allow creating context with all optional fields', () => {
      const context: ToolExecutionContext = {
        executionId: 'exec_456',
        toolId: 'advanced-tool',
        toolVersion: '2.0.0',
        timestamp: new Date(),
        sessionId: 'session_abc',
        userId: 'user_xyz',
        requestId: 'req_789',
        environment: 'production',
        performance: {
          startTime: Date.now(),
          timeoutMs: 30000,
          priority: 'normal',
        },
        security: {
          apiKeyHash: 'sha256:abc123',
          permissions: ['read', 'write'],
        },
        agent: {
          type: 'gpt-4',
          version: '1.0',
          model: 'gpt-4-turbo',
        },
        debug: {
          enabled: false,
        },
        flags: {
          dryRun: false,
          noCache: false,
        },
      };

      expect(context.performance?.priority).toBe('normal');
      expect(context.security?.permissions).toContain('read');
    });
  });

  describe('ToolExecutionResult', () => {
    it('should allow creating successful result', () => {
      const result: ToolExecutionResult = {
        status: 'success',
        data: { message: 'Hello, World!' },
        timing: {
          executionTimeMs: 150,
          startedAt: '2024-01-15T10:30:00.000Z',
          completedAt: '2024-01-15T10:30:00.150Z',
        },
      };

      expect(result.status).toBe('success');
      expect(result.data.message).toBe('Hello, World!');
      expect(result.timing?.executionTimeMs).toBe(150);
    });

    it('should allow creating error result', () => {
      const result: ToolExecutionResult = {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          type: 'validation_error',
          retryable: false,
          field: 'email',
        },
        timing: {
          executionTimeMs: 50,
          startedAt: '2024-01-15T10:30:00.000Z',
          completedAt: '2024-01-15T10:30:00.050Z',
        },
      };

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.retryable).toBe(false);
    });
  });
});

describe('Field Builders', () => {
  describe('String Field Builder', () => {
    it('should create basic string field', () => {
      const field = stringField()
        .required()
        .description('Test string field')
        .example('test value')
        .build();

      expect(field.type).toBe('string');
      expect(field.required).toBe(true);
      expect(field.description).toBe('Test string field');
      expect(field.example).toBe('test value');
    });

    it('should create string field with validation', () => {
      const field = stringField()
        .minLength(5)
        .maxLength(100)
        .pattern('^[a-zA-Z]+$')
        .transform('trim')
        .build();

      expect(field.minLength).toBe(5);
      expect(field.maxLength).toBe(100);
      expect(field.pattern).toBe('^[a-zA-Z]+$');
      expect(field.transform).toBe('trim');
    });
  });

  describe('Number Field Builder', () => {
    it('should create number field with constraints', () => {
      const field = numberField()
        .required()
        .min(0)
        .max(100)
        .integer()
        .description('Age field')
        .build();

      expect(field.type).toBe('number');
      expect(field.min).toBe(0);
      expect(field.max).toBe(100);
      expect(field.integer).toBe(true);
    });
  });

  describe('Boolean Field Builder', () => {
    it('should create boolean field', () => {
      const field = booleanField()
        .optional()
        .default(false)
        .description('Enable feature flag')
        .build();

      expect(field.type).toBe('boolean');
      expect(field.required).toBe(false);
      expect(field.default).toBe(false);
    });
  });

  describe('Enum Field Builder', () => {
    it('should create enum field', () => {
      const field = enumField(['small', 'medium', 'large'])
        .required()
        .description('Size selection')
        .labels(['Small', 'Medium', 'Large'])
        .build();

      expect(field.type).toBe('enum');
      expect(field.enum).toEqual(['small', 'medium', 'large']);
      expect(field.enumLabels).toEqual(['Small', 'Medium', 'Large']);
    });
  });

  describe('Array Field Builder', () => {
    it('should create array field with item type', () => {
      const itemField = stringField().required().build();
      const field = arrayField(itemField)
        .minItems(1)
        .maxItems(10)
        .unique()
        .build();

      expect(field.type).toBe('array');
      expect(field.minItems).toBe(1);
      expect(field.maxItems).toBe(10);
      expect(field.uniqueItems).toBe(true);
      expect(field.items).toEqual(itemField);
    });
  });

  describe('Object Field Builder', () => {
    it('should create object field with properties', () => {
      const properties = {
        name: stringField().required().build(),
        age: numberField().optional().min(0).build(),
      };

      const field = objectField(properties)
        .requiredProperties(['name'])
        .additionalProperties(false)
        .build();

      expect(field.type).toBe('object');
      expect(field.properties).toEqual(properties);
      expect(field.requiredProperties).toEqual(['name']);
      expect(field.additionalProperties).toBe(false);
    });
  });

  describe('API Key Field Builder', () => {
    it('should create API key config field', () => {
      const field = apiKeyField()
        .required()
        .description('API key for external service')
        .pattern('^sk-[a-zA-Z0-9]{48}$')
        .envVar('API_KEY')
        .build();

      expect(field.type).toBe('apiKey');
      expect(field.secret).toBe(true);
      expect(field.envVar).toBe('API_KEY');
      expect(field.validation?.pattern).toBe('^sk-[a-zA-Z0-9]{48}$');
    });
  });

  describe('Convenience Field Builders', () => {
    it('should create email field with proper format', () => {
      const field = emailField()
        .required()
        .description('User email address')
        .build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('email');
      expect(field.transform).toBe('lowercase');
    });

    it('should create URL field with proper format', () => {
      const field = urlField().required().description('Website URL').build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('url');
    });

    it('should create UUID field with proper format', () => {
      const field = uuidField()
        .required()
        .description('Unique identifier')
        .build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('uuid');
    });
  });
});

describe('Complete Schema Creation', () => {
  it('should create a complete tool schema using field builders', () => {
    const schema: ToolSchema = {
      input: {
        email: emailField()
          .required()
          .description('User email address')
          .example('user@example.com')
          .build(),

        age: numberField()
          .optional()
          .min(0)
          .max(120)
          .integer()
          .description('User age')
          .build(),

        preferences: objectField({
          theme: enumField(['light', 'dark']).default('light').build(),
          notifications: booleanField().default(true).build(),
        })
          .requiredProperties(['theme'])
          .build(),

        tags: arrayField(stringField().build())
          .optional()
          .minItems(0)
          .maxItems(10)
          .build(),
      },
      config: {
        apiKey: apiKeyField()
          .required()
          .description('Service API key')
          .envVar('SERVICE_API_KEY')
          .build(),

        baseUrl: configStringField()
          .optional()
          .default('https://api.example.com')
          .description('API base URL')
          .build(),
      },
    };

    // Verify input fields
    expect(schema.input.email.type).toBe('string');
    expect(schema.input.email.format).toBe('email');
    expect(schema.input.age.type).toBe('number');
    expect(schema.input.age.integer).toBe(true);
    expect(schema.input.preferences.type).toBe('object');
    expect(schema.input.tags.type).toBe('array');

    // Verify config fields
    expect(schema.config.apiKey.type).toBe('apiKey');
    expect(schema.config.apiKey.secret).toBe(true);
    expect(schema.config.baseUrl.type).toBe('string');
  });
});

describe('Tool Definition', () => {
  it('should create a complete tool definition', async () => {
    const toolDef: ToolDefinition = {
      metadata: {
        name: 'test-tool',
        version: '1.0.0',
        description: 'A complete test tool',
        capabilities: ['test.execute'],
      },
      schema: {
        input: {
          message: stringField()
            .required()
            .description('Message to process')
            .build(),
        },
        config: {
          apiKey: apiKeyField().required().description('API key').build(),
        },
      },
      execute: async (input, _config, context) => {
        return {
          status: 'success',
          data: { processedMessage: input.message.toUpperCase() },
          timing: {
            executionTimeMs: 100,
            startedAt: context.timestamp.toISOString(),
            completedAt: new Date().toISOString(),
          },
        };
      },
    };

    // Test the execution function
    const context: ToolExecutionContext = {
      executionId: 'test_exec',
      toolId: 'test-tool',
      toolVersion: '1.0.0',
      timestamp: new Date(),
    };

    const result = await toolDef.execute(
      { message: 'hello world' },
      { apiKey: 'test-key' },
      context
    );

    expect(result.status).toBe('success');
    expect(result.data?.processedMessage).toBe('HELLO WORLD');
    expect(typeof result.timing?.executionTimeMs).toBe('number');
  });
});
