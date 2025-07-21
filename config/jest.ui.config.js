/**
 * @fileoverview Jest configuration for UI tests
 * 
 * This configuration is specifically designed for UI tests using JSDOM.
 */

module.exports = {
  // Test environment for UI tests
  testEnvironment: 'jsdom',
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-transform-modules-commonjs',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-export-default-from',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object'
      ]
    }]
  },
  
  // Ignore patterns for transforms
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|whatwg-url|jsdom)/)'
  ],
  
  // Test matching patterns
  testMatch: [
    '**/test/ui/**/*.test.js',
    '**/test/ui/**/*.js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test setup
  setupFilesAfterEnv: ['<rootDir>/test/setup-ui.js'],
  
  // Handle module path collisions
  modulePathIgnorePatterns: [
    '<rootDir>/error-logging-subsystem/P1-import-Subsystem/'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:4000'
  },
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit
  forceExit: true
};