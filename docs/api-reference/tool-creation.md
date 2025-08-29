# Tool Creation API

This document provides comprehensive documentation for creating AI Spine tools using the SDK's factory functions and builder patterns. These APIs enable developers to create type-safe, production-ready tools with minimal boilerplate code.

## Table of Contents

- [Quick Start](#quick-start)
- [createTool() Function](#createtool-function)
- [ToolBuilder Class](#toolbuilder-class)
- [Convenience Functions](#convenience-functions)
- [Configuration Options](#configuration-options)
- [Best Practices](#best-practices)
- [Advanced Patterns](#advanced-patterns)

---

## Quick Start

The fastest way to create a tool is using the `createTool()` function:

```typescript
import { createTool, stringField, apiKeyField } from '@ai-spine/tools';

const weatherTool = createTool({
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get weather information for any city',
    capabilities: ['weather.current']
  },
  
  schema: {
    input: {
      city: stringField({
        required: true,
        description: 'City name',
        example: 'Madrid'
      })
    },
    
    config: {
      apiKey: apiKeyField({
        required: true,
        envVar: 'WEATHER_API_KEY'
      })
    }
  },
  
  execute: async (input, config, context) => {
    // Your tool logic here
    return {
      status: 'success',
      data: { temperature: 22, description: 'sunny' }
    };
  }
});

// Start the tool server
await weatherTool.start({ port: 3000 });
```

---

## createTool() Function

The `createTool()` function is the primary factory for creating AI Spine tools. It provides comprehensive type safety, validation, and lifecycle management.

### Signature

```typescript
function createTool<TInput = ToolInput, TConfig = ToolConfig>(
  options: CreateToolOptions<TInput, TConfig>
): Tool<TInput, TConfig>
```

### Parameters

#### CreateToolOptions<TInput, TConfig>

```typescript
interface CreateToolOptions<TInput = ToolInput, TConfig = ToolConfig> {
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

### Complete Example

```typescript
import { createTool, stringField, numberField, apiKeyField, enumField } from '@ai-spine/tools';

interface WeatherInput {
  city: string;
  country?: string;
  units?: 'celsius' | 'fahrenheit' | 'kelvin';
  includeDetails?: boolean;
}

interface WeatherConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

const weatherTool = createTool<WeatherInput, WeatherConfig>({
  metadata: {
    name: 'weather-tool',
    version: '1.2.0',
    description: 'Fetch current weather data for any city worldwide using OpenWeatherMap API',
    capabilities: ['weather.current', 'weather.forecast', 'location.lookup'],
    author: 'Your Name',
    license: 'MIT',
    tags: ['weather', 'api', 'external-service'],
    requirements: {
      apiKeys: ['OPENWEATHER_API_KEY'],
      permissions: ['internet-access'],
      runtimeDependencies: ['node:18+']
    }
  },

  schema: {
    input: {
      city: stringField({
        required: true,
        description: 'Name of the city to get weather for',
        minLength: 2,
        maxLength: 100,
        example: 'Madrid',
        transform: 'trim'
      }),
      
      country: stringField({
        required: false,
        description: 'ISO 3166 country code for disambiguation',
        minLength: 2,
        maxLength: 2,
        pattern: '^[A-Z]{2}$',
        example: 'ES'
      }),
      
      units: enumField(['celsius', 'fahrenheit', 'kelvin'], {
        required: false,
        description: 'Temperature units for the response',
        default: 'celsius'
      }),
      
      includeDetails: {
        type: 'boolean',
        required: false,
        description: 'Include additional weather details (wind, pressure, humidity)',
        default: false
      }
    },

    config: {
      apiKey: apiKeyField({
        required: true,
        description: 'OpenWeatherMap API key for weather data access',
        envVar: 'OPENWEATHER_API_KEY',
        validation: {
          pattern: '^[a-f0-9]{32}$',
          errorMessage: 'OpenWeatherMap API key must be a 32-character hexadecimal string'
        }
      }),
      
      baseUrl: {
        type: 'url',
        required: false,
        description: 'OpenWeatherMap API base URL',
        default: 'https://api.openweathermap.org/data/2.5',
        validation: {
          allowedProtocols: ['https']
        }
      },
      
      timeout: {
        type: 'number',
        required: false,
        description: 'Request timeout in milliseconds',
        default: 10000,
        validation: {
          min: 1000,
          max: 60000
        }
      }
    },

    // Advanced validation rules
    validation: {
      crossFieldValidation: [
        {
          rule: 'conditional',
          condition: 'input.includeDetails === true',
          description: 'When detailed weather is requested, ensure we have sufficient API quota',
          customValidator: 'validateDetailedWeatherQuota'
        }
      ],
      
      globalConstraints: {
        maxTotalInputSize: 1024, // 1KB limit for all input data
        requiredCombinations: [
          ['city'] // At minimum, city is required
        ]
      }
    }
  },

  // Main execution function with comprehensive error handling
  execute: async (input, config, context) => {
    const startTime = context.performance?.startTime || Date.now();
    
    try {
      console.log(`Fetching weather for ${input.city} (ID: ${context.executionId})`);
      
      // Build API URL with parameters
      const params = new URLSearchParams({
        q: input.country ? `${input.city},${input.country}` : input.city,
        appid: config.apiKey,
        units: input.units === 'celsius' ? 'metric' : 
               input.units === 'fahrenheit' ? 'imperial' : 'standard'
      });
      
      const url = `${config.baseUrl}/weather?${params.toString()}`;
      
      // Make API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': `AI-Spine-Weather-Tool/${context.toolVersion}`,
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        return {
          status: 'error',
          error: {
            code: response.status === 401 ? 'INVALID_API_KEY' : 
                   response.status === 404 ? 'CITY_NOT_FOUND' :
                   response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'API_ERROR',
            message: errorData?.message || `Weather API returned ${response.status}: ${response.statusText}`,
            type: response.status >= 500 ? 'server_error' : 'client_error',
            retryable: response.status >= 500 || response.status === 429,
            retryAfterMs: response.status === 429 ? 60000 : undefined,
            httpStatusCode: response.status,
            details: errorData
          },
          timing: {
            executionTimeMs: Date.now() - startTime,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString()
          }
        };
      }
      
      const weatherData = await response.json();
      
      // Format response data
      const result = {
        location: {
          city: weatherData.name,
          country: weatherData.sys.country,
          coordinates: {
            latitude: weatherData.coord.lat,
            longitude: weatherData.coord.lon
          }
        },
        
        current: {
          temperature: weatherData.main.temp,
          temperatureUnit: input.units || 'celsius',
          feelsLike: weatherData.main.feels_like,
          description: weatherData.weather[0].description,
          condition: weatherData.weather[0].main,
          icon: weatherData.weather[0].icon
        },
        
        timestamp: {
          measured: new Date(weatherData.dt * 1000).toISOString(),
          timezone: weatherData.timezone
        }
      };
      
      // Add detailed information if requested
      if (input.includeDetails) {
        result.details = {
          temperature: {
            min: weatherData.main.temp_min,
            max: weatherData.main.temp_max,
            pressure: weatherData.main.pressure,
            humidity: weatherData.main.humidity
          },
          
          wind: {
            speed: weatherData.wind?.speed || 0,
            direction: weatherData.wind?.deg || 0,
            gust: weatherData.wind?.gust
          },
          
          atmosphere: {
            visibility: weatherData.visibility || 0,
            cloudiness: weatherData.clouds?.all || 0
          },
          
          sun: {
            sunrise: new Date(weatherData.sys.sunrise * 1000).toISOString(),
            sunset: new Date(weatherData.sys.sunset * 1000).toISOString()
          }
        };
      }
      
      return {
        status: 'success',
        data: result,
        
        timing: {
          executionTimeMs: Date.now() - startTime,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          phases: {
            validationMs: 5,
            executionMs: Date.now() - startTime - 5,
            serializationMs: 2
          }
        },
        
        resources: {
          networkRequests: 1,
          apiCalls: [
            {
              service: 'OpenWeatherMap',
              count: 1,
              totalTimeMs: Date.now() - startTime
            }
          ]
        },
        
        metadata: {
          source: 'openweathermap',
          version: weatherData.dt,
          quality: {
            confidence: 0.95,
            completeness: input.includeDetails ? 1.0 : 0.7,
            accuracy: 0.9
          }
        }
      };
      
    } catch (error) {
      // Handle execution errors
      return {
        status: 'error',
        error: {
          code: error.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'EXECUTION_ERROR',
          message: `Failed to fetch weather data: ${error.message}`,
          type: error.name === 'AbortError' ? 'timeout_error' : 'execution_error',
          retryable: true,
          stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timing: {
          executionTimeMs: Date.now() - startTime,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          timedOut: error.name === 'AbortError'
        }
      };
    }
  },

  // Optional setup function for configuration validation
  setup: async (config) => {
    console.log('🌤️  Setting up weather tool...');
    
    try {
      // Test API key validity with a lightweight request
      const testUrl = `${config.baseUrl}/weather?q=London&appid=${config.apiKey}`;
      const response = await fetch(testUrl, { 
        signal: AbortSignal.timeout(config.timeout || 10000)
      });
      
      if (response.status === 401) {
        throw new Error('Invalid OpenWeatherMap API key. Please check your OPENWEATHER_API_KEY environment variable.');
      }
      
      if (response.status === 429) {
        console.warn('⚠️  API rate limit detected during setup. Tool will handle rate limiting during execution.');
      } else if (!response.ok) {
        console.warn(`⚠️  API test returned ${response.status}. Tool may experience issues.`);
      } else {
        console.log('✅ OpenWeatherMap API connection successful');
      }
      
    } catch (error) {
      console.error('❌ Weather API setup failed:', error.message);
      throw error;
    }
  },

  // Optional cleanup function
  cleanup: async () => {
    console.log('🧹 Weather tool cleanup completed');
  },

  // Optional custom health check
  healthCheck: async () => {
    try {
      // Perform a lightweight health check
      const healthUrl = 'https://api.openweathermap.org';
      const response = await fetch(healthUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        details: {
          apiEndpoint: healthUrl,
          responseStatus: response.status,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          lastCheck: new Date().toISOString()
        }
      };
    }
  }
});

// Start the tool server with production configuration
await weatherTool.start({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  host: process.env.HOST || '0.0.0.0',
  
  security: {
    requireAuth: process.env.NODE_ENV === 'production',
    apiKeys: process.env.CLIENT_API_KEYS?.split(',') || [],
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }
  },
  
  development: {
    requestLogging: process.env.NODE_ENV === 'development',
    hotReload: process.env.NODE_ENV === 'development'
  }
});
```

### Features

The `createTool()` function provides:

- **Type Safety**: Full TypeScript inference for input and configuration types
- **Comprehensive Validation**: Automatic validation of tool definition and schema
- **Intelligent Defaults**: Reasonable defaults for common patterns
- **Development Enhancements**: Additional debugging and logging in development mode
- **Plugin Integration**: Extension points for custom functionality

---

## ToolBuilder Class

The `ToolBuilder` class provides a fluent API for step-by-step tool construction with incremental validation.

### Basic Usage

```typescript
import { ToolBuilder, stringField, apiKeyField } from '@ai-spine/tools';

const tool = new ToolBuilder()
  .metadata({
    name: 'example-tool',
    version: '1.0.0',
    description: 'Example tool using builder pattern',
    capabilities: ['example.demo']
  })
  .inputField('message', stringField({
    required: true,
    description: 'Message to process',
    minLength: 1,
    maxLength: 1000
  }))
  .configField('apiKey', apiKeyField({
    required: true,
    envVar: 'EXAMPLE_API_KEY'
  }))
  .execute(async (input, config, context) => {
    return {
      status: 'success',
      data: {
        processedMessage: input.message.toUpperCase(),
        timestamp: new Date().toISOString()
      }
    };
  })
  .build();

await tool.start({ port: 3001 });
```

### ToolBuilder Methods

#### metadata(metadata: ToolMetadata)

Set comprehensive tool metadata with validation.

```typescript
.metadata({
  name: 'weather-tool',
  version: '1.0.0',
  description: 'Get current weather data',
  capabilities: ['weather.current', 'weather.forecast'],
  author: 'Your Name',
  license: 'MIT',
  tags: ['weather', 'api', 'external-service'],
  requirements: {
    apiKeys: ['WEATHER_API_KEY'],
    permissions: ['internet-access']
  }
})
```

#### input(schema: Record<string, ToolInputField>)

Define multiple input fields at once.

```typescript
.input({
  city: stringField({ required: true, description: 'City name' }),
  country: stringField({ required: false, description: 'Country code' }),
  units: enumField(['celsius', 'fahrenheit'], {
    required: false,
    default: 'celsius'
  })
})
```

#### inputField(name: string, field: ToolInputField)

Add a single input field with validation.

```typescript
.inputField('temperature', numberField({
  required: true,
  min: -100,
  max: 100,
  description: 'Temperature value'
}))
.inputField('location', {
  type: 'object',
  required: true,
  properties: {
    latitude: numberField({ required: true, min: -90, max: 90 }),
    longitude: numberField({ required: true, min: -180, max: 180 })
  },
  requiredProperties: ['latitude', 'longitude']
})
```

#### config(schema: Record<string, ToolConfigField>)

Define multiple configuration fields at once.

```typescript
.config({
  apiKey: apiKeyField({ required: true, envVar: 'API_KEY' }),
  baseUrl: {
    type: 'url',
    required: false,
    default: 'https://api.example.com',
    validation: { allowedProtocols: ['https'] }
  },
  timeout: {
    type: 'number',
    required: false,
    default: 5000,
    validation: { min: 1000, max: 30000 }
  }
})
```

#### configField(name: string, field: ToolConfigField)

Add a single configuration field with validation.

```typescript
.configField('apiKey', apiKeyField({
  required: true,
  envVar: 'WEATHER_API_KEY',
  description: 'OpenWeatherMap API key'
}))
.configField('retries', {
  type: 'number',
  required: false,
  default: 3,
  description: 'Number of retry attempts',
  validation: { min: 0, max: 10 }
})
```

#### execute(fn: ExecuteFunction)

Set the main tool execution function with comprehensive type safety.

```typescript
.execute(async (input, config, context) => {
  // Validate input
  if (!input.query) {
    return {
      status: 'error',
      error: {
        code: 'MISSING_QUERY',
        message: 'Query parameter is required',
        type: 'validation_error',
        field: 'query'
      }
    };
  }
  
  try {
    // Execute tool logic
    const result = await processQuery(input.query, config.apiKey);
    
    return {
      status: 'success',
      data: result,
      timing: {
        executionTimeMs: Date.now() - context.performance!.startTime,
        startedAt: new Date(context.performance!.startTime).toISOString(),
        completedAt: new Date().toISOString()
      },
      metadata: {
        source: 'external-api',
        cached: false
      }
    };
    
  } catch (error) {
    return {
      status: 'error',
      error: {
        code: 'PROCESSING_FAILED',
        message: `Query processing failed: ${error.message}`,
        type: 'execution_error',
        retryable: true
      }
    };
  }
})
```

#### Lifecycle Methods

```typescript
// Setup function called during tool initialization
.onSetup(async (config) => {
  console.log('Initializing tool...');
  await validateApiConnection(config.apiKey);
  console.log('Tool setup completed');
})

// Cleanup function called when tool is stopped
.onCleanup(async () => {
  console.log('Cleaning up resources...');
  await closeConnections();
  console.log('Cleanup completed');
})

// Custom health check for monitoring
.healthCheck(async () => {
  try {
    const isHealthy = await checkSystemHealth();
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      details: { lastCheck: new Date().toISOString() }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error.message }
    };
  }
})
```

#### build()

Build the tool with comprehensive validation.

```typescript
const tool = builder.build();
await tool.start({ port: 3000 });
```

### Validation and Error Checking

```typescript
const builder = new ToolBuilder()
  .metadata({ name: 'test-tool', version: '1.0.0' });

// Check validation errors before building
if (!builder.isValid()) {
  const errors = builder.getValidationErrors();
  console.error('Builder validation errors:', errors);
}

// Build will throw ConfigurationError if invalid
try {
  const tool = builder.build();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Configuration error:', error.message);
  }
}
```

---

## Convenience Functions

### simpleCreateTool()

Creates a simple tool with minimal configuration for quick prototyping.

```typescript
function simpleCreateTool<TInput = ToolInput>(
  name: string,
  version: string,
  description: string,
  execute: (input: TInput) => Promise<any>
): Tool<TInput, {}>
```

**Example:**
```typescript
import { simpleCreateTool } from '@ai-spine/tools';

const echoTool = simpleCreateTool(
  'echo-tool',
  '1.0.0',
  'Simple echo tool for testing',
  async (input) => {
    return { echo: input, timestamp: new Date().toISOString() };
  }
);

await echoTool.start({ port: 3000 });
```

### createToolBuilder()

Creates a tool builder instance for fluent API usage.

```typescript
function createToolBuilder<TInput = ToolInput, TConfig = ToolConfig>(): ToolBuilder<TInput, TConfig>
```

**Example:**
```typescript
import { createToolBuilder, stringField } from '@ai-spine/tools';

const tool = createToolBuilder()
  .metadata({
    name: 'my-tool',
    version: '1.0.0',
    description: 'My awesome tool',
    capabilities: ['demo']
  })
  .inputField('message', stringField({ required: true }))
  .execute(async (input) => ({ processed: input.message }))
  .build();
```

---

## Configuration Options

### Tool Start Options

When starting a tool, you can configure various aspects of the server:

```typescript
await tool.start({
  // Server configuration
  port: 3000,
  host: '0.0.0.0',
  
  // Security settings
  security: {
    requireAuth: true,
    apiKeys: ['client-key-1', 'client-key-2'],
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    },
    corsOrigins: ['https://myapp.com'],
    tlsOptions: {
      cert: './cert.pem',
      key: './key.pem'
    }
  },
  
  // Development settings
  development: {
    requestLogging: true,
    hotReload: true,
    verboseErrors: true
  },
  
  // Performance settings
  performance: {
    maxConcurrentExecutions: 10,
    executionTimeout: 30000,
    memoryLimit: 512 * 1024 * 1024 // 512MB
  },
  
  // Monitoring settings
  monitoring: {
    enableMetrics: true,
    metricsPath: '/metrics',
    healthCheckInterval: 30000
  }
});
```

---

## Best Practices

### 1. Type Safety

Always use TypeScript interfaces for your input and configuration types:

```typescript
interface MyToolInput {
  query: string;
  options?: {
    format: 'json' | 'xml';
    limit: number;
  };
}

interface MyToolConfig {
  apiKey: string;
  baseUrl?: string;
}

const tool = createTool<MyToolInput, MyToolConfig>({
  // Full type safety throughout
});
```

### 2. Comprehensive Validation

Use field builders and validation rules to ensure data quality:

```typescript
schema: {
  input: {
    email: stringField({
      required: true,
      format: 'email',
      description: 'User email address'
    }),
    age: numberField({
      required: false,
      min: 0,
      max: 150,
      integer: true
    }),
    preferences: arrayField(
      enumField(['news', 'sports', 'tech']),
      {
        required: false,
        minItems: 0,
        maxItems: 10,
        uniqueItems: true
      }
    )
  }
}
```

### 3. Error Handling

Provide detailed, actionable error messages:

```typescript
execute: async (input, config, context) => {
  try {
    // Tool logic here
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      return {
        status: 'error',
        error: {
          code: 'EXTERNAL_SERVICE_UNAVAILABLE',
          message: 'The external service is temporarily unavailable. Please try again later.',
          type: 'network_error',
          retryable: true,
          retryAfterMs: 30000
        }
      };
    }
    
    // Handle other error types...
  }
}
```

### 4. Resource Management

Implement proper setup and cleanup:

```typescript
setup: async (config) => {
  // Initialize connections, validate configuration
  await initializeDatabase(config.databaseUrl);
  await validateApiKey(config.apiKey);
},

cleanup: async () => {
  // Clean up resources
  await closeDatabaseConnection();
  await clearCaches();
},

healthCheck: async () => {
  // Check system health
  const dbHealthy = await checkDatabase();
  const apiHealthy = await checkExternalApi();
  
  return {
    status: dbHealthy && apiHealthy ? 'healthy' : 'degraded',
    details: { database: dbHealthy, api: apiHealthy }
  };
}
```

### 5. Performance Considerations

Optimize for performance and scalability:

```typescript
execute: async (input, config, context) => {
  const startTime = Date.now();
  
  try {
    // Use timeouts to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const result = await processWithTimeout(input, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      status: 'success',
      data: result,
      timing: {
        executionTimeMs: Date.now() - startTime,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString()
      },
      resources: {
        memoryUsageBytes: process.memoryUsage().heapUsed,
        networkRequests: 1
      }
    };
    
  } catch (error) {
    // Handle timeouts and other errors
  }
}
```

---

## Advanced Patterns

### Custom Field Validation

Create custom validation logic for complex requirements:

```typescript
schema: {
  input: {
    creditCard: stringField({
      required: true,
      pattern: '^\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}$',
      sensitive: true, // Mark as sensitive data
      transform: 'normalize', // Remove spaces/dashes
      customValidator: 'validateLuhnChecksum'
    })
  }
}
```

### Cross-Field Validation

Implement validation rules that span multiple fields:

```typescript
schema: {
  input: {
    startDate: dateField({ required: true }),
    endDate: dateField({ required: true }),
    duration: numberField({ required: false })
  },
  
  validation: {
    crossFieldValidation: [
      {
        rule: 'custom',
        description: 'End date must be after start date',
        customValidator: 'validateDateRange',
        errorMessage: 'End date must be later than start date'
      },
      {
        rule: 'dependency',
        condition: 'input.duration != null',
        requires: ['input.startDate'],
        errorMessage: 'Start date is required when duration is specified'
      }
    ]
  }
}
```

### Conditional Schema

Adjust schema based on runtime conditions:

```typescript
export function createConditionalTool(mode: 'simple' | 'advanced') {
  const baseSchema = {
    message: stringField({ required: true })
  };
  
  const advancedSchema = mode === 'advanced' ? {
    options: objectField({
      format: enumField(['json', 'xml']),
      compression: booleanField({ default: false })
    }),
    metadata: {
      type: 'object',
      required: false,
      additionalProperties: true
    }
  } : {};
  
  return createTool({
    metadata: {
      name: `${mode}-tool`,
      version: '1.0.0',
      description: `Tool in ${mode} mode`,
      capabilities: [mode]
    },
    
    schema: {
      input: { ...baseSchema, ...advancedSchema },
      config: {}
    },
    
    execute: async (input, config, context) => {
      // Handle both simple and advanced modes
    }
  });
}
```

### Plugin Integration

Extend tools with custom middleware and plugins:

```typescript
const tool = createTool({
  // ... tool definition
  
  execute: async (input, config, context) => {
    // Apply middleware chain
    const middlewares = [
      rateLimitMiddleware,
      authenticationMiddleware,
      validationMiddleware,
      loggingMiddleware
    ];
    
    for (const middleware of middlewares) {
      const result = await middleware(input, config, context);
      if (result.shouldStop) {
        return result.response;
      }
    }
    
    // Main tool logic
    return await executeMainLogic(input, config, context);
  }
});
```

---

## See Also

- [Core Types](./core-types.md) - Type definitions used in tool creation
- [Field Builders](./field-builders.md) - Helper functions for creating field definitions and validation
- [Getting Started](../getting-started/quick-start.md) - Quick start guide with examples
- [Advanced Usage](../advanced/README.md) - Advanced patterns and techniques