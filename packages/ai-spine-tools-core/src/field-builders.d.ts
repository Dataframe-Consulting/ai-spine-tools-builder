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
import { ToolInputField, ToolConfigField, StringFormat } from './types.js';
import { ValidationResult, ValidationOptions } from './validation.js';
/**
 * Base builder class for input fields. Provides common validation methods
 * that are shared across all field types.
 */
declare abstract class BaseInputFieldBuilder<T extends ToolInputField> {
  protected field: Partial<T>;
  /**
   * Mark this field as required for tool execution
   */
  required(): this;
  /**
   * Mark this field as optional (default behavior)
   */
  optional(): this;
  /**
   * Set a human-readable description for this field
   */
  description(desc: string): this;
  /**
   * Set a default value for optional fields
   */
  default(value: any): this;
  /**
   * Set an example value for documentation and testing
   */
  example(value: any): this;
  /**
   * Mark this field as containing sensitive data
   */
  sensitive(): this;
  /**
   * Enable sanitization for this field
   */
  sanitize(): this;
  /**
   * Set transformation to apply before validation
   */
  transform(
    transformation: 'trim' | 'lowercase' | 'uppercase' | 'normalize'
  ): this;
  /**
   * Build the final field definition
   */
  abstract build(): T;
}
/**
 * Builder for string input fields
 */
declare class StringFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  /**
   * Set minimum string length
   */
  minLength(length: number): this;
  /**
   * Set maximum string length
   */
  maxLength(length: number): this;
  /**
   * Set regex pattern for validation
   */
  pattern(regex: string): this;
  /**
   * Set string format validation
   */
  format(fmt: StringFormat): this;
  build(): ToolInputField;
}
/**
 * Builder for number input fields
 */
declare class NumberFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  /**
   * Set minimum numeric value
   */
  min(value: number): this;
  /**
   * Set maximum numeric value
   */
  max(value: number): this;
  /**
   * Require the number to be an integer
   */
  integer(): this;
  /**
   * Set number of decimal places allowed
   */
  precision(places: number): this;
  build(): ToolInputField;
}
/**
 * Builder for boolean input fields
 */
declare class BooleanFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  build(): ToolInputField;
}
/**
 * Builder for enum input fields
 */
declare class EnumFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(values: any[]);
  /**
   * Set human-readable labels for enum values
   */
  labels(labels: string[]): this;
  build(): ToolInputField;
}
/**
 * Builder for array input fields
 */
declare class ArrayFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(itemType: ToolInputField);
  /**
   * Set minimum array length
   */
  minItems(count: number): this;
  /**
   * Set maximum array length
   */
  maxItems(count: number): this;
  /**
   * Require array items to be unique
   */
  unique(): this;
  build(): ToolInputField;
}
/**
 * Builder for object input fields
 */
declare class ObjectFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor(properties: Record<string, ToolInputField>);
  /**
   * Set required properties for the object
   */
  requiredProperties(props: string[]): this;
  /**
   * Allow additional properties beyond those defined
   */
  additionalProperties(allowed?: boolean): this;
  build(): ToolInputField;
}
/**
 * Builder for date input fields
 */
declare class DateFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  /**
   * Set minimum date value
   */
  minDate(date: string): this;
  /**
   * Set maximum date value
   */
  maxDate(date: string): this;
  build(): ToolInputField;
}
/**
 * Builder for datetime input fields
 */
declare class DateTimeFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  /**
   * Set minimum datetime value
   */
  minDate(date: string): this;
  /**
   * Set maximum datetime value
   */
  maxDate(date: string): this;
  /**
   * Set timezone requirement
   */
  timezone(requirement: 'required' | 'optional' | 'utc-only'): this;
  build(): ToolInputField;
}
/**
 * Builder for file input fields
 */
declare class FileFieldBuilder extends BaseInputFieldBuilder<ToolInputField> {
  constructor();
  /**
   * Set allowed MIME types
   */
  mimeTypes(types: string[]): this;
  /**
   * Set maximum file size in bytes
   */
  maxSize(bytes: number): this;
  build(): ToolInputField;
}
/**
 * Base builder for configuration fields
 */
