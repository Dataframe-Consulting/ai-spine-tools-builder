import request from 'supertest';
import { Application } from 'express';
import {
  ToolInput,
  ToolConfig,
  AISpineExecuteRequest,
  ToolInputField,
  ToolConfigField,
} from '@ai-spine/tools-core';

/**
 * Test a tool with supertest
 */
export async function testTool(
  app: Application,
  input: ToolInput,
  config?: ToolConfig,
  expectedStatus = 200
) {
  const requestBody: AISpineExecuteRequest = {
    tool_id: 'test-tool',
    input_data: input,
    config,
  };

  return request(app)
    .post('/execute')
    .send(requestBody)
    .expect(expectedStatus);
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
 * Generate test data for input schema
 */
export function generateTestData(
  schema: Record<string, ToolInputField>,
  overrides: Partial<ToolInput> = {}
): ToolInput {
  const testData: ToolInput = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (fieldName in overrides) {
      testData[fieldName] = overrides[fieldName];
      continue;
    }

    if (fieldSchema.default !== undefined) {
      testData[fieldName] = fieldSchema.default;
      continue;
    }

    if (!fieldSchema.required) {
      continue;
    }

    // Generate test data based on field type
    switch (fieldSchema.type) {
      case 'string':
        if (fieldSchema.enum) {
          testData[fieldName] = fieldSchema.enum[0];
        } else {
          testData[fieldName] = generateStringValue(fieldSchema);
        }
        break;
      
      case 'number':
        testData[fieldName] = generateNumberValue(fieldSchema);
        break;
      
      case 'boolean':
        testData[fieldName] = true;
        break;
      
      case 'array':
        testData[fieldName] = fieldSchema.items 
          ? [generateTestData({ item: fieldSchema.items }).item]
          : ['test-item'];
        break;
      
      case 'object':
        testData[fieldName] = fieldSchema.properties
          ? generateTestData(fieldSchema.properties)
          : { test: 'value' };
        break;
      
      case 'date':
        testData[fieldName] = '2024-01-01';
        break;
      
      case 'time':
        testData[fieldName] = '12:00';
        break;
      
      default:
        testData[fieldName] = 'test-value';
    }
  }

  return testData;
}

/**
 * Generate invalid test data for schema validation testing
 */
export function generateInvalidTestData(
  schema: Record<string, ToolInputField>,
  fieldToInvalidate: string
): ToolInput {
  const validData = generateTestData(schema);
  const fieldSchema = schema[fieldToInvalidate];

  if (!fieldSchema) {
    throw new Error(`Field ${fieldToInvalidate} not found in schema`);
  }

  // Generate invalid value based on field type
  switch (fieldSchema.type) {
    case 'string':
      if (fieldSchema.minLength) {
        validData[fieldToInvalidate] = 'x'.repeat(fieldSchema.minLength - 1);
      } else if (fieldSchema.maxLength) {
        validData[fieldToInvalidate] = 'x'.repeat(fieldSchema.maxLength + 1);
      } else if (fieldSchema.enum) {
        validData[fieldToInvalidate] = 'invalid-enum-value';
      } else {
        validData[fieldToInvalidate] = 123; // Wrong type
      }
      break;
    
    case 'number':
      if (fieldSchema.min !== undefined) {
        validData[fieldToInvalidate] = fieldSchema.min - 1;
      } else if (fieldSchema.max !== undefined) {
        validData[fieldToInvalidate] = fieldSchema.max + 1;
      } else {
        validData[fieldToInvalidate] = 'not-a-number';
      }
      break;
    
    case 'boolean':
      validData[fieldToInvalidate] = 'not-a-boolean';
      break;
    
    case 'array':
      validData[fieldToInvalidate] = 'not-an-array';
      break;
    
    case 'object':
      validData[fieldToInvalidate] = 'not-an-object';
      break;
    
    case 'date':
      validData[fieldToInvalidate] = 'invalid-date';
      break;
    
    case 'time':
      validData[fieldToInvalidate] = '25:00'; // Invalid time
      break;
    
    default:
      validData[fieldToInvalidate] = null;
  }

  return validData;
}

/**
 * Generate configuration test data
 */
