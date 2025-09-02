/**
 * Comprehensive tests for the Field Builders System
 *
 * Tests cover:
 * - Basic field builders (string, number, boolean, array)
 * - Advanced field types (object, date, datetime, file)
 * - Configuration field builders (apiKey, configString, url, enum)
 * - Fluent API method chaining
 * - Validation integration
 * - Schema builder functionality
 * - Edge cases and error conditions
 */

import {
  // Basic field builders
  stringField,
  numberField,
  booleanField,
  arrayField,
  objectField,

  // Advanced field types
  dateField,
  datetimeField,
  fileField,

  // Configuration field builders
  apiKeyField,
  configStringField,
  urlConfigField,
  configEnumField,

  // Convenience functions
  emailField,
  urlField,
  uuidField,
  timeField,

  // Schema and validation utilities
  SchemaBuilder,
  DocumentationGenerator,
  createSchema,
  validateField,
  createValidator,
  validate,

  // Enum field builder
  enumField,
} from '../field-builders.js';

import { ToolInputField, StringFormat } from '../types.js';

describe('Basic Field Builders', () => {
  describe('stringField', () => {
    it('should create a basic string field', () => {
      const field = stringField().build();

      expect(field.type).toBe('string');
      expect(field.required).toBeUndefined();
    });

    it('should support fluent API chaining', () => {
      const field = stringField()
        .required()
        .minLength(5)
        .maxLength(100)
        .description('A test string field')
        .example('test')
        .pattern('^[a-zA-Z]+$')
        .format('email')
        .transform('lowercase')
        .sanitize()
        .sensitive()
        .build();

      expect(field).toEqual({
        type: 'string',
        required: true,
        minLength: 5,
        maxLength: 100,
        description: 'A test string field',
        example: 'test',
        pattern: '^[a-zA-Z]+$',
        format: 'email',
        transform: 'lowercase',
        sanitize: true,
        sensitive: true,
      });
    });

    it('should handle optional fields with defaults', () => {
      const field = stringField().default('default value').build();

      expect(field.required).toBe(false);
      expect(field.default).toBe('default value');
    });

    it('should support all string formats', () => {
      const formats: StringFormat[] = [
        'email',
        'url',
        'uuid',
        'uri',
        'hostname',
        'ipv4',
        'ipv6',
        'base64',
        'jwt',
        'slug',
        'color-hex',
        'semver',
      ];

      formats.forEach(format => {
        const field = stringField().format(format).build();
        expect(field.format).toBe(format);
      });
    });

    it('should support all transform types', () => {
      const transforms: Array<
        'trim' | 'lowercase' | 'uppercase' | 'normalize'
      > = ['trim', 'lowercase', 'uppercase', 'normalize'];

      transforms.forEach(transform => {
        const field = stringField().transform(transform).build();
        expect(field.transform).toBe(transform);
      });
    });
  });

  describe('numberField', () => {
    it('should create a basic number field', () => {
      const field = numberField().build();

      expect(field.type).toBe('number');
      expect(field.required).toBeUndefined();
    });

    it('should support numeric validation options', () => {
      const field = numberField()
        .required()
        .min(0)
        .max(100)
        .integer()
        .precision(2)
        .description('A test number field')
        .example(42)
        .build();

      expect(field).toEqual({
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        integer: true,
        precision: 2,
        description: 'A test number field',
        example: 42,
      });
    });

    it('should handle negative ranges', () => {
      const field = numberField().min(-100).max(-1).build();

      expect(field.min).toBe(-100);
      expect(field.max).toBe(-1);
    });

    it('should handle float precision', () => {
      const field = numberField().precision(4).build();

      expect(field.precision).toBe(4);
      expect(field.integer).toBeUndefined();
    });
  });

  describe('booleanField', () => {
    it('should create a basic boolean field', () => {
      const field = booleanField().build();

      expect(field.type).toBe('boolean');
    });

    it('should support boolean defaults', () => {
      const field = booleanField()
        .default(true)
        .description('A test boolean field')
        .build();

      expect(field.default).toBe(true);
      expect(field.required).toBe(false);
    });
  });

  describe('enumField', () => {
    it('should create an enum field with values', () => {
      const values = ['option1', 'option2', 'option3'];
      const field = enumField(values).build();

      expect(field.type).toBe('enum');
      expect(field.enum).toEqual(values);
    });

    it('should support labels for enum values', () => {
      const values = ['small', 'medium', 'large'];
      const labels = ['Small Size', 'Medium Size', 'Large Size'];

      const field = enumField(values).labels(labels).required().build();

      expect(field.enum).toEqual(values);
      expect(field.enumLabels).toEqual(labels);
      expect(field.required).toBe(true);
    });

    it('should work with numeric enum values', () => {
      const values = [1, 2, 3, 4, 5];
      const field = enumField(values).default(3).build();

      expect(field.enum).toEqual(values);
      expect(field.default).toBe(3);
    });
  });

  describe('arrayField', () => {
    it('should create an array field with item type', () => {
      const itemType = stringField().required().build();
      const field = arrayField(itemType).build();

      expect(field.type).toBe('array');
      expect(field.items).toEqual(itemType);
    });

    it('should support array validation options', () => {
      const itemType = numberField().integer().min(1).build();
      const field = arrayField(itemType)
        .required()
        .minItems(1)
        .maxItems(10)
        .unique()
        .description('Array of positive integers')
        .build();

      expect(field).toEqual({
        type: 'array',
        items: itemType,
        required: true,
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
        description: 'Array of positive integers',
      });
    });

    it('should support nested arrays', () => {
      const innerItemType = stringField().build();
      const innerArrayType = arrayField(innerItemType).build();
      const outerArrayField = arrayField(
        innerArrayType as ToolInputField
      ).build();

      expect(outerArrayField.type).toBe('array');
      expect(outerArrayField.items?.type).toBe('array');
      expect((outerArrayField.items as any)?.items?.type).toBe('string');
    });
  });

  describe('objectField', () => {
    it('should create an object field with properties', () => {
      const properties = {
        name: stringField().required().build(),
        age: numberField().min(0).build(),
        active: booleanField().default(true).build(),
      };

      const field = objectField(properties).build();

      expect(field.type).toBe('object');
      expect(field.properties).toEqual(properties);
    });

    it('should support object validation options', () => {
      const properties = {
        id: stringField().required().build(),
        name: stringField().required().build(),
      };

      const field = objectField(properties)
        .required()
        .requiredProperties(['id', 'name'])
        .additionalProperties(false)
        .description('User object')
        .build();

      expect(field.requiredProperties).toEqual(['id', 'name']);
      expect(field.additionalProperties).toBe(false);
      expect(field.required).toBe(true);
    });

    it('should support nested objects', () => {
      const addressProperties = {
        street: stringField().required().build(),
        city: stringField().required().build(),
        zipCode: stringField().pattern('^\\d{5}$').build(),
      };

      const userProperties = {
        name: stringField().required().build(),
        address: objectField(addressProperties).required().build(),
      };

      const field = objectField(userProperties).build();

      expect(field.properties?.address?.type).toBe('object');
      expect((field.properties?.address as any)?.properties).toEqual(
        addressProperties
      );
    });
  });
});

