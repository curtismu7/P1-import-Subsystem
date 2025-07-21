/**
 * @fileoverview Real API Integration Tests for PingOne Import Tool
 * 
 * These tests make actual HTTP requests to the real API endpoints
 * using real PingOne credentials from environment variables.
 * 
 * IMPORTANT: These tests run against a TEST environment, not production.
 * All created data is cleaned up after tests complete.
 * 
 * Environment Variables Required:
 * - PINGONE_TEST_CLIENT_ID: Test environment client ID
 * - PINGONE_TEST_CLIENT_SECRET: Test environment client secret  
 * - PINGONE_TEST_ENVIRONMENT_ID: Test environment ID
 * - PINGONE_TEST_REGION: Test region (NorthAmerica, Europe, AsiaPacific)
 * - API_BASE_URL: Base URL for the API (default: http://localhost:4000)
 * 
 * Security Features:
 * - Credentials loaded from environment variables only
 * - Test environment validation
 * - Automatic cleanup of created data
 * - Guards against production environment
 * - Detailed Winston logging for debugging
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWinstonLogger } from '../../server/winston-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Winston logger for tests
const logger = createWinstonLogger({
    service: 'pingone-import-tests',
    env: 'test',
    enableFileLogging: false
});

// Test configuration and validation
const TEST_CONFIG = {
    // API Configuration
    baseURL: process.env.API_BASE_URL || 'http://localhost:4000',
    timeout: 30000, // 30 seconds
    
    // PingOne Test Environment
    pingOne: {
        clientId: process.env.PINGONE_TEST_CLIENT_ID,
        clientSecret: process.env.PINGONE_TEST_CLIENT_SECRET,
        environmentId: process.env.PINGONE_TEST_ENVIRONMENT_ID,
        region: process.env.PINGONE_TEST_REGION || 'NorthAmerica'
    },
    
    // Test Data
    testPopulation: {
        name: `Test Population ${Date.now()}`,
        description: 'Temporary population for integration tests'
    },
    
    testUsers: [
        {
            username: `test.user.${Date.now()}@example.com`,
            email: `test.user.${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User',
            enabled: true
        },
        {
            username: `test.user2.${Date.now()}@example.com`, 
            email: `test.user2.${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User2',
            enabled: true
        }
    ],
    
    // Cleanup tracking
    createdData: {
        populations: [],
        users: [],
        sessions: []
    }
};

// Environment validation
const validateTestEnvironment = () => {
    const errors = [];
    
    // Check for required environment variables
    if (!TEST_CONFIG.pingOne.clientId) {
        errors.push('PINGONE_TEST_CLIENT_ID is required');
    }
    if (!TEST_CONFIG.pingOne.clientSecret) {
        errors.push('PINGONE_TEST_CLIENT_SECRET is required');
    }
    if (!TEST_CONFIG.pingOne.environmentId) {
        errors.push('PINGONE_TEST_ENVIRONMENT_ID is required');
    }
    
    // Validate region
    const validRegions = ['NorthAmerica', 'Europe', 'AsiaPacific'];
    if (!validRegions.includes(TEST_CONFIG.pingOne.region)) {
        errors.push(`PINGONE_TEST_REGION must be one of: ${validRegions.join(', ')}`);
    }
    
    // Prevent accidental production runs
    if (process.env.NODE_ENV === 'production') {
        errors.push('Integration tests cannot run in production environment');
    }
    
    if (errors.length > 0) {
        throw new Error(`Test environment validation failed:\n${errors.join('\n')}`);
    }
    
    logger.info('Test environment validated successfully', {
        apiBaseUrl: TEST_CONFIG.baseURL,
        pingOneRegion: TEST_CONFIG.pingOne.region,
        environmentId: TEST_CONFIG.pingOne.environmentId
    });
};

// Enhanced axios instance with Winston logging
const createApiClient = () => {
    const client = axios.create({
        baseURL: TEST_CONFIG.baseURL,
        timeout: TEST_CONFIG.timeout,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PingOne-Import-Test/1.0'
        }
    });
    
    // Request interceptor for Winston logging
    client.interceptors.request.use(
        (config) => {
            logger.info('API Request', {
                method: config.method?.toUpperCase(),
                url: config.url,
                hasData: !!config.data
            });
            
            if (config.data) {
                logger.debug('Request Data', { data: JSON.stringify(config.data, null, 2) });
            }
            return config;
        },
        (error) => {
            logger.error('Request Error', { error: error.message });
            return Promise.reject(error);
        }
    );
    
    // Response interceptor for Winston logging
    client.interceptors.response.use(
        (response) => {
            logger.info('API Response', {
                status: response.status,
                method: response.config.method?.toUpperCase(),
                url: response.config.url
            });
            
            if (response.data) {
                logger.debug('Response Data', { data: JSON.stringify(response.data, null, 2) });
            }
            return response;
        },
        (error) => {
            logger.error('API Response Error', {
                status: error.response?.status || 'NO_RESPONSE',
                method: error.config?.method?.toUpperCase(),
                url: error.config?.url,
                error: error.response?.data || error.message
            });
            return Promise.reject(error);
        }
    );
    
    return client;
};

// Test utilities
const testUtils = {
    /**
     * Create a test CSV file with user data
     */
    createTestCSV: (users) => {
        const csvContent = [
            'username,email,firstName,lastName,enabled',
            ...users.map(user => 
                `${user.username},${user.email},${user.firstName},${user.lastName},${user.enabled}`
            )
        ].join('\n');
        
        const tempPath = path.join(__dirname, `temp-test-users-${Date.now()}.csv`);
        fs.writeFileSync(tempPath, csvContent);
        logger.debug('Test CSV file created', { path: tempPath, userCount: users.length });
        return tempPath;
    },
    
    /**
     * Clean up test files
     */
    cleanupTestFiles: () => {
        const testDir = __dirname;
        const files = fs.readdirSync(testDir);
        files.forEach(file => {
            if (file.startsWith('temp-test-users-') && file.endsWith('.csv')) {
                fs.unlinkSync(path.join(testDir, file));
                logger.debug('Test file cleaned up', { file });
            }
        });
    },
    
    /**
     * Wait for a specified time
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    /**
     * Generate unique test data
     */
    generateUniqueId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

