# {{toolNamePascalCase}}

{{description}}

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Usage

This tool implements the AI Spine universal contract and can be used with any AI Spine platform.

### Local Development

Start the development server:

```bash
npm run dev
```

The tool will be available at `http://localhost:3000` with the following endpoints:

- `GET /health` - Health check and tool metadata
- `POST /execute` - Execute the tool with input data

### Testing the Tool

You can test the tool using curl or any HTTP client:

```bash
# Health check
curl http://localhost:3000/health

# Execute the tool
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "message": "Hello, World!"
    }
  }'
```

### Configuration

The tool can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `API_KEY_AUTH` - Enable API key authentication (true/false)
- `VALID_API_KEYS` - Comma-separated list of valid API keys

### Deployment

{{#includeDocker}}
#### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t {{toolNameKebabCase}} .

# Run the container
docker run -p 3000:3000 {{toolNameKebabCase}}
```

{{/includeDocker}}
#### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

#### AI Spine Platform

Deploy to the AI Spine platform:

```bash
npm run deploy
```

## Development

### Project Structure

```
{{toolName}}/
├── src/
│   └── index.ts          # Main tool implementation
├── {{#includeTests}}tests/
│   └── tool.test.ts      # Test files
├── {{/includeTests}}{{#includeDocker}}Dockerfile                # Docker configuration
├── {{/includeDocker}}package.json            # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Adding Features

1. Update the tool schema in `src/index.ts`
2. Implement the new functionality in the `execute` function
3. {{#includeTests}}Add tests for the new features{{/includeTests}}
4. Update this README with usage examples

### Schema Definition

The tool uses a schema-based approach for input validation:

```typescript
schema: {
  input: {
    fieldName: stringField({
      required: true,
      description: 'Field description',
      // Additional validation options
    }),
  },
  config: {
    configField: apiKeyField({
      required: true,
      description: 'Configuration description',
    }),
  },
}
```

Available field types:
- `stringField()` - String input with validation
- `numberField()` - Numeric input with min/max validation
- `booleanField()` - Boolean true/false input
- `arrayField()` - Array of items
- `objectField()` - Object with properties
- `dateField()` - Date in YYYY-MM-DD format
- `timeField()` - Time in HH:MM format
- `apiKeyField()` - API key configuration field

## API Reference

### Health Check

**GET /health**

Returns tool metadata and health status.

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "tool_metadata": {
    "name": "{{toolName}}",
    "description": "{{description}}",
    "capabilities": ["..."]
  },
  "uptime_seconds": 1234,
  "last_execution": "2024-01-01T00:00:00Z"
}
```

### Execute Tool

**POST /execute**

Executes the tool with provided input data.

Request:
```json
{
  "input_data": {
    // Tool-specific input fields
  },
  "config": {
    // Optional configuration overrides
  },
  "execution_id": "optional-custom-id",
  "metadata": {
    // Optional metadata
  }
}
```

Response:
```json
{
  "execution_id": "exec_123",
  "status": "success",
  "output_data": {
    // Tool output
  },
  "execution_time_ms": 123,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## License

MIT License - see LICENSE file for details.

## Support

For support and documentation, visit [AI Spine Documentation](https://docs.ai-spine.com/tools).