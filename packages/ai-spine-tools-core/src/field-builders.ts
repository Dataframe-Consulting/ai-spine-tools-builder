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

import { 
  ToolInputField, 
  ToolConfigField, 
  StringFormat 
} from './types.js';
import { ZodSchemaValidator, ValidationResult, ValidationOptions } from './validation.js';

// ===== INPUT FIELD BUILDERS =====

/**
 * Base builder class for input fields. Provides common validation methods
 * that are shared across all field types.
 */
abstract class BaseInputFieldBuilder<T extends ToolInputField> {
  protected field: Partial<T> = {} as Partial<T>;

  /**
   * Mark this field as required for tool execution
   */
  required(): this {
    this.field.required = true;
    return this;
  }

  /**
   * Mark this field as optional (default behavior)
   */
  optional(): this {
    this.field.required = false;
    return this;
  }

  /**
   * Set a human-readable description for this field
   */
  description(desc: string): this {
    this.field.description = desc;
    return this;
  }

  /**
   * Set a default value for optional fields
   */
  default(value: any): this {
    this.field.default = value;
    this.field.required = false; // Defaults imply optional
    return this;
  }

  /**
   * Set an example value for documentation and testing
   */
  example(value: any): this {
    this.field.example = value;
    return this;
  }

  /**
   * Mark this field as containing sensitive data
   */
  sensitive(): this {
    this.field.sensitive = true;
    return this;
  }

  /**
   * Enable sanitization for this field
   */
  sanitize(): this {
    this.field.sanitize = true;
    return this;
  }

  /**
   * Set transformation to apply before validation
   */
  transform(transformation: 'trim' | 'lowercase' | 'uppercase' | 'normalize'): this {
    this.field.transform = transformation;
    return this;
  }

  /**
   * Build the final field definition
   */
  abstract build(): T;
}

/**
 * Builder for string input fields
 */
class StringFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'string';
  }

  /**
   * Set minimum string length
   */
  minLength(length: number): this {
    this.field.minLength = length;
    return this;
  }

  /**
   * Set maximum string length
   */
  maxLength(length: number): this {
    this.field.maxLength = length;
    return this;
  }

  /**
   * Set regex pattern for validation
   */
  pattern(regex: string): this {
    this.field.pattern = regex;
    return this;
  }

  /**
   * Set string format validation
   */
  format(fmt: StringFormat): this {
    this.field.format = fmt;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for number input fields
 */
class NumberFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'number';
  }

  /**
   * Set minimum numeric value
   */
  min(value: number): this {
    this.field.min = value;
    return this;
  }

  /**
   * Set maximum numeric value
   */
  max(value: number): this {
    this.field.max = value;
    return this;
  }

  /**
   * Require the number to be an integer
   */
  integer(): this {
    this.field.integer = true;
    return this;
  }

  /**
   * Set number of decimal places allowed
   */
  precision(places: number): this {
    this.field.precision = places;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for boolean input fields
 */
class BooleanFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'boolean';
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for enum input fields
 */
class EnumFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(values: any[]) {
    super();
    this.field.type = 'enum';
    this.field.enum = values;
  }

  /**
   * Set human-readable labels for enum values
   */
  labels(labels: string[]): this {
    this.field.enumLabels = labels;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for array input fields
 */
class ArrayFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(itemType: ToolInputField) {
    super();
    this.field.type = 'array';
    this.field.items = itemType;
  }

  /**
   * Set minimum array length
   */
  minItems(count: number): this {
    this.field.minItems = count;
    return this;
  }

  /**
   * Set maximum array length
   */
  maxItems(count: number): this {
    this.field.maxItems = count;
    return this;
  }

  /**
   * Require array items to be unique
   */
  unique(): this {
    this.field.uniqueItems = true;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for object input fields
 */
class ObjectFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(properties: Record<string, ToolInputField>) {
    super();
    this.field.type = 'object';
    this.field.properties = properties;
  }

  /**
   * Set required properties for the object
   */
  requiredProperties(props: string[]): this {
    this.field.requiredProperties = props;
    return this;
  }

  /**
   * Allow additional properties beyond those defined
   */
  additionalProperties(allowed: boolean = true): this {
    this.field.additionalProperties = allowed;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for date input fields
 */
class DateFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'date';
  }

  /**
   * Set minimum date value
   */
  minDate(date: string): this {
    this.field.minDate = date;
    return this;
  }

  /**
   * Set maximum date value
   */
  maxDate(date: string): this {
    this.field.maxDate = date;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for datetime input fields
 */
class DateTimeFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'datetime';
  }

  /**
   * Set minimum datetime value
   */
  minDate(date: string): this {
    this.field.minDate = date;
    return this;
  }

  /**
   * Set maximum datetime value
   */
  maxDate(date: string): this {
    this.field.maxDate = date;
    return this;
  }

  /**
   * Set timezone requirement
   */
  timezone(requirement: 'required' | 'optional' | 'utc-only'): this {
    this.field.timezone = requirement;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

/**
 * Builder for file input fields
 */
class FileFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor() {
    super();
    this.field.type = 'file';
  }

  /**
   * Set allowed MIME types
   */
  mimeTypes(types: string[]): this {
    this.field.allowedMimeTypes = types;
    return this;
  }

  /**
   * Set maximum file size in bytes
   */
  maxSize(bytes: number): this {
    this.field.maxFileSize = bytes;
    return this;
  }

  build(): ToolInputField {
    return { ...this.field } as ToolInputField;
  }
}

// ===== CONFIG FIELD BUILDERS =====

/**
 * Base builder for configuration fields
 */
abstract class BaseConfigFieldBuilder<T extends ToolConfigField> {
  protected field: Partial<T> = {} as Partial<T>;

  /**
   * Mark this configuration field as required
   */
  required(): this {
    this.field.required = true;
    return this;
  }

  /**
   * Mark this configuration field as optional
   */
  optional(): this {
    this.field.required = false;
    return this;
  }

  /**
   * Set description for this configuration field
   */
  description(desc: string): this {
    this.field.description = desc;
    return this;
  }

  /**
   * Set default value for optional configuration
   */
  default(value: any): this {
    this.field.default = value;
    this.field.required = false;
    return this;
  }

  /**
   * Mark this field as containing sensitive data
   */
  secret(): this {
    this.field.secret = true;
    return this;
  }

  /**
   * Set example value for documentation
   */
  example(value: any): this {
    this.field.example = value;
    return this;
  }

  /**
   * Set environment variable name for loading this config
   */
  envVar(name: string): this {
    this.field.envVar = name;
    return this;
  }

  /**
   * Set category for grouping related configs
   */
  category(cat: string): this {
    this.field.category = cat;
    return this;
  }

  /**
   * Allow runtime override of this configuration
   */
  allowRuntimeOverride(): this {
    this.field.allowRuntimeOverride = true;
    return this;
  }

  abstract build(): T;
}

/**
 * Builder for API key configuration fields
 */
class ApiKeyFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor() {
    super();
    this.field.type = 'apiKey';
    this.field.secret = true; // API keys are always secret
  }

  /**
   * Set regex pattern for API key validation
   */
  pattern(regex: string): this {
    this.field.validation = { ...this.field.validation, pattern: regex };
    return this;
  }

  /**
   * Set custom error message for validation failures
   */
  errorMessage(message: string): this {
    this.field.validation = { ...this.field.validation, errorMessage: message };
    return this;
  }

  build(): ToolConfigField {
    return { ...this.field } as ToolConfigField;
  }
}

/**
 * Builder for string configuration fields
 */
class ConfigStringFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor() {
    super();
    this.field.type = 'string';
  }

  /**
   * Set minimum string length
   */
  minLength(length: number): this {
    this.field.validation = { ...this.field.validation, min: length };
    return this;
  }

  /**
   * Set maximum string length
   */
  maxLength(length: number): this {
    this.field.validation = { ...this.field.validation, max: length };
    return this;
  }

  /**
   * Set regex pattern for validation
   */
  pattern(regex: string): this {
    this.field.validation = { ...this.field.validation, pattern: regex };
    return this;
  }

  build(): ToolConfigField {
    return { ...this.field } as ToolConfigField;
  }
}

/**
 * Builder for URL configuration fields
 */
class UrlConfigFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor() {
    super();
    this.field.type = 'url';
  }

  /**
   * Set allowed protocols (e.g., ['https', 'http'])
   */
  protocols(protocols: string[]): this {
    this.field.validation = { ...this.field.validation, allowedProtocols: protocols };
    return this;
  }

  build(): ToolConfigField {
    return { ...this.field } as ToolConfigField;
  }
}

/**
 * Builder for enum configuration fields
 */
class ConfigEnumFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor(values: any[]) {
    super();
    this.field.type = 'enum';
    this.field.validation = { enum: values };
  }

  build(): ToolConfigField {
    return { ...this.field } as ToolConfigField;
  }
}

// ===== EXPORTED FACTORY FUNCTIONS =====

/**
 * Create a string input field builder
 */
export function stringField(): StringFieldBuilder {
  return new StringFieldBuilder();
}

/**
 * Create a number input field builder
 */
export function numberField(): NumberFieldBuilder {
  return new NumberFieldBuilder();
}

/**
 * Create a boolean input field builder
 */
export function booleanField(): BooleanFieldBuilder {
  return new BooleanFieldBuilder();
}

/**
 * Create an enum input field builder
 */
export function enumField(values: any[]): EnumFieldBuilder {
  return new EnumFieldBuilder(values);
}

/**
 * Create an array input field builder
 */
export function arrayField(itemType: ToolInputField): ArrayFieldBuilder {
  return new ArrayFieldBuilder(itemType);
}

/**
 * Create an object input field builder
 */
export function objectField(properties: Record<string, ToolInputField>): ObjectFieldBuilder {
  return new ObjectFieldBuilder(properties);
}

/**
 * Create a date input field builder
 */
export function dateField(): DateFieldBuilder {
  return new DateFieldBuilder();
}

/**
 * Create a datetime input field builder
 */
export function datetimeField(): DateTimeFieldBuilder {
  return new DateTimeFieldBuilder();
}

/**
 * Create a file input field builder
 */
export function fileField(): FileFieldBuilder {
  return new FileFieldBuilder();
}

/**
 * Create an API key configuration field builder
 */
export function apiKeyField(): ApiKeyFieldBuilder {
  return new ApiKeyFieldBuilder();
}

/**
 * Create a string configuration field builder
 */
export function configStringField(): ConfigStringFieldBuilder {
  return new ConfigStringFieldBuilder();
}

/**
 * Create a URL configuration field builder
 */
export function urlConfigField(): UrlConfigFieldBuilder {
  return new UrlConfigFieldBuilder();
}

/**
 * Create an enum configuration field builder
 */
