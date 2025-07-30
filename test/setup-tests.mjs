/**
 * Jest Test Setup File
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';

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

console.log('🧪 Test setup completed');