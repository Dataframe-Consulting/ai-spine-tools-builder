// Test client for integration testing
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

// Enhanced test helpers for comprehensive testing
export {
  // Core testing functions
  testTool,
  testToolDirect,
  testToolHealth,

  // Test data generation
  generateTestData,
  generateInvalidTestData,
  generateConfigTestData,

  // Test scenario management
  createTestScenarios,

  // Validation and assertions
  validateToolResponse,
  toolAssertions,

  // Advanced testing utilities
  MockManager,
  PerformanceTester,
  TestServer,
  TestSuiteRunner,

  // Types and interfaces
  TestToolOptions,
  TestDataGenerationOptions,
  TestScenariosOptions,
  TestScenario,
  InvalidDataType,
} from './test-helpers';

// Re-export core types for convenience - explicit exports for consistency
export type {
  // Core types from tools-core
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
  ToolEvents
} from '@ai-spine/tools-core';

export {
  // Core classes and utilities
  Tool,
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
  ToolUtils,
  ZodSchemaValidator,

  // Field builders for test setup
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
  configEnumField
} from '@ai-spine/tools-core';