// Cleanup functions
const cleanup = {
    /**
     * Clean up all created test data
     */
    async cleanupAllData() {
        logger.info('Starting cleanup of test data');
        
        try {
            const api = createApiClient();
            
            // Clean up users
            for (const userId of TEST_CONFIG.createdData.users) {
                try {
                    await api.delete(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/users/${userId}`);
                    logger.debug('User cleaned up', { userId });
                } catch (error) {
                    logger.warn('Failed to cleanup user', { userId, error: error.message });
                }
            }
            
            // Clean up populations
            for (const populationId of TEST_CONFIG.createdData.populations) {
                try {
                    await api.delete(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations/${populationId}`);
                    logger.debug('Population cleaned up', { populationId });
                } catch (error) {
                    logger.warn('Failed to cleanup population', { populationId, error: error.message });
                }
            }
            
            // Clean up test files
            testUtils.cleanupTestFiles();
            
            logger.info('Cleanup completed successfully');
        } catch (error) {
            logger.error('Cleanup failed', { error: error.message });
        }
    }
};

// Main test suite
describe('Real API Integration Tests', () => {
    let api;
    
    beforeAll(async () => {
        // Validate test environment
        validateTestEnvironment();
        
        // Create API client
        api = createApiClient();
        
        logger.info('Starting real API integration tests');
    });
    
    afterAll(async () => {
        // Clean up all test data
        await cleanup.cleanupAllData();
        logger.info('Integration tests completed');
    });
    
    describe('Health and Status Endpoints', () => {
        test('should return server health status', async () => {
            const response = await api.get('/api/health');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('status');
            expect(response.data).toHaveProperty('timestamp');
            expect(response.data).toHaveProperty('server');
            expect(response.data).toHaveProperty('system');
            expect(response.data).toHaveProperty('checks');
            
            // Validate health check structure
            expect(response.data.server).toHaveProperty('isInitialized');
            expect(response.data.system).toHaveProperty('node');
            expect(response.data.system).toHaveProperty('platform');
            expect(response.data.checks).toHaveProperty('pingOneConfigured');
        });
        
        test('should return detailed system information', async () => {
            const response = await api.get('/api/health');
            
            expect(response.data.system).toMatchObject({
                node: expect.any(String),
                platform: expect.any(String),
                memory: expect.any(Object),
                env: expect.any(String),
                pid: expect.any(Number)
            });
            
            // Validate memory usage structure
            expect(response.data.system.memory).toHaveProperty('heapUsed');
            expect(response.data.system.memory).toHaveProperty('heapTotal');
            expect(response.data.system.memory).toHaveProperty('external');
            expect(response.data.system.memory).toHaveProperty('rss');
        });
    });
    
    describe('Settings Management', () => {
        test('should retrieve current settings', async () => {
            const response = await api.get('/api/settings');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('environmentId');
            expect(response.data).toHaveProperty('region');
            expect(response.data).toHaveProperty('apiClientId');
            expect(response.data).toHaveProperty('connectionStatus');
        });
        
        test('should update settings successfully', async () => {
            const testSettings = {
                environmentId: TEST_CONFIG.pingOne.environmentId,
                region: TEST_CONFIG.pingOne.region,
                apiClientId: TEST_CONFIG.pingOne.clientId,
                rateLimit: 100,
                autoSave: true,
                theme: 'dark'
            };
            
            const response = await api.post('/api/settings', testSettings);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success', true);
            expect(response.data).toHaveProperty('message');
            expect(response.data).toHaveProperty('settings');
            
            // Verify settings were updated
            const getResponse = await api.get('/api/settings');
            expect(getResponse.data.environmentId).toBe(testSettings.environmentId);
            expect(getResponse.data.region).toBe(testSettings.region);
        });
        
        test('should validate required fields', async () => {
            const invalidSettings = {
                environmentId: '', // Invalid empty environment ID
                region: 'InvalidRegion'
            };
            
            try {
                await api.post('/api/settings', invalidSettings);
                fail('Should have thrown an error for invalid settings');
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data).toHaveProperty('error');
                expect(error.response.data).toHaveProperty('message');
            }
        });
    });
    
    describe('PingOne API Integration', () => {
        test('should authenticate with PingOne API', async () => {
            // Test authentication by making a simple API call
            const response = await api.get(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data._embedded.populations)).toBe(true);
        });
        
        test('should create and delete test population', async () => {
            // Create test population
            const createResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: TEST_CONFIG.testPopulation.name,
                description: TEST_CONFIG.testPopulation.description
            });
            
            expect(createResponse.status).toBe(201);
            expect(createResponse.data).toHaveProperty('id');
            expect(createResponse.data.name).toBe(TEST_CONFIG.testPopulation.name);
            
            const populationId = createResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Verify population was created
            const getResponse = await api.get(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations/${populationId}`);
            expect(getResponse.status).toBe(200);
            expect(getResponse.data.id).toBe(populationId);
            expect(getResponse.data.name).toBe(TEST_CONFIG.testPopulation.name);
        });
        
        test('should create and delete test users', async () => {
            // First create a test population
            const populationResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: `Test Population Users ${Date.now()}`,
                description: 'Population for user creation tests'
            });
            
            const populationId = populationResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Create test users
            for (const userData of TEST_CONFIG.testUsers) {
                const createResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/users`, {
                    username: userData.username,
                    email: userData.email,
                    name: {
                        given: userData.firstName,
                        family: userData.lastName
                    },
                    enabled: userData.enabled,
                    population: {
                        id: populationId
                    }
                });
                
                expect(createResponse.status).toBe(201);
                expect(createResponse.data).toHaveProperty('id');
                expect(createResponse.data.username).toBe(userData.username);
                
                TEST_CONFIG.createdData.users.push(createResponse.data.id);
            }
            
            // Verify users were created
            const usersResponse = await api.get(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/users`);
            expect(usersResponse.status).toBe(200);
            
            const createdUsers = usersResponse.data._embedded.users.filter(user => 
                TEST_CONFIG.testUsers.some(testUser => testUser.username === user.username)
            );
            expect(createdUsers.length).toBe(TEST_CONFIG.testUsers.length);
        });
    });
    
    describe('User Import Operations', () => {
        test('should import users from CSV file', async () => {
            // Create test population
            const populationResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: `Import Test Population ${Date.now()}`,
                description: 'Population for import tests'
            });
            
            const populationId = populationResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Create test CSV file
            const csvPath = testUtils.createTestCSV(TEST_CONFIG.testUsers);
            
            try {
                // Create form data for file upload
                const formData = new FormData();
                formData.append('file', fs.createReadStream(csvPath));
                formData.append('populationId', populationId);
                formData.append('populationName', 'Import Test Population');
                formData.append('totalUsers', TEST_CONFIG.testUsers.length.toString());
                
                const response = await api.post('/api/import', formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('success', true);
                expect(response.data).toHaveProperty('sessionId');
                expect(response.data).toHaveProperty('totalUsers');
                expect(response.data.totalUsers).toBe(TEST_CONFIG.testUsers.length);
                
                // Track session for cleanup
                TEST_CONFIG.createdData.sessions.push(response.data.sessionId);
                
                // Wait for import to complete
                await testUtils.wait(5000);
                
                // Verify users were imported
                const usersResponse = await api.get(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations/${populationId}/users`);
                expect(usersResponse.status).toBe(200);
                
                const importedUsers = usersResponse.data._embedded.users.filter(user => 
                    TEST_CONFIG.testUsers.some(testUser => testUser.username === user.username)
                );
                expect(importedUsers.length).toBe(TEST_CONFIG.testUsers.length);
                
            } finally {
                // Clean up CSV file
                if (fs.existsSync(csvPath)) {
                    fs.unlinkSync(csvPath);
                }
            }
        });
        
        test('should handle import progress tracking', async () => {
            // Create test population
            const populationResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: `Progress Test Population ${Date.now()}`,
                description: 'Population for progress tracking tests'
            });
            
            const populationId = populationResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Create test CSV file
            const csvPath = testUtils.createTestCSV(TEST_CONFIG.testUsers);
            
            try {
                // Start import
                const formData = new FormData();
                formData.append('file', fs.createReadStream(csvPath));
                formData.append('populationId', populationId);
                formData.append('populationName', 'Progress Test Population');
                formData.append('totalUsers', TEST_CONFIG.testUsers.length.toString());
                
                const importResponse = await api.post('/api/import', formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                const sessionId = importResponse.data.sessionId;
                TEST_CONFIG.createdData.sessions.push(sessionId);
                
                // Test progress endpoint (SSE)
                const progressResponse = await api.get(`/api/import/progress/${sessionId}`, {
                    headers: {
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                expect(progressResponse.status).toBe(200);
                expect(progressResponse.headers['content-type']).toContain('text/event-stream');
                
            } finally {
                // Clean up CSV file
                if (fs.existsSync(csvPath)) {
                    fs.unlinkSync(csvPath);
                }
            }
        });
    });
    
    describe('User Export Operations', () => {
        test('should export users from population', async () => {
            // Create test population with users
            const populationResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: `Export Test Population ${Date.now()}`,
                description: 'Population for export tests'
            });
            
            const populationId = populationResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Create test users
            for (const userData of TEST_CONFIG.testUsers) {
                const createResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/users`, {
                    username: userData.username,
                    email: userData.email,
                    name: {
                        given: userData.firstName,
                        family: userData.lastName
                    },
                    enabled: userData.enabled,
                    population: {
                        id: populationId
                    }
                });
                
                TEST_CONFIG.createdData.users.push(createResponse.data.id);
            }
            
            // Export users in JSON format
            const exportResponse = await api.post('/api/export-users', {
                populationId: populationId,
                format: 'json',
                includeDisabled: false
            });
            
            expect(exportResponse.status).toBe(200);
            expect(exportResponse.data).toHaveProperty('success', true);
            expect(exportResponse.data).toHaveProperty('data');
            expect(Array.isArray(exportResponse.data.data)).toBe(true);
            expect(exportResponse.data).toHaveProperty('total');
            expect(exportResponse.data.total).toBeGreaterThan(0);
            
            // Verify exported data structure
            const exportedUser = exportResponse.data.data[0];
            expect(exportedUser).toHaveProperty('id');
            expect(exportedUser).toHaveProperty('username');
            expect(exportedUser).toHaveProperty('email');
            expect(exportedUser).toHaveProperty('enabled');
        });
        
        test('should export users in CSV format', async () => {
            // Create test population with users
            const populationResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/populations`, {
                name: `CSV Export Test Population ${Date.now()}`,
                description: 'Population for CSV export tests'
            });
            
            const populationId = populationResponse.data.id;
            TEST_CONFIG.createdData.populations.push(populationId);
            
            // Create test users
            for (const userData of TEST_CONFIG.testUsers) {
                const createResponse = await api.post(`/api/pingone/environments/${TEST_CONFIG.pingOne.environmentId}/users`, {
                    username: userData.username,
                    email: userData.email,
                    name: {
                        given: userData.firstName,
                        family: userData.lastName
                    },
                    enabled: userData.enabled,
                    population: {
                        id: populationId
                    }
                });
                
                TEST_CONFIG.createdData.users.push(createResponse.data.id);
            }
            
            // Export users in CSV format
            const exportResponse = await api.post('/api/export-users', {
                populationId: populationId,
                format: 'csv',
                includeDisabled: false
            }, {
                headers: {
                    'Accept': 'text/csv'
                }
            });
            
            expect(exportResponse.status).toBe(200);
            expect(exportResponse.headers['content-type']).toContain('text/csv');
            expect(typeof exportResponse.data).toBe('string');
            
            // Verify CSV content
            const csvLines = exportResponse.data.split('\n');
            expect(csvLines.length).toBeGreaterThan(1); // Header + data rows
            expect(csvLines[0]).toContain('username,email,firstName,lastName,enabled');
        });
    });
    
    describe('Feature Flags', () => {
        test('should retrieve feature flags', async () => {
            const response = await api.get('/api/feature-flags');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success', true);
            expect(response.data).toHaveProperty('flags');
            expect(typeof response.data.flags).toBe('object');
        });
        
        test('should update feature flag', async () => {
            const testFlag = 'A';
            const newState = true;
            
            const response = await api.post(`/api/feature-flags/${testFlag}`, {
                enabled: newState
            });
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success', true);
            expect(response.data).toHaveProperty('flag', testFlag);
            expect(response.data).toHaveProperty('enabled', newState);
        });
        
        test('should reset feature flags', async () => {
            const response = await api.post('/api/feature-flags/reset');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success', true);
            expect(response.data).toHaveProperty('message');
        });
    });
    
    describe('Logging Endpoints', () => {
        test('should retrieve application logs', async () => {
            const response = await api.get('/api/logs');
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('logs');
            expect(Array.isArray(response.data.logs)).toBe(true);
        });
        
        test('should create log entry', async () => {
            const logEntry = {
                level: 'info',
                message: `Test log entry ${Date.now()}`,
                details: {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            };
            
            const response = await api.post('/api/logs', logEntry);
            
            expect(response.status).toBe(200);
            expect(response.data).toHaveProperty('success', true);
            expect(response.data).toHaveProperty('message');
        });
    });
    
    describe('Error Handling', () => {
        test('should handle invalid endpoints gracefully', async () => {
            try {
                await api.get('/api/nonexistent-endpoint');
                fail('Should have thrown an error for nonexistent endpoint');
            } catch (error) {
                expect(error.response.status).toBe(404);
                expect(error.response.data).toHaveProperty('error');
                expect(error.response.data).toHaveProperty('message');
            }
        });
        
        test('should handle invalid request data', async () => {
            try {
                await api.post('/api/settings', {
                    invalidField: 'invalid value'
                });
                fail('Should have thrown an error for invalid request data');
            } catch (error) {
                expect(error.response.status).toBe(400);
                expect(error.response.data).toHaveProperty('error');
                expect(error.response.data).toHaveProperty('message');
            }
        });
        
        test('should handle authentication errors', async () => {
            try {
                await api.get('/api/pingone/environments/invalid-env-id/populations');
                fail('Should have thrown an error for invalid environment ID');
            } catch (error) {
                expect(error.response.status).toBe(401);
                expect(error.response.data).toHaveProperty('error');
            }
        });
    });
    
    describe('Performance and Limits', () => {
        test('should handle rate limiting', async () => {
            const requests = [];
            
            // Make multiple rapid requests
            for (let i = 0; i < 10; i++) {
                requests.push(api.get('/api/health'));
            }
            
            const responses = await Promise.all(requests);
            
            // All requests should succeed (rate limiting should be generous for tests)
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
        
        test('should handle timeout scenarios', async () => {
            // Test with a very short timeout
            const fastApi = axios.create({
                baseURL: TEST_CONFIG.baseURL,
                timeout: 1 // 1ms timeout
            });
            
            try {
                await fastApi.get('/api/health');
                fail('Should have timed out');
            } catch (error) {
                expect(error.code).toBe('ECONNABORTED');
            }
        });
    });
});

// Export for potential reuse
export { TEST_CONFIG, createApiClient, testUtils, cleanup }; 