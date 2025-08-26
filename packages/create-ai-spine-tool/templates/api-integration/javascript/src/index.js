const { createTool, stringField, numberField, apiKeyField, configStringField } = require('@ai-spine/tools');
const axios = require('axios');

// Create the tool
const {{toolNameCamelCase}}Tool = createTool({
  metadata: {
    name: '{{toolName}}',
    version: '1.0.0',
    description: '{{description}}',
    capabilities: ['api-integration', 'data-fetching'],
    author: 'Your Name',
    license: 'MIT',
  },

  schema: {
    input: {
      query: stringField({
        required: true,
        description: 'The search query or request parameter',
        minLength: 1,
        maxLength: 500,
      }),
      limit: numberField({
        required: false,
        description: 'Maximum number of results to return',
        min: 1,
        max: 100,
        default: 10,
      }),
      format: stringField({
        required: false,
        description: 'Response format',
        enum: ['json', 'text'],
        default: 'json',
      }),
    },

    config: {
      api_key: apiKeyField({
        required: true,
        description: 'API key for the external service',
      }),
      base_url: configStringField({
        required: false,
        description: 'Base URL for the API',
        default: 'https://api.example.com',
      }),
      timeout: numberField({
        required: false,
        description: 'Request timeout in milliseconds',
        default: 10000,
        min: 1000,
        max: 60000,
      }),
    },
  },

  async execute(input, config, context) {
    console.log(`Executing {{toolName}} tool with execution ID: ${context.executionId}`);

    try {
      // Configure axios instance
      const client = axios.create({
        baseURL: config.base_url,
        timeout: config.timeout || 10000,
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
          'User-Agent': '{{toolName}}/1.0.0',
        },
      });

      // Add request interceptor for logging
      client.interceptors.request.use(
        (request) => {
          console.log(`Making API request: ${request.method?.toUpperCase()} ${request.url}`);
          return request;
        },
        (error) => {
          console.error('Request interceptor error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling
      client.interceptors.response.use(
        (response) => {
          console.log(`API response: ${response.status} ${response.statusText}`);
          return response;
        },
        (error) => {
          if (error.response) {
            console.error(`API error: ${error.response.status} ${error.response.statusText}`);
            throw new Error(`API request failed: ${error.response.status} ${error.response.data?.message || error.response.statusText}`);
          } else if (error.request) {
            console.error('Network error:', error.message);
            throw new Error(`Network error: ${error.message}`);
          } else {
            console.error('Request setup error:', error.message);
            throw new Error(`Request error: ${error.message}`);
          }
        }
      );

      // Make the API request
      const response = await client.get('/search', {
        params: {
          q: input.query,
          limit: input.limit,
          format: input.format,
        },
      });

      // Process the response data
      const processedData = processApiResponse(response.data, input.format);

      return {
        status: 'success',
        data: {
          result: processedData,
          query: input.query,
          format: input.format,
          count: Array.isArray(processedData) ? processedData.length : 1,
          metadata: {
            execution_id: context.executionId,
            timestamp: context.timestamp.toISOString(),
            api_response_time: response.headers['x-response-time'],
            rate_limit_remaining: response.headers['x-ratelimit-remaining'],
            tool_version: '1.0.0',
          },
        },
      };
    } catch (error) {
      console.error('Error executing API integration:', error);
      
      // Provide helpful error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (error.message.includes('403')) {
          throw new Error('Access forbidden. Please check your API permissions.');
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Request timed out. The API service may be slow or unavailable.');
        }
        throw error;
      }
      
      throw new Error(`Unknown error occurred: ${String(error)}`);
    }
  },
});

/**
 * Process the API response based on the requested format
 */
function processApiResponse(data, format = 'json') {
  if (format === 'text') {
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    } else {
      return String(data);
    }
  }

  // Default JSON format
  return data;
}

// Start the tool server
async function main() {
  try {
    await {{toolNameCamelCase}}Tool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',
      development: {
        requestLogging: process.env.NODE_ENV === 'development'
      },
      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        apiKeys: process.env.VALID_API_KEYS?.split(','),
      },
    });
  } catch (error) {
    console.error('Failed to start tool server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await {{toolNameCamelCase}}Tool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await {{toolNameCamelCase}}Tool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

module.exports = {{toolNameCamelCase}}Tool;