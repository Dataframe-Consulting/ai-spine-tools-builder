import {
  ToolMetadata,
  ToolInputField,
  ToolConfigField,
  ToolInput,
  ToolConfig,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolSchema,
  Tool,
} from '@ai-spine/tools-core';
/**
 * Options for creating a new AI Spine tool.
 * This interface defines the complete configuration needed to create a functional tool.
 *
 * @template TInput - The input data type for the tool
 * @template TConfig - The configuration type for the tool
 *
 * @example
 * ```typescript
 * const options: CreateToolOptions<WeatherInput, WeatherConfig> = {
 *   metadata: {
 *     name: 'weather-tool',
 *     version: '1.0.0',
 *     description: 'Get weather information for cities',
 *     capabilities: ['weather.current', 'weather.forecast']
 *   },
 *   schema: {
 *     input: {
 *       city: stringField().required().minLength(2).description('City name').build()
 *     },
 *     config: {
 *       apiKey: apiKeyField().required().envVar('WEATHER_API_KEY').build()
 *     }
 *   },
 *   execute: async (input, config, context) => {
 *     // Tool implementation
 *     return { status: 'success', data: { temperature: 22 } };
 *   }
 * };
 * ```
 */
export interface CreateToolOptions<
  TInput extends ToolInput = ToolInput,
  TConfig extends ToolConfig = ToolConfig,
> {
  /** Tool metadata including name, version, description, and capabilities */
  metadata: ToolMetadata;
  /** Input and configuration validation schema */
  schema: ToolSchema;
  /** Main tool execution function */
  execute: (
    input: TInput,
    config: TConfig,
    context: ToolExecutionContext
  ) => Promise<ToolExecutionResult>;
  /** Optional setup function called when tool configuration is set */
  setup?: (config: TConfig) => Promise<void>;
  /** Optional cleanup function called when tool is stopped */
  cleanup?: () => Promise<void>;
  /** Optional health check function for monitoring */
  healthCheck?: () => Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    details?: Record<string, any>;
  }>;
}
/**
 * Creates a new AI Spine tool with comprehensive type safety, validation, and lifecycle management.
 * This is the primary factory function for creating tools that can be used by AI agents.
 *
 * Key features:
 * - Type-safe generics for input and configuration
 * - Comprehensive validation of tool definition
 * - Intelligent defaults for common patterns
 * - Plugin integration points for extensibility
 * - Developer experience optimizations
 *
 * @template TInput - The input data type for the tool (inferred from schema)
 * @template TConfig - The configuration type for the tool (inferred from schema)
 *
 * @param options - Complete tool configuration options
 * @returns A fully configured Tool instance ready to be started
 *
 * @throws {ConfigurationError} When tool definition is invalid
 * @throws {ValidationError} When schema validation fails
 *
 * @example
 * ```typescript
 * // Create a weather tool with type safety
 * const weatherTool = createTool({
 *   metadata: {
 *     name: 'weather-tool',
 *     version: '1.0.0',
 *     description: 'Fetches current weather data for any city',
 *     capabilities: ['weather.current', 'weather.forecast'],
 *     author: 'Your Name',
 *     tags: ['weather', 'api']
 *   },
 *   schema: {
 *     input: {
 *       city: stringField({
 *         required: true,
 *         description: 'Name of the city to get weather for',
 *         minLength: 2,
 *         maxLength: 100,
 *         example: 'Madrid'
 *       }),
 *       units: {
 *         type: 'enum',
 *         required: false,
 *         description: 'Temperature units',
 *         enum: ['celsius', 'fahrenheit', 'kelvin'],
 *         default: 'celsius'
 *       }
 *     },
 *     config: {
 *       apiKey: {
 *         type: 'apiKey',
 *         required: true,
 *         description: 'OpenWeatherMap API key',
 *         secret: true,
 *         envVar: 'OPENWEATHER_API_KEY'
 *       },
 *       baseUrl: {
 *         type: 'url',
 *         required: false,
 *         description: 'Base URL for the weather API',
 *         default: 'https://api.openweathermap.org/data/2.5'
 *       }
 *     }
 *   },
 *   execute: async (input, config, context) => {
 *     // Tool implementation with full type safety
 *     const response = await fetch(
 *       `${config.baseUrl}/weather?q=${input.city}&appid=${config.apiKey}&units=${input.units || 'celsius'}`
 *     );
 *
 *     if (!response.ok) {
 *       return {
 *         status: 'error',
 *         error: {
 *           code: 'API_ERROR',
 *           message: 'Failed to fetch weather data',
 *           type: 'network_error',
 *           retryable: true
 *         }
 *       };
 *     }
 *
 *     const data = await response.json();
 *
 *     return {
 *       status: 'success',
 *       data: {
 *         city: data.name,
 *         temperature: data.main.temp,
 *         description: data.weather[0].description,
 *         humidity: data.main.humidity,
 *         pressure: data.main.pressure
 *       },
 *       timing: {
 *         executionTimeMs: Date.now() - context.performance!.startTime,
 *         startedAt: new Date(context.performance!.startTime).toISOString(),
 *         completedAt: new Date().toISOString()
 *       }
 *     };
 *   },
 *   setup: async (config) => {
 *     // Validate API key by making a test request
 *     console.log('Validating weather API configuration...');
 *   },
 *   cleanup: async () => {
 *     console.log('Weather tool cleanup completed');
 *   },
 *   healthCheck: async () => {
 *     // Custom health check implementation
 *     return { status: 'healthy', details: { api: 'connected' } };
 *   }
 * });
 *
 * // Start the tool server
 * await weatherTool.start({
 *   port: 3000,
 *   security: {
 *     apiKeys: ['your-client-api-key'],
 *     requireAuth: true
 *   }
 * });
 * ```
 */
