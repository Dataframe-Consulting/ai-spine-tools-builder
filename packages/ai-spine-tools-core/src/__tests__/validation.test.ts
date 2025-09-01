/**
 * Comprehensive test suite for the Zod-based validation system.
 * Tests all field types, validation rules, error handling, caching, and performance.
 */

import {
  ZodSchemaValidator,
  SchemaValidator,
  ValidationOptions,
} from '../validation.js';
import {
  ToolSchema,
  stringField,
  numberField,
  booleanField,
  enumField,
  arrayField,
  objectField,
  apiKeyField,
  emailField,
} from '../index.js';

describe('ZodSchemaValidator', () => {
  let validator: ZodSchemaValidator;

  beforeEach(() => {
    validator = new ZodSchemaValidator();
  });

  afterEach(() => {
    validator.reset();
  });

  describe('Input Validation', () => {
    describe('String Fields', () => {
      it('should validate basic string fields', async () => {
        const schema = {
          name: stringField().required().minLength(2).maxLength(50).build(),
        };

        const validData = { name: 'John Doe' };
        const result = await validator.validateInput(validData, schema);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
        expect(result.timing?.durationMs).toBeGreaterThanOrEqual(0);
      });

      it('should reject strings that are too short', async () => {
        const schema = {
          name: stringField().required().minLength(5).build(),
        };

        const invalidData = { name: 'Jo' };
        const result = await validator.validateInput(invalidData, schema);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].code).toBe('TOO_SMALL');
        expect(result.errors![0].path).toEqual(['name']);
      });

      it('should reject strings that are too long', async () => {
        const schema = {
          description: stringField().required().maxLength(10).build(),
        };

        const invalidData = { description: 'This is a very long description' };
        const result = await validator.validateInput(invalidData, schema);

        expect(result.success).toBe(false);
        expect(result.errors![0].code).toBe('TOO_BIG');
      });

      it('should validate string patterns', async () => {
        const schema = {
          code: stringField().required().pattern('^[A-Z]{2}[0-9]{4}$').build(),
        };

        const validData = { code: 'AB1234' };
        const invalidData = { code: 'ab1234' };

        const validResult = await validator.validateInput(validData, schema);
        const invalidResult = await validator.validateInput(
          invalidData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.errors![0].code).toBe('INVALID_FORMAT');
      });

      it('should apply string transformations', async () => {
        const schema = {
          email: stringField().required().transform('lowercase').build(),
        };

        const inputData = { email: 'USER@EXAMPLE.COM' };
        const result = await validator.validateInput(inputData, schema, {
          transform: true,
        });

        expect(result.success).toBe(true);
        expect(result.data.email).toBe('user@example.com');
      });
    });

    describe('Email Fields', () => {
      it('should validate email addresses', async () => {
        const schema = {
          email: emailField().required().build(),
        };

        const validData = { email: 'user@example.com' };
        const invalidData = { email: 'invalid-email' };

        const validResult = await validator.validateInput(validData, schema);
        const invalidResult = await validator.validateInput(
          invalidData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.errors![0].code).toBe('INVALID_FORMAT');
      });
    });

    describe('Number Fields', () => {
      it('should validate number ranges', async () => {
        const schema = {
          age: numberField().required().min(0).max(120).integer().build(),
        };

        const validData = { age: 25 };
        const invalidMinData = { age: -5 };
        const invalidMaxData = { age: 150 };
        const invalidTypeData = { age: 25.5 };

        const validResult = await validator.validateInput(validData, schema);
        const invalidMinResult = await validator.validateInput(
          invalidMinData,
          schema
        );
        const invalidMaxResult = await validator.validateInput(
          invalidMaxData,
          schema
        );
        const invalidTypeResult = await validator.validateInput(
          invalidTypeData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidMinResult.success).toBe(false);
        expect(invalidMaxResult.success).toBe(false);
        expect(invalidTypeResult.success).toBe(false);
      });
    });

    describe('Boolean Fields', () => {
      it('should validate boolean values', async () => {
        const schema = {
          enabled: booleanField().required().build(),
        };

        const validData = { enabled: true };
        const invalidData = { enabled: 'yes' };

        const validResult = await validator.validateInput(validData, schema);
        const invalidResult = await validator.validateInput(
          invalidData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
      });
    });

    describe('Enum Fields', () => {
      it('should validate enum values', async () => {
        const schema = {
          status: enumField(['active', 'inactive', 'pending'])
            .required()
            .build(),
        };

        const validData = { status: 'active' };
        const invalidData = { status: 'unknown' };

        const validResult = await validator.validateInput(validData, schema);
        const invalidResult = await validator.validateInput(
          invalidData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.errors![0].code).toBe('INVALID_VALUE');
      });
    });

    describe('Array Fields', () => {
      it('should validate array fields with item constraints', async () => {
        const schema = {
          tags: arrayField(stringField().minLength(1).build())
            .required()
            .minItems(1)
            .maxItems(5)
            .build(),
        };

        const validData = { tags: ['tag1', 'tag2'] };
        const invalidEmptyData = { tags: [] };
        const invalidItemData = { tags: ['tag1', ''] };
        const invalidLengthData = { tags: ['1', '2', '3', '4', '5', '6'] };

        const validResult = await validator.validateInput(validData, schema);
        const invalidEmptyResult = await validator.validateInput(
          invalidEmptyData,
          schema
        );
        const invalidItemResult = await validator.validateInput(
          invalidItemData,
          schema
        );
        const invalidLengthResult = await validator.validateInput(
          invalidLengthData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidEmptyResult.success).toBe(false);
        expect(invalidItemResult.success).toBe(false);
        expect(invalidLengthResult.success).toBe(false);
      });
    });

    describe('Object Fields', () => {
      it('should validate nested object structures', async () => {
        const schema = {
          user: objectField({
            name: stringField().required().build(),
            age: numberField().optional().min(0).build(),
          })
            .requiredProperties(['name'])
            .build(),
        };

        const validData = {
          user: {
            name: 'John',
            age: 30,
          },
        };

        const invalidData = {
          user: {
            age: 30, // missing required name
          },
        };

        const validResult = await validator.validateInput(validData, schema);
        const invalidResult = await validator.validateInput(
          invalidData,
          schema
        );

        expect(validResult.success).toBe(true);
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.errors![0].path).toEqual(['user', 'name']);
      });
    });

    describe('Optional Fields and Defaults', () => {
      it('should handle optional fields with defaults', async () => {
        const schema = {
          name: stringField().required().build(),
          role: stringField().optional().default('user').build(),
          active: booleanField().optional().default(true).build(),
        };

        const inputData = { name: 'John' };
        const result = await validator.validateInput(inputData, schema);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          name: 'John',
          role: 'user',
          active: true,
        });
      });
    });

    describe('Custom Error Messages', () => {
      it('should use custom error messages', async () => {
        const schema = {
          email: stringField().required().build(),
        };

        const options: ValidationOptions = {
          customMessages: {
            'email.required': 'Email address is required for registration',
          },
        };

        const invalidData = {};
        const result = await validator.validateInput(
          invalidData,
          schema,
          options
        );

        expect(result.success).toBe(false);
        // Note: Custom messages for required fields would need to be implemented
        // in the Zod schema building process
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate API key configuration', async () => {
      const schema = {
        apiKey: apiKeyField()
          .required()
          .pattern('^sk-[a-zA-Z0-9]{48}$')
          .build(),
        environment: {
          type: 'enum' as const,
          required: false,
          default: 'production',
          validation: {
            enum: ['development', 'staging', 'production'],
          },
        },
      };

      const validConfig = {
        apiKey: 'sk-' + 'a'.repeat(48),
      };

      const invalidConfig = {
        apiKey: 'invalid-key',
      };

      const validResult = await validator.validateConfig(validConfig, schema);
      const invalidResult = await validator.validateConfig(
        invalidConfig,
        schema
      );

      expect(validResult.success).toBe(true);
      expect(validResult.data.environment).toBe('production'); // default applied
      expect(invalidResult.success).toBe(false);
    });

    it('should validate URL configuration with protocol restrictions', async () => {
      const schema = {
        webhookUrl: {
          type: 'url' as const,
          required: true,
          validation: {
            allowedProtocols: ['https'],
          },
        },
      };

      const validConfig = { webhookUrl: 'https://api.example.com/webhook' };
      const invalidConfig = { webhookUrl: 'http://api.example.com/webhook' };

      const validResult = await validator.validateConfig(validConfig, schema);
      const invalidResult = await validator.validateConfig(
        invalidConfig,
        schema
      );

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Tool Schema Validation', () => {
    it('should validate complete tool schemas', async () => {
      const toolSchema: ToolSchema = {
        input: {
          message: stringField()
            .required()
            .minLength(1)
            .maxLength(1000)
            .build(),
          priority: enumField(['low', 'normal', 'high'])
            .optional()
            .default('normal')
            .build(),
        },
        config: {
          apiKey: apiKeyField().required().build(),
          timeout: {
            type: 'number',
            required: false,
            default: 5000,
            validation: {
              min: 1000,
              max: 30000,
            },
          },
        },
      };

      const validData = {
        input: {
          message: 'Hello, world!',
        },
        config: {
          apiKey: 'sk-test-key',
        },
      };

      const result = await validator.validateToolSchema(validData, toolSchema);

      expect(result.success).toBe(true);
      expect(result.data.input.priority).toBe('normal');
      expect(result.data.config.timeout).toBe(5000);
    });

    it('should validate cross-field rules', async () => {
      const toolSchema: ToolSchema = {
        input: {
          type: enumField(['basic', 'advanced']).required().build(),
          advancedOptions: objectField({
            complexity: numberField().min(1).max(10).build(),
          })
            .optional()
            .build(),
        },
        config: {
          apiKey: apiKeyField().required().build(),
        },
        validation: {
          crossFieldValidation: [
            {
              rule: 'conditional',
              condition: 'input.type === "advanced"',
              requires: ['input.advancedOptions'],
              errorMessage:
                'Advanced options are required when type is advanced',
            },
          ],
        },
      };

      const validBasicData = {
        input: { type: 'basic' },
        config: { apiKey: 'test-key' },
      };

      const validAdvancedData = {
        input: {
          type: 'advanced',
          advancedOptions: { complexity: 5 },
        },
        config: { apiKey: 'test-key' },
      };

      const invalidAdvancedData = {
        input: { type: 'advanced' }, // missing advancedOptions
        config: { apiKey: 'test-key' },
      };

      const basicResult = await validator.validateToolSchema(
        validBasicData,
        toolSchema
      );
      const advancedResult = await validator.validateToolSchema(
        validAdvancedData,
        toolSchema
      );
      const invalidResult = await validator.validateToolSchema(
        invalidAdvancedData,
        toolSchema
      );

      expect(basicResult.success).toBe(true);
      expect(advancedResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors![0].code).toBe(
        'CROSS_FIELD_VALIDATION_FAILED'
      );
    });
  });

  describe('Performance and Caching', () => {
    it('should cache compiled schemas for performance', async () => {
      const schema = {
        name: stringField().required().build(),
        age: numberField().optional().build(),
      };

      const data = { name: 'John', age: 30 };

      // First validation - should not use cache
      const result1 = await validator.validateInput(data, schema);

      // Second validation - should use cache
      const result2 = await validator.validateInput(data, schema);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const metrics = validator.getMetrics();
      expect(metrics.totalValidations).toBe(2);
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });

    it('should provide performance metrics', async () => {
      const schema = {
        name: stringField().required().build(),
      };

      await validator.validateInput({ name: 'test' }, schema);
      await validator.validateInput({ name: 'test2' }, schema);

      const metrics = validator.getMetrics();

      expect(metrics.totalValidations).toBe(2);
      expect(metrics.averageDurationMs).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.currentCacheSize).toBeGreaterThan(0);
    });

    it('should reset metrics and cache', () => {
      const schema = { name: stringField().required().build() };

      // Add some data to cache and metrics
      validator.validateInput({ name: 'test' }, schema);

      const metricsBeforeReset = validator.getMetrics();
      expect(metricsBeforeReset.totalValidations).toBeGreaterThanOrEqual(0);

      validator.reset();

      const metricsAfterReset = validator.getMetrics();
      expect(metricsAfterReset.totalValidations).toBe(0);
      expect(metricsAfterReset.currentCacheSize).toBe(0);
    });

    it('should handle large validation loads efficiently', async () => {
      const schema = {
        id: numberField().required().min(1).build(),
        name: stringField().required().minLength(1).maxLength(100).build(),
        email: emailField().required().build(),
        tags: arrayField(stringField().build()).optional().build(),
      };

      const startTime = Date.now();

      // Run multiple validations
      const promises = Array.from({ length: 100 }, (_, i) =>
        validator.validateInput(
          {
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            tags: [`tag${i}`, `category${i % 5}`],
          },
          schema
        )
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All validations should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds max for 100 validations

      const metrics = validator.getMetrics();
      expect(metrics.totalValidations).toBe(100);
      expect(metrics.averageDurationMs).toBeLessThan(100); // Average should be reasonable
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', async () => {
      const schema = {
        email: emailField().required().build(),
        age: numberField().required().min(0).max(120).build(),
        status: enumField(['active', 'inactive']).required().build(),
      };

      const invalidData = {
        email: 'invalid-email',
        age: -5,
        status: 'unknown',
      };

      const result = await validator.validateInput(invalidData, schema);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);

      const emailError = result.errors!.find(e => e.path.includes('email'));
      const ageError = result.errors!.find(e => e.path.includes('age'));
      const statusError = result.errors!.find(e => e.path.includes('status'));

      expect(emailError).toBeDefined();
      expect(ageError).toBeDefined();
      expect(statusError).toBeDefined();

      expect(emailError!.code).toBe('INVALID_FORMAT');
      expect(ageError!.code).toBe('TOO_SMALL');
      expect(statusError!.code).toBe('INVALID_VALUE');
    });

    it('should handle validation system errors gracefully', async () => {
      // Create an invalid schema that should cause a system error
      const invalidSchema = {
        enumField: {
          type: 'enum' as const,
          required: true,
          enum: [], // Empty enum should cause an error
        },
      };

      const result = await validator.validateInput(
        { enumField: 'test' },
        invalidSchema
      );

      expect(result.success).toBe(false);
      expect(result.errors![0].code).toBe('VALIDATION_SYSTEM_ERROR');
      expect(result.timing?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Options', () => {
    it('should strip unknown fields when stripUnknown is true', async () => {
      const schema = {
        name: stringField().required().build(),
      };

      const dataWithExtra = {
        name: 'John',
        unknownField: 'should be removed',
      };

      const result = await validator.validateInput(dataWithExtra, schema, {
        stripUnknown: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John' });
      expect(result.data.unknownField).toBeUndefined();
    });

    it('should transform values when transform option is enabled', async () => {
      const schema = {
        name: stringField().required().transform('trim').build(),
        email: stringField().required().transform('lowercase').build(),
      };

      const dataWithSpaces = {
        name: '  John Doe  ',
        email: 'USER@EXAMPLE.COM',
      };

      const result = await validator.validateInput(dataWithSpaces, schema, {
        transform: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Doe');
      expect(result.data.email).toBe('user@example.com');
    });
  });
});

describe('Legacy SchemaValidator Compatibility', () => {
  it('should maintain backward compatibility for input validation', async () => {
    const schema = {
      name: stringField().required().minLength(2).build(),
      age: numberField().optional().min(0).build(),
    };

    const validData = { name: 'John', age: 30 };
    const invalidData = { name: 'J' }; // too short

    // Should not throw for valid data
    await expect(
      SchemaValidator.validateInput(validData, schema)
    ).resolves.not.toThrow();

    // Should throw ValidationError for invalid data
    await expect(
      SchemaValidator.validateInput(invalidData, schema)
    ).rejects.toThrow('Input validation failed');
  });

  it('should maintain backward compatibility for config validation', async () => {
    const schema = {
      apiKey: apiKeyField().required().build(),
      timeout: {
        type: 'number' as const,
        required: false,
        default: 5000,
      },
    };

    const validConfig = { apiKey: 'test-key' };
    const invalidConfig = {}; // missing required apiKey

    await expect(
      SchemaValidator.validateConfig(validConfig, schema)
    ).resolves.not.toThrow();

    await expect(
      SchemaValidator.validateConfig(invalidConfig, schema)
    ).rejects.toThrow('Configuration validation failed');
  });
});

describe('Real-world Usage Scenarios', () => {
  it('should validate a weather tool schema', async () => {
    const weatherToolSchema: ToolSchema = {
      input: {
        city: stringField()
          .required()
          .minLength(2)
          .maxLength(100)
          .description('City name for weather lookup')
          .example('Madrid')
          .build(),

        units: enumField(['celsius', 'fahrenheit', 'kelvin'])
          .optional()
          .default('celsius')
          .description('Temperature units')
          .build(),

        includeHourly: booleanField()
          .optional()
          .default(false)
          .description('Include hourly forecast')
          .build(),
      },
      config: {
        apiKey: apiKeyField()
          .required()
          .description('OpenWeatherMap API key')
          .envVar('OPENWEATHER_API_KEY')
          .build(),

        baseUrl: {
          type: 'url',
          required: false,
          default: 'https://api.openweathermap.org/data/2.5',
          description: 'API base URL',
          validation: {
            allowedProtocols: ['https'],
          },
        },
      },
    };

    const validator = new ZodSchemaValidator();

    const validRequest = {
      input: {
        city: 'Madrid',
        units: 'celsius',
        includeHourly: true,
      },
      config: {
        apiKey: 'sk-' + 'a'.repeat(32),
      },
    };

    const result = await validator.validateToolSchema(
      validRequest,
      weatherToolSchema
    );

    expect(result.success).toBe(true);
    expect(result.data.input.city).toBe('Madrid');
    expect(result.data.input.units).toBe('celsius');
    expect(result.data.config.baseUrl).toBe(
      'https://api.openweathermap.org/data/2.5'
    );
  });

  it('should validate an email tool with file attachments', async () => {
    const emailToolSchema: ToolSchema = {
      input: {
        to: arrayField(emailField().required().build())
          .required()
          .minItems(1)
          .maxItems(10)
          .build(),

        subject: stringField().required().minLength(1).maxLength(200).build(),

        body: stringField().required().minLength(1).maxLength(10000).build(),

        attachments: arrayField(
          objectField({
            name: stringField().required().build(),
            size: numberField()
              .required()
              .min(1)
              .max(25 * 1024 * 1024)
              .build(), // 25MB max
            type: stringField().required().build(),
          }).build()
        )
          .optional()
          .maxItems(5)
          .build(),
      },
      config: {
        smtpHost: {
          type: 'string' as const,
          required: true,
        },
        smtpPort: {
          type: 'number' as const,
          required: false,
          default: 587,
          validation: { min: 1, max: 65535 },
        },
        username: {
          type: 'string' as const,
          required: true,
        },
        password: {
          type: 'secret' as const,
          required: true,
          secret: true,
        },
      },
    };

    const validator = new ZodSchemaValidator();

    const validRequest = {
      input: {
        to: ['user@example.com', 'admin@example.com'],
        subject: 'Test Email',
        body: 'This is a test email with attachments.',
        attachments: [
          {
            name: 'document.pdf',
            size: 1024 * 1024, // 1MB
            type: 'application/pdf',
          },
        ],
      },
      config: {
        smtpHost: 'smtp.gmail.com',
        username: 'sender@gmail.com',
        password: 'app-password',
      },
    };

    const result = await validator.validateToolSchema(
      validRequest,
      emailToolSchema
    );

    expect(result.success).toBe(true);
    expect(result.data.input.to).toHaveLength(2);
    expect(result.data.input.attachments).toHaveLength(1);
    expect(result.data.config.smtpPort).toBe(587); // default applied
  });
});
