// Core type definitions for AI Spine tools

/**
 * Type helper for file inputs received from the AI Spine API.
 * Files are automatically processed and encoded in base64 with metadata.
 *
 * @example
 * ```typescript
 * interface MyToolInput {
 *   document: FileInput;
 *   attachments: FileInput[];
 * }
 *
 * // In your execute function:
 * const document = input.document;
 * const fileBuffer = Buffer.from(document.content, 'base64');
 * ```
 */
export interface FileInput {
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  type: string;
  /** Last modified timestamp (optional) */
  lastModified?: number;
  /** File content encoded in base64 */
  content: string;
  /** Encoding type (always 'base64') */
  encoding: string;
}

/**
 * Metadata information for a tool that describes its identity, capabilities, and maintenance information.
 * This information is used for tool discovery, documentation generation, and runtime verification.
 *
 * @example
 * ```typescript
 * const metadata: ToolMetadata = {
 *   name: 'weather-api-tool',
 *   version: '1.0.0',
 *   description: 'Fetches current weather data for any city',
 *   capabilities: ['weather.current', 'weather.forecast'],
 *   author: 'John Doe',
 *   license: 'MIT',
 *   homepage: 'https://github.com/user/weather-tool',
 *   repository: 'https://github.com/user/weather-tool.git',
 *   tags: ['weather', 'api', 'external-service'],
 *   requirements: {
 *     apiKeys: ['OPENWEATHER_API_KEY'],
 *     permissions: ['internet-access'],
 *     runtimeDependencies: ['node:18+']
 *   }
 * }
 * ```
 */
export interface ToolMetadata {
  /** Unique identifier for the tool (kebab-case recommended) */
  name: string;

  /** Semantic version string (e.g., "1.0.0") */
  version: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** List of specific capabilities this tool provides for AI agents */
  capabilities: string[];

  /** Tool author or maintainer information */
  author?: string;

  /** SPDX license identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;

  /** URL to the tool's homepage or documentation */
  homepage?: string;

  /** Git repository URL for the tool's source code */
  repository?: string;

  /** Tags for categorization and discovery */
  tags?: string[];

  /** Minimum SDK version required to run this tool */
  minSdkVersion?: string;

  /** Tool requirements and dependencies */
  requirements?: {
    /** Required API keys or secrets */
    apiKeys?: string[];
    /** Required system permissions */
    permissions?: string[];
    /** Runtime dependencies (Node.js version, etc.) */
    runtimeDependencies?: string[];
  };

  /** Deprecation information if the tool is being phased out */
  deprecation?: {
    /** Whether the tool is deprecated */
    deprecated: boolean;
    /** Deprecation reason */
    reason?: string;
    /** Alternative tool recommendation */
    alternative?: string;
    /** Date when support will end */
    endOfLife?: string;
  };
}

/**
 * Supported field types for tool input validation.
 * These types map to JSON Schema types and enable automatic validation.
 */
export type ToolInputFieldType =
  | 'string' // Text values, URLs, emails, etc.
  | 'number' // Numeric values (integers and floats)
  | 'boolean' // True/false values
  | 'array' // Lists of values
  | 'object' // Complex nested objects
  | 'date' // Date values (ISO 8601 format)
  | 'time' // Time values (HH:MM:SS format)
  | 'datetime' // Date and time combined
  | 'email' // Email addresses with validation
  | 'url' // URLs with validation
  | 'uuid' // UUID strings
  | 'json' // Raw JSON objects
  | 'file' // File upload references
  | 'enum'; // Predefined set of values

/**
 * String format validation options for string-type fields.
 * These provide additional validation beyond basic string checking.
 */
export type StringFormat =
  | 'email' // RFC 5322 email validation
  | 'url' // Valid HTTP/HTTPS URLs
  | 'uri' // General URI format
  | 'uuid' // UUID v4 format
  | 'regex' // Custom regex pattern
  | 'hostname' // Valid hostname
  | 'ipv4' // IPv4 address
  | 'ipv6' // IPv6 address
  | 'base64' // Base64 encoded strings
  | 'jwt' // JSON Web Token format
  | 'slug' // URL-friendly slugs
  | 'color-hex' // Hexadecimal color codes
  | 'semver'; // Semantic version strings

