// Main tool creation and management
export {
  // Core factory functions
  createTool,
  ToolBuilder,

  // Convenience functions
  simpleCreateTool,
  createToolBuilder,

  // Types
  CreateToolOptions,
} from './create-tool';

// Re-export core types and utilities - explicit exports for consistency
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
  DeepPartial,
  RequiredFields,
  OptionalFields,
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
  SchemaValidator,

  // Field builders
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
  emailField,
  urlField,
  uuidField,
  timeField,

  // Schema utilities
  SchemaBuilder,
  DocumentationGenerator,
  createSchema,
  validateField,
  createValidator,
  validate
} from '@ai-spine/tools-core';

// Default export for convenience
export { createTool as default } from './create-tool';
