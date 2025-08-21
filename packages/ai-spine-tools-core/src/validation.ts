import {
  ToolInputField,
  ToolConfigField,
  ToolInput,
  ToolConfig,
  ValidationError,
  ConfigurationError,
} from './types';

export class SchemaValidator {
  static validateInput(
    input: ToolInput,
    schema: Record<string, ToolInputField>
  ): void {
    const errors: string[] = [];

    // Check required fields
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.required && !(fieldName in input)) {
        errors.push(`Required field '${fieldName}' is missing`);
        continue;
      }

      if (fieldName in input) {
        const value = input[fieldName];
        const fieldErrors = this.validateFieldValue(
          value,
          fieldSchema,
          fieldName
        );
        errors.push(...fieldErrors);
      }
    }

    // Check for unknown fields
    for (const fieldName of Object.keys(input)) {
      if (!(fieldName in schema)) {
        errors.push(`Unknown field '${fieldName}'`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Input validation failed: ${errors.join(', ')}`,
        undefined,
        { errors }
      );
    }
  }

  static validateConfig(
    config: ToolConfig,
    schema: Record<string, ToolConfigField>
  ): void {
    const errors: string[] = [];
    const missingRequired: string[] = [];

    // Check required fields
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      if (fieldSchema.required && !(fieldName in config)) {
        missingRequired.push(fieldName);
        continue;
      }

      if (fieldName in config) {
        const value = config[fieldName];
        const fieldErrors = this.validateConfigFieldValue(
          value,
          fieldSchema,
          fieldName
        );
        errors.push(...fieldErrors);
      }
    }

    if (missingRequired.length > 0) {
      throw new ConfigurationError(
        `Missing required configuration: ${missingRequired.join(', ')}`,
        missingRequired
      );
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Configuration validation failed: ${errors.join(', ')}`,
        undefined,
        { errors }
      );
    }
  }

  private static validateFieldValue(
    value: any,
    schema: ToolInputField,
    fieldName: string
  ): string[] {
    const errors: string[] = [];

    // Type validation
    if (!this.isValidType(value, schema.type)) {
      errors.push(
        `Field '${fieldName}' must be of type ${schema.type}, got ${typeof value}`
      );
      return errors; // Skip other validations if type is wrong
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(
          `Field '${fieldName}' must be at least ${schema.minLength} characters`
        );
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(
          `Field '${fieldName}' must be at most ${schema.maxLength} characters`
        );
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`Field '${fieldName}' does not match required pattern`);
      }
      if (schema.format) {
        const formatError = this.validateFormat(value, schema.format, fieldName);
        if (formatError) errors.push(formatError);
      }
    }

    // Number validations
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`Field '${fieldName}' must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`Field '${fieldName}' must be at most ${schema.max}`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(
        `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`
      );
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.items) {
        value.forEach((item, index) => {
          const itemErrors = this.validateFieldValue(
            item,
            schema.items!,
            `${fieldName}[${index}]`
          );
          errors.push(...itemErrors);
        });
      }
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && value !== null) {
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in value) {
            const propErrors = this.validateFieldValue(
              value[propName],
              propSchema,
              `${fieldName}.${propName}`
            );
            errors.push(...propErrors);
          } else if (propSchema.required) {
            errors.push(`Field '${fieldName}.${propName}' is required`);
          }
        }
      }
    }

    return errors;
  }

  private static validateConfigFieldValue(
    value: any,
    schema: ToolConfigField,
    fieldName: string
  ): string[] {
    const errors: string[] = [];

    // Type validation
    if (schema.type === 'key') {
      if (typeof value !== 'string') {
        errors.push(`Config '${fieldName}' must be a string (API key)`);
      }
    } else if (!this.isValidType(value, schema.type as any)) {
      errors.push(
        `Config '${fieldName}' must be of type ${schema.type}, got ${typeof value}`
      );
      return errors;
    }

    // Validation rules
    if (schema.validation) {
      const { min, max, pattern, enum: enumValues } = schema.validation;

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          errors.push(`Config '${fieldName}' must be at least ${min}`);
        }
        if (max !== undefined && value > max) {
          errors.push(`Config '${fieldName}' must be at most ${max}`);
        }
      }

      if (typeof value === 'string') {
        if (pattern && !new RegExp(pattern).test(value)) {
          errors.push(`Config '${fieldName}' does not match required pattern`);
        }
      }

      if (enumValues && !enumValues.includes(value)) {
        errors.push(
          `Config '${fieldName}' must be one of: ${enumValues.join(', ')}`
        );
      }
    }

    return errors;
  }

  private static isValidType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return this.isValidDate(value);
      case 'time':
        return this.isValidTime(value);
      default:
        return false;
    }
  }

  private static isValidDate(value: any): boolean {
    if (typeof value === 'string') {
      // Check YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) return false;
      
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return value instanceof Date && !isNaN(value.getTime());
  }

  private static isValidTime(value: any): boolean {
    if (typeof value === 'string') {
      // Check HH:MM format
      const timeRegex = /^([0-1]?\d|2[0-3]):[0-5]\d$/;
      return timeRegex.test(value);
    }
    return false;
  }

  private static validateFormat(
    value: string,
    format: string,
    fieldName: string
  ): string | null {
    switch (format) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value)
          ? null
          : `Field '${fieldName}' must be a valid email address`;
      
      case 'url':
        try {
          new URL(value);
          return null;
        } catch {
          return `Field '${fieldName}' must be a valid URL`;
        }
      
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value)
          ? null
          : `Field '${fieldName}' must be a valid UUID`;
      
      default:
        return null;
    }
  }
}