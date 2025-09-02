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
import {
  ToolInputField,
  ToolConfigField,
  ToolInput,
  ToolConfig,
  ToolSchema,
} from './types.js';
/**
 * Result of a validation operation, providing detailed success/failure information
 */
export interface ValidationResult<T = any> {
  /** Whether validation was successful */
  success: boolean;
  /** Validated and transformed data (only present on success) */
  data?: T;
  /** Validation errors (only present on failure) */
  errors?: ValidationErrorDetail[];
  /** Performance information */
  timing?: {
    /** Validation duration in milliseconds */
    durationMs: number;
    /** Whether schema was served from cache */
    fromCache: boolean;
  };
}
/**
 * Detailed validation error information
 */
export interface ValidationErrorDetail {
  /** Field path where error occurred */
  path: string[];
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Field value that caused the error */
  value?: any;
  /** Expected value or format */
  expected?: string;
  /** Additional error context */
  context?: Record<string, any>;
}
/**
 * Validation options for customizing validation behavior
 */
export interface ValidationOptions {
  /** Whether to abort on first error or collect all errors */
  abortEarly?: boolean;
  /** Whether to transform values during validation */
  transform?: boolean;
  /** Whether to strip unknown fields */
  stripUnknown?: boolean;
  /** Custom error messages for specific fields */
  customMessages?: Record<string, string>;
  /** Context for conditional validations */
  context?: Record<string, any>;
}
/**
 * Advanced schema validator using Zod for robust validation with caching,
 * performance optimization, and detailed error reporting.
 */
export declare class ZodSchemaValidator {
  private static readonly CACHE_TTL_MS;
  private static readonly MAX_CACHE_SIZE;
  /** Schema cache for performance optimization */
  private readonly schemaCache;
  /** Performance metrics */
  private readonly metrics;
  /**
   * Validates tool input data against the provided schema
   */
  validateInput(
    input: ToolInput,
    schema: Record<string, ToolInputField>,
    _options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Validates tool configuration against the provided schema
   */
  validateConfig(
    config: ToolConfig,
    schema: Record<string, ToolConfigField>,
    _options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Validates complete tool schema including cross-field validations
   */
  validateToolSchema(
    data: {
      input: ToolInput;
      config: ToolConfig;
    },
    schema: ToolSchema,
    _options?: ValidationOptions
  ): Promise<ValidationResult>;
  /**
   * Builds a Zod schema from ToolInputField definitions
   */
  private buildInputSchema;
  /**
   * Builds a Zod schema from ToolConfigField definitions
   */
  private buildConfigSchema;
  /**
   * Builds a Zod schema for a single input field
   */
  private buildFieldSchema;
  /**
   * Builds a Zod schema for a single config field
   */
  private buildConfigFieldSchema;
  /**
   * Applies string format validation
   */
  private applyStringFormat;
  /**
   * Applies string transformations
   */
  private applyStringTransform;
  /**
   * Performs the actual validation using Zod
   */
  private performValidation;
  /**
   * Validates cross-field rules
   */
  private validateCrossFieldRules;
  /**
   * Evaluates a single cross-field rule
   */
  private evaluateCrossFieldRule;
  /**
   * Simple condition evaluator (for production, consider using a safer expression evaluator)
   */
  private evaluateCondition;
  /**
   * Gets a nested value from an object using dot notation
   */
  private getNestedValue;
  /**
   * Converts Zod errors to our standardized format
   */
  private convertZodErrors;
  /**
   * Cache management methods
   */
  private generateCacheKey;
  private getFromCache;
  private setCache;
  private cleanupCache;
  private hashObject;
  /**
   * Updates performance metrics
   */
  private updateMetrics;
  /**
   * Gets performance metrics
   */
  getMetrics(): {
    cacheHitRate: number;
    currentCacheSize: number;
    totalValidations: number;
    cacheHits: number;
    averageDurationMs: number;
    totalDurationMs: number;
  };
  /**
   * Clears all caches and resets metrics
   */
  reset(): void;
}
/**
 * Legacy compatibility layer for existing SchemaValidator API
 * @deprecated Use ZodSchemaValidator instead
 */
export declare class SchemaValidator {
  private static validator;
  /**
   * @deprecated Use ZodSchemaValidator.validateInput instead
   */
  static validateInput(
    input: ToolInput,
    schema: Record<string, ToolInputField>
  ): Promise<void>;
  /**
   * @deprecated Use ZodSchemaValidator.validateConfig instead
   */
  static validateConfig(
    config: ToolConfig,
    schema: Record<string, ToolConfigField>
  ): Promise<void>;
}
//# sourceMappingURL=validation.d.ts.map
