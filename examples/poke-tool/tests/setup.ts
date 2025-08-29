// Jest setup file for common test configuration

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console.log during tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
global.testUtils = {
  // Helper to create valid input data
  createValidInput: (overrides = {}) => ({
    input_data: {
      message: 'Test message',
      count: 1,
      uppercase: false,
      ...overrides,
    },
  }),

  // Helper to create invalid input data
  createInvalidInput: (invalidField: string, invalidValue: any) => {
    const input = global.testUtils.createValidInput();
    input.input_data[invalidField] = invalidValue;
    return input;
  },

  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Type definitions for global test utilities
declare global {
  namespace globalThis {
    var testUtils: {
      createValidInput: (overrides?: any) => any;
      createInvalidInput: (invalidField: string, invalidValue: any) => any;
      wait: (ms: number) => Promise<void>;
    };
  }
}