export function generateConfigTestData(
  schema: Record<string, ToolConfigField>,
  overrides: Partial<ToolConfig> = {}
): ToolConfig {
  const testConfig: ToolConfig = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (fieldName in overrides) {
      testConfig[fieldName] = overrides[fieldName];
      continue;
    }

    if (fieldSchema.default !== undefined) {
      testConfig[fieldName] = fieldSchema.default;
      continue;
    }

    if (!fieldSchema.required) {
      continue;
    }

    // Generate test data based on field type
    switch (fieldSchema.type) {
      case 'string':
        testConfig[fieldName] = 'test-string-value';
        break;
      
      case 'number':
        testConfig[fieldName] = fieldSchema.validation?.min || 1;
        break;
      
      case 'boolean':
        testConfig[fieldName] = true;
        break;
      
      case 'key':
        testConfig[fieldName] = 'test-api-key-12345';
        break;
      
      default:
        testConfig[fieldName] = 'test-value';
    }
  }

  return testConfig;
}

/**
 * Create test scenarios for comprehensive tool testing
 */
export function createTestScenarios(
  inputSchema: Record<string, ToolInputField>,
  configSchema: Record<string, ToolConfigField>
): Array<{
  name: string;
  input: ToolInput;
  config?: ToolConfig;
  expectSuccess: boolean;
  expectedError?: string;
}> {
  const scenarios = [];
  const validInput = generateTestData(inputSchema);
  const validConfig = generateConfigTestData(configSchema);

  // Valid execution scenario
  scenarios.push({
    name: 'Valid input and config',
    input: validInput,
    config: validConfig,
    expectSuccess: true,
  });

  // Test required field validation
  for (const [fieldName, fieldSchema] of Object.entries(inputSchema)) {
    if (fieldSchema.required) {
      const invalidInput = { ...validInput };
      delete invalidInput[fieldName];
      
      scenarios.push({
        name: `Missing required field: ${fieldName}`,
        input: invalidInput,
        config: validConfig,
        expectSuccess: false,
        expectedError: `Required field '${fieldName}' is missing`,
      });
    }
  }

  // Test field validation
  for (const fieldName of Object.keys(inputSchema)) {
    try {
      const invalidInput = generateInvalidTestData(inputSchema, fieldName);
      
      scenarios.push({
        name: `Invalid ${fieldName} field`,
        input: invalidInput,
        config: validConfig,
        expectSuccess: false,
        expectedError: 'validation',
      });
    } catch (error) {
      // Skip if invalid data generation fails
      continue;
    }
  }

  // Test edge cases
  scenarios.push(
    {
      name: 'Empty input object',
      input: {},
      config: validConfig,
      expectSuccess: false,
      expectedError: 'Required field',
    },
    {
      name: 'Null input values',
      input: Object.fromEntries(
        Object.keys(validInput).map(key => [key, null])
      ),
      config: validConfig,
      expectSuccess: false,
      expectedError: 'validation',
    }
  );

  return scenarios;
}

/**
 * Helper functions for generating field values
 */
function generateStringValue(fieldSchema: ToolInputField): string {
  const minLength = fieldSchema.minLength || 1;
  const maxLength = fieldSchema.maxLength || 50;
  const length = Math.min(minLength, Math.floor((minLength + maxLength) / 2));
  
  return 'test-value-' + 'x'.repeat(Math.max(0, length - 11));
}

function generateNumberValue(fieldSchema: ToolInputField): number {
  const min = fieldSchema.min || 0;
  const max = fieldSchema.max || 100;
  
  return Math.floor((min + max) / 2);
}

/**
 * Assertions for test results
 */
export const toolAssertions = {
  /**
   * Assert that a tool execution was successful
   */
  expectSuccess(response: any) {
    expect(response.body).toMatchObject({
      execution_id: expect.any(String),
      status: 'success',
      output_data: expect.any(Object),
      execution_time_ms: expect.any(Number),
      timestamp: expect.any(String),
    });
  },

  /**
   * Assert that a tool execution failed with validation error
   */
  expectValidationError(response: any, fieldName?: string) {
    expect(response.body).toMatchObject({
      execution_id: expect.any(String),
      status: 'error',
      error_code: 'VALIDATION_ERROR',
      error_message: expect.any(String),
      execution_time_ms: expect.any(Number),
      timestamp: expect.any(String),
    });

    if (fieldName) {
      expect(response.body.error_message).toContain(fieldName);
    }
  },

  /**
   * Assert that a tool execution failed with configuration error
   */
  expectConfigurationError(response: any) {
    expect(response.body).toMatchObject({
      status: 'error',
      error_code: 'CONFIGURATION_ERROR',
      error_message: expect.any(String),
    });
  },

  /**
   * Assert tool health response
   */
  expectHealthy(response: any) {
    expect(response.body).toMatchObject({
      status: 'healthy',
      version: expect.any(String),
      tool_metadata: {
        name: expect.any(String),
        description: expect.any(String),
        capabilities: expect.any(Array),
      },
      uptime_seconds: expect.any(Number),
    });
  },
};