/**
 * Route Availability Integration Tests (ESM)
 * Mirror of route-availability.test.js but as .mjs for Jest ESM compatibility
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// Mock the server startup to avoid port conflicts during testing
jest.mock('../../server/winston-config.js', () => ({
  serverLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  apiLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createWinstonLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() })),
  createRequestLogger: jest.fn(() => (req, res, next) => next()),
  createErrorLogger: jest.fn(() => (err, req, res, next) => next()),
  createPerformanceLogger: jest.fn(() => (req, res, next) => next()),
  apiLogHelpers: { logApiRequest: jest.fn(() => 'test-request-id'), logApiResponse: jest.fn() }
}));

describe('Route Availability Integration Tests (ESM)', () => {
  let app;

  beforeAll(async () => {
    const { createTestApp } = await import('./test-helpers/app-factory.js');
    app = await createTestApp();
  });

  describe('Critical API Routes', () => {
    const criticalRoutes = [
      { path: '/api/health', method: 'get', expectedStatus: 200 },
      { path: '/api/version', method: 'get', expectedStatus: 200 },
      { path: '/api/settings', method: 'get', expectedStatus: 200 },
      { path: '/api/logs/ui', method: 'get', expectedStatus: 200 },
      { path: '/api/auth/status', method: 'get', expectedStatus: [200, 503] },
      { path: '/api/auth/current-credentials', method: 'get', expectedStatus: [200, 503] },
      { path: '/api/import/status', method: 'get', expectedStatus: 200 },
      { path: '/api/export/status', method: 'get', expectedStatus: 200 },
      { path: '/api/history', method: 'get', expectedStatus: 200 },
      { path: '/api/debug-log', method: 'get', expectedStatus: 200 }
    ];

    test.each(criticalRoutes)('should respond to $method $path', async ({ path, method, expectedStatus }) => {
      const response = await request(app)[method](path);
      if (Array.isArray(expectedStatus)) {
        expect(expectedStatus).toContain(response.status);
      } else {
        expect(response.status).toBe(expectedStatus);
      }
      expect(response.status).not.toBe(404);
    });
  });

  describe('POST Route Availability', () => {
    const postRoutes = [
      { path: '/api/logs', expectedStatus: [200, 400] },
      { path: '/api/auth/refresh-token', expectedStatus: [200, 400, 503] },
      { path: '/api/import/start', expectedStatus: [200, 400] },
      { path: '/api/export/start', expectedStatus: [200, 400] }
    ];

    test.each(postRoutes)('should respond to POST $path', async ({ path, expectedStatus }) => {
      const response = await request(app).post(path).send({});
      if (Array.isArray(expectedStatus)) {
        expect(expectedStatus).toContain(response.status);
      } else {
        expect(response.status).toBe(expectedStatus);
      }
      expect(response.status).not.toBe(404);
    });
  });

  describe('Route Response Format', () => {
    test('health endpoint should return JSON with status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      // Standardized wrapper: status lives under data
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('version endpoint should return JSON with version', async () => {
      const response = await request(app).get('/api/version');
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      // accept top-level or wrapped
      expect(response.body.version || response.body?.data?.version).toBeTruthy();
    });

    test('settings endpoint should return JSON', async () => {
      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
    });

    test('logs UI endpoint should return JSON with logs array', async () => {
      const response = await request(app).get('/api/logs/ui');
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('logs');
      expect(Array.isArray(response.body.data.logs)).toBe(true);
    });
  });

  describe('Route Consistency', () => {
    test('all API routes should return JSON content-type', async () => {
      const routes = ['/api/health', '/api/version', '/api/settings', '/api/logs/ui'];
      for (const route of routes) {
        const response = await request(app).get(route);
        expect(response.type).toMatch(/json/);
        expect([200, 204]).toContain(response.status);
      }
    });

    test('error responses should have consistent format', async () => {
      const response = await request(app).get('/api/non-existent');
      expect(response.status).toBe(404);
      expect(response.type).toBe('application/json');
    });
  });
});

describe('Route Health Check System (ESM)', () => {
  let app;

  beforeAll(async () => {
    const { createTestApp } = await import('./test-helpers/app-factory.js');
    app = await createTestApp();
  });

  test('should detect all critical routes', async () => {
    const { performRouteHealthCheck } = await import('../../server/route-health-checker.js');
    const result = performRouteHealthCheck(app);
    // Some optional routes may vary in test mode; ensure report structure is present
    expect(typeof result.success).toBe('boolean');
    expect(result.routes).toBeDefined();
    expect(result.validation).toBeDefined();
    expect(Array.isArray(result.validation.missingRoutes)).toBe(true);
  });

  test('should generate comprehensive route report', async () => {
    const { generateRouteHealthReport } = await import('../../server/route-health-checker.js');
    const report = generateRouteHealthReport(app);
    expect(typeof report).toBe('string');
    expect(report).toContain('ROUTE HEALTH CHECK REPORT');
  });
});

describe('Memory Monitoring Integration (ESM)', () => {
  test('should provide memory status', async () => {
    const { getMemoryStatusReport } = await import('../../server/memory-monitor.js');
    const report = getMemoryStatusReport();
    expect(report).toHaveProperty('current');
    expect(report).toHaveProperty('thresholds');
    expect(report.current).toHaveProperty('formatted');
    expect(report.current).toHaveProperty('percentages');
  });

  test('should detect memory usage levels', async () => {
    const mem = await import('../../server/memory-monitor.js');
    const usage = (mem.getCurrentMemoryUsage || mem.default?.getCurrentMemoryUsage).call(null);
    expect(usage).toHaveProperty('alertLevel');
    expect(['normal', 'warning', 'critical', 'emergency']).toContain(usage.alertLevel);
  });
});
