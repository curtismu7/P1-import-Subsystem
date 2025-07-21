/**
 * Setup file for UI tests
 */

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-123';
process.env.PORT = '4000';

// Add TextEncoder and TextDecoder polyfills
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set timeout for tests
// Using setTimeout directly instead of jest.setTimeout
setTimeout(() => {}, 30000);

// Mock global objects that might be needed
global.console = {
  ...console,
  // Use simple mocks
  log: (...args) => {},
  error: (...args) => {},
  warn: (...args) => {},
  info: (...args) => {},
  debug: (...args) => {},
};