/**
 * Jest configuration for PingOne Import Tool
 * Supports both CommonJS and ES modules for comprehensive testing
 */

const config = {
  // Enable ES modules support (already configured in package.json)
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Node options for ES modules
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup-jest.js'],
  
  // Module name mapping for ES modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/public/js/$1',
    '^@modules/(.*)$': '<rootDir>/public/js/modules/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'public/js/modules/**/*.js',
    '!public/js/modules/**/*.test.js',
    '!public/js/bundle.js',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Timeout for tests
  testTimeout: 10000
};

export default config;
