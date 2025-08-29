# Error Handling

This guide covers comprehensive error handling strategies for AI Spine tools, including error types, recovery patterns, logging, and best practices for creating robust, production-ready tools that gracefully handle all types of failures.

## Table of Contents

- [Error Handling Philosophy](#error-handling-philosophy)
- [Error Types and Classification](#error-types-and-classification)
- [Error Response Formats](#error-response-formats)
- [Input Validation Errors](#input-validation-errors)
- [Configuration Errors](#configuration-errors)
- [Execution Errors](#execution-errors)
- [Network and External Service Errors](#network-and-external-service-errors)
- [Error Recovery Patterns](#error-recovery-patterns)
- [Logging and Monitoring](#logging-and-monitoring)
- [Testing Error Scenarios](#testing-error-scenarios)
- [Best Practices](#best-practices)

---

## Error Handling Philosophy

### Fail Fast, Fail Gracefully

Design tools that detect errors early and provide meaningful feedback:

```typescript
const robustWeatherTool = createTool({
  metadata: {
    name: 'robust-weather-tool',
    version: '1.0.0',
    description: 'Weather tool with comprehensive error handling',
    capabilities: ['weather.current']
  },

  schema: {
    input: {
      city: stringField()
        .required()
        .minLength(2)
        .maxLength(100)
        .pattern('^[a-zA-Z\\s\\-\\.]+$')
        .description('City name (letters, spaces, hyphens, dots only)')
        .example('Madrid')
    },

    config: {
      apiKey: apiKeyField()
        .required()
        .pattern('^[a-f0-9]{32}$')
        .envVar('WEATHER_API_KEY')
        .description('32-character hexadecimal API key')
    }
  },

  execute: async (input, config, context) => {
    const startTime = Date.now();
    
    try {
      // Early validation (fail fast)
      if (!input.city?.trim()) {
        return createValidationError(
          'EMPTY_CITY',
          'City name cannot be empty',
          'city',
          input.city
        );
      }

      // Configuration validation
      if (!config.apiKey) {
        return createConfigurationError(
          'MISSING_API_KEY',
          'Weather API key is required for tool operation'
        );
      }

      // Execute with proper error boundaries
      const weatherData = await fetchWeatherWithRetry(
        input.city, 
        config.apiKey,
        {
          maxRetries: 3,
          timeout: 10000,
          backoffMs: 1000
        }
      );

      return {
        status: 'success',
        data: weatherData,
        timing: createTimingInfo(startTime, context)
      };

    } catch (error) {
      // Comprehensive error handling (fail gracefully)
      return handleExecutionError(error, input, context, startTime);
    }
  }
});

// Helper functions for consistent error creation
function createValidationError(
  code: string, 
  message: string, 
  field?: string, 
  value?: any
): ToolExecutionResult {
  return {
    status: 'error',
    error: {
      code,
      message,
      type: 'validation_error',
      field,
      details: value !== undefined ? { invalidValue: value } : undefined,
      retryable: false
    }
  };
}

function createConfigurationError(
  code: string, 
  message: string
): ToolExecutionResult {
  return {
    status: 'error',
    error: {
      code,
      message,
      type: 'configuration_error',
      retryable: false
    }
  };
}
```

### Error Categorization

Classify errors by type, severity, and recoverability:

```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  EXECUTION_ERROR = 'execution_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  SYSTEM_ERROR = 'system_error',
  CLIENT_ERROR = 'client_error',
  SERVER_ERROR = 'server_error'
}

enum ErrorSeverity {
  LOW = 'low',           // Warning, doesn't prevent execution
  MEDIUM = 'medium',     // Error, prevents current operation
  HIGH = 'high',         // Critical error, affects tool functionality
  CRITICAL = 'critical'  // System error, tool may be unusable
}

interface ErrorContext {
  type: ErrorType;
  severity: ErrorSeverity;
  retryable: boolean;
  userActionRequired: boolean;
  category: string;
}
```

---

## Error Types and Classification

### Validation Errors

Handle input data validation failures:

```typescript
class ValidationErrorHandler {
  static handleFieldValidation(
    field: string,
    value: any,
    validationResult: ValidationResult
  ): ToolExecutionResult {
    if (validationResult.success) {
      throw new Error('ValidationErrorHandler called with successful validation');
    }

    // Determine specific validation failure
    const error = validationResult.errors[0];
    let errorCode: string;
    let userMessage: string;

    switch (error.code) {
      case 'REQUIRED_FIELD_MISSING':
        errorCode = `${field.toUpperCase()}_REQUIRED`;
        userMessage = `${field} is required but was not provided`;
        break;
      
      case 'STRING_TOO_SHORT':
        errorCode = `${field.toUpperCase()}_TOO_SHORT`;
        userMessage = `${field} must be at least ${error.constraint} characters long`;
        break;
      
      case 'STRING_TOO_LONG':
        errorCode = `${field.toUpperCase()}_TOO_LONG`;
        userMessage = `${field} must be no more than ${error.constraint} characters long`;
        break;
      
      case 'INVALID_FORMAT':
        errorCode = `${field.toUpperCase()}_INVALID_FORMAT`;
        userMessage = `${field} format is invalid. Expected: ${error.expectedFormat}`;
        break;
      
      case 'VALUE_OUT_OF_RANGE':
        errorCode = `${field.toUpperCase()}_OUT_OF_RANGE`;
        userMessage = `${field} must be between ${error.min} and ${error.max}`;
        break;
      
      default:
        errorCode = `${field.toUpperCase()}_VALIDATION_ERROR`;
        userMessage = `${field} validation failed: ${error.message}`;
    }

    return {
      status: 'error',
      error: {
        code: errorCode,
        message: userMessage,
        type: 'validation_error',
        field,
        retryable: false,
        details: {
          providedValue: this.sanitizeValue(value),
          validationErrors: validationResult.errors.map(e => ({
            code: e.code,
            message: e.message,
            constraint: e.constraint
          }))
        }
      }
    };
  }

  private static sanitizeValue(value: any): any {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '... [truncated]';
    }
    
    if (typeof value === 'object' && value !== null) {
      try {
        const jsonStr = JSON.stringify(value);
        return jsonStr.length > 200 
          ? jsonStr.substring(0, 200) + '... [truncated]'
          : value;
      } catch {
        return '[object - cannot serialize]';
      }
    }
    
    return value;
  }
}

// Usage in tool execution
execute: async (input, config, context) => {
  // Validate each field individually for specific error messages
  const cityValidation = await validateField(
    stringField().required().minLength(2).maxLength(50).build(),
    input.city,
    'city'
  );

  if (!cityValidation.success) {
    return ValidationErrorHandler.handleFieldValidation(
      'city', 
      input.city, 
      cityValidation
    );
  }

  // Continue with execution...
}
```

### Configuration Errors

Handle tool setup and configuration issues:

```typescript
class ConfigurationErrorHandler {
  static validateRequiredConfig(
    config: any,
    requiredFields: string[]
  ): ToolExecutionResult | null {
    const missing = requiredFields.filter(field => !config[field]);
    
    if (missing.length > 0) {
      return {
        status: 'error',
        error: {
          code: 'MISSING_CONFIGURATION',
          message: `Required configuration missing: ${missing.join(', ')}`,
          type: 'configuration_error',
          retryable: false,
          details: {
            missingFields: missing,
            availableFields: Object.keys(config),
            configurationGuide: this.getConfigurationHelp(missing)
          }
        }
      };
    }

    return null;
  }

  static validateApiKey(apiKey: string, serviceName: string): ToolExecutionResult | null {
    if (!apiKey) {
      return {
        status: 'error',
        error: {
          code: 'MISSING_API_KEY',
          message: `${serviceName} API key is required`,
          type: 'configuration_error',
          retryable: false,
          details: {
            service: serviceName,
            configurationHint: `Set ${serviceName.toUpperCase()}_API_KEY environment variable`
          }
        }
      };
    }

    // Validate API key format
    if (!this.isValidApiKeyFormat(apiKey, serviceName)) {
      return {
        status: 'error',
        error: {
          code: 'INVALID_API_KEY_FORMAT',
          message: `${serviceName} API key format is invalid`,
          type: 'configuration_error',
          retryable: false,
          details: {
            service: serviceName,
            expectedFormat: this.getExpectedKeyFormat(serviceName),
            providedFormat: `${apiKey.substring(0, 8)}...`
          }
        }
      };
    }

    return null;
  }

  static async validateApiConnection(
    apiKey: string,
    baseUrl: string,
    serviceName: string
  ): Promise<ToolExecutionResult | null> {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 401) {
        return {
          status: 'error',
          error: {
            code: 'INVALID_API_CREDENTIALS',
            message: `${serviceName} API key is invalid or expired`,
            type: 'configuration_error',
            retryable: false,
            details: {
              service: serviceName,
              httpStatus: response.status,
              troubleshooting: [
                'Verify API key is correct',
                'Check if API key has expired',
                'Ensure API key has required permissions'
              ]
            }
          }
        };
      }

      if (response.status === 403) {
        return {
          status: 'error',
          error: {
            code: 'INSUFFICIENT_API_PERMISSIONS',
            message: `${serviceName} API key lacks required permissions`,
            type: 'configuration_error',
            retryable: false,
            details: {
              service: serviceName,
              httpStatus: response.status,
              requiredPermissions: ['read', 'weather_data']
            }
          }
        };
      }

      if (!response.ok) {
        return {
          status: 'error',
          error: {
            code: 'API_CONNECTION_FAILED',
            message: `Cannot connect to ${serviceName} API`,
            type: 'configuration_error',
            retryable: true,
            details: {
              service: serviceName,
              httpStatus: response.status,
              endpoint: `${baseUrl}/health`
            }
          }
        };
      }

      return null; // No error

    } catch (error: any) {
      return {
        status: 'error',
        error: {
          code: 'API_CONNECTION_ERROR',
          message: `Failed to connect to ${serviceName} API: ${error.message}`,
          type: 'network_error',
          retryable: true,
          details: {
            service: serviceName,
            endpoint: baseUrl,
            errorType: error.name,
            timeout: error.name === 'AbortError'
          }
        }
      };
    }
  }

  private static isValidApiKeyFormat(apiKey: string, serviceName: string): boolean {
    const formats: Record<string, RegExp> = {
      'openweathermap': /^[a-f0-9]{32}$/,
      'openai': /^sk-[a-zA-Z0-9]{48}$/,
      'github': /^ghp_[a-zA-Z0-9]{36}$/,
      'stripe': /^sk_(live|test)_[a-zA-Z0-9]{24,}$/
    };

    const format = formats[serviceName.toLowerCase()];
    return format ? format.test(apiKey) : true; // Allow unknown formats
  }

  private static getExpectedKeyFormat(serviceName: string): string {
    const formats: Record<string, string> = {
      'openweathermap': '32-character hexadecimal string',
      'openai': 'sk-[48 alphanumeric characters]',
      'github': 'ghp_[36 alphanumeric characters]',
      'stripe': 'sk_live_ or sk_test_ followed by 24+ characters'
    };

    return formats[serviceName.toLowerCase()] || 'service-specific format';
  }

  private static getConfigurationHelp(missingFields: string[]): string[] {
    const help: string[] = [];
    
    missingFields.forEach(field => {
      switch (field) {
        case 'apiKey':
          help.push('Set API key in environment variable or config');
          break;
        case 'baseUrl':
          help.push('Specify the service endpoint URL');
          break;
        case 'timeout':
          help.push('Set request timeout in milliseconds (default: 10000)');
          break;
        default:
          help.push(`Configure ${field} parameter`);
      }
    });

    return help;
  }
}
```

---

## Error Response Formats

### Standardized Error Structure

Use consistent error response format:

```typescript
interface StandardErrorResponse {
  status: 'error';
  error: {
    code: string;                    // Machine-readable error code
    message: string;                 // Human-readable error message
    type: ErrorType;                 // Error category
    field?: string;                  // Field name for validation errors
    retryable: boolean;              // Whether operation can be retried
    retryAfterMs?: number;          // Suggested retry delay
    httpStatusCode?: number;         // HTTP equivalent status
    details?: Record<string, any>;   // Additional error context
  };
  timing?: {
    executionTimeMs: number;
    startedAt: string;
    completedAt: string;
    timedOut?: boolean;
  };
  warnings?: Array<{
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

class ErrorResponseBuilder {
  static createValidationError(
    code: string,
    message: string,
    field?: string,
    details?: any
  ): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code,
        message,
        type: ErrorType.VALIDATION_ERROR,
        field,
        retryable: false,
        httpStatusCode: 400,
        details
      }
    };
  }

  static createNetworkError(
    code: string,
    message: string,
    retryable: boolean = true,
    retryAfterMs?: number
  ): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code,
        message,
        type: ErrorType.NETWORK_ERROR,
        retryable,
        retryAfterMs,
        httpStatusCode: retryable ? 503 : 502
      }
    };
  }

  static createTimeoutError(
    timeoutMs: number,
    operation: string
  ): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code: 'OPERATION_TIMEOUT',
        message: `${operation} timed out after ${timeoutMs}ms`,
        type: ErrorType.TIMEOUT_ERROR,
        retryable: true,
        httpStatusCode: 504,
        details: {
          timeoutMs,
          operation,
          suggestion: 'Consider increasing timeout or check service availability'
        }
      }
    };
  }

  static createRateLimitError(
    limit: number,
    windowMs: number,
    retryAfterMs: number
  ): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit of ${limit} requests per ${windowMs}ms exceeded`,
        type: ErrorType.CLIENT_ERROR,
        retryable: true,
        retryAfterMs,
        httpStatusCode: 429,
        details: {
          limit,
          windowMs,
          retryAfterMs
        }
      }
    };
  }

  static createSystemError(
    code: string,
    message: string,
    error?: Error
  ): StandardErrorResponse {
    return {
      status: 'error',
      error: {
        code,
        message,
        type: ErrorType.SYSTEM_ERROR,
        retryable: false,
        httpStatusCode: 500,
        details: {
          errorName: error?.name,
          stackTrace: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      }
    };
  }
}
```

---

## Input Validation Errors

### Comprehensive Input Validation

Handle all types of input validation failures:

```typescript
class InputValidationHandler {
  static async validateToolInput(
    input: any,
    schema: Record<string, ToolInputField>
  ): Promise<ToolExecutionResult | null> {
    const errors: Array<{
      field: string;
      code: string;
      message: string;
      value: any;
    }> = [];

    // Validate each field
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const value = input[fieldName];
      const validation = await this.validateSingleField(fieldName, value, fieldDef);
      
      if (!validation.success) {
        errors.push(...validation.errors);
      }
    }

    // Check for unexpected fields
    const allowedFields = new Set(Object.keys(schema));
    const providedFields = Object.keys(input || {});
    const unexpectedFields = providedFields.filter(field => !allowedFields.has(field));

    if (unexpectedFields.length > 0) {
      errors.push({
        field: 'input',
        code: 'UNEXPECTED_FIELDS',
        message: `Unexpected fields provided: ${unexpectedFields.join(', ')}`,
        value: unexpectedFields
      });
    }

    // Return detailed validation error if any issues found
    if (errors.length > 0) {
      return {
        status: 'error',
        error: {
          code: errors.length === 1 ? errors[0].code : 'VALIDATION_FAILED',
          message: errors.length === 1 
            ? errors[0].message 
            : `${errors.length} validation errors found`,
          type: 'validation_error',
          field: errors.length === 1 ? errors[0].field : undefined,
          retryable: false,
          httpStatusCode: 400,
          details: {
            validationErrors: errors.map(e => ({
              field: e.field,
              code: e.code,
              message: e.message,
              providedValue: this.sanitizeForLogging(e.value)
            })),
            allowedFields: Object.keys(schema),
            schemaInfo: this.generateSchemaHelp(schema)
          }
        }
      };
    }

    return null; // No validation errors
  }

  private static async validateSingleField(
    fieldName: string,
    value: any,
    fieldDef: ToolInputField
  ): Promise<{ success: boolean; errors: any[] }> {
    const errors: any[] = [];

    // Required field check
    if (fieldDef.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        code: 'REQUIRED_FIELD_MISSING',
        message: `${fieldName} is required`,
        value
      });
      return { success: false, errors };
    }

    // Skip further validation if field is optional and not provided
    if (!fieldDef.required && (value === undefined || value === null)) {
      return { success: true, errors: [] };
    }

    // Type validation
    if (!this.validateFieldType(value, fieldDef.type)) {
      errors.push({
        field: fieldName,
        code: 'INVALID_TYPE',
        message: `${fieldName} must be of type ${fieldDef.type}`,
        value: typeof value
      });
      return { success: false, errors };
    }

    // Type-specific validations
    switch (fieldDef.type) {
      case 'string':
        errors.push(...this.validateString(fieldName, value, fieldDef));
        break;
      
      case 'number':
        errors.push(...this.validateNumber(fieldName, value, fieldDef));
        break;
      
      case 'array':
        errors.push(...this.validateArray(fieldName, value, fieldDef));
        break;
      
      case 'object':
        errors.push(...await this.validateObject(fieldName, value, fieldDef));
        break;
      
      case 'enum':
        errors.push(...this.validateEnum(fieldName, value, fieldDef));
        break;
    }

    return { success: errors.length === 0, errors };
  }

  private static validateString(
    fieldName: string,
    value: string,
    fieldDef: ToolInputField
  ): any[] {
    const errors: any[] = [];

    if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
      errors.push({
        field: fieldName,
        code: 'STRING_TOO_SHORT',
        message: `${fieldName} must be at least ${fieldDef.minLength} characters`,
        value: value.length,
        constraint: fieldDef.minLength
      });
    }

    if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
      errors.push({
        field: fieldName,
        code: 'STRING_TOO_LONG',
        message: `${fieldName} must be no more than ${fieldDef.maxLength} characters`,
        value: value.length,
        constraint: fieldDef.maxLength
      });
    }

    if (fieldDef.pattern && !new RegExp(fieldDef.pattern).test(value)) {
      errors.push({
        field: fieldName,
        code: 'PATTERN_MISMATCH',
        message: `${fieldName} does not match required pattern`,
        value: value,
        constraint: fieldDef.pattern
      });
    }

    if (fieldDef.format) {
      const formatError = this.validateStringFormat(fieldName, value, fieldDef.format);
      if (formatError) {
        errors.push(formatError);
      }
    }

    return errors;
  }

  private static validateNumber(
    fieldName: string,
    value: number,
    fieldDef: ToolInputField
  ): any[] {
    const errors: any[] = [];

    if (fieldDef.min !== undefined && value < fieldDef.min) {
      errors.push({
        field: fieldName,
        code: 'NUMBER_TOO_SMALL',
        message: `${fieldName} must be at least ${fieldDef.min}`,
        value,
        constraint: fieldDef.min
      });
    }

    if (fieldDef.max !== undefined && value > fieldDef.max) {
      errors.push({
        field: fieldName,
        code: 'NUMBER_TOO_LARGE',
        message: `${fieldName} must be no more than ${fieldDef.max}`,
        value,
        constraint: fieldDef.max
      });
    }

    if (fieldDef.integer && !Number.isInteger(value)) {
      errors.push({
        field: fieldName,
        code: 'NOT_INTEGER',
        message: `${fieldName} must be an integer`,
        value,
        constraint: 'integer'
      });
    }

    return errors;
  }

  private static validateArray(
    fieldName: string,
    value: any[],
    fieldDef: ToolInputField
  ): any[] {
    const errors: any[] = [];

    if (fieldDef.minItems !== undefined && value.length < fieldDef.minItems) {
      errors.push({
        field: fieldName,
        code: 'ARRAY_TOO_SHORT',
        message: `${fieldName} must have at least ${fieldDef.minItems} items`,
        value: value.length,
        constraint: fieldDef.minItems
      });
    }

    if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
      errors.push({
        field: fieldName,
        code: 'ARRAY_TOO_LONG',
        message: `${fieldName} must have no more than ${fieldDef.maxItems} items`,
        value: value.length,
        constraint: fieldDef.maxItems
      });
    }

    if (fieldDef.uniqueItems) {
      const seen = new Set();
      const duplicates: any[] = [];
      
      value.forEach((item, index) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          duplicates.push({ index, value: item });
        } else {
          seen.add(key);
        }
      });

      if (duplicates.length > 0) {
        errors.push({
          field: fieldName,
          code: 'DUPLICATE_ITEMS',
          message: `${fieldName} must contain unique items`,
          value: duplicates,
          constraint: 'uniqueItems'
        });
      }
    }

    return errors;
  }

  private static validateEnum(
    fieldName: string,
    value: any,
    fieldDef: ToolInputField
  ): any[] {
    if (!fieldDef.enum || !fieldDef.enum.includes(value)) {
      return [{
        field: fieldName,
        code: 'INVALID_ENUM_VALUE',
        message: `${fieldName} must be one of: ${fieldDef.enum?.join(', ')}`,
        value,
        constraint: fieldDef.enum
      }];
    }

    return [];
  }

  private static validateStringFormat(
    fieldName: string,
    value: string,
    format: string
  ): any | null {
    const formatValidators: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      hostname: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    };

    const validator = formatValidators[format];
    if (validator && !validator.test(value)) {
      return {
        field: fieldName,
        code: 'INVALID_FORMAT',
        message: `${fieldName} is not a valid ${format}`,
        value,
        expectedFormat: format
      };
    }

    return null;
  }

  private static validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      default: return true;
    }
  }

  private static sanitizeForLogging(value: any): any {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 97) + '...';
    }
    return value;
  }

  private static generateSchemaHelp(schema: Record<string, ToolInputField>): any {
    return Object.entries(schema).reduce((help, [field, def]) => {
      help[field] = {
        type: def.type,
        required: def.required,
        description: def.description,
        example: def.example
      };
      return help;
    }, {} as any);
  }
}
```

---

## Network and External Service Errors

### Robust Network Error Handling

Handle network failures, timeouts, and service unavailability:

```typescript
class NetworkErrorHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelayMs?: number;
      backoffMultiplier?: number;
      maxDelayMs?: number;
      timeoutMs?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      backoffMultiplier = 2,
      maxDelayMs = 30000,
      timeoutMs = 10000,
      retryCondition = this.defaultRetryCondition
    } = options;

    let lastError: any;
    let delayMs = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Apply timeout to operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
        });

        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        return result as T;

      } catch (error: any) {
        lastError = error;

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!retryCondition(error)) {
          throw error;
        }

        // Log retry attempt
        console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms`, {
          error: error.message,
          errorType: error.name,
          attempt: attempt + 1
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Increase delay for next attempt
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
      }
    }

    // All retries exhausted
    throw this.createRetryExhaustedError(lastError, maxRetries);
  }

  private static defaultRetryCondition(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx responses
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true;
    }

    if (error.code && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
      return true;
    }

    if (error.response?.status >= 500) {
      return true;
    }

    if (error.response?.status === 429) { // Rate limited
      return true;
    }

    return false;
  }

  private static createRetryExhaustedError(lastError: any, maxRetries: number): Error {
    const error = new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
    error.name = 'RetryExhaustedError';
    (error as any).originalError = lastError;
    (error as any).attempts = maxRetries + 1;
    return error;
  }

  static handleFetchError(
    error: any,
    url: string,
    serviceName: string
  ): ToolExecutionResult {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        status: 'error',
        error: {
          code: 'REQUEST_TIMEOUT',
          message: `Request to ${serviceName} timed out`,
          type: 'timeout_error',
          retryable: true,
          retryAfterMs: 5000,
          details: {
            service: serviceName,
            url,
            timeout: true
          }
        }
      };
    }

    if (error.code === 'ECONNREFUSED') {
      return {
        status: 'error',
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `${serviceName} service is unavailable`,
          type: 'network_error',
          retryable: true,
          retryAfterMs: 10000,
          details: {
            service: serviceName,
            url,
            networkError: error.code
          }
        }
      };
    }

    if (error.code === 'ENOTFOUND') {
      return {
        status: 'error',
        error: {
          code: 'DNS_RESOLUTION_FAILED',
          message: `Cannot resolve ${serviceName} service address`,
          type: 'network_error',
          retryable: false,
          details: {
            service: serviceName,
            url,
            dnsError: true
          }
        }
      };
    }

    return {
      status: 'error',
      error: {
        code: 'NETWORK_ERROR',
        message: `Network error communicating with ${serviceName}: ${error.message}`,
        type: 'network_error',
        retryable: true,
        details: {
          service: serviceName,
          url,
          errorName: error.name,
          errorCode: error.code
        }
      }
    };
  }

  static handleHttpError(
    response: Response,
    serviceName: string
  ): ToolExecutionResult {
    const statusCode = response.status;

    switch (Math.floor(statusCode / 100)) {
      case 4: // Client errors
        return this.handleClientError(statusCode, serviceName, response);
      
      case 5: // Server errors
        return this.handleServerError(statusCode, serviceName, response);
      
      default:
        return {
          status: 'error',
          error: {
            code: 'HTTP_ERROR',
            message: `HTTP ${statusCode} from ${serviceName}`,
            type: 'network_error',
            retryable: false,
            httpStatusCode: statusCode,
            details: {
              service: serviceName,
              httpStatus: statusCode
            }
          }
        };
    }
  }

  private static handleClientError(
    statusCode: number,
    serviceName: string,
    response: Response
  ): ToolExecutionResult {
    switch (statusCode) {
      case 400:
        return {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message: `Invalid request to ${serviceName}`,
            type: 'client_error',
            retryable: false,
            httpStatusCode: 400,
            details: {
              service: serviceName,
              suggestion: 'Check request parameters'
            }
          }
        };

      case 401:
        return {
          status: 'error',
          error: {
            code: 'UNAUTHORIZED',
            message: `Invalid credentials for ${serviceName}`,
            type: 'configuration_error',
            retryable: false,
            httpStatusCode: 401,
            details: {
              service: serviceName,
              suggestion: 'Check API key configuration'
            }
          }
        };

      case 403:
        return {
          status: 'error',
          error: {
            code: 'FORBIDDEN',
            message: `Access denied by ${serviceName}`,
            type: 'configuration_error',
            retryable: false,
            httpStatusCode: 403,
            details: {
              service: serviceName,
              suggestion: 'Check API key permissions'
            }
          }
        };

      case 404:
        return {
          status: 'error',
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Requested resource not found on ${serviceName}`,
            type: 'client_error',
            retryable: false,
            httpStatusCode: 404,
            details: {
              service: serviceName,
              suggestion: 'Check resource identifier'
            }
          }
        };

      case 429:
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

        return {
          status: 'error',
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limit exceeded for ${serviceName}`,
            type: 'client_error',
            retryable: true,
            retryAfterMs,
            httpStatusCode: 429,
            details: {
              service: serviceName,
              retryAfter: retryAfter || '60 seconds'
            }
          }
        };

      default:
        return {
          status: 'error',
          error: {
            code: 'CLIENT_ERROR',
            message: `Client error (${statusCode}) from ${serviceName}`,
            type: 'client_error',
            retryable: false,
            httpStatusCode: statusCode,
            details: {
              service: serviceName,
              httpStatus: statusCode
            }
          }
        };
    }
  }

  private static handleServerError(
    statusCode: number,
    serviceName: string,
    response: Response
  ): ToolExecutionResult {
    switch (statusCode) {
      case 500:
        return {
          status: 'error',
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: `${serviceName} internal server error`,
            type: 'server_error',
            retryable: true,
            retryAfterMs: 10000,
            httpStatusCode: 500,
            details: {
              service: serviceName,
              suggestion: 'Service may be experiencing issues'
            }
          }
        };

      case 502:
        return {
          status: 'error',
          error: {
            code: 'BAD_GATEWAY',
            message: `${serviceName} bad gateway`,
            type: 'server_error',
            retryable: true,
            retryAfterMs: 15000,
            httpStatusCode: 502,
            details: {
              service: serviceName,
              suggestion: 'Service proxy may be down'
            }
          }
        };

      case 503:
        return {
          status: 'error',
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `${serviceName} is temporarily unavailable`,
            type: 'server_error',
            retryable: true,
            retryAfterMs: 20000,
            httpStatusCode: 503,
            details: {
              service: serviceName,
              suggestion: 'Service may be under maintenance'
            }
          }
        };

      case 504:
        return {
          status: 'error',
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: `${serviceName} gateway timeout`,
            type: 'timeout_error',
            retryable: true,
            retryAfterMs: 30000,
            httpStatusCode: 504,
            details: {
              service: serviceName,
              suggestion: 'Service may be overloaded'
            }
          }
        };

      default:
        return {
          status: 'error',
          error: {
            code: 'SERVER_ERROR',
            message: `Server error (${statusCode}) from ${serviceName}`,
            type: 'server_error',
            retryable: true,
            retryAfterMs: 10000,
            httpStatusCode: statusCode,
            details: {
              service: serviceName,
              httpStatus: statusCode
            }
          }
        };
    }
  }
}
```

---

## Error Recovery Patterns

### Circuit Breaker Pattern

Prevent cascading failures with circuit breaker:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000,
    private readonly monitoringWindow: number = 10000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service calls blocked');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }
      this.failureCount = 0;
      
      return result;

    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Usage in tool
const weatherApiCircuitBreaker = new CircuitBreaker(5, 60000);

const fetchWeatherWithCircuitBreaker = async (city: string, apiKey: string) => {
  try {
    return await weatherApiCircuitBreaker.execute(async () => {
      const response = await fetch(`https://api.weather.com/v1/current?q=${city}&key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }
      
      return response.json();
    });

  } catch (error: any) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      return {
        status: 'error',
        error: {
          code: 'SERVICE_CIRCUIT_OPEN',
          message: 'Weather service is temporarily blocked due to repeated failures',
          type: 'server_error',
          retryable: true,
          retryAfterMs: 60000,
          details: {
            circuitBreakerState: weatherApiCircuitBreaker.getState(),
            suggestion: 'Service will be retried automatically after cooldown period'
          }
        }
      };
    }

    throw error;
  }
};
```

### Fallback Strategies

Implement graceful degradation with fallbacks:

```typescript
class FallbackHandler {
  static async executeWithFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    options: {
      primaryTimeoutMs?: number;
      fallbackTimeoutMs?: number;
      logFallback?: boolean;
    } = {}
  ): Promise<T> {
    const {
      primaryTimeoutMs = 10000,
      fallbackTimeoutMs = 5000,
      logFallback = true
    } = options;

    try {
      // Try primary operation with timeout
      const result = await Promise.race([
        primary(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Primary operation timeout')), primaryTimeoutMs)
        )
      ]);

      return result;

    } catch (primaryError) {
      if (logFallback) {
        console.warn('Primary operation failed, attempting fallback', {
          error: primaryError.message,
          timestamp: new Date().toISOString()
        });
      }

      try {
        // Try fallback operation with timeout
        const fallbackResult = await Promise.race([
          fallback(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Fallback operation timeout')), fallbackTimeoutMs)
          )
        ]);

        return fallbackResult;

      } catch (fallbackError) {
        // Both primary and fallback failed
        const combinedError = new Error(
          `Both primary and fallback operations failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`
        );
        (combinedError as any).primaryError = primaryError;
        (combinedError as any).fallbackError = fallbackError;
        throw combinedError;
      }
    }
  }
}

// Weather tool with fallback
const weatherToolWithFallback = createTool({
  // ... metadata and schema

  execute: async (input, config, context) => {
    try {
      return await FallbackHandler.executeWithFallback(
        // Primary: Real weather API
        async () => {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${input.city}&appid=${config.apiKey}`
          );
          
          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          return {
            status: 'success',
            data: {
              city: data.name,
              temperature: Math.round(data.main.temp - 273.15), // Convert from Kelvin
              description: data.weather[0].description,
              source: 'openweathermap'
            }
          };
        },

        // Fallback: Mock/cached weather data
        async () => {
          console.warn(`Using fallback weather data for ${input.city}`);
          
          return {
            status: 'success',
            data: {
              city: input.city,
              temperature: 20, // Default temperature
              description: 'partly cloudy',
              source: 'fallback',
              warning: 'Real-time weather data unavailable, showing fallback data'
            },
            warnings: [{
              code: 'FALLBACK_DATA_USED',
              message: 'Weather service unavailable, using fallback data',
              severity: 'medium' as const
            }]
          };
        }
      );

    } catch (error: any) {
      return {
        status: 'error',
        error: {
          code: 'WEATHER_SERVICE_FAILED',
          message: 'Unable to retrieve weather data from any source',
          type: 'execution_error',
          retryable: true,
          details: {
            primaryError: error.primaryError?.message,
            fallbackError: error.fallbackError?.message,
            city: input.city
          }
        }
      };
    }
  }
});
```

---

## Logging and Monitoring

### Comprehensive Error Logging

Implement structured error logging:

```typescript
class ErrorLogger {
  static logError(
    error: any,
    context: {
      toolName: string;
      executionId: string;
      operation: string;
      input?: any;
      config?: any;
      userId?: string;
    }
  ): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      toolName: context.toolName,
      executionId: context.executionId,
      operation: context.operation,
      error: {
        name: error.name || 'Error',
        message: error.message,
        code: error.code,
        type: error.type || 'unknown',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      context: {
        userId: context.userId,
        input: this.sanitizeForLogging(context.input),
        config: this.sanitizeConfig(context.config)
      },
      environment: process.env.NODE_ENV || 'unknown',
      nodeVersion: process.version,
      platform: process.platform
    };

