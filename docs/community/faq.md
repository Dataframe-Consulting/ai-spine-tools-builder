# Frequently Asked Questions (FAQ)

Common questions and answers about AI Spine Tools development, deployment, and troubleshooting.

## General Questions

### What is AI Spine Tools?

AI Spine Tools is a comprehensive SDK for building AI agent tools that integrate seamlessly with AI systems. It provides a declarative, type-safe approach to creating tools with automatic API generation, validation, and documentation.

### What makes AI Spine Tools different from other tool frameworks?

- **Type Safety**: Full TypeScript support with automatic type generation from schemas
- **Declarative Schemas**: Define tool behavior through schemas, not imperative code
- **Automatic API Generation**: OpenAPI specs and HTTP endpoints generated automatically
- **Built-in Validation**: Runtime validation using the same schemas that define your tool
- **Testing Framework**: Comprehensive testing utilities for unit, integration, and E2E tests
- **Monorepo Ready**: Designed for scalable, multi-tool projects

### Is AI Spine Tools production-ready?

Yes! AI Spine Tools is designed for production use with:
- Comprehensive error handling and recovery
- Performance monitoring and health checks
- Security best practices and input validation
- Docker support and deployment guides
- Extensive testing and validation

## Getting Started

### What are the system requirements?

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **TypeScript**: Version 4.5 or higher (automatically handled)
- **Operating System**: Windows, macOS, or Linux

### How do I create my first tool?

Use the CLI scaffolding tool:

```bash
npx create-ai-spine-tool my-first-tool
cd my-first-tool
npm install
npm run dev
```

This creates a fully functional tool with examples, tests, and documentation.

### Can I use JavaScript instead of TypeScript?

While AI Spine Tools is built with TypeScript in mind, you can use JavaScript. However, you'll lose:
- Compile-time type safety
- IntelliSense and auto-completion
- Automatic type generation from schemas
- Better error messages and debugging

We strongly recommend using TypeScript for the best experience.

### What's the difference between `@ai-spine/tools` and `@ai-spine/tools-core`?

- **`@ai-spine/tools`**: High-level API with the `createTool()` function (recommended for most users)
- **`@ai-spine/tools-core`**: Low-level API with the `Tool` class and field builders (for advanced customization)

Most developers should start with `@ai-spine/tools`.

## Development Questions

### How do I handle asynchronous operations in tools?

Use async/await in your execute function:

```typescript
execute: async ({ input, config }) => {
  // Async operations
  const data = await fetchExternalAPI(input.query);
  const processed = await processData(data);
  
  return { result: processed };
}
```

All external API calls, database operations, and file I/O should be asynchronous.

### How do I validate complex input data?

Use field builders for comprehensive validation:

```typescript
const schema = {
  input: {
    user: objectField({
      description: "User information",
      required: true,
      properties: {
        email: stringField({
          format: "email",
          required: true
        }),
        age: numberField({
          min: 18,
          max: 120,
          integer: true
        })
      }
    }),
    preferences: arrayField({
      description: "User preferences",
      itemType: "string",
      maxItems: 10
    })
  }
};
```

### How do I handle errors gracefully?

Use the built-in error classes:

```typescript
import { ToolExecutionError } from '@ai-spine/tools-core';

execute: async ({ input }) => {
  try {
    return await performOperation(input);
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      throw new ToolExecutionError(
        'Unable to connect to external service',
        'CONNECTION_FAILED',
        { retryable: true }
      );
    }
    
    throw new ToolExecutionError(
      'Operation failed',
      'EXECUTION_ERROR',
      { originalError: error.message }
    );
  }
}
```

### How do I add authentication to my tool?

Use configuration fields for API keys:

```typescript
const schema = {
  config: {
    apiKey: apiKeyField({
      description: "Service API key",
      required: true,
      sensitive: true
    })
  }
};

execute: async ({ input, config }) => {
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    }
  });
}
```

### Can I use external npm packages in my tools?

Yes! Install any npm package you need:

```bash
npm install axios lodash moment
```

Then import and use them in your tool:

```typescript
import axios from 'axios';
import _ from 'lodash';
import moment from 'moment';

execute: async ({ input }) => {
  const response = await axios.get(input.url);
  const processed = _.groupBy(response.data, 'category');
  const timestamp = moment().toISOString();
  
  return { data: processed, timestamp };
}
```

### How do I test tools that make external API calls?

Use mocking in your tests:

```typescript
import { jest } from '@jest/globals';

// Mock the external API
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Weather Tool', () => {
  it('should handle API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ temperature: 25, condition: 'sunny' })
    });

    const result = await tool.execute({
      input: { city: 'Madrid' },
      config: { apiKey: 'test-key' }
    });

    expect(result.data.temperature).toBe(25);
  });
});
```

