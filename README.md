# AI Spine Tools SDK

[![npm version](https://badge.fury.io/js/%40ai-spine%2Ftools.svg)](https://badge.fury.io/js/%40ai-spine%2Ftools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official SDK for building AI Spine compatible tools. Create production-ready tools in minutes with automatic API generation, validation, testing utilities, and deployment support.

## 🚀 Quick Start

Create your first AI Spine tool in 30 seconds:

```bash
# Create a new tool
npx create-ai-spine-tool my-awesome-tool

# Navigate to your tool
cd my-awesome-tool

# Start development
npm run dev
```

Your tool is now running at `http://localhost:3000` with automatic health checks and API endpoints!

## ✨ Features

- **🔧 Zero Boilerplate**: Framework handles all the plumbing
- **✅ Automatic Validation**: Schema-based input and configuration validation
- **🛡️ Type Safety**: Full TypeScript support with auto-generated types
- **🧪 Testing Utilities**: Comprehensive testing framework included
- **📊 Health Monitoring**: Built-in health checks and metrics
- **🔑 Authentication**: API key authentication support
- **📝 Auto Documentation**: Generate API docs from schema
- **🚢 Easy Deployment**: Multiple deployment options

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@ai-spine/tools` | Main framework for building tools | ✅ Ready |
| `@ai-spine/tools-core` | Core types and utilities | ✅ Ready |
| `@ai-spine/tools-testing` | Testing utilities and helpers | ✅ Ready |
| `create-ai-spine-tool` | CLI tool for scaffolding | ✅ Ready |

## 🎯 Simple Example

```typescript
import { createTool, stringField, numberField } from '@ai-spine/tools';

const myTool = createTool({
  metadata: {
    name: 'my-tool',
    version: '1.0.0',
    description: 'A simple example tool',
    capabilities: ['text-processing'],
  },

  schema: {
    input: {
      message: stringField({
        required: true,
        description: 'Message to process',
        maxLength: 1000,
      }),
      count: numberField({
        required: false,
        description: 'Repeat count',
        min: 1,
        max: 10,
        default: 1,
      }),
    },
    config: {
      api_key: {
        type: 'key',
        required: true,
        description: 'API key for external service',
      },
    },
  },

  async execute(input, config, context) {
    // Your tool logic here
    const result = input.message.repeat(input.count || 1);
    
    return {
      processed_message: result,
      timestamp: context.timestamp,
      execution_id: context.execution_id,
    };
  },
});

// Start the server
myTool.serve({ port: 3000 });
```

## 🛠️ Installation

### Framework

```bash
npm install @ai-spine/tools
```

### CLI Tool

```bash
npm install -g create-ai-spine-tool
```

### Testing Utilities

```bash
npm install --save-dev @ai-spine/tools-testing
```

## 📖 Documentation

### Getting Started

1. [Quick Start Guide](docs/getting-started.md)
2. [Schema Definition](docs/schema-definition.md)
3. [Tool Development](docs/tool-development.md)
4. [Testing Guide](docs/testing.md)
5. [Deployment Guide](docs/deployment.md)

### API Reference

1. [Core API](docs/api/core.md)
2. [Tool Creation](docs/api/tool-creation.md)
3. [Field Types](docs/api/field-types.md)
4. [Testing API](docs/api/testing.md)

### Examples

- [Weather Tool](examples/weather-tool/) - Get weather data from OpenWeatherMap
- [Email Tool](examples/email-tool/) - Send emails via SendGrid
- [More Examples](examples/) - Additional tool examples

## 🎨 Templates

Choose from pre-built templates:

- **Basic Tool** - Simple tool with minimal setup
- **API Integration** - Tool that integrates with external APIs
- **Data Processing** - Tool for data transformation and analysis

```bash
npx create-ai-spine-tool my-tool --template api-integration
```

## 🧪 Testing

### Unit Testing

```typescript
import { testTool, generateTestData } from '@ai-spine/tools-testing';

describe('My Tool', () => {
  it('should process input correctly', async () => {
    const response = await testTool(app, {
      message: 'Hello',
      count: 2,
    });

    expect(response.body.output_data.processed_message).toBe('HelloHello');
  });
});
```

### Integration Testing

```typescript
import { AISpineTestClient } from '@ai-spine/tools-testing';

const client = new AISpineTestClient({
  baseURL: 'http://localhost:3000',
});

const result = await client.execute({
  message: 'Test',
});

expect(result.success).toBe(true);
```

### Load Testing

```typescript
const results = await client.loadTest(
  { message: 'Load test' },
  { concurrency: 10, requests: 100 }
);

console.log(`Processed ${results.requestsPerSecond} requests/second`);
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD [\"npm\", \"start\"]
```

### Serverless

Deploy to Vercel, Netlify, or AWS Lambda:

```bash
npm run build
npm run deploy
```

### AI Spine Platform

```bash
npm run deploy:ai-spine
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Authentication
API_KEY_AUTH=true
VALID_API_KEYS=key1,key2,key3

# Tool-specific config
EXTERNAL_API_KEY=your-api-key
```

### Programmatic Configuration

```typescript
await myTool.serve({
  port: 3000,
  host: '0.0.0.0',
  apiKeyAuth: true,
  validApiKeys: ['key1', 'key2'],
  logLevel: 'info',
});
```

## 🔍 Schema Definition

Define your tool's input and configuration schema:

```typescript
schema: {
  input: {
    // String field with validation
    email: stringField({
      required: true,
      format: 'email',
      description: 'User email address',
    }),

    // Number field with constraints
    age: numberField({
      required: true,
      min: 0,
      max: 120,
      description: 'User age',
    }),

    // Array field
    tags: arrayField(
      stringField({ required: true }),
      { required: false, description: 'Tags list' }
    ),

    // Object field
    preferences: objectField({
      theme: stringField({ enum: ['light', 'dark'] }),
      notifications: booleanField({ default: true }),
    }),

    // Date and time fields
    birthday: dateField({ required: true }),
    meetingTime: timeField({ required: true }),
  },

  config: {
    // API key field
    api_key: apiKeyField({
      required: true,
      description: 'Service API key',
    }),

    // Configuration string
    base_url: configStringField({
      required: false,
      default: 'https://api.example.com',
    }),
  },
}
```

## 🛡️ Error Handling

The framework provides comprehensive error handling:

```typescript
import { ToolError, ValidationError, ConfigurationError } from '@ai-spine/tools';

// In your execute function
if (!isValidInput(input.data)) {
  throw new ValidationError('Invalid data format', 'data', input.data);
}

if (!config.api_key) {
  throw new ConfigurationError('API key is required');
}

// Generic tool error
throw new ToolError('Processing failed', 'PROCESSING_ERROR', { details });
```

## 📊 Monitoring

Built-in health checks and metrics:

```bash
# Health check
curl http://localhost:3000/health

# Response
{
  \"status\": \"healthy\",
  \"version\": \"1.0.0\",
  \"uptime_seconds\": 3600,
  \"error_rate_percent\": 0.5,
  \"avg_response_time_ms\": 150
}
```

Get tool statistics programmatically:

```typescript
const stats = myTool.getStats();
console.log(stats.executionCount, stats.errorRate);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Issues

Found a bug? Have a feature request? Please [open an issue](https://github.com/ai-spine/tools-sdk/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript and Node.js
- Express.js for HTTP server
- Rollup for build system
- Jest for testing
- SendGrid and OpenWeatherMap for example integrations

## 🔗 Links

- [AI Spine Platform](https://ai-spine.com)
- [Documentation](https://docs.ai-spine.com/tools)
- [Examples Repository](https://github.com/ai-spine/tool-examples)
- [Community Discord](https://discord.gg/ai-spine)

---

Made with ❤️ by the AI Spine team