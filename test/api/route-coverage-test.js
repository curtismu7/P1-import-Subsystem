/**
 * @fileoverview Route Coverage Testing Suite
 * 
 * This test suite systematically validates that all documented routes exist
 * and are functioning properly. It ensures complete route coverage and
 * identifies any missing or broken endpoints.
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import request from 'supertest';
import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';

// Route definitions from documentation
const ROUTE_COVERAGE = {
    // Health & Status Routes
    'GET /api/health': {
        description: 'Health check endpoint',
        expectedStatus: 200,
        requiredFields: ['status', 'timestamp', 'uptime', 'checks']
    },

    // Authentication & Token Routes
    'GET /api/debug/token': {
        description: 'Debug token information',
        expectedStatus: 200,
        requiredFields: ['tokenLength', 'isValidJWT', 'environment']
    },
    'GET /api/debug/settings': {
        description: 'Debug settings configuration',
        expectedStatus: 200,
        requiredFields: ['environment']
    },

    // PingOne API Routes
    'GET /api/pingone/populations': {
        description: 'Get PingOne populations',
        expectedStatus: 200,
        requiredFields: [] // Array response
    },
    'GET /api/pingone/token': {
        description: 'Get current PingOne token',
        expectedStatus: 200,
        requiredFields: ['token']
    },
    'POST /api/pingone/token': {
        description: 'Refresh PingOne token',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/pingone/get-token': {
        description: 'Get new PingOne token',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/pingone/refresh-token': {
        description: 'Refresh existing token',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/pingone/test-connection': {
        description: 'Test PingOne connection',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Import Operations Routes
    'POST /api/import': {
        description: 'Upload CSV and start import',
        expectedStatus: 200,
        requiredFields: ['success', 'sessionId'],
        requiresFile: true
    },
    'GET /api/import/progress/:sessionId': {
        description: 'SSE endpoint for import progress',
        expectedStatus: 200,
        requiredFields: [],
        isSSE: true
    },
    'POST /api/import/resolve-invalid-population': {
        description: 'Resolve population conflicts',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Export Operations Routes
    'POST /api/export-users': {
        description: 'Export users from population',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Modify Operations Routes
    'POST /api/modify': {
        description: 'Modify existing users',
        expectedStatus: 200,
        requiredFields: ['success'],
        requiresFile: true
    },

    // Logging Routes
    'GET /api/logs': {
        description: 'Get all application logs',
        expectedStatus: 200,
        requiredFields: []
    },
    'POST /api/logs/ui': {
        description: 'Create UI log entry',
        expectedStatus: 200,
        requiredFields: ['success', 'id']
    },
    'GET /api/logs/ui': {
        description: 'Get UI-specific logs',
        expectedStatus: 200,
        requiredFields: []
    },
    'DELETE /api/logs/ui': {
        description: 'Clear UI logs',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/logs/warning': {
        description: 'Create warning log',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/logs/error': {
        description: 'Create error log',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/logs/info': {
        description: 'Create info log',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'GET /api/logs/disk': {
        description: 'Get disk-based logs',
        expectedStatus: 200,
        requiredFields: []
    },
    'POST /api/logs/disk': {
        description: 'Write log to disk',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'DELETE /api/logs': {
        description: 'Clear all logs',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Settings Routes
    'GET /api/settings': {
        description: 'Get current settings',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/settings': {
        description: 'Create new settings',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'PUT /api/settings': {
        description: 'Update existing settings',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Feature Flags Routes
    'GET /api/feature-flags': {
        description: 'Get all feature flags',
        expectedStatus: 200,
        requiredFields: []
    },
    'POST /api/feature-flags/:flag': {
        description: 'Update feature flag',
        expectedStatus: 200,
        requiredFields: ['success']
    },
    'POST /api/feature-flags/reset': {
        description: 'Reset all feature flags',
        expectedStatus: 200,
        requiredFields: ['success']
    },

    // Queue Management Routes
    'GET /api/queue/health': {
        description: 'Check queue health',
        expectedStatus: 200,
        requiredFields: ['status']
    },
    'GET /api/queue/status': {
        description: 'Get queue status',
        expectedStatus: 200,
        requiredFields: ['queues']
    }
};

// Test data
const TEST_DATA = {
    testFile: Buffer.from('username,email,givenName,familyName\njohn@example.com,john@example.com,John,Doe'),
    testSessionId: 'test-session-id-123',
    testPopulationId: 'test-population-id-456'
};

/**
 * Route Coverage Testing Suite
 */
