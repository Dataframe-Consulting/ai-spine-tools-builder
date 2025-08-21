import {
  ToolMetadata,
  ToolInputField,
  ToolConfigField,
  ToolInput,
  ToolConfig,
  ToolContext,
  ToolDefinition,
  SchemaValidator,
  ConfigurationError,
} from '@ai-spine/tools-core';
import { Tool, ToolServerOptions, CreateToolOptions } from './tool';

export interface ToolBuilder<TInput extends ToolInput, TConfig extends ToolConfig> {
  metadata: ToolMetadata;
  schema: {
    input: Record<string, ToolInputField>;
    config: Record<string, ToolConfigField>;
  };
  execute: (input: TInput, config: TConfig, context: ToolContext) => Promise<any>;
  validateConfig?: (config: TConfig) => Promise<void>;
  onStartup?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}

/**
 * Creates a new AI Spine tool with the specified configuration
 */
export function createTool<TInput extends ToolInput = ToolInput, TConfig extends ToolConfig = ToolConfig>(
  options: CreateToolOptions<TInput, TConfig>
): Tool<TInput, TConfig> {
  // Validate the tool definition
  validateToolDefinition(options);

  const definition: ToolDefinition = {
    metadata: options.metadata,
    schema: options.schema,
    execute: options.execute,
  };

  // Create tool instance with empty config (will be provided at runtime)
  return new Tool<TInput, TConfig>(definition, {} as TConfig);
}

/**
 * Alternative fluent API for creating tools
 */
export class ToolBuilder<TInput extends ToolInput = ToolInput, TConfig extends ToolConfig = ToolConfig> {
  private _metadata?: ToolMetadata;
  private _inputSchema: Record<string, ToolInputField> = {};
  private _configSchema: Record<string, ToolConfigField> = {};
  private _executeFunction?: (input: TInput, config: TConfig, context: ToolContext) => Promise<any>;
  private _validateConfigFunction?: (config: TConfig) => Promise<void>;
  private _onStartupFunction?: () => Promise<void>;
  private _onShutdownFunction?: () => Promise<void>;

  /**
   * Set tool metadata
   */
  metadata(metadata: ToolMetadata): ToolBuilder<TInput, TConfig> {
    this._metadata = metadata;
    return this;
  }

  /**
   * Define input schema
   */
  input(schema: Record<string, ToolInputField>): ToolBuilder<TInput, TConfig> {
    this._inputSchema = { ...this._inputSchema, ...schema };
    return this;
  }

  /**
   * Add a single input field
   */
  inputField(name: string, field: ToolInputField): ToolBuilder<TInput, TConfig> {
    this._inputSchema[name] = field;
    return this;
  }

  /**
   * Define configuration schema
   */
  config(schema: Record<string, ToolConfigField>): ToolBuilder<TInput, TConfig> {
    this._configSchema = { ...this._configSchema, ...schema };
    return this;
  }

  /**
   * Add a single configuration field
   */
  configField(name: string, field: ToolConfigField): ToolBuilder<TInput, TConfig> {
    this._configSchema[name] = field;
    return this;
  }

  /**
   * Set the execution function
   */
  execute(fn: (input: TInput, config: TConfig, context: ToolContext) => Promise<any>): ToolBuilder<TInput, TConfig> {
    this._executeFunction = fn;
    return this;
  }

  /**
   * Set configuration validation function
   */
  validateConfig(fn: (config: TConfig) => Promise<void>): ToolBuilder<TInput, TConfig> {
    this._validateConfigFunction = fn;
    return this;
  }

  /**
   * Set startup hook
   */
  onStartup(fn: () => Promise<void>): ToolBuilder<TInput, TConfig> {
    this._onStartupFunction = fn;
    return this;
  }

  /**
   * Set shutdown hook
   */
  onShutdown(fn: () => Promise<void>): ToolBuilder<TInput, TConfig> {
    this._onShutdownFunction = fn;
    return this;
  }

