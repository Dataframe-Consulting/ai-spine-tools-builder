# Field Builders API

This document provides comprehensive documentation for the field builder system in the AI Spine Tools SDK. Field builders provide a fluent, type-safe API for defining input validation schemas and configuration fields with automatic OpenAPI documentation generation.

## Table of Contents

- [Overview](#overview)
- [Input Field Builders](#input-field-builders)
- [Configuration Field Builders](#configuration-field-builders)
- [Convenience Functions](#convenience-functions)
- [Schema Building](#schema-building)
- [Validation Utilities](#validation-utilities)
- [Documentation Generation](#documentation-generation)
- [Best Practices](#best-practices)

---

## Overview

Field builders enable declarative schema definition with compile-time type safety and runtime validation. They provide a fluent API that makes complex validation rules easy to read and maintain.

### Basic Usage

```typescript
import { 
  stringField, 
  numberField, 
  booleanField, 
  enumField, 
  arrayField,
  objectField,
  apiKeyField 
} from '@ai-spine/tools';

const schema = {
  input: {
    // Simple required string
    message: stringField()
      .required()
      .minLength(1)
      .maxLength(1000)
      .description('Message to process'),
    
    // Enum with default value
    priority: enumField(['low', 'medium', 'high', 'critical'])
      .optional()
      .default('medium')
      .description('Task priority level'),
    
    // Number with constraints
    maxResults: numberField()
      .optional()
      .min(1)
      .max(100)
      .integer()
      .default(10),
    
    // Array of strings
    tags: arrayField(stringField().required())
      .optional()
      .minItems(0)
      .maxItems(10)
      .unique()
      .description('List of tags')
  },
  
  config: {
    // API key configuration
    apiKey: apiKeyField()
      .required()
      .envVar('MY_API_KEY')
      .description('Service API key')
  }
};
```

---

## Input Field Builders

Input field builders define validation rules for data provided by AI agents during tool execution.

### stringField()

Creates a string input field with comprehensive validation options.

```typescript
function stringField(): StringFieldBuilder
```

**Methods:**
- `.required()` / `.optional()` - Set required status
- `.minLength(n: number)` - Set minimum string length
- `.maxLength(n: number)` - Set maximum string length  
- `.pattern(regex: string)` - Set regex validation pattern
- `.format(fmt: StringFormat)` - Set string format validation
- `.transform(type)` - Set value transformation
- `.description(text: string)` - Set field description
- `.example(value: any)` - Set example value
- `.default(value: any)` - Set default value (implies optional)
- `.sensitive()` - Mark as sensitive data
- `.sanitize()` - Enable input sanitization

**Examples:**

```typescript
// Simple text field
name: stringField()
  .required()
  .minLength(2)
  .maxLength(50)
  .description('User name')
  .example('John Doe')

// Email field with format validation
email: stringField()
  .required()
  .format('email')
  .transform('lowercase')
  .description('User email address')
  .example('user@example.com')

// Password field
password: stringField()
  .required()
  .minLength(8)
  .pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$')
  .sensitive()
  .description('Password with minimum complexity requirements')

// URL field
webhookUrl: stringField()
  .optional()
  .format('url')
  .pattern('^https://')
  .description('HTTPS webhook endpoint')
  .example('https://api.example.com/webhook')

// Trimmed and normalized text
comment: stringField()
  .required()
  .maxLength(500)
  .transform('trim')
  .sanitize()
  .description('User comment')
```

**Supported String Formats:**
- `'email'` - RFC 5322 email validation
- `'url'` - Valid HTTP/HTTPS URLs
- `'uri'` - General URI format
- `'uuid'` - UUID v4 format
- `'hostname'` - Valid hostname
- `'ipv4'` / `'ipv6'` - IP address formats
- `'base64'` - Base64 encoded strings
- `'jwt'` - JSON Web Token format
- `'slug'` - URL-friendly slugs
- `'color-hex'` - Hexadecimal color codes
- `'semver'` - Semantic version strings

### numberField()

Creates a number input field with numeric validation.

```typescript
function numberField(): NumberFieldBuilder
```

**Methods:**
- `.min(value: number)` - Set minimum value
- `.max(value: number)` - Set maximum value
- `.integer()` - Require integer values
- `.precision(places: number)` - Set decimal precision

**Examples:**

```typescript
// Age field with range validation
age: numberField()
  .required()
  .min(0)
  .max(150)
  .integer()
  .description('Person age in years')

// Price with precision
price: numberField()
  .required()
  .min(0)
  .precision(2)
  .description('Price in USD')
  .example(19.99)

// Percentage
completion: numberField()
  .optional()
  .min(0)
  .max(100)
  .default(0)
  .description('Completion percentage')

// Temperature
temperature: numberField()
  .required()
  .min(-273.15) // Absolute zero
  .description('Temperature in Celsius')
  .example(22.5)
```

### booleanField()

Creates a boolean input field.

```typescript
function booleanField(): BooleanFieldBuilder
```

**Examples:**

```typescript
// Feature flag
enableNotifications: booleanField()
  .optional()
  .default(true)
  .description('Enable email notifications')

// Required confirmation
acceptTerms: booleanField()
  .required()
  .description('User must accept terms of service')

// Debug mode
debug: booleanField()
  .optional()
  .default(false)
  .description('Enable debug output')
```

### enumField()

Creates an enum input field with predefined values.

```typescript
function enumField(values: any[]): EnumFieldBuilder
```

**Methods:**
- `.labels(labels: string[])` - Set human-readable labels for enum values

**Examples:**

```typescript
// Simple status enum
status: enumField(['draft', 'published', 'archived'])
  .required()
  .description('Document status')
  .example('draft')

// Priority with labels
priority: enumField(['low', 'medium', 'high', 'critical'])
  .optional()
  .default('medium')
  .labels(['Low Priority', 'Medium Priority', 'High Priority', 'Critical'])
  .description('Task priority level')

// File format
format: enumField(['json', 'xml', 'csv', 'yaml'])
  .required()
  .description('Output format')
  .example('json')

// Environment
environment: enumField(['development', 'staging', 'production'])
  .required()
  .description('Deployment environment')
```

### arrayField()

Creates an array input field with item validation.

```typescript
function arrayField(itemType: ToolInputField): ArrayFieldBuilder
```

**Methods:**
- `.minItems(count: number)` - Set minimum array length
- `.maxItems(count: number)` - Set maximum array length
- `.unique()` - Require unique array items

**Examples:**

```typescript
// Array of strings
tags: arrayField(stringField().required().minLength(1).maxLength(20))
  .optional()
  .minItems(0)
  .maxItems(10)
  .unique()
  .description('List of tags')
  .example(['api', 'tools', 'ai'])

// Array of numbers
scores: arrayField(numberField().required().min(0).max(100))
  .required()
  .minItems(1)
  .maxItems(5)
  .description('Test scores')
  .example([85, 92, 78, 96, 89])

// Array of enums
categories: arrayField(enumField(['news', 'sports', 'tech', 'health']))
  .optional()
  .minItems(1)
  .maxItems(3)
  .unique()
  .description('Content categories')

// Array of emails
recipients: arrayField(stringField().required().format('email'))
  .required()
  .minItems(1)
  .maxItems(50)
  .description('Email recipients')
  .example(['user1@example.com', 'user2@example.com'])
```

### objectField()

Creates an object input field with property validation.

```typescript
function objectField(properties: Record<string, ToolInputField>): ObjectFieldBuilder
```

**Methods:**
- `.requiredProperties(props: string[])` - Set required object properties
- `.additionalProperties(allowed: boolean)` - Allow additional properties

**Examples:**

```typescript
// User profile object
profile: objectField({
  name: stringField().required().minLength(2).maxLength(50),
  email: stringField().required().format('email'),
  age: numberField().optional().min(13).max(120).integer(),
  preferences: arrayField(enumField(['email', 'sms', 'push']))
    .optional()
    .maxItems(3)
})
.required()
.requiredProperties(['name', 'email'])
.description('User profile information')

// Geographic coordinates
location: objectField({
  latitude: numberField().required().min(-90).max(90),
  longitude: numberField().required().min(-180).max(180),
  accuracy: numberField().optional().min(0)
})
.optional()
.requiredProperties(['latitude', 'longitude'])
.description('Geographic coordinates')

// Address with flexible additional fields
address: objectField({
  street: stringField().required().maxLength(100),
  city: stringField().required().maxLength(50),
  state: stringField().optional().maxLength(50),
  postalCode: stringField().required().pattern('^\\d{5}(-\\d{4})?$'),
  country: stringField().required().minLength(2).maxLength(2)
})
.required()
.requiredProperties(['street', 'city', 'postalCode', 'country'])
.additionalProperties(true) // Allow extra address fields
.description('Mailing address')
```

### dateField() and datetimeField()

Create date and datetime input fields.

```typescript
function dateField(): DateFieldBuilder
function datetimeField(): DateTimeFieldBuilder
```

**Methods:**
- `.minDate(date: string)` - Set minimum date
- `.maxDate(date: string)` - Set maximum date
- `.timezone(requirement)` - Set timezone requirement (datetime only)

**Examples:**

```typescript
// Birth date with reasonable range
birthDate: dateField()
  .required()
  .minDate('1900-01-01')
  .maxDate('2020-12-31')
  .description('Date of birth')
  .example('1990-05-15')

// Event datetime with timezone
eventStart: datetimeField()
  .required()
  .minDate('2023-01-01T00:00:00Z')
  .timezone('required')
  .description('Event start time with timezone')
  .example('2023-12-25T14:30:00-05:00')

// Expiration date
expiresAt: datetimeField()
  .optional()
  .timezone('utc-only')
  .description('Expiration timestamp in UTC')
  .example('2024-12-31T23:59:59Z')
```

### fileField()

Creates a file input field with upload validation.

```typescript
function fileField(): FileFieldBuilder
```

**Methods:**
- `.mimeTypes(types: string[])` - Set allowed MIME types
- `.maxSize(bytes: number)` - Set maximum file size

**Examples:**

```typescript
// Image upload
avatar: fileField()
  .optional()
  .mimeTypes(['image/jpeg', 'image/png', 'image/webp'])
  .maxSize(5 * 1024 * 1024) // 5MB
  .description('User avatar image')

// Document upload
document: fileField()
  .required()
  .mimeTypes(['application/pdf', 'application/msword', 'text/plain'])
  .maxSize(10 * 1024 * 1024) // 10MB
  .description('Document file')

// CSV data file
dataFile: fileField()
  .required()
  .mimeTypes(['text/csv', 'application/csv'])
  .maxSize(50 * 1024 * 1024) // 50MB
  .description('CSV data file for processing')
```

---

## Configuration Field Builders

Configuration field builders define tool setup and authentication parameters.

### apiKeyField()

Creates an API key configuration field with security best practices.

```typescript
function apiKeyField(): ApiKeyFieldBuilder
```

**Methods:**
- `.pattern(regex: string)` - Set validation pattern
- `.errorMessage(message: string)` - Set custom error message

**Examples:**

```typescript
// OpenAI API key
openaiKey: apiKeyField()
  .required()
  .envVar('OPENAI_API_KEY')
  .pattern('^sk-[a-zA-Z0-9]{48}$')
  .errorMessage('OpenAI API key must start with "sk-" and be 51 characters total')
  .description('OpenAI API key for GPT access')

// GitHub token
githubToken: apiKeyField()
  .required()
  .envVar('GITHUB_TOKEN')
  .pattern('^ghp_[a-zA-Z0-9]{36}$')
  .description('GitHub personal access token')

// Generic API key
serviceKey: apiKeyField()
  .required()
  .envVar('SERVICE_API_KEY')
  .description('Third-party service API key')
```

### configStringField()

Creates a string configuration field.

```typescript
function configStringField(): ConfigStringFieldBuilder
```

**Examples:**

```typescript
// Base URL configuration
baseUrl: configStringField()
  .optional()
  .default('https://api.example.com')
  .pattern('^https://')
  .description('API base URL')
  .example('https://api.example.com')

// Service name
serviceName: configStringField()
  .required()
  .minLength(1)
  .maxLength(50)
  .description('Service identifier')
  .example('weather-service')

// Environment identifier
environment: configStringField()
  .optional()
  .default('production')
  .pattern('^(development|staging|production)$')
  .description('Deployment environment')
```

### urlConfigField()

Creates a URL configuration field with protocol validation.

```typescript
function urlConfigField(): UrlConfigFieldBuilder
```

**Methods:**
- `.protocols(protocols: string[])` - Set allowed protocols

**Examples:**

```typescript
// HTTPS-only webhook URL
webhookUrl: urlConfigField()
  .required()
  .protocols(['https'])
  .description('HTTPS webhook endpoint')
  .example('https://my-app.com/webhooks/ai-spine')

// Database URL
databaseUrl: urlConfigField()
  .required()
  .protocols(['postgresql', 'mysql'])
  .envVar('DATABASE_URL')
  .description('Database connection URL')
  .example('postgresql://user:pass@localhost:5432/db')

// Redis URL
redisUrl: urlConfigField()
  .optional()
  .default('redis://localhost:6379')
  .protocols(['redis', 'rediss'])
  .description('Redis connection URL')
```

### configEnumField()

Creates an enum configuration field.

```typescript
function configEnumField(values: any[]): ConfigEnumFieldBuilder
```

**Examples:**

```typescript
// Log level
logLevel: configEnumField(['error', 'warn', 'info', 'debug'])
  .optional()
  .default('info')
  .description('Logging level')

// Region selection  
region: configEnumField(['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'])
  .required()
  .description('AWS region')
  .example('us-east-1')

// Output format
outputFormat: configEnumField(['json', 'xml', 'yaml'])
  .optional()
  .default('json')
  .description('Default output format')
```

---

## Convenience Functions

Pre-configured field builders for common patterns.

### emailField()

Pre-configured string field for email addresses.

```typescript
function emailField(): StringFieldBuilder
```

Equivalent to:
```typescript
stringField().format('email').transform('lowercase')
```

**Example:**
```typescript
userEmail: emailField()
  .required()
  .description('User email address')
  .example('user@example.com')
```

### urlField()

Pre-configured string field for URLs.

```typescript
function urlField(): StringFieldBuilder
```

**Example:**
```typescript
profileUrl: urlField()
  .optional()
  .description('User profile URL')
  .example('https://example.com/user/123')
```

### uuidField()

Pre-configured string field for UUIDs.

```typescript
function uuidField(): StringFieldBuilder
```

**Example:**
```typescript
requestId: uuidField()
  .required()
  .description('Unique request identifier')
  .example('550e8400-e29b-41d4-a716-446655440000')
```

### timeField()

Creates a time input field.

```typescript
function timeField(): BaseInputFieldBuilder<ToolInputField>
```

**Example:**
```typescript
startTime: timeField()
  .required()
  .description('Start time in HH:MM:SS format')
  .example('14:30:00')
```

---

## Schema Building

### SchemaBuilder Class

Advanced schema building with validation capabilities.

```typescript
class SchemaBuilder {
  addInput(name: string, field: ToolInputField): this
  addConfig(name: string, field: ToolConfigField): this
  build(): { input: Record<string, ToolInputField>, config: Record<string, ToolConfigField> }
  validateInput(data: any, options?: ValidationOptions): Promise<ValidationResult>
  validateConfig(data: any, options?: ValidationOptions): Promise<ValidationResult>
  validateToolData(data: { input: any, config: any }): Promise<ValidationResult>
  generateDocumentation(metadata?: object): any
  generateExampleRequest(): object
}
```

**Example:**

```typescript
import { createSchema, stringField, numberField, apiKeyField } from '@ai-spine/tools';

const schema = createSchema()
  .addInput('query', stringField()
    .required()
    .minLength(1)
    .maxLength(500)
    .description('Search query')
  )
  .addInput('limit', numberField()
    .optional()
    .min(1)
    .max(100)
    .integer()
    .default(10)
    .description('Maximum results')
  )
  .addConfig('apiKey', apiKeyField()
    .required()
    .envVar('SEARCH_API_KEY')
  );

// Build the complete schema
const builtSchema = schema.build();

// Validate input data
const inputValidation = await schema.validateInput({
  query: 'javascript frameworks',
  limit: 20
});

// Generate documentation
const docs = schema.generateDocumentation({
  name: 'search-tool',
  version: '1.0.0',
  description: 'Search tool with configurable limits'
});

// Generate example request
const example = schema.generateExampleRequest();
console.log(JSON.stringify(example, null, 2));
```

### createValidator()

Create a reusable validator for a specific schema.

```typescript
function createValidator(schema: {
  input?: Record<string, ToolInputField>;
  config?: Record<string, ToolConfigField>;
})
```

**Example:**

```typescript
const validator = createValidator({
  input: {
    email: emailField().required(),
    age: numberField().optional().min(13).max(120).integer()
  },
  config: {
    apiKey: apiKeyField().required()
  }
});

// Validate input
const inputResult = await validator.validateInput({
  email: 'user@example.com',
  age: 25
});

// Validate config
const configResult = await validator.validateConfig({
  apiKey: 'sk-1234567890abcdef'
});

// Get metrics
const metrics = validator.getMetrics();
```

---

## Validation Utilities

### validateField()

Validate a single field value quickly.

```typescript
async function validateField(
  field: ToolInputField | ToolConfigField,
  value: any,
  fieldName?: string,
  options?: ValidationOptions
): Promise<ValidationResult>
```

**Examples:**

```typescript
import { validateField, emailField, numberField } from '@ai-spine/tools';

// Validate email
const emailResult = await validateField(
  emailField().required().build(),
  'user@example.com',
  'email'
);

// Validate number range
const numberResult = await validateField(
  numberField().required().min(1).max(100).build(),
  50,
  'score'
);

if (emailResult.success) {
  console.log('Email is valid');
} else {
  console.error('Email errors:', emailResult.errors);
}
```

### Quick Validation Functions

Pre-built validation functions for common patterns.

```typescript
import { validate } from '@ai-spine/tools';

// Validate email
const emailResult = await validate.email('user@example.com');

// Validate URL
const urlResult = await validate.url('https://example.com');

// Validate UUID
const uuidResult = await validate.uuid('550e8400-e29b-41d4-a716-446655440000');

// Validate API key with pattern
const apiKeyResult = await validate.apiKey('sk-1234567890', '^sk-[a-zA-Z0-9]{10}$');

// Validate positive integer
const intResult = await validate.positiveInteger(42);

// Validate non-empty string
const stringResult = await validate.nonEmptyString('hello world');

// Validate string array
const arrayResult = await validate.stringArray(['tag1', 'tag2', 'tag3'], 1, 10);
```

---

## Documentation Generation

### DocumentationGenerator

Generate OpenAPI documentation from field definitions.

```typescript
class DocumentationGenerator {
  static generateOpenAPISchema(field: ToolInputField | ToolConfigField): any
  static generateToolDocumentation(
    schema: { input?: Record<string, ToolInputField>, config?: Record<string, ToolConfigField> },
    metadata?: { name?: string, description?: string, version?: string }
  ): any
}
```

**Example:**

```typescript
import { DocumentationGenerator, stringField, numberField } from '@ai-spine/tools';

const schema = {
  input: {
    query: stringField()
      .required()
      .minLength(1)
      .maxLength(500)
      .description('Search query')
      .example('javascript frameworks'),
    
    limit: numberField()
      .optional()
      .min(1)
      .max(100)
      .integer()
      .default(10)
      .description('Maximum results')
  }
};

// Generate complete OpenAPI documentation
const documentation = DocumentationGenerator.generateToolDocumentation(schema, {
  name: 'search-tool',
  description: 'Advanced search tool with filtering',
  version: '2.1.0'
});

// Generate schema for individual field
const fieldSchema = DocumentationGenerator.generateOpenAPISchema(
  stringField().required().format('email').build()
);

console.log(JSON.stringify(documentation, null, 2));
```

**Generated OpenAPI Schema Example:**

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "search-tool",
    "description": "Advanced search tool with filtering",
    "version": "2.1.0"
  },
  "paths": {
    "/api/execute": {
      "post": {
        "summary": "Execute the tool",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "input_data": {
                    "type": "object",
                    "properties": {
                      "query": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 500,
                        "description": "Search query",
                        "example": "javascript frameworks"
                      },
                      "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 100,
                        "default": 10,
                        "description": "Maximum results"
                      }
                    },
                    "required": ["query"]
                  }
                },
                "required": ["input_data"]
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Best Practices

### 1. Use Descriptive Names and Documentation

Always provide clear descriptions and examples:

```typescript
// Good
userEmail: emailField()
  .required()
  .description('User email address for account notifications')
  .example('john.doe@company.com')

// Better - more context
contactEmail: emailField()
  .required()
  .description('Primary email address where the user will receive order confirmations and support updates')
  .example('customer@example.com')
  .transform('lowercase')
```

### 2. Set Reasonable Constraints

Define validation rules that match your business requirements:

```typescript
// User age with realistic bounds
age: numberField()
  .optional()
  .min(13) // COPPA compliance
  .max(120) // Reasonable maximum
  .integer()
  .description('User age in years')

// Product name with practical limits
productName: stringField()
  .required()
  .minLength(2)
  .maxLength(100) // Fits most UI constraints
  .pattern('^[a-zA-Z0-9\\s\\-_]+$') // Safe characters only
  .description('Product name (letters, numbers, spaces, hyphens, underscores)')
```

### 3. Use Appropriate Field Types

Choose the most specific field type for better validation:

```typescript
// Instead of generic string
websiteUrl: urlField() // Validates URL format
  .optional()
  .description('Company website')

// Instead of string with pattern
userId: uuidField() // Validates UUID format
  .required()
  .description('Unique user identifier')

// Instead of string enum
priority: enumField(['low', 'medium', 'high', 'urgent'])
  .required()
  .description('Issue priority level')
```

### 4. Provide Good Examples

Examples improve developer experience and API documentation:

```typescript
dateRange: objectField({
  start: dateField().required().description('Range start date'),
  end: dateField().required().description('Range end date')
})
.required()
.example({
  start: '2023-01-01',
  end: '2023-12-31'
})
.description('Date range for report generation')
```

### 5. Use Transformations and Sanitization

Clean input data automatically:

```typescript
// Normalize email addresses
email: emailField()
  .required()
  .transform('lowercase') // Convert to lowercase
  .description('User email address')

// Clean text input
comment: stringField()
  .required()
  .maxLength(500)
  .transform('trim') // Remove whitespace
  .sanitize() // Remove potentially harmful content
  .description('User comment')
```

### 6. Group Related Configuration

Use categories to organize configuration fields:

```typescript
// Database configuration
dbHost: configStringField()
  .required()
  .category('database')
  .envVar('DB_HOST')
  .description('Database host')

dbPort: configNumberField()
  .optional()
  .default(5432)
  .category('database')
  .envVar('DB_PORT')
  .description('Database port')

// API configuration  
apiKey: apiKeyField()
  .required()
  .category('api')
  .envVar('API_KEY')
  .description('Third-party API key')

apiTimeout: configNumberField()
  .optional()
  .default(30000)
  .category('api')
  .min(1000)
  .max(60000)
  .description('API request timeout in milliseconds')
```

### 7. Implement Progressive Validation

Start with basic validation and add complexity as needed:

```typescript
// Phase 1: Basic validation
username: stringField()
  .required()
  .minLength(3)
  .maxLength(20)

// Phase 2: Add format validation
username: stringField()
  .required()
  .minLength(3)
  .maxLength(20)
  .pattern('^[a-zA-Z0-9_-]+$')

// Phase 3: Add business rules
username: stringField()
  .required()
  .minLength(3)
  .maxLength(20)
  .pattern('^[a-zA-Z0-9_-]+$')
  .transform('lowercase')
  .description('Username (alphanumeric, underscore, hyphen only)')
```

### 8. Test Field Validation

Always test your field definitions:

```typescript
import { validateField, stringField } from '@ai-spine/tools';

// Test field validation
async function testFields() {
  const emailField = emailField().required().build();
  
  // Test valid email
  const validResult = await validateField(emailField, 'user@example.com');
  console.assert(validResult.success === true);
  
  // Test invalid email
  const invalidResult = await validateField(emailField, 'not-an-email');
  console.assert(invalidResult.success === false);
  
  console.log('Field validation tests passed');
}

testFields();
```

---

## See Also

- [Core Types](./core-types.md) - Type definitions used by field builders
- [Tool Creation](./tool-creation.md) - How to use field builders in tools
- [Getting Started](../getting-started/quick-start.md) - Quick start with field builders
- [Advanced Usage](../advanced/README.md) - Advanced field validation patterns