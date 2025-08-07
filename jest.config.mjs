/**
 * Jest configuration for PingOne Import Tool
 * ES Module configuration for comprehensive testing
 * Version: 7.0.2.4
 */

/** @type {import('jest').Config} */
export default {

  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.{js,mjs}',
    '**/test/**/*.spec.{js,mjs}',
    '**/__tests__/**/*.{js,mjs}',
    '**/?(*.)+(spec|test).{js,mjs}'
  ],



  // No transform for pure JS/ESM (uncomment if using Babel)
  transform: {},

  
  // File extensions to test
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],

  // Transform settings for ESM
  // transform: {
  //   // Transform JS files with babel-jest
  //   '^.+\\.(js|mjs)$': ['babel-jest', { configFile: './babel.config.mjs' }]
  // },

  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel|regenerator-runtime|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],
  
  // Module name mapper for path aliases
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/$1',
  //   '^@server/(.*)$': '<rootDir>/server/$1',
  //   '^@client/(.*)$': '<rootDir>/public/$1',
  //   '^@utils/(.*)$': '<rootDir>/utils/$1',
  //   '^@test/(.*)$': '<rootDir>/test/$1',
  //   '^@routes/(.*)$': '<rootDir>/routes/$1',
  //   '^@modules/(.*)$': '<rootDir>/public/js/modules/$1',
  //   '^@src/(.*)$': '<rootDir>/src/$1',
  //   '^(\\.{1,2}/.*)\\.js$': '$1'
  // },
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/$1',
  //   '^@server/(.*)$': '<rootDir>/server/$1',
  //   '^@client/(.*)$': '<rootDir>/public/$1',
  //   '^@utils/(.*)$': '<rootDir>/utils/$1',
  //   '^@test/(.*)$': '<rootDir>/test/$1',
  //   '^@routes/(.*)$': '<rootDir>/routes/$1',
  //   '^@modules/(.*)$': '<rootDir>/public/js/modules/$1',
  //   '^@src/(.*)$': '<rootDir>/src/$1',
  //   '^(\\.{1,2}/.*)\\.js$': '$1'
  // },
  
  // Setup files - use only the CommonJS setup file for now
  setupFilesAfterEnv: [
    '<rootDir>/test/setup-tests.cjs'
  ],
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Reporters for test results
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: 'true'
    }]
  ],
  
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true
};