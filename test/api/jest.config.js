export default {
  testEnvironment: 'node',
  testMatch: ['**/test/api/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/test/api/setup.js'],
  verbose: true,
  testTimeout: 30000
};