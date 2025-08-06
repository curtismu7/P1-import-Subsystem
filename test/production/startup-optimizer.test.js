/**
 * Startup Optimizer Tests
 * 
 * Tests for the production startup optimization system
 */

import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import startupOptimizer, { StartupOptimizer } from '../../src/server/services/startup-optimizer.js';

// Use real fetch for testing with mocking capabilities
global.fetch = jest.fn().mockImplementation((url, options) => {
  // Return a mock successful response by default
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      access_token: 'test-token',
      expires_in: 3600,
      _embedded: {
        populations: [
          { id: '1', name: 'Test Population 1' },
          { id: '2', name: 'Test Population 2' }
        ]
      }
    })
  });
});

describe('StartupOptimizer', () => {
    let optimizer;
    
    beforeEach(() => {
        optimizer = new StartupOptimizer();
        fetch.mockClear();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('initialization', () => {
        test('should initialize successfully with valid settings', async () => {
            // Mock successful settings load
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'test-env-id',
                apiClientId: 'test-client-id',
                apiSecret: 'test-secret',
                region: 'NorthAmerica'
            });
            
            // Mock successful token request
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    access_token: 'test-token',
                    expires_in: 3600
                })
            });
            
            // Mock successful populations request
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    _embedded: {
                        populations: [
                            { id: '1', name: 'Test Population 1' },
                            { id: '2', name: 'Test Population 2' }
                        ]
                    }
                })
            });
            
            const result = await optimizer.initialize();
            
            expect(result.success).toBe(true);
            expect(result.tokenCached).toBe(true);
            expect(result.populationsCached).toBe(true);
            expect(optimizer.isInitialized).toBe(true);
        });
        
        test('should handle missing settings gracefully', async () => {
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue(null);
            
            const result = await optimizer.initialize();
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('no_settings');
        });
        
        test('should handle token request failure gracefully', async () => {
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'test-env-id',
                apiClientId: 'test-client-id',
                apiSecret: 'test-secret'
            });
            
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });
            
            const result = await optimizer.initialize();
            
            // Should still succeed but without cached token
            expect(result.success).toBe(true);
            expect(result.tokenCached).toBe(false);
        });
    });
    
    describe('token management', () => {
        test('should cache token with proper expiry', async () => {
            const settings = {
                environmentId: 'test-env-id',
                apiClientId: 'test-client-id',
                apiSecret: 'test-secret'
            };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    access_token: 'test-token',
                    expires_in: 3600
                })
            });
            
            await optimizer._cacheWorkerToken(settings);
            
            expect(optimizer.cache.workerToken).toBe('test-token');
            expect(optimizer.cache.tokenExpiry).toBeGreaterThan(Date.now());
            expect(optimizer._isTokenValid()).toBe(true);
        });
        
        test('should detect expired tokens', () => {
            optimizer.cache.workerToken = 'expired-token';
            optimizer.cache.tokenExpiry = Date.now() - 1000; // 1 second ago
            
            expect(optimizer._isTokenValid()).toBe(false);
        });
        
        test('should return cached token when valid', () => {
            optimizer.cache.workerToken = 'valid-token';
            optimizer.cache.tokenExpiry = Date.now() + 3600000; // 1 hour from now
            
            const token = optimizer.getCachedToken();
            expect(token).toBe('valid-token');
        });
        
        test('should return null for expired token', () => {
            optimizer.cache.workerToken = 'expired-token';
            optimizer.cache.tokenExpiry = Date.now() - 1000;
            
            const token = optimizer.getCachedToken();
            expect(token).toBeNull();
        });
    });
    
    describe('population caching', () => {
        test('should cache populations successfully', async () => {
            const settings = { environmentId: 'test-env-id' };
            optimizer.cache.workerToken = 'valid-token';
            
            const mockPopulations = [
                { id: '1', name: 'Population B', description: 'Test' },
                { id: '2', name: 'Population A', description: 'Test' }
            ];
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    _embedded: { populations: mockPopulations }
                })
            });
            
            await optimizer._cachePopulations(settings);
            
            expect(optimizer.cache.populations).toHaveLength(2);
            // Should be sorted by name
            expect(optimizer.cache.populations[0].name).toBe('Population A');
            expect(optimizer.cache.populations[1].name).toBe('Population B');
        });
        
        test('should skip population caching without token', async () => {
            const settings = { environmentId: 'test-env-id' };
            optimizer.cache.workerToken = null;
            
            await optimizer._cachePopulations(settings);
            
            expect(optimizer.cache.populations).toBeNull();
            expect(fetch).not.toHaveBeenCalled();
        });
        
        test('should return cached populations when valid', () => {
            optimizer.cache.populations = [{ id: '1', name: 'Test' }];
            optimizer.cache.populationsLastFetched = Date.now();
            
            const populations = optimizer.getCachedPopulations();
            expect(populations).toHaveLength(1);
        });
        
        test('should return null for stale populations', () => {
            optimizer.cache.populations = [{ id: '1', name: 'Test' }];
            optimizer.cache.populationsLastFetched = Date.now() - (20 * 60 * 1000); // 20 minutes ago
            
            const populations = optimizer.getCachedPopulations();
            expect(populations).toBeNull();
        });
    });
    
    describe('health monitoring', () => {
        test('should return health status', () => {
            optimizer.cache.healthStatus = 'healthy';
            optimizer.isInitialized = true;
            optimizer.cache.workerToken = 'valid-token';
            optimizer.cache.tokenExpiry = Date.now() + 3600000;
            optimizer.cache.populations = [{ id: '1', name: 'Test' }];
            
            const health = optimizer.getHealthStatus();
            
            expect(health.status).toBe('healthy');
            expect(health.isInitialized).toBe(true);
            expect(health.tokenValid).toBe(true);
            expect(health.populationsCached).toBe(true);
        });
        
        test('should perform health check', async () => {
            optimizer.cache.workerToken = 'valid-token';
            optimizer.cache.tokenExpiry = Date.now() + 3600000;
            optimizer.cache.populations = [{ id: '1', name: 'Test' }];
            optimizer.cache.populationsLastFetched = Date.now();
            
            await optimizer._performHealthCheck();
            
            expect(optimizer.cache.healthStatus).toBe('healthy');
        });
    });
    
    describe('cache refresh', () => {
        test('should refresh cache successfully', async () => {
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'test-env-id',
                apiClientId: 'test-client-id',
                apiSecret: 'test-secret'
            });
            
            jest.spyOn(optimizer, '_cacheWorkerToken').mockResolvedValue();
            jest.spyOn(optimizer, '_cachePopulations').mockResolvedValue();
            
            const result = await optimizer.refreshCache();
            
            expect(result.success).toBe(true);
            expect(optimizer._cacheWorkerToken).toHaveBeenCalled();
            expect(optimizer._cachePopulations).toHaveBeenCalled();
        });
        
        test('should handle refresh failure', async () => {
            jest.spyOn(optimizer, '_loadSettings').mockRejectedValue(new Error('Settings error'));
            
            const result = await optimizer.refreshCache();
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Settings error');
        });
    });
});

describe('Singleton instance', () => {
    test('should export singleton instance', () => {
        expect(startupOptimizer).toBeInstanceOf(StartupOptimizer);
    });
    
    test('should maintain state across imports', async () => {
        startupOptimizer.testProperty = 'test-value';
        
        // Re-import to test singleton behavior
        const { default: reimportedOptimizer } = await import('../../src/server/services/startup-optimizer.js');
        
        expect(reimportedOptimizer.testProperty).toBe('test-value');
    });
});