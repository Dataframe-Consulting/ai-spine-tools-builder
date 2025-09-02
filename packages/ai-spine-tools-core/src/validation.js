'use strict';
/**
 * Advanced validation system for AI Spine tools using Zod for robust schema validation.
 * This module provides comprehensive validation for tool inputs, configurations, and
 * cross-field relationships with performance optimizations and detailed error reporting.
 *
 * @example
 * ```typescript
 * import { ZodSchemaValidator } from '@ai-spine/tools-core';
 *
 * const validator = new ZodSchemaValidator();
 *
 * // Validate tool input
 *
 
 * const result = await validator.validateInput(inputData, inputSchema);
 * if (!result.success) {
 *   console.error('Validation errors:', result.errors);
 * }
 *
 * // Validate configuration
 * const configResult = await validator.validateConfig(config, configSchema);
 * ```
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.SchemaValidator = exports.ZodSchemaValidator = void 0;
const zod_1 = require('zod');
const types_js_1 = require('./types.js');
/**
 * Advanced schema validator using Zod for robust validation with caching,
 * performance optimization, and detailed error reporting.
 */
class ZodSchemaValidator {
  constructor() {
    /** Schema cache for performance optimization */
    this.schemaCache = new Map();
    /** Performance metrics */
    this.metrics = {
      totalValidations: 0,
      cacheHits: 0,
      averageDurationMs: 0,
      totalDurationMs: 0,
    };
  }
  /**
   * Validates tool input data against the provided schema
   */
  async validateInput(input, schema, _options = {}) {
    const startTime = Date.now();
    try {
      // Build Zod schema for input validation
      const zodSchema = this.buildInputSchema(schema, _options);
      // Perform validation
      const result = await this.performValidation(zodSchema, input, _options);
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, result.fromCache);
      if (result.success) {
        return {
          success: true,
          data: result.data,
          timing: {
            durationMs: duration,
            fromCache: result.fromCache,
          },
        };
      } else {
        return {
          success: false,
          errors: result.errors,
          timing: {
            durationMs: duration,
            fromCache: result.fromCache,
          },
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        errors: [
          {
            path: [],
            code: 'VALIDATION_SYSTEM_ERROR',
            message: `Validation system error: ${error instanceof Error ? error.message : String(error)}`,
            context: { originalError: error },
          },
        ],
        timing: {
          durationMs: duration,
          fromCache: false,
        },
      };
    }
  }
  /**
   * Validates tool configuration against the provided schema
   */
  async validateConfig(config, schema, _options = {}) {
    const startTime = Date.now();
    try {
      // Build Zod schema for config validation
      const zodSchema = this.buildConfigSchema(schema, _options);
      // Perform validation
      const result = await this.performValidation(zodSchema, config, _options);
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, result.fromCache);
      if (result.success) {
        return {
          success: true,
          data: result.data,
          timing: {
            durationMs: duration,
            fromCache: result.fromCache,
          },
        };
      } else {
        return {
          success: false,
          errors: result.errors,
          timing: {
            durationMs: duration,
            fromCache: result.fromCache,
          },
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        errors: [
          {
            path: [],
            code: 'VALIDATION_SYSTEM_ERROR',
            message: `Configuration validation system error: ${error instanceof Error ? error.message : String(error)}`,
            context: { originalError: error },
          },
        ],
        timing: {
          durationMs: duration,
          fromCache: false,
        },
      };
    }
  }
  /**
   * Validates complete tool schema including cross-field validations
   */
  async validateToolSchema(data, schema, _options = {}) {
    const startTime = Date.now();
    try {
      // Validate input and config separately first
      const inputResult = await this.validateInput(
        data.input,
        schema.input,
        _options
      );
      if (!inputResult.success) {
        return inputResult;
      }
      const configResult = await this.validateConfig(
        data.config,
        schema.config,
        _options
      );
      if (!configResult.success) {
        return configResult;
      }
      // Perform cross-field validations if defined
      if (schema.validation?.crossFieldValidation) {
        const crossFieldResult = await this.validateCrossFieldRules(
          { input: inputResult.data, config: configResult.data },
          schema.validation.crossFieldValidation,
          _options
        );
        if (!crossFieldResult.success) {
          return crossFieldResult;
        }
      }
      const duration = Date.now() - startTime;
      return {
        success: true,
        data: {
          input: inputResult.data,
          config: configResult.data,
        },
        timing: {
          durationMs: duration,
          fromCache: false, // Cross-field validation doesn't use cache
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        errors: [
          {
            path: [],
            code: 'SCHEMA_VALIDATION_ERROR',
            message: `Tool schema validation error: ${error instanceof Error ? error.message : String(error)}`,
            context: { originalError: error },
          },
        ],
        timing: {
          durationMs: duration,
          fromCache: false,
        },
      };
    }
  }
  /**
   * Builds a Zod schema from ToolInputField definitions
   */
  buildInputSchema(schema, _options) {
    const cacheKey = this.generateCacheKey('input', schema, _options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached.schema;
    }
    const zodFields = {};
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      zodFields[fieldName] = this.buildFieldSchema(
        fieldDef,
        fieldName,
        _options
      );
    }
    const zodSchema = zod_1.z.object(zodFields);
    const finalSchema = _options.stripUnknown ? zodSchema.strip() : zodSchema;
    // Cache the schema
    this.setCache(cacheKey, finalSchema, schema);
    return finalSchema;
  }
  /**
   * Builds a Zod schema from ToolConfigField definitions
   */
  buildConfigSchema(schema, _options) {
    const cacheKey = this.generateCacheKey('config', schema, _options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached.schema;
    }
    const zodFields = {};
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      zodFields[fieldName] = this.buildConfigFieldSchema(
        fieldDef,
        fieldName,
        _options
      );
    }
    const zodSchema = zod_1.z.object(zodFields);
    const finalSchema = _options.stripUnknown ? zodSchema.strip() : zodSchema;
    // Cache the schema
    this.setCache(cacheKey, finalSchema, schema);
    return finalSchema;
  }
  /**
   * Builds a Zod schema for a single input field
   */
  buildFieldSchema(field, fieldName, _options) {
    let schema;
    // Build base schema based on field type
    switch (field.type) {
      case 'string':
        schema = zod_1.z.string();
        // Apply string-specific validations
        if (field.minLength !== undefined) {
          schema = schema.min(
            field.minLength,
            _options.customMessages?.[`${fieldName}.minLength`] ||
              `${fieldName} must be at least ${field.minLength} characters long`
          );
        }
        if (field.maxLength !== undefined) {
          schema = schema.max(
            field.maxLength,
            _options.customMessages?.[`${fieldName}.maxLength`] ||
              `${fieldName} must be at most ${field.maxLength} characters long`
          );
        }
        if (field.pattern) {
          schema = schema.regex(
            new RegExp(field.pattern),
            _options.customMessages?.[`${fieldName}.pattern`] ||
              `${fieldName} does not match required pattern`
          );
        }
        if (field.format) {
          schema = this.applyStringFormat(schema, field.format, fieldName);
        }
        // Apply transformations
        if (_options.transform && field.transform) {
          schema = this.applyStringTransform(schema, field.transform);
        }
        break;
      case 'email':
        schema = zod_1.z
          .string()
          .email(
            _options.customMessages?.[`${fieldName}.email`] ||
              `${fieldName} must be a valid email address`
          );
        break;
      case 'url':
        schema = zod_1.z
          .string()
          .url(
            _options.customMessages?.[`${fieldName}.url`] ||
              `${fieldName} must be a valid URL`
          );
        break;
      case 'uuid':
        schema = zod_1.z
          .string()
          .uuid(
            _options.customMessages?.[`${fieldName}.uuid`] ||
              `${fieldName} must be a valid UUID`
          );
        break;
      case 'number':
        schema = zod_1.z.number();
        if (field.min !== undefined) {
          schema = schema.min(
            field.min,
            _options.customMessages?.[`${fieldName}.min`] ||
              `${fieldName} must be at least ${field.min}`
          );
        }
        if (field.max !== undefined) {
          schema = schema.max(
            field.max,
            _options.customMessages?.[`${fieldName}.max`] ||
              `${fieldName} must be at most ${field.max}`
          );
        }
        if (field.integer) {
          schema = schema.int(
            _options.customMessages?.[`${fieldName}.integer`] ||
              `${fieldName} must be an integer`
          );
        }
        break;
      case 'boolean':
        schema = zod_1.z.boolean();
        break;
      case 'array':
        let itemSchema = zod_1.z.any();
        if (field.items) {
          itemSchema = this.buildFieldSchema(
            field.items,
            `${fieldName}[item]`,
            _options
          );
        }
        schema = zod_1.z.array(itemSchema);
        if (field.minItems !== undefined) {
          schema = schema.min(
            field.minItems,
            _options.customMessages?.[`${fieldName}.minItems`] ||
              `${fieldName} must contain at least ${field.minItems} items`
          );
        }
        if (field.maxItems !== undefined) {
          schema = schema.max(
            field.maxItems,
            _options.customMessages?.[`${fieldName}.maxItems`] ||
              `${fieldName} must contain at most ${field.maxItems} items`
          );
        }
        break;
      case 'object':
        if (field.properties) {
          const objectFields = {};
          for (const [propName, propDef] of Object.entries(field.properties)) {
            objectFields[propName] = this.buildFieldSchema(
              propDef,
              `${fieldName}.${propName}`,
              _options
            );
          }
          schema = zod_1.z.object(objectFields);
          if (!field.additionalProperties) {
            schema = schema.strict();
          }
        } else {
          schema = zod_1.z.record(zod_1.z.string(), zod_1.z.any());
        }
        break;
      case 'date':
        schema = zod_1.z.coerce.date();
        if (field.minDate) {
          const minDate = new Date(field.minDate);
          schema = schema.min(
            minDate,
            _options.customMessages?.[`${fieldName}.minDate`] ||
              `${fieldName} must be after ${field.minDate}`
          );
        }
        if (field.maxDate) {
          const maxDate = new Date(field.maxDate);
          schema = schema.max(
            maxDate,
            _options.customMessages?.[`${fieldName}.maxDate`] ||
              `${fieldName} must be before ${field.maxDate}`
          );
        }
        break;
      case 'datetime':
        schema = zod_1.z.coerce.date();
        // Additional datetime-specific validations could be added here
        break;
      case 'time':
        schema = zod_1.z
          .string()
          .regex(
            /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
            _options.customMessages?.[`${fieldName}.time`] ||
              `${fieldName} must be in HH:MM:SS format`
          );
        break;
      case 'enum':
        if (!field.enum || field.enum.length === 0) {
          throw new Error(
            `Enum field ${fieldName} must have enum values defined`
          );
        }
        schema = zod_1.z.enum(field.enum);
        break;
      case 'json':
        schema = zod_1.z.any().refine(
          val => {
            try {
              if (typeof val === 'string') {
                JSON.parse(val);
              }
              return true;
            } catch {
              return false;
            }
          },
          _options.customMessages?.[`${fieldName}.json`] ||
            `${fieldName} must be valid JSON`
        );
        break;
      case 'file':
        // File validation would typically be handled at a higher level
        schema = zod_1.z.object({
          name: zod_1.z.string(),
          size: zod_1.z.number(),
          type: zod_1.z.string(),
        });
        if (field.maxFileSize) {
          schema = schema.refine(
            file => file.size <= field.maxFileSize,
            _options.customMessages?.[`${fieldName}.maxFileSize`] ||
              `${fieldName} file size must not exceed ${field.maxFileSize} bytes`
          );
        }
        if (field.allowedMimeTypes && field.allowedMimeTypes.length > 0) {
          schema = schema.refine(
            file => field.allowedMimeTypes.includes(file.type),
            _options.customMessages?.[`${fieldName}.mimeType`] ||
              `${fieldName} must be one of the allowed file types: ${field.allowedMimeTypes.join(', ')}`
          );
        }
        break;
      default:
        schema = zod_1.z.any();
        break;
    }
    // Apply enum validation if defined (for non-enum types)
    if (field.enum && field.type !== 'enum') {
      schema = schema.refine(
        val => field.enum.includes(val),
        _options.customMessages?.[`${fieldName}.enum`] ||
          `${fieldName} must be one of: ${field.enum.join(', ')}`
      );
    }
    // Handle required/optional and defaults
    if (!field.required) {
      schema = schema.optional();
      if (field.default !== undefined) {
        schema = schema.default(field.default);
      }
    }
    return schema;
  }
  /**
   * Builds a Zod schema for a single config field
   */
  buildConfigFieldSchema(field, fieldName, _options) {
    let schema;
    switch (field.type) {
      case 'string':
        schema = zod_1.z.string();
        break;
      case 'apiKey':
      case 'secret':
        schema = zod_1.z.string().min(1, `${fieldName} cannot be empty`);
        break;
      case 'url':
        schema = zod_1.z.string().url(`${fieldName} must be a valid URL`);
        if (field.validation?.allowedProtocols) {
          schema = schema.refine(
            url => {
              try {
                const parsed = new URL(url);
                return field.validation.allowedProtocols.includes(
                  parsed.protocol.slice(0, -1)
                );
              } catch {
                return false;
              }
            },
            `${fieldName} must use one of the allowed protocols: ${field.validation.allowedProtocols.join(', ')}`
          );
        }
        break;
      case 'number':
        schema = zod_1.z.number();
        break;
      case 'boolean':
        schema = zod_1.z.boolean();
        break;
      case 'enum':
        if (!field.validation?.enum || field.validation.enum.length === 0) {
          throw new Error(
            `Enum config field ${fieldName} must have enum values defined`
          );
        }
        schema = zod_1.z.enum(field.validation.enum);
        break;
      case 'json':
        schema = zod_1.z.any();
        if (field.validation?.jsonSchema) {
          // Here you could integrate with a JSON Schema validator if needed
          // For now, we'll just ensure it's valid JSON
          schema = schema.refine(val => {
            try {
              if (typeof val === 'string') {
                JSON.parse(val);
              }
              return true;
            } catch {
              return false;
            }
          }, `${fieldName} must be valid JSON`);
        }
        break;
      default:
        schema = zod_1.z.any();
        break;
    }
    // Apply validation rules
    if (field.validation) {
      const validation = field.validation;
      if (validation.min !== undefined && schema instanceof zod_1.z.ZodString) {
        schema = schema.min(
          validation.min,
          validation.errorMessage ||
            `${fieldName} must be at least ${validation.min} characters long`
        );
      }
      if (validation.max !== undefined && schema instanceof zod_1.z.ZodString) {
        schema = schema.max(
          validation.max,
          validation.errorMessage ||
            `${fieldName} must be at most ${validation.max} characters long`
        );
      }
      if (validation.pattern && schema instanceof zod_1.z.ZodString) {
        schema = schema.regex(
          new RegExp(validation.pattern),
          validation.errorMessage ||
            `${fieldName} does not match required pattern`
        );
      }
    }
    // Handle required/optional and defaults
    if (!field.required) {
      schema = schema.optional();
      if (field.default !== undefined) {
        schema = schema.default(field.default);
      }
    }
    return schema;
  }
  /**
   * Applies string format validation
   */
  applyStringFormat(schema, format, fieldName) {
    switch (format) {
      case 'email':
        return schema.email(`${fieldName} must be a valid email address`);
      case 'url':
        return schema.url(`${fieldName} must be a valid URL`);
      case 'uuid':
        return schema.uuid(`${fieldName} must be a valid UUID`);
      case 'ipv4':
        return schema.regex(
          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
          `${fieldName} must be a valid IPv4 address`
        );
      case 'ipv6':
        return schema.regex(
          /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/,
          `${fieldName} must be a valid IPv6 address`
        );
      case 'base64':
        return schema.regex(
          /^[A-Za-z0-9+/]*={0,2}$/,
          `${fieldName} must be valid base64`
        );
      case 'jwt':
        return schema.regex(
          /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
          `${fieldName} must be a valid JWT`
        );
      case 'slug':
        return schema.regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          `${fieldName} must be a valid slug`
        );
      case 'color-hex':
        return schema.regex(
          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          `${fieldName} must be a valid hex color`
        );
      case 'semver':
        return schema.regex(
          /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
          `${fieldName} must be a valid semantic version`
        );
      default:
        return schema;
    }
  }
  /**
   * Applies string transformations
   */
  applyStringTransform(schema, transform) {
    switch (transform) {
      case 'trim':
        return schema.transform(val => val.trim());
      case 'lowercase':
        return schema.transform(val => val.toLowerCase());
      case 'uppercase':
        return schema.transform(val => val.toUpperCase());
      case 'normalize':
        return schema.transform(val => val.normalize());
      default:
        return schema;
    }
  }
  /**
   * Performs the actual validation using Zod
   */
  async performValidation(schema, data, _options) {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return {
          success: true,
          data: result.data,
          fromCache: false, // TODO: Implement result caching if needed
        };
      } else {
        const errors = this.convertZodErrors(result.error);
        return {
          success: false,
          errors,
          fromCache: false,
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            path: [],
            code: 'PARSE_ERROR',
            message: `Parsing error: ${error instanceof Error ? error.message : String(error)}`,
            context: { originalError: error },
          },
        ],
        fromCache: false,
      };
    }
  }
  /**
   * Validates cross-field rules
   */
  async validateCrossFieldRules(data, rules, _options) {
    const errors = [];
    for (const rule of rules) {
      try {
        const isValid = await this.evaluateCrossFieldRule(data, rule, _options);
        if (!isValid) {
          errors.push({
            path: ['cross-field'],
            code: 'CROSS_FIELD_VALIDATION_FAILED',
            message:
              rule.errorMessage ||
              rule.description ||
              'Cross-field validation failed',
            context: { rule },
          });
        }
      } catch (error) {
        errors.push({
          path: ['cross-field'],
          code: 'CROSS_FIELD_EVALUATION_ERROR',
          message: `Error evaluating cross-field rule: ${error instanceof Error ? error.message : String(error)}`,
          context: { rule, error },
        });
      }
    }
    return {
      success: errors.length === 0,
      ...(errors.length > 0 && { errors }),
    };
  }
  /**
   * Evaluates a single cross-field rule
   */
  async evaluateCrossFieldRule(data, rule, _options) {
    switch (rule.rule) {
      case 'conditional':
        if (rule.condition) {
          // Simple condition evaluation (in production, you might want a safer evaluator)
          const conditionMet = this.evaluateCondition(rule.condition, data);
          if (conditionMet) {
            // Check if required fields are present
            if (rule.requires) {
              for (const fieldPath of rule.requires) {
                if (!this.getNestedValue(data, fieldPath)) {
                  return false;
                }
              }
            }
            // Check if forbidden fields are absent
            if (rule.forbids) {
              for (const fieldPath of rule.forbids) {
                if (this.getNestedValue(data, fieldPath)) {
                  return false;
                }
              }
            }
          }
        }
        return true;
      case 'mutual_exclusion':
        // Check that only one of the specified fields is present
        if (rule.fields) {
          const presentFields = rule.fields.filter(
            fieldPath => this.getNestedValue(data, fieldPath) !== undefined
          );
          return presentFields.length <= 1;
        }
        return true;
      case 'dependency':
        // Check that if one field is present, others are required
        if (rule.trigger && rule.requires) {
          const triggerPresent =
            this.getNestedValue(data, rule.trigger) !== undefined;
          if (triggerPresent) {
            for (const requiredField of rule.requires) {
              if (this.getNestedValue(data, requiredField) === undefined) {
                return false;
              }
            }
          }
        }
        return true;
      case 'custom':
        // For custom validations, you would implement your own logic here
        // This is a placeholder for custom validation functions
        return true;
      default:
        throw new Error(`Unknown cross-field validation rule: ${rule.rule}`);
    }
  }
  /**
   * Simple condition evaluator (for production, consider using a safer expression evaluator)
   */
  evaluateCondition(condition, data) {
    try {
      // This is a simplified evaluator. In production, you should use a safer
      // expression evaluator that doesn't use eval()
      const context = { input: data.input, config: data.config };
      // Replace field references with actual values
      let processedCondition = condition;
      // Simple regex-based replacement for common patterns
      processedCondition = processedCondition.replace(
        /input\.(\w+)/g,
        (_, fieldName) => {
          const value = context.input[fieldName];
          return typeof value === 'string' ? `"${value}"` : String(value);
        }
      );
      processedCondition = processedCondition.replace(
        /config\.(\w+)/g,
        (_, fieldName) => {
          const value = context.config[fieldName];
          return typeof value === 'string' ? `"${value}"` : String(value);
        }
      );
      // WARNING: This uses eval() which is dangerous in production
      // Consider using a proper expression evaluator library
      return Boolean(eval(processedCondition));
    } catch {
      return false;
    }
  }
  /**
   * Gets a nested value from an object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  /**
   * Converts Zod errors to our standardized format
   */
  convertZodErrors(zodError) {
    return zodError.issues.map(error => ({
      path: error.path.map(p => String(p)),
      code: error.code.toUpperCase(),
      message: error.message,
      value: error.received,
      expected: error.expected,
      context: {
        zodError: error,
      },
    }));
  }
  /**
   * Cache management methods
   */
  generateCacheKey(type, schema, options) {
    const schemaHash = this.hashObject(schema);
    const optionsHash = this.hashObject(options);
    return `${type}:${schemaHash}:${optionsHash}`;
  }
  getFromCache(cacheKey) {
    const cached = this.schemaCache.get(cacheKey);
    if (!cached) {
      return null;
    }
    // Check if cache entry is still valid
    const isExpired =
      Date.now() - cached.timestamp > ZodSchemaValidator.CACHE_TTL_MS;
    if (isExpired) {
      this.schemaCache.delete(cacheKey);
      return null;
    }
    // Update hit count
    cached.hitCount++;
    this.metrics.cacheHits++;
    return cached;
  }
  setCache(cacheKey, schema, originalSchema) {
    // Cleanup old entries if cache is full
    if (this.schemaCache.size >= ZodSchemaValidator.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    this.schemaCache.set(cacheKey, {
      schema,
      timestamp: Date.now(),
      hitCount: 0,
      hash: this.hashObject(originalSchema),
    });
  }
  cleanupCache() {
    // Remove least recently used entries
    const entries = Array.from(this.schemaCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.schemaCache.delete(entries[i][0]);
    }
  }
  hashObject(obj) {
    // Simple hash function for caching purposes
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  /**
   * Updates performance metrics
   */
  updateMetrics(durationMs, fromCache) {
    this.metrics.totalValidations++;
    this.metrics.totalDurationMs += durationMs;
    this.metrics.averageDurationMs =
      this.metrics.totalDurationMs / this.metrics.totalValidations;
    if (fromCache) {
      this.metrics.cacheHits++;
    }
  }
  /**
   * Gets performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate:
        this.metrics.totalValidations > 0
          ? this.metrics.cacheHits / this.metrics.totalValidations
          : 0,
      currentCacheSize: this.schemaCache.size,
    };
  }
  /**
   * Clears all caches and resets metrics
   */
  reset() {
    this.schemaCache.clear();
    this.metrics.totalValidations = 0;
    this.metrics.cacheHits = 0;
    this.metrics.averageDurationMs = 0;
    this.metrics.totalDurationMs = 0;
  }
}
exports.ZodSchemaValidator = ZodSchemaValidator;
ZodSchemaValidator.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
ZodSchemaValidator.MAX_CACHE_SIZE = 1000;
/**
 * Legacy compatibility layer for existing SchemaValidator API
 * @deprecated Use ZodSchemaValidator instead
 */
class SchemaValidator {
  /**
   * @deprecated Use ZodSchemaValidator.validateInput instead
   */
  static async validateInput(input, schema) {
    const result = await this.validator.validateInput(input, schema);
    if (!result.success) {
      const errorMessages = result.errors.map(e => e.message);
      throw new types_js_1.ValidationError(
        `Input validation failed: ${errorMessages.join(', ')}`,
        result.errors[0]?.path.join('.'),
        { errors: result.errors }
      );
    }
  }
  /**
   * @deprecated Use ZodSchemaValidator.validateConfig instead
   */
  static async validateConfig(config, schema) {
    const result = await this.validator.validateConfig(config, schema);
    if (!result.success) {
      const errorMessages = result.errors.map(e => e.message);
      const missingKeys = result.errors
        .filter(e => e.code === 'REQUIRED')
        .map(e => e.path.join('.'));
      throw new types_js_1.ConfigurationError(
        `Configuration validation failed: ${errorMessages.join(', ')}`,
        missingKeys
      );
    }
  }
}
exports.SchemaValidator = SchemaValidator;
SchemaValidator.validator = new ZodSchemaValidator();
//# sourceMappingURL=validation.js.map