describe('🔍 Route Coverage Testing', () => {
    let app;
    let testResults = {};

    // Setup test environment
    before(async () => {
        try {
            // Import the main server application
            const { default: serverApp } = await import('../../server.js');
            app = serverApp;
            
            // Wait for server to be ready
            await new Promise(resolve => {
                const checkServer = () => {
                    request(app)
                        .get('/api/health')
                        .expect(200)
                        .then(() => resolve())
                        .catch(() => setTimeout(checkServer, 1000));
                };
                checkServer();
            });

            console.log('✅ Test server ready for route coverage testing');
        } catch (error) {
            console.error('❌ Failed to setup test server:', error);
            throw error;
        }
    });

    after(() => {
        // Print test summary
        console.log('\n📊 Route Coverage Test Summary:');
        console.log('='.repeat(60));
        
        const totalRoutes = Object.keys(ROUTE_COVERAGE).length;
        const passedRoutes = Object.values(testResults).filter(r => r.status === 'PASS').length;
        const failedRoutes = Object.values(testResults).filter(r => r.status === 'FAIL').length;
        const skippedRoutes = Object.values(testResults).filter(r => r.status === 'SKIP').length;
        
        console.log(`Total Routes: ${totalRoutes}`);
        console.log(`✅ Passed: ${passedRoutes}`);
        console.log(`❌ Failed: ${failedRoutes}`);
        console.log(`⏭️  Skipped: ${skippedRoutes}`);
        console.log(`📈 Coverage: ${((passedRoutes / totalRoutes) * 100).toFixed(1)}%`);
        
        if (failedRoutes > 0) {
            console.log('\n❌ Failed Routes:');
            Object.entries(testResults)
                .filter(([_, result]) => result.status === 'FAIL')
                .forEach(([route, result]) => {
                    console.log(`  ${route}: ${result.error}`);
                });
        }
        
        console.log('='.repeat(60));
    });

    // Test each route systematically
    Object.entries(ROUTE_COVERAGE).forEach(([route, config]) => {
        const [method, path] = route.split(' ');
        
        describe(`${method} ${path}`, () => {
            it(`should ${config.description}`, async () => {
                try {
                    let req = request(app)[method.toLowerCase()](path);
                    
                    // Handle special cases
                    if (config.requiresFile) {
                        req = req.attach('file', TEST_DATA.testFile, 'test.csv');
                        if (path.includes('import')) {
                            req = req.field('populationId', TEST_DATA.testPopulationId);
                        }
                    }
                    
                    if (path.includes('logs/ui')) {
                        req = req.send({
                            message: 'Test log message',
                            level: 'info',
                            source: 'route-coverage-test'
                        });
                    }
                    
                    if (path.includes('logs/warning')) {
                        req = req.send({
                            message: 'Test warning message',
                            source: 'route-coverage-test'
                        });
                    }
                    
                    if (path.includes('logs/error')) {
                        req = req.send({
                            message: 'Test error message',
                            source: 'route-coverage-test'
                        });
                    }
                    
                    if (path.includes('logs/info')) {
                        req = req.send({
                            message: 'Test info message',
                            source: 'route-coverage-test'
                        });
                    }
                    
                    if (path.includes('logs/disk')) {
                        req = req.send({
                            message: 'Test disk log message',
                            level: 'info'
                        });
                    }
                    
                    if (path.includes('settings')) {
                        req = req.send({
                            environmentId: 'test-env-id',
                            clientId: 'test-client-id',
                            clientSecret: 'test-client-secret',
                            region: 'NorthAmerica'
                        });
                    }
                    
                    if (path.includes('export-users')) {
                        req = req.send({
                            populationId: TEST_DATA.testPopulationId,
                            format: 'json'
                        });
                    }
                    
                    if (path.includes('import/resolve-invalid-population')) {
                        req = req.send({
                            sessionId: TEST_DATA.testSessionId,
                            populationId: TEST_DATA.testPopulationId
                        });
                    }
                    
                    if (path.includes('feature-flags/test-flag')) {
                        req = req.send({ enabled: true });
                    }
                    
                    if (path.includes('pingone')) {
                        req = req.send({});
                    }
                    
                    const response = await req.expect(config.expectedStatus);
                    
                    // Validate response structure
                    if (config.requiredFields.length > 0) {
                        config.requiredFields.forEach(field => {
                            expect(response.body).to.have.property(field);
                        });
                    }
                    
                    // Special validation for SSE endpoints
                    if (config.isSSE) {
                        expect(response.headers['content-type']).to.include('text/event-stream');
                    }
                    
                    // Record test result
                    testResults[route] = {
                        status: 'PASS',
                        responseTime: response.headers['x-response-time'] || 'N/A',
                        statusCode: response.status
                    };
                    
                } catch (error) {
                    // Record test failure
                    testResults[route] = {
                        status: 'FAIL',
                        error: error.message,
                        statusCode: error.status || 'N/A'
                    };
                    
                    // Skip certain routes that might not be available in test environment
                    if (path.includes('pingone') || path.includes('import/progress')) {
                        testResults[route].status = 'SKIP';
                        testResults[route].error = 'Skipped - requires external dependencies';
                        this.skip();
                        return;
                    }
                    
                    throw error;
                }
            });
        });
    });

    // Additional validation tests
    describe('🔍 Additional Route Validations', () => {
        it('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent-route')
                .expect(404);

            expect(response.body).to.have.property('error');
            expect(response.body.error).to.equal('Not Found');
        });

        it('should handle malformed JSON requests', async () => {
            const response = await request(app)
                .post('/api/settings')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).to.have.property('error');
        });

        it('should enforce rate limiting', async () => {
            const requests = Array(60).fill().map(() => 
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(res => res.status === 429);

            expect(rateLimited).to.be.true;
        });

        it('should include proper CORS headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.headers).to.have.property('access-control-allow-origin');
        });

        it('should include security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Check for basic security headers
            const securityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection'
            ];

            securityHeaders.forEach(header => {
                expect(response.headers).to.have.property(header);
            });
        });
    });

    // Route discovery test
    describe('🔍 Route Discovery', () => {
        it('should discover all registered routes', async () => {
            // This test validates that our route coverage matches actual registered routes
            const discoveredRoutes = [];
            
            // Test common HTTP methods
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            const commonPaths = [
                '/api/health',
                '/api/logs',
                '/api/settings',
                '/api/pingone',
                '/api/import',
                '/api/export',
                '/api/modify',
                '/api/feature-flags',
                '/api/queue',
                '/api/debug'
            ];
            
            for (const method of methods) {
                for (const path of commonPaths) {
                    try {
                        const response = await request(app)[method.toLowerCase()](path);
                        if (response.status !== 404) {
                            discoveredRoutes.push(`${method} ${path}`);
                        }
                    } catch (error) {
                        // Ignore 404s and other expected errors
                    }
                }
            }
            
            console.log(`\n🔍 Discovered ${discoveredRoutes.length} routes:`);
            discoveredRoutes.forEach(route => {
                console.log(`  ${route}`);
            });
            
            expect(discoveredRoutes.length).to.be.greaterThan(0);
        });
    });
});

