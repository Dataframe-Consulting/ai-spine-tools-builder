// Main tool creation and management
export {
  // Core factory functions
  createTool,
  ToolBuilder,
  
  // Input field builders
  stringField,
  numberField,
  booleanField,
  arrayField,
  objectField,
  dateField,
  timeField,
  enumField,
  
  // Config field builders
  apiKeyField,
  configStringField,
  configNumberField,
  configUrlField,
  
  // Convenience functions
  simpleCreateTool,
  createToolBuilder,
  
  // Types
  CreateToolOptions
} from './create-tool';

// Re-export core types and utilities
export * from '@ai-spine/tools-core';

// Default export for convenience
export { createTool as default } from './create-tool';