export declare function createTool<
  TInput extends ToolInput = ToolInput,
  TConfig extends ToolConfig = ToolConfig,
>(options: CreateToolOptions<TInput, TConfig>): Tool<TInput, TConfig>;
/**
 * Advanced fluent API for creating tools with step-by-step configuration.
 * This class provides a builder pattern that enables incremental tool construction
 * with comprehensive validation and intelligent defaults.
 *
 * @template TInput - The input data type for the tool
 * @template TConfig - The configuration type for the tool
 *
 * @example
 * ```typescript
 * const tool = new ToolBuilder<WeatherInput, WeatherConfig>()
 *   .metadata({
 *     name: 'weather-tool',
 *     version: '1.0.0',
 *     description: 'Get weather information',
 *     capabilities: ['weather.current']
 *   })
 *   .inputField('city', stringField({ required: true, description: 'City name' }))
 *   .inputField('units', {
 *     type: 'enum',
 *     required: false,
 *     enum: ['celsius', 'fahrenheit'],
 *     default: 'celsius'
 *   })
 *   .configField('apiKey', apiKeyField({ required: true, envVar: 'WEATHER_API_KEY' }))
 *   .execute(async (input, config, context) => {
 *     // Implementation here
 *     return { status: 'success', data: { temperature: 22 } };
 *   })
 *   .onSetup(async (config) => {
 *     console.log('Setting up weather tool...');
 *   })
 *   .build();
 *
 * await tool.start({ port: 3000 });
 * ```
 */
export declare class ToolBuilder<
  TInput extends ToolInput = ToolInput,
  TConfig extends ToolConfig = ToolConfig,
