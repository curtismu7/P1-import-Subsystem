/**
 * @fileoverview Jest configuration for ESM support
 * 
 * This configuration enables Jest to work with ES modules and provides
 * proper support for the project's testing requirements.
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

export default {
  // Enable ESM support
  extensionsToTreatAsEsm: ['.jsx'],
  testEnvironment: 'node',
  
  // Transform configuration for ES modules
  transform: {
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: false
        }],
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-runtime'
      ]
    }]
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|whatwg-url|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|winston|winston-daily-rotate-file)/)'
  ],
  
  // Test matching patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.test.mjs',
    '**/test/**/*.test.jsx'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json'],
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.js'],
  
  // Test timeout
  testTimeout: 60000,
  
  // Verbose output
  verbose: true,
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:4000'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'server.js',
    'routes/**/*.js',
    'public/js/modules/**/*.js',
    'server/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test/**'
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
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Module name mapping for .js extensions
  moduleNameMapper: {
    // Handle ES module imports
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Global test setup
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module resolution
  moduleDirectories: ['node_modules'],
  
  // Test runner options
  runner: 'jest-runner',
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit
  forceExit: true
}; 