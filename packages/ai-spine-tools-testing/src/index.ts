// Test client for integration testing
export { AISpineTestClient, TestClientOptions, TestExecutionResult } from './test-client';

// Enhanced test helpers for comprehensive testing
export {
  // Core testing functions
  testTool,
  testToolDirect,
  testToolHealth,
  
  // Test data generation
  generateTestData,
  generateInvalidTestData,
  generateConfigTestData,
  
  // Test scenario management
  createTestScenarios,
  
  // Validation and assertions
  validateToolResponse,
  toolAssertions,
  
  // Advanced testing utilities
  MockManager,
  PerformanceTester,
  TestServer,
  TestSuiteRunner,
  
  // Types and interfaces
  TestToolOptions,
  TestDataGenerationOptions,
  TestScenariosOptions,
  TestScenario,
  InvalidDataType,
} from './test-helpers';

// Re-export core types for convenience
export * from '@ai-spine/tools-core';