/**
 * Definition of an input field for a tool. This interface describes how to validate
 * and process input data from AI agents, including type checking, constraints, and
 * transformation rules.
 *
 * @example
 * ```typescript
 * const cityField: ToolInputField = {
 *   type: 'string',
 *   required: true,
 *   description: 'Name of the city to get weather for',
 *   minLength: 2,
 *   maxLength: 100,
 *   example: 'Madrid'
 * }
 *
 * const temperatureUnitsField: ToolInputField = {
 *   type: 'enum',
 *   required: false,
 *   description: 'Temperature units for the response',
 *   enum: ['celsius', 'fahrenheit', 'kelvin'],
 *   default: 'celsius'
 * }
 * ```
 */
export interface ToolInputField {
  /** The data type of this field */
  type: ToolInputFieldType;

  /** Whether this field is required for tool execution */
  required: boolean;

  /** Human-readable description of what this field represents */
  description?: string;

  /** Default value if not provided (only for non-required fields) */
  default?: any;

  /** Example value for documentation and testing */
  example?: any;

  // String-specific validations
  /** Minimum string length (string type only) */
  minLength?: number;

  /** Maximum string length (string type only) */
  maxLength?: number;

  /** Regex pattern for string validation (string type only) */
  pattern?: string;

  /** String format validation (string type only) */
  format?: StringFormat;

  // Number-specific validations
  /** Minimum numeric value (number type only) */
  min?: number;

  /** Maximum numeric value (number type only) */
  max?: number;

  /** Whether the number must be an integer (number type only) */
  integer?: boolean;

  /** Number of decimal places allowed (number type only) */
  precision?: number;

  // Enum validations
  /** Allowed values for enum type */
  enum?: any[];

  /** Human-readable labels for enum values */
  enumLabels?: string[];

  // Array-specific validations
  /** Type definition for array items (array type only) */
  items?: ToolInputField;

  /** Minimum array length (array type only) */
  minItems?: number;

  /** Maximum array length (array type only) */
  maxItems?: number;

  /** Whether array items must be unique (array type only) */
  uniqueItems?: boolean;

  // Object-specific validations
  /** Property definitions for object type */
  properties?: Record<string, ToolInputField>;

  /** Names of required properties in objects (object type only) */
  requiredProperties?: string[];

  /** Whether additional properties are allowed in objects (object type only) */
  additionalProperties?: boolean;

  // File-specific validations
  /** Allowed MIME types for file uploads (file type only) */
  allowedMimeTypes?: string[];

  /** Maximum file size in bytes (file type only) */
  maxFileSize?: number;

  // Date/time specific validations
  /** Minimum date/time value (date/datetime/time types only) */
  minDate?: string;

  /** Maximum date/time value (date/datetime/time types only) */
  maxDate?: string;

  /** Timezone requirement for datetime fields */
  timezone?: 'required' | 'optional' | 'utc-only';

  // Advanced validations
  /** Custom validation function (for complex business logic) */
  customValidator?: string; // Reference to a validation function

  /** Whether this field should be sanitized before validation */
  sanitize?: boolean;

  /** Transformation to apply to the value before validation */
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'normalize';

  /** Whether this field contains sensitive data (affects logging/debugging) */
  sensitive?: boolean;
}

/**
 * Supported field types for tool configuration.
 * Configuration fields are typically set once and used across multiple executions.
 */
export type ToolConfigFieldType =
  | 'string' // General text configuration
  | 'number' // Numeric configuration values
  | 'boolean' // True/false flags
  | 'apiKey' // API keys and authentication tokens
  | 'secret' // Other sensitive configuration data
  | 'url' // Service endpoints and URLs
  | 'enum' // Predefined configuration options
  | 'json'; // Complex configuration objects