## Deployment Questions

### How do I deploy my tool to production?

1. **Build the tool**:
   ```bash
   npm run build
   ```

2. **Create a Docker container**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist/ ./dist/
   EXPOSE 3000
   CMD ["node", "dist/index.js"]
   ```

3. **Deploy to your platform** (AWS, Google Cloud, Azure, etc.)

### What environment variables do I need to set?

Common environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `API_KEYS`: Service API keys (tool-specific)
- `DATABASE_URL`: Database connection string (if needed)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)

### How do I monitor my tool in production?

AI Spine Tools provides built-in monitoring endpoints:

- `GET /health`: Health check endpoint
- `GET /metrics`: Prometheus metrics
- `GET /info`: Tool information and version

Set up monitoring with tools like:
- Prometheus + Grafana for metrics
- ELK stack for logging
- Uptime monitoring services

### How do I handle high traffic and scaling?

1. **Use a load balancer** to distribute requests
2. **Scale horizontally** with multiple instances
3. **Implement caching** for expensive operations
4. **Use connection pooling** for databases
5. **Set up rate limiting** to prevent abuse

### Can I use serverless platforms?

Yes! AI Spine Tools work well with serverless platforms:

- **AWS Lambda**: Use the `serverless` framework
- **Vercel**: Deploy as API functions
- **Netlify Functions**: Use the build configuration
- **Google Cloud Functions**: Deploy with the CLI

Note: Some features like persistent connections may be limited in serverless environments.

## Integration Questions

### How do I integrate with databases?

Use a database client library:

```typescript
import { Pool } from 'pg'; // PostgreSQL
import mysql from 'mysql2/promise'; // MySQL
import { MongoClient } from 'mongodb'; // MongoDB

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

execute: async ({ input }) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [input.userId]);
    return { user: result.rows[0] };
  } finally {
    client.release();
  }
}
```

### How do I connect to message queues?

Use the appropriate client library:

```typescript
import amqp from 'amqplib'; // RabbitMQ
import Redis from 'ioredis'; // Redis

execute: async ({ input }) => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  await channel.assertQueue('tasks');
  channel.sendToQueue('tasks', Buffer.from(JSON.stringify(input)));
  
  await connection.close();
  return { messageId: Date.now() };
}
```

### Can I call other AI Spine Tools from my tool?

Yes! Use HTTP requests to call other tools:

```typescript
execute: async ({ input }) => {
  // Call another AI Spine Tool
  const response = await fetch('http://other-tool:3000/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_data: { query: input.query },
      config: { apiKey: config.downstreamApiKey }
    })
  });
  
  const result = await response.json();
  return { downstream: result.output_data };
}
```

### How do I integrate with AI services?

Use the appropriate SDK:

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

execute: async ({ input }) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: input.prompt }]
  });
  
  return { 
    response: completion.choices[0].message.content,
    usage: completion.usage
  };
}
```

## Performance Questions

### How can I optimize my tool's performance?

1. **Use async/await** for all I/O operations
2. **Implement connection pooling** for databases
3. **Cache expensive operations** using Redis or memory
4. **Use streaming** for large data processing
5. **Optimize database queries** with indexes and limits
6. **Monitor memory usage** and avoid leaks

### My tool is using too much memory. What can I do?

1. **Use streaming** for large files:
   ```typescript
   import { createReadStream } from 'fs';
   
   const stream = createReadStream(input.filePath);
   // Process stream chunks instead of loading entire file
   ```

2. **Implement cleanup**:
   ```typescript
   execute: async ({ input }) => {
     let connection;
     try {
       connection = await createConnection();
       return await processData(connection, input);
     } finally {
       if (connection) await connection.close();
     }
   }
   ```

3. **Monitor memory usage**:
   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory usage:', {
       rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
       heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB'
     });
   }, 30000);
   ```

### How do I handle slow external APIs?

1. **Implement timeouts**:
   ```typescript
   const response = await fetch(url, {
     signal: AbortSignal.timeout(5000) // 5 second timeout
   });
   ```

2. **Add retry logic**:
   ```typescript
   const retry = async (fn, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
   };
   ```

3. **Use caching**:
   ```typescript
   const cache = new Map();
   
   execute: async ({ input }) => {
     const cacheKey = JSON.stringify(input);
     if (cache.has(cacheKey)) {
       return cache.get(cacheKey);
     }
     
     const result = await expensiveOperation(input);
     cache.set(cacheKey, result);
     return result;
   }
   ```

## Security Questions

### How do I secure sensitive configuration?

1. **Use environment variables**:
   ```bash
   export API_KEY=your-secret-key
   ```

2. **Mark fields as sensitive**:
   ```typescript
   config: {
     apiKey: apiKeyField({
       description: "Secret API key",
       required: true,
       sensitive: true // Won't be logged
     })
   }
   ```

3. **Use secrets management** in production (AWS Secrets Manager, Azure Key Vault, etc.)

### How do I validate and sanitize inputs?

AI Spine Tools provides comprehensive validation:

```typescript
input: {
  email: stringField({
    format: "email",
    required: true
  }),
  message: stringField({
    required: true,
    maxLength: 1000,
    pattern: "^[a-zA-Z0-9\\s.,!?-]+$" // Only safe characters
  }),
  age: numberField({
    min: 0,
    max: 150,
    integer: true
  })
}
```

### What about rate limiting and DDoS protection?

Implement rate limiting at different levels:

1. **Application level**:
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per windowMs
     message: 'Too many requests, please try again later.'
   });
   ```

