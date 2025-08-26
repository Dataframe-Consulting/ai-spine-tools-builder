import { createTool, stringField, numberField, booleanField, apiKeyField } from '@ai-spine/tools';

// Define the input interface for type safety
interface {{toolNamePascalCase}}Input {
  message: string;
  count?: number;
  uppercase?: boolean;
}

// Define the configuration interface
interface {{toolNamePascalCase}}Config {
  api_key?: string;
  default_count?: number;
}

// Create the tool
const {{toolNameCamelCase}}Tool = createTool<{{toolNamePascalCase}}Input, {{toolNamePascalCase}}Config>({
  metadata: {
    name: '{{toolName}}',
    version: '1.0.0',
    description: '{{description}}',
    capabilities: ['text-processing'],
    author: 'Your Name',
    license: 'MIT',
  },

  schema: {
    input: {
      message: stringField({
        required: true,
        description: 'The message to process',
        minLength: 1,
        maxLength: 1000,
      }),
      count: numberField({
        required: false,
        description: 'Number of times to repeat the message',
        min: 1,
        max: 10,
        default: 1,
      }),
      uppercase: booleanField({
        required: false,
        description: 'Whether to convert message to uppercase',
        default: false,
      }),
    },

    config: {
      api_key: apiKeyField({
        required: false,
        description: 'Optional API key for external services',
      }),
      default_count: {
        type: 'number',
        required: false,
        description: 'Default count when not specified in input',
        default: 1,
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Executing {{toolName}} tool with execution ID: ${context.executionId}`);

    try {
      // Get the count from input or config default
      const count = input.count ?? config.default_count ?? 1;
      
      // Process the message
      let processedMessage = input.message;
      
      if (input.uppercase) {
        processedMessage = processedMessage.toUpperCase();
      }

      // Repeat the message
      const result = Array(count).fill(processedMessage).join(' ');

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        status: 'success',
        data: {
          processed_message: result,
          original_message: input.message,
          transformations: {
            uppercase: input.uppercase || false,
            count: count,
          },
          metadata: {
            execution_id: context.executionId,
            timestamp: context.timestamp.toISOString(),
            tool_version: '1.0.0',
          },
        },
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error(`Failed to process message: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

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

export default {{toolNameCamelCase}}Tool;