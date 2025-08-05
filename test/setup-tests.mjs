/**
 * Jest Test Setup File (ESM Version)
 * Global test configuration and utilities for ES modules
 * Version: 7.0.2.4
 */

// Import Jest globals explicitly for ESM compatibility
import { jest } from '@jest/globals';

// Polyfill setImmediate for Node.js compatibility
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Polyfill TextEncoder/TextDecoder for Node.js v22+ compatibility with jsdom
// In ESM context, we use the global versions if available
if (typeof global.TextEncoder === 'undefined' && typeof TextEncoder !== 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined' && typeof TextDecoder !== 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

// Store original methods for restoration
global.originalConsole = originalConsole;

// Mock fetch for tests
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock WebSocket for tests
if (!global.WebSocket) {
  global.WebSocket = jest.fn();
}

// Mock localStorage
if (!global.localStorage) {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
}

// Mock sessionStorage
if (!global.sessionStorage) {
  global.sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
}

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.TEST_MODE = 'true';

console.log('🧪 ESM Test setup completed');

// Export for potential imports in test files
export { jest };