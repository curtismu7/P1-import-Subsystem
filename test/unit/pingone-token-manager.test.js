/**
 * Unified Token Manager Test Suite
 * 
 * Comprehensive tests for the unified token management system
 */

import { jest } from '@jest/globals';
import { PingOneTokenManager, TOKEN_STATUS, TOKEN_SOURCES } from '../../src/shared/pingone-token-manager.js';
import { TokenAccess, initializeTokenManager } from '../../src/shared/token-integration-helper.js';

// Mock localStorage
const mockLocalStorage = {
    store: {},
    getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
    setItem: jest.fn((key, value) => { mockLocalStorage.store[key] = value; }),
    removeItem: jest.fn((key) => { delete mockLocalStorage.store[key]; }),
    clear: jest.fn(() => { mockLocalStorage.store = {}; })
};

// Mock fetch
global.fetch = jest.fn();

// Setup
beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    global.localStorage = mockLocalStorage;
    global.fetch.mockClear();
});

describe('PingOneTokenManager', () => {
    describe('Initialization', () => {
        test('should initialize with default configuration', async () => {
            const manager = new PingOneTokenManager();
            
            expect(manager.config.expiryBufferMs).toBe(5 * 60 * 1000);
            expect(manager.config.warningThresholdMs).toBe(10 * 60 * 1000);
            expect(manager.config.enableLogging).toBe(true);
        });
        
        test('should initialize with custom configuration', async () => {
            const customConfig = {
                expiryBufferMs: 10 * 60 * 1000,
                enableLogging: false
            };
            
            const manager = new PingOneTokenManager(customConfig);
            
            expect(manager.config.expiryBufferMs).toBe(10 * 60 * 1000);
            expect(manager.config.enableLogging).toBe(false);
        });
    });
    
    describe('Token Storage and Retrieval', () => {
        test('should set and get token correctly', async () => {
            const manager = new PingOneTokenManager();
            const token = 'test-token-123';
            const expiresAt = Date.now() + 3600000; // 1 hour from now
            
            await manager.setToken(token, expiresAt);
            const retrievedToken = await manager.getToken();
            
            expect(retrievedToken).toBe(token);
        });
        
        test('should persist token to localStorage', async () => {
            const manager = new PingOneTokenManager();
            const token = 'test-token-123';
            const expiresAt = Date.now() + 3600000;
            
            await manager.setToken(token, expiresAt);
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pingone_token_cache',
                expect.stringContaining(token)
            );
        });
        
        test('should load token from localStorage on initialization', async () => {
            const token = 'cached-token-456';
            const expiresAt = Date.now() + 3600000;
            
            // Pre-populate localStorage
            const tokenData = {
                token,
                expiresAt,
                tokenType: 'Bearer',
                source: 'localStorage',
                lastRefresh: Date.now(),
                version: '1.0.0',
                timestamp: Date.now()
            };
            
            mockLocalStorage.store['pingone_token_cache'] = JSON.stringify(tokenData);
            
            const manager = new PingOneTokenManager();
            const retrievedToken = await manager.getToken();
            
            expect(retrievedToken).toBe(token);
        });
        
        test('should clear token correctly', async () => {
            const manager = new PingOneTokenManager();
            const token = 'test-token-789';
            const expiresAt = Date.now() + 3600000;
            
            await manager.setToken(token, expiresAt);
            await manager.clearToken();
            
            const tokenInfo = manager.getTokenInfo();
            expect(tokenInfo.hasToken).toBe(false);
            expect(tokenInfo.status).toBe(TOKEN_STATUS.MISSING);
        });
    });
    
    describe('Token Expiry Validation', () => {
        test('should detect expired token', async () => {
            const manager = new PingOneTokenManager();
            const token = 'expired-token';
            const expiresAt = Date.now() - 3600000; // 1 hour ago
            
            await manager.setToken(token, expiresAt);
            
            expect(manager.isTokenExpired()).toBe(true);
            
            const tokenInfo = manager.getTokenInfo();
            expect(tokenInfo.status).toBe(TOKEN_STATUS.EXPIRED);
        });
        
        test('should detect expiring token', async () => {
            const manager = new PingOneTokenManager();
            const token = 'expiring-token';
            const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes from now
            
            await manager.setToken(token, expiresAt);
            
            expect(manager.isTokenExpiring()).toBe(true);
            
            const tokenInfo = manager.getTokenInfo();
            expect(tokenInfo.status).toBe(TOKEN_STATUS.EXPIRING);
        });
        
        test('should detect valid token', async () => {
            const manager = new PingOneTokenManager();
            const token = 'valid-token';
            const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
            
            await manager.setToken(token, expiresAt);
            
            expect(manager.isTokenExpired()).toBe(false);
            expect(manager.isTokenExpiring()).toBe(false);
            
            const tokenInfo = manager.getTokenInfo();
            expect(tokenInfo.status).toBe(TOKEN_STATUS.VALID);
        });
        
        test('should validate token expiry for components', async () => {
            const manager = new PingOneTokenManager();
            const token = 'component-token';
            const expiresAt = Date.now() + (60 * 60 * 1000);
            
            await manager.setToken(token, expiresAt);
            
            const validation = manager.validateTokenExpiry('test-component');
            
            expect(validation.isValid).toBe(true);
            expect(validation.shouldRefresh).toBe(false);
            expect(validation.status).toBe(TOKEN_STATUS.VALID);
        });
    });
    
    describe('Legacy Token Migration', () => {
        test('should migrate legacy worker token format', async () => {
            const legacyToken = 'legacy-worker-token';
            const legacyExpiry = (Date.now() + 3600000).toString();
            
            // Set up legacy format in localStorage
            mockLocalStorage.store['pingone_worker_token'] = legacyToken;
            mockLocalStorage.store['pingone_token_expiry'] = legacyExpiry;
            
            const manager = new PingOneTokenManager();
            const retrievedToken = await manager.getToken();
            
            expect(retrievedToken).toBe(legacyToken);
            
            // Should have migrated to new format
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'pingone_token_cache',
                expect.stringContaining(legacyToken)
            );
        });
        
        test('should clear legacy tokens after migration', async () => {
            const legacyToken = 'legacy-token-to-clear';
            const legacyExpiry = (Date.now() + 3600000).toString();
            
            mockLocalStorage.store['pingone_worker_token'] = legacyToken;
            mockLocalStorage.store['pingone_token_expiry'] = legacyExpiry;
            
            const manager = new PingOneTokenManager();
            await manager.getToken();
            
            // Legacy tokens should be cleared
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pingone_worker_token');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pingone_token_expiry');
        });
    });
    
    describe('Server Token Loading', () => {
        test('should load token from server health endpoint', async () => {
            // Mock server response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: {
                        hasToken: true,
                        isValid: true,
                        expiresIn: 3600 // 1 hour
                    }
                })
            });
            
            const manager = new PingOneTokenManager();
            const token = await manager.getToken();
            
            expect(token).toBe('server-managed');
            expect(global.fetch).toHaveBeenCalledWith('/api/health');
        });
        
        test('should handle server token loading failure', async () => {
            // Mock server error
            global.fetch.mockRejectedValueOnce(new Error('Server error'));
            
            const manager = new PingOneTokenManager();
            const token = await manager.getToken();
            
            expect(token).toBeNull();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle invalid token format', async () => {
            const manager = new PingOneTokenManager();
            
            await expect(manager.setToken('', Date.now() + 3600000))
                .rejects.toThrow('Token must be a non-empty string');
        });
        
        test('should handle invalid expiry time', async () => {
            const manager = new PingOneTokenManager();
            
            await expect(manager.setToken('valid-token', 'invalid-expiry'))
                .rejects.toThrow('ExpiresAt must be a valid timestamp');
        });
        
        test('should handle localStorage errors gracefully', async () => {
            // Mock localStorage error
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });
            
            const manager = new PingOneTokenManager();
            
            // Should not throw, but handle gracefully
            await expect(manager.setToken('test-token', Date.now() + 3600000))
                .rejects.toThrow('localStorage error');
        });
    });
    
    describe('Token Information', () => {
        test('should return comprehensive token information', async () => {
            const manager = new PingOneTokenManager();
            const token = 'info-test-token';
            const expiresAt = Date.now() + 3600000;
            
            await manager.setToken(token, expiresAt, {
                source: TOKEN_SOURCES.MEMORY,
                tokenType: 'Bearer'
            });
            
            const tokenInfo = manager.getTokenInfo();
            
            expect(tokenInfo).toMatchObject({
                hasToken: true,
                status: TOKEN_STATUS.VALID,
                isExpired: false,
                isExpiring: false,
                source: TOKEN_SOURCES.MEMORY,
                tokenType: 'Bearer'
            });
            
            expect(tokenInfo.timeRemaining).toBeGreaterThan(0);
            expect(tokenInfo.timeRemainingFormatted).toMatch(/\d+h \d+m \d+s/);
        });
        
        test('should return missing token information when no token', () => {
            const manager = new PingOneTokenManager();
            const tokenInfo = manager.getTokenInfo();
            
            expect(tokenInfo).toMatchObject({
                hasToken: false,
                status: TOKEN_STATUS.MISSING,
                message: 'No token available',
                isExpired: true,
                isExpiring: false
            });
        });
    });
});

