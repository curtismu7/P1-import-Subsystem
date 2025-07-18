/**
 * @fileoverview Test setup configuration for Jest with ESM support
 * 
 * This file configures the test environment for automated API testing
 * including server setup, mock configurations, and test utilities.
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4001'; // Use different port for testing
process.env.PINGONE_CLIENT_ID = 'test-client-id';
process.env.PINGONE_CLIENT_SECRET = 'test-client-secret';
process.env.PINGONE_ENVIRONMENT_ID = 'test-env-id';
process.env.PINGONE_REGION = 'NorthAmerica';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch globally for tests
global.fetch = jest.fn();

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop())
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = jest.fn(() => {
    const middleware = (req, res, next) => {
      // Check if this is a multipart request with file upload
      // This simulates real multer behavior where req.file is undefined if no file uploaded
      const contentType = req.headers['content-type'] || '';
      const hasFileUpload = contentType.includes('multipart/form-data') && 
                           (req.body && Object.keys(req.body).length > 0);
      
      if (hasFileUpload) {
        req.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          size: 1024,
          buffer: Buffer.from('test,data\n1,2\n3,4'),
          destination: './uploads/',
          filename: 'test.csv',
          path: './uploads/test.csv'
        };
      } else {
        // No file uploaded - req.file should be undefined
        req.file = undefined;
      }
      next();
    };
    middleware.single = jest.fn().mockReturnValue(middleware);
    middleware.array = jest.fn().mockReturnValue(middleware);
    middleware.fields = jest.fn().mockReturnValue(middleware);
    return middleware;
  });
  multer.memoryStorage = jest.fn(() => ({}));
  return multer;
});

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock rate limiting
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock session
jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock compression
jest.mock('compression', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock helmet
jest.mock('helmet', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock cors
jest.mock('cors', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock morgan
jest.mock('morgan', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9012-345678901234'),
  validate: jest.fn(() => true)
}));

// Mock crypto
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => Buffer.from('test-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash')
  }))
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock request
  createMockRequest: (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    method: 'GET',
    url: '/test',
    ...overrides
  }),

  // Helper to create mock response
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock next function
  createMockNext: () => jest.fn(),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create test data
  createTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  }),

  // Helper to create test population
  createTestPopulation: (overrides = {}) => ({
    id: 'test-population-id',
    name: 'Test Population',
    userCount: 0,
    ...overrides
  })
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test timeout
jest.setTimeout(30000);

// =============================
// TextEncoder/TextDecoder Polyfills
// =============================

// Polyfill TextEncoder and TextDecoder for Node.js
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill setImmediate for Node.js
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(() => callback(...args), 0);
  };
}

// =============================
// Browser API Mocks for Frontend Tests
// =============================

// Mock localStorage and sessionStorage
class StorageMock {
  constructor() { this.store = {}; }
  clear() { this.store = {}; }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = value.toString(); }
  removeItem(key) { delete this.store[key]; }
  key(i) { return Object.keys(this.store)[i] || null; }
  get length() { return Object.keys(this.store).length; }
}

global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

// Mock window and document
if (typeof window === 'undefined') {
  global.window = global;
}
if (typeof document === 'undefined') {
  global.document = {
    createElement: jest.fn(() => ({ style: {} })),
    getElementById: jest.fn(() => null),
    querySelector: jest.fn(() => null),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: {},
    head: {},
  };
}

global.navigator = {
  userAgent: 'node.js',
  language: 'en-US',
  languages: ['en-US', 'en'],
  platform: 'MacIntel',
  onLine: true,
};

// Mock fetch if not present
if (typeof fetch === 'undefined') {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }));
}

// Mock other common browser APIs
if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

if (typeof window.scrollTo === 'undefined') {
  window.scrollTo = jest.fn();
}

if (typeof window.alert === 'undefined') {
  window.alert = jest.fn();
}

if (typeof window.confirm === 'undefined') {
  window.confirm = jest.fn(() => true);
}

if (typeof window.open === 'undefined') {
  window.open = jest.fn();
}

if (typeof window.close === 'undefined') {
  window.close = jest.fn();
}
