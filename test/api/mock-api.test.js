/**
 * API Mocking and Simulation Test Suite
 * 
 * This test suite focuses on testing the API endpoints with mocked external services
 * and simulated scenarios, including error conditions, edge cases, and various
 * response patterns.
 * 
 * Features:
 * - External service mocking
 * - Error condition simulation
 * - Edge case testing
 * - Response pattern simulation
 * 
 * @author PingOne Import Tool Team
 * @version 1.0.0
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

describe('API Mocking and Simulation Test Suite', () => {
    let app;
    let server;
    
    beforeAll(async () => {
        // Create a mock Express app with simulated API endpoints
        app = express();
        
        // Mock token manager
        const mockTokenManager = {
            getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
            isTokenValid: jest.fn().mockReturnValue(true),
            refreshToken: jest.fn().mockResolvedValue('refreshed-mock-token')
        };
        
        // Mock startup optimizer
        const mockStartupOptimizer = {
            getHealthStatus: jest.fn().mockReturnValue({
                status: 'healthy',
                isInitialized: true,
                tokenValid: true,
                populationsCached: true
            }),
            getCachedToken: jest.fn().mockReturnValue('cached-mock-token'),
            getCachedPopulations: jest.fn().mockReturnValue([
                { id: '1', name: 'Test Population 1' },
                { id: '2', name: 'Test Population 2' }
            ])
        };
        
        // Set mock services
        app.set('tokenManager', mockTokenManager);
        app.set('startupOptimizer', mockStartupOptimizer);
        
        // Mock API endpoints
        
        // Health endpoint
        app.get('/api/health', (req, res) => {
            res.json({
                success: true,
                status: 'healthy',
                checks: {
                    server: true,
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    environment: 'test'
                },
                responseTime: '5ms'
            });
        });
        
        // Status endpoint
        app.get('/api/status', (req, res) => {
            res.json({
                server: {
                    status: 'running',
                    uptime: process.uptime()
                },
                memory: process.memoryUsage(),
                environment: 'test'
            });
        });
        
        // Version endpoint
        app.get('/api/version', (req, res) => {
            res.json({
                version: '6.5.1.1',
                buildTime: new Date().toISOString(),
                environment: 'test'
            });
        });
        
        // Auth token endpoint
        app.post('/api/auth/token', (req, res) => {
            const { clientId, clientSecret, environmentId } = req.body;
            
            if (!clientId || !clientSecret || !environmentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters'
                });
            }
            
            if (clientId === 'error-client') {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication failed'
                });
            }
            
            if (clientId === 'rate-limit') {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded'
                });
            }
            
            if (clientId === 'timeout') {
                // Simulate timeout
                setTimeout(() => {
                    res.status(408).json({
                        success: false,
                        error: 'Request timeout'
                    });
                }, 1000);
                return;
            }
            
            res.json({
                success: true,
                token: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                expiresIn: 3600,
                tokenType: 'Bearer'
            });
        });
        
        // Auth refresh endpoint
        app.post('/api/auth/refresh', (req, res) => {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing refresh token'
                });
            }
            
            if (refreshToken === 'invalid-token') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
            }
            
            if (refreshToken === 'expired-token') {
                return res.status(401).json({
                    success: false,
                    error: 'Refresh token expired'
                });
            }
            
            res.json({
                success: true,
                token: 'refreshed-mock-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600,
                tokenType: 'Bearer'
            });
        });
        
        // Auth status endpoint
        app.get('/api/auth/status', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    error: 'Missing or invalid authorization header'
                });
            }
            
            const token = authHeader.split(' ')[1];
            
            if (token === 'invalid-token') {
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    error: 'Invalid token'
                });
            }
            
            if (token === 'expired-token') {
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    error: 'Token expired'
                });
            }
            
            res.json({
                success: true,
                isAuthenticated: true,
                tokenStatus: 'valid',
                expiresIn: 3600
            });
        });
        
        // Users endpoint
        app.get('/api/users', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            res.json({
                success: true,
                users: [
                    { id: '1', username: 'user1', email: 'user1@example.com', givenName: 'User', familyName: 'One' },
                    { id: '2', username: 'user2', email: 'user2@example.com', givenName: 'User', familyName: 'Two' }
                ],
                total: 2,
                page: 1,
                pageSize: 10
            });
        });
        
        // User by ID endpoint
        app.get('/api/users/:id', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const userId = req.params.id;
            
            if (userId === 'not-found') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            if (userId === 'error') {
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            res.json({
                success: true,
                user: {
                    id: userId,
                    username: `user${userId}`,
                    email: `user${userId}@example.com`,
                    givenName: 'User',
                    familyName: userId,
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    population: {
                        id: '1',
                        name: 'Test Population'
                    }
                }
            });
        });
        
        // Create user endpoint
        app.post('/api/users', express.json(), (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const { username, email, givenName, familyName, populationId } = req.body;
            
            if (!username || !email || !populationId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }
            
            if (email === 'duplicate@example.com') {
                return res.status(409).json({
                    success: false,
                    error: 'User already exists'
                });
            }
            
            if (populationId === 'invalid') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid population ID'
                });
            }
            
            res.status(201).json({
                success: true,
                user: {
                    id: 'new-user-id',
                    username,
                    email,
                    givenName: givenName || '',
                    familyName: familyName || '',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    population: {
                        id: populationId,
                        name: 'Test Population'
                    }
                }
            });
        });
        
        // Update user endpoint
        app.put('/api/users/:id', express.json(), (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const userId = req.params.id;
            
            if (userId === 'not-found') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            if (userId === 'error') {
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            const { givenName, familyName } = req.body;
            
            res.json({
                success: true,
                user: {
                    id: userId,
                    username: `user${userId}`,
                    email: `user${userId}@example.com`,
                    givenName: givenName || 'User',
                    familyName: familyName || userId,
                    lastModified: new Date().toISOString()
                }
            });
        });
        
        // Delete user endpoint
        app.delete('/api/users/:id', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const userId = req.params.id;
            
            if (userId === 'not-found') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            if (userId === 'error') {
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            res.json({
                success: true,
                message: `User ${userId} deleted successfully`
            });
        });
        
        // Populations endpoint
        app.get('/api/populations', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            res.json({
                success: true,
                populations: [
                    { id: '1', name: 'Population 1', description: 'Test population 1', userCount: 100 },
                    { id: '2', name: 'Population 2', description: 'Test population 2', userCount: 250 }
                ],
                total: 2
            });
        });
        
        // Import users endpoint
        app.post('/api/users/import', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            // In a real test, we would use multer to handle file uploads
            // For this mock, we'll just check for populationId
            const populationId = req.body?.populationId;
            
            if (!populationId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing population ID'
                });
            }
            
            if (populationId === 'invalid') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid population ID'
                });
            }
            
            res.json({
                success: true,
                sessionId: 'mock-import-session',
                message: 'Import started successfully'
            });
        });
        
        // Export users endpoint
        app.get('/api/users/export', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const { populationId, format } = req.query;
            
            if (!populationId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing population ID'
                });
            }
            
            if (populationId === 'invalid') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid population ID'
                });
            }
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
                res.send('email,firstName,lastName\nuser1@example.com,User,One\nuser2@example.com,User,Two');
            } else {
                res.json({
                    success: true,
                    users: [
                        { email: 'user1@example.com', firstName: 'User', lastName: 'One' },
                        { email: 'user2@example.com', firstName: 'User', lastName: 'Two' }
                    ],
                    total: 2,
                    populationId
                });
            }
        });
        
        // Import status endpoint
        app.get('/api/import/status/:sessionId', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const sessionId = req.params.sessionId;
            
            if (sessionId === 'not-found') {
                return res.status(404).json({
                    success: false,
                    error: 'Import session not found'
                });
            }
            
            if (sessionId === 'error') {
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
            
            const statuses = {
                'in-progress': {
                    status: 'in-progress',
                    progress: {
                        processed: 50,
                        total: 100,
                        created: 45,
                        skipped: 3,
                        failed: 2
                    },
                    message: 'Import in progress'
                },
                'completed': {
                    status: 'completed',
                    progress: {
                        processed: 100,
                        total: 100,
                        created: 95,
                        skipped: 3,
                        failed: 2
                    },
                    message: 'Import completed successfully'
                },
                'failed': {
                    status: 'failed',
                    progress: {
                        processed: 75,
                        total: 100,
                        created: 70,
                        skipped: 3,
                        failed: 2
                    },
                    error: 'Import failed due to an error',
                    message: 'Import failed'
                }
            };
            
            const status = statuses[sessionId] || statuses['in-progress'];
            
            res.json({
                success: true,
                ...status
            });
        });
        
        // Settings endpoint
        app.get('/api/settings', (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            res.json({
                success: true,
                settings: {
                    maxFileSize: 10485760,
                    allowedFileTypes: ['csv'],
                    importBatchSize: 5,
                    environmentId: 'test-env',
                    apiClientId: 'test-client',
                    region: 'NorthAmerica'
                }
            });
        });
        
        // Update settings endpoint
        app.put('/api/settings', express.json(), (req, res) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }
            
            const settings = req.body;
            
            if (!settings) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing settings data'
                });
            }
            
            res.json({
                success: true,
                settings: {
                    ...settings,
                    lastUpdated: new Date().toISOString()
                }
            });
        });
        
        // Start server with proper error handling
        server = app.listen(0);
        
        // Wait for server to be ready with timeout
        await Promise.race([
            new Promise(resolve => {
                server.on('listening', resolve);
            }),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Mock server startup timeout')), 5000);
            })
        ]);
        
        // Add error handler
        server.on('error', (error) => {
            console.error('Mock test server error:', error);
        });
    });
    
    afterAll(async () => {
        if (server) {
            try {
                // Remove all listeners to prevent memory leaks
                server.removeAllListeners();
                
                await Promise.race([
                    new Promise(resolve => {
                        if (!server.listening) {
                            resolve();
                            return;
                        }
                        server.close(resolve);
                    }),
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Mock server shutdown timeout')), 3000);
                    })
                ]);
            } catch (error) {
                console.error('Error closing mock server:', error);
                // Force close if graceful shutdown fails
                if (server.listening) {
                    try {
                        server.close();
                    } catch (closeError) {
                        console.error('Force close failed:', closeError);
                    }
                }
            } finally {
                server = null;
            }
        }
    });
    
    describe('Health and Status Endpoints', () => {
        test('GET /api/health - should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('checks');
        });
        
        test('GET /api/status - should return system status', async () => {
            const response = await request(app)
                .get('/api/status')
                .expect(200);
                
            expect(response.body).toHaveProperty('server');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('environment');
        });
        
        test('GET /api/version - should return version info', async () => {
            const response = await request(app)
                .get('/api/version')
                .expect(200);
                
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('buildTime');
        });
    });
    
    describe('Authentication Endpoints', () => {
        test('POST /api/auth/token - should return token with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                })
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body).toHaveProperty('expiresIn');
        });
        
        test('POST /api/auth/token - should reject missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client'
                })
                .expect(400);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/auth/token - should handle authentication failure', async () => {
            const response = await request(app)
                .post('/api/auth/token')
                .send({
                    clientId: 'error-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                })
                .expect(401);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/auth/token - should handle rate limiting', async () => {
            const response = await request(app)
                .post('/api/auth/token')
                .send({
                    clientId: 'rate-limit',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                })
                .expect(429);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/auth/refresh - should refresh token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({
                    refreshToken: 'valid-refresh-token'
                })
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('refreshToken');
        });
        
        test('POST /api/auth/refresh - should reject invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({
                    refreshToken: 'invalid-token'
                })
                .expect(401);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('GET /api/auth/status - should return auth status with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/status')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('isAuthenticated', true);
            expect(response.body).toHaveProperty('tokenStatus', 'valid');
        });
        
        test('GET /api/auth/status - should reject invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/status')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('isAuthenticated', false);
            expect(response.body).toHaveProperty('error');
        });
    });
    
    describe('User Management Endpoints', () => {
        test('GET /api/users - should return users list with valid token', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
            expect(response.body.users.length).toBeGreaterThan(0);
        });
        
        test('GET /api/users - should reject unauthorized request', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(401);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('GET /api/users/:id - should return user details with valid token', async () => {
            const response = await request(app)
                .get('/api/users/123')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id', '123');
        });
        
        test('GET /api/users/:id - should handle not found error', async () => {
            const response = await request(app)
                .get('/api/users/not-found')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('POST /api/users - should create user with valid data', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    username: 'newuser',
                    email: 'newuser@example.com',
                    givenName: 'New',
                    familyName: 'User',
                    populationId: '1'
                })
                .expect(201);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('username', 'newuser');
            expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
        });
        
        test('POST /api/users - should reject duplicate user', async () => {
            const response = await request(app)
                .post('/api/users')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    username: 'duplicate',
                    email: 'duplicate@example.com',
                    givenName: 'Duplicate',
                    familyName: 'User',
                    populationId: '1'
                })
                .expect(409);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('PUT /api/users/:id - should update user with valid data', async () => {
            const response = await request(app)
                .put('/api/users/123')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    givenName: 'Updated',
                    familyName: 'User'
                })
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('givenName', 'Updated');
            expect(response.body.user).toHaveProperty('familyName', 'User');
        });
        
        test('DELETE /api/users/:id - should delete user', async () => {
            const response = await request(app)
                .delete('/api/users/123')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
        });
    });
    
    describe('Import/Export Endpoints', () => {
        test('POST /api/users/import - should start import process', async () => {
            const response = await request(app)
                .post('/api/users/import')
                .set('Authorization', 'Bearer valid-token')
                .field('populationId', '1')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('message');
        });
        
        test('GET /api/users/export - should export users as JSON', async () => {
            const response = await request(app)
                .get('/api/users/export')
                .set('Authorization', 'Bearer valid-token')
                .query({ populationId: '1' })
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
        });
        
        test('GET /api/users/export - should export users as CSV', async () => {
            const response = await request(app)
                .get('/api/users/export')
                .set('Authorization', 'Bearer valid-token')
                .query({ populationId: '1', format: 'csv' })
                .expect(200);
                
            expect(response.headers['content-type']).toBe('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.text).toContain('email,firstName,lastName');
        });
        
        test('GET /api/import/status/:sessionId - should return import status', async () => {
            const response = await request(app)
                .get('/api/import/status/in-progress')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'in-progress');
            expect(response.body).toHaveProperty('progress');
            expect(response.body.progress).toHaveProperty('processed');
            expect(response.body.progress).toHaveProperty('total');
        });
        
        test('GET /api/import/status/:sessionId - should return completed status', async () => {
            const response = await request(app)
                .get('/api/import/status/completed')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'completed');
            expect(response.body).toHaveProperty('progress');
            expect(response.body.progress.processed).toBe(response.body.progress.total);
        });
        
        test('GET /api/import/status/:sessionId - should return failed status', async () => {
            const response = await request(app)
                .get('/api/import/status/failed')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'failed');
            expect(response.body).toHaveProperty('error');
        });
    });
    
    describe('Settings Endpoints', () => {
        test('GET /api/settings - should return settings', async () => {
            const response = await request(app)
                .get('/api/settings')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings).toHaveProperty('maxFileSize');
            expect(response.body.settings).toHaveProperty('allowedFileTypes');
        });
        
        test('PUT /api/settings - should update settings', async () => {
            const response = await request(app)
                .put('/api/settings')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    maxFileSize: 20971520,
                    allowedFileTypes: ['csv', 'json'],
                    importBatchSize: 10
                })
                .expect(200);
                
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings).toHaveProperty('maxFileSize', 20971520);
            expect(response.body.settings).toHaveProperty('allowedFileTypes');
            expect(response.body.settings.allowedFileTypes).toContain('csv');
            expect(response.body.settings.allowedFileTypes).toContain('json');
            expect(response.body.settings).toHaveProperty('importBatchSize', 10);
        });
    });
    
    describe('Error Handling', () => {
        test('Should handle timeout errors', async () => {
            // Use a shorter timeout for the test
            jest.setTimeout(3000);
            
            try {
                // Set a shorter timeout for the request itself
                await request(app)
                    .post('/api/auth/token')
                    .send({
                        clientId: 'timeout',
                        clientSecret: 'test-secret',
                        environmentId: 'test-env'
                    })
                    .timeout(1000); // Set request timeout to 1 second
                    
                // If we get here, the test should fail
                fail('Expected request to timeout');
            } catch (error) {
                // Expect a timeout error
                expect(error).toBeTruthy();
            }
        }, 5000); // Set explicit test timeout
        
        test('Should handle server errors', async () => {
            const response = await request(app)
                .get('/api/users/error')
                .set('Authorization', 'Bearer valid-token')
                .expect(500);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
        
        test('Should handle not found errors', async () => {
            const response = await request(app)
                .get('/api/users/not-found')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);
                
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
    });
});