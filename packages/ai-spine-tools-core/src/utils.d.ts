import { ToolExecutionResult, ToolError } from './types';
export declare class ToolUtils {
  /**
   * Creates a successful tool execution result
   */
  static success(
    data: any,
    metadata?: Record<string, any>
  ): ToolExecutionResult;
  /**
   * Creates an error tool execution result
   */
  static error(
    message: string,
    code?: string,
    details?: any
  ): ToolExecutionResult;
  /**
   * Creates an error result from a ToolError instance
   */
  static errorFromException(error: ToolError): ToolExecutionResult;
  /**
   * Safely executes a function and returns a tool result
   */
  static safeExecute<T>(fn: () => Promise<T>): Promise<ToolExecutionResult>;
  /**
   * Generates a unique execution ID
   */
  static generateExecutionId(): string;
  /**
   * Validates that a value is not null or undefined
   */
  static required<T>(value: T | null | undefined, fieldName: string): T;
  /**
   * Deep clones an object
   */
  static deepClone<T>(obj: T): T;
  /**
   * Sanitizes configuration by removing secret fields for logging
   */
  static sanitizeConfig(
    config: Record<string, any>,
    secretFields?: string[]
  ): Record<string, any>;
  /**
   * Formats error messages for better readability
   */
  static formatErrorMessage(error: unknown): string;
  /**
   * Checks if a URL is valid
   */
  static isValidUrl(url: string): boolean;
  /**
   * Debounces a function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void;
  /**
   * Creates a timeout promise that rejects after the specified time
   */
  static timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
  /**
   * Retry function with exponential backoff
   */
  static retry<T>(
    fn: () => Promise<T>,
    options?: {
      attempts?: number;
      delay?: number;
      backoff?: number;
      shouldRetry?: (error: any) => boolean;
    }
  ): Promise<T>;
}
//# sourceMappingURL=utils.d.ts.map