  /**
   * Build the tool
   */
  build(): Tool<TInput, TConfig> {
    if (!this._metadata) {
      throw new Error('Tool metadata is required');
    }

    if (!this._executeFunction) {
      throw new Error('Execute function is required');
    }

    const options: CreateToolOptions<TInput, TConfig> = {
      metadata: this._metadata,
      schema: {
        input: this._inputSchema,
        config: this._configSchema,
      },
      execute: this._executeFunction,
      validateConfig: this._validateConfigFunction,
      onStartup: this._onStartupFunction,
      onShutdown: this._onShutdownFunction,
    };

    return createTool(options);
  }
}

/**
 * Helper function to create a string input field
 */
export function stringField(options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'string',
    required: options.required ?? false,
    ...options,
  };
}

/**
 * Helper function to create a number input field
 */
export function numberField(options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'number',
    required: options.required ?? false,
    ...options,
  };
}

/**
 * Helper function to create a boolean input field
 */
export function booleanField(options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'boolean',
    required: options.required ?? false,
    ...options,
  };
}

/**
 * Helper function to create an array input field
 */
export function arrayField(items: ToolInputField, options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'array',
    required: options.required ?? false,
    items,
    ...options,
  };
}

/**
 * Helper function to create an object input field
 */
export function objectField(
  properties: Record<string, ToolInputField>,
  options: Partial<ToolInputField> = {}
): ToolInputField {
  return {
    type: 'object',
    required: options.required ?? false,
    properties,
    ...options,
  };
}

/**
 * Helper function to create a date input field
 */
export function dateField(options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'date',
    required: options.required ?? false,
    format: 'YYYY-MM-DD',
    ...options,
  };
}

/**
 * Helper function to create a time input field
 */
export function timeField(options: Partial<ToolInputField> = {}): ToolInputField {
  return {
    type: 'time',
    required: options.required ?? false,
    format: 'HH:MM',
    ...options,
  };
}

/**
 * Helper function to create an API key config field
 */
export function apiKeyField(options: Partial<ToolConfigField> = {}): ToolConfigField {
  return {
    type: 'key',
    required: options.required ?? true,
    secret: true,
    ...options,
  };
}

/**
 * Helper function to create a configuration string field
 */
export function configStringField(options: Partial<ToolConfigField> = {}): ToolConfigField {
  return {
    type: 'string',
    required: options.required ?? false,
    ...options,
  };
}

/**
 * Helper function to create a configuration number field
 */
export function configNumberField(options: Partial<ToolConfigField> = {}): ToolConfigField {
  return {
    type: 'number',
    required: options.required ?? false,
    ...options,
  };
}

/**
 * Validates a tool definition for completeness and correctness
 */
function validateToolDefinition<TInput extends ToolInput, TConfig extends ToolConfig>(
  options: CreateToolOptions<TInput, TConfig>
): void {
  const errors: string[] = [];

  // Validate metadata
  if (!options.metadata) {
    errors.push('Tool metadata is required');
  } else {
    if (!options.metadata.name || typeof options.metadata.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    }

    if (!options.metadata.version || typeof options.metadata.version !== 'string') {
      errors.push('Tool version is required and must be a string');
    }

    if (!options.metadata.description || typeof options.metadata.description !== 'string') {
      errors.push('Tool description is required and must be a string');
    }

    if (!Array.isArray(options.metadata.capabilities)) {
      errors.push('Tool capabilities must be an array');
    }
  }

  // Validate schema
  if (!options.schema) {
    errors.push('Tool schema is required');
  } else {
    if (!options.schema.input || typeof options.schema.input !== 'object') {
      errors.push('Input schema is required and must be an object');
    }

    if (!options.schema.config || typeof options.schema.config !== 'object') {
      errors.push('Config schema is required and must be an object');
    }
  }

  // Validate execute function
  if (!options.execute || typeof options.execute !== 'function') {
    errors.push('Execute function is required');
  }

  if (errors.length > 0) {
    throw new ConfigurationError(
      `Tool definition validation failed: ${errors.join(', ')}`,
      errors
    );
  }
}