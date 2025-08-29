"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolUtils = void 0;
const types_1 = require("./types");
class ToolUtils {
    /**
     * Creates a successful tool execution result
     */
    static success(data, metadata) {
        return {
            status: 'success',
            data,
            metadata: metadata ? { custom: metadata } : undefined,
        };
    }
    /**
     * Creates an error tool execution result
     */
    static error(message, code = 'TOOL_ERROR', details) {
        return {
            status: 'error',
            error: {
                code,
                message,
                type: 'execution_error',
                details,
            },
        };
    }
    /**
     * Creates an error result from a ToolError instance
     */
    static errorFromException(error) {
        return {
            status: 'error',
            error: {
                code: error.code,
                message: error.message,
                type: 'execution_error',
                details: error.details,
            },
        };
    }
    /**
     * Safely executes a function and returns a tool result
     */
    static async safeExecute(fn) {
        const startTime = Date.now();
        const startedAt = new Date().toISOString();
        try {
            const result = await fn();
            const executionTime = Date.now() - startTime;
            const completedAt = new Date().toISOString();
            return {
                status: 'success',
                data: result,
                timing: {
                    executionTimeMs: executionTime,
                    startedAt,
                    completedAt,
                },
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const completedAt = new Date().toISOString();
            if (error instanceof types_1.ToolError) {
                return {
                    ...this.errorFromException(error),
                    timing: {
                        executionTimeMs: executionTime,
                        startedAt,
                        completedAt,
                    },
                };
            }
            return {
                status: 'error',
                error: {
                    code: 'UNEXPECTED_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                    type: 'execution_error',
                },
                timing: {
                    executionTimeMs: executionTime,
                    startedAt,
                    completedAt,
                },
            };
        }
    }
    /**
     * Generates a unique execution ID
     */
    static generateExecutionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `exec_${timestamp}_${random}`;
    }
    /**
     * Validates that a value is not null or undefined
     */
    static required(value, fieldName) {
        if (value === null || value === undefined) {
            throw new Error(`Required field '${fieldName}' is missing`);
        }
        return value;
    }
    /**
     * Deep clones an object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    /**
     * Sanitizes configuration by removing secret fields for logging
     */
    static sanitizeConfig(config, secretFields = []) {
        const sanitized = { ...config };
        // Default secret field patterns
        const defaultSecretPatterns = [
            /api[_-]?key/i,
            /secret/i,
            /token/i,
            /password/i,
            /private[_-]?key/i,
        ];
        for (const key of Object.keys(sanitized)) {
            const isSecret = secretFields.includes(key) ||
                defaultSecretPatterns.some(pattern => pattern.test(key));
            if (isSecret && sanitized[key]) {
                sanitized[key] = '***REDACTED***';
            }
        }
        return sanitized;
    }
    /**
     * Formats error messages for better readability
     */
    static formatErrorMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        try {
            return JSON.stringify(error);
        }
        catch {
            return String(error);
        }
    }
    /**
     * Checks if a URL is valid
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Debounces a function
     */
    static debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    /**
     * Creates a timeout promise that rejects after the specified time
     */
    static timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)),
        ]);
    }
    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, options = {}) {
        const { attempts = 3, delay = 1000, backoff = 2, shouldRetry = () => true, } = options;
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === attempts || !shouldRetry(error)) {
                    throw error;
                }
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        throw lastError;
    }
}
exports.ToolUtils = ToolUtils;
//# sourceMappingURL=utils.js.map