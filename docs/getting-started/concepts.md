# Core Concepts

Understanding the fundamental concepts and architecture of AI Spine Tools SDK.

## What is AI Spine Tools SDK?

AI Spine Tools SDK is a comprehensive framework that enables developers to create **tools that AI agents can use**. The core concept is simple:

1. **Developer** creates a tool using the SDK
2. **SDK** automatically generates a standard REST API
3. **AI Agent** can call that API to use the tool

The SDK handles all the complexity of validation, error handling, API generation, and tool lifecycle management.

## Architecture Overview

```
┌─────────────────┐    1. Create Tool    ┌──────────────────┐
│   Developer     │ ──────────────────→ │   SDK Framework  │
│                 │                     │   (createTool)   │
└─────────────────┘                     └──────────────────┘
                                                │
                                       2. Auto-generate API
                                                ▼
┌─────────────────┐    3. HTTP Calls    ┌──────────────────┐
│   AI Agent      │ ◄─────────────────► │   Tool Server    │
│   (ChatBot)     │   POST /api/execute │   (Express.js)   │
└─────────────────┘                     └──────────────────┘
```

## Core Components

### 1. Tool Definition

A tool is defined by three main components:

- **Metadata**: Information about what the tool does
- **Schema**: What inputs it accepts and how to validate them
- **Execute Function**: The actual logic that performs the work

```typescript
const weatherTool = createTool({
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get current weather for any city',
    capabilities: ['weather.current']
  },
  schema: {
    input: { city: stringField({ required: true }) },
    config: { apiKey: apiKeyField({ required: true }) }
  },
  execute: async (input, config, context) => {
    // Your tool logic here
    return { status: 'success', data: weatherData };
  }
});
```

### 2. Input vs Configuration

The SDK distinguishes between two types of data:

#### Input Data (per-execution)
- Provided by AI agents for each tool execution
- Varies with each request
- Example: city name, search query, file to process

#### Configuration Data (tool-level)
- Set once when the tool is configured
- Remains constant across executions
- Example: API keys, database URLs, timeout settings

```typescript
schema: {
  input: {
    query: stringField({ required: true, description: 'Search query' }),
    limit: numberField({ required: false, default: 10, max: 100 })
  },
  config: {
    apiKey: apiKeyField({ required: true, envVar: 'SEARCH_API_KEY' }),
    timeout: configNumberField({ default: 5000, min: 1000, max: 30000 })
  }
}
```

### 3. Field Types and Validation

The SDK provides comprehensive field types with built-in validation:

#### Basic Types
- `string`: Text data with length and format validation
- `number`: Numeric data with range validation
- `boolean`: True/false values
- `array`: Collections of items with length limits
- `object`: Complex nested data structures

#### Advanced Types
- `date`/`time`: Date and time values with timezone support
- `email`: Email addresses with format validation
- `url`: URLs with protocol validation
- `enum`: Predefined set of values
- `file`: File uploads with type and size limits

#### Configuration Types
- `apiKey`: API keys with security handling
- `secret`: Sensitive configuration data
- `configString`: General configuration strings

### 4. Tool Lifecycle

Tools go through a defined lifecycle:

1. **Definition**: Tool is created with `createTool()`
2. **Configuration**: Tool is configured with config data
3. **Startup**: Tool server starts and runs setup function
4. **Execution**: Tool processes requests from AI agents
5. **Shutdown**: Tool stops and runs cleanup function

```typescript
const tool = createTool({
  // ... definition
  setup: async (config) => {
    // Initialize connections, validate API keys, etc.
    console.log('Tool starting up...');
  },
  cleanup: async () => {
    // Close connections, clean up resources, etc.
    console.log('Tool shutting down...');
  }
});

// Start the tool
await tool.start({ port: 3000 });
```

### 5. Execution Context

Every tool execution receives context information:

```typescript
interface ToolExecutionContext {
  executionId: string;     // Unique ID for this execution
  toolId: string;          // Tool identifier
  toolVersion: string;     // Tool version
  timestamp: Date;         // When execution started
  sessionId?: string;      // AI agent session ID
  userId?: string;         // End user ID if available
  performance?: {
    startTime: number;     // High-res timestamp
    timeoutMs: number;     // Execution timeout
  };
  // ... additional context
}
```

This context enables:
- **Logging and debugging** with execution tracking
- **Performance monitoring** with timing information
- **Security auditing** with user and session tracking
- **Rate limiting** based on user or session

### 6. Result Format

All tool executions return a standardized result:

```typescript
// Successful execution
{
  status: 'success',
  data: { /* your result data */ },
  timing: {
    executionTimeMs: 1250,
    startedAt: '2024-01-15T10:30:00.000Z',
    completedAt: '2024-01-15T10:30:01.250Z'
  }
}

// Error execution
{
  status: 'error',
  error: {
    code: 'VALIDATION_ERROR',
    message: 'City name is required',
    type: 'validation_error',
    retryable: false
  }
}
```