> {
  private _metadata?;
  private _inputSchema;
  private _configSchema;
  private _executeFunction?;
  private _setupFunction?;
  private _cleanupFunction?;
  private _healthCheckFunction?;
  private _validationErrors;
  private _built;
  /**
   * Set comprehensive tool metadata with validation.
   *
   * @param metadata - Complete metadata object
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .metadata({
   *   name: 'weather-tool',
   *   version: '1.0.0',
   *   description: 'Get current weather data',
   *   capabilities: ['weather.current', 'weather.forecast'],
   *   author: 'Your Name',
   *   license: 'MIT',
   *   tags: ['weather', 'api', 'external-service']
   * })
   * ```
   */
  metadata(metadata: ToolMetadata): ToolBuilder<TInput, TConfig>;
  /**
   * Define multiple input fields at once.
   *
   * @param schema - Input schema definition
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .input({
   *   city: stringField({ required: true, description: 'City name' }),
   *   country: stringField({ required: false, description: 'Country code' }),
   *   units: {
   *     type: 'enum',
   *     required: false,
   *     enum: ['celsius', 'fahrenheit'],
   *     default: 'celsius'
   *   }
   * })
   * ```
   */
  input(schema: Record<string, ToolInputField>): ToolBuilder<TInput, TConfig>;
  /**
   * Add a single input field with validation.
   *
   * @param name - Field name
   * @param field - Field definition
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .inputField('city', stringField({
   *   required: true,
   *   description: 'Name of the city',
   *   minLength: 2,
   *   example: 'Madrid'
   * }))
   * .inputField('units', {
   *   type: 'enum',
   *   required: false,
   *   enum: ['celsius', 'fahrenheit'],
   *   default: 'celsius'
   * })
   * ```
   */
  inputField(name: string, field: ToolInputField): ToolBuilder<TInput, TConfig>;
  /**
   * Define multiple configuration fields at once.
   *
   * @param schema - Configuration schema definition
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .config({
   *   apiKey: apiKeyField({ required: true, envVar: 'API_KEY' }),
   *   baseUrl: configStringField({
   *     required: false,
   *     default: 'https://api.example.com',
   *     description: 'API base URL'
   *   }),
   *   timeout: configNumberField({ required: false, default: 5000 })
   * })
   * ```
   */
  config(schema: Record<string, ToolConfigField>): ToolBuilder<TInput, TConfig>;
  /**
   * Add a single configuration field with validation.
   *
   * @param name - Field name
   * @param field - Field definition
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .configField('apiKey', apiKeyField({
   *   required: true,
   *   envVar: 'WEATHER_API_KEY',
   *   description: 'OpenWeatherMap API key'
   * }))
   * .configField('timeout', configNumberField({
   *   required: false,
   *   default: 5000,
   *   description: 'Request timeout in milliseconds'
   * }))
   * ```
   */
  configField(
    name: string,
    field: ToolConfigField
  ): ToolBuilder<TInput, TConfig>;
  /**
   * Set the main tool execution function with comprehensive type safety.
   *
   * @param fn - Tool execution function
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .execute(async (input, config, context) => {
   *   // Validate input
   *   if (!input.city) {
   *     return {
   *       status: 'error',
   *       error: {
   *         code: 'MISSING_CITY',
   *         message: 'City parameter is required',
   *         type: 'validation_error'
   *       }
   *     };
   *   }
   *
   *   // Execute tool logic
   *   const weatherData = await getWeatherData(input.city, config.apiKey);
   *
   *   // Return structured result
   *   return {
   *     status: 'success',
   *     data: weatherData,
   *     timing: {
   *       executionTimeMs: Date.now() - context.performance!.startTime,
   *       startedAt: new Date(context.performance!.startTime).toISOString(),
   *       completedAt: new Date().toISOString()
   *     }
   *   };
   * })
   * ```
   */
  execute(
    fn: (
      input: TInput,
      config: TConfig,
      context: ToolExecutionContext
    ) => Promise<ToolExecutionResult>
  ): ToolBuilder<TInput, TConfig>;
  /**
   * Set configuration setup function called when tool is initialized.
   *
   * @param fn - Setup function
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .onSetup(async (config) => {
   *   // Validate API connectivity
   *   await validateApiKey(config.apiKey);
   *
   *   // Initialize connections
   *   await initializeCache();
   *
   *   console.log('Tool setup completed successfully');
   * })
   * ```
   */
  onSetup(fn: (config: TConfig) => Promise<void>): ToolBuilder<TInput, TConfig>;
  /**
   * Set cleanup function called when tool is stopped.
   *
   * @param fn - Cleanup function
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .onCleanup(async () => {
   *   // Close database connections
   *   await db.close();
   *
   *   // Clear caches
   *   cache.clear();
   *
   *   // Log cleanup completion
   *   console.log('Tool cleanup completed');
   * })
   * ```
   */
  onCleanup(fn: () => Promise<void>): ToolBuilder<TInput, TConfig>;
  /**
   * Set custom health check function for monitoring.
   *
   * @param fn - Health check function
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * .healthCheck(async () => {
   *   try {
   *     // Check database connectivity
   *     await db.ping();
   *
   *     // Check external API
   *     const apiStatus = await checkExternalApi();
   *
   *     return {
   *       status: 'healthy',
   *       details: {
   *         database: 'connected',
   *         externalApi: apiStatus
   *       }
   *     };
   *   } catch (error) {
   *     return {
   *       status: 'unhealthy',
   *       details: { error: error.message }
   *     };
   *   }
   * })
   * ```
   */
  healthCheck(
    fn: () => Promise<{
      status: 'healthy' | 'unhealthy' | 'degraded';
      details?: Record<string, any>;
    }>
  ): ToolBuilder<TInput, TConfig>;
  /**
   * Validates that the builder hasn't been used yet and can accept more configuration.
   * @private
   */
  private validateBuilderState;
  /**
   * Build the tool with comprehensive validation and error reporting.
   *
   * @returns A fully configured Tool instance
   * @throws {ConfigurationError} When builder configuration is invalid
   *
   * @example
   * ```typescript
   * const tool = builder.build();
   * await tool.start({ port: 3000 });
   * ```
   */
  build(): Tool<TInput, TConfig>;
  /**
   * Get current validation errors without building.
   * Useful for debugging configuration issues.
   *
   * @returns Array of validation error messages
   */
  getValidationErrors(): string[];
  /**
   * Check if the builder configuration is valid without building.
   *
   * @returns True if configuration is valid, false otherwise
   */
  isValid(): boolean;
}
/**
 * Creates a string input field with comprehensive validation options.
 *
 * @param options - Field configuration options
 * @returns Configured string field definition
 *
 * @example
 * ```typescript
 * // Simple required string
 * city: stringField({ required: true, description: 'City name' })
 *
 * // String with validation
 * email: stringField({
 *   required: true,
 *   format: 'email',
 *   description: 'User email address',
 *   example: 'user@example.com'
 * })
 *
 * // String with length constraints
 * name: stringField({
 *   required: true,
 *   minLength: 2,
 *   maxLength: 50,
 *   description: 'User name'
 * })
 * ```
 */