2. **Infrastructure level**: Use AWS API Gateway, Cloudflare, or nginx for rate limiting

3. **Monitor and alert** on unusual traffic patterns

## Troubleshooting

### My tool won't start. What should I check?

1. **Check Node.js version**: `node --version` (should be 18+)
2. **Install dependencies**: `npm install`
3. **Check for TypeScript errors**: `npm run build`
4. **Verify environment variables**: Check your `.env` file
5. **Check port availability**: Try a different port

### I'm getting validation errors. How do I debug them?

1. **Check the schema definition** matches your input
2. **Use the test client** to validate inputs:
   ```bash
   npm test -- --verbose
   ```
3. **Enable debug logging**:
   ```bash
   DEBUG=* npm run dev
   ```

### Tests are failing. How do I fix them?

1. **Run tests with verbose output**:
   ```bash
   npm test -- --verbose
   ```
2. **Check for async operations** that might not be awaited
3. **Verify mock data** matches your schema
4. **Ensure proper cleanup** in test teardown

### My tool is slow. How do I optimize it?

1. **Profile the code** to identify bottlenecks
2. **Check database query performance**
3. **Monitor external API response times**
4. **Look for memory leaks** using heap snapshots
5. **Implement caching** for expensive operations

### How do I debug production issues?

1. **Enable structured logging**:
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'app.log' })
     ]
   });
   ```

2. **Use application monitoring** (New Relic, DataDog, etc.)
3. **Set up health checks** and alerts
4. **Monitor key metrics** (response time, error rate, memory usage)

## Contributing and Community

### How can I contribute to AI Spine Tools?

1. **Report bugs** on GitHub Issues
2. **Submit feature requests** with detailed use cases
3. **Contribute code** via pull requests
4. **Improve documentation** by fixing errors or adding examples
5. **Help others** by answering questions in discussions

### Where can I get help?

1. **Documentation**: Start with the official docs
2. **GitHub Issues**: Search existing issues or create new ones
3. **GitHub Discussions**: Community Q&A and feature discussions
4. **Examples**: Check the examples directory for real-world usage

### How do I report a security vulnerability?

Please report security vulnerabilities privately by emailing security@ai-spine.com or using GitHub's security advisory feature. Do not create public issues for security concerns.

### Can I use AI Spine Tools commercially?

Yes! AI Spine Tools is released under the MIT License, which allows commercial use. See the LICENSE file for full details.

## Advanced Topics

### Can I extend the core Tool class?

Yes, for advanced use cases:

```typescript
import { Tool } from '@ai-spine/tools-core';

class CustomTool extends Tool {
  constructor(definition) {
    super(definition);
    this.customFeature = true;
  }
  
  async execute(context) {
    // Add custom logic before execution
    const result = await super.execute(context);
    // Add custom logic after execution
    return result;
  }
}
```

### How do I create custom field builders?

```typescript
import { FieldBuilder } from '@ai-spine/tools-core';

export const customField = (options) => {
  return new FieldBuilder('custom', {
    type: 'string',
    validate: (value) => {
      // Custom validation logic
      if (!isValidCustomFormat(value)) {
        throw new Error('Invalid custom format');
      }
    },
    ...options
  });
};
```

### Can I modify the HTTP server behavior?

For advanced customization, use the low-level API:

```typescript
import { Tool } from '@ai-spine/tools-core';
import express from 'express';

const tool = new Tool(definition);
const app = express();

// Add custom middleware
app.use('/custom', (req, res) => {
  res.json({ custom: 'endpoint' });
});

// Use the tool's routes
app.use('/', tool.createRouter());

app.listen(3000);
```

Still have questions? Check our [GitHub Discussions](https://github.com/ai-spine/tools-builder/discussions) or [create an issue](https://github.com/ai-spine/tools-builder/issues/new).