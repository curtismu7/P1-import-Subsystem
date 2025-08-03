/**
 * Jest configuration for PingOne Import Tool
 * ES Module configuration for comprehensive testing
 */

/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.mjs',
    '**/test/**/*.spec.mjs',
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
    '**/__tests__/**/*.mjs',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).mjs'
  ],
  
  // File extensions to test
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],
  
  // Transform settings for ESM
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
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.cjs'],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true
};