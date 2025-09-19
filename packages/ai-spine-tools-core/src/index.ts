// Core types and interfaces
export * from './types.js';
export type { FileInput } from './types.js';

// Error classes (exported as values, not types)
export {
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
} from './types.js';

// Field builders for creating schemas
export * from './field-builders.js';
export {
  SchemaBuilder,
  DocumentationGenerator,
  createSchema,
  validateField,
  createValidator,
  validate,
} from './field-builders.js';

// Validation utilities
export {
  SchemaValidator,
  ZodSchemaValidator,
  type ValidationResult,
  type ValidationErrorDetail,
  type ValidationOptions,
} from './validation.js';

// Utility functions
export { ToolUtils } from './utils.js';

// Tool class for creating and running tools
export {
  Tool,
  type ToolServerConfig,
  type ToolMetrics,
  type ToolState,
  type ToolEvents,
} from './tool.js';

// Re-export commonly used types for convenience
export type {
  // Core interfaces
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

  // Field types
  ToolInputFieldType,
  ToolConfigFieldType,
  StringFormat,

  // API types
  AISpineExecuteRequest,
  AISpineExecuteResponse,
  AISpineHealthResponse,

  // Error classes
  // ToolError,
  // ValidationError,
  // ConfigurationError,
  // ExecutionError,

  // Utility types
  DeepPartial,
  RequiredFields,
  OptionalFields,
} from './types.js';