/**
 * Configuration field definition for tools. Configuration fields are typically
 * set during tool setup and remain constant across multiple executions.
 * These differ from input fields as they represent tool-level settings rather
 * than per-execution parameters.
 *
 * @example
 * ```typescript
 * const apiKeyConfig: ToolConfigField = {
 *   type: 'apiKey',
 *   required: true,
 *   description: 'OpenWeatherMap API key for weather data access',
 *   validation: {
 *     pattern: '^[a-f0-9]{32}$',
 *     errorMessage: 'API key must be a 32-character hexadecimal string'
 *   }
 * }
 *
 * const environmentConfig: ToolConfigField = {
 *   type: 'enum',
 *   required: false,
 *   description: 'API environment to use',
 *   enum: ['production', 'staging', 'development'],
 *   default: 'production'
 * }
 * ```
 */
export interface ToolConfigField {
  /** The data type of this configuration field */
  type: ToolConfigFieldType;

  /** Whether this configuration field is required for tool operation */
  required: boolean;

  /** Human-readable description of what this configuration represents */
  description?: string;

  /** Default value if not provided (only for non-required fields) */
  default?: any;

  /** Whether this field contains sensitive data (API keys, passwords, etc.) */
  secret?: boolean;

  /** Example value for documentation (should be safe/fake for secret fields) */
  example?: any;

  /** Validation rules for this configuration field */
  validation?: {
    /** Minimum numeric value or string length */
    min?: number;

    /** Maximum numeric value or string length */
    max?: number;

    /** Regex pattern for string validation */
    pattern?: string;

    /** Allowed values for enum type */
    enum?: any[];

    /** Custom error message for validation failures */
    errorMessage?: string;

    /** URL validation for URL type fields */
    allowedProtocols?: string[]; // e.g., ['https', 'http']

    /** For JSON type, schema to validate against */
    jsonSchema?: any;
  };

  /** Environment variable name where this config can be loaded from */
  envVar?: string;

  /** Whether this field can be overridden at runtime */
  allowRuntimeOverride?: boolean;

  /** Category for grouping related configuration fields */
  category?: string;

  /** Priority level for configuration (higher numbers = more important) */
  priority?: number;
}

/**
 * Complete schema definition for a tool, including input validation rules,
 * configuration requirements, and validation logic. This schema is used to
 * automatically validate requests, generate documentation, and provide
 * type safety throughout the tool execution pipeline.
 *
 * @example
 * ```typescript
 * const weatherToolSchema: ToolSchema = {
 *   input: {
 *     city: {
 *       type: 'string',
 *       required: true,
 *       description: 'Name of the city to get weather for',
 *       minLength: 2,
 *       maxLength: 100,
 *       example: 'Madrid'
 *     },
 *     units: {
 *       type: 'enum',
 *       required: false,
 *       description: 'Temperature units',
 *       enum: ['celsius', 'fahrenheit'],
 *       default: 'celsius'
 *     }
 *   },
 *   config: {
 *     apiKey: {
 *       type: 'apiKey',
 *       required: true,
 *       description: 'OpenWeatherMap API key',
 *       secret: true,
 *       envVar: 'OPENWEATHER_API_KEY'
 *     }
 *   },
 *   validation: {
 *     crossFieldValidation: [
 *       {
 *         rule: 'conditional',
 *         condition: 'input.advanced === true',
 *         requires: ['input.coordinates']
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export interface ToolSchema {
  /** Input field definitions - data provided by AI agents for each execution */
  input: Record<string, ToolInputField>;

  /** Configuration field definitions - tool setup and authentication */
  config: Record<string, ToolConfigField>;

  /** Advanced validation rules that span multiple fields */
  validation?: {
    /** Cross-field validation rules */
    crossFieldValidation?: {
      /** Validation rule type */
      rule: 'conditional' | 'mutual_exclusion' | 'dependency' | 'custom';

      /** Human-readable description of the rule */
      description?: string;

      /** Condition that triggers this validation (JavaScript expression) */
      condition?: string;

      /** Fields that are required when condition is true */
      requires?: string[];

      /** Fields that are forbidden when condition is true */
      forbids?: string[];

      /** Custom validation function reference */
      customValidator?: string;

      /** Error message to show when validation fails */
      errorMessage?: string;
    }[];

    /** Global input constraints */
    globalConstraints?: {
      /** Maximum total size of all input data in bytes */
      maxTotalInputSize?: number;

      /** Required input combinations */
      requiredCombinations?: string[][];

      /** Mutually exclusive input groups */
      mutuallyExclusive?: string[][];
    };
  };

  /** Schema version for backward compatibility */
  schemaVersion?: string;

  /** Additional metadata about the schema */
  metadata?: {
    /** When this schema was last updated */
    lastModified?: string;

    /** Author of the schema */
    author?: string;

    /** Tags for schema categorization */
    tags?: string[];

    /** Whether this schema is stable (breaking changes expected) */
    stable?: boolean;
  };
}

