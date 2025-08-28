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
- [`dateField()`](./field-builders.md#datefield) - Date field with format validation
- [`timeField()`](./field-builders.md#timefield) - Time field with format validation

### Configuration Fields
- [`apiKeyField()`](./field-builders.md#apikeyfield) - API key configuration field
- [`configStringField()`](./field-builders.md#configstringfield) - String configuration field
- [`configNumberField()`](./field-builders.md#confignumberfield) - Number configuration field
- [`configUrlField()`](./field-builders.md#configurlfield) - URL configuration field

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

## Tool Class

### Core Methods
- [`tool.start(options)`](./tool-class.md#start) - Start the tool server
- [`tool.stop()`](./tool-class.md#stop) - Stop the tool server
- [`tool.restart()`](./tool-class.md#restart) - Restart the tool server
- [`tool.execute(input, config)`](./tool-class.md#execute) - Execute tool directly (testing)

### Configuration Methods
- [`tool.configure(config)`](./tool-class.md#configure) - Set tool configuration
- [`tool.getConfiguration()`](./tool-class.md#getconfiguration) - Get current configuration
- [`tool.validateConfiguration(config)`](./tool-class.md#validateconfiguration) - Validate configuration

### Monitoring Methods
- [`tool.getHealth()`](./tool-class.md#gethealth) - Get tool health status
- [`tool.getMetrics()`](./tool-class.md#getmetrics) - Get performance metrics
- [`tool.getSchema()`](./tool-class.md#getschema) - Get tool schema and documentation

### Event Methods
- [`tool.on(event, handler)`](./tool-class.md#on) - Register event listener
- [`tool.off(event, handler)`](./tool-class.md#off) - Remove event listener
- [`tool.emit(event, data)`](./tool-class.md#emit) - Emit custom event

## Validation System

### Validation Functions
- [`validateInput(input, schema)`](./validation.md#validateinput) - Validate input data against schema
- [`validateConfig(config, schema)`](./validation.md#validateconfig) - Validate configuration data
- [`SchemaValidator`](./validation.md#schemavalidator) - Schema validation class

### Error Classes
- [`ToolError`](./validation.md#toolerror) - Base error class for tool-related errors
- [`ValidationError`](./validation.md#validationerror) - Input/configuration validation errors
- [`ConfigurationError`](./validation.md#configurationerror) - Tool configuration errors
- [`ExecutionError`](./validation.md#executionerror) - Tool execution errors

## CLI Commands

### Main Commands
- [`create-ai-spine-tool <name>`](./cli.md#create-ai-spine-tool) - Create new tool project
- [`create-ai-spine-tool --list-templates`](./cli.md#list-templates) - List available templates
- [`create-ai-spine-tool --validate-templates`](./cli.md#validate-templates) - Validate template system

### Template Options
- [`--template <name>`](./cli.md#template-option) - Specify project template
- [`--language <lang>`](./cli.md#language-option) - Choose TypeScript or JavaScript
- [`--skip-install`](./cli.md#skip-install) - Skip npm install step
- [`--yes`](./cli.md#yes-option) - Use default values for all prompts

## HTTP API Endpoints

All tools automatically expose these REST endpoints:

### Core Endpoints
- [`POST /api/execute`](./http-api.md#post-api-execute) - Execute the tool with input data
- [`GET /health`](./http-api.md#get-health) - Get tool health and status
- [`GET /schema`](./http-api.md#get-schema) - Get OpenAPI schema and documentation
- [`GET /metrics`](./http-api.md#get-metrics) - Get performance metrics

### Request/Response Formats
- [`AISpineExecuteRequest`](./http-api.md#aispineexecuterequest) - Execute request format
- [`AISpineExecuteResponse`](./http-api.md#aispineexecuteresponse) - Execute response format
- [`AISpineHealthResponse`](./http-api.md#aispinenealthresponse) - Health response format

## Testing Utilities

### Test Helpers
- [`testTool(tool, input, config)`](./testing.md#testtool) - Simplified tool testing
- [`MockAISpineClient`](./testing.md#mockaispineclient) - Mock client for integration testing
- [`generateTestData(schema)`](./testing.md#generatetestdata) - Generate test data from schema
- [`MockManager`](./testing.md#mockmanager) - Mock management for testing

### Test Data Generation
- [`createMockInput(schema)`](./testing.md#createmockinput) - Create mock input data
- [`createMockConfig(schema)`](./testing.md#createmockconfig) - Create mock configuration
- [`createInvalidInput(schema)`](./testing.md#createinvalidinput) - Create invalid input for testing

## Advanced APIs

### Plugin System
- [`ToolPlugin`](./plugins.md#toolplugin) - Plugin interface for extending tools
- [`registerPlugin(plugin)`](./plugins.md#registerplugin) - Register a tool plugin
- [`createMiddleware(handler)`](./plugins.md#createmiddleware) - Create request middleware

### Caching System
- [`CacheProvider`](./caching.md#cacheprovider) - Cache provider interface
- [`MemoryCache`](./caching.md#memorycache) - In-memory cache implementation
- [`RedisCache`](./caching.md#rediscache) - Redis cache implementation

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

## Version Compatibility

| SDK Version | Node.js | TypeScript | Key Features |
|-------------|---------|------------|--------------|
| `1.0.0` | `>=18.0.0` | `>=4.5.0` | Core framework, CLI, basic templates |
| `1.1.0` | `>=18.0.0` | `>=4.7.0` | Plugin system, advanced caching |
| `1.2.0` | `>=18.0.0` | `>=4.9.0` | Performance improvements, monitoring |

## Migration Guides

- [Migrating from 0.x to 1.0](../migration/v0-to-v1.md)
- [Breaking Changes Log](../migration/breaking-changes.md)
- [Deprecation Notices](../migration/deprecations.md)

## Related Documentation

- [Getting Started Guide](../getting-started/quick-start.md) - Quick start tutorial
- [Advanced Usage Guides](../advanced/README.md) - Complex implementation patterns
- [Integration Guides](../integration/README.md) - Deployment and CI/CD setup
- [Examples](../examples/README.md) - Working tool examples
- [Best Practices](../best-practices/README.md) - Recommended patterns and approaches

---

**Need help?** Join our [Discord community](https://discord.gg/ai-spine-tools) or check the [FAQ](../community/faq.md).