describe('Advanced Field Types', () => {
  describe('dateField', () => {
    it('should create a date field', () => {
      const field = dateField().build();

      expect(field.type).toBe('date');
    });

    it('should support date range validation', () => {
      const field = dateField()
        .required()
        .minDate('2023-01-01')
        .maxDate('2023-12-31')
        .description('Date within 2023')
        .build();

      expect(field).toEqual({
        type: 'date',
        required: true,
        minDate: '2023-01-01',
        maxDate: '2023-12-31',
        description: 'Date within 2023',
      });
    });
  });

  describe('datetimeField', () => {
    it('should create a datetime field', () => {
      const field = datetimeField().build();

      expect(field.type).toBe('datetime');
    });

    it('should support datetime validation with timezone', () => {
      const field = datetimeField()
        .required()
        .minDate('2023-01-01T00:00:00Z')
        .maxDate('2023-12-31T23:59:59Z')
        .timezone('required')
        .description('Datetime with timezone')
        .build();

      expect(field.timezone).toBe('required');
      expect(field.minDate).toBe('2023-01-01T00:00:00Z');
      expect(field.maxDate).toBe('2023-12-31T23:59:59Z');
    });

    it('should support different timezone requirements', () => {
      const requirements: Array<'required' | 'optional' | 'utc-only'> = [
        'required',
        'optional',
        'utc-only',
      ];

      requirements.forEach(requirement => {
        const field = datetimeField().timezone(requirement).build();
        expect(field.timezone).toBe(requirement);
      });
    });
  });

  describe('fileField', () => {
    it('should create a file field', () => {
      const field = fileField().build();

      expect(field.type).toBe('file');
    });

    it('should support file validation options', () => {
      const field = fileField()
        .required()
        .mimeTypes(['image/jpeg', 'image/png', 'image/gif'])
        .maxSize(5 * 1024 * 1024) // 5MB
        .description('Image file')
        .build();

      expect(field).toEqual({
        type: 'file',
        required: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        maxFileSize: 5 * 1024 * 1024,
        description: 'Image file',
      });
    });

    it('should support document file types', () => {
      const field = fileField()
        .mimeTypes(['application/pdf', 'application/msword', 'text/plain'])
        .maxSize(10 * 1024 * 1024) // 10MB
        .build();

      expect(field.allowedMimeTypes).toContain('application/pdf');
      expect(field.maxFileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('timeField', () => {
    it('should create a time field', () => {
      const field = timeField().build();

      expect(field.type).toBe('time');
    });

    it('should support time field configuration', () => {
      const field = timeField()
        .required()
        .description('Time of day')
        .example('14:30:00')
        .build();

      expect(field.type).toBe('time');
      expect(field.required).toBe(true);
      expect(field.example).toBe('14:30:00');
    });
  });
});

describe('Configuration Field Builders', () => {
  describe('apiKeyField', () => {
    it('should create an API key field with secret flag', () => {
      const field = apiKeyField().build();

      expect(field.type).toBe('apiKey');
      expect(field.secret).toBe(true);
    });

    it('should support API key validation', () => {
      const field = apiKeyField()
        .required()
        .pattern('^sk-[a-zA-Z0-9]{32}$')
        .errorMessage('Invalid API key format')
        .envVar('OPENAI_API_KEY')
        .description('OpenAI API key')
        .build();

      expect(field.validation?.pattern).toBe('^sk-[a-zA-Z0-9]{32}$');
      expect(field.validation?.errorMessage).toBe('Invalid API key format');
      expect(field.envVar).toBe('OPENAI_API_KEY');
      expect(field.secret).toBe(true);
    });
  });

  describe('configStringField', () => {
    it('should create a string configuration field', () => {
      const field = configStringField().build();

      expect(field.type).toBe('string');
    });

    it('should support string configuration validation', () => {
      const field = configStringField()
        .required()
        .minLength(3)
        .maxLength(50)
        .pattern('^[a-zA-Z0-9_-]+$')
        .envVar('APP_NAME')
        .category('application')
        .build();

      expect(field.validation?.min).toBe(3);
      expect(field.validation?.max).toBe(50);
      expect(field.validation?.pattern).toBe('^[a-zA-Z0-9_-]+$');
      expect(field.envVar).toBe('APP_NAME');
      expect(field.category).toBe('application');
    });
  });

  describe('urlConfigField', () => {
    it('should create a URL configuration field', () => {
      const field = urlConfigField().build();

      expect(field.type).toBe('url');
    });

    it('should support URL validation with protocols', () => {
      const field = urlConfigField()
        .required()
        .protocols(['https', 'http'])
        .description('API base URL')
        .envVar('API_BASE_URL')
        .build();

      expect(field.validation?.allowedProtocols).toEqual(['https', 'http']);
      expect(field.envVar).toBe('API_BASE_URL');
    });
  });

  describe('configEnumField', () => {
    it('should create an enum configuration field', () => {
      const values = ['development', 'staging', 'production'];
      const field = configEnumField(values).build();

      expect(field.type).toBe('enum');
      expect(field.validation?.enum).toEqual(values);
    });

    it('should support environment configuration', () => {
      const values = ['debug', 'info', 'warn', 'error'];
      const field = configEnumField(values)
        .required()
        .default('info')
        .envVar('LOG_LEVEL')
        .category('logging')
        .build();

      expect(field.validation?.enum).toEqual(values);
      expect(field.default).toBe('info');
      expect(field.envVar).toBe('LOG_LEVEL');
      expect(field.category).toBe('logging');
    });
  });
});

describe('Convenience Functions', () => {
  describe('emailField', () => {
    it('should create a pre-configured email field', () => {
      const field = emailField().build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('email');
      expect(field.transform).toBe('lowercase');
    });

    it('should allow additional configuration', () => {
      const field = emailField()
        .required()
        .description('User email address')
        .build();

      expect(field.required).toBe(true);
      expect(field.format).toBe('email');
      expect(field.transform).toBe('lowercase');
    });
  });

  describe('urlField', () => {
    it('should create a pre-configured URL field', () => {
      const field = urlField().build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('url');
    });
  });

  describe('uuidField', () => {
    it('should create a pre-configured UUID field', () => {
      const field = uuidField().build();

      expect(field.type).toBe('string');
      expect(field.format).toBe('uuid');
    });
  });
});

describe('Schema Builder', () => {
  describe('SchemaBuilder class', () => {
    let schema: SchemaBuilder;

    beforeEach(() => {
      schema = new SchemaBuilder();
    });

    it('should build empty schema', () => {
      const result = schema.build();

      expect(result).toEqual({
        input: {},
        config: {},
      });
    });

    it('should add input fields', () => {
      schema.addInput('name', stringField().required().build());
      schema.addInput('age', numberField().min(0).build());

      const result = schema.build();

      expect(result.input.name.type).toBe('string');
      expect(result.input.age.type).toBe('number');
    });

    it('should add config fields', () => {
      schema.addConfig('apiKey', apiKeyField().required().build());
      schema.addConfig('timeout', configStringField().default('30s').build());

      const result = schema.build();

      expect(result.config.apiKey.type).toBe('apiKey');
      expect(result.config.timeout.type).toBe('string');
    });

    it('should support method chaining', () => {
      const result = schema
        .addInput('name', stringField().required().build())
        .addInput('email', emailField().required().build())
        .addConfig('apiKey', apiKeyField().required().build())
        .build();

      expect(Object.keys(result.input)).toHaveLength(2);
      expect(Object.keys(result.config)).toHaveLength(1);
    });
  });

  describe('createSchema function', () => {
    it('should create a new schema builder instance', () => {
      const schema = createSchema();

      expect(schema).toBeInstanceOf(SchemaBuilder);
    });

    it('should create independent instances', () => {
      const schema1 = createSchema();
      const schema2 = createSchema();

      schema1.addInput('field1', stringField().build());
      schema2.addInput('field2', numberField().build());

      const result1 = schema1.build();
      const result2 = schema2.build();

      expect(result1.input.field1).toBeDefined();
      expect(result1.input.field2).toBeUndefined();
      expect(result2.input.field2).toBeDefined();
      expect(result2.input.field1).toBeUndefined();
    });
  });
});

describe('Validation Integration', () => {
  describe('validateField function', () => {
    it('should validate a simple string field', async () => {
      const field = stringField().required().minLength(3).build();

      const validResult = await validateField(field, 'hello');
      const invalidResult = await validateField(field, 'hi');

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate a number field', async () => {
      const field = numberField().required().min(0).max(100).build();

      const validResult = await validateField(field, 50);
      const invalidResult = await validateField(field, 150);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate an array field', async () => {
      const itemType = stringField().required().build();
      const field = arrayField(itemType).minItems(1).maxItems(3).build();

      const validResult = await validateField(field, ['item1', 'item2']);
      const invalidResult = await validateField(field, []);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('validate helper functions', () => {
    it('should validate email addresses', async () => {
      const validResult = await validate.email('user@example.com');
      const invalidResult = await validate.email('invalid-email');

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate URLs', async () => {
      const validResult = await validate.url('https://example.com');
      const invalidResult = await validate.url('not-a-url');

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate positive integers', async () => {
      const validResult = await validate.positiveInteger(42);
      const invalidResult1 = await validate.positiveInteger(-1);
      const invalidResult2 = await validate.positiveInteger(3.14);

      expect(validResult.success).toBe(true);
      expect(invalidResult1.success).toBe(false);
      expect(invalidResult2.success).toBe(false);
    });

    it('should validate non-empty strings', async () => {
      const validResult = await validate.nonEmptyString('hello');
      const invalidResult = await validate.nonEmptyString('');

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate string arrays', async () => {
      const validResult = await validate.stringArray(['a', 'b', 'c'], 1, 5);
      const invalidResult = await validate.stringArray([], 1, 5);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('createValidator function', () => {
    it('should create a validator for a schema', () => {
      const schema = {
        input: {
          name: stringField().required().build(),
          age: numberField().min(0).build(),
        },
        config: {
          apiKey: apiKeyField().required().build(),
        },
      };

      const validator = createValidator(schema);

      expect(validator.validateInput).toBeInstanceOf(Function);
      expect(validator.validateConfig).toBeInstanceOf(Function);
      expect(validator.validateToolData).toBeInstanceOf(Function);
    });

    it('should validate input data', async () => {
      const schema = {
        input: {
          name: stringField().required().build(),
          email: emailField().required().build(),
        },
      };

      const validator = createValidator(schema);

      const validResult = await validator.validateInput({
        name: 'John Doe',
        email: 'john@example.com',
      });

      const invalidResult = await validator.validateInput({
        name: '',
        email: 'invalid-email',
      });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle empty field definitions', () => {
    const field = stringField().build();

    expect(field.type).toBe('string');
    expect(field.required).toBeUndefined();
    expect(field.minLength).toBeUndefined();
  });

  it('should handle conflicting configurations gracefully', () => {
    const field = stringField()
      .required()
      .optional() // This should override required
      .build();

    expect(field.required).toBe(false);
  });

  it('should handle default values making fields optional', () => {
    const field = stringField()
      .required()
      .default('default') // This should make it optional
      .build();

    expect(field.required).toBe(false);
    expect(field.default).toBe('default');
  });

  it('should handle invalid array item types', () => {
    const invalidItemType = { type: 'invalid' } as any;

    expect(() => {
      arrayField(invalidItemType).build();
    }).not.toThrow(); // Should not throw during build, validation happens later
  });

  it('should handle empty object properties', () => {
    const field = objectField({}).build();

    expect(field.type).toBe('object');
    expect(field.properties).toEqual({});
  });

  it('should handle empty enum values', () => {
    const field = enumField([]).build();

    expect(field.type).toBe('enum');
    expect(field.enum).toEqual([]);
  });

  it('should handle complex nested structures', () => {
    const userSchema = objectField({
      profile: objectField({
        personal: objectField({
          name: stringField().required().build(),
          age: numberField().min(0).build(),
        }).build(),
        contacts: arrayField(
          objectField({
            type: enumField(['email', 'phone']).required().build(),
            value: stringField().required().build(),
          }).build()
        ).build(),
      }).build(),
      preferences: objectField({
        theme: enumField(['light', 'dark']).default('light').build(),
        notifications: booleanField().default(true).build(),
      }).build(),
    });

    const field = userSchema.build();

    expect(field.type).toBe('object');
    expect(field.properties?.profile?.type).toBe('object');

    // Check nested structure
    const profileProps = (field.properties?.profile as any)?.properties;
    expect(profileProps?.personal?.type).toBe('object');
    expect(profileProps?.contacts?.type).toBe('array');
  });
});

describe('Documentation Generation', () => {
  describe('DocumentationGenerator', () => {
    it('should generate OpenAPI schema for basic fields', () => {
      const stringFieldDef = stringField()
        .required()
        .minLength(3)
        .maxLength(50)
        .description('A test string field')
        .example('test')
        .build();

      const schema =
        DocumentationGenerator.generateOpenAPISchema(stringFieldDef);

      expect(schema).toEqual({
        type: 'string',
        description: 'A test string field',
        example: 'test',
        minLength: 3,
        maxLength: 50,
      });
    });

    it('should generate OpenAPI schema for number fields', () => {
      const numberFieldDef = numberField()
        .required()
        .min(0)
        .max(100)
        .integer()
        .description('A test number field')
        .build();

      const schema =
        DocumentationGenerator.generateOpenAPISchema(numberFieldDef);

      expect(schema).toEqual({
        type: 'integer',
        description: 'A test number field',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should generate OpenAPI schema for array fields', () => {
      const arrayFieldDef = arrayField(stringField().required().build())
        .minItems(1)
        .maxItems(5)
        .unique()
        .build();

      const schema =
        DocumentationGenerator.generateOpenAPISchema(arrayFieldDef);

      expect(schema.type).toBe('array');
      expect(schema.minItems).toBe(1);
      expect(schema.maxItems).toBe(5);
      expect(schema.uniqueItems).toBe(true);
      expect(schema.items.type).toBe('string');
    });

    it('should generate OpenAPI schema for object fields', () => {
      const objectFieldDef = objectField({
        name: stringField().required().build(),
        age: numberField().min(0).build(),
      })
        .requiredProperties(['name'])
        .additionalProperties(false)
        .build();

      const schema =
        DocumentationGenerator.generateOpenAPISchema(objectFieldDef);

      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['name']);
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.age.type).toBe('number');
    });

    it('should generate complete tool documentation', () => {
      const toolSchema = {
        input: {
          message: stringField()
            .required()
            .description('Message to process')
            .example('Hello world')
            .build(),
          count: numberField().min(1).max(10).default(1).build(),
        },
        config: {
          apiKey: apiKeyField()
            .required()
            .description('API key for authentication')
            .build(),
        },
      };

      const doc = DocumentationGenerator.generateToolDocumentation(toolSchema, {
        name: 'Test Tool',
        description: 'A test tool for demonstration',
        version: '1.0.0',
      });

      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('Test Tool');
      expect(doc.info.description).toBe('A test tool for demonstration');
      expect(doc.info.version).toBe('1.0.0');

      // Check paths
      expect(doc.paths).toHaveProperty('/api/execute');
      expect(doc.paths).toHaveProperty('/health');
      expect(doc.paths).toHaveProperty('/schema');

      // Check request body schema
      const requestSchema =
        doc.paths['/api/execute'].post.requestBody.content['application/json']
          .schema;
      expect(requestSchema.properties.input_data.properties.message.type).toBe(
        'string'
      );
      expect(requestSchema.properties.config.properties.apiKey.type).toBe(
        'string'
      );
    });
  });

  describe('SchemaBuilder documentation generation', () => {
    it('should generate documentation from SchemaBuilder', () => {
      const schema = createSchema()
        .addInput(
          'name',
          stringField().required().description('User name').build()
        )
        .addInput(
          'email',
          emailField().required().description('User email').build()
        )
        .addConfig(
          'timeout',
          configStringField()
            .default('30s')
            .description('Request timeout')
            .build()
        );

      const doc = schema.generateDocumentation({
        name: 'User Tool',
        description: 'Tool for user management',
        version: '2.0.0',
      });

      expect(doc.info.title).toBe('User Tool');
      expect(doc.info.version).toBe('2.0.0');

      const inputSchema =
        doc.paths['/api/execute'].post.requestBody.content['application/json']
          .schema.properties.input_data;
      expect(inputSchema.properties.name.description).toBe('User name');
      expect(inputSchema.properties.email.format).toBe('email');
      expect(inputSchema.required).toEqual(['name', 'email']);
    });

    it('should generate example requests from SchemaBuilder', () => {
      const schema = createSchema()
        .addInput('city', stringField().required().example('Madrid').build())
        .addInput(
          'units',
          enumField(['celsius', 'fahrenheit']).default('celsius').build()
        )
        .addInput('days', numberField().min(1).max(7).build())
        .addConfig('apiKey', apiKeyField().required().build());

      const example = schema.generateExampleRequest();

      expect(example.input_data.city).toBe('Madrid');
      expect(example.input_data.units).toBe('celsius');
      expect(example.input_data.days).toBeGreaterThanOrEqual(1);
      expect(example.input_data.days).toBeLessThanOrEqual(7);
      expect(example.config.apiKey).toBe('sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    });
  });

  describe('createValidator with documentation', () => {
    it('should include documentation generation in validator', () => {
      const schema = {
        input: {
          query: stringField()
            .required()
            .description('Search query')
            .example('nodejs tutorial')
            .build(),
        },
        config: {
          maxResults: configStringField()
            .default('10')
            .description('Maximum number of results')
            .build(),
        },
      };

      const validator = createValidator(schema);
      const doc = validator.generateDocumentation({
        name: 'Search Tool',
        description: 'Search engine tool',
        version: '1.5.0',
      });

      expect(doc.info.title).toBe('Search Tool');
      expect(doc.info.version).toBe('1.5.0');

      const inputProps =
        doc.paths['/api/execute'].post.requestBody.content['application/json']
          .schema.properties.input_data.properties;
      expect(inputProps.query.description).toBe('Search query');
      expect(inputProps.query.example).toBe('nodejs tutorial');
    });
  });
});

describe('Performance Tests', () => {
  it('should handle large schemas efficiently', () => {
    const startTime = Date.now();

    const schema = createSchema();

    // Add many fields
    for (let i = 0; i < 100; i++) {
      schema.addInput(`field${i}`, stringField().required().build());
      schema.addConfig(`config${i}`, configStringField().build());
    }

    const result = schema.build();
    const endTime = Date.now();

    expect(Object.keys(result.input)).toHaveLength(100);
    expect(Object.keys(result.config)).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should build complex fields quickly', () => {
    const startTime = Date.now();

    // Create a complex nested structure
    const complexField = objectField({
      users: arrayField(
        objectField({
          id: uuidField().required().build(),
          name: stringField().required().minLength(1).maxLength(100).build(),
          email: emailField().required().build(),
          age: numberField().min(0).max(120).integer().build(),
          roles: arrayField(enumField(['admin', 'user', 'guest']).build())
            .minItems(1)
            .build(),
          metadata: objectField({
            createdAt: datetimeField().required().build(),
            updatedAt: datetimeField().build(),
            tags: arrayField(stringField().build()).unique().build(),
          }).build(),
        }).build()
      )
        .minItems(1)
        .build(),
    });

    const field = complexField.build();
    const endTime = Date.now();

    expect(field.type).toBe('object');
    expect(endTime - startTime).toBeLessThan(50); // Should be very fast
  });

  it('should generate documentation efficiently', () => {
    const startTime = Date.now();

    const schema = createSchema();

    // Add many fields with complex structures
    for (let i = 0; i < 50; i++) {
      schema.addInput(
        `user${i}`,
        objectField({
          id: uuidField().required().build(),
          profile: objectField({
            name: stringField().required().build(),
            email: emailField().required().build(),
            tags: arrayField(stringField().build()).build(),
          }).build(),
        }).build()
      );
    }

    const doc = schema.generateDocumentation({
      name: 'Performance Test Tool',
      version: '1.0.0',
    });

    const endTime = Date.now();

    expect(doc.info.title).toBe('Performance Test Tool');
    expect(endTime - startTime).toBeLessThan(200); // Should complete in under 200ms
  });
});