    // Log to console (structured)
    console.error('Tool Execution Error:', JSON.stringify(errorEntry, null, 2));

    // Send to monitoring service
    this.sendToMonitoring(errorEntry);

    // Send to error tracking service
    this.sendToErrorTracking(error, errorEntry);
  }

  static logWarning(
    message: string,
    context: {
      toolName: string;
      executionId: string;
      operation: string;
      details?: any;
    }
  ): void {
    const warningEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARNING',
      message,
      toolName: context.toolName,
      executionId: context.executionId,
      operation: context.operation,
      details: context.details
    };

    console.warn('Tool Warning:', JSON.stringify(warningEntry, null, 2));
    this.sendToMonitoring(warningEntry);
  }

  private static sanitizeForLogging(input: any): any {
    if (!input) return input;

    const sanitized = { ...input };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  private static sanitizeConfig(config: any): any {
    if (!config) return config;

    const sanitized: any = {};
    for (const [key, value] of Object.entries(config)) {
      // Always redact config values for security
      sanitized[key] = key.toLowerCase().includes('key') || 
                      key.toLowerCase().includes('secret') || 
                      key.toLowerCase().includes('password') 
                      ? '[REDACTED]' 
                      : '[CONFIG_VALUE]';
    }
    return sanitized;
  }

  private static async sendToMonitoring(entry: any): Promise<void> {
    try {
      // Send to monitoring service (e.g., DataDog, New Relic)
      if (process.env.MONITORING_ENDPOINT) {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      console.error('Failed to send to monitoring service:', error);
    }
  }

  private static async sendToErrorTracking(error: any, context: any): Promise<void> {
    try {
      // Send to error tracking service (e.g., Sentry, Rollbar)
      if (process.env.ERROR_TRACKING_ENDPOINT) {
        await fetch(process.env.ERROR_TRACKING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              type: error.constructor.name
            },
            context,
            tags: {
              tool: context.toolName,
              environment: process.env.NODE_ENV
            }
          })
        });
      }
    } catch (trackingError) {
      console.error('Failed to send to error tracking service:', trackingError);
    }
  }
}

