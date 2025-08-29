# API Reference

Complete reference documentation for all AI Spine Tools SDK APIs, interfaces, and functions.

## Core APIs

### Tool Creation
- [`createTool()`](./tool-creation.md#createtool) - Main factory function for creating tools
- [`ToolBuilder`](./tool-creation.md#toolbuilder) - Fluent API for step-by-step tool construction
- [`simpleCreateTool()`](./tool-creation.md#simplecreatetool) - Quick tool creation for prototyping

### Field Builders
- [`stringField()`](./field-builders.md#stringfield) - String input field with validation
- [`numberField()`](./field-builders.md#numberfield) - Numeric input field with constraints
- [`booleanField()`](./field-builders.md#booleanfield) - Boolean true/false field
- [`arrayField()`](./field-builders.md#arrayfield) - Array field with item validation
- [`objectField()`](./field-builders.md#objectfield) - Complex object field with properties
- [`enumField()`](./field-builders.md#enumfield) - Enumeration field with predefined values
- [`dateField()`](./field-builders.md#datefield-and-datetimefield) - Date field with format validation
- [`fileField()`](./field-builders.md#filefield) - File upload field

### Configuration Fields
- [`apiKeyField()`](./field-builders.md#apikeyfield) - API key configuration field
- [`configStringField()`](./field-builders.md#configstringfield) - String configuration field
- [`urlConfigField()`](./field-builders.md#urlconfigfield) - URL configuration field
- [`configEnumField()`](./field-builders.md#configenumfield) - Enum configuration field

## Core Types

### Tool Definition Types
- [`ToolDefinition<TInput, TConfig>`](./core-types.md#tooldefinition) - Complete tool definition interface
- [`ToolMetadata`](./core-types.md#toolmetadata) - Tool identification and capability metadata
- [`ToolSchema`](./core-types.md#toolschema) - Input and configuration validation schema
- [`ToolExecutionContext`](./core-types.md#toolexecutioncontext) - Execution context and metadata
- [`ToolExecutionResult`](./core-types.md#toolexecutionresult) - Standardized execution result format

### Field Definition Types
- [`ToolInputField`](./core-types.md#toolinputfield) - Input field definition with validation rules
- [`ToolConfigField`](./core-types.md#toolconfigfield) - Configuration field definition
- [`ToolInputFieldType`](./core-types.md#toolinputfieldtype) - Supported input field types
- [`ToolConfigFieldType`](./core-types.md#toolconfigfieldtype) - Supported configuration field types
- [`StringFormat`](./core-types.md#stringformat) - String format validation options

### Utility Types
- [`ToolInput`](./core-types.md#toolinput) - Generic input data interface
- [`ToolConfig`](./core-types.md#toolconfig) - Generic configuration data interface
- [`DeepPartial<T>`](./core-types.md#deeppartial) - Deep partial type utility
- [`RequiredFields<T, K>`](./core-types.md#requiredfields) - Make specific fields required
- [`OptionalFields<T, K>`](./core-types.md#optionalfields) - Make specific fields optional

## Tool Creation Reference

See the [Tool Creation Guide](./tool-creation.md) for complete documentation on:
- `createTool()` function usage and options
- Tool execution patterns and best practices
- Error handling and validation

## Field Builder Reference

See the [Field Builders Guide](./field-builders.md) for complete documentation on:
- Input field types and validation
- Configuration field builders
- Advanced field options and patterns

## Core Types Reference

See the [Core Types Guide](./core-types.md) for complete documentation on:
- Type definitions and interfaces
- Tool metadata and configuration types
- Execution context and result types

## Package Exports

### `@ai-spine/tools` (Main Package)
```typescript
import {
  createTool,
  ToolBuilder,
  createToolBuilder,
  simpleCreateTool,
  // Field builders
  stringField,
  numberField,
  booleanField,
  arrayField,
  objectField,
  enumField,
  dateField,
  timeField,
  // Config field builders
  apiKeyField,
  configStringField,
  configNumberField,
  configUrlField
} from '@ai-spine/tools';
```

### `@ai-spine/tools-core` (Core Types)
```typescript
import {
  // Types
  ToolDefinition,
  ToolMetadata,
  ToolSchema,
  ToolInputField,
  ToolConfigField,
  ToolExecutionContext,
  ToolExecutionResult,
  // Classes
  Tool,
  SchemaValidator,
  // Errors
  ToolError,
  ValidationError,
  ConfigurationError,
  ExecutionError
} from '@ai-spine/tools-core';
```

### `@ai-spine/tools-testing` (Testing Utilities)
```typescript
import {
  testTool,
  MockAISpineClient,
  generateTestData,
  MockManager,
  createMockInput,
  createMockConfig
} from '@ai-spine/tools-testing';
```

## Related Documentation

- [Getting Started Guide](../getting-started/quick-start.md) - Quick start tutorial
- [Advanced Usage Guides](../advanced/README.md) - Complex implementation patterns
- [Integration Guides](../integration/README.md) - Deployment and CI/CD setup
- [Examples](../examples/README.md) - Working tool examples

---

**Need help?** Join our [Discord community](https://discord.gg/ai-spine-tools) or check the [FAQ](../community/faq.md).