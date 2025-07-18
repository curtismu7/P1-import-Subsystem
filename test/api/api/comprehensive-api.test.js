/**
 * @fileoverview Comprehensive API route testing suite
 * 
 * Tests all REST API routes with valid/invalid inputs, authentication scenarios,
 * edge cases, and error handling. Uses Jest + Supertest for reliable testing.
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import request from 'supertest';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the main server app
let app;
let server;

/**
 * Test suite for comprehensive API route testing
 */
describe('API Routes - Comprehensive Testing', () => {
  
  beforeAll(async () => {
    // Import and setup the server
    const serverModule = await import('../../server.js');
    app = serverModule.default || serverModule.app;
    
    // Mock token manager
    app.set('tokenManager', {
      getAccessToken: jest.fn().mockResolvedValue('test-access-token'),
      refreshToken: jest.fn().mockResolvedValue('new-access-token'),
      isTokenValid: jest.fn().mockReturnValue(true),
    });
    
    // Mock import sessions
    app.set('importSessions', new Map());
    
    // Mock feature flags
    app.set('featureFlags', {
      isFeatureEnabled: jest.fn().mockReturnValue(false),
      setFeatureFlag: jest.fn().mockResolvedValue(true),
      getAllFeatureFlags: jest.fn().mockReturnValue({ A: false, B: false, C: false }),
      resetFeatureFlags: jest.fn().mockResolvedValue(true),
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  beforeEach(() => {
    testUtils.resetMocks();
    testUtils.mockPingOneResponses();
  });

  afterEach(() => {
    testUtils.resetMocks();
  });

  // ============================================================================
  // HEALTH CHECK ROUTES
  // ============================================================================

  describe('Health Check Routes', () => {
    
    it('GET /api/health - should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toHaveProperty('server', 'ok');
      expect(response.body.details).toHaveProperty('timestamp');
      expect(response.body.details).toHaveProperty('uptime');
      expect(response.body.details).toHaveProperty('memory');
      expect(response.body.details).toHaveProperty('checks');
    });

    it('GET /api/health - should handle rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(210).fill().map(() => 
        request(app).get('/api/health')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FEATURE FLAGS ROUTES
  // ============================================================================

  describe('Feature Flags Routes', () => {
    
    it('GET /api/feature-flags - should return all feature flags', async () => {
      const response = await request(app)
        .get('/api/feature-flags')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('flags');
      expect(typeof response.body.flags).toBe('object');
    });

    it('POST /api/feature-flags/:flag - should enable feature flag', async () => {
      const response = await request(app)
        .post('/api/feature-flags/A')
        .send({ enabled: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/feature-flags/:flag - should disable feature flag', async () => {
      const response = await request(app)
        .post('/api/feature-flags/B')
        .send({ enabled: false })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('POST /api/feature-flags/:flag - should handle invalid flag name', async () => {
      const response = await request(app)
        .post('/api/feature-flags/invalid-flag')
        .send({ enabled: true })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/feature-flags/reset - should reset all feature flags', async () => {
      const response = await request(app)
        .post('/api/feature-flags/reset')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ============================================================================
  // IMPORT ROUTES
  // ============================================================================

  describe('Import Routes', () => {
    
    it('POST /api/import - should handle valid CSV file upload', async () => {
      const csvContent = 'username,email,firstname,lastname\ntest@example.com,test@example.com,Test,User';
      
      const response = await request(app)
        .post('/api/import')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/import - should handle missing file', async () => {
      const response = await request(app)
        .post('/api/import')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/import - should handle invalid CSV format', async () => {
      const invalidContent = 'invalid,csv,format\nno,proper,structure';
      
      const response = await request(app)
        .post('/api/import')
        .attach('file', Buffer.from(invalidContent), 'invalid.csv')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/import - should handle large file size', async () => {
      const largeContent = 'username,email\n' + 'test@example.com,test@example.com\n'.repeat(10000);
      
      const response = await request(app)
        .post('/api/import')
        .attach('file', Buffer.from(largeContent), 'large.csv')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population')
        .expect(413);

      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/import/progress/:sessionId - should return progress for valid session', async () => {
      // First create an import session
      const csvContent = 'username,email\ntest@example.com,test@example.com';
      const importResponse = await request(app)
        .post('/api/import')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population');

      const sessionId = importResponse.body.sessionId;
      
      const response = await request(app)
        .get(`/api/import/progress/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('progress');
    });

    it('GET /api/import/progress/:sessionId - should handle invalid session ID', async () => {
      const response = await request(app)
        .get('/api/import/progress/invalid-session-id')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/import/resolve-invalid-population - should handle population resolution', async () => {
      const response = await request(app)
        .post('/api/import/resolve-invalid-population')
        .send({
          populationId: 'test-population-id',
          populationName: 'Test Population',
          action: 'create'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  // ============================================================================
  // EXPORT ROUTES
  // ============================================================================

  describe('Export Routes', () => {
    
    it('POST /api/export-users - should export users with valid parameters', async () => {
      const response = await request(app)
        .post('/api/export-users')
        .send({
          populationId: 'test-population-id',
          format: 'json',
          includeDisabled: true
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('POST /api/export-users - should handle missing population ID', async () => {
      const response = await request(app)
        .post('/api/export-users')
        .send({
          format: 'json',
          includeDisabled: true
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/export-users - should handle invalid format', async () => {
      const response = await request(app)
        .post('/api/export-users')
        .send({
          populationId: 'test-population-id',
          format: 'invalid-format',
          includeDisabled: true
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // MODIFY ROUTES
  // ============================================================================

  describe('Modify Routes', () => {
    
    it('POST /api/modify - should handle valid modification file', async () => {
      const csvContent = 'username,email,action\ntest@example.com,test@example.com,update';
      
      const response = await request(app)
        .post('/api/modify')
        .attach('file', Buffer.from(csvContent), 'modify.csv')
        .field('populationId', 'test-population-id')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessionId');
    });

    it('POST /api/modify - should handle missing file', async () => {
      const response = await request(app)
        .post('/api/modify')
        .field('populationId', 'test-population-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/modify - should handle invalid modification format', async () => {
      const invalidContent = 'invalid,modification,format';
      
      const response = await request(app)
        .post('/api/modify')
        .attach('file', Buffer.from(invalidContent), 'invalid.csv')
        .field('populationId', 'test-population-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // PINGONE API ROUTES
  // ============================================================================

  describe('PingOne API Routes', () => {
    
    it('GET /api/pingone/populations - should return populations list', async () => {
      const response = await request(app)
        .get('/api/pingone/populations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('POST /api/pingone/get-token - should return access token', async () => {
      const response = await request(app)
        .post('/api/pingone/get-token')
        .send({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          environmentId: 'test-env-id'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
    });

    it('POST /api/pingone/get-token - should handle invalid credentials', async () => {
      const response = await request(app)
        .post('/api/pingone/get-token')
        .send({
          clientId: 'invalid-client-id',
          clientSecret: 'invalid-client-secret',
          environmentId: 'invalid-env-id'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // SETTINGS ROUTES
  // ============================================================================

  describe('Settings Routes', () => {
    
    it('GET /api/settings - should return current settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('clientId');
      expect(response.body.data).toHaveProperty('environmentId');
      expect(response.body.data).toHaveProperty('region');
    });

    it('POST /api/settings - should update settings', async () => {
      const newSettings = {
        clientId: 'new-client-id',
        environmentId: 'new-env-id',
        region: 'NorthAmerica'
      };

      const response = await request(app)
        .post('/api/settings')
        .send(newSettings)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/settings - should handle invalid settings', async () => {
      const invalidSettings = {
        clientId: '', // Invalid empty client ID
        environmentId: 'invalid-env-id',
        region: 'InvalidRegion'
      };

      const response = await request(app)
        .post('/api/settings')
        .send(invalidSettings)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('PUT /api/settings - should update specific settings', async () => {
      const updateData = {
        clientId: 'updated-client-id'
      };

      const response = await request(app)
        .put('/api/settings')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ============================================================================
  // LOGS ROUTES
  // ============================================================================

  describe('Logs Routes', () => {
    
    it('GET /api/logs - should return logs', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('POST /api/logs/ui - should create UI log entry', async () => {
      const logData = {
        level: 'info',
        message: 'Test log message',
        details: { test: 'data' }
      };

      const response = await request(app)
        .post('/api/logs/ui')
        .send(logData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('id');
    });

    it('POST /api/logs/error - should create error log entry', async () => {
      const errorData = {
        level: 'error',
        message: 'Test error message',
        error: new Error('Test error').stack
      };

      const response = await request(app)
        .post('/api/logs/error')
        .send(errorData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('POST /api/logs/info - should create info log entry', async () => {
      const infoData = {
        level: 'info',
        message: 'Test info message',
        details: { info: 'data' }
      };

      const response = await request(app)
        .post('/api/logs/info')
        .send(infoData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('POST /api/logs/warning - should create warning log entry', async () => {
      const warningData = {
        level: 'warning',
        message: 'Test warning message',
        details: { warning: 'data' }
      };

      const response = await request(app)
        .post('/api/logs/warning')
        .send(warningData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('DELETE /api/logs - should clear logs', async () => {
      const response = await request(app)
        .delete('/api/logs')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('GET /api/logs/disk - should return disk logs', async () => {
      const response = await request(app)
        .get('/api/logs/disk')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('logs');
    });

    it('POST /api/logs/disk - should write disk log', async () => {
      const logData = {
        level: 'info',
        message: 'Test disk log',
        details: { disk: 'data' }
      };

      const response = await request(app)
        .post('/api/logs/disk')
        .send(logData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  // ============================================================================
  // AUTHENTICATION & SECURITY TESTS
  // ============================================================================

  describe('Authentication & Security', () => {
    
    it('should handle missing authentication gracefully', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200); // Should still work as no auth required

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle malformed authentication headers', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'InvalidFormat token')
        .expect(200); // Should still work as no auth required

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle rate limiting on repeated requests', async () => {
      const requests = Array(160).fill().map(() => 
        request(app).get('/api/health')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/settings')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/export-users')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid file types', async () => {
      const response = await request(app)
        .post('/api/import')
        .attach('file', Buffer.from('not a csv'), 'test.txt')
        .field('populationId', 'test-population-id')
        .field('populationName', 'Test Population')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // PERFORMANCE & LOAD TESTS
  // ============================================================================

  describe('Performance & Load Tests', () => {
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill().map(() => 
        request(app).get('/api/health')
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large payloads gracefully', async () => {
      const largePayload = {
        data: 'x'.repeat(10000), // 10KB payload
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/api/logs/ui')
        .send(largePayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
}); 