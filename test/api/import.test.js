/**
 * @fileoverview Import API Tests
 * 
 * Tests for the import API endpoints and functionality
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Mock the server and models before importing them
const mockApp = {
  listen: jest.fn(),
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn()
};

// Mock the server.js export
jest.mock('../../server.js', () => ({
  __esModule: true,
  default: mockApp
}));

// Mock the file handler
jest.mock('../../public/js/modules/file-handler.js', () => ({
  __esModule: true,
  FileHandler: class MockFileHandler {
    constructor() {
      this.parseCSV = jest.fn();
      this.validateData = jest.fn();
    }
  }
}));

// Mock the logger
jest.mock('../../public/js/modules/file-logger.js', () => ({
  __esModule: true,
  FileLogger: class MockFileLogger {
    constructor() {
      this.addLog = jest.fn();
      this.getLogs = jest.fn();
    }
  }
}));

describe('Import API Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Mock the server startup
    const { default: startServer } = await import('../../server.js');
    app = mockApp;
    server = { close: jest.fn() };
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/import', () => {
    it('should handle file upload and return session ID', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.csv',
        buffer: Buffer.from('test,data\n1,2\n3,4'),
        mimetype: 'text/csv'
      };

      const response = await request(app)
        .post('/api/import')
        .attach('file', mockFile.buffer, 'test.csv')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if no file uploaded', async () => {
      const response = await request(app)
        .post('/api/import')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid CSV format', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.txt',
        buffer: Buffer.from('invalid,data'),
        mimetype: 'text/plain'
      };

      const response = await request(app)
        .post('/api/import')
        .attach('file', mockFile.buffer, 'test.txt')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/import/progress/:sessionId', () => {
    it('should establish SSE connection', async () => {
      const sessionId = uuidv4();
      
      const response = await request(app)
        .get(`/api/import/progress/${sessionId}`)
        .set('Accept', 'text/event-stream')
        .set('Cache-Control', 'no-cache');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });
  });
});
