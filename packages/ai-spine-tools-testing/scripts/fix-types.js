/**
 * Post-build script to generate types for ai-spine-tools-testing
 * This handles superagent type conflicts that prevent automatic generation
 */

const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '..', 'dist', 'index.d.ts');

// Always generate types since rollup skips them due to conflicts
console.log('⚠️  Generating types due to superagent conflicts...');

const typeDefinition = `// Type definitions for @ai-spine/tools-testing
// Generated due to superagent type conflicts

// Re-export types from test-client
export {
  AISpineTestClient,
  TestClientOptions,
  TestExecutionResult,
  PerformanceMetrics,
  LoadTestOptions,
  LoadTestResult,
  ScenarioResult,
  ToolValidationResult,
  RequestEvent,
  ResponseEvent,
  ErrorEvent,
} from './test-client';

// Re-export types from test-helpers
export {
  testTool,
  testToolDirect,
  testToolHealth,
  generateTestData,
  generateInvalidTestData,
  generateConfigTestData,
  createTestScenarios,
  validateToolResponse,
  toolAssertions,
  MockManager,
  PerformanceTester,
  TestServer,
  TestSuiteRunner,
  TestToolOptions,
  TestDataGenerationOptions,
  TestScenariosOptions,
  TestScenario,
  InvalidDataType,
} from './test-helpers';

// Re-export core types for convenience
export type {
  FileInput,
  ToolMetadata,
  ToolInputField,
  ToolConfigField,
  ToolSchema,
  ToolInput,
  ToolConfig,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolHealthCheck,
  ToolDefinition,
  ToolInputFieldType,
  ToolConfigFieldType,
  StringFormat,
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse,
  ValidationResult,
  ValidationErrorDetail,
  ValidationOptions,
  ToolServerConfig,
  ToolMetrics,
  ToolState,
  ToolEvents,
} from '@ai-spine/tools-core';

// Re-export core classes and utilities
export {
  Tool,
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
  ToolUtils,
  ZodSchemaValidator,
  stringField,
  numberField,
  booleanField,
  enumField,
  arrayField,
  objectField,
  dateField,
  datetimeField,
  fileField,
  apiKeyField,
  configStringField,
  urlConfigField,
  configEnumField,
} from '@ai-spine/tools-core';
`;

// Ensure dist directory exists
const distDir = path.dirname(typesPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(typesPath, typeDefinition, 'utf8');
console.log('✅ Generated TypeScript declarations for @ai-spine/tools-testing');