export interface ToolInput {
  [key: string]: any;
}

export interface ToolConfig {
  [key: string]: any;
}

/**
 * Execution context provided to tools during execution. This contains metadata
 * about the current execution, tracking information, and environmental data
 * that tools can use for logging, analytics, and conditional behavior.
 *
 * @example
 * ```typescript
 * const context: ToolExecutionContext = {
 *   executionId: 'exec_1234567890abcdef',
 *   toolId: 'weather-api-tool',
 *   toolVersion: '1.2.0',
 *   timestamp: new Date('2024-01-15T10:30:00Z'),
 *   sessionId: 'session_abc123',
 *   userId: 'user_xyz789',
 *   environment: 'production',
 *   requestId: 'req_fedcba0987654321',
 *   performance: {
 *     startTime: Date.now(),
 *     timeoutMs: 30000
 *   },
 *   security: {
 *     apiKeyHash: 'sha256:abc123...',
 *     permissions: ['weather.read', 'location.read']
 *   }
 * }
 * ```
 */
export interface ToolExecutionContext {
  /** Unique identifier for this specific execution */
  executionId: string;

  /** Unique identifier of the tool being executed */
  toolId: string;

  /** Version of the tool being executed */
  toolVersion: string;

  /** Timestamp when execution started */
  timestamp: Date;

  /** Session identifier (groups related executions) */
  sessionId?: string;

  /** User identifier (if available) */
  userId?: string;

  /** Request identifier for tracing across services */
  requestId?: string;

  /** Environment where the tool is running */
  environment?: 'development' | 'staging' | 'production' | string;

  /** Performance and timing information */
  performance?: {
    /** Execution start time (high-resolution timestamp) */
    startTime: number;

    /** Maximum execution time allowed in milliseconds */
    timeoutMs?: number;

    /** Priority level for this execution */
    priority?: 'low' | 'normal' | 'high' | 'critical';

    /** Expected execution duration in milliseconds (for monitoring) */
    expectedDurationMs?: number;
  };

  /** Security and authentication context */
  security?: {
    /** Hash of the API key used (for logging without exposing the key) */
    apiKeyHash?: string;

    /** Permissions granted to this execution */
    permissions?: string[];

    /** Rate limiting information */
    rateLimiting?: {
      /** Remaining requests in current window */
      remaining?: number;

      /** When the rate limit window resets */
      resetAt?: Date;

      /** Total limit per window */
      limit?: number;
    };

    /** Source IP address (if applicable) */
    sourceIp?: string;

    /** User agent string (if applicable) */
    userAgent?: string;
  };

  /** AI agent information */
  agent?: {
    /** Type/name of the AI agent making the request */
    type?: string;

    /** Version of the AI agent */
    version?: string;

    /** Model or engine being used */
    model?: string;

    /** Conversation or thread identifier */
    conversationId?: string;
  };

  /** Debugging and development information */
  debug?: {
    /** Whether debug mode is enabled */
    enabled: boolean;

    /** Debug level */
    level?: 'info' | 'debug' | 'trace';

    /** Custom debug metadata */
    metadata?: Record<string, any>;
  };

  /** Custom metadata for tool-specific context */
  metadata?: Record<string, any>;

