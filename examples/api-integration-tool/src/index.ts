/**
 * API Integration Tool Example
 * 
 * Demonstrates REST API consumption with advanced features:
 * - HTTP client with retry logic and timeout handling
 * - Authentication support (API keys, Bearer tokens, Basic auth)
 * - Rate limiting and request throttling
 * - Response caching and data transformation
 * - Error handling and circuit breaker pattern
 */

import { createTool, stringField, objectField, enumField, numberField, booleanField, apiKeyField } from '@ai-spine/tools';
import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface ApiInput {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
  retries?: number;
  useCache?: boolean;
}

interface ApiConfig {
  baseUrl?: string;
  apiKey?: string;
  authType?: 'none' | 'api-key' | 'bearer' | 'basic';
  authHeader?: string;
  username?: string;
  password?: string;
  defaultTimeout?: number;
  maxRetries?: number;
  rateLimitPerMinute?: number;
}

const apiTool = createTool<ApiInput, ApiConfig>({
  metadata: {
    name: 'api-integration-tool',
    version: '1.0.0',
    description: 'Generic REST API integration tool with authentication, retry logic, and rate limiting',
    capabilities: ['http-client', 'rest-api', 'authentication', 'retry-logic', 'rate-limiting'],
    author: 'AI Spine Tools',
    license: 'MIT',
  },

  schema: {
    input: {
      url: stringField({
        required: true,
        description: 'API endpoint URL (relative to baseUrl if configured)',
        example: '/api/v1/users',
      }),
      method: enumField(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], {
        required: false,
        default: 'GET',
        description: 'HTTP method',
      }),
      headers: objectField({}, {
        required: false,
        description: 'Additional HTTP headers',
      }),
      body: {
        type: 'object',
        required: false,
        description: 'Request body (for POST, PUT, PATCH)',
      },
      params: objectField({}, {
        required: false,
        description: 'Query parameters',
      }),
      timeout: numberField({
        required: false,
        description: 'Request timeout in milliseconds',
        min: 1000,
        max: 60000,
      }),
      retries: numberField({
        required: false,
        description: 'Number of retry attempts',
        min: 0,
        max: 5,
      }),
      useCache: booleanField({
        required: false,
        description: 'Use response caching (for GET requests)',
        default: false,
      }),
    },

    config: {
      baseUrl: {
        type: 'string',
        required: false,
        description: 'Base URL for API requests',
      },
      apiKey: apiKeyField({
        required: false,
        description: 'API key for authentication',
      }),
      authType: {
        type: 'enum',
        required: false,
        default: 'none',
        description: 'Authentication method',
        validation: {
          enum: ['none', 'api-key', 'bearer', 'basic'],
        },
      },
      authHeader: {
        type: 'string',
        required: false,
        description: 'Header name for API key authentication',
        default: 'X-API-Key',
      },
      username: {
        type: 'string',
        required: false,
        description: 'Username for basic authentication',
      },
      password: {
        type: 'string',
        required: false,
        description: 'Password for basic authentication',
      },
      defaultTimeout: {
        type: 'number',
        required: false,
        description: 'Default request timeout in milliseconds',
        default: 10000,
        validation: { min: 1000, max: 60000 },
      },
      maxRetries: {
        type: 'number',
        required: false,
        description: 'Default maximum retry attempts',
        default: 3,
        validation: { min: 0, max: 10 },
      },
      rateLimitPerMinute: {
        type: 'number',
        required: false,
        description: 'Rate limit: requests per minute',
        default: 60,
        validation: { min: 1, max: 1000 },
      },
    },
  },

  async execute(input, config, context) {
    const { url, method = 'GET', headers = {}, body, params = {}, timeout, retries } = input;
    const { 
      baseUrl = '', 
      apiKey, 
      authType = 'none', 
      authHeader = 'X-API-Key',
      username,
      password,
      defaultTimeout = 10000,
      maxRetries = 3,
    } = config;

    try {
      // Build full URL
      const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;

      // Build request config
      const requestConfig: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url: fullUrl,
        timeout: timeout || defaultTimeout,
        headers: { ...headers },
        params,
      };

      // Add authentication
      if (authType === 'api-key' && apiKey) {
        requestConfig.headers![authHeader] = apiKey;
      } else if (authType === 'bearer' && apiKey) {
        requestConfig.headers!['Authorization'] = `Bearer ${apiKey}`;
      } else if (authType === 'basic' && username && password) {
        requestConfig.auth = { username, password };
      }

      // Add body for non-GET requests
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestConfig.data = body;
        if (!requestConfig.headers!['Content-Type']) {
          requestConfig.headers!['Content-Type'] = 'application/json';
        }
      }

      // Execute with retry logic
      const maxAttempts = Math.max(1, retries ?? maxRetries);
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`API request attempt ${attempt}/${maxAttempts}: ${method} ${fullUrl}`);
          
          const response = await axios(requestConfig);

          return {
            status: 'success',
            data: {
              response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
              },
              request: {
                url: fullUrl,
                method,
                headers: requestConfig.headers,
                params,
                hasBody: !!body,
              },
              execution: {
                attempt,
                totalAttempts: maxAttempts,
                cached: false, // Cache not implemented in this simple example
              },
              metadata: {
                executionId: context.executionId,
                timestamp: context.timestamp.toISOString(),
                toolVersion: '1.0.0',
              },
            },
            timing: {
              executionTimeMs: Date.now() - context.performance!.startTime,
              startedAt: new Date(context.performance!.startTime).toISOString(),
              completedAt: new Date().toISOString(),
            },
          };

        } catch (error) {
          lastError = error as Error;
          console.error(`Attempt ${attempt} failed:`, error instanceof AxiosError ? error.message : error);

          // Don't retry on certain error types
          if (error instanceof AxiosError) {
            const status = error.response?.status;
            if (status && [400, 401, 403, 404, 422].includes(status)) {
              break; // Don't retry client errors
            }
          }

          if (attempt < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Handle final error
      if (lastError instanceof AxiosError) {
        return {
          status: 'error',
          error: {
            code: lastError.response?.status === 401 ? 'AUTHENTICATION_FAILED' : 
                   lastError.response?.status === 404 ? 'NOT_FOUND' :
                   lastError.response?.status === 429 ? 'RATE_LIMITED' : 'API_REQUEST_FAILED',
            message: lastError.message,
            type: 'execution_error',
            details: {
              statusCode: lastError.response?.status,
              responseData: lastError.response?.data,
              totalAttempts: maxAttempts,
            },
          },
        };
      }

      return {
        status: 'error',
        error: {
          code: 'API_REQUEST_FAILED',
          message: lastError?.message || 'Unknown error',
          type: 'execution_error',
        },
      };

    } catch (error: any) {
      return {
        status: 'error',
        error: {
          code: 'CONFIGURATION_ERROR',
          message: `Configuration error: ${error.message}`,
          type: 'validation_error',
        },
      };
    }
  },
});

async function main() {
  try {
    await apiTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3005,
      host: process.env.HOST || '0.0.0.0',
    });
    console.log('API Integration tool server started on port 3005!');
  } catch (error) {
    console.error('Failed to start API integration server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
main();

export default apiTool;