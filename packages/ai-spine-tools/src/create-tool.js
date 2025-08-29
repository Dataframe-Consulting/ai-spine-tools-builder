"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolBuilder = void 0;
exports.createTool = createTool;
exports.stringField = stringField;
exports.numberField = numberField;
exports.booleanField = booleanField;
exports.arrayField = arrayField;
exports.objectField = objectField;
exports.dateField = dateField;
exports.timeField = timeField;
exports.enumField = enumField;
exports.apiKeyField = apiKeyField;
exports.configStringField = configStringField;
exports.configNumberField = configNumberField;
exports.configUrlField = configUrlField;
exports.simpleCreateTool = simpleCreateTool;
exports.createToolBuilder = createToolBuilder;
const tools_core_1 = require("@ai-spine/tools-core");
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
function createTool(options) {
    // Step 1: Comprehensive validation of tool definition
    validateToolDefinition(options);
    // Step 2: Apply intelligent defaults and enhancements
    const enhancedOptions = applyIntelligentDefaults(options);
    // Step 3: Validate schema structure and field definitions
    validateSchemaStructure(enhancedOptions.schema);
    // Step 4: Create the complete tool definition
    const definition = {
        metadata: enhancedOptions.metadata,
        schema: enhancedOptions.schema,
        execute: enhancedOptions.execute,
        setup: enhancedOptions.setup,
        cleanup: enhancedOptions.cleanup,
        healthCheck: enhancedOptions.healthCheck
    };
    // Step 5: Create and return the tool instance
    const tool = new tools_core_1.Tool(definition);
    // Step 6: Add development mode enhancements
    if (process.env.NODE_ENV === 'development' || process.env.AI_SPINE_DEBUG === 'true') {
        addDevelopmentEnhancements(tool, definition);
    }
    return tool;
}
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
class ToolBuilder {
    constructor() {
        this._inputSchema = {};
        this._configSchema = {};
        this._validationErrors = [];
        this._built = false;
    }
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
    metadata(metadata) {
        this.validateBuilderState();
        // Validate metadata structure
        if (!metadata.name || typeof metadata.name !== 'string') {
            this._validationErrors.push('Tool name is required and must be a non-empty string');
        }
        if (!metadata.version || typeof metadata.version !== 'string') {
            this._validationErrors.push('Tool version is required and must be a valid semver string');
        }
        if (!metadata.description || typeof metadata.description !== 'string') {
            this._validationErrors.push('Tool description is required and must be a non-empty string');
        }
        if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
            this._validationErrors.push('Tool capabilities must be a non-empty array');
        }
        this._metadata = metadata;
        return this;
    }
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
    input(schema) {
        this.validateBuilderState();
        if (!schema || typeof schema !== 'object') {
            this._validationErrors.push('Input schema must be an object');
        }
        else {
            // Validate each field
            Object.entries(schema).forEach(([name, field]) => {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                    this._validationErrors.push(`Input field name '${name}' must be a valid identifier`);
                }
                if (!field || typeof field !== 'object') {
                    this._validationErrors.push(`Input field '${name}' must be a valid field definition`);
                }
            });
        }
        this._inputSchema = { ...this._inputSchema, ...schema };
        return this;
    }
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
    inputField(name, field) {
        this.validateBuilderState();
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            this._validationErrors.push('Input field name must be a non-empty string');
        }
        else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            this._validationErrors.push(`Input field name '${name}' must be a valid identifier (letters, numbers, underscores only)`);
        }
        if (!field || typeof field !== 'object') {
            this._validationErrors.push(`Input field '${name}' must be a valid field definition object`);
        }
        this._inputSchema[name] = field;
        return this;
    }
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
    config(schema) {
        this.validateBuilderState();
        if (!schema || typeof schema !== 'object') {
            this._validationErrors.push('Config schema must be an object');
        }
        else {
            // Validate each field
            Object.entries(schema).forEach(([name, field]) => {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                    this._validationErrors.push(`Config field name '${name}' must be a valid identifier`);
                }
                if (!field || typeof field !== 'object') {
                    this._validationErrors.push(`Config field '${name}' must be a valid field definition`);
                }
            });
        }
        this._configSchema = { ...this._configSchema, ...schema };
        return this;
    }
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
    configField(name, field) {
        this.validateBuilderState();
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            this._validationErrors.push('Config field name must be a non-empty string');
        }
        else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            this._validationErrors.push(`Config field name '${name}' must be a valid identifier (letters, numbers, underscores only)`);
        }
        if (!field || typeof field !== 'object') {
            this._validationErrors.push(`Config field '${name}' must be a valid field definition object`);
        }
        this._configSchema[name] = field;
        return this;
    }
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
    execute(fn) {
        this.validateBuilderState();
        if (typeof fn !== 'function') {
            this._validationErrors.push('Execute function must be a valid function');
        }
        this._executeFunction = fn;
        return this;
    }
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
    onSetup(fn) {
        this.validateBuilderState();
        if (typeof fn !== 'function') {
            this._validationErrors.push('Setup function must be a valid function');
        }
        this._setupFunction = fn;
        return this;
    }
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
    onCleanup(fn) {
        this.validateBuilderState();
        if (typeof fn !== 'function') {
            this._validationErrors.push('Cleanup function must be a valid function');
        }
        this._cleanupFunction = fn;
        return this;
    }
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
    healthCheck(fn) {
        this.validateBuilderState();
        if (typeof fn !== 'function') {
            this._validationErrors.push('Health check function must be a valid function');
        }
        this._healthCheckFunction = fn;
        return this;
    }
    /**
     * Validates that the builder hasn't been used yet and can accept more configuration.
     * @private
     */
    validateBuilderState() {
        if (this._built) {
            throw new tools_core_1.ConfigurationError('ToolBuilder has already been built and cannot be modified. Create a new builder instance.');
        }
    }
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
    build() {
        // Prevent multiple builds from same instance
        if (this._built) {
            throw new tools_core_1.ConfigurationError('ToolBuilder has already been built. Create a new builder instance for a new tool.');
        }
        // Validate required components
        if (!this._metadata) {
            this._validationErrors.push('Tool metadata is required. Call .metadata() with tool information.');
        }
        if (!this._executeFunction) {
            this._validationErrors.push('Execute function is required. Call .execute() with your tool logic.');
        }
        // Report all validation errors at once
        if (this._validationErrors.length > 0) {
            throw new tools_core_1.ConfigurationError(`Tool configuration validation failed:\n${this._validationErrors.map(e => `  - ${e}`).join('\n')}`, this._validationErrors);
        }
        // Create the tool options
        const options = {
            metadata: this._metadata,
            schema: {
                input: this._inputSchema,
                config: this._configSchema,
            },
            execute: this._executeFunction,
            setup: this._setupFunction,
            cleanup: this._cleanupFunction,
            healthCheck: this._healthCheckFunction,
        };
        // Mark as built to prevent reuse
        this._built = true;
        // Create and return the tool
        return createTool(options);
    }
    /**
     * Get current validation errors without building.
     * Useful for debugging configuration issues.
     *
     * @returns Array of validation error messages
     */
    getValidationErrors() {
        const errors = [...this._validationErrors];
        if (!this._metadata) {
            errors.push('Tool metadata is required');
        }
        if (!this._executeFunction) {
            errors.push('Execute function is required');
        }
        return errors;
    }
    /**
     * Check if the builder configuration is valid without building.
     *
     * @returns True if configuration is valid, false otherwise
     */
    isValid() {
        return this.getValidationErrors().length === 0;
    }
}
exports.ToolBuilder = ToolBuilder;
// ============================================================================
// FIELD BUILDER FUNCTIONS
// These functions provide a convenient API for creating field definitions
// with proper defaults and validation.
// ============================================================================
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
function stringField(options = {}) {
    return {
        type: 'string',
        required: options.required ?? false,
        ...options,
    };
}
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
function numberField(options = {}) {
    return {
        type: 'number',
        required: options.required ?? false,
        ...options,
    };
}
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
function booleanField(options = {}) {
    return {
        type: 'boolean',
        required: options.required ?? false,
        ...options,
    };
}
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
function arrayField(items, options = {}) {
    return {
        type: 'array',
        required: options.required ?? false,
        items,
        ...options,
    };
}
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
function objectField(properties, options = {}) {
    return {
        type: 'object',
        required: options.required ?? false,
        properties,
        ...options,
    };
}
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
function dateField(options = {}) {
    return {
        type: 'date',
        required: options.required ?? false,
        ...options,
    };
}
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
function timeField(options = {}) {
    return {
        type: 'time',
        required: options.required ?? false,
        ...options,
    };
}
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
function enumField(values, options = {}) {
    return {
        type: 'enum',
        required: options.required ?? false,
        enum: values,
        ...options,
    };
}
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
function apiKeyField(options = {}) {
    return {
        type: 'apiKey',
        required: options.required ?? true,
        secret: true,
        description: options.description || 'API key for authentication',
        ...options,
    };
}
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
function configStringField(options = {}) {
    return {
        type: 'string',
        required: options.required ?? false,
        ...options,
    };
}
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
function configNumberField(options = {}) {
    return {
        type: 'number',
        required: options.required ?? false,
        ...options,
    };
}
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
function configUrlField(options = {}) {
    return {
        type: 'url',
        required: options.required ?? false,
        validation: {
            allowedProtocols: ['https', 'http'],
            ...options.validation
        },
        ...options,
    };
}
/**
 * Comprehensive validation of tool definition for completeness, correctness, and best practices.
 * This function ensures that all required fields are present and properly formatted.
 *
 * @param options - Tool configuration options to validate
 * @throws {ConfigurationError} When validation fails
 * @private
 */