## Design Principles

### 1. Declarative Schema

Instead of writing validation code, you declare what your tool needs:

```typescript
// ✅ Declarative - SDK handles validation
input: {
  email: stringField({
    required: true,
    format: 'email',
    description: 'User email address'
  })
}

// ❌ Imperative - manual validation
execute: async (input) => {
  if (!input.email) throw new Error('Email required');
  if (!isValidEmail(input.email)) throw new Error('Invalid email');
  // ... rest of logic
}
```

### 2. Type Safety

The SDK provides full TypeScript support with type inference:

```typescript
const tool = createTool({
  schema: {
    input: {
      name: stringField({ required: true }),
      age: numberField({ required: true, min: 0, max: 120 })
    }
  },
  execute: async (input, config, context) => {
    // input is automatically typed as:
    // { name: string, age: number }
    
    console.log(`Hello ${input.name}, you are ${input.age} years old`);
  }
});
```

### 3. Automatic API Generation

The SDK automatically creates REST endpoints:

- `POST /api/execute` - Execute the tool
- `GET /health` - Health check and status
- `GET /schema` - Tool documentation and schema
- `GET /metrics` - Performance metrics (optional)

### 4. Error Handling

Structured error handling with categorization:

- **Validation Errors**: Input doesn't match schema
- **Configuration Errors**: Tool setup issues
- **Execution Errors**: Runtime errors during tool execution
- **Network Errors**: External service issues
- **System Errors**: Infrastructure problems

### 5. Observability

Built-in monitoring and debugging:

- **Execution tracking** with unique IDs
- **Performance metrics** (response time, throughput, errors)
- **Health monitoring** with custom health checks
- **Structured logging** with context information

## Tool Categories

### 1. Data Processing Tools
Transform, filter, or analyze data:
- Text processing and analysis
- Image manipulation
- Data format conversion
- Mathematical calculations

### 2. Integration Tools
Connect with external services:
- API clients for third-party services
- Database query tools
- File system operations
- Message queue interactions

### 3. Communication Tools
Send information or notifications:
- Email and SMS sending
- Chat and messaging integration
- Social media posting
- Webhook notifications

### 4. Utility Tools
General-purpose functionality:
- Data validation and cleaning
- Format conversion
- Encryption and hashing
- Time and date operations

## Best Practices

### 1. Single Responsibility
Each tool should do one thing well:

```typescript
// ✅ Good - focused responsibility
const weatherTool = createTool({
  metadata: {
    name: 'weather-lookup',
    description: 'Get current weather for a city'
  }
  // ...
});

// ❌ Avoid - multiple responsibilities
const everythingTool = createTool({
  metadata: {
    name: 'weather-email-database-tool',
    description: 'Does weather, email, and database stuff'
  }
  // ...
});
```

### 2. Clear Naming
Use descriptive, consistent names:

```typescript
// ✅ Good naming
input: {
  cityName: stringField({ description: 'Name of the city' }),
  includeDetails: booleanField({ description: 'Include detailed forecast' }),
  temperatureUnit: enumField(['celsius', 'fahrenheit', 'kelvin'])
}

// ❌ Poor naming
input: {
  c: stringField(),
  flag: booleanField(),
  unit: stringField()
}
```

### 3. Comprehensive Validation
Validate all inputs thoroughly:

```typescript
input: {
  email: stringField({
    required: true,
    format: 'email',
    maxLength: 254,
    description: 'Valid email address'
  }),
  age: numberField({
    required: true,
    min: 0,
    max: 150,
    integer: true,
    description: 'Age in years'
  })
}
```

### 4. Error Recovery
Handle errors gracefully with helpful messages:

```typescript
execute: async (input, config, context) => {
  try {
    const result = await externalAPICall(input.query);
    return { status: 'success', data: result };
  } catch (error) {
    if (error.code === 'RATE_LIMIT') {
      return {
        status: 'error',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'API rate limit exceeded, please try again later',
          type: 'client_error',
          retryable: true,
          retryAfterMs: 60000
        }
      };
    }
    // Handle other errors...
  }
}
```

## Next Steps

Now that you understand the core concepts:

1. **[Quick Start](./quick-start.md)** - Create your first tool
2. **[API Reference](../api-reference/README.md)** - Explore all available functions
3. **[Examples](../examples/README.md)** - See complete working tools
4. **[Advanced Usage](../advanced/README.md)** - Learn optimization techniques

---

**Questions?** Check our [FAQ](../community/faq.md) or join our [Discord community](https://discord.gg/ai-spine-tools).