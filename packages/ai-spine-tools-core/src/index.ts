// Core types and interfaces
export * from './types.js';

// Field builders for creating schemas
export * from './field-builders.js';
export { 
  SchemaBuilder, 
  DocumentationGenerator,
  createSchema, 
  validateField, 
  createValidator, 
  validate 
} from './field-builders.js';

// Validation utilities
export { 
  SchemaValidator, 
  ZodSchemaValidator,
  type ValidationResult,
  type ValidationErrorDetail,
  type ValidationOptions
} from './validation.js';

// Utility functions
export { ToolUtils } from './utils.js';

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
  
  // Error types
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError,
  
  // Utility types
  DeepPartial,
  RequiredFields,
  OptionalFields,
} from './types.js';