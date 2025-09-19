// Export FileInput type explicitly
export type { FileInput } from './types.js';

// Core types and interfaces - explicit exports for proper TypeScript declarations
export type {
  // Tool metadata and configuration
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

  // Utility types
  DeepPartial,
  RequiredFields,
  OptionalFields,
} from './types.js';

// Error classes (exported as values, not types)
export {
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
} from './types.js';

// Field builders for creating schemas
export {
  // Field builder functions
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

  // Schema and validation utilities
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
