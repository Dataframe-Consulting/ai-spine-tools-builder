/**
 * Comprehensive tests for createTool factory function and ToolBuilder class.
 * These tests cover all aspects of tool creation, validation, and lifecycle management.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  createTool,
  ToolBuilder,
  CreateToolOptions,
  stringField,
  numberField,
  booleanField,
  arrayField,
  objectField,
  enumField,
  dateField,
  timeField,
  apiKeyField,
  configStringField,
  configNumberField,
  configUrlField,
  simpleCreateTool,
  createToolBuilder,
} from '../create-tool';

import { ConfigurationError, ValidationError } from '@ai-spine/tools-core';

// Mock modules
jest.mock('@ai-spine/tools-core', () => ({
  ...jest.requireActual('@ai-spine/tools-core'),
  Tool: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('createTool Factory Function', () => {
  // Valid tool definition for testing
  const validToolDefinition: CreateToolOptions = {
    metadata: {
      name: 'test-tool',
      version: '1.0.0',
      description: 'A test tool for unit testing',
      capabilities: ['test.execute'],
    },
    schema: {
      input: {
        message: stringField({ required: true, description: 'Test message' }),
      },
      config: {
        apiKey: apiKeyField({ required: true, description: 'Test API key' }),
      },
    },
    execute: async (input, _config, _context) => {
      return {
        status: 'success',
        data: { echo: input.message },
      };
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.AI_SPINE_DEBUG;
  });

  describe('Basic Tool Creation', () => {
    it('should create a tool with valid definition', () => {
      expect(() => {
        const _tool = createTool(validToolDefinition);
        expect(_tool).toBeDefined();
      }).not.toThrow();
    });

    it('should validate tool definition and throw ConfigurationError for invalid metadata', () => {
      const invalidDefinition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          name: '', // Invalid empty name
        },
      };

      expect(() => {
        createTool(invalidDefinition);
      }).toThrow(ConfigurationError);
    });

    it('should validate tool definition and throw ConfigurationError for missing execute function', () => {
      const invalidDefinition = {
        ...validToolDefinition,
        execute: undefined as any,
      };

      expect(() => {
        createTool(invalidDefinition);
      }).toThrow(ConfigurationError);
    });

    it('should apply intelligent defaults', () => {
      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          tags: undefined,
          minSdkVersion: undefined,
        },
      };

      expect(() => {
        createTool(definition);
      }).not.toThrow();
    });
  });

  describe('Metadata Validation', () => {
    it('should require tool name', () => {
      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          name: '',
        },
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should require tool version', () => {
      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          version: '',
        },
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should require tool description', () => {
      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          description: '',
        },
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should require capabilities array', () => {
      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          capabilities: [],
        },
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should warn about non-kebab-case names in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          name: 'TestTool', // PascalCase instead of kebab-case
        },
      };

      createTool(definition);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool name should use kebab-case format')
      );

      consoleSpy.mockRestore();
    });

    it('should warn about non-semver versions in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const definition = {
        ...validToolDefinition,
        metadata: {
          ...validToolDefinition.metadata,
          version: '1.0', // Not proper semver
        },
      };

      createTool(definition);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Tool version should follow semantic versioning'
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Schema Validation', () => {
    it('should validate input field types', () => {
      const definition = {
        ...validToolDefinition,
        schema: {
          input: {
            invalidField: { required: true } as any, // Missing type
          },
          config: validToolDefinition.schema.config,
        },
      };

      expect(() => createTool(definition)).toThrow(ValidationError);
    });

    it('should validate config field types', () => {
      const definition = {
        ...validToolDefinition,
        schema: {
          input: validToolDefinition.schema.input,
          config: {
            invalidField: { required: true } as any, // Missing type
          },
        },
      };

      expect(() => createTool(definition)).toThrow(ValidationError);
    });

    it('should validate field required specification', () => {
      const definition = {
        ...validToolDefinition,
        schema: {
          input: {
            message: {
              type: 'string',
              // Missing required field
            } as any,
          },
          config: validToolDefinition.schema.config,
        },
      };

      expect(() => createTool(definition)).toThrow(ValidationError);
    });
  });

  describe('Optional Functions Validation', () => {
    it('should validate setup function if provided', () => {
      const definition = {
        ...validToolDefinition,
        setup: 'not-a-function' as any,
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should validate cleanup function if provided', () => {
      const definition = {
        ...validToolDefinition,
        cleanup: 'not-a-function' as any,
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should validate healthCheck function if provided', () => {
      const definition = {
        ...validToolDefinition,
        healthCheck: 'not-a-function' as any,
      };

      expect(() => createTool(definition)).toThrow(ConfigurationError);
    });

    it('should accept valid optional functions', () => {
      const definition: CreateToolOptions = {
        ...validToolDefinition,
        setup: async _config => {
          console.log('Setup');
        },
        cleanup: async () => {
          console.log('Cleanup');
        },
        healthCheck: async () => {
          return { status: 'healthy' };
        },
      };

      expect(() => createTool(definition)).not.toThrow();
    });
  });

  describe('Development Mode Enhancements', () => {
    it('should add development enhancements when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const _tool = createTool(validToolDefinition);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created tool "test-tool"')
      );

      consoleSpy.mockRestore();
    });

    it('should add development enhancements when AI_SPINE_DEBUG is true', () => {
      process.env.AI_SPINE_DEBUG = 'true';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const _tool = createTool(validToolDefinition);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Created tool "test-tool"')
      );

      consoleSpy.mockRestore();
    });

    it('should not add development enhancements in production', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const _tool = createTool(validToolDefinition);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Created tool')
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('ToolBuilder Class', () => {
  let builder: ToolBuilder;

  beforeEach(() => {
    builder = new ToolBuilder();
    jest.clearAllMocks();
  });

  describe('Basic Builder Functionality', () => {
    it('should create a builder instance', () => {
      expect(builder).toBeInstanceOf(ToolBuilder);
    });

    it('should allow method chaining', () => {
      const result = builder
        .metadata({
          name: 'chain-test',
          version: '1.0.0',
          description: 'Testing method chaining',
          capabilities: ['test'],
        })
        .inputField('message', stringField({ required: true }))
        .execute(async () => {
          return { status: 'success', data: {} };
        });

      expect(result).toBe(builder);
    });

    it('should build a valid tool', () => {
      expect(() => {
        const _tool = builder
          .metadata({
            name: 'build-test',
            version: '1.0.0',
            description: 'Testing build functionality',
            capabilities: ['test'],
          })
          .execute(async () => {
            return { status: 'success', data: {} };
          })
          .build();

        expect(_tool).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Metadata Configuration', () => {
    it('should set metadata correctly', () => {
      const metadata = {
        name: 'metadata-test',
        version: '1.0.0',
        description: 'Testing metadata setting',
        capabilities: ['test'],
        author: 'Test Author',
        license: 'MIT',
      };

      expect(() => {
        builder.metadata(metadata);
      }).not.toThrow();
    });

    it('should validate metadata on set', () => {
      expect(() => {
        builder.metadata({
          name: '', // Invalid
          version: '1.0.0',
          description: 'Test',
          capabilities: ['test'],
        });
      }).not.toThrow(); // Validation errors are collected, not thrown immediately

      expect(builder.getValidationErrors()).toEqual(
        expect.arrayContaining([expect.stringContaining('Tool name is required')])
      );
    });

    it('should prevent modification after build', () => {
      const _tool = builder
        .metadata({
          name: 'prevent-modification-test',
          version: '1.0.0',
          description: 'Test preventing modification after build',
          capabilities: ['test'],
        })
        .execute(async () => {
          return { status: 'success', data: {} };
        })
        .build();

      expect(() => {
        builder.metadata({
          name: 'another-name',
          version: '2.0.0',
          description: 'This should fail',
          capabilities: ['fail'],
        });
      }).toThrow(ConfigurationError);
    });
  });

  describe('Input Schema Configuration', () => {
    it('should add single input fields', () => {
      expect(() => {
        builder.inputField('message', stringField({ required: true }));
      }).not.toThrow();
    });

    it('should add multiple input fields', () => {
      expect(() => {
        builder.input({
          message: stringField({ required: true }),
          count: numberField({ required: false, default: 1 }),
        });
      }).not.toThrow();
    });

    it('should validate field names', () => {
      builder.inputField('123invalid', stringField({ required: true }));

      expect(builder.getValidationErrors()).toEqual(
        expect.arrayContaining([expect.stringContaining(
          "Input field name '123invalid' must be a valid identifier"
        )])
      );
    });

    it('should validate field definitions', () => {
      builder.inputField('valid-name', null as any);

      expect(builder.getValidationErrors()).toEqual(
        expect.arrayContaining([expect.stringContaining('must be a valid field definition object')])
      );
    });
  });

  describe('Config Schema Configuration', () => {
    it('should add single config fields', () => {
      expect(() => {
        builder.configField('apiKey', apiKeyField({ required: true }));
      }).not.toThrow();
    });

    it('should add multiple config fields', () => {
      expect(() => {
        builder.config({
          apiKey: apiKeyField({ required: true }),
          baseUrl: configStringField({
            required: false,
            default: 'https://api.example.com',
          }),
        });
      }).not.toThrow();
    });

    it('should validate config field names', () => {
      builder.configField('invalid-name!', apiKeyField({ required: true }));

      expect(builder.getValidationErrors()).toEqual(
        expect.arrayContaining([expect.stringContaining('must be a valid identifier')])
      );
    });
  });

  describe('Execution Function Configuration', () => {
    it('should set execute function', () => {
      expect(() => {
        builder.execute(async (input, _config, _context) => {
          return {
            status: 'success',
            data: { processed: input },
          };
        });
      }).not.toThrow();
    });

    it('should validate execute function', () => {
      builder.execute('not-a-function' as any);

      expect(builder.getValidationErrors()).toEqual(
        expect.arrayContaining([expect.stringContaining('Execute function must be a valid function')])
      );
    });
  });

  describe('Lifecycle Functions Configuration', () => {
    it('should set setup function', () => {
      expect(() => {
        builder.onSetup(async _config => {
          console.log('Setting up with config:', _config);
        });
      }).not.toThrow();
    });

    it('should set cleanup function', () => {
      expect(() => {
        builder.onCleanup(async () => {
          console.log('Cleaning up');
        });
      }).not.toThrow();
    });

    it('should set health check function', () => {
      expect(() => {
        builder.healthCheck(async () => ({ status: 'healthy' }));
      }).not.toThrow();
    });

    it('should validate lifecycle functions', () => {
      builder.onSetup('not-a-function' as any);
      builder.onCleanup('not-a-function' as any);
      builder.healthCheck('not-a-function' as any);

      const errors = builder.getValidationErrors();
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Setup function must be a valid function'),
          expect.stringContaining('Cleanup function must be a valid function'),
          expect.stringContaining('Health check function must be a valid function')
        ])
      );
    });
  });

  describe('Build Process', () => {
    it('should require metadata before build', () => {
      builder.execute(async () => {
        return { status: 'success', data: {} };
      });

      expect(() => builder.build()).toThrow(ConfigurationError);
    });

    it('should require execute function before build', () => {
      builder.metadata({
        name: 'missing-execute',
        version: '1.0.0',
        description: 'Missing execute function',
        capabilities: ['test'],
      });

      expect(() => builder.build()).toThrow(ConfigurationError);
    });

    it('should prevent multiple builds from same instance', () => {
      builder
        .metadata({
          name: 'multiple-build-test',
          version: '1.0.0',
          description: 'Testing multiple builds',
          capabilities: ['test'],
        })
        .execute(async () => {
          return { status: 'success', data: {} };
        });

      const _tool1 = builder.build();

      expect(() => builder.build()).toThrow(ConfigurationError);
    });

    it('should provide comprehensive error messages', () => {
      builder.inputField('invalid!field', stringField({ required: true }));
      builder.configField('', apiKeyField({ required: true }));

      expect(() => builder.build()).toThrow(ConfigurationError);
    });
  });

  describe('Validation Utilities', () => {
    it('should return validation errors without building', () => {
      builder.inputField('invalid!', stringField({ required: true }));

      const errors = builder.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Tool metadata is required')])
      );
    });

    it('should check validity without building', () => {
      expect(builder.isValid()).toBe(false);

      builder
        .metadata({
          name: 'validity-test',
          version: '1.0.0',
          description: 'Testing validity check',
          capabilities: ['test'],
        })
        .execute(async () => {
          return { status: 'success', data: {} };
        });

      expect(builder.isValid()).toBe(true);
    });
  });
});

describe('Field Builder Functions', () => {
  describe('Input Field Builders', () => {
    it('should create string fields', () => {
      const field = stringField({ required: true, minLength: 5 });
      expect(field.type).toBe('string');
      expect(field.required).toBe(true);
      expect(field.minLength).toBe(5);
    });

    it('should create number fields', () => {
      const field = numberField({ required: false, min: 0, max: 100 });
      expect(field.type).toBe('number');
      expect(field.required).toBe(false);
      expect(field.min).toBe(0);
      expect(field.max).toBe(100);
    });

    it('should create boolean fields', () => {
      const field = booleanField({ required: false, default: false });
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(false);
      expect(field.default).toBe(false);
    });

    it('should create array fields', () => {
      const itemField = stringField({ required: true });
      const field = arrayField(itemField, { minItems: 1, maxItems: 10 });
      expect(field.type).toBe('array');
      expect(field.items).toBe(itemField);
      expect(field.minItems).toBe(1);
      expect(field.maxItems).toBe(10);
    });

    it('should create object fields', () => {
      const properties = {
        name: stringField({ required: true }),
        age: numberField({ required: false }),
      };
      const field = objectField(properties);
      expect(field.type).toBe('object');
      expect(field.properties).toBe(properties);
    });

    it('should create enum fields', () => {
      const values = ['small', 'medium', 'large'];
      const field = enumField(values, { default: 'medium' });
      expect(field.type).toBe('enum');
      expect(field.enum).toBe(values);
      expect(field.default).toBe('medium');
    });

    it('should create date fields', () => {
      const field = dateField({ required: true });
      expect(field.type).toBe('date');
      expect(field.required).toBe(true);
    });

    it('should create time fields', () => {
      const field = timeField({ required: false });
      expect(field.type).toBe('time');
      expect(field.required).toBe(false);
    });
  });

  describe('Config Field Builders', () => {
    it('should create API key fields', () => {
      const field = apiKeyField({ envVar: 'MY_API_KEY' });
      expect(field.type).toBe('apiKey');
      expect(field.secret).toBe(true);
      expect(field.envVar).toBe('MY_API_KEY');
      expect(field.required).toBe(true); // Default for API keys
    });

    it('should create config string fields', () => {
      const field = configStringField({ default: 'https://api.example.com' });
      expect(field.type).toBe('string');
      expect(field.default).toBe('https://api.example.com');
    });

    it('should create config number fields', () => {
      const field = configNumberField({
        default: 5000,
        validation: { min: 1000 },
      });
      expect(field.type).toBe('number');
      expect(field.default).toBe(5000);
      expect(field.validation?.min).toBe(1000);
    });

    it('should create config URL fields', () => {
      const field = configUrlField({
        validation: { allowedProtocols: ['https'] },
      });
      expect(field.type).toBe('url');
      expect(field.validation?.allowedProtocols).toContain('https');
    });
  });
});

describe('Convenience Functions', () => {
  describe('simpleCreateTool', () => {
    it('should create a simple tool', () => {
      const _tool = simpleCreateTool(
        'simple-echo-tool',
        '1.0.0',
        'Simple echo tool for testing',
        async _input => {
          return { echo: _input };
        }
      );

      expect(_tool).toBeDefined();
    });

    it('should handle execution errors', () => {
      const _tool = simpleCreateTool(
        'error-tool',
        '1.0.0',
        'Tool that throws errors',
        async _input => {
          throw new Error('Test error');
        }
      );

      expect(_tool).toBeDefined();
    });
  });

  describe('createToolBuilder', () => {
    it('should create a new ToolBuilder instance', () => {
      const builder = createToolBuilder();
      expect(builder).toBeInstanceOf(ToolBuilder);
    });

    it('should create independent builder instances', () => {
      const builder1 = createToolBuilder();
      const builder2 = createToolBuilder();

      expect(builder1).not.toBe(builder2);
      expect(builder1.isValid()).toBe(builder2.isValid());
    });
  });
});

describe('Error Handling', () => {
  it('should provide clear error messages for common mistakes', () => {
    try {
      createTool({
        metadata: {} as any,
        schema: {} as any,
        execute: undefined as any,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).toContain('Tool name is required');
      expect((error as Error).message).toContain(
        'Execute function is required'
      );
    }
  });

  it('should aggregate multiple validation errors', () => {
    try {
      const builder = new ToolBuilder();
      builder.inputField('', null as any);
      builder.configField('invalid!', null as any);
      builder.build();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).toContain('Tool metadata is required');
      expect((error as Error).message).toContain(
        'Execute function is required'
      );
    }
  });

  it('should provide helpful suggestions in error messages', () => {
    try {
      const builder = new ToolBuilder();
      builder.build();
    } catch (error) {
      expect((error as Error).message).toContain(
        'Call .metadata() with tool information'
      );
      expect((error as Error).message).toContain(
        'Call .execute() with your tool logic'
      );
    }
  });
});

describe('Type Safety', () => {
  it('should maintain type safety through the creation process', () => {
    interface TestInput {
      message: string;
      count?: number;
    }

    interface TestConfig {
      apiKey: string;
      baseUrl?: string;
    }

    const _tool = createTool<TestInput, TestConfig>({
      metadata: {
        name: 'typed-tool',
        version: '1.0.0',
        description: 'Type-safe tool',
        capabilities: ['test'],
      },
      schema: {
        input: {
          message: stringField({ required: true }),
          count: numberField({ required: false }),
        },
        config: {
          apiKey: apiKeyField({ required: true }),
          baseUrl: configStringField({ required: false }),
        },
      },
      execute: async (input, _config, _context) => {
        // TypeScript should enforce correct types
        expect(typeof input.message).toBe('string');
        expect(typeof _config.apiKey).toBe('string');

        return {
          status: 'success',
          data: {
            processed: input.message,
            count: input.count || 0,
            url: _config.baseUrl || 'default',
          },
        };
      },
    });

    expect(_tool).toBeDefined();
  });
});