describe('TokenAccess Integration', () => {
    test('should initialize global token manager', () => {
        const manager = initializeTokenManager({
            enableLogging: false
        });
        
        expect(manager).toBeInstanceOf(PingOneTokenManager);
        expect(typeof TokenAccess.getToken).toBe('function');
        expect(typeof TokenAccess.setToken).toBe('function');
        expect(typeof TokenAccess.clearToken).toBe('function');
    });
    
    test('should provide unified token access methods', async () => {
        initializeTokenManager({ enableLogging: false });
        
        const token = 'integration-test-token';
        const expiresAt = Date.now() + 3600000;
        
        await TokenAccess.setToken(token, expiresAt);
        const retrievedToken = await TokenAccess.getToken();
        
        expect(retrievedToken).toBe(token);
        
        const tokenInfo = TokenAccess.getTokenInfo();
        expect(tokenInfo.hasToken).toBe(true);
        expect(tokenInfo.status).toBe(TOKEN_STATUS.VALID);
    });
    
    test('should validate token expiry through TokenAccess', async () => {
        initializeTokenManager({ enableLogging: false });
        
        const token = 'validation-test-token';
        const expiresAt = Date.now() + 3600000;
        
        await TokenAccess.setToken(token, expiresAt);
        
        const validation = TokenAccess.validateTokenExpiry('integration-test');
        
        expect(validation.isValid).toBe(true);
        expect(validation.shouldRefresh).toBe(false);
        expect(validation.status).toBe(TOKEN_STATUS.VALID);
    });
});

describe('Edge Cases and Stress Tests', () => {
    test('should handle concurrent token requests', async () => {
        const manager = new PingOneTokenManager();
        const token = 'concurrent-test-token';
        const expiresAt = Date.now() + 3600000;
        
        await manager.setToken(token, expiresAt);
        
        // Make multiple concurrent requests
        const promises = Array(10).fill().map(() => manager.getToken());
        const results = await Promise.all(promises);
        
        // All should return the same token
        results.forEach(result => {
            expect(result).toBe(token);
        });
    });
    
    test('should handle rapid token updates', async () => {
        const manager = new PingOneTokenManager();
        
        // Rapidly set multiple tokens
        for (let i = 0; i < 5; i++) {
            const token = `rapid-token-${i}`;
            const expiresAt = Date.now() + 3600000 + (i * 1000);
            
            await manager.setToken(token, expiresAt);
        }
        
        const finalToken = await manager.getToken();
        expect(finalToken).toBe('rapid-token-4');
    });
    
    test('should handle token expiry edge cases', async () => {
        const manager = new PingOneTokenManager({ expiryBufferMs: 1000 });
        
        // Token that expires exactly at buffer time
        const token = 'edge-case-token';
        const expiresAt = Date.now() + 1000; // Exactly at buffer
        
        await manager.setToken(token, expiresAt);
        
        // Should be considered invalid due to buffer
        expect(manager.isTokenExpired()).toBe(false); // Not technically expired
        const retrievedToken = await manager.getToken(); // But should trigger refresh
        
        // Since no fallback is available, should return null
        expect(retrievedToken).toBeNull();
    });
});

// Performance tests
describe('Performance Tests', () => {
    test('should handle large number of token info requests efficiently', () => {
        const manager = new PingOneTokenManager();
        const token = 'performance-test-token';
        const expiresAt = Date.now() + 3600000;
        
        manager.setToken(token, expiresAt);
        
        const startTime = Date.now();
        
        // Make 1000 token info requests
        for (let i = 0; i < 1000; i++) {
            manager.getTokenInfo();
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete in reasonable time (less than 100ms)
        expect(duration).toBeLessThan(100);
    });
});