  /** Execution flags and options */
  flags?: {
    /** Whether to enable dry-run mode (validation only) */
    dryRun?: boolean;

    /** Whether to bypass caching */
    noCache?: boolean;

    /** Whether to enable verbose output */
    verbose?: boolean;

    /** Custom execution flags */
    custom?: Record<string, boolean>;
  };
}

/**
 * Standardized result format for tool executions. This interface ensures
 * consistent response format across all tools, enabling proper error handling,
 * performance monitoring, and result processing by AI agents.
 *
 * @example
 * ```typescript
 * // Successful execution
 * const successResult: ToolExecutionResult = {
 *   status: 'success',
 *   data: {
 *     temperature: 22,
 *     description: 'sunny',
 *     humidity: 45
 *   },
 *   timing: {
 *     executionTimeMs: 1250,
 *     startedAt: '2024-01-15T10:30:00.000Z',
 *     completedAt: '2024-01-15T10:30:01.250Z'
 *   },
 *   metadata: {
 *     source: 'openweathermap',
 *     cached: false
 *   }
 * }
 *
 * // Error execution
 * const errorResult: ToolExecutionResult = {
 *   status: 'error',
 *   error: {
 *     code: 'API_RATE_LIMIT_EXCEEDED',
 *     message: 'Rate limit exceeded for API key',
 *     type: 'client_error',
 *     retryable: true,
 *     retryAfterMs: 60000
 *   },
 *   timing: {
 *     executionTimeMs: 500,
 *     startedAt: '2024-01-15T10:30:00.000Z',
 *     completedAt: '2024-01-15T10:30:00.500Z'
 *   }
 * }
 * ```
 */
export interface ToolExecutionResult {
  /** Execution status - indicates whether the tool executed successfully */
  status: 'success' | 'error' | 'timeout' | 'cancelled';

  /** Result data (only present on successful execution) */
  data?: any;

  /** Error information (only present when status is not 'success') */
  error?: {
    /** Machine-readable error code */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Error type category */
    type:
      | 'validation_error'
      | 'configuration_error'
      | 'execution_error'
      | 'network_error'
      | 'timeout_error'
      | 'system_error'
      | 'client_error'
      | 'server_error';

    /** Additional error details */
    details?: any;

    /** Whether this error can be retried */
    retryable?: boolean;

    /** Suggested retry delay in milliseconds */
    retryAfterMs?: number;

    /** Stack trace (only in development/debug mode) */
    stackTrace?: string;

    /** Related field name (for validation errors) */
    field?: string;

    /** HTTP status code equivalent (if applicable) */
    httpStatusCode?: number;
  };

  /** Timing and performance information */
  timing?: {
    /** Total execution time in milliseconds */
    executionTimeMs: number;

    /** When execution started (ISO 8601 timestamp) */
    startedAt: string;

    /** When execution completed (ISO 8601 timestamp) */
    completedAt: string;

    /** Time spent in different phases */
    phases?: {
      /** Input validation time */
      validationMs?: number;

      /** Core execution time */
      executionMs?: number;

      /** Result serialization time */
      serializationMs?: number;
    };

    /** Whether execution was cancelled due to timeout */
    timedOut?: boolean;
  };

  /** Resource usage information */
  resources?: {
    /** Memory usage at completion (bytes) */
    memoryUsageBytes?: number;

    /** CPU time used (milliseconds) */
    cpuTimeMs?: number;

    /** Network requests made */
    networkRequests?: number;

    /** External API calls made */
    apiCalls?: {
      /** Service name */
      service: string;

      /** Number of calls */
      count: number;

      /** Total time spent */
      totalTimeMs: number;
    }[];
  };

  /** Caching information */
  cache?: {
    /** Whether result was served from cache */
    hit: boolean;

    /** Cache key used */
    key?: string;

    /** When cache entry expires */
    expiresAt?: string;

    /** Cache source */
    source?: 'memory' | 'redis' | 'database' | 'file';
  };

