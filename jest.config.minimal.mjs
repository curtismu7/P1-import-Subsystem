/**
 * Minimal Jest configuration for testing with ES modules
 */

export default {
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.test.mjs',
    '**/test/**/*.spec.mjs',
    '**/__tests__/**/*.mjs',
  ],
  moduleFileExtensions: ['js', 'mjs', 'json', 'node'],
  transform: {
    '^.+\\.m?js$': ['babel-jest', { configFile: './babel.config.mjs' }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.m?js$': '$1'
  },
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
