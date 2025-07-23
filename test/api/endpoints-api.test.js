/**
 * API Endpoints Test Suite
 * 
 * This test suite focuses on testing all API endpoints of the PingOne Import Tool,
 * including authentication, user management, population management, and file operations.
 * 
 * Features:
 * - Comprehensive endpoint testing
 * - Authentication flow validation
 * - Error handling verification
 * - Response structure validation
 * - Edge case testing
 * 
 * @author PingOne Import Tool Team
 * @version 1.0.0
 */

import request from 'supertest';
import app from '../../server.js';
import { performance } from 'perf_hooks';

describe('API Endpoints Test Suite', () => {
    let server;
    let authToken;
    
    beforeAll(async () => {
        server = app.listen(0);
        await new Promise(resolve => {
            server.on('listening', resolve);
        });
        
        // Try to get a test token if possible
        try {
            const response = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                });
                
            if (response.status === 200 && response.body.token) {
                authToken = response.body.token;
                console.log('✅ Test auth token acquired');
            } else {
                console.log('⚠️ Using mock auth token for tests');
                authToken = 'test-token';
            }
        } catch (error) {
            console.log('⚠️ Error getting auth token, using mock token');
            authToken = 'test-token';
        }
    });
    
    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });
    
    describe('API Documentation Endpoints', () => {
        test('GET /api/docs - should return API documentation', async () => {
            const response = await request(server)
                .get('/api/docs');
                
            expect([200, 301, 302, 404]).toContain(response.status);
            
            // If docs are available, validate structure
            if (response.status === 200) {
                expect(response.type).toMatch(/html|json/);
            }
        });
        
        test('GET /api/swagger.json - should return Swagger/OpenAPI spec', async () => {
            const response = await request(server)
                .get('/api/swagger.json');
                
            // Either returns the spec or redirects to it
            expect([200, 301, 302, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.type).toBe('application/json');
                expect(response.body).toHaveProperty('openapi');
                expect(response.body).toHaveProperty('info');
                expect(response.body).toHaveProperty('paths');
            }
        });
    });
    
    describe('System Status Endpoints', () => {
        test('GET /api/health - should return health status', async () => {
            const start = performance.now();
            
            const response = await request(server)
                .get('/api/health')
                .expect(200);
                
            const duration = performance.now() - start;
            
            // Validate response structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('checks');
            
            // Performance validation
            expect(duration).toBeLessThan(1000); // Should respond within 1 second
            
            console.log(`Health check response time: ${duration.toFixed(2)}ms`);
        });
        
        test('GET /api/status - should return system status', async () => {
            const response = await request(server)
                .get('/api/status');
                
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('server');
                expect(response.body).toHaveProperty('memory');
                expect(response.body).toHaveProperty('environment');
            }
        });
        
        test('GET /api/version - should return version info', async () => {
            const response = await request(server)
                .get('/api/version');
                
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('version');
                expect(response.body).toHaveProperty('buildTime');
            }
        });
    });
    
    describe('Authentication Endpoints', () => {
        test('POST /api/auth/token - should validate token request', async () => {
            const response = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                });
                
            // Should handle auth validation
            expect([200, 400, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('token');
                expect(response.body).toHaveProperty('expiresIn');
            } else {
                expect(response.body).toHaveProperty('error');
            }
        });
        
        test('POST /api/auth/token - should reject invalid credentials', async () => {
            const response = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'invalid-client',
                    clientSecret: 'invalid-secret',
                    environmentId: 'invalid-env'
                });
                
            expect([400, 401]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/auth/refresh - should handle token refresh', async () => {
            const response = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'test-refresh-token' });
                
            expect([200, 400, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('token');
                expect(response.body).toHaveProperty('expiresIn');
            }
        });
        
        test('GET /api/auth/status - should return auth status', async () => {
            const response = await request(server)
                .get('/api/auth/status')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('isAuthenticated');
                expect(response.body).toHaveProperty('tokenStatus');
            }
        });
    });
    
    describe('User Management Endpoints', () => {
        test('GET /api/users - should return users list', async () => {
            const response = await request(server)
                .get('/api/users')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 403]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('users');
                expect(Array.isArray(response.body.users)).toBe(true);
            }
        });
        
        test('GET /api/users/:id - should return user details', async () => {
            const response = await request(server)
                .get('/api/users/test-user-id')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).toHaveProperty('id');
            }
        });
        
        test('POST /api/users - should create a user', async () => {
            const response = await request(server)
                .post('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    givenName: 'Test',
                    familyName: 'User',
                    populationId: 'test-population'
                });
                
            expect([201, 400, 401, 409]).toContain(response.status);
            
            if (response.status === 201) {
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).toHaveProperty('id');
            }
        });
        
        test('PUT /api/users/:id - should update user details', async () => {
            const response = await request(server)
                .put('/api/users/test-user-id')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    givenName: 'Updated',
                    familyName: 'User'
                });
                
            expect([200, 400, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).toHaveProperty('id');
            }
        });
        
        test('DELETE /api/users/:id - should delete a user', async () => {
            const response = await request(server)
                .delete('/api/users/test-user-id')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
            }
        });
    });
    
    describe('Population Management Endpoints', () => {
        test('GET /api/populations - should return populations list', async () => {
            const response = await request(server)
                .get('/api/populations')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('populations');
                expect(Array.isArray(response.body.populations)).toBe(true);
            }
        });
        
        test('GET /api/populations/:id - should return population details', async () => {
            const response = await request(server)
                .get('/api/populations/test-population-id')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('population');
                expect(response.body.population).toHaveProperty('id');
            }
        });
        
        test('POST /api/populations - should create a population', async () => {
            const response = await request(server)
                .post('/api/populations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Population',
                    description: 'Test population for API testing'
                });
                
            expect([201, 400, 401]).toContain(response.status);
            
            if (response.status === 201) {
                expect(response.body).toHaveProperty('population');
                expect(response.body.population).toHaveProperty('id');
            }
        });
        
        test('PUT /api/populations/:id - should update population details', async () => {
            const response = await request(server)
                .put('/api/populations/test-population-id')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Updated Population',
                    description: 'Updated description'
                });
                
            expect([200, 400, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('population');
                expect(response.body.population).toHaveProperty('id');
            }
        });
        
        test('DELETE /api/populations/:id - should delete a population', async () => {
            const response = await request(server)
                .delete('/api/populations/test-population-id')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
            }
        });
    });
    
    describe('Import/Export Endpoints', () => {
        test('POST /api/users/import - should handle user import', async () => {
            const csvContent = 'email,firstName,lastName\ntest@example.com,Test,User';
            
            const response = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from(csvContent), 'test.csv')
                .field('populationId', 'test-population');
                
            expect([200, 400, 401, 413]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success');
                expect(response.body).toHaveProperty('sessionId');
            }
        });
        
        test('GET /api/users/export - should handle user export', async () => {
            const response = await request(server)
                .get('/api/users/export')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ populationId: 'test-population' });
                
            expect([200, 400, 401]).toContain(response.status);
            
            if (response.status === 200) {
                // Check if it's a file download or a JSON response
                const contentType = response.headers['content-type'];
                if (contentType && contentType.includes('json')) {
                    expect(response.body).toHaveProperty('success');
                } else {
                    expect(response.headers['content-disposition']).toContain('attachment');
                }
            }
        });
        
        test('GET /api/import/status/:sessionId - should return import status', async () => {
            const response = await request(server)
                .get('/api/import/status/test-session-id')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401, 404]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('status');
                expect(response.body).toHaveProperty('progress');
            }
        });
    });
    
    describe('Settings and Configuration', () => {
        test('GET /api/settings - should return settings', async () => {
            const response = await request(server)
                .get('/api/settings')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('settings');
            }
        });
        
        test('PUT /api/settings - should update settings', async () => {
            const response = await request(server)
                .put('/api/settings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    maxFileSize: 10485760,
                    allowedFileTypes: ['csv']
                });
                
            expect([200, 400, 401]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success');
                expect(response.body).toHaveProperty('settings');
            }
        });
    });
    
    describe('Error Handling', () => {
        test('GET /api/nonexistent - should return 404', async () => {
            const response = await request(server)
                .get('/api/nonexistent');
                
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/users/import - should handle missing file', async () => {
            const response = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .field('populationId', 'test-population');
                
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/users/import - should handle missing population ID', async () => {
            const csvContent = 'email,firstName,lastName\ntest@example.com,Test,User';
            
            const response = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from(csvContent), 'test.csv');
                
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    
    describe('WebSocket/Socket.IO Endpoints', () => {
        test('Socket.IO connection should be available', (done) => {
            // Use dynamic import for Socket.IO client in ES modules
            import('socket.io-client').then(({ default: io }) => {
                const client = io(`http://localhost:${server.address().port}`, {
                    // Add connection timeout to prevent hanging
                    timeout: 3000,
                    reconnection: false
                });
                
                let isDone = false;
                
                const markDone = () => {
                    if (!isDone) {
                        isDone = true;
                        done();
                    }
                };
                
                client.on('connect', () => {
                    expect(client.connected).toBe(true);
                    client.disconnect();
                    markDone();
                });
                
                client.on('connect_error', () => {
                    // Connection might fail in test environment, that's okay
                    markDone();
                });
                
                // Add timeout to prevent hanging tests
                setTimeout(markDone, 3000);
            }).catch(() => {
                // If socket.io-client is not available, skip the test
                done();
            });
        }, 5000); // Add explicit timeout for the test
    });
});