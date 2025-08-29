# Core Types

This document provides a comprehensive reference for all core TypeScript types and interfaces used in the AI Spine Tools SDK. These types form the foundation of the framework and enable type safety throughout tool development and execution.

## Table of Contents

- [Tool Definition Types](#tool-definition-types)
- [Schema and Field Types](#schema-and-field-types) 
- [Execution Types](#execution-types)
- [Error Types](#error-types)
- [Utility Types](#utility-types)
- [Platform API Types](#platform-api-types)

---

## Tool Definition Types

### ToolDefinition

The main interface for defining AI Spine tools. This combines metadata, schema, and execution logic into a complete tool specification.

```typescript
interface ToolDefinition<TInput = ToolInput, TConfig = ToolConfig> {
  metadata: ToolMetadata;
  schema: ToolSchema;
  execute: (input: TInput, config: TConfig, context: ToolExecutionContext) => Promise<ToolExecutionResult>;
  setup?: (config: TConfig) => Promise<void>;
  cleanup?: () => Promise<void>;
  healthCheck?: () => Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details?: Record<string, any>;
  }>;
}
```

**Example:**
```typescript
const weatherTool: ToolDefinition = {
  metadata: {
    name: 'weather-api-tool',
    version: '1.0.0',
    description: 'Get current weather for any city',
    capabilities: ['weather.current']
  },
  schema: {
    input: {
      city: {
        type: 'string',
        required: true,
        description: 'City name'
      }
    },
    config: {
      apiKey: {
        type: 'apiKey',
        required: true,
        description: 'Weather API key'
      }
    }
  },
  execute: async (input, config, context) => {
    // Tool implementation here
    return {
      status: 'success',
      data: { temperature: 22, description: 'sunny' }
    };
  }
}
```

### ToolMetadata

Metadata information that describes tool identity, capabilities, and maintenance information.

```typescript
interface ToolMetadata {
  name: string;                    // Unique tool identifier (kebab-case)
  version: string;                 // Semantic version (e.g., "1.0.0")
  description: string;             // Human-readable description
  capabilities: string[];          // List of tool capabilities
  author?: string;                 // Author information
  license?: string;                // SPDX license identifier
  homepage?: string;               // Homepage URL
  repository?: string;             // Git repository URL
  tags?: string[];                 // Categorization tags
  minSdkVersion?: string;          // Minimum SDK version required
  requirements?: {                 // Tool requirements
    apiKeys?: string[];
    permissions?: string[];
    runtimeDependencies?: string[];
  };
  deprecation?: {                  // Deprecation information
    deprecated: boolean;
    reason?: string;
    alternative?: string;
    endOfLife?: string;
  };
}
```

**Example:**
```typescript
const metadata: ToolMetadata = {
  name: 'weather-api-tool',
  version: '1.0.0',
  description: 'Fetches current weather data for any city',
  capabilities: ['weather.current', 'weather.forecast'],
  author: 'John Doe',
  license: 'MIT',
  homepage: 'https://github.com/user/weather-tool',
  repository: 'https://github.com/user/weather-tool.git',
  tags: ['weather', 'api', 'external-service'],
  requirements: {
    apiKeys: ['OPENWEATHER_API_KEY'],
    permissions: ['internet-access'],
    runtimeDependencies: ['node:18+']
  }
}
```

---

## Schema and Field Types

### ToolSchema

Complete schema definition including input validation, configuration, and advanced validation rules.

```typescript
interface ToolSchema {
  input: Record<string, ToolInputField>;
  config: Record<string, ToolConfigField>;
  validation?: {
    crossFieldValidation?: {
      rule: 'conditional' | 'mutual_exclusion' | 'dependency' | 'custom';
      description?: string;
      condition?: string;
      requires?: string[];
      forbids?: string[];
      customValidator?: string;
      errorMessage?: string;
    }[];
    globalConstraints?: {
      maxTotalInputSize?: number;
      requiredCombinations?: string[][];
      mutuallyExclusive?: string[][];
    };
  };
  schemaVersion?: string;
  metadata?: {
    lastModified?: string;
    author?: string;
    tags?: string[];
    stable?: boolean;
  };
}
```

### ToolInputField

Defines validation and processing rules for input data from AI agents.

```typescript
interface ToolInputField {
  type: ToolInputFieldType;
  required: boolean;
  description?: string;
  default?: any;
  example?: any;
  
  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: StringFormat;
  
  // Number validations
  min?: number;
  max?: number;
  integer?: boolean;
  precision?: number;
  
  // Enum validations
  enum?: any[];
  enumLabels?: string[];
  
  // Array validations
  items?: ToolInputField;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object validations
  properties?: Record<string, ToolInputField>;
  requiredProperties?: string[];
  additionalProperties?: boolean;
  
  // File validations
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  
  // Date/time validations
  minDate?: string;
  maxDate?: string;
  timezone?: 'required' | 'optional' | 'utc-only';
  
  // Advanced features
  customValidator?: string;
  sanitize?: boolean;
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'normalize';
  sensitive?: boolean;
}
```

**Example:**
```typescript
const cityField: ToolInputField = {
  type: 'string',
  required: true,
  description: 'Name of the city to get weather for',
  minLength: 2,
  maxLength: 100,
  example: 'Madrid'
}

const temperatureUnitsField: ToolInputField = {
  type: 'enum',
  required: false,
  description: 'Temperature units for the response',
  enum: ['celsius', 'fahrenheit', 'kelvin'],
  default: 'celsius'
}
```

### ToolConfigField

Configuration field definitions for tool setup and authentication.

```typescript
interface ToolConfigField {
  type: ToolConfigFieldType;
  required: boolean;
  description?: string;
  default?: any;
  secret?: boolean;
  example?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
    errorMessage?: string;
    allowedProtocols?: string[];
    jsonSchema?: any;
  };
  envVar?: string;
  allowRuntimeOverride?: boolean;
  category?: string;
  priority?: number;
}
```

**Example:**
```typescript
const apiKeyConfig: ToolConfigField = {
  type: 'apiKey',
  required: true,
  description: 'OpenWeatherMap API key for weather data access',
  validation: {
    pattern: '^[a-f0-9]{32}$',
    errorMessage: 'API key must be a 32-character hexadecimal string'
  }
}
```

### Field Types

#### ToolInputFieldType

```typescript
type ToolInputFieldType = 
  | 'string'      // Text values, URLs, emails, etc.
  | 'number'      // Numeric values (integers and floats)
  | 'boolean'     // True/false values
  | 'array'       // Lists of values
  | 'object'      // Complex nested objects
  | 'date'        // Date values (ISO 8601 format)
  | 'time'        // Time values (HH:MM:SS format)
  | 'datetime'    // Date and time combined
  | 'email'       // Email addresses with validation
  | 'url'         // URLs with validation
  | 'uuid'        // UUID strings
  | 'json'        // Raw JSON objects
  | 'file'        // File upload references
  | 'enum';       // Predefined set of values
```

#### ToolConfigFieldType

```typescript
type ToolConfigFieldType = 
  | 'string'      // General text configuration
  | 'number'      // Numeric configuration values
  | 'boolean'     // True/false flags
  | 'apiKey'      // API keys and authentication tokens
  | 'secret'      // Other sensitive configuration data
  | 'url'         // Service endpoints and URLs
  | 'enum'        // Predefined configuration options
  | 'json';       // Complex configuration objects
```

#### StringFormat

```typescript
type StringFormat = 
  | 'email'       // RFC 5322 email validation
  | 'url'         // Valid HTTP/HTTPS URLs
  | 'uri'         // General URI format
  | 'uuid'        // UUID v4 format
  | 'regex'       // Custom regex pattern
  | 'hostname'    // Valid hostname
  | 'ipv4'        // IPv4 address
  | 'ipv6'        // IPv6 address
  | 'base64'      // Base64 encoded strings
  | 'jwt'         // JSON Web Token format
  | 'slug'        // URL-friendly slugs
  | 'color-hex'   // Hexadecimal color codes
  | 'semver';     // Semantic version strings
```

---

## Execution Types

### ToolExecutionContext

Context information provided to tools during execution.

```typescript
interface ToolExecutionContext {
  executionId: string;
  toolId: string;
  toolVersion: string;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  environment?: 'development' | 'staging' | 'production' | string;
  performance?: {
    startTime: number;
    timeoutMs?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    expectedDurationMs?: number;
  };
  security?: {
    apiKeyHash?: string;
    permissions?: string[];
    rateLimiting?: {
      remaining?: number;
      resetAt?: Date;
      limit?: number;
    };
    sourceIp?: string;
    userAgent?: string;
  };
  agent?: {
    type?: string;
    version?: string;
    model?: string;
    conversationId?: string;
  };
  debug?: {
    enabled: boolean;
    level?: 'info' | 'debug' | 'trace';
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  flags?: {
    dryRun?: boolean;
    noCache?: boolean;
    verbose?: boolean;
    custom?: Record<string, boolean>;
  };
}
```

### ToolExecutionResult

Standardized result format for tool executions.

```typescript
interface ToolExecutionResult {
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  data?: any;
  error?: {
    code: string;
    message: string;
    type: 'validation_error' | 'configuration_error' | 'execution_error' | 'network_error' | 'timeout_error' | 'system_error' | 'client_error' | 'server_error';
    details?: any;
    retryable?: boolean;
    retryAfterMs?: number;
    stackTrace?: string;
    field?: string;
    httpStatusCode?: number;
  };
  timing?: {
    executionTimeMs: number;
    startedAt: string;
    completedAt: string;
    phases?: {
      validationMs?: number;
      executionMs?: number;
      serializationMs?: number;
    };
    timedOut?: boolean;
  };
  resources?: {
    memoryUsageBytes?: number;
    cpuTimeMs?: number;
    networkRequests?: number;
    apiCalls?: {
      service: string;
      count: number;
      totalTimeMs: number;
    }[];
  };
  cache?: {
    hit: boolean;
    key?: string;
    expiresAt?: string;
    source?: 'memory' | 'redis' | 'database' | 'file';
  };
  metadata?: {
    source?: string;
    freshness?: string;
    version?: string;
    truncated?: boolean;
    format?: string;
    quality?: {
      confidence?: number;
      completeness?: number;
      accuracy?: number;
    };
    custom?: Record<string, any>;
  };
  warnings?: {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    details?: any;
  }[];
}
```

**Examples:**

Successful execution:
```typescript
const successResult: ToolExecutionResult = {
  status: 'success',
  data: {
    temperature: 22,
    description: 'sunny',
    humidity: 45
  },
  timing: {
    executionTimeMs: 1250,
    startedAt: '2024-01-15T10:30:00.000Z',
    completedAt: '2024-01-15T10:30:01.250Z'
  },
  metadata: {
    source: 'openweathermap',
    cached: false
  }
}
```

Error execution:
```typescript
const errorResult: ToolExecutionResult = {
  status: 'error',
  error: {
    code: 'API_RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded for API key',
    type: 'client_error',
    retryable: true,
    retryAfterMs: 60000
  },
  timing: {
    executionTimeMs: 500,
    startedAt: '2024-01-15T10:30:00.000Z',
    completedAt: '2024-01-15T10:30:00.500Z'
  }
}
```

---

## Error Types

### ToolError

Base error class for all tool-related errors.

```typescript
class ToolError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'TOOL_ERROR', details?: any)
}
```

### ValidationError

Error thrown during input validation.

```typescript
class ValidationError extends ToolError {
  constructor(message: string, field?: string, value?: any)
}
```

### ConfigurationError

Error thrown due to invalid or missing configuration.

```typescript
class ConfigurationError extends ToolError {
  constructor(message: string, missingKeys?: string[])
}
```

### ExecutionError

Error thrown during tool execution.

```typescript
class ExecutionError extends ToolError {
  constructor(message: string, cause?: Error)
}
```

---

## Utility Types

### DeepPartial

Makes all properties in T optional recursively.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
}
```

### RequiredFields

Makes specified keys required in type T.

```typescript
type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

### OptionalFields

Makes specified keys optional in type T.

```typescript
type OptionalFields<T, K extends keyof T> = T & Partial<Pick<T, K>>;
```

### ToolInput

Generic type for tool input data.

```typescript
interface ToolInput {
  [key: string]: any;
}
```

### ToolConfig

Generic type for tool configuration data.

```typescript
interface ToolConfig {
  [key: string]: any;
}
```

---

## Platform API Types

### AISpineExecuteRequest

Request format for the AI Spine platform execute endpoint.

```typescript
interface AISpineExecuteRequest {
  tool_id: string;
  input_data: ToolInput;
  config?: ToolConfig;
  execution_id?: string;
  metadata?: Record<string, any>;
}
```

### AISpineExecuteResponse

Response format from the AI Spine platform execute endpoint.

```typescript
interface AISpineExecuteResponse {
  execution_id: string;
  status: 'success' | 'error';
  output_data?: any;
  error_code?: string;
  error_message?: string;
  error_details?: any;
  execution_time_ms: number;
  timestamp: string;
}
```

### AISpineHealthResponse

Response format from the health check endpoint.

```typescript
interface AISpineHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  tool_metadata: ToolMetadata;
  capabilities: string[];
  uptime_seconds: number;
  last_execution?: string;
  error_rate_percent?: number;
  avg_response_time_ms?: number;
}
```

---

## Type Usage Examples

### Basic Tool Definition

```typescript
import { ToolDefinition, stringField, apiKeyField } from '@ai-spine/tools';

interface WeatherInput {
  city: string;
  units?: 'celsius' | 'fahrenheit';
}

interface WeatherConfig {
  apiKey: string;
}

const weatherTool: ToolDefinition<WeatherInput, WeatherConfig> = {
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get current weather for any city',
    capabilities: ['weather.current']
  },
  
  schema: {
    input: {
      city: {
        type: 'string',
        required: true,
        description: 'City name',
        minLength: 2,
        example: 'Madrid'
      },
      units: {
        type: 'enum',
        required: false,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    
    config: {
      apiKey: {
        type: 'apiKey',
        required: true,
        description: 'Weather API key',
        secret: true
      }
    }
  },
  
  execute: async (input, config, context) => {
    // Implementation here
    return {
      status: 'success',
      data: { temperature: 22, description: 'sunny' }
    };
  }
};
```

### Advanced Field Validation

```typescript
const complexSchema: ToolSchema = {
  input: {
    user: {
      type: 'object',
      required: true,
      properties: {
        email: {
          type: 'string',
          required: true,
          format: 'email',
          description: 'User email address'
        },
        age: {
          type: 'number',
          required: false,
          min: 13,
          max: 120,
          integer: true
        },
        preferences: {
          type: 'array',
          required: false,
          items: {
            type: 'string',
            enum: ['news', 'sports', 'weather', 'entertainment']
          },
          maxItems: 5,
          uniqueItems: true
        }
      },
      requiredProperties: ['email']
    }
  },
  
  config: {
    // Configuration fields here
  },
  
  validation: {
    crossFieldValidation: [
      {
        rule: 'conditional',
        condition: 'input.user.age < 18',
        requires: ['input.parentalConsent'],
        errorMessage: 'Parental consent required for users under 18'
      }
    ]
  }
};
```

---

## See Also

- [Tool Creation](./tool-creation.md) - How to create tools using these types
- [Field Builders](./field-builders.md) - Helper functions for creating field definitions and validation
- [Getting Started](../getting-started/quick-start.md) - Quick start guide with examples