/**
 * @fileoverview Test setup configuration for Jest + Supertest
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
  error: jest.fn(),
};

// Mock file system operations
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('test content'),
    mkdir: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = () => {
    return {
      single: jest.fn().mockReturnValue((req, res, next) => {
        req.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: Buffer.from('username,email,firstname,lastname\ntest@example.com,test@example.com,Test,User'),
          size: 100,
        };
        next();
      }),
    };
  };
  multer.memoryStorage = jest.fn(() => ({}));
  return multer;
});

// Mock fetch for external API calls
global.fetch = jest.fn();

// Test utilities
global.testUtils = {
  // Create mock request with authentication
  createAuthenticatedRequest: (app, token = 'test-token') => {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  },

  // Create mock file upload request
  createFileUploadRequest: (app, filename = 'test.csv', content = 'username,email\ntest@example.com,test@example.com') => {
    return {
      file: {
        fieldname: 'file',
        originalname: filename,
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer: Buffer.from(content),
        size: content.length,
      },
    };
  },

  // Mock PingOne API responses
  mockPingOneResponses: () => {
    // Mock token response
    fetch.mockImplementation((url) => {
      if (url.includes('/as/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        });
      }
      
      if (url.includes('/populations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'pop-1',
              name: 'Test Population',
              userCount: 10,
            },
          ]),
        });
      }
      
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            _embedded: {
              users: [],
            },
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  },

  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    fetch.mockClear();
  },
};

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests unless explicitly needed
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
}); 