declare abstract class BaseConfigFieldBuilder<T extends ToolConfigField> {
  protected field: Partial<T>;
  /**
   * Mark this configuration field as required
   */
  required(): this;
  /**
   * Mark this configuration field as optional
   */
  optional(): this;
  /**
   * Set description for this configuration field
   */
  description(desc: string): this;
  /**
   * Set default value for optional configuration
   */
  default(value: any): this;
  /**
   * Mark this field as containing sensitive data
   */
  secret(): this;
  /**
   * Set example value for documentation
   */
  example(value: any): this;
  /**
   * Set environment variable name for loading this config
   */
  envVar(name: string): this;
  /**
   * Set category for grouping related configs
   */
  category(cat: string): this;
  /**
   * Allow runtime override of this configuration
   */
  allowRuntimeOverride(): this;
  abstract build(): T;
}
/**
 * Builder for API key configuration fields
 */
declare class ApiKeyFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor();
  /**
   * Set regex pattern for API key validation
   */
  pattern(regex: string): this;
  /**
   * Set custom error message for validation failures
   */
  errorMessage(message: string): this;
  build(): ToolConfigField;
}
/**
 * Builder for string configuration fields
 */
declare class ConfigStringFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor();
  /**
   * Set minimum string length
   */
  minLength(length: number): this;
  /**
   * Set maximum string length
   */
  maxLength(length: number): this;
  /**
   * Set regex pattern for validation
   */
  pattern(regex: string): this;
  build(): ToolConfigField;
}
/**
 * Builder for URL configuration fields
 */
declare class UrlConfigFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor();
  /**
   * Set allowed protocols (e.g., ['https', 'http'])
   */
  protocols(protocols: string[]): this;
  build(): ToolConfigField;
}
/**
 * Builder for enum configuration fields
 */
declare class ConfigEnumFieldBuilder extends BaseConfigFieldBuilder<ToolConfigField> {
  constructor(values: any[]);
  build(): ToolConfigField;
}
/**
 * Create a string input field builder
 */
export declare function stringField(): StringFieldBuilder;
/**
 * Create a number input field builder
 */
export declare function numberField(): NumberFieldBuilder;
/**
 * Create a boolean input field builder
 */
export declare function booleanField(): BooleanFieldBuilder;
/**
 * Create an enum input field builder
 */
export declare function enumField(values: any[]): EnumFieldBuilder;
/**
 * Create an array input field builder
 */
export declare function arrayField(itemType: ToolInputField): ArrayFieldBuilder;
/**
 * Create an object input field builder
 */
export declare function objectField(
  properties: Record<string, ToolInputField>
): ObjectFieldBuilder;
/**
 * Create a date input field builder
 */
export declare function dateField(): DateFieldBuilder;
/**
 * Create a datetime input field builder
 */
export declare function datetimeField(): DateTimeFieldBuilder;
/**
 * Create a file input field builder
 */
export declare function fileField(config?: {
  required?: boolean;
  description?: string;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
}): FileFieldBuilder;
/**
 * Create an API key configuration field builder
 */
export declare function apiKeyField(): ApiKeyFieldBuilder;
/**
 * Create a string configuration field builder
 */
export declare function configStringField(): ConfigStringFieldBuilder;
/**
 * Create a URL configuration field builder
 */
export declare function urlConfigField(): UrlConfigFieldBuilder;
/**
 * Create an enum configuration field builder
 */
export declare function configEnumField(values: any[]): ConfigEnumFieldBuilder;
/**
 * Quick builder for commonly used email fields
 */
export declare function emailField(): StringFieldBuilder;
/**
 * Quick builder for commonly used URL fields
 */
export declare function urlField(): StringFieldBuilder;
/**
 * Quick builder for UUID fields
 */
export declare function uuidField(): StringFieldBuilder;
/**
 * Quick builder for time fields
 */
export declare function timeField(): BaseInputFieldBuilder<ToolInputField>;
/**
 * Documentation generator that creates OpenAPI-style documentation from field definitions
 */
export declare class DocumentationGenerator {
  /**
   * Generate OpenAPI schema from field definition
   */
  static generateOpenAPISchema(field: ToolInputField | ToolConfigField): any;
  private static mapToOpenAPIType;
  private static addStringProperties;
  private static addNumberProperties;
  private static addArrayProperties;
  private static addObjectProperties;
  private static addEnumProperties;
  private static addDateProperties;
  private static addFileProperties;
  /**
   * Generate complete tool documentation from schema
   */
  static generateToolDocumentation(
    schema: {
      input?: Record<string, ToolInputField>;
      config?: Record<string, ToolConfigField>;
    },
    metadata?: {
      name?: string;
      description?: string;
      version?: string;
    }
  ): any;
}
/**
 * Schema builder class that provides direct validation capabilities
 * along with field building functionality
 */
