/**
 * Jest configuration for Bulletproof Tests
 * Specialized configuration for bulletproof system tests
 */

/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns - only bulletproof tests
  testMatch: [
    '**/test/unit/bulletproof-*.test.js',
    '**/test/integration/bulletproof-*.test.js',
    '**/test/bulletproof-*.test.mjs'
  ],
  
  // File extensions to test
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],
  
  // Transform settings - handle ES modules properly
  transform: {},
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)' 
  ],
  
  // Module name mapper for handling imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/public/js/modules/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@src/(.*)$': '<rootDir>/src/$1'
  },
  
  // NO setup files - bulletproof tests are self-contained
  // setupFilesAfterEnv: [],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output for bulletproof tests
  verbose: true,
  
  // Coverage settings for bulletproof tests
  collectCoverageFrom: [
    'src/client/utils/bulletproof-*.js',
    'src/shared/bulletproof-*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
