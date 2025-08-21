// Core type definitions for AI Spine tools

export interface ToolMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface ToolInputField {
  type: 'string' | 'number' | 'boolean' | 'date' | 'time' | 'array' | 'object';
  required: boolean;
  description?: string;
  default?: any;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: any[];
  items?: ToolInputField;
  properties?: Record<string, ToolInputField>;
}

export interface ToolConfigField {
  type: 'string' | 'number' | 'boolean' | 'key';
  required: boolean;
  description?: string;
  default?: any;
  secret?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface ToolSchema {
  input: Record<string, ToolInputField>;
  config: Record<string, ToolConfigField>;
}

export interface ToolInput {
  [key: string]: any;
}

export interface ToolConfig {
  [key: string]: any;
}

export interface ToolContext {
  execution_id: string;
  tool_id: string;
  timestamp: Date;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult {
  status: 'success' | 'error';
  data?: any;
  error_code?: string;
  error_message?: string;
  error_details?: any;
  execution_time_ms?: number;
  metadata?: Record<string, any>;
}

export interface ToolHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime_seconds: number;
  metadata: ToolMetadata;
  capabilities: string[];
  last_execution?: Date;
  error_rate_percent?: number;
  avg_response_time_ms?: number;
}

export interface ToolDefinition {
  metadata: ToolMetadata;
  schema: ToolSchema;
  execute: (
    input: ToolInput,
    config: ToolConfig,
    context: ToolContext
  ) => Promise<ToolExecutionResult>;
}

// AI Spine Platform API types
export interface AISpineExecuteRequest {
  tool_id: string;
  input_data: ToolInput;
  config?: ToolConfig;
  execution_id?: string;
  metadata?: Record<string, any>;
}

export interface AISpineExecuteResponse {
  execution_id: string;
  status: 'success' | 'error';
  output_data?: any;
  error_code?: string;
  error_message?: string;
  error_details?: any;
  execution_time_ms: number;
  timestamp: string;
}

export interface AISpineHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  tool_metadata: ToolMetadata;
  capabilities: string[];
  uptime_seconds: number;
  last_execution?: string;
  error_rate_percent?: number;
  avg_response_time_ms?: number;
}

// Error types
export class ToolError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'TOOL_ERROR', details?: any) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends ToolError {
  constructor(message: string, missingKeys?: string[]) {
    super(message, 'CONFIGURATION_ERROR', { missingKeys });
    this.name = 'ConfigurationError';
  }
}

export class ExecutionError extends ToolError {
  constructor(message: string, cause?: Error) {
    super(message, 'EXECUTION_ERROR', { cause: cause?.message });
    this.name = 'ExecutionError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = T & Partial<Pick<T, K>>;