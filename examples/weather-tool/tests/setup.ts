/**
 * Jest test setup for Weather Tool Example
 * 
 * Configures test environment and provides common utilities
 */

// Increase timeout for API calls
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENWEATHER_API_KEY = 'test-api-key';

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};