# Examples Documentation

Comprehensive examples demonstrating various AI Spine Tools patterns, integrations, and best practices.

## Overview

The examples directory contains fully functional AI Spine tools showcasing different use cases, patterns, and integration scenarios. Each example is production-ready with comprehensive testing, documentation, and deployment configurations.

## Available Examples

### 🧮 [Calculator Tool](../../examples/calculator-tool/)
**Basic arithmetic operations with validation**

A simple calculator demonstrating core AI Spine Tools concepts including field validation, error handling, and structured responses.

**Features:**
- Basic arithmetic operations (add, subtract, multiply, divide)
- Input validation and type safety
- Precision control for decimal results
- Comprehensive error handling
- Division by zero protection

**Learning Focus:**
- Basic tool structure
- Field builders and validation
- Error handling patterns
- Response formatting

**Complexity:** 🟢 Beginner

---

### 🌤️ [Weather Tool](../../examples/weather-tool/)
**External API integration with OpenWeatherMap**

A comprehensive weather tool demonstrating external API integration, retry logic, and advanced error handling.

**Features:**
- OpenWeatherMap API integration
- Retry logic with exponential backoff
- Multiple temperature units
- Detailed weather information
- Comprehensive error handling
- Rate limiting awareness

**Learning Focus:**
- External API integration
- Retry and resilience patterns
- Configuration management
- Advanced error handling
- API authentication

**Complexity:** 🟡 Intermediate

---

### 📧 [Email Tool](../../examples/email-tool/)
**Email sending with SMTP integration**

A production-ready email tool demonstrating SMTP integration, template processing, and email validation.

**Features:**
- SMTP server integration
- Email template support
- Attachment handling
- Email validation
- HTML and plain text support
- Delivery status tracking

**Learning Focus:**
- SMTP integration
- File handling and attachments
- Template processing
- Email validation patterns
- Security considerations

**Complexity:** 🟡 Intermediate

---

### 🗄️ [Database Tool](../../examples/database-tool/)
**Database operations and query management**

A database interaction tool demonstrating connection pooling, query building, and transaction management.

**Features:**
- Database connection pooling
- Query builder integration
- Transaction management
- Migration support
- Connection health monitoring
- Multiple database support

**Learning Focus:**
- Database integration patterns
- Connection pooling
- Transaction management
- Query optimization
- Error handling in database operations

**Complexity:** 🟠 Advanced

---

### 🔄 [Workflow Tool](../../examples/workflow-tool/)
**Multi-step workflow orchestration**

A workflow orchestration tool demonstrating complex business logic, step management, and state handling.

**Features:**
- Multi-step workflow execution
- State management
- Conditional logic
- Error recovery
- Progress tracking
- Workflow persistence

**Learning Focus:**
- Complex business logic
- State management
- Error recovery patterns
- Workflow orchestration
- Progress tracking

**Complexity:** 🟠 Advanced

---

### 🌐 [API Integration Tool](../../examples/api-integration-tool/)
**REST API client with authentication**

A generic API client tool demonstrating various authentication methods, request/response handling, and API versioning.

**Features:**
- Multiple authentication methods
- Request/response transformation
- API versioning support
- Rate limiting
- Caching strategies
- Response validation

**Learning Focus:**
- API client patterns
- Authentication strategies
- Request/response transformation
- Caching and optimization
- API versioning

**Complexity:** 🟡 Intermediate

---

### 🎮 [Poke Tool](../../examples/poke-tool/)
**Fun Pokemon API integration with caching**

A playful tool demonstrating API integration with the Pokemon API, featuring caching, data transformation, and fun user interactions.

**Features:**
- Pokemon API integration
- Response caching
- Data transformation
- Image handling
- Pagination support
- Search functionality

**Learning Focus:**
- Public API integration
- Caching strategies
- Data transformation
- Image handling
- Pagination patterns

**Complexity:** 🟢 Beginner

## Getting Started with Examples

### Prerequisites

Before running any example, ensure you have:

1. **Node.js 18+** installed on your system
2. **npm** package manager
3. Basic understanding of TypeScript/JavaScript
4. API keys for external services (where required)

### Quick Start Guide

#### 1. Choose an Example

