/**
 * Jest test setup for Email Tool Example
 * 
 * Configures test environment and provides common utilities
 */

// Increase timeout for email operations
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SENDGRID_API_KEY = 'SG.test-api-key';
process.env.DEFAULT_FROM_EMAIL = 'test@example.com';
process.env.DEFAULT_FROM_NAME = 'Test Sender';

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};