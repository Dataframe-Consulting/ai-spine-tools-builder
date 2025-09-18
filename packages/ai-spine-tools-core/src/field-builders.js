'use strict';
/**
 * Field builder system for creating tool input and configuration schemas.
 * This module provides a fluent API for defining validation rules in a type-safe manner.
 *
 * @example
 * ```typescript
 * import { stringField, numberField, enumField } from '@ai-spine/tools-core';
 *
 * const schema = {
 *   input: {
 *     city: stringField()
 *       .required()
 *       .minLength(2)
 *       .maxLength(100)
 *       .description('Name of the city to get weather for')
 *       .example('Madrid'),
 *
 *     temperature_units: enumField(['celsius', 'fahrenheit', 'kelvin'])
 *       .optional()
 *       .default('celsius')
 *       .description('Temperature units for response'),
 *
 *     max_results: numberField()
 *       .optional()
 *       .min(1)
 *       .max(10)
 *       .integer()
 *       .default(5)
 *   },
 *   config: {
 *     apiKey: apiKeyField()
 *       .required()
 *       .description('OpenWeatherMap API key')
 *       .envVar('OPENWEATHER_API_KEY')
 *   }
 * };
 * ```
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.validate =
  exports.SchemaBuilder =
  exports.DocumentationGenerator =
    void 0;
exports.stringField = stringField;
exports.numberField = numberField;
exports.booleanField = booleanField;
exports.enumField = enumField;
exports.arrayField = arrayField;
exports.objectField = objectField;
exports.dateField = dateField;
exports.datetimeField = datetimeField;
exports.fileField = fileField;
exports.apiKeyField = apiKeyField;
exports.configStringField = configStringField;
exports.urlConfigField = urlConfigField;
exports.configEnumField = configEnumField;
exports.emailField = emailField;
exports.urlField = urlField;
exports.uuidField = uuidField;
exports.timeField = timeField;
exports.createSchema = createSchema;
exports.validateField = validateField;
exports.createValidator = createValidator;
const validation_js_1 = require('./validation.js');
// ===== INPUT FIELD BUILDERS =====
/**
 * Base builder class for input fields. Provides common validation methods
 * that are shared across all field types.
 */
class BaseInputFieldBuilder {
  constructor() {
    this.field = {};
  }
  /**
   * Mark this field as required for tool execution
   */
  required() {
    this.field.required = true;
    return this;
  }
  /**
   * Mark this field as optional (default behavior)
   */
  optional() {
    this.field.required = false;
    return this;
  }
  /**
   * Set a human-readable description for this field
   */
  description(desc) {
    this.field.description = desc;
    return this;
  }
  /**
   * Set a default value for optional fields
   */
  default(value) {
    this.field.default = value;
    this.field.required = false; // Defaults imply optional
    return this;
  }
  /**
   * Set an example value for documentation and testing
   */
  example(value) {
    this.field.example = value;
    return this;
  }
  /**
   * Mark this field as containing sensitive data
   */
  sensitive() {
    this.field.sensitive = true;
    return this;
  }
  /**
   * Enable sanitization for this field
   */
  sanitize() {
    this.field.sanitize = true;
    return this;
  }
  /**
   * Set transformation to apply before validation
   */
  transform(transformation) {
    this.field.transform = transformation;
    return this;
  }
}
/**
 * Builder for string input fields
 */
class StringFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'string';
  }
  /**
   * Set minimum string length
   */
  minLength(length) {
    this.field.minLength = length;
    return this;
  }
  /**
   * Set maximum string length
   */
  maxLength(length) {
    this.field.maxLength = length;
    return this;
  }
  /**
   * Set regex pattern for validation
   */
  pattern(regex) {
    this.field.pattern = regex;
    return this;
  }
  /**
   * Set string format validation
   */
  format(fmt) {
    this.field.format = fmt;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for number input fields
 */
class NumberFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'number';
  }
  /**
   * Set minimum numeric value
   */
  min(value) {
    this.field.min = value;
    return this;
  }
  /**
   * Set maximum numeric value
   */
  max(value) {
    this.field.max = value;
    return this;
  }
  /**
   * Require the number to be an integer
   */
  integer() {
    this.field.integer = true;
    return this;
  }
  /**
   * Set number of decimal places allowed
   */
  precision(places) {
    this.field.precision = places;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for boolean input fields
 */
class BooleanFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'boolean';
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for enum input fields
 */
class EnumFieldBuilder extends BaseInputFieldBuilder {
  constructor(values) {
    super();
    this.field.type = 'enum';
    this.field.enum = values;
  }
  /**
   * Set human-readable labels for enum values
   */
  labels(labels) {
    this.field.enumLabels = labels;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for array input fields
 */
class ArrayFieldBuilder extends BaseInputFieldBuilder {
  constructor(itemType) {
    super();
    this.field.type = 'array';
    this.field.items = itemType;
  }
  /**
   * Set minimum array length
   */
  minItems(count) {
    this.field.minItems = count;
    return this;
  }
  /**
   * Set maximum array length
   */
  maxItems(count) {
    this.field.maxItems = count;
    return this;
  }
  /**
   * Require array items to be unique
   */
  unique() {
    this.field.uniqueItems = true;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for object input fields
 */
class ObjectFieldBuilder extends BaseInputFieldBuilder {
  constructor(properties) {
    super();
    this.field.type = 'object';
    this.field.properties = properties;
  }
  /**
   * Set required properties for the object
   */
  requiredProperties(props) {
    this.field.requiredProperties = props;
    return this;
  }
  /**
   * Allow additional properties beyond those defined
   */
  additionalProperties(allowed = true) {
    this.field.additionalProperties = allowed;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for date input fields
 */
class DateFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'date';
  }
  /**
   * Set minimum date value
   */
  minDate(date) {
    this.field.minDate = date;
    return this;
  }
  /**
   * Set maximum date value
   */
  maxDate(date) {
    this.field.maxDate = date;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for datetime input fields
 */
class DateTimeFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'datetime';
  }
  /**
   * Set minimum datetime value
   */
  minDate(date) {
    this.field.minDate = date;
    return this;
  }
  /**
   * Set maximum datetime value
   */
  maxDate(date) {
    this.field.maxDate = date;
    return this;
  }
  /**
   * Set timezone requirement
   */
  timezone(requirement) {
    this.field.timezone = requirement;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for file input fields
 */
class FileFieldBuilder extends BaseInputFieldBuilder {
  constructor() {
    super();
    this.field.type = 'file';
  }
  /**
   * Set allowed MIME types
   */
  mimeTypes(types) {
    this.field.allowedMimeTypes = types;
    return this;
  }
  /**
   * Set maximum file size in bytes
   */
  maxSize(bytes) {
    this.field.maxFileSize = bytes;
    return this;
  }
  build() {
    return { ...this.field };
  }
}
// ===== CONFIG FIELD BUILDERS =====
/**
 * Base builder for configuration fields
 */
class BaseConfigFieldBuilder {
  constructor() {
    this.field = {};
  }
  /**
   * Mark this configuration field as required
   */
  required() {
    this.field.required = true;
    return this;
  }
  /**
   * Mark this configuration field as optional
   */
  optional() {
    this.field.required = false;
    return this;
  }
  /**
   * Set description for this configuration field
   */
  description(desc) {
    this.field.description = desc;
    return this;
  }
  /**
   * Set default value for optional configuration
   */
  default(value) {
    this.field.default = value;
    this.field.required = false;
    return this;
  }
  /**
   * Mark this field as containing sensitive data
   */
  secret() {
    this.field.secret = true;
    return this;
  }
  /**
   * Set example value for documentation
   */
  example(value) {
    this.field.example = value;
    return this;
  }
  /**
   * Set environment variable name for loading this config
   */
  envVar(name) {
    this.field.envVar = name;
    return this;
  }
  /**
   * Set category for grouping related configs
   */
  category(cat) {
    this.field.category = cat;
    return this;
  }
  /**
   * Allow runtime override of this configuration
   */
  allowRuntimeOverride() {
    this.field.allowRuntimeOverride = true;
    return this;
  }
}
/**
 * Builder for API key configuration fields
 */
class ApiKeyFieldBuilder extends BaseConfigFieldBuilder {
  constructor() {
    super();
    this.field.type = 'apiKey';
    this.field.secret = true; // API keys are always secret
  }
  /**
   * Set regex pattern for API key validation
   */
  pattern(regex) {
    this.field.validation = { ...this.field.validation, pattern: regex };
    return this;
  }
  /**
   * Set custom error message for validation failures
   */
  errorMessage(message) {
    this.field.validation = { ...this.field.validation, errorMessage: message };
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for string configuration fields
 */
class ConfigStringFieldBuilder extends BaseConfigFieldBuilder {
  constructor() {
    super();
    this.field.type = 'string';
  }
  /**
   * Set minimum string length
   */
  minLength(length) {
    this.field.validation = { ...this.field.validation, min: length };
    return this;
  }
  /**
   * Set maximum string length
   */
  maxLength(length) {
    this.field.validation = { ...this.field.validation, max: length };
    return this;
  }
  /**
   * Set regex pattern for validation
   */
  pattern(regex) {
    this.field.validation = { ...this.field.validation, pattern: regex };
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for URL configuration fields
 */
class UrlConfigFieldBuilder extends BaseConfigFieldBuilder {
  constructor() {
    super();
    this.field.type = 'url';
  }
  /**
   * Set allowed protocols (e.g., ['https', 'http'])
   */
  protocols(protocols) {
    this.field.validation = {
      ...this.field.validation,
      allowedProtocols: protocols,
    };
    return this;
  }
  build() {
    return { ...this.field };
  }
}
/**
 * Builder for enum configuration fields
 */
class ConfigEnumFieldBuilder extends BaseConfigFieldBuilder {
  constructor(values) {
    super();
    this.field.type = 'enum';
    this.field.validation = { enum: values };
  }
  build() {
    return { ...this.field };
  }
}
// ===== EXPORTED FACTORY FUNCTIONS =====
/**
 * Create a string input field builder
 */
function stringField() {
  return new StringFieldBuilder();
}
/**
 * Create a number input field builder
 */
function numberField() {
  return new NumberFieldBuilder();
}
/**
 * Create a boolean input field builder
 */
function booleanField() {
  return new BooleanFieldBuilder();
}
/**
 * Create an enum input field builder
 */
function enumField(values) {
  return new EnumFieldBuilder(values);
}
/**
 * Create an array input field builder
 */
function arrayField(itemType) {
  return new ArrayFieldBuilder(itemType);
}
/**
 * Create an object input field builder
 */
function objectField(properties) {
  return new ObjectFieldBuilder(properties);
}
/**
 * Create a date input field builder
 */
function dateField() {
  return new DateFieldBuilder();
}
/**
 * Create a datetime input field builder
 */
function datetimeField() {
  return new DateTimeFieldBuilder();
}
/**
 * Create a file input field builder
 */
function fileField(config) {
  const builder = new FileFieldBuilder();

  if (config) {
    if (config.required) builder.required();
    if (config.description) builder.description(config.description);
    if (config.allowedMimeTypes) builder.mimeTypes(config.allowedMimeTypes);
    if (config.maxFileSize) builder.maxSize(config.maxFileSize);

    // Return the built field when config is provided for consistency
    return builder.build();
  }

  return builder;
}
/**
 * Create an API key configuration field builder
 */
function apiKeyField() {
  return new ApiKeyFieldBuilder();
}
/**
 * Create a string configuration field builder
 */
function configStringField() {
  return new ConfigStringFieldBuilder();
}
/**
 * Create a URL configuration field builder
 */
function urlConfigField() {
  return new UrlConfigFieldBuilder();
}
/**
 * Create an enum configuration field builder
 */
function configEnumField(values) {
  return new ConfigEnumFieldBuilder(values);
}
// ===== CONVENIENCE FUNCTIONS =====
/**
 * Quick builder for commonly used email fields
 */
function emailField() {
  return stringField().format('email').transform('lowercase');
}
/**
 * Quick builder for commonly used URL fields
 */
function urlField() {
  return stringField().format('url');
}
/**
 * Quick builder for UUID fields
 */
function uuidField() {
  return stringField().format('uuid');
}
/**
 * Quick builder for time fields
 */
function timeField() {
  return new (class extends BaseInputFieldBuilder {
    constructor() {
      super();
      this.field.type = 'time';
    }
    build() {
      return { ...this.field };
    }
  })();
}
// ===== DOCUMENTATION GENERATION UTILITIES =====
/**
 * Documentation generator that creates OpenAPI-style documentation from field definitions
 */
class DocumentationGenerator {
  /**
   * Generate OpenAPI schema from field definition
   */
  static generateOpenAPISchema(field) {
    const schema = {
      type: this.mapToOpenAPIType(field.type),
    };
    // Add description
    if (field.description) {
      schema.description = field.description;
    }
    // Add example
    if (field.example !== undefined) {
      schema.example = field.example;
    }
    // Add default value
    if (field.default !== undefined) {
      schema.default = field.default;
    }
    // Type-specific properties
    switch (field.type) {
      case 'string':
        this.addStringProperties(schema, field);
        break;
      case 'number':
        this.addNumberProperties(schema, field);
        break;
      case 'array':
        this.addArrayProperties(schema, field);
        break;
      case 'object':
        this.addObjectProperties(schema, field);
        break;
      case 'enum':
        this.addEnumProperties(schema, field);
        break;
      case 'date':
        schema.format = 'date';
        this.addDateProperties(schema, field);
        break;
      case 'datetime':
        schema.format = 'date-time';
        this.addDateProperties(schema, field);
        break;
      case 'time':
        schema.format = 'time';
        break;
      case 'file':
        schema.format = 'binary';
        this.addFileProperties(schema, field);
        break;
    }
    return schema;
  }
  static mapToOpenAPIType(type) {
    const typeMap = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
      date: 'string',
      datetime: 'string',
      time: 'string',
      email: 'string',
      url: 'string',
      uuid: 'string',
      json: 'object',
      file: 'string',
      enum: 'string',
      apiKey: 'string',
    };
    return typeMap[type] || 'string';
  }
  static addStringProperties(schema, field) {
    if ('minLength' in field && field.minLength !== undefined)
      schema.minLength = field.minLength;
    if ('maxLength' in field && field.maxLength !== undefined)
      schema.maxLength = field.maxLength;
    if ('pattern' in field && field.pattern) schema.pattern = field.pattern;
    if ('format' in field && field.format) schema.format = field.format;
    // Add validation properties
    if ('validation' in field && field.validation) {
      if (field.validation.min !== undefined)
        schema.minLength = field.validation.min;
      if (field.validation.max !== undefined)
        schema.maxLength = field.validation.max;
      if (field.validation.pattern) schema.pattern = field.validation.pattern;
    }
  }
  static addNumberProperties(schema, field) {
    if ('min' in field && field.min !== undefined) schema.minimum = field.min;
    if ('max' in field && field.max !== undefined) schema.maximum = field.max;
    if ('integer' in field && field.integer) schema.type = 'integer';
    // Add validation properties
    if ('validation' in field && field.validation) {
      if (field.validation.min !== undefined)
        schema.minimum = field.validation.min;
      if (field.validation.max !== undefined)
        schema.maximum = field.validation.max;
    }
  }
  static addArrayProperties(schema, field) {
    if ('items' in field && field.items) {
      schema.items = this.generateOpenAPISchema(field.items);
    }
    if ('minItems' in field && field.minItems !== undefined)
      schema.minItems = field.minItems;
    if ('maxItems' in field && field.maxItems !== undefined)
      schema.maxItems = field.maxItems;
    if ('uniqueItems' in field && field.uniqueItems) schema.uniqueItems = true;
    // Add validation properties from field.validation
    // Note: Array validation properties would need to be added to the validation type interface
  }
  static addObjectProperties(schema, field) {
    if ('properties' in field && field.properties) {
      schema.properties = {};
      for (const [key, prop] of Object.entries(field.properties)) {
        schema.properties[key] = this.generateOpenAPISchema(prop);
      }
    }
    if ('requiredProperties' in field && field.requiredProperties?.length) {
      schema.required = field.requiredProperties;
    }
    if (
      'additionalProperties' in field &&
      field.additionalProperties !== undefined
    ) {
      schema.additionalProperties = field.additionalProperties;
    }
  }
  static addEnumProperties(schema, field) {
    if ('enum' in field && field.enum) {
      schema.enum = field.enum;
    }
    // Handle config enum fields that store enum in validation
    if (
      'validation' in field &&
      field.validation &&
      'enum' in field.validation
    ) {
      schema.enum = field.validation.enum;
    }
  }
  static addDateProperties(schema, field) {
    if ('minDate' in field && field.minDate) schema.minimum = field.minDate;
    if ('maxDate' in field && field.maxDate) schema.maximum = field.maxDate;
  }
  static addFileProperties(schema, field) {
    if ('allowedMimeTypes' in field && field.allowedMimeTypes?.length) {
      schema.contentMediaType = field.allowedMimeTypes[0];
      if (field.allowedMimeTypes.length > 1) {
        schema['x-allowed-mime-types'] = field.allowedMimeTypes;
      }
    }
    if ('maxFileSize' in field && field.maxFileSize) {
      schema['x-max-file-size'] = field.maxFileSize;
    }
  }
  /**
   * Generate complete tool documentation from schema
   */
  static generateToolDocumentation(schema, metadata) {
    const doc = {
      openapi: '3.0.3',
      info: {
        title: metadata?.name || 'AI Spine Tool',
        description: metadata?.description || 'An AI Spine compatible tool',
        version: metadata?.version || '1.0.0',
      },
      paths: {
        '/api/execute': {
          post: {
            summary: 'Execute the tool',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {},
                    required: [],
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Tool execution successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                        executionTime: { type: 'number' },
                        executionId: { type: 'string' },
                      },
                    },
                  },
                },
              },
              400: {
                description: 'Validation error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', enum: [false] },
                        error: { type: 'string' },
                        errors: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              path: {
                                type: 'array',
                                items: { type: 'string' },
                              },
                              code: { type: 'string' },
                              message: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/health': {
          get: {
            summary: 'Get tool health status',
            responses: {
              200: {
                description: 'Tool health information',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          enum: ['healthy', 'degraded', 'unhealthy'],
                        },
                        uptime: { type: 'number' },
                        version: { type: 'string' },
                        metrics: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/schema': {
          get: {
            summary: 'Get tool schema documentation',
            responses: {
              200: {
                description: 'Tool schema information',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        metadata: { type: 'object' },
                        schema: { type: 'object' },
                        openapi: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    // Add input and config properties to request schema
    const requestSchema =
      doc.paths['/api/execute'].post.requestBody.content['application/json']
        .schema;
    if (schema.input && Object.keys(schema.input).length > 0) {
      requestSchema.properties.input_data = {
        type: 'object',
        properties: {},
        required: [],
      };
      for (const [key, field] of Object.entries(schema.input)) {
        requestSchema.properties.input_data.properties[key] =
          this.generateOpenAPISchema(field);
        if (field.required) {
          requestSchema.properties.input_data.required.push(key);
        }
      }
      requestSchema.required.push('input_data');
    }
    if (schema.config && Object.keys(schema.config).length > 0) {
      requestSchema.properties.config = {
        type: 'object',
        properties: {},
        required: [],
      };
      for (const [key, field] of Object.entries(schema.config)) {
        requestSchema.properties.config.properties[key] =
          this.generateOpenAPISchema(field);
        if (field.required) {
          requestSchema.properties.config.required.push(key);
        }
      }
    }
    return doc;
  }
}
exports.DocumentationGenerator = DocumentationGenerator;
// ===== SCHEMA VALIDATION UTILITIES =====
/**
 * Schema builder class that provides direct validation capabilities
 * along with field building functionality
 */
class SchemaBuilder {
  constructor() {
    this.inputFields = {};
    this.configFields = {};
    this.validator = new validation_js_1.ZodSchemaValidator();
  }
  /**
   * Add an input field to the schema
   */
  addInput(name, field) {
    this.inputFields[name] = field;
    return this;
  }
  /**
   * Add a config field to the schema
   */
  addConfig(name, field) {
    this.configFields[name] = field;
    return this;
  }
  /**
   * Build the complete schema
   */
  build() {
    return {
      input: { ...this.inputFields },
      config: { ...this.configFields },
    };
  }
  /**
   * Validate input data against the current schema
   */
  async validateInput(data, options) {
    return this.validator.validateInput(data, this.inputFields, options);
  }
  /**
   * Validate config data against the current schema
   */
  async validateConfig(data, options) {
    return this.validator.validateConfig(data, this.configFields, options);
  }
  /**
   * Validate complete tool data (input + config)
   */
  async validateToolData(data, options) {
    const schema = {
      input: this.inputFields,
      config: this.configFields,
    };
    return this.validator.validateToolSchema(data, schema, options);
  }
  /**
   * Test a single field value against its definition
   */
  async testField(fieldName, value, type = 'input') {
    const fields = type === 'input' ? this.inputFields : this.configFields;
    const field = fields[fieldName];
    if (!field) {
      return {
        success: false,
        errors: [
          {
            path: [fieldName],
            code: 'FIELD_NOT_FOUND',
            message: `Field '${fieldName}' not found in ${type} schema`,
          },
        ],
      };
    }
    const testSchema = { [fieldName]: field };
    const testData = { [fieldName]: value };
    if (type === 'input') {
      return this.validator.validateInput(testData, testSchema);
    } else {
      return this.validator.validateConfig(testData, testSchema);
    }
  }
  /**
   * Get performance metrics from the validator
   */
  getMetrics() {
    return this.validator.getMetrics();
  }
  /**
   * Reset validator cache and metrics
   */
  reset() {
    this.validator.reset();
  }
  /**
   * Generate OpenAPI documentation for the current schema
   */
  generateDocumentation(metadata) {
    const schema = this.build();
    return DocumentationGenerator.generateToolDocumentation(schema, metadata);
  }
  /**
   * Generate example request data based on the schema
   */
  generateExampleRequest() {
    const result = {};
    // Generate example input data
    if (Object.keys(this.inputFields).length > 0) {
      result.input_data = {};
      for (const [key, field] of Object.entries(this.inputFields)) {
        result.input_data[key] = this.generateExampleValue(field);
      }
    }
    // Generate example config data
    if (Object.keys(this.configFields).length > 0) {
      result.config = {};
      for (const [key, field] of Object.entries(this.configFields)) {
        result.config[key] = this.generateExampleValue(field);
      }
    }
    return result;
  }
  /**
   * Generate an example value for a field
   */
  generateExampleValue(field) {
    // Use explicit example if provided
    if (field.example !== undefined) {
      return field.example;
    }
    // Use default value if provided
    if (field.default !== undefined) {
      return field.default;
    }
    // Generate based on field type
    switch (field.type) {
      case 'string':
        if ('format' in field) {
          if (field.format === 'email') return 'user@example.com';
          if (field.format === 'url') return 'https://example.com';
          if (field.format === 'uuid')
            return '550e8400-e29b-41d4-a716-446655440000';
        }
        if ('enum' in field && field.enum) return field.enum[0];
        return 'example string';
      case 'number':
        if (
          'min' in field &&
          'max' in field &&
          field.min !== undefined &&
          field.max !== undefined
        ) {
          return Math.floor((field.min + field.max) / 2);
        }
        if ('min' in field && field.min !== undefined) return field.min;
        if ('max' in field && field.max !== undefined) return field.max;
        const isInteger = 'integer' in field && field.integer;
        return isInteger ? 42 : 42.5;
      case 'boolean':
        return true;
      case 'array':
        if ('items' in field && field.items) {
          const itemExample = this.generateExampleValue(field.items);
          return [itemExample];
        }
        return ['item'];
      case 'object':
        const objExample = {};
        if ('properties' in field && field.properties) {
          for (const [key, prop] of Object.entries(field.properties)) {
            objExample[key] = this.generateExampleValue(prop);
          }
        }
        return objExample;
      case 'date':
        return '2023-12-25';
      case 'datetime':
        return '2023-12-25T12:00:00Z';
      case 'time':
        return '12:00:00';
      case 'enum':
        if ('enum' in field && field.enum) return field.enum[0];
        // Handle config enum fields
        if (
          'validation' in field &&
          field.validation &&
          'enum' in field.validation &&
          field.validation.enum
        ) {
          return field.validation.enum[0];
        }
        return 'option1';
      case 'apiKey':
        return 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      case 'file':
        return 'file.txt';
      default:
        return 'example value';
    }
  }
}
exports.SchemaBuilder = SchemaBuilder;
/**
 * Create a new schema builder instance
 */
function createSchema() {
  return new SchemaBuilder();
}
/**
 * Validate a single field value quickly without building a full schema
 */
async function validateField(field, value, fieldName = 'field', options) {
  const validator = new validation_js_1.ZodSchemaValidator();
  const schema = { [fieldName]: field };
  const data = { [fieldName]: value };
  // Check if this is a config field by looking at the type
  const isConfigField =
    'type' in field &&
    (field.type === 'apiKey' ||
      field.type === 'secret' ||
      (field.type === 'url' && 'validation' in field) ||
      (field.type === 'json' &&
        'validation' in field &&
        'jsonSchema' in (field.validation || {})));
  if (isConfigField) {
    // This is a config field
    return validator.validateConfig(data, schema, options);
  } else {
    // This is an input field
    return validator.validateInput(data, schema, options);
  }
}
/**
 * Create a validation function for a specific schema
 */
function createValidator(schema) {
  const validator = new validation_js_1.ZodSchemaValidator();
  return {
    /**
     * Validate input data
     */
    validateInput: async (data, options) => {
      if (!schema.input) {
        throw new Error('No input schema defined');
      }
      return validator.validateInput(data, schema.input, options);
    },
    /**
     * Validate config data
     */
    validateConfig: async (data, options) => {
      if (!schema.config) {
        throw new Error('No config schema defined');
      }
      return validator.validateConfig(data, schema.config, options);
    },
    /**
     * Validate complete tool data
     */
    validateToolData: async (data, options) => {
      if (!schema.input || !schema.config) {
        throw new Error('Both input and config schemas must be defined');
      }
      return validator.validateToolSchema(
        data,
        {
          input: schema.input,
          config: schema.config,
        },
        options
      );
    },
    /**
     * Generate OpenAPI documentation for the schema
     */
    generateDocumentation: metadata => {
      return DocumentationGenerator.generateToolDocumentation(schema, metadata);
    },
    /**
     * Get performance metrics
     */
    getMetrics: () => validator.getMetrics(),
    /**
     * Reset cache and metrics
     */
    reset: () => validator.reset(),
  };
}
// ===== VALIDATION HELPERS =====
/**
 * Quick validation functions for common patterns
 */
exports.validate = {
  /**
   * Validate an email address
   */
  email: async value => {
    return validateField(emailField().required().build(), value, 'email');
  },
  /**
   * Validate a URL
   */
  url: async value => {
    return validateField(urlField().required().build(), value, 'url');
  },
  /**
   * Validate a UUID
   */
  uuid: async value => {
    return validateField(uuidField().required().build(), value, 'uuid');
  },
  /**
   * Validate an API key
   */
  apiKey: async (value, pattern) => {
    const field = apiKeyField().required();
    if (pattern) {
      field.pattern(pattern);
    }
    return validateField(field.build(), value, 'apiKey');
  },
  /**
   * Validate a positive integer
   */
  positiveInteger: async value => {
    return validateField(
      numberField().required().min(1).integer().build(),
      value,
      'positiveInteger'
    );
  },
  /**
   * Validate a non-empty string
   */
  nonEmptyString: async value => {
    return validateField(
      stringField().required().minLength(1).build(),
      value,
      'nonEmptyString'
    );
  },
  /**
   * Validate an array of strings
   */
  stringArray: async (value, minItems, maxItems) => {
    const field = arrayField(stringField().required().build()).required();
    if (minItems !== undefined) field.minItems(minItems);
    if (maxItems !== undefined) field.maxItems(maxItems);
    return validateField(field.build(), value, 'stringArray');
  },
};
//# sourceMappingURL=field-builders.js.map
