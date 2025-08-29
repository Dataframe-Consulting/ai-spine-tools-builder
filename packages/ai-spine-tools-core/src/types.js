"use strict";
// Core type definitions for AI Spine tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionError = exports.ConfigurationError = exports.ValidationError = exports.ToolError = void 0;
// Error types
class ToolError extends Error {
    constructor(message, code = 'TOOL_ERROR', details) {
        super(message);
        this.name = 'ToolError';
        this.code = code;
        this.details = details;
    }
}
exports.ToolError = ToolError;
class ValidationError extends ToolError {
    constructor(message, field, value) {
        super(message, 'VALIDATION_ERROR', { field, value });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ConfigurationError extends ToolError {
    constructor(message, missingKeys) {
        super(message, 'CONFIGURATION_ERROR', { missingKeys });
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class ExecutionError extends ToolError {
    constructor(message, cause) {
        super(message, 'EXECUTION_ERROR', { cause: cause?.message });
        this.name = 'ExecutionError';
    }
}
exports.ExecutionError = ExecutionError;
//# sourceMappingURL=types.js.map