Start with the **Calculator Tool** for basic concepts, then progress to more complex examples:

```bash
# Navigate to the examples directory
cd examples/calculator-tool
```

#### 2. Install Dependencies

Each example has its own dependencies:

```bash
npm install
```

#### 3. Configure Environment

Copy the environment template (if available):

```bash
cp .env.example .env
# Edit .env with your configuration
```

#### 4. Run the Example

```bash
# Development mode with hot reload
npm run dev

# Or build and run in production mode
npm run build
npm start
```

#### 5. Test the Tool

```bash
# Run the test suite
npm test

# Test with curl
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"your": "data"}}'
```

## Example Structure

Each example follows a consistent structure for easy navigation and understanding:

```
example-tool/
├── src/
│   └── index.ts              # Main tool implementation
├── tests/
│   ├── setup.ts              # Test configuration
│   └── example.test.ts       # Comprehensive tests
├── README.md                 # Detailed documentation
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Testing configuration
├── rollup.config.js          # Build configuration
└── .env.example              # Environment template
```

### Standard Scripts

All examples include these npm scripts:

```json
{
  "scripts": {
    "dev": "Development server with hot reload",
    "build": "Production build",
    "start": "Start production server",
    "test": "Run test suite",
    "test:coverage": "Run tests with coverage",
    "test:watch": "Run tests in watch mode",
    "clean": "Clean build artifacts"
  }
}
```

## Learning Paths

### 🟢 Beginner Path

Perfect for developers new to AI Spine Tools:

1. **Calculator Tool** - Learn basic concepts
2. **Poke Tool** - Understand API integration
3. **Simple modifications** - Customize existing tools

**Time:** 2-4 hours
**Prerequisites:** Basic JavaScript/TypeScript knowledge

### 🟡 Intermediate Path

For developers with some AI Spine Tools experience:

1. **Weather Tool** - Advanced API integration
2. **Email Tool** - SMTP and file handling
3. **API Integration Tool** - Authentication patterns
4. **Create custom tool** - Build from scratch

**Time:** 1-2 days
**Prerequisites:** Completed beginner path or equivalent experience

### 🟠 Advanced Path

For experienced developers building production systems:

1. **Database Tool** - Complex data operations
2. **Workflow Tool** - State management
3. **Custom integrations** - Build complex tools
4. **Performance optimization** - Scale and optimize

**Time:** 3-5 days
**Prerequisites:** Solid understanding of AI Spine Tools architecture

## Common Patterns and Best Practices

### Input Validation Pattern

```typescript
// Standard input validation
const schema = {
  input: {
    email: stringField({
      description: "Email address",
      required: true,
      format: "email",
      minLength: 5,
      maxLength: 254
    }),
    message: stringField({
      description: "Message content",
      required: true,
      minLength: 1,
      maxLength: 5000
    })
  }
};
```

### Error Handling Pattern

```typescript
execute: async ({ input, config }) => {
  try {
    const result = await performOperation(input);
    return { success: true, data: result };
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      throw new ToolExecutionError(
        'Invalid input provided',
        'INVALID_INPUT',
        { details: error.details }
      );
    }
    
    throw new ToolExecutionError(
      'Operation failed',
      'EXECUTION_FAILED',
      { originalError: error.message }
    );
  }
}
```

### Configuration Management Pattern

```typescript
const schema = {
  config: {
    apiKey: apiKeyField({
      description: "Service API key",
      required: true,
      sensitive: true
    }),
    timeout: configNumberField({
      description: "Request timeout in milliseconds",
      default: 5000,
      min: 1000,
      max: 30000
    })
  }
};
```

### External API Integration Pattern

```typescript
const makeAPIRequest = async (url, options, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: config.timeout
      });

      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}`, response.status);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## Testing Examples

### Unit Testing Pattern

```typescript
describe('Example Tool', () => {
  let tool: Tool;

  beforeEach(() => {
    tool = createTool({
      metadata: { /* ... */ },
      schema: { /* ... */ },
      execute: async ({ input }) => {
        // Tool logic
      }
    });
  });

  it('should handle valid input', async () => {
    const result = await tool.execute({
      input: { validField: 'value' },
      config: { apiKey: 'test-key' }
    });

    expect(result).toEqual({
      success: true,
      data: expect.any(Object)
    });
  });

  it('should handle invalid input', async () => {
    await expect(tool.execute({
      input: { invalidField: '' },
      config: {}
    })).rejects.toThrow('Validation error');
  });
});
```

