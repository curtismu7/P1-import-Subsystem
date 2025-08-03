/**
 * Jest configuration specifically for UI Manager tests
 */

/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns for this specific test
  testMatch: [
    '**/test/unit/ui-manager-core.test.mjs'
  ],
  
  // File extensions to test
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],
  
  // Transform settings for ESM
  transform: {},
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['../../test/setup-tests.cjs'],
  
  // Override specific settings for module mocking
  moduleNameMapper: {
    '../../public/js/modules/utils/safe-dom.js': '<rootDir>/mocks/safe-dom.mock.js'
  },
  
  // Root directory
  rootDir: '.'
}
