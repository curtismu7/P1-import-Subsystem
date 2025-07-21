/**
 * @fileoverview Jest configuration for integration tests
 * 
 * This configuration is specifically designed for integration tests that make
 * actual API calls to external services like PingOne.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test matching patterns for integration tests
  testMatch: [
    '**/test/integration/**/*.test.js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test timeout for API calls (30 seconds)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.js'],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Coverage settings (optional for integration tests)
  collectCoverage: false,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/test/global-setup-integration.js',
  globalTeardown: '<rootDir>/test/global-teardown-integration.js'
};