### Integration Testing Pattern

```typescript
describe('API Integration', () => {
  beforeEach(() => {
    // Setup test server or mocks
    setupTestServer();
  });

  afterEach(() => {
    // Cleanup
    teardownTestServer();
  });

  it('should handle successful API response', async () => {
    mockAPIResponse({ status: 200, data: { success: true } });
    
    const result = await tool.execute({
      input: { query: 'test' },
      config: { apiKey: 'test-key' }
    });

    expect(result.data).toBeDefined();
  });
});
```

## Deployment Examples

### Local Development

```bash
# Start with hot reload
npm run dev

# Test the tool
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"test": "data"}}'
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t example-tool .
docker run -p 3001:3001 example-tool
```

### Production Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  example-tool:
    image: example-tool:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - API_KEY=${API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Performance Considerations

### Memory Management

- Use streaming for large data processing
- Implement proper cleanup in finally blocks
- Monitor memory usage in production
- Use connection pooling for database operations

### Scalability

- Design tools to be stateless
- Use external storage for persistent data
- Implement proper error recovery
- Consider rate limiting and throttling

### Security

- Validate all inputs thoroughly
- Sanitize outputs to prevent injection
- Use secure configuration management
- Implement proper authentication
- Follow security best practices

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find and kill process using port
   lsof -ti:3001 | xargs kill -9
   ```

2. **Missing API Keys**
   ```bash
   # Check environment variables
   echo $API_KEY
   # Create .env file from template
   cp .env.example .env
   ```

3. **TypeScript Compilation Errors**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

4. **Test Failures**
   ```bash
   # Run tests with verbose output
   npm test -- --verbose
   # Run specific test file
   npm test -- calculator.test.ts
   ```

### Debug Mode

Enable detailed logging:

```bash
NODE_ENV=development DEBUG=* npm run dev
```

## Contributing to Examples

### Adding New Examples

1. **Create Directory Structure**
   ```bash
   mkdir examples/my-new-tool
   cd examples/my-new-tool
   ```

2. **Use Template**
   ```bash
   # Copy from existing example
   cp -r ../calculator-tool/* .
   # Modify for your use case
   ```

3. **Update Documentation**
   - Add README.md with detailed usage
   - Include in this main examples README
   - Add to appropriate learning path

4. **Ensure Quality**
   - Comprehensive test coverage (>90%)
   - Proper error handling
   - Complete documentation
   - Production-ready configuration

### Example Guidelines

- **Focus on one concept** per example
- **Include comprehensive tests** with >90% coverage
- **Provide detailed documentation** with usage examples
- **Follow consistent structure** across all examples
- **Use real-world scenarios** when possible
- **Include deployment configurations**

## Resources

### Documentation Links

- [Core Concepts](../getting-started/concepts.md)
- [API Reference](../api-reference/README.md)
- [Field Builders](../api-reference/field-builders.md)
- [Testing Guide](../advanced/testing.md)
- [Security Best Practices](../advanced/security.md)

### External Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Docker Documentation](https://docs.docker.com/)

### Community

- [GitHub Repository](https://github.com/ai-spine/tools-builder)
- [Issue Tracker](https://github.com/ai-spine/tools-builder/issues)
- [Contributing Guide](../community/contributing.md)
- [Code of Conduct](../community/code-of-conduct.md)

## Next Steps

Ready to start building? Choose your path:

1. **🟢 New to AI Spine Tools?** → Start with [Calculator Tool](../../examples/calculator-tool/)
2. **🟡 Ready for APIs?** → Try [Weather Tool](../../examples/weather-tool/)
3. **🟠 Need complex logic?** → Explore [Workflow Tool](../../examples/workflow-tool/)
4. **🚀 Build from scratch?** → Use [create-ai-spine-tool](../getting-started/installation.md)

Each example includes step-by-step instructions, comprehensive tests, and production-ready deployment configurations to help you succeed with AI Spine Tools.