function validateToolDefinition(options) {
    const errors = [];
    const warnings = [];
    // Comprehensive metadata validation
    if (!options.metadata) {
        errors.push('Tool metadata is required');
    }
    else {
        const meta = options.metadata;
        // Required fields validation
        if (!meta.name || typeof meta.name !== 'string' || meta.name.trim().length === 0) {
            errors.push('Tool name is required and must be a non-empty string');
        }
        else if (!/^[a-z0-9-]+$/.test(meta.name)) {
            warnings.push('Tool name should use kebab-case format (lowercase with hyphens)');
        }
        if (!meta.version || typeof meta.version !== 'string' || meta.version.trim().length === 0) {
            errors.push('Tool version is required and must be a non-empty string');
        }
        else if (!/^\d+\.\d+\.\d+/.test(meta.version)) {
            warnings.push('Tool version should follow semantic versioning (e.g., "1.0.0")');
        }
        if (!meta.description || typeof meta.description !== 'string' || meta.description.trim().length === 0) {
            errors.push('Tool description is required and must be a non-empty string');
        }
        else if (meta.description.length < 10) {
            warnings.push('Tool description should be descriptive (at least 10 characters)');
        }
        if (!Array.isArray(meta.capabilities) || meta.capabilities.length === 0) {
            errors.push('Tool capabilities must be a non-empty array');
        }
        else {
            // Validate capability strings
            meta.capabilities.forEach((cap, index) => {
                if (typeof cap !== 'string' || cap.trim().length === 0) {
                    errors.push(`Capability at index ${index} must be a non-empty string`);
                }
            });
        }
        // Optional fields validation
        if (meta.author && typeof meta.author !== 'string') {
            errors.push('Tool author must be a string if provided');
        }
        if (meta.license && typeof meta.license !== 'string') {
            errors.push('Tool license must be a string if provided');
        }
        if (meta.tags && !Array.isArray(meta.tags)) {
            errors.push('Tool tags must be an array if provided');
        }
    }
    // Schema structure validation
    if (!options.schema) {
        errors.push('Tool schema is required');
    }
    else {
        const schema = options.schema;
        if (!schema.input || typeof schema.input !== 'object') {
            errors.push('Input schema is required and must be an object');
        }
        if (!schema.config || typeof schema.config !== 'object') {
            errors.push('Config schema is required and must be an object');
        }
    }
    // Execute function validation
    if (!options.execute || typeof options.execute !== 'function') {
        errors.push('Execute function is required and must be a function');
    }
    else {
        // Check function signature (approximate)
        const funcStr = options.execute.toString();
        if (funcStr.includes('function') && options.execute.length < 3) {
            warnings.push('Execute function should accept three parameters: (input, config, context)');
        }
    }
    // Optional function validations
    if (options.setup && typeof options.setup !== 'function') {
        errors.push('Setup function must be a function if provided');
    }
    if (options.cleanup && typeof options.cleanup !== 'function') {
        errors.push('Cleanup function must be a function if provided');
    }
    if (options.healthCheck && typeof options.healthCheck !== 'function') {
        errors.push('Health check function must be a function if provided');
    }
    // Report errors
    if (errors.length > 0) {
        throw new tools_core_1.ConfigurationError(`Tool definition validation failed:\n${errors.map(e => `  ❌ ${e}`).join('\n')}${warnings.length > 0 ?
            `\n\nWarnings:\n${warnings.map(w => `  ⚠️  ${w}`).join('\n')}` :
            ''}`, errors);
    }
    // Log warnings in development
    if (warnings.length > 0 && (process.env.NODE_ENV === 'development' || process.env.AI_SPINE_DEBUG === 'true')) {
        console.warn(`\n⚠️  Tool Definition Warnings for "${options.metadata.name}":\n${warnings.map(w => `  • ${w}`).join('\n')}\n`);
    }
}
/**
 * Applies intelligent defaults and enhancements to tool options.
 * This function improves developer experience by setting reasonable defaults.
 *
 * @param options - Original tool options
 * @returns Enhanced options with intelligent defaults
 * @private
 */