export function configEnumField(values: any[]): ConfigEnumFieldBuilder {
  return new ConfigEnumFieldBuilder(values);
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick builder for commonly used email fields
 */
export function emailField(): StringFieldBuilder {
  return stringField().format('email').transform('lowercase');
}

/**
 * Quick builder for commonly used URL fields
 */
export function urlField(): StringFieldBuilder {
  return stringField().format('url');
}

/**
 * Quick builder for UUID fields
 */
export function uuidField(): StringFieldBuilder {
  return stringField().format('uuid');
}

/**
 * Quick builder for time fields
 */
export function timeField(): BaseInputFieldBuilder<ToolInputField> {
  return new class extends BaseInputFieldBuilder<ToolInputField> {
    constructor() {
      super();
      this.field.type = 'time';
    }
    build(): ToolInputField {
      return { ...this.field } as ToolInputField;
    }
  }();
}

// ===== SCHEMA VALIDATION UTILITIES =====

/**
 * Schema builder class that provides direct validation capabilities
 * along with field building functionality
 */
export class SchemaBuilder {
  private inputFields: Record<string, ToolInputField> = {};
  private configFields: Record<string, ToolConfigField> = {};
  private validator = new ZodSchemaValidator();

  /**
   * Add an input field to the schema
   */
  addInput(name: string, field: ToolInputField): this {
    this.inputFields[name] = field;
    return this;
  }

  /**
   * Add a config field to the schema
   */
  addConfig(name: string, field: ToolConfigField): this {
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
  async validateInput(
    data: any, 
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    return this.validator.validateInput(data, this.inputFields, options);
  }

  /**
   * Validate config data against the current schema
   */
  async validateConfig(
    data: any, 
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    return this.validator.validateConfig(data, this.configFields, options);
  }

  /**
   * Validate complete tool data (input + config)
   */
  async validateToolData(
    data: { input: any; config: any },
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const schema = {
      input: this.inputFields,
      config: this.configFields,
    };
    
    return this.validator.validateToolSchema(data, schema, options);
  }

  /**
   * Test a single field value against its definition
   */
  async testField(
    fieldName: string, 
    value: any, 
    type: 'input' | 'config' = 'input'
  ): Promise<ValidationResult> {
    const fields = type === 'input' ? this.inputFields : this.configFields;
    const field = fields[fieldName];
    
    if (!field) {
      return {
        success: false,
        errors: [{
          path: [fieldName],
          code: 'FIELD_NOT_FOUND',
          message: `Field '${fieldName}' not found in ${type} schema`,
        }],
      };
    }

    const testSchema = { [fieldName]: field };
    const testData = { [fieldName]: value };
    
    if (type === 'input') {
      return this.validator.validateInput(testData, testSchema as Record<string, ToolInputField>);
    } else {
      return this.validator.validateConfig(testData, testSchema as Record<string, ToolConfigField>);
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
  reset(): void {
    this.validator.reset();
  }
}

/**
 * Create a new schema builder instance
 */
export function createSchema(): SchemaBuilder {
  return new SchemaBuilder();
}

/**
 * Validate a single field value quickly without building a full schema
 */
export async function validateField(
  field: ToolInputField | ToolConfigField,
  value: any,
  fieldName: string = 'field',
  options?: ValidationOptions
): Promise<ValidationResult> {
  const validator = new ZodSchemaValidator();
  const schema = { [fieldName]: field };
  const data = { [fieldName]: value };

  // Check if this is a config field by looking at the type
  const isConfigField = 'type' in field && (
    field.type === 'apiKey' || 
    field.type === 'secret' || 
    (field.type === 'url' && 'validation' in field) ||
    (field.type === 'json' && 'validation' in field && 'jsonSchema' in (field.validation || {}))
  );

  if (isConfigField) {
    // This is a config field
    return validator.validateConfig(data, schema as Record<string, ToolConfigField>, options);
  } else {
    // This is an input field
    return validator.validateInput(data, schema as Record<string, ToolInputField>, options);
  }
}

/**
 * Create a validation function for a specific schema
 */
export function createValidator(schema: {
  input?: Record<string, ToolInputField>;
  config?: Record<string, ToolConfigField>;
}) {
  const validator = new ZodSchemaValidator();

  return {
    /**
     * Validate input data
     */
    validateInput: async (data: any, options?: ValidationOptions) => {
      if (!schema.input) {
        throw new Error('No input schema defined');
      }
      return validator.validateInput(data, schema.input, options);
    },

    /**
     * Validate config data
     */
    validateConfig: async (data: any, options?: ValidationOptions) => {
      if (!schema.config) {
        throw new Error('No config schema defined');
      }
      return validator.validateConfig(data, schema.config, options);
    },

    /**
     * Validate complete tool data
     */
    validateToolData: async (data: { input: any; config: any }, options?: ValidationOptions) => {
      if (!schema.input || !schema.config) {
        throw new Error('Both input and config schemas must be defined');
      }
      return validator.validateToolSchema(data, {
        input: schema.input,
        config: schema.config,
      }, options);
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
export const validate = {
  /**
   * Validate an email address
   */
  email: async (value: any): Promise<ValidationResult> => {
    return validateField(emailField().required().build(), value, 'email');
  },

  /**
   * Validate a URL
   */
  url: async (value: any): Promise<ValidationResult> => {
    return validateField(urlField().required().build(), value, 'url');
  },

  /**
   * Validate a UUID
   */
  uuid: async (value: any): Promise<ValidationResult> => {
    return validateField(uuidField().required().build(), value, 'uuid');
  },

  /**
   * Validate an API key
   */
  apiKey: async (value: any, pattern?: string): Promise<ValidationResult> => {
    const field = apiKeyField().required();
    if (pattern) {
      field.pattern(pattern);
    }
    return validateField(field.build(), value, 'apiKey');
  },

  /**
   * Validate a positive integer
   */
  positiveInteger: async (value: any): Promise<ValidationResult> => {
    return validateField(
      numberField().required().min(1).integer().build(),
      value,
      'positiveInteger'
    );
  },

  /**
   * Validate a non-empty string
   */
  nonEmptyString: async (value: any): Promise<ValidationResult> => {
    return validateField(
      stringField().required().minLength(1).build(),
      value,
      'nonEmptyString'
    );
  },

  /**
   * Validate an array of strings
   */
  stringArray: async (value: any, minItems?: number, maxItems?: number): Promise<ValidationResult> => {
    const field = arrayField(stringField().required().build()).required();
    if (minItems !== undefined) field.minItems(minItems);
    if (maxItems !== undefined) field.maxItems(maxItems);
    return validateField(field.build(), value, 'stringArray');
  },
};