/**
 * Route Coverage Analysis
 */
class RouteCoverageAnalyzer {
    constructor() {
        this.coveredRoutes = new Set();
        this.missingRoutes = new Set();
        this.brokenRoutes = new Set();
    }

    addCoveredRoute(route) {
        this.coveredRoutes.add(route);
    }

    addMissingRoute(route) {
        this.missingRoutes.add(route);
    }

    addBrokenRoute(route, error) {
        this.brokenRoutes.add({ route, error });
    }

    getCoverageReport() {
        const totalRoutes = this.coveredRoutes.size + this.missingRoutes.size + this.brokenRoutes.size;
        const coveragePercentage = totalRoutes > 0 ? (this.coveredRoutes.size / totalRoutes) * 100 : 0;

        return {
            totalRoutes,
            coveredRoutes: this.coveredRoutes.size,
            missingRoutes: this.missingRoutes.size,
            brokenRoutes: this.brokenRoutes.size,
            coveragePercentage: coveragePercentage.toFixed(1),
            missingRoutesList: Array.from(this.missingRoutes),
            brokenRoutesList: Array.from(this.brokenRoutes)
        };
    }

    printReport() {
        const report = this.getCoverageReport();
        
        console.log('\n📊 Route Coverage Analysis');
        console.log('='.repeat(50));
        console.log(`Total Routes: ${report.totalRoutes}`);
        console.log(`✅ Covered: ${report.coveredRoutes}`);
        console.log(`❌ Missing: ${report.missingRoutes}`);
        console.log(`🔧 Broken: ${report.brokenRoutes}`);
        console.log(`📈 Coverage: ${report.coveragePercentage}%`);
        
        if (report.missingRoutes > 0) {
            console.log('\n❌ Missing Routes:');
            report.missingRoutesList.forEach(route => {
                console.log(`  - ${route}`);
            });
        }
        
        if (report.brokenRoutes > 0) {
            console.log('\n🔧 Broken Routes:');
            report.brokenRoutesList.forEach(({ route, error }) => {
                console.log(`  - ${route}: ${error}`);
            });
        }
        
        console.log('='.repeat(50));
    }
}

export { RouteCoverageAnalyzer }; 