function applyIntelligentDefaults(options) {
    const enhanced = { ...options };
    // Enhance metadata with defaults
    if (!enhanced.metadata.tags) {
        enhanced.metadata.tags = [];
    }
    // Add SDK version if not specified
    if (!enhanced.metadata.minSdkVersion) {
        enhanced.metadata.minSdkVersion = '1.0.0';
    }
    // Ensure schema has proper structure
    if (!enhanced.schema.input) {
        enhanced.schema.input = {};
    }
    if (!enhanced.schema.config) {
        enhanced.schema.config = {};
    }
    return enhanced;
}
/**
 * Validates schema structure and field definitions for correctness.
 *
 * @param schema - Tool schema to validate
 * @throws {ValidationError} When schema validation fails
 * @private
 */
function validateSchemaStructure(schema) {
    const errors = [];
    // Validate input fields
    if (schema.input) {
        Object.entries(schema.input).forEach(([fieldName, field]) => {
            if (!field.type) {
                errors.push(`Input field '${fieldName}' must have a type`);
            }
            if (field.required === undefined) {
                errors.push(`Input field '${fieldName}' must specify if it's required`);
            }
        });
    }
    // Validate config fields
    if (schema.config) {
        Object.entries(schema.config).forEach(([fieldName, field]) => {
            if (!field.type) {
                errors.push(`Config field '${fieldName}' must have a type`);
            }
            if (field.required === undefined) {
                errors.push(`Config field '${fieldName}' must specify if it's required`);
            }
        });
    }
    if (errors.length > 0) {
        throw new tools_core_1.ValidationError(`Schema validation failed:\n${errors.map(e => `  ❌ ${e}`).join('\n')}`);
    }
}
/**
 * Adds development mode enhancements to improve developer experience.
 *
 * @param tool - Tool instance to enhance
 * @param definition - Tool definition for context
 * @private
 */
