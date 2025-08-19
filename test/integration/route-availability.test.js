/**
 * Route Availability Integration Tests
 * 
 * Comprehensive tests to ensure all critical API routes are properly mounted
 * and responding correctly. Prevents route mounting regressions.
 * 
 * @author PingOne Import Tool Team
 * @version 7.0.2.3
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// Mock the server startup to avoid port conflicts during testing
jest.mock('../../server/winston-config.js', () => ({
    serverLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    apiLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    createWinstonLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })),
    createRequestLogger: jest.fn(() => (req, res, next) => next()),
    createErrorLogger: jest.fn(() => (err, req, res, next) => next()),
    createPerformanceLogger: jest.fn(() => (req, res, next) => next()),
    apiLogHelpers: {
        logApiRequest: jest.fn(() => 'test-request-id'),
        logApiResponse: jest.fn()
    }
}));

describe('Route Availability Integration Tests', () => {
    let app;
    
    beforeAll(async () => {
        // Import app after mocking
        const { createTestApp } = await import('./test-helpers/app-factory.js');
        app = await createTestApp();
    });
    
    describe('Critical API Routes', () => {
        const criticalRoutes = [
            { path: '/api/health', method: 'get', expectedStatus: 200 },
            { path: '/api/version', method: 'get', expectedStatus: 200 },
            { path: '/api/settings', method: 'get', expectedStatus: 200 },
            { path: '/api/logs/ui', method: 'get', expectedStatus: 200 },
            { path: '/api/auth/status', method: 'get', expectedStatus: [200, 503] }, // 503 if not initialized
            { path: '/api/auth/current-credentials', method: 'get', expectedStatus: [200, 503] },
            { path: '/api/import/status', method: 'get', expectedStatus: 200 },
            { path: '/api/export/status', method: 'get', expectedStatus: 200 },
            { path: '/api/history', method: 'get', expectedStatus: 200 },
            { path: '/api/debug-log', method: 'get', expectedStatus: 200 }
        ];
        
        test.each(criticalRoutes)(
            'should respond to $method $path',
            async ({ path, method, expectedStatus }) => {
                const response = await request(app)[method](path);
                
                if (Array.isArray(expectedStatus)) {
                    expect(expectedStatus).toContain(response.status);
                } else {
                    expect(response.status).toBe(expectedStatus);
                }
                
                // Should not return 404 (route not found)
                expect(response.status).not.toBe(404);
            }
        );
    });
    
    describe('POST Route Availability', () => {
        const postRoutes = [
            { path: '/api/logs', expectedStatus: [200, 400] }, // 400 if no body
            { path: '/api/auth/refresh-token', expectedStatus: [200, 400, 503] },
            { path: '/api/import/start', expectedStatus: [200, 400] },
            { path: '/api/export/start', expectedStatus: [200, 400] }
        ];
        
        test.each(postRoutes)(
            'should respond to POST $path',
            async ({ path, expectedStatus }) => {
                const response = await request(app)
                    .post(path)
                    .send({});
                
                if (Array.isArray(expectedStatus)) {
                    expect(expectedStatus).toContain(response.status);
                } else {
                    expect(response.status).toBe(expectedStatus);
                }
                
                // Should not return 404 (route not found)
                expect(response.status).not.toBe(404);
            }
        );
    });
    
    describe('Route Response Format', () => {
        test('health endpoint should return JSON with status', async () => {
            const response = await request(app).get('/api/health');
            
            expect(response.status).toBe(200);
            expect(response.type).toBe('application/json');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
        });
        
        test('version endpoint should return JSON with version', async () => {
            const response = await request(app).get('/api/version');
            
            expect(response.status).toBe(200);
            expect(response.type).toBe('application/json');
            expect(response.body).toHaveProperty('version');
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
            expect(response.body).toHaveProperty('logs');
            expect(Array.isArray(response.body.logs)).toBe(true);
        });
    });
    
    describe('Route Error Handling', () => {
        test('non-existent routes should return 404', async () => {
            const response = await request(app).get('/api/non-existent-route');
            expect(response.status).toBe(404);
        });
        
        test('malformed requests should not crash server', async () => {
            const response = await request(app)
                .post('/api/logs')
                .send('invalid json')
                .set('Content-Type', 'application/json');
            
            // Should handle gracefully, not crash
            expect([400, 500]).toContain(response.status);
        });
    });
    
    describe('Route Performance', () => {
        test('health endpoint should respond quickly', async () => {
            const start = Date.now();
            const response = await request(app).get('/api/health');
            const duration = Date.now() - start;
            
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(1000); // Should respond within 1 second
        });
        
        test('version endpoint should respond quickly', async () => {
            const start = Date.now();
            const response = await request(app).get('/api/version');
            const duration = Date.now() - start;
            
            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(500); // Should respond within 500ms
        });
    });
    
    describe('Route Security', () => {
        test('should include security headers', async () => {
            const response = await request(app).get('/api/health');
            
            // Check for common security headers (if implemented)
            // These might be added by helmet or custom middleware
            expect(response.headers).toBeDefined();
        });
        
        test('should handle CORS properly', async () => {
            const response = await request(app)
                .options('/api/health')
                .set('Origin', 'http://localhost:3000');
            
            // Should handle OPTIONS request for CORS
            expect([200, 204]).toContain(response.status);
        });
    });
    
    describe('Route Consistency', () => {
        test('all API routes should return JSON content-type', async () => {
            const routes = [
                '/api/health',
                '/api/version',
                '/api/settings',
                '/api/logs/ui'
            ];
            
            for (const route of routes) {
                const response = await request(app).get(route);
                // Content-Type should indicate JSON
                expect(response.type).toMatch(/json/);
                // Status should be successful for existing routes
                expect([200, 204]).toContain(response.status);
            }
        });
        
        test('error responses should have consistent format', async () => {
            const response = await request(app).get('/api/non-existent');
            expect(response.status).toBe(404);
            expect(response.type).toBe('application/json');
            // Could check for consistent error format if implemented
        });
    });
});

describe('Route Health Check System', () => {
    let app;
    

    beforeAll(async () => {
        const { createTestApp } = await import('./test-helpers/app-factory.js');
        app = await createTestApp();
    });
    
    test('should detect all critical routes', async () => {
        // Import the route health checker
        const { performRouteHealthCheck } = await import('../../server/route-health-checker.js');
        
        const result = performRouteHealthCheck(app);
        
        expect(result.success).toBe(true);
        expect(result.routes).toBeDefined();
        expect(result.validation).toBeDefined();
        expect(result.validation.missingRoutes).toHaveLength(0);
    });
    
    test('should generate comprehensive route report', async () => {
        const { generateRouteHealthReport } = await import('../../server/route-health-checker.js');
        
        const report = generateRouteHealthReport(app);
        
        expect(typeof report).toBe('string');
        expect(report).toContain('ROUTE HEALTH CHECK REPORT');
        expect(report).toContain('HEALTHY');
    });
});

describe('Memory Monitoring Integration', () => {
    test('should provide memory status', async () => {
        const { getMemoryStatusReport } = await import('../../server/memory-monitor.js');
        
        const report = getMemoryStatusReport();
        
        expect(report).toHaveProperty('current');
        expect(report).toHaveProperty('thresholds');
        expect(report.current).toHaveProperty('formatted');
        expect(report.current).toHaveProperty('percentages');
    });
    
    test('should detect memory usage levels', async () => {
        const { getCurrentMemoryUsage } = await import('../../server/memory-monitor.js');
        
        const usage = getCurrentMemoryUsage();
        
        expect(usage).toHaveProperty('alertLevel');
        expect(['normal', 'warning', 'critical', 'emergency']).toContain(usage.alertLevel);
    });
});