export declare class SchemaBuilder {
  private inputFields;
  private configFields;
  private validator;
  /**
   * Add an input field to the schema
   */
  addInput(name: string, field: ToolInputField): this;
  /**
   * Add a config field to the schema
   */
  addConfig(name: string, field: ToolConfigField): this;
  /**
   * Build the complete schema
   */
  build(): {
    input: {
      [x: string]: ToolInputField;
    };
    config: {
      [x: string]: ToolConfigField;
    };
  };
  /**
   * Validate input data against the current schema
   */
  validateInput(
    data: any,
    options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Validate config data against the current schema
   */
  validateConfig(
    data: any,
    options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Validate complete tool data (input + config)
   */
  validateToolData(
    data: {
      input: any;
      config: any;
    },
    options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Test a single field value against its definition
   */
  testField(
    fieldName: string,
    value: any,
    type?: 'input' | 'config'
  ): Promise<ValidationResult>;
  /**
   * Get performance metrics from the validator
   */
  getMetrics(): {
    cacheHitRate: number;
    currentCacheSize: number;
    totalValidations: number;
    cacheHits: number;
    averageDurationMs: number;
    totalDurationMs: number;
  };
  /**
   * Reset validator cache and metrics
   */
  reset(): void;
  /**
   * Generate OpenAPI documentation for the current schema
   */
  generateDocumentation(metadata?: {
    name?: string;
    description?: string;
    version?: string;
  }): any;
  /**
   * Generate example request data based on the schema
   */
  generateExampleRequest(): {
    input_data?: any;
    config?: any;
  };
  /**
   * Generate an example value for a field
   */
  private generateExampleValue;
}
/**
 * Create a new schema builder instance
 */
export declare function createSchema(): SchemaBuilder;
/**
 * Validate a single field value quickly without building a full schema
 */
export declare function validateField(
  field: ToolInputField | ToolConfigField,
  value: any,
  fieldName?: string,
  options?: ValidationOptions
): Promise<ValidationResult>;
/**
 * Create a validation function for a specific schema
 */
export declare function createValidator(schema: {
  input?: Record<string, ToolInputField>;
  config?: Record<string, ToolConfigField>;
}): {
  /**
   * Validate input data
   */
  validateInput: (
    data: any,
    options?: ValidationOptions
  ) => Promise<ValidationResult<any>>;
  /**
   * Validate config data
   */
  validateConfig: (
    data: any,
    options?: ValidationOptions
  ) => Promise<ValidationResult<any>>;
  /**
   * Validate complete tool data
   */
  validateToolData: (
    data: {
      input: any;
      config: any;
    },
    options?: ValidationOptions
  ) => Promise<ValidationResult<any>>;
  /**
   * Generate OpenAPI documentation for the schema
   */
  generateDocumentation: (metadata?: {
    name?: string;
    description?: string;
    version?: string;
  }) => any;
  /**
   * Get performance metrics
   */
  getMetrics: () => {
    cacheHitRate: number;
    currentCacheSize: number;
    totalValidations: number;
    cacheHits: number;
    averageDurationMs: number;
    totalDurationMs: number;
  };
  /**
   * Reset cache and metrics
   */
  reset: () => void;
};
/**
 * Quick validation functions for common patterns
 */
export declare const validate: {
  /**
   * Validate an email address
   */
  email: (value: any) => Promise<ValidationResult>;
  /**
   * Validate a URL
   */
  url: (value: any) => Promise<ValidationResult>;
  /**
   * Validate a UUID
   */
  uuid: (value: any) => Promise<ValidationResult>;
  /**
   * Validate an API key
   */
  apiKey: (value: any, pattern?: string) => Promise<ValidationResult>;
  /**
   * Validate a positive integer
   */
  positiveInteger: (value: any) => Promise<ValidationResult>;
  /**
   * Validate a non-empty string
   */
  nonEmptyString: (value: any) => Promise<ValidationResult>;
  /**
   * Validate an array of strings
   */
  stringArray: (
    value: any,
    minItems?: number,
    maxItems?: number
  ) => Promise<ValidationResult>;
};
export {};
//# sourceMappingURL=field-builders.d.ts.map