function addDevelopmentEnhancements(tool, definition) {
    // Add helpful logging
    console.log(`\n🛠️  Created tool "${definition.metadata.name}" v${definition.metadata.version}`);
    console.log(`   📝 ${definition.metadata.description}`);
    console.log(`   🎯 Capabilities: ${definition.metadata.capabilities.join(', ')}`);
    console.log(`   📊 Input fields: ${Object.keys(definition.schema.input).length}`);
    console.log(`   ⚙️  Config fields: ${Object.keys(definition.schema.config).length}`);
    // Add development event listeners
    tool.on('beforeExecution', (context) => {
        console.log(`🚀 Executing tool "${definition.metadata.name}" (ID: ${context.executionId})`);
    });
    tool.on('afterExecution', (_context, result) => {
        const duration = result.timing?.executionTimeMs || 0;
        const status = result.status === 'success' ? '✅' : '❌';
        console.log(`${status} Tool execution ${result.status} in ${duration}ms`);
    });
    tool.on('error', (error) => {
        console.error(`❌ Tool error in "${definition.metadata.name}":`, error.message);
    });
}
// ============================================================================
// CONVENIENCE FUNCTIONS
// These functions provide shortcuts for common tool creation patterns.
// ============================================================================
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
function simpleCreateTool(name, version, description, execute) {
    return createTool({
        metadata: {
            name,
            version,
            description,
            capabilities: [name.replace(/-tool$/, '')]
        },
        schema: {
            input: {},
            config: {}
        },
        execute: async (input, _config, context) => {
            try {
                const result = await execute(input);
                return {
                    status: 'success',
                    data: result,
                    timing: {
                        executionTimeMs: Date.now() - context.performance.startTime,
                        startedAt: new Date(context.performance.startTime).toISOString(),
                        completedAt: new Date().toISOString()
                    }
                };
            }
            catch (error) {
                return {
                    status: 'error',
                    error: {
                        code: 'EXECUTION_ERROR',
                        message: error.message,
                        type: 'execution_error'
                    }
                };
            }
        }
    });
}
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
function createToolBuilder() {
    return new ToolBuilder();
}
//# sourceMappingURL=create-tool.js.map