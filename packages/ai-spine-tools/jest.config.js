/**
 * Jest configuration for @ai-spine/tools package
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