  /** Output metadata and processing information */
  metadata?: {
    /** Data source information */
    source?: string;

    /** Result freshness timestamp */
    freshness?: string;

    /** Result version or revision */
    version?: string;

    /** Whether result has been truncated */
    truncated?: boolean;

    /** Result format and type */
    format?: string;

    /** Data quality indicators */
    quality?: {
      /** Confidence score (0-1) */
      confidence?: number;

      /** Data completeness (0-1) */
      completeness?: number;

      /** Data accuracy indicators */
      accuracy?: number;
    };

    /** Custom tool-specific metadata */
    custom?: Record<string, any>;
  };

  /** Warnings that don't prevent execution but should be noted */
  warnings?: {
    /** Warning code */
    code: string;

    /** Warning message */
    message: string;

    /** Severity level */
    severity: 'low' | 'medium' | 'high';

    /** Additional warning details */
    details?: any;
  }[];
}

export interface ToolHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime_seconds: number;
  metadata: ToolMetadata;
  capabilities: string[];
  last_execution?: Date;
  error_rate_percent?: number;
  avg_response_time_ms?: number;
}

/**
 * Complete definition of a tool, including all metadata, validation schema,
 * and the execution function. This is the main interface that developers
 * implement when creating tools with the AI Spine SDK.
 *
 * @example
 * ```typescript
 * const weatherTool: ToolDefinition = {
 *   metadata: {
 *     name: 'weather-api-tool',
 *     version: '1.0.0',
 *     description: 'Get current weather for any city',
 *     capabilities: ['weather.current']
 *   },
 *   schema: {
 *     input: {
 *       city: {
 *         type: 'string',
 *         required: true,
 *         description: 'City name'
 *       }
 *     },
 *     config: {
 *       apiKey: {
 *         type: 'apiKey',
 *         required: true,
 *         description: 'Weather API key'
 *       }
 *     }
 *   },
 *   execute: async (input, config, context) => {
 *     // Tool implementation here
 *     return {
 *       status: 'success',
 *       data: { temperature: 22, description: 'sunny' }
 *     };
 *   }
 * }
 * ```
 */
export interface ToolDefinition<TInput = ToolInput, TConfig = ToolConfig> {
  /** Tool metadata and identification information */
  metadata: ToolMetadata;

  /** Input and configuration validation schema */
  schema: ToolSchema;

  /** Main tool execution function */
  execute: (
    input: TInput,
    config: TConfig,
    context: ToolExecutionContext
  ) => Promise<ToolExecutionResult>;

  /** Optional setup function called when tool is initialized */
  setup?: (config: TConfig) => Promise<void>;

  /** Optional cleanup function called when tool is stopped */
  cleanup?: () => Promise<void>;

  /** Optional health check function for monitoring */
  healthCheck?: () => Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details?: Record<string, any>;
  }>;
}

// AI Spine Platform API types
export interface AISpineExecuteRequest {
  tool_id: string;
  input_data: ToolInput;
  config?: ToolConfig;
  execution_id?: string;
  metadata?: Record<string, any>;
  /** File inputs for tools that accept file data */
  files?: FileInput[];
}

export interface AISpineExecuteResponse {
  execution_id: string;
  status: 'success' | 'error';
  output_data?: any;
  error_code?: string;
  error_message?: string;
  error_details?: any;
  execution_time_ms: number;
  timestamp: string;
}

export interface AISpineHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  tool_metadata: ToolMetadata;
  capabilities: string[];
  uptime_seconds: number;
  last_execution?: string;
  error_rate_percent?: number;
  avg_response_time_ms?: number;
}

// Error types
export class ToolError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'TOOL_ERROR', details?: any) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends ToolError {
  constructor(message: string, missingKeys?: string[]) {
    super(message, 'CONFIGURATION_ERROR', { missingKeys });
    this.name = 'ConfigurationError';
  }
}

export class ExecutionError extends ToolError {
  constructor(message: string, cause?: Error) {
    super(message, 'EXECUTION_ERROR', { cause: cause?.message });
    this.name = 'ExecutionError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = T & Partial<Pick<T, K>>;
