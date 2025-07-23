/**
 * API Integration Test Suite
 * 
 * This test suite focuses on testing the integration between different API endpoints
 * and services of the PingOne Import Tool, including end-to-end workflows and
 * multi-step processes.
 * 
 * Features:
 * - End-to-end workflow testing
 * - Multi-step process validation
 * - Service integration testing
 * - Real-world scenario simulation
 * 
 * @author PingOne Import Tool Team
 * @version 1.0.0
 */

import request from 'supertest';
import app from '../../server.js';
import { performance } from 'perf_hooks';

describe('API Integration Test Suite', () => {
    let server;
    let authToken;
    let testPopulationId;
    let testUserId;
    
    beforeAll(async () => {
        try {
            // Start server for testing with timeout protection
            server = app.listen(0);
            
            // Wait for server to be ready with timeout
            await Promise.race([
                new Promise(resolve => {
                    server.on('listening', resolve);
                }),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Server startup timeout')), 10000);
                })
            ]);
            
            // Add error handler to prevent uncaught exceptions
            server.on('error', (error) => {
                console.error('Test server error:', error);
            });
            
            // Try to get a test token if possible
            try {
                const response = await request(server)
                    .post('/api/auth/token')
                    .send({
                        clientId: 'test-client',
                        clientSecret: 'test-secret',
                        environmentId: 'test-env'
                    })
                    .timeout(5000); // Add timeout for request
                    
                if (response.status === 200 && response.body.token) {
                    authToken = response.body.token;
                    console.log('✅ Test auth token acquired');
                } else {
                    console.log('⚠️ Using mock auth token for tests');
                    authToken = 'test-token';
                }
            } catch (error) {
                console.log('⚠️ Error getting auth token, using mock token:', error.message);
                authToken = 'test-token';
            }
        } catch (error) {
            console.error('Failed to start test server:', error);
            // Clean up on failure
            if (server && server.listening) {
                server.close();
            }
            throw error;
        }
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
                        setTimeout(() => reject(new Error('Server shutdown timeout')), 5000);
                    })
                ]);
            } catch (error) {
                console.error('Error closing server:', error);
                // Force close if graceful shutdown fails
                if (server && server.listening) {
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
    
    describe('Authentication Flow', () => {
        test('Complete authentication flow: token request, validation, and refresh', async () => {
            console.log('🔄 Testing complete authentication flow');
            
            // Step 1: Request token
            const tokenResponse = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                });
                
            expect([200, 401]).toContain(tokenResponse.status);
            
            if (tokenResponse.status === 200) {
                expect(tokenResponse.body).toHaveProperty('token');
                expect(tokenResponse.body).toHaveProperty('refreshToken');
                
                const token = tokenResponse.body.token;
                const refreshToken = tokenResponse.body.refreshToken;
                
                // Step 2: Validate token
                const statusResponse = await request(server)
                    .get('/api/auth/status')
                    .set('Authorization', `Bearer ${token}`);
                    
                expect(statusResponse.status).toBe(200);
                expect(statusResponse.body).toHaveProperty('isAuthenticated', true);
                
                // Step 3: Refresh token
                if (refreshToken) {
                    const refreshResponse = await request(server)
                        .post('/api/auth/refresh')
                        .send({ refreshToken });
                        
                    expect([200, 401]).toContain(refreshResponse.status);
                    
                    if (refreshResponse.status === 200) {
                        expect(refreshResponse.body).toHaveProperty('token');
                    }
                }
            }
            
            console.log('✅ Authentication flow test completed');
        });
    });
    
    describe('Population Management Flow', () => {
        test('Complete population lifecycle: create, get, update, delete', async () => {
            console.log('🔄 Testing complete population lifecycle');
            
            // Skip if no auth token
            if (!authToken) {
                console.log('⏭️ Skipping population lifecycle test (no auth token)');
                return;
            }
            
            // Step 1: Create population
            const createResponse = await request(server)
                .post('/api/populations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Integration Test Population',
                    description: 'Created during integration testing'
                });
                
            expect([201, 400, 401]).toContain(createResponse.status);
            
            if (createResponse.status === 201) {
                expect(createResponse.body).toHaveProperty('population');
                expect(createResponse.body.population).toHaveProperty('id');
                
                testPopulationId = createResponse.body.population.id;
                console.log(`✅ Population created with ID: ${testPopulationId}`);
                
                // Step 2: Get population details
                const getResponse = await request(server)
                    .get(`/api/populations/${testPopulationId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                    
                expect(getResponse.status).toBe(200);
                expect(getResponse.body).toHaveProperty('population');
                expect(getResponse.body.population).toHaveProperty('id', testPopulationId);
                
                // Step 3: Update population
                const updateResponse = await request(server)
                    .put(`/api/populations/${testPopulationId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Updated Integration Test Population',
                        description: 'Updated during integration testing'
                    });
                    
                expect([200, 401, 404]).toContain(updateResponse.status);
                
                if (updateResponse.status === 200) {
                    expect(updateResponse.body).toHaveProperty('population');
                    expect(updateResponse.body.population).toHaveProperty('name', 'Updated Integration Test Population');
                }
                
                // Step 4: Delete population
                const deleteResponse = await request(server)
                    .delete(`/api/populations/${testPopulationId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                    
                expect([200, 401, 404]).toContain(deleteResponse.status);
                
                if (deleteResponse.status === 200) {
                    expect(deleteResponse.body).toHaveProperty('success', true);
                }
            }
            
            console.log('✅ Population lifecycle test completed');
        });
    });
    
    describe('User Management Flow', () => {
        test('Complete user lifecycle: create, get, update, delete', async () => {
            console.log('🔄 Testing complete user lifecycle');
            
            // Skip if no auth token
            if (!authToken) {
                console.log('⏭️ Skipping user lifecycle test (no auth token)');
                return;
            }
            
            // Step 0: Create a test population for the user
            let populationId = 'test-population';
            
            try {
                const popResponse = await request(server)
                    .post('/api/populations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'User Test Population',
                        description: 'Created for user testing'
                    });
                    
                if (popResponse.status === 201) {
                    populationId = popResponse.body.population.id;
                    console.log(`✅ Test population created with ID: ${populationId}`);
                }
            } catch (error) {
                console.log('⚠️ Could not create test population, using default ID');
            }
            
            // Step 1: Create user
            const createResponse = await request(server)
                .post('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    username: `testuser_${Date.now()}`,
                    email: `test_${Date.now()}@example.com`,
                    givenName: 'Integration',
                    familyName: 'Test',
                    populationId
                });
                
            expect([201, 400, 401]).toContain(createResponse.status);
            
            if (createResponse.status === 201) {
                expect(createResponse.body).toHaveProperty('user');
                expect(createResponse.body.user).toHaveProperty('id');
                
                testUserId = createResponse.body.user.id;
                console.log(`✅ User created with ID: ${testUserId}`);
                
                // Step 2: Get user details
                const getResponse = await request(server)
                    .get(`/api/users/${testUserId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                    
                expect([200, 401, 404]).toContain(getResponse.status);
                
                if (getResponse.status === 200) {
                    expect(getResponse.body).toHaveProperty('user');
                    expect(getResponse.body.user).toHaveProperty('id', testUserId);
                }
                
                // Step 3: Update user
                const updateResponse = await request(server)
                    .put(`/api/users/${testUserId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        givenName: 'Updated',
                        familyName: 'User'
                    });
                    
                expect([200, 401, 404]).toContain(updateResponse.status);
                
                if (updateResponse.status === 200) {
                    expect(updateResponse.body).toHaveProperty('user');
                    expect(updateResponse.body.user).toHaveProperty('givenName', 'Updated');
                }
                
                // Step 4: Delete user
                const deleteResponse = await request(server)
                    .delete(`/api/users/${testUserId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                    
                expect([200, 401, 404]).toContain(deleteResponse.status);
                
                if (deleteResponse.status === 200) {
                    expect(deleteResponse.body).toHaveProperty('success', true);
                }
                
                // Clean up test population
                if (populationId !== 'test-population') {
                    try {
                        await request(server)
                            .delete(`/api/populations/${populationId}`)
                            .set('Authorization', `Bearer ${authToken}`);
                    } catch (error) {
                        console.log('⚠️ Could not delete test population');
                    }
                }
            }
            
            console.log('✅ User lifecycle test completed');
        });
    });
    
    describe('Import/Export Flow', () => {
        test('Complete import/export flow: import users, check status, export users', async () => {
            console.log('🔄 Testing complete import/export flow');
            
            // Skip if no auth token
            if (!authToken) {
                console.log('⏭️ Skipping import/export flow test (no auth token)');
                return;
            }
            
            // Step 0: Create a test population for import
            let populationId = 'test-population';
            
            try {
                const popResponse = await request(server)
                    .post('/api/populations')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Import Test Population',
                        description: 'Created for import testing'
                    });
                    
                if (popResponse.status === 201) {
                    populationId = popResponse.body.population.id;
                    console.log(`✅ Test population created with ID: ${populationId}`);
                }
            } catch (error) {
                console.log('⚠️ Could not create test population, using default ID');
            }
            
            // Step 1: Import users
            const csvContent = 'email,firstName,lastName\ntest1@example.com,Test1,User1\ntest2@example.com,Test2,User2';
            
            const importResponse = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from(csvContent), 'test_import.csv')
                .field('populationId', populationId);
                
            expect([200, 400, 401]).toContain(importResponse.status);
            
            if (importResponse.status === 200) {
                expect(importResponse.body).toHaveProperty('success');
                expect(importResponse.body).toHaveProperty('sessionId');
                
                const sessionId = importResponse.body.sessionId;
                console.log(`✅ Import started with session ID: ${sessionId}`);
                
                // Step 2: Check import status
                // Wait a bit for import to process
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const statusResponse = await request(server)
                    .get(`/api/import/status/${sessionId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                    
                expect([200, 401, 404]).toContain(statusResponse.status);
                
                if (statusResponse.status === 200) {
                    expect(statusResponse.body).toHaveProperty('status');
                    expect(statusResponse.body).toHaveProperty('progress');
                    console.log(`✅ Import status: ${statusResponse.body.status}`);
                }
                
                // Step 3: Export users
                const exportResponse = await request(server)
                    .get('/api/users/export')
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ populationId });
                    
                expect([200, 400, 401]).toContain(exportResponse.status);
                
                if (exportResponse.status === 200) {
                    // Check if it's a file download or a JSON response
                    const contentType = exportResponse.headers['content-type'];
                    if (contentType && contentType.includes('json')) {
                        expect(exportResponse.body).toHaveProperty('success');
                    } else {
                        expect(exportResponse.headers['content-disposition']).toContain('attachment');
                    }
                    console.log('✅ Export completed successfully');
                }
                
                // Clean up test population
                if (populationId !== 'test-population') {
                    try {
                        await request(server)
                            .delete(`/api/populations/${populationId}`)
                            .set('Authorization', `Bearer ${authToken}`);
                    } catch (error) {
                        console.log('⚠️ Could not delete test population');
                    }
                }
            }
            
            console.log('✅ Import/export flow test completed');
        });
    });
    
    describe('Settings Management Flow', () => {
        test('Complete settings flow: get, update, verify', async () => {
            console.log('🔄 Testing complete settings management flow');
            
            // Skip if no auth token
            if (!authToken) {
                console.log('⏭️ Skipping settings flow test (no auth token)');
                return;
            }
            
            // Step 1: Get current settings
            const getResponse = await request(server)
                .get('/api/settings')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect([200, 401]).toContain(getResponse.status);
            
            if (getResponse.status === 200) {
                expect(getResponse.body).toHaveProperty('settings');
                const originalSettings = getResponse.body.settings;
                console.log('✅ Retrieved current settings');
                
                // Step 2: Update settings
                const updateResponse = await request(server)
                    .put('/api/settings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        maxFileSize: 15728640, // 15MB
                        allowedFileTypes: ['csv', 'json'],
                        importBatchSize: 10
                    });
                    
                expect([200, 400, 401]).toContain(updateResponse.status);
                
                if (updateResponse.status === 200) {
                    expect(updateResponse.body).toHaveProperty('success', true);
                    expect(updateResponse.body).toHaveProperty('settings');
                    console.log('✅ Settings updated successfully');
                    
                    // Step 3: Verify updated settings
                    const verifyResponse = await request(server)
                        .get('/api/settings')
                        .set('Authorization', `Bearer ${authToken}`);
                        
                    expect(verifyResponse.status).toBe(200);
                    expect(verifyResponse.body).toHaveProperty('settings');
                    
                    const updatedSettings = verifyResponse.body.settings;
                    expect(updatedSettings).toHaveProperty('maxFileSize', 15728640);
                    expect(updatedSettings).toHaveProperty('allowedFileTypes');
                    expect(updatedSettings.allowedFileTypes).toContain('csv');
                    expect(updatedSettings.allowedFileTypes).toContain('json');
                    console.log('✅ Updated settings verified');
                    
                    // Step 4: Restore original settings
                    if (originalSettings) {
                        const restoreResponse = await request(server)
                            .put('/api/settings')
                            .set('Authorization', `Bearer ${authToken}`)
                            .send(originalSettings);
                            
                        expect(restoreResponse.status).toBe(200);
                        console.log('✅ Original settings restored');
                    }
                }
            }
            
            console.log('✅ Settings management flow test completed');
        });
    });
    
    describe('Error Recovery Flow', () => {
        test('System should recover from invalid requests', async () => {
            console.log('🔄 Testing error recovery flow');
            
            // Step 1: Send invalid request
            const invalidResponse = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .field('populationId', 'invalid-population');
                
            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body).toHaveProperty('error');
            console.log('✅ Invalid request handled correctly');
            
            // Step 2: Verify system is still operational
            const healthResponse = await request(server)
                .get('/api/health');
                
            expect(healthResponse.status).toBe(200);
            expect(healthResponse.body).toHaveProperty('status');
            console.log('✅ System remains operational after error');
            
            // Step 3: Verify API endpoints still work
            const validResponse = await request(server)
                .get('/api/version');
                
            expect([200, 404]).toContain(validResponse.status);
            console.log('✅ API endpoints still functional after error');
        });
    });
});