// Usage in tool execution
execute: async (input, config, context) => {
  try {
    // Tool execution logic
    const result = await performWeatherLookup(input.city, config.apiKey);
    return result;

  } catch (error) {
    // Log the error with full context
    ErrorLogger.logError(error, {
      toolName: 'weather-tool',
      executionId: context.executionId,
      operation: 'weather-lookup',
      input,
      config,
      userId: context.userId
    });

    // Return structured error response
    return NetworkErrorHandler.handleFetchError(error, 'weather-api', 'OpenWeatherMap');
  }
}
```

---

## Testing Error Scenarios

### Error Scenario Testing

Test all error conditions:

```typescript
import { testTool, MockManager } from '@ai-spine/tools-testing';

describe('Error Handling Tests', () => {
  let weatherTool: any;
  let mockManager: MockManager;

  beforeEach(() => {
    weatherTool = createWeatherTool();
    mockManager = new MockManager();
  });

  afterEach(async () => {
    await mockManager.cleanup();
  });

  describe('Input Validation Errors', () => {
    test('should handle missing required fields', async () => {
      const result = await testTool(weatherTool, {
        input: {}, // Missing required 'city' field
        config: { apiKey: 'test-key' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('CITY_REQUIRED');
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.field).toBe('city');
      expect(result.error?.retryable).toBe(false);
    });

    test('should handle invalid field types', async () => {
      const result = await testTool(weatherTool, {
        input: { city: 123 }, // Wrong type
        config: { apiKey: 'test-key' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_TYPE');
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.retryable).toBe(false);
    });

    test('should handle field constraint violations', async () => {
      const result = await testTool(weatherTool, {
        input: { city: 'A' }, // Too short
        config: { apiKey: 'test-key' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('CITY_TOO_SHORT');
      expect(result.error?.details?.constraint).toBe(2);
    });
  });

  describe('Configuration Errors', () => {
    test('should handle missing API key', async () => {
      const result = await testTool(weatherTool, {
        input: { city: 'Madrid' },
        config: {} // Missing API key
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('MISSING_API_KEY');
      expect(result.error?.type).toBe('configuration_error');
    });

    test('should handle invalid API key format', async () => {
      const result = await testTool(weatherTool, {
        input: { city: 'Madrid' },
        config: { apiKey: 'invalid-format' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_API_KEY_FORMAT');
      expect(result.error?.type).toBe('configuration_error');
    });
  });

  describe('Network Errors', () => {
    test('should handle service unavailable', async () => {
      await mockManager.simulateServiceDown('weather-api', 8080);

      const result = await testTool(weatherTool, {
        input: { city: 'London' },
        config: { apiKey: 'valid-key-12345678' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.retryable).toBe(true);
    });

    test('should handle request timeout', async () => {
      await mockManager.simulateSlowResponse('weather-api', {
        port: 8080,
        delayMs: 15000 // Longer than tool timeout
      });

      const result = await testTool(weatherTool, {
        input: { city: 'Paris' },
        config: { apiKey: 'valid-key-12345678' }
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('REQUEST_TIMEOUT');
      expect(result.error?.type).toBe('timeout_error');
      expect(result.error?.retryable).toBe(true);
    });

    test('should handle rate limiting', async () => {
      await mockManager.simulateRateLimit('weather-api', {
        port: 8080,
        limit: 1,
        windowMs: 60000
      });

      // First request succeeds
      const firstResult = await testTool(weatherTool, {
        input: { city: 'Berlin' },
        config: { apiKey: 'valid-key-12345678' }
      });
      expect(firstResult.status).toBe('success');

      // Second request hits rate limit
      const secondResult = await testTool(weatherTool, {
        input: { city: 'Munich' },
        config: { apiKey: 'valid-key-12345678' }
      });

      expect(secondResult.status).toBe('error');
      expect(secondResult.error?.code).toBe('RATE_LIMITED');
      expect(secondResult.error?.retryable).toBe(true);
      expect(secondResult.error?.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    test('should retry transient failures', async () => {
      let attemptCount = 0;
      
      await mockManager.createConditionalMock('weather-api', {
        port: 8080,
        condition: () => {
          attemptCount++;
          return attemptCount <= 2; // Fail first 2 attempts
        },
        failureResponse: { status: 503, body: 'Service Unavailable' },
        successResponse: { 
          status: 200, 
          body: { city: 'Amsterdam', temp: 15, description: 'cloudy' } 
        }
      });

      const result = await testTool(weatherTool, {
        input: { city: 'Amsterdam' },
        config: { apiKey: 'valid-key-12345678' }
      });

      expect(result.status).toBe('success');
      expect(attemptCount).toBe(3); // Should retry twice and succeed on 3rd attempt
      expect(result.data.city).toBe('Amsterdam');
    });

    test('should use fallback when primary fails', async () => {
      await mockManager.simulateServiceDown('weather-api', 8080);

      const toolWithFallback = createWeatherToolWithFallback();
      const result = await testTool(toolWithFallback, {
        input: { city: 'Vienna' },
        config: { apiKey: 'valid-key-12345678' }
      });

      expect(result.status).toBe('success');
      expect(result.data.source).toBe('fallback');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('FALLBACK_DATA_USED');
    });
  });

  describe('Error Logging', () => {
    test('should log errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await testTool(weatherTool, {
        input: { city: 'InvalidCity' },
        config: { apiKey: 'invalid-key' }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool Execution Error:'),
        expect.stringContaining('executionId')
      );

      consoleSpy.mockRestore();
    });

    test('should sanitize sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await testTool(weatherTool, {
        input: { city: 'TestCity', password: 'secret123' },
        config: { apiKey: 'secret-api-key' }
      });

      const logCall = consoleSpy.mock.calls[0]?.[1];
      expect(logCall).toContain('[REDACTED]');
      expect(logCall).not.toContain('secret123');
      expect(logCall).not.toContain('secret-api-key');

      consoleSpy.mockRestore();
    });
  });
});
```

---

## Best Practices

### 1. Fail Fast, Fail Clearly

Detect and report errors as early as possible:

```typescript
execute: async (input, config, context) => {
  // Validate early and specifically
  if (!input.city || input.city.trim().length === 0) {
    return {
      status: 'error',
      error: {
        code: 'EMPTY_CITY_NAME',
        message: 'City name is required and cannot be empty',
        type: 'validation_error',
        field: 'city',
        retryable: false
      }
    };
  }

  if (!config.apiKey) {
    return {
      status: 'error',
      error: {
        code: 'MISSING_API_KEY',
        message: 'Weather API key is required. Please configure WEATHER_API_KEY environment variable.',
        type: 'configuration_error',
        retryable: false,
        details: {
          configurationGuide: 'https://docs.example.com/weather-tool-setup'
        }
      }
    };
  }

  // Continue with execution only after validation passes
  // ...
}
```

### 2. Use Consistent Error Codes

Establish clear error code conventions:

```typescript
// Error code format: CATEGORY_SPECIFIC_DESCRIPTION
const ERROR_CODES = {
  // Validation errors
  VALIDATION_FIELD_REQUIRED: 'FIELD_REQUIRED',
  VALIDATION_FIELD_TOO_SHORT: 'FIELD_TOO_SHORT',
  VALIDATION_FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  VALIDATION_INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Configuration errors
  CONFIG_MISSING_API_KEY: 'MISSING_API_KEY',
  CONFIG_INVALID_API_KEY: 'INVALID_API_KEY_FORMAT',
  CONFIG_CONNECTION_FAILED: 'API_CONNECTION_FAILED',
  
  // Network errors
  NETWORK_TIMEOUT: 'REQUEST_TIMEOUT',
  NETWORK_SERVICE_DOWN: 'SERVICE_UNAVAILABLE',
  NETWORK_RATE_LIMITED: 'RATE_LIMITED',
  
  // External service errors
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_NOT_FOUND: 'API_RESOURCE_NOT_FOUND',
  API_SERVER_ERROR: 'API_SERVER_ERROR'
};
```

### 3. Provide Actionable Error Messages

Help users understand and fix errors:

```typescript
const createActionableError = (code: string, userMessage: string, actionableAdvice?: string[]) => ({
  status: 'error',
  error: {
    code,
    message: userMessage,
    type: 'configuration_error',
    retryable: false,
    details: {
      troubleshooting: actionableAdvice || [],
      documentation: 'https://docs.ai-spine.com/troubleshooting',
      support: 'support@ai-spine.com'
    }
  }
});

// Usage
if (invalidApiKey) {
  return createActionableError(
    'INVALID_API_KEY_FORMAT',
    'The provided API key format is invalid',
    [
      'Verify the API key is correctly copied from your provider dashboard',
      'Check that the API key has not expired',
      'Ensure there are no extra spaces or characters',
      'Confirm you are using the correct API key for this service'
    ]
  );
}
```

### 4. Log Errors Appropriately

Balance detail with security:

```typescript
const logExecutionError = (error: any, context: any) => {
  // Production logging - minimal sensitive info
  if (process.env.NODE_ENV === 'production') {
    console.error('Tool execution failed', {
      timestamp: new Date().toISOString(),
      toolName: context.toolName,
      executionId: context.executionId,
      errorCode: error.code,
      errorType: error.type,
      userId: context.userId
      // Don't log input/config in production
    });
  }
  
  // Development logging - full context
  else {
    console.error('Tool execution failed', {
      timestamp: new Date().toISOString(),
      toolName: context.toolName,
      executionId: context.executionId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        type: error.type
      },
      context: {
        input: sanitizeInput(context.input),
        config: sanitizeConfig(context.config),
        userId: context.userId
      }
    });
  }
};
```

### 5. Test Error Scenarios Thoroughly

Include negative testing in your test suite:

```typescript
describe('Error Scenarios', () => {
  // Test each error type
  const errorScenarios = [
    {
      name: 'missing required field',
      input: {},
      expectedError: 'FIELD_REQUIRED'
    },
    {
      name: 'invalid field format',
      input: { email: 'not-an-email' },
      expectedError: 'INVALID_FORMAT'
    },
    {
      name: 'field too long',
      input: { name: 'a'.repeat(101) },
      expectedError: 'FIELD_TOO_LONG'
    }
  ];

  errorScenarios.forEach(scenario => {
    test(`should handle ${scenario.name}`, async () => {
      const result = await testTool(myTool, {
        input: scenario.input,
        config: validConfig
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe(scenario.expectedError);
    });
  });
});
```

Remember: Good error handling is about more than just catching exceptions. It's about creating a robust, user-friendly experience that helps users understand and resolve issues quickly.

For more information, see:
- [Security Implementation](./security.md) - Security-related error handling
- [Testing Strategies](./testing.md) - Testing error scenarios
- [Performance Optimization](./performance.md) - Handling performance-related errors