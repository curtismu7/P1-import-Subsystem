/**
 * Jest configuration for PingOne Import Tool
 * Supports both CommonJS and ES modules for comprehensive testing
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Enable ES modules support (handled by package.json type: "module")
  
  // Node options for ES modules
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/public/js/bundle*.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Module name mapping for ES modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/public/js/$1',
    '^@modules/(.*)$': '<rootDir>/public/js/modules/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|whatwg-url|socket\\.io|socket\\.io-client)/)'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'public/js/modules/**/*.js',
    'src/**/*.js',
    '!public/js/modules/**/*.test.js',
    '!public/js/bundle*.js',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Verbose output
  verbose: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Timeout for tests
  testTimeout: 30000,
  
  // Handle open handles
  detectOpenHandles: true,
  forceExit: true
};