export declare function stringField(
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates a number input field with validation options.
 *
 * @param options - Field configuration options
 * @returns Configured number field definition
 *
 * @example
 * ```typescript
 * temperature: numberField({
 *   required: true,
 *   min: -100,
 *   max: 100,
 *   description: 'Temperature in celsius'
 * })
 * ```
 */
export declare function numberField(
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates a boolean input field.
 *
 * @param options - Field configuration options
 * @returns Configured boolean field definition
 *
 * @example
 * ```typescript
 * includeDetails: booleanField({
 *   required: false,
 *   default: false,
 *   description: 'Include detailed information'
 * })
 * ```
 */
export declare function booleanField(
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates an array input field with item type validation.
 *
 * @param items - Definition for array items
 * @param options - Field configuration options
 * @returns Configured array field definition
 *
 * @example
 * ```typescript
 * tags: arrayField(
 *   stringField({ minLength: 1, maxLength: 20 }),
 *   {
 *     required: false,
 *     minItems: 0,
 *     maxItems: 10,
 *     uniqueItems: true,
 *     description: 'List of tags'
 *   }
 * )
 * ```
 */
export declare function arrayField(
  items: ToolInputField,
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates an object input field with property definitions.
 *
 * @param properties - Object property definitions
 * @param options - Field configuration options
 * @returns Configured object field definition
 *
 * @example
 * ```typescript
 * location: objectField(
 *   {
 *     latitude: numberField({ required: true, min: -90, max: 90 }),
 *     longitude: numberField({ required: true, min: -180, max: 180 })
 *   },
 *   {
 *     required: true,
 *     description: 'Geographic coordinates'
 *   }
 * )
 * ```
 */
export declare function objectField(
  properties: Record<string, ToolInputField>,
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates a date input field with format validation.
 *
 * @param options - Field configuration options
 * @returns Configured date field definition
 *
 * @example
 * ```typescript
 * birthDate: dateField({
 *   required: true,
 *   description: 'Date of birth',
 *   minDate: '1900-01-01',
 *   maxDate: '2023-12-31'
 * })
 * ```
 */
export declare function dateField(
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates a time input field with format validation.
 *
 * @param options - Field configuration options
 * @returns Configured time field definition
 *
 * @example
 * ```typescript
 * meetingTime: timeField({
 *   required: true,
 *   description: 'Meeting time',
 *   example: '14:30'
 * })
 * ```
 */
export declare function timeField(
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates an enum input field with predefined values.
 *
 * @param values - Array of allowed values
 * @param options - Field configuration options
 * @returns Configured enum field definition
 *
 * @example
 * ```typescript
 * priority: enumField(
 *   ['low', 'medium', 'high', 'critical'],
 *   {
 *     required: false,
 *     default: 'medium',
 *     description: 'Task priority level'
 *   }
 * )
 * ```
 */
export declare function enumField(
  values: any[],
  options?: Partial<ToolInputField>
): ToolInputField;
/**
 * Creates an API key configuration field with security best practices.
 *
 * @param options - Field configuration options
 * @returns Configured API key field definition
 *
 * @example
 * ```typescript
 * // Basic API key
 * apiKey: apiKeyField({ required: true, envVar: 'MY_API_KEY' })
 *
 * // API key with validation pattern
 * githubToken: apiKeyField({
 *   required: true,
 *   envVar: 'GITHUB_TOKEN',
 *   description: 'GitHub personal access token',
 *   validation: {
 *     pattern: '^ghp_[a-zA-Z0-9]{36}$',
 *     errorMessage: 'GitHub token must start with "ghp_" and be 40 characters total'
 *   }
 * })
 * ```
 */
export declare function apiKeyField(
  options?: Partial<ToolConfigField>
): ToolConfigField;
/**
 * Creates a configuration string field.
 *
 * @param options - Field configuration options
 * @returns Configured string config field definition
 *
 * @example
 * ```typescript
 * baseUrl: configStringField({
 *   required: false,
 *   default: 'https://api.example.com',
 *   description: 'Base URL for API requests',
 *   validation: { pattern: '^https://.+' }
 * })
 * ```
 */
export declare function configStringField(
  options?: Partial<ToolConfigField>
): ToolConfigField;
/**
 * Creates a configuration number field.
 *
 * @param options - Field configuration options
 * @returns Configured number config field definition
 *
 * @example
 * ```typescript
 * timeout: configNumberField({
 *   required: false,
 *   default: 5000,
 *   description: 'Request timeout in milliseconds',
 *   validation: { min: 1000, max: 30000 }
 * })
 * ```
 */
export declare function configNumberField(
  options?: Partial<ToolConfigField>
): ToolConfigField;
/**
 * Creates a URL configuration field with validation.
 *
 * @param options - Field configuration options
 * @returns Configured URL config field definition
 *
 * @example
 * ```typescript
 * webhookUrl: configUrlField({
 *   required: true,
 *   description: 'Webhook endpoint URL',
 *   validation: { allowedProtocols: ['https'] }
 * })
 * ```
 */
export declare function configUrlField(
  options?: Partial<ToolConfigField>
): ToolConfigField;
/**
 * Creates a simple tool with minimal configuration for quick prototyping.
 *
 * @param name - Tool name
 * @param version - Tool version
 * @param description - Tool description
 * @param execute - Tool execution function
 * @returns Configured tool instance
 *
 * @example
 * ```typescript
 * const echoTool = simpleCreateTool(
 *   'echo-tool',
 *   '1.0.0',
 *   'Simple echo tool for testing',
 *   async (input) => {
 *     return {
 *       status: 'success',
 *       data: { echo: input }
 *     };
 *   }
 * );
 *
 * await echoTool.start({ port: 3000 });
 * ```
 */
export declare function simpleCreateTool<TInput extends ToolInput = ToolInput>(
  name: string,
  version: string,
  description: string,
  execute: (input: TInput) => Promise<any>
): Tool<TInput, {}>;
/**
 * Creates a tool builder instance for fluent API usage.
 *
 * @returns New ToolBuilder instance
 *
 * @example
 * ```typescript
 * const tool = createToolBuilder()
 *   .metadata({ name: 'my-tool', version: '1.0.0', ... })
 *   .inputField('message', stringField({ required: true }))
 *   .execute(async (input, config, context) => ({ ... }))
 *   .build();
 * ```
 */
export declare function createToolBuilder<
  TInput extends ToolInput = ToolInput,
  TConfig extends ToolConfig = ToolConfig,
>(): ToolBuilder<TInput, TConfig>;
//# sourceMappingURL=create-tool.d.ts.map
