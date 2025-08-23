/**
 * Basic tests for createTool factory function
 */

import {
  createTool,
  ToolBuilder,
  stringField,
  apiKeyField
} from '../create-tool';

describe('createTool Factory Function', () => {
  const validToolDefinition = {
    metadata: {
      name: 'test-tool',
      version: '1.0.0',
      description: 'A test tool for unit testing',
      capabilities: ['test.execute']
    },
    schema: {
      input: {
        message: stringField({ required: true, description: 'Test message' })
      },
      config: {
        apiKey: apiKeyField({ required: true, description: 'Test API key' })
      }
    },
    execute: async (input, config, context) => {
      return {
        status: 'success',
        data: { echo: input.message }
      };
    }
  };

  describe('Basic Tool Creation', () => {
    it('should create a tool with valid definition', () => {
      expect(() => {
        const tool = createTool(validToolDefinition);
        expect(tool).toBeDefined();
      }).not.toThrow();
    });

    it('should validate tool definition for missing metadata', () => {
      const invalidDefinition = {
        ...validToolDefinition,
        metadata: undefined
      };

      expect(() => {
        createTool(invalidDefinition);
      }).toThrow();
    });

    it('should validate tool definition for missing execute function', () => {
      const invalidDefinition = {
        ...validToolDefinition,
        execute: undefined as any
      };

      expect(() => {
        createTool(invalidDefinition);
      }).toThrow();
    });
  });

  describe('ToolBuilder Basic Functionality', () => {
    it('should create a builder instance', () => {
      const builder = new ToolBuilder();
      expect(builder).toBeInstanceOf(ToolBuilder);
    });

    it('should build a valid tool', () => {
      const builder = new ToolBuilder();
      
      expect(() => {
        const tool = builder
          .metadata({
            name: 'build-test',
            version: '1.0.0',
            description: 'Testing build functionality',
            capabilities: ['test']
          })
          .execute(async () => {
            return { status: 'success', data: {} };
          })
          .build();

        expect(tool).toBeDefined();
      }).not.toThrow();
    });

    it('should validate required metadata', () => {
      const builder = new ToolBuilder();
      
      expect(() => {
        builder.build();
      }).toThrow();
    });
  });

  describe('Field Builders', () => {
    it('should create string fields', () => {
      const field = stringField({ required: true, minLength: 5 });
      expect(field.type).toBe('string');
      expect(field.required).toBe(true);
      expect(field.minLength).toBe(5);
    });

    it('should create API key fields', () => {
      const field = apiKeyField({ envVar: 'MY_API_KEY' });
      expect(field.type).toBe('apiKey');
      expect(field.secret).toBe(true);
      expect(field.envVar).toBe('MY_API_KEY');
    });
  });
});