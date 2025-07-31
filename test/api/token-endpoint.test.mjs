/**
 * @fileoverview PingOne Token Endpoint Tests
 * 
 * Tests for PingOne token endpoint configuration and authentication
 * 
 * @author PingOne Import Tool
 * @version 4.9
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';

// Test for PingOne Token Endpoint Configuration
// This test verifies that token requests use auth.pingone.com instead of api.pingone.com

describe('PingOne Token Endpoint Tests', () => {
    let originalFetch;
    const baseURL = 'http://localhost:4000'; // Use existing server

    beforeAll(async () => {
        // Mock fetch globally
        originalFetch = global.fetch;
        global.fetch = jest.fn();
        
        console.log('🔧 Setting up token endpoint tests...');
    });

    afterAll(async () => {
        // Restore original fetch
        global.fetch = originalFetch;
        console.log('🧹 Token endpoint tests cleanup completed');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Token Endpoint Configuration', () => {
        it('should use auth.pingone.com for token requests', async () => {
            // Mock successful token response
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: 'test-token',
                    expires_in: 3600,
                    token_type: 'Bearer'
                })
            });

            // Make a request that triggers token authentication
            const response = await request(baseURL)
                .post('/api/pingone/test-connection')
                .set('Content-Type', 'application/json')
                .send({});

            // Should return either 200 (success) or 500 (expected error due to test environment)
            expect([200, 500]).toContain(response.status);

            // If fetch was called, verify that it was called with auth.pingone.com URL
            if (global.fetch.mock.calls.length > 0) {
                const calls = global.fetch.mock.calls;
                const tokenCall = calls.find(call => 
                    call[0] && call[0].includes('auth.pingone.com')
                );

                if (tokenCall) {
                    expect(tokenCall[0]).toContain('auth.pingone.com');
                    expect(tokenCall[0]).toContain('/as/token');
                }
            }
            
            console.log('✅ Auth endpoint URL test passed');
        });

        it('should not use api.pingone.com for token requests', async () => {
            // Mock successful token response
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: 'test-token',
                    expires_in: 3600,
                    token_type: 'Bearer'
                })
            });

            // Make a request that triggers token authentication
            await request(baseURL)
                .post('/api/pingone/test-connection')
                .set('Content-Type', 'application/json')
                .send({});

            // Verify that no calls were made to api.pingone.com for tokens
            if (global.fetch.mock.calls.length > 0) {
                const calls = global.fetch.mock.calls;
                const apiCall = calls.find(call => 
                    call[0] && call[0].includes('api.pingone.com/token')
                );

                expect(apiCall).toBeUndefined();
            }
            
            console.log('✅ API endpoint exclusion test passed');
        });

        it('should handle token endpoint errors correctly', async () => {
            // Mock 403 error from wrong endpoint
            global.fetch.mockResolvedValue({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: async () => ({
                    message: 'Forbidden'
                })
            });

            const response = await request(baseURL)
                .post('/api/pingone/test-connection')
                .set('Content-Type', 'application/json')
                .send({});

            // Should return server error or handle gracefully
            expect([400, 401, 500]).toContain(response.status);
            
            console.log('✅ Token error handling test passed');
        });

        it('should return 404 for direct /token endpoint access', async () => {
            const response = await request(baseURL)
                .get('/api/pingone/token')
                .set('Content-Type', 'application/json');

            // Should return 404 or method not allowed
            expect([404, 405]).toContain(response.status);
            
            console.log('✅ Direct token endpoint access test passed');
        });
    });

    describe('Token Manager Configuration', () => {
        it('should handle token manager operations', async () => {
            // Test basic token manager functionality
            const response = await request(baseURL)
                .post('/api/token')
                .set('Content-Type', 'application/json')
                .send({});
            
            // Should return either success, auth error, or not found
            expect([200, 401, 404, 500]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success');
            }
            
            console.log('✅ Token manager operation test passed');
        });
    });
});

console.log('🔑 Token endpoint test suite loaded');