/**
 * PingOne API Integration Tests
 * 
 * These tests make actual API calls to PingOne services to verify integration.
 * They require valid PingOne credentials to be configured.
 * 
 * Environment Variables Required:
 * - PINGONE_CLIENT_ID
 * - PINGONE_CLIENT_SECRET  
 * - PINGONE_ENVIRONMENT_ID
 * - PINGONE_REGION (optional, defaults to NA)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Skip these tests if credentials are not provided
const skipTests = !process.env.PINGONE_CLIENT_ID || 
                 !process.env.PINGONE_CLIENT_SECRET || 
                 !process.env.PINGONE_ENVIRONMENT_ID;

const testConfig = {
    clientId: process.env.PINGONE_CLIENT_ID,
    clientSecret: process.env.PINGONE_CLIENT_SECRET,
    environmentId: process.env.PINGONE_ENVIRONMENT_ID,
    region: process.env.PINGONE_REGION || 'NA'
};

// Region-specific API URLs
const regionUrls = {
    'NA': 'https://api.pingone.com',
    'CA': 'https://api.ca.pingone.ca', 
    'EU': 'https://api.eu.pingone.eu',
    'AU': 'https://api.au.pingone.com.au',
    'SG': 'https://api.sg.pingone.sg'
};

const baseUrl = regionUrls[testConfig.region] || regionUrls['NA'];

describe('PingOne API Integration Tests', () => {
    let accessToken = null;
    let testPopulationId = null;
    let testUserId = null;
    
    // Skip all tests if credentials not provided
    beforeAll(() => {
        if (skipTests) {
            console.log('⚠️  Skipping PingOne API integration tests - credentials not provided');
            console.log('   Set PINGONE_CLIENT_ID, PINGONE_CLIENT_SECRET, and PINGONE_ENVIRONMENT_ID to run these tests');
        }
    });

    describe('Authentication', () => {
        test('should obtain access token from PingOne', async () => {
            if (skipTests) return;
            
            console.log('🔐 [API TEST] Testing PingOne authentication...');
            
            const tokenUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/as/token`;
            
            const tokenData = {
                grant_type: 'client_credentials',
                client_id: testConfig.clientId,
                client_secret: testConfig.clientSecret
            };
            
            try {
                const response = await axios.post(tokenUrl, tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                });
                
                console.log('🔐 [API TEST] Authentication response:', {
                    status: response.status,
                    hasAccessToken: !!response.data.access_token,
                    tokenType: response.data.token_type,
                    expiresIn: response.data.expires_in
                });
                
                expect(response.status).toBe(200);
                expect(response.data.access_token).toBeDefined();
                expect(response.data.token_type).toBe('Bearer');
                expect(response.data.expires_in).toBeGreaterThan(0);
                
                accessToken = response.data.access_token;
                console.log('🔐 [API TEST] ✅ Authentication successful');
                
            } catch (error) {
                console.error('🔐 [API TEST] ❌ Authentication failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
        
        test('should validate token by making authenticated request', async () => {
            if (skipTests || !accessToken) return;
            
            console.log('🔍 [API TEST] Validating token with environment info request...');
            
            const envUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}`;
            
            try {
                const response = await axios.get(envUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('🔍 [API TEST] Environment info response:', {
                    status: response.status,
                    environmentId: response.data.id,
                    environmentName: response.data.name,
                    environmentType: response.data.type
                });
                
                expect(response.status).toBe(200);
                expect(response.data.id).toBe(testConfig.environmentId);
                expect(response.data.name).toBeDefined();
                
                console.log('🔍 [API TEST] ✅ Token validation successful');
                
            } catch (error) {
                console.error('🔍 [API TEST] ❌ Token validation failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
    });

    describe('Populations API', () => {
        test('should fetch populations list', async () => {
            if (skipTests || !accessToken) return;
            
            console.log('👥 [API TEST] Fetching populations list...');
            
            const populationsUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/populations`;
            
            try {
                const response = await axios.get(populationsUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('👥 [API TEST] Populations response:', {
                    status: response.status,
                    populationCount: response.data._embedded?.populations?.length || 0,
                    populations: response.data._embedded?.populations?.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description
                    })) || []
                });
                
                expect(response.status).toBe(200);
                expect(response.data._embedded).toBeDefined();
                expect(Array.isArray(response.data._embedded.populations)).toBe(true);
                
                // Store first population for user tests
                if (response.data._embedded.populations.length > 0) {
                    testPopulationId = response.data._embedded.populations[0].id;
                    console.log('👥 [API TEST] Using population for user tests:', testPopulationId);
                }
                
                console.log('👥 [API TEST] ✅ Populations fetch successful');
                
            } catch (error) {
                console.error('👥 [API TEST] ❌ Populations fetch failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
        
        test('should create a test population', async () => {
            if (skipTests || !accessToken) return;
            
            console.log('🏗️  [API TEST] Creating test population...');
            
            const populationsUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/populations`;
            const testPopulationName = `Test Population ${Date.now()}`;
            
            const populationData = {
                name: testPopulationName,
                description: 'Test population created by integration tests'
            };
            
            try {
                const response = await axios.post(populationsUrl, populationData, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('🏗️  [API TEST] Population creation response:', {
                    status: response.status,
                    populationId: response.data.id,
                    populationName: response.data.name,
                    description: response.data.description
                });
                
                expect(response.status).toBe(201);
                expect(response.data.id).toBeDefined();
                expect(response.data.name).toBe(testPopulationName);
                
                testPopulationId = response.data.id;
                console.log('🏗️  [API TEST] ✅ Test population created successfully');
                
            } catch (error) {
                console.error('🏗️  [API TEST] ❌ Population creation failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
    });

    describe('Users API', () => {
        test('should create a test user', async () => {
            if (skipTests || !accessToken || !testPopulationId) return;
            
            console.log('👤 [API TEST] Creating test user...');
            
            const usersUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/users`;
            const testEmail = `test.user.${Date.now()}@example.com`;
            
            const userData = {
                email: testEmail,
                username: testEmail,
                population: {
                    id: testPopulationId
                },
                name: {
                    given: 'Test',
                    family: 'User'
                },
                lifecycle: {
                    status: 'ACCOUNT_OK'
                }
            };
            
            try {
                const response = await axios.post(usersUrl, userData, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('👤 [API TEST] User creation response:', {
                    status: response.status,
                    userId: response.data.id,
                    email: response.data.email,
                    username: response.data.username,
                    populationId: response.data.population?.id
                });
                
                expect(response.status).toBe(201);
                expect(response.data.id).toBeDefined();
                expect(response.data.email).toBe(testEmail);
                expect(response.data.population.id).toBe(testPopulationId);
                
                testUserId = response.data.id;
                console.log('👤 [API TEST] ✅ Test user created successfully');
                
            } catch (error) {
                console.error('👤 [API TEST] ❌ User creation failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
        
        test('should fetch users from population', async () => {
            if (skipTests || !accessToken || !testPopulationId) return;
            
            console.log('📋 [API TEST] Fetching users from population...');
            
            const usersUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/users?filter=population.id eq "${testPopulationId}"`;
            
            try {
                const response = await axios.get(usersUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('📋 [API TEST] Users fetch response:', {
                    status: response.status,
                    userCount: response.data._embedded?.users?.length || 0,
                    users: response.data._embedded?.users?.map(u => ({
                        id: u.id,
                        email: u.email,
                        username: u.username
                    })) || []
                });
                
                expect(response.status).toBe(200);
                expect(response.data._embedded).toBeDefined();
                
                if (testUserId) {
                    const createdUser = response.data._embedded.users?.find(u => u.id === testUserId);
                    expect(createdUser).toBeDefined();
                    console.log('📋 [API TEST] Found created test user in population');
                }
                
                console.log('📋 [API TEST] ✅ Users fetch successful');
                
            } catch (error) {
                console.error('📋 [API TEST] ❌ Users fetch failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
        
        test('should update test user', async () => {
            if (skipTests || !accessToken || !testUserId) return;
            
            console.log('✏️  [API TEST] Updating test user...');
            
            const userUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/users/${testUserId}`;
            
            const updateData = {
                name: {
                    given: 'Updated',
                    family: 'TestUser'
                },
                nickname: 'UpdatedUser'
            };
            
            try {
                const response = await axios.patch(userUrl, updateData, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('✏️  [API TEST] User update response:', {
                    status: response.status,
                    userId: response.data.id,
                    givenName: response.data.name?.given,
                    familyName: response.data.name?.family,
                    nickname: response.data.nickname
                });
                
                expect(response.status).toBe(200);
                expect(response.data.name.given).toBe('Updated');
                expect(response.data.name.family).toBe('TestUser');
                expect(response.data.nickname).toBe('UpdatedUser');
                
                console.log('✏️  [API TEST] ✅ User update successful');
                
            } catch (error) {
                console.error('✏️  [API TEST] ❌ User update failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            }
        }, 15000);
    });

    describe('Cleanup', () => {
        test('should delete test user', async () => {
            if (skipTests || !accessToken || !testUserId) return;
            
            console.log('🗑️  [API TEST] Deleting test user...');
            
            const userUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/users/${testUserId}`;
            
            try {
                const response = await axios.delete(userUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('🗑️  [API TEST] User deletion response:', {
                    status: response.status
                });
                
                expect(response.status).toBe(204);
                console.log('🗑️  [API TEST] ✅ Test user deleted successfully');
                
            } catch (error) {
                console.error('🗑️  [API TEST] ❌ User deletion failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                // Don't throw error for cleanup - just log it
            }
        }, 15000);
        
        test('should delete test population', async () => {
            if (skipTests || !accessToken || !testPopulationId) return;
            
            console.log('🗑️  [API TEST] Deleting test population...');
            
            const populationUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/populations/${testPopulationId}`;
            
            try {
                const response = await axios.delete(populationUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log('🗑️  [API TEST] Population deletion response:', {
                    status: response.status
                });
                
                expect(response.status).toBe(204);
                console.log('🗑️  [API TEST] ✅ Test population deleted successfully');
                
            } catch (error) {
                console.error('🗑️  [API TEST] ❌ Population deletion failed:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
                // Don't throw error for cleanup - just log it
            }
        }, 15000);
    });

    describe('Error Handling', () => {
        test('should handle invalid token gracefully', async () => {
            if (skipTests) return;
            
            console.log('🚫 [API TEST] Testing invalid token handling...');
            
            const envUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}`;
            
            try {
                await axios.get(envUrl, {
                    headers: {
                        'Authorization': 'Bearer invalid-token-12345',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                // Should not reach here
                throw new Error('Expected 401 error but request succeeded');
                
            } catch (error) {
                console.log('🚫 [API TEST] Invalid token response:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    errorCode: error.response?.data?.code
                });
                
                expect(error.response.status).toBe(401);
                console.log('🚫 [API TEST] ✅ Invalid token handled correctly');
            }
        }, 15000);
        
        test('should handle non-existent resource gracefully', async () => {
            if (skipTests || !accessToken) return;
            
            console.log('🔍 [API TEST] Testing non-existent resource handling...');
            
            const nonExistentUserUrl = `${baseUrl}/v1/environments/${testConfig.environmentId}/users/non-existent-user-id`;
            
            try {
                await axios.get(nonExistentUserUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                // Should not reach here
                throw new Error('Expected 404 error but request succeeded');
                
            } catch (error) {
                console.log('🔍 [API TEST] Non-existent resource response:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    errorCode: error.response?.data?.code
                });
                
                expect(error.response.status).toBe(404);
                console.log('🔍 [API TEST] ✅ Non-existent resource handled correctly');
            }
        }, 15000);
    });
});