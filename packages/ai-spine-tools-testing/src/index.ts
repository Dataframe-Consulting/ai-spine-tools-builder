// Test client for integration testing
export { AISpineTestClient, TestClientOptions, TestExecutionResult } from './test-client';

// Test helpers for unit testing
export {
  testTool,
  testToolHealth,
  generateTestData,
  generateInvalidTestData,
  generateConfigTestData,
  createTestScenarios,
  toolAssertions,
} from './test-helpers';

// Re-export core types for convenience
export * from '@ai-spine/tools-core';