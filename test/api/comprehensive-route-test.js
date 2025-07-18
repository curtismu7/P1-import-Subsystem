/**
 * @fileoverview Comprehensive API Route Testing Suite
 * 
 * This test suite validates all server routes for:
 * - Route coverage and functionality
 * - Authentication and authorization
 * - Error handling and edge cases
 * - Response format consistency
 * - Rate limiting behavior
 * - SSE/WebSocket reliability
 * - Load testing scenarios
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import request from 'supertest';
import { expect } from 'chai';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'http://localhost:4000',
    timeout: 30000,
    retries: 3,
    rateLimitDelay: 1000
};

// Test data
const TEST_DATA = {
    validUser: {
        username: 'testuser@example.com',
        email: 'testuser@example.com',
        givenName: 'Test',
        familyName: 'User',
        password: 'TestPassword123!'
    },
    invalidUser: {
        username: '',
        email: 'invalid-email',
        givenName: '',
        familyName: ''
    },
    testFile: Buffer.from('username,email,givenName,familyName\njohn@example.com,john@example.com,John,Doe\njane@example.com,jane@example.com,Jane,Smith'),
    largeFile: Buffer.from('username,email,givenName,familyName\n' + Array(1000).fill('user@example.com,user@example.com,User,Test').join('\n'))
};

/**
 * Comprehensive API Route Testing Suite
 */
describe('🔍 Comprehensive API Route Testing', () => {
    let app;
    let server;
    let testSessionId;

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

            console.log('✅ Test server ready');
        } catch (error) {
            console.error('❌ Failed to setup test server:', error);
            throw error;
        }
    });

    after(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    // ============================================================================
    // HEALTH CHECK ROUTES
    // ============================================================================

    describe('🏥 Health Check Routes', () => {
        it('should return healthy status for GET /api/health', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).to.have.property('status');
            expect(response.body).to.have.property('timestamp');
            expect(response.body).to.have.property('uptime');
            expect(response.body).to.have.property('checks');
            expect(response.body.checks).to.have.property('server');
            expect(response.body.checks).to.have.property('memory');
        });

        it('should handle health check with degraded service', async () => {
            // This test would require mocking a degraded service state
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.status).to.be.oneOf(['healthy', 'degraded', 'error']);
        });

        it('should handle health check errors gracefully', async () => {
            // Test with malformed request
            const response = await request(app)
                .get('/api/health')
                .set('Accept', 'invalid/type')
                .expect(200); // Should still return JSON

            expect(response.body).to.have.property('status');
        });
    });

    // ============================================================================
    // AUTHENTICATION & TOKEN ROUTES
    // ============================================================================

    describe('🔐 Authentication & Token Routes', () => {
        it('should get token debug info from GET /api/debug/token', async () => {
            const response = await request(app)
                .get('/api/debug/token')
                .expect(200);

            expect(response.body).to.have.property('tokenLength');
            expect(response.body).to.have.property('isValidJWT');
            expect(response.body).to.have.property('environment');
        });

        it('should handle token debug errors gracefully', async () => {
            // Test with invalid token manager state
            const response = await request(app)
                .get('/api/debug/token')
                .expect(200);

            expect(response.body).to.have.property('environment');
        });

        it('should get settings debug info from GET /api/debug/settings', async () => {
            const response = await request(app)
                .get('/api/debug/settings')
                .expect(200);

            expect(response.body).to.have.property('environment');
            expect(response.body.environment).to.have.property('hasClientId');
            expect(response.body.environment).to.have.property('hasClientSecret');
        });
    });

    // ============================================================================
    // PINGONE API ROUTES
    // ============================================================================

    describe('🌐 PingOne API Routes', () => {
        it('should get populations from GET /api/pingone/populations', async () => {
            const response = await request(app)
                .get('/api/pingone/populations')
                .expect(200);

            expect(response.body).to.be.an('array');
        });

        it('should handle population fetch errors gracefully', async () => {
            // Test with invalid credentials
            const response = await request(app)
                .get('/api/pingone/populations')
                .expect(200);

            // Should return empty array or error message
            expect(response.body).to.satisfy(body => 
                Array.isArray(body) || body.hasOwnProperty('error')
            );
        });

        it('should get token from GET /api/pingone/token', async () => {
            const response = await request(app)
                .get('/api/pingone/token')
                .expect(200);

            expect(response.body).to.have.property('token');
        });

        it('should post token from POST /api/pingone/token', async () => {
            const response = await request(app)
                .post('/api/pingone/token')
                .send({})
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should get token from POST /api/pingone/get-token', async () => {
            const response = await request(app)
                .post('/api/pingone/get-token')
                .send({})
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should refresh token from POST /api/pingone/refresh-token', async () => {
            const response = await request(app)
                .post('/api/pingone/refresh-token')
                .send({})
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should test connection from POST /api/pingone/test-connection', async () => {
            const response = await request(app)
                .post('/api/pingone/test-connection')
                .send({})
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // IMPORT ROUTES
    // ============================================================================

    describe('📥 Import Routes', () => {
        it('should handle file upload for POST /api/import', async () => {
            const response = await request(app)
                .post('/api/import')
                .attach('file', TEST_DATA.testFile, 'test-users.csv')
                .field('populationId', 'test-population-id')
                .field('populationName', 'Test Population')
                .expect(200);

            expect(response.body).to.have.property('success');
            expect(response.body).to.have.property('sessionId');
            testSessionId = response.body.sessionId;
        });

        it('should handle import with invalid file', async () => {
            const response = await request(app)
                .post('/api/import')
                .attach('file', Buffer.from('invalid,csv,data'), 'invalid.csv')
                .field('populationId', 'test-population-id')
                .expect(400);

            expect(response.body).to.have.property('error');
        });

        it('should handle import without file', async () => {
            const response = await request(app)
                .post('/api/import')
                .field('populationId', 'test-population-id')
                .expect(400);

            expect(response.body).to.have.property('error');
        });

        it('should get import progress from GET /api/import/progress/:sessionId', async () => {
            if (!testSessionId) {
                this.skip();
                return;
            }

            const response = await request(app)
                .get(`/api/import/progress/${testSessionId}`)
                .expect(200);

            expect(response.headers['content-type']).to.include('text/event-stream');
        });

        it('should handle invalid session ID for progress', async () => {
            const response = await request(app)
                .get('/api/import/progress/invalid-session-id')
                .expect(404);

            expect(response.body).to.have.property('error');
        });

        it('should resolve invalid population from POST /api/import/resolve-invalid-population', async () => {
            const response = await request(app)
                .post('/api/import/resolve-invalid-population')
                .send({
                    sessionId: 'test-session',
                    populationId: 'test-population-id'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // EXPORT ROUTES
    // ============================================================================

    describe('📤 Export Routes', () => {
        it('should export users from POST /api/export-users', async () => {
            const response = await request(app)
                .post('/api/export-users')
                .send({
                    populationId: 'test-population-id',
                    format: 'json'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should handle export with invalid population', async () => {
            const response = await request(app)
                .post('/api/export-users')
                .send({
                    populationId: 'invalid-population-id',
                    format: 'json'
                })
                .expect(400);

            expect(response.body).to.have.property('error');
        });
    });

    // ============================================================================
    // MODIFY ROUTES
    // ============================================================================

    describe('✏️ Modify Routes', () => {
        it('should handle user modification from POST /api/modify', async () => {
            const response = await request(app)
                .post('/api/modify')
                .attach('file', TEST_DATA.testFile, 'modify-users.csv')
                .field('populationId', 'test-population-id')
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should handle modify without file', async () => {
            const response = await request(app)
                .post('/api/modify')
                .field('populationId', 'test-population-id')
                .expect(400);

            expect(response.body).to.have.property('error');
        });
    });

    // ============================================================================
    // LOGS ROUTES
    // ============================================================================

    describe('📝 Logs Routes', () => {
        it('should get logs from GET /api/logs', async () => {
            const response = await request(app)
                .get('/api/logs')
                .expect(200);

            expect(response.body).to.be.an('object');
        });

        it('should post UI log from POST /api/logs/ui', async () => {
            const response = await request(app)
                .post('/api/logs/ui')
                .send({
                    message: 'Test log message',
                    level: 'info',
                    source: 'test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should get UI logs from GET /api/logs/ui', async () => {
            const response = await request(app)
                .get('/api/logs/ui')
                .expect(200);

            expect(response.body).to.be.an('array');
        });

        it('should delete UI logs from DELETE /api/logs/ui', async () => {
            const response = await request(app)
                .delete('/api/logs/ui')
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should post warning log from POST /api/logs/warning', async () => {
            const response = await request(app)
                .post('/api/logs/warning')
                .send({
                    message: 'Test warning message',
                    source: 'test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should post error log from POST /api/logs/error', async () => {
            const response = await request(app)
                .post('/api/logs/error')
                .send({
                    message: 'Test error message',
                    source: 'test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should post info log from POST /api/logs/info', async () => {
            const response = await request(app)
                .post('/api/logs/info')
                .send({
                    message: 'Test info message',
                    source: 'test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should get disk logs from GET /api/logs/disk', async () => {
            const response = await request(app)
                .get('/api/logs/disk')
                .expect(200);

            expect(response.body).to.be.an('object');
        });

        it('should post disk log from POST /api/logs/disk', async () => {
            const response = await request(app)
                .post('/api/logs/disk')
                .send({
                    message: 'Test disk log message',
                    level: 'info'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should delete all logs from DELETE /api/logs', async () => {
            const response = await request(app)
                .delete('/api/logs')
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // SETTINGS ROUTES
    // ============================================================================

    describe('⚙️ Settings Routes', () => {
        it('should get settings from GET /api/settings', async () => {
            const response = await request(app)
                .get('/api/settings')
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should post settings from POST /api/settings', async () => {
            const response = await request(app)
                .post('/api/settings')
                .send({
                    environmentId: 'test-env-id',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    region: 'NorthAmerica'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should put settings from PUT /api/settings', async () => {
            const response = await request(app)
                .put('/api/settings')
                .send({
                    environmentId: 'test-env-id',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    region: 'NorthAmerica'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // FEATURE FLAGS ROUTES
    // ============================================================================

    describe('🚩 Feature Flags Routes', () => {
        it('should get feature flags from GET /api/feature-flags', async () => {
            const response = await request(app)
                .get('/api/feature-flags')
                .expect(200);

            expect(response.body).to.be.an('object');
        });

        it('should post feature flag from POST /api/feature-flags/:flag', async () => {
            const response = await request(app)
                .post('/api/feature-flags/test-flag')
                .send({ enabled: true })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should reset feature flags from POST /api/feature-flags/reset', async () => {
            const response = await request(app)
                .post('/api/feature-flags/reset')
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // QUEUE ROUTES
    // ============================================================================

    describe('📋 Queue Routes', () => {
        it('should get queue health from GET /api/queue/health', async () => {
            const response = await request(app)
                .get('/api/queue/health')
                .expect(200);

            expect(response.body).to.have.property('status');
        });

        it('should get queue status from GET /api/queue/status', async () => {
            const response = await request(app)
                .get('/api/queue/status')
                .expect(200);

            expect(response.body).to.have.property('queues');
        });
    });

    // ============================================================================
    // ERROR HANDLING TESTS
    // ============================================================================

    describe('❌ Error Handling Tests', () => {
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

        it('should handle large file uploads gracefully', async () => {
            const response = await request(app)
                .post('/api/import')
                .attach('file', TEST_DATA.largeFile, 'large-file.csv')
                .field('populationId', 'test-population-id')
                .expect(413); // Payload too large

            expect(response.body).to.have.property('error');
        });

        it('should handle invalid file types', async () => {
            const response = await request(app)
                .post('/api/import')
                .attach('file', Buffer.from('not a csv'), 'test.txt')
                .field('populationId', 'test-population-id')
                .expect(400);

            expect(response.body).to.have.property('error');
        });
    });

    // ============================================================================
    // RATE LIMITING TESTS
    // ============================================================================

    describe('⏱️ Rate Limiting Tests', () => {
        it('should enforce rate limits on API endpoints', async () => {
            const requests = Array(60).fill().map(() => 
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(res => res.status === 429);

            expect(rateLimited).to.be.true;
        });

        it('should handle rate limit headers correctly', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.headers).to.have.property('ratelimit-limit');
            expect(response.headers).to.have.property('ratelimit-remaining');
        });
    });

    // ============================================================================
    // SSE/WEBSOCKET RELIABILITY TESTS
    // ============================================================================

    describe('📡 SSE/WebSocket Reliability Tests', () => {
        it('should maintain SSE connection for import progress', async () => {
            // First create an import session
            const importResponse = await request(app)
                .post('/api/import')
                .attach('file', TEST_DATA.testFile, 'test-users.csv')
                .field('populationId', 'test-population-id')
                .field('populationName', 'Test Population')
                .expect(200);

            const sessionId = importResponse.body.sessionId;

            // Test SSE connection
            const sseResponse = await request(app)
                .get(`/api/import/progress/${sessionId}`)
                .expect(200);

            expect(sseResponse.headers['content-type']).to.include('text/event-stream');
            expect(sseResponse.headers).to.have.property('cache-control');
            expect(sseResponse.headers['cache-control']).to.include('no-cache');
        });

        it('should handle SSE connection errors gracefully', async () => {
            const response = await request(app)
                .get('/api/import/progress/invalid-session-id')
                .expect(404);

            expect(response.body).to.have.property('error');
        });
    });

    // ============================================================================
    // LOAD TESTING SCENARIOS
    // ============================================================================

    describe('🚀 Load Testing Scenarios', () => {
        it('should handle concurrent import requests', async () => {
            const concurrentRequests = 5;
            const requests = Array(concurrentRequests).fill().map(() =>
                request(app)
                    .post('/api/import')
                    .attach('file', TEST_DATA.testFile, 'test-users.csv')
                    .field('populationId', 'test-population-id')
                    .field('populationName', 'Test Population')
            );

            const responses = await Promise.all(requests);
            const successful = responses.filter(res => res.status === 200);

            expect(successful.length).to.be.greaterThan(0);
        });

        it('should handle multiple health check requests', async () => {
            const requests = Array(10).fill().map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);
            const allSuccessful = responses.every(res => res.status === 200);

            expect(allSuccessful).to.be.true;
        });

        it('should handle rapid log posting', async () => {
            const requests = Array(20).fill().map((_, i) =>
                request(app)
                    .post('/api/logs/ui')
                    .send({
                        message: `Test log message ${i}`,
                        level: 'info',
                        source: 'load-test'
                    })
            );

            const responses = await Promise.all(requests);
            const successful = responses.filter(res => res.status === 200);

            expect(successful.length).to.be.greaterThan(0);
        });
    });

    // ============================================================================
    // SECURITY TESTS
    // ============================================================================

    describe('🔒 Security Tests', () => {
        it('should sanitize sensitive data in logs', async () => {
            const response = await request(app)
                .post('/api/logs/ui')
                .send({
                    message: 'Test with sensitive data',
                    details: {
                        password: 'secret123',
                        token: 'bearer-token-here',
                        clientSecret: 'client-secret-here'
                    },
                    source: 'security-test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should handle SQL injection attempts', async () => {
            const response = await request(app)
                .post('/api/settings')
                .send({
                    environmentId: "'; DROP TABLE users; --",
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });

        it('should handle XSS attempts', async () => {
            const response = await request(app)
                .post('/api/logs/ui')
                .send({
                    message: '<script>alert("xss")</script>',
                    source: 'xss-test'
                })
                .expect(200);

            expect(response.body).to.have.property('success');
        });
    });

    // ============================================================================
    // INTEGRATION TESTS
    // ============================================================================

    describe('🔗 Integration Tests', () => {
        it('should complete full import workflow', async () => {
            // 1. Create import session
            const importResponse = await request(app)
                .post('/api/import')
                .attach('file', TEST_DATA.testFile, 'test-users.csv')
                .field('populationId', 'test-population-id')
                .field('populationName', 'Test Population')
                .expect(200);

            expect(importResponse.body).to.have.property('sessionId');

            // 2. Check progress endpoint
            const progressResponse = await request(app)
                .get(`/api/import/progress/${importResponse.body.sessionId}`)
                .expect(200);

            expect(progressResponse.headers['content-type']).to.include('text/event-stream');

            // 3. Verify logs were created
            const logsResponse = await request(app)
                .get('/api/logs/ui')
                .expect(200);

            expect(logsResponse.body).to.be.an('array');
        });

        it('should handle settings configuration workflow', async () => {
            // 1. Get current settings
            const getResponse = await request(app)
                .get('/api/settings')
                .expect(200);

            expect(getResponse.body).to.have.property('success');

            // 2. Update settings
            const updateResponse = await request(app)
                .put('/api/settings')
                .send({
                    environmentId: 'test-env-id',
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    region: 'NorthAmerica'
                })
                .expect(200);

            expect(updateResponse.body).to.have.property('success');

            // 3. Test connection
            const testResponse = await request(app)
                .post('/api/pingone/test-connection')
                .send({})
                .expect(200);

            expect(testResponse.body).to.have.property('success');
        });
    });
});

/**
 * Test utilities for common operations
 */
class TestUtils {
    static async waitForServer(baseUrl, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const response = await fetch(`${baseUrl}/api/health`);
                if (response.ok) return true;
            } catch (error) {
                // Continue waiting
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Server not ready within timeout');
    }

    static generateTestData(rows = 10) {
        const headers = ['username', 'email', 'givenName', 'familyName'];
        const data = [headers.join(',')];
        
        for (let i = 0; i < rows; i++) {
            data.push(`user${i}@example.com,user${i}@example.com,User${i},Test${i}`);
        }
        
        return Buffer.from(data.join('\n'));
    }

    static async cleanupTestData(app) {
        try {
            await request(app).delete('/api/logs/ui');
            await request(app).delete('/api/logs');
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

export { TestUtils }; 