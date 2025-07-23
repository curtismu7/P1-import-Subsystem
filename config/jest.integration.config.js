/**
 * Jest configuration for integration tests
 */

export default {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  testMatch: [
    '**/test/integration/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/integration/test-env.config.js'
  ],
  globalSetup: '<rootDir>/test/global-setup-integration.js',
  globalTeardown: '<rootDir>/test/global-teardown-integration.js',
  testTimeout: 60000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  transform: {
    '^.+\\.m?js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|whatwg-url|socket\\.io)/)'
  ],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'server/**/*.js',
    'auth-subsystem/**/*.js',
    'public/js/modules/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/logs/**'
  ],
  coverageDirectory: 'test/reports/integration-coverage',
  coverageReporters: ['text', 'lcov', 'html']
};