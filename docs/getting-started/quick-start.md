# Quick Start Guide

Get started with AI Spine Tools SDK in just 5 minutes! This guide will walk you through creating your first AI-agent-compatible tool.

## Prerequisites

- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **npm**: Version 8 or higher (included with Node.js)
- **Basic TypeScript/JavaScript knowledge**

## Installation

### Option 1: Using npm (Recommended)

```bash
npm install -g create-ai-spine-tool
```

### Option 2: Using npx (No global install)

```bash
npx create-ai-spine-tool my-first-tool
```

## Create Your First Tool

Let's create a simple weather tool that AI agents can use:

```bash
# Create a new tool project
create-ai-spine-tool weather-tool

# Follow the interactive prompts:
# ? Select template: Basic Tool (TypeScript)
# ? Tool description: Get current weather for any city
# ? Author name: Your Name
# ? Include example tests: Yes
```

This creates a project structure:

```
weather-tool/
├── src/
│   └── index.ts          # Main tool implementation
├── tests/
│   └── tool.test.ts      # Test suite
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # Tool documentation
```

## Implement Your Tool

Open `src/index.ts` and replace the generated code:

```typescript
import { createTool, stringField, apiKeyField } from '@ai-spine/tools';

// Create the weather tool
const weatherTool = createTool({
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get current weather data for any city worldwide',
    capabilities: ['weather.current', 'weather.lookup'],
    author: 'Your Name',
    tags: ['weather', 'api', 'openweathermap']
  },
  
  schema: {
    // Input fields - what AI agents will provide
    input: {
      city: stringField({
        required: true,
        description: 'Name of the city to get weather for',
        minLength: 2,
        maxLength: 100,
        example: 'Madrid'
      }),
      units: {
        type: 'enum',
        required: false,
        description: 'Temperature units to use',
        enum: ['celsius', 'fahrenheit', 'kelvin'],
        default: 'celsius'
      },
      includeDetails: {
        type: 'boolean',
        required: false,
        description: 'Include detailed weather information',
        default: false
      }
    },
    
    // Configuration fields - set once during tool setup
    config: {
      apiKey: apiKeyField({
        required: true,
        description: 'OpenWeatherMap API key',
        envVar: 'OPENWEATHER_API_KEY'
      }),
      baseUrl: {
        type: 'url',
        required: false,
        description: 'OpenWeatherMap API base URL',
        default: 'https://api.openweathermap.org/data/2.5'
      }
    }
  },
  
  // Main execution function
  execute: async (input, config, context) => {
    try {
      // Build API URL with parameters
      const params = new URLSearchParams({
        q: input.city,
        appid: config.apiKey,
        units: input.units || 'celsius'
      });
      
      const url = `${config.baseUrl}/weather?${params.toString()}`;
      
      // Make API request
      const response = await fetch(url);
      
      if (!response.ok) {
        return {
          status: 'error',
          error: {
            code: 'API_REQUEST_FAILED',
            message: `Weather API returned ${response.status}: ${response.statusText}`,
            type: 'network_error',
            retryable: response.status >= 500,
            httpStatusCode: response.status
          }
        };
      }
      
      const data = await response.json();
      
      // Format the response
      const result = {
        city: data.name,
        country: data.sys.country,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        units: input.units || 'celsius'
      };
      
      // Add detailed information if requested
      if (input.includeDetails) {
        result.details = {
          pressure: data.main.pressure,
          windSpeed: data.wind?.speed || 0,
          windDirection: data.wind?.deg || 0,
          visibility: data.visibility || 0,
          sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
          sunset: new Date(data.sys.sunset * 1000).toISOString()
        };
      }
      
      return {
        status: 'success',
        data: result,
        timing: {
          executionTimeMs: Date.now() - context.performance!.startTime,
          startedAt: new Date(context.performance!.startTime).toISOString(),
          completedAt: new Date().toISOString()
        },
        metadata: {
          source: 'openweathermap',
          cached: false,
          units: input.units || 'celsius'
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: `Failed to fetch weather data: ${error.message}`,
          type: 'execution_error',
          retryable: true
        }
      };
    }
  },
  
  // Optional: Setup function for configuration validation
  setup: async (config) => {
    console.log('🌤️  Setting up weather tool...');
    
    // Test API key validity
    try {
      const testUrl = `${config.baseUrl}/weather?q=London&appid=${config.apiKey}`;
      const response = await fetch(testUrl);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OPENWEATHER_API_KEY.');
      }
      
      console.log('✅ Weather API connection successful');
    } catch (error) {
      console.error('❌ Weather API setup failed:', error.message);
      throw error;
    }
  },
  
  // Optional: Custom health check
  healthCheck: async () => {
    return {
      status: 'healthy',
      details: {
        api: 'connected',
        lastCheck: new Date().toISOString()
      }
    };
  }
});

export default weatherTool;

// Start the tool server when run directly
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  weatherTool.start({
    port,
    security: {
      // Add API keys for client authentication
      apiKeys: process.env.CLIENT_API_KEYS?.split(',') || [],
      requireAuth: process.env.NODE_ENV === 'production'
    }
  }).then(() => {
    console.log(`🚀 Weather tool server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📖 API schema: http://localhost:${port}/schema`);
  }).catch(error => {
    console.error('Failed to start weather tool:', error);
    process.exit(1);
  });
}
```

## Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# OpenWeatherMap API Key (get free at https://openweathermap.org/api)
OPENWEATHER_API_KEY=your_api_key_here

# Optional: Client API keys for authentication
CLIENT_API_KEYS=client-key-1,client-key-2

# Optional: Custom port
PORT=3000
```

## Install Dependencies and Build

```bash
# Navigate to your tool directory
cd weather-tool

# Install dependencies
npm install

# Build the tool
npm run build

# Run tests to make sure everything works
npm test
```

## Start Your Tool

```bash
# Start in development mode with hot reload
npm run dev

# Or start the production build
npm start
```

Your tool is now running! You'll see output like:

```
🌤️  Setting up weather tool...
✅ Weather API connection successful
🚀 Weather tool server running on port 3000
📊 Health check: http://localhost:3000/health
📖 API schema: http://localhost:3000/schema
```

## Test Your Tool

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "metadata": {
    "name": "weather-tool",
    "description": "Get current weather data for any city worldwide",
    "capabilities": ["weather.current", "weather.lookup"]
  },
  "uptime_seconds": 45
}
```

### 2. Get Tool Schema

```bash
curl http://localhost:3000/schema
```

This returns the complete API documentation for your tool.

### 3. Execute the Tool

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "city": "Madrid",
      "units": "celsius",
      "includeDetails": true
    }
  }'
```

Response:
```json
{
  "execution_id": "exec_1693234567890",
  "status": "success",
  "output_data": {
    "city": "Madrid",
    "country": "ES",
    "temperature": 24,
    "description": "clear sky",
    "humidity": 45,
    "units": "celsius",
    "details": {
      "pressure": 1013,
      "windSpeed": 3.2,
      "windDirection": 180,
      "visibility": 10000,
      "sunrise": "2025-08-28T05:47:32.000Z",
      "sunset": "2025-08-28T19:23:45.000Z"
    }
  },
  "execution_time_ms": 1250,
  "timestamp": "2025-08-28T12:34:56.789Z"
}
```

## What Just Happened?

Congratulations! You've created a production-ready AI tool that:

1. ✅ **Validates inputs** - Ensures city names are valid before processing
2. ✅ **Handles errors gracefully** - Returns structured error responses
3. ✅ **Provides comprehensive data** - Returns weather data with optional details
4. ✅ **Includes monitoring** - Built-in health checks and metrics
5. ✅ **Follows best practices** - Proper error handling, timeouts, and security
6. ✅ **Auto-generates documentation** - API schema available at `/schema`

## Next Steps

Now that you have a working tool, explore these next steps:

### 🔧 Enhance Your Tool
- Add more input validation (coordinates, country codes)
- Implement caching for better performance
- Add retry logic with exponential backoff
- Support multiple weather providers

### 📚 Learn More
- [Core Concepts](./concepts.md) - Understand the framework architecture
- [Field Builders](../api-reference/field-builders.md) - Advanced input validation
- [Error Handling](../advanced/error-handling.md) - Robust error management
- [Testing Strategies](../advanced/testing.md) - Comprehensive testing

### 🚀 Deploy to Production
- [Docker Deployment](../integration/docker.md) - Containerize your tool
- [CI/CD Setup](../integration/cicd.md) - Automated testing and deployment
- [Monitoring](../integration/monitoring.md) - Production monitoring setup

### 🤝 Join the Community
- [Examples Repository](../examples/README.md) - See more tool examples
- [Contributing Guide](../community/contributing.md) - Contribute to the project
- [Discord Community](https://discord.gg/ai-spine-tools) - Get help and share ideas

## Common Issues

### "Invalid API key" error
Make sure you've:
1. Created a free account at [OpenWeatherMap](https://openweathermap.org/api)
2. Generated an API key
3. Set it correctly in your `.env` file
4. Waited a few minutes for the key to activate

### Port already in use
Change the port in your `.env` file:
```bash
PORT=3001
```

### TypeScript compilation errors
Make sure you have the latest version of TypeScript:
```bash
npm install -g typescript@latest
npm install --save-dev @types/node
```

---

**Next**: [Installation Guide](./installation.md) | [Core Concepts](./concepts.md)

**Questions?** Check our [FAQ](../community/faq.md) or ask on [Discord](https://discord.gg/ai-spine-tools)