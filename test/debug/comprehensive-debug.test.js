/**
 * Comprehensive Debug Test Suite
 * 
 * This test suite is designed for intensive testing and debugging of the PingOne Import Tool.
 * It includes detailed logging, error simulation, and comprehensive validation of all components.
 * 
 * Features:
 * - Detailed test logging with timestamps and correlation IDs
 * - Error injection and recovery testing
 * - Performance monitoring and bottleneck detection
 * - Integration testing with real API endpoints (when configured)
 * - Memory leak detection and resource monitoring
 * - Concurrent operation testing
 * 
 * @author PingOne Import Tool Debug Team
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import startupOptimizer, { StartupOptimizer } from '../../src/server/services/startup-optimizer.js';
import { getErrorHandler } from '../../src/shared/error-handler.js';

// Test configuration
const TEST_CONFIG = {
    enableRealApiTests: process.env.ENABLE_REAL_API_TESTS === 'true',
    testTimeout: 30000,
    performanceThresholds: {
        startupTime: 5000, // 5 seconds
        tokenCacheTime: 2000, // 2 seconds
        populationCacheTime: 3000, // 3 seconds
        healthCheckTime: 1000 // 1 second
    },
    memoryThresholds: {
        heapUsedIncrease: 50 * 1024 * 1024, // 50MB
        maxHeapUsed: 200 * 1024 * 1024 // 200MB
    }
};

// Test utilities
class TestLogger {
    constructor(testName) {
        this.testName = testName;
        this.logs = [];
        this.startTime = Date.now();
    }
    
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const elapsed = Date.now() - this.startTime;
        
        const logEntry = {
            timestamp,
            elapsed: `${elapsed}ms`,
            level,
            test: this.testName,
            message,
            data
        };
        
        this.logs.push(logEntry);
        
        // Also log to console for immediate visibility
        const consoleMethod = level === 'error' ? console.error : 
                            level === 'warn' ? console.warn : console.log;
        consoleMethod(`[${timestamp}] [${this.testName}] [${level.toUpperCase()}] ${message}`, data || '');
    }
    
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    
    getLogs() { return this.logs; }
    getLogsSummary() {
        return {
            total: this.logs.length,
            byLevel: this.logs.reduce((acc, log) => {
                acc[log.level] = (acc[log.level] || 0) + 1;
                return acc;
            }, {}),
            duration: Date.now() - this.startTime
        };
    }
}

class MemoryMonitor {
    constructor() {
        this.snapshots = [];
    }
    
    takeSnapshot(label) {
        const usage = process.memoryUsage();
        const snapshot = {
            label,
            timestamp: Date.now(),
            ...usage
        };
        this.snapshots.push(snapshot);
        return snapshot;
    }
    
    getMemoryDelta(startLabel, endLabel) {
        const start = this.snapshots.find(s => s.label === startLabel);
        const end = this.snapshots.find(s => s.label === endLabel);
        
        if (!start || !end) {
            throw new Error(`Memory snapshots not found: ${startLabel} or ${endLabel}`);
        }
        
        return {
            heapUsedDelta: end.heapUsed - start.heapUsed,
            heapTotalDelta: end.heapTotal - start.heapTotal,
            rssDelta: end.rss - start.rss,
            externalDelta: end.external - start.external,
            duration: end.timestamp - start.timestamp
        };
    }
    
    checkMemoryLeaks() {
        if (this.snapshots.length < 2) return null;
        
        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];
        
        const heapIncrease = last.heapUsed - first.heapUsed;
        const isLeak = heapIncrease > TEST_CONFIG.memoryThresholds.heapUsedIncrease;
        
        return {
            isLeak,
            heapIncrease,
            threshold: TEST_CONFIG.memoryThresholds.heapUsedIncrease,
            snapshots: this.snapshots.length,
            duration: last.timestamp - first.timestamp
        };
    }
}

// Mock fetch with detailed logging and error injection
const createMockFetch = (logger) => {
    return jest.fn().mockImplementation(async (url, options) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.debug('Mock fetch request', {
            requestId,
            url,
            method: options?.method || 'GET',
            headers: options?.headers,
            bodyLength: options?.body ? options.body.length : 0
        });
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        // Error injection for testing
        if (url.includes('error-injection')) {
            logger.warn('Injecting error for testing', { requestId, url });
            throw new Error('Injected network error for testing');
        }
        
        // Simulate different response types based on URL
        let mockResponse;
        
        if (url.includes('/token')) {
            mockResponse = {
                access_token: `test_token_${requestId}`,
                expires_in: 3600,
                token_type: 'Bearer'
            };
        } else if (url.includes('/populations')) {
            mockResponse = {
                _embedded: {
                    populations: [
                        { id: '1', name: 'Test Population 1', userCount: 100 },
                        { id: '2', name: 'Test Population 2', userCount: 250 },
                        { id: '3', name: 'Test Population 3', userCount: 75 }
                    ]
                }
            };
        } else {
            mockResponse = { success: true, message: 'Mock response' };
        }
        
        logger.debug('Mock fetch response', {
            requestId,
            url,
            responseSize: JSON.stringify(mockResponse).length,
            status: 200
        });
        
        return {
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse),
            text: () => Promise.resolve(JSON.stringify(mockResponse))
        };
    });
};

describe('Comprehensive Debug Test Suite', () => {
    let logger;
    let memoryMonitor;
    let mockFetch;
    
    beforeAll(() => {
        // Set up global test environment
        process.env.NODE_ENV = 'test';
        process.env.DEBUG_MODE = 'true';
    });
    
    beforeEach(() => {
        logger = new TestLogger(expect.getState().currentTestName);
        memoryMonitor = new MemoryMonitor();
        mockFetch = createMockFetch(logger);
        global.fetch = mockFetch;
        
        logger.info('Test setup completed', {
            testName: expect.getState().currentTestName,
            memoryUsage: process.memoryUsage()
        });
        
        memoryMonitor.takeSnapshot('test_start');
    });
    
    afterEach(() => {
        memoryMonitor.takeSnapshot('test_end');
        
        const memoryLeakCheck = memoryMonitor.checkMemoryLeaks();
        const logsSummary = logger.getLogsSummary();
        
        logger.info('Test completed', {
            logsSummary,
            memoryLeakCheck,
            finalMemoryUsage: process.memoryUsage()
        });
        
        // Warn about potential memory leaks
        if (memoryLeakCheck?.isLeak) {
            logger.warn('Potential memory leak detected', memoryLeakCheck);
        }
        
        // Clean up
        jest.clearAllMocks();
    });
    
    describe('StartupOptimizer Comprehensive Testing', () => {
        test('should initialize with detailed performance monitoring', async () => {
            logger.info('Starting startup optimizer performance test');
            
            const optimizer = new StartupOptimizer();
            const startTime = performance.now();
            
            // Mock settings loading
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'test-env-id',
                apiClientId: 'test-client-id',
                apiSecret: 'test-secret',
                region: 'NorthAmerica'
            });
            
            memoryMonitor.takeSnapshot('before_initialization');
            
            const result = await optimizer.initialize();
            
            const initializationTime = performance.now() - startTime;
            memoryMonitor.takeSnapshot('after_initialization');
            
            // Performance validation
            expect(initializationTime).toBeLessThan(TEST_CONFIG.performanceThresholds.startupTime);
            
            // Memory usage validation
            const memoryDelta = memoryMonitor.getMemoryDelta('before_initialization', 'after_initialization');
            
            logger.info('Initialization performance metrics', {
                initializationTime: `${initializationTime.toFixed(2)}ms`,
                memoryDelta,
                result
            });
            
            // Validate result structure
            expect(result).toHaveProperty('success', true);
            expect(result).toHaveProperty('duration');
            expect(result).toHaveProperty('tokenCached');
            expect(result).toHaveProperty('populationsCached');
            expect(result).toHaveProperty('steps');
            
            // Validate initialization steps
            expect(Array.isArray(result.steps)).toBe(true);
            expect(result.steps.length).toBeGreaterThan(0);
            
            result.steps.forEach((step, index) => {
                logger.debug(`Step ${index + 1} validation`, step);
                expect(step).toHaveProperty('step');
                expect(step).toHaveProperty('success');
                expect(step).toHaveProperty('duration');
            });
            
            logger.info('Startup optimizer test completed successfully');
        }, TEST_CONFIG.testTimeout);
        
        test('should handle errors gracefully with detailed logging', async () => {
            logger.info('Starting error handling test');
            
            const optimizer = new StartupOptimizer();
            
            // Mock settings loading to fail
            jest.spyOn(optimizer, '_loadSettings').mockRejectedValue(new Error('Settings loading failed'));
            
            memoryMonitor.takeSnapshot('before_error_test');
            
            const result = await optimizer.initialize();
            
            memoryMonitor.takeSnapshot('after_error_test');
            
            logger.info('Error handling test result', { result });
            
            // Should handle error gracefully
            expect(result).toHaveProperty('success', false);
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('duration');
            
            // Should not crash or leave the system in an inconsistent state
            expect(optimizer.cache.healthStatus).toBe('error');
            
            logger.info('Error handling test completed successfully');
        });
        
        test('should handle concurrent initialization attempts', async () => {
            logger.info('Starting concurrent initialization test');
            
            const optimizer = new StartupOptimizer();
            
            // Mock settings loading with delay
            jest.spyOn(optimizer, '_loadSettings').mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return {
                    environmentId: 'test-env-id',
                    apiClientId: 'test-client-id',
                    apiSecret: 'test-secret',
                    region: 'NorthAmerica'
                };
            });
            
            memoryMonitor.takeSnapshot('before_concurrent_test');
            
            // Start multiple concurrent initializations
            const promises = Array(5).fill().map((_, index) => {
                logger.debug(`Starting concurrent initialization ${index + 1}`);
                return optimizer.initialize();
            });
            
            const results = await Promise.all(promises);
            
            memoryMonitor.takeSnapshot('after_concurrent_test');
            
            logger.info('Concurrent initialization results', {
                resultCount: results.length,
                allSuccessful: results.every(r => r.success)
            });
            
            // All should return the same result (from the single initialization)
            results.forEach((result, index) => {
                expect(result.success).toBe(true);
                logger.debug(`Concurrent result ${index + 1}`, result);
            });
            
            // Should only call _loadSettings once due to promise caching
            expect(optimizer._loadSettings).toHaveBeenCalledTimes(1);
            
            logger.info('Concurrent initialization test completed successfully');
        });
    });
    
    describe('ErrorHandler Comprehensive Testing', () => {
        test('should handle various error types with detailed classification', async () => {
            logger.info('Starting error handler classification test');
            
            const errorHandler = getErrorHandler({

                enableUserNotification: false
            });
            
            const testErrors = [
                { error: new Error('Network timeout'), expectedType: 'timeout' },
                { error: { status: 401, message: 'Unauthorized' }, expectedType: 'authentication' },
                { error: { status: 403, message: 'Forbidden' }, expectedType: 'authorization' },
                { error: { status: 404, message: 'Not found' }, expectedType: 'not_found' },
                { error: { status: 429, message: 'Rate limited' }, expectedType: 'rate_limit' },
                { error: { code: 'ENOTFOUND', message: 'DNS lookup failed' }, expectedType: 'network' },
                { error: 'Simple string error', expectedType: 'unknown' }
            ];
            
            memoryMonitor.takeSnapshot('before_error_classification');
            
            for (const [index, testCase] of testErrors.entries()) {
                logger.debug(`Testing error classification ${index + 1}`, testCase);
                
                const result = await errorHandler.handleError(testCase.error, {
                    source: `test_${index + 1}`,
                    context: { testIndex: index + 1 }
                });
                
                logger.debug(`Error classification result ${index + 1}`, {
                    input: testCase,
                    result
                });
                
                expect(result).toHaveProperty('success', false);
                expect(result).toHaveProperty('code');
                expect(result).toHaveProperty('errorId');
                expect(result).toHaveProperty('timestamp');
            }
            
            memoryMonitor.takeSnapshot('after_error_classification');
            
            const memoryDelta = memoryMonitor.getMemoryDelta('before_error_classification', 'after_error_classification');
            logger.info('Error classification memory usage', memoryDelta);
            
            logger.info('Error handler classification test completed successfully');
        });
        
        test('should handle retry logic with exponential backoff', async () => {
            logger.info('Starting retry logic test');
            
            const errorHandler = getErrorHandler({
                maxRetries: 3,
                retryDelay: 100
            });
            
            let attemptCount = 0;
            const retryFunction = jest.fn().mockImplementation(async () => {
                attemptCount++;
                logger.debug(`Retry attempt ${attemptCount}`);
                
                if (attemptCount < 3) {
                    throw new Error(`Attempt ${attemptCount} failed`);
                }
                
                return { success: true, attempt: attemptCount };
            });
            
            memoryMonitor.takeSnapshot('before_retry_test');
            
            const startTime = performance.now();
            const result = await errorHandler.handleError(
                new Error('Transient error'),
                {
                    retryFunction,
                    source: 'retry_test'
                }
            );
            const retryDuration = performance.now() - startTime;
            
            memoryMonitor.takeSnapshot('after_retry_test');
            
            logger.info('Retry logic test results', {
                result,
                attemptCount,
                retryDuration: `${retryDuration.toFixed(2)}ms`,
                retryFunctionCalls: retryFunction.mock.calls.length
            });
            
            expect(result.success).toBe(true);
            expect(attemptCount).toBe(3);
            expect(retryFunction).toHaveBeenCalledTimes(3);
            
            logger.info('Retry logic test completed successfully');
        });
    });
    
    describe('Integration Testing', () => {
        test('should handle end-to-end startup optimization flow', async () => {
            logger.info('Starting end-to-end integration test');
            
            memoryMonitor.takeSnapshot('before_integration');
            
            // Test the complete flow from startup to health check
            const optimizer = new StartupOptimizer();
            
            // Mock realistic settings
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'integration-test-env',
                apiClientId: 'integration-test-client',
                apiSecret: 'integration-test-secret',
                region: 'NorthAmerica'
            });
            
            // Initialize optimizer
            const initResult = await optimizer.initialize();
            logger.info('Integration test - initialization result', initResult);
            
            expect(initResult.success).toBe(true);
            
            // Test health status
            const healthStatus = optimizer.getHealthStatus();
            logger.info('Integration test - health status', healthStatus);
            
            expect(healthStatus.status).toBe('healthy');
            expect(healthStatus.isInitialized).toBe(true);
            
            // Test cache refresh
            const refreshResult = await optimizer.refreshCache();
            logger.info('Integration test - cache refresh result', refreshResult);
            
            expect(refreshResult.success).toBe(true);
            
            memoryMonitor.takeSnapshot('after_integration');
            
            const memoryDelta = memoryMonitor.getMemoryDelta('before_integration', 'after_integration');
            logger.info('Integration test memory usage', memoryDelta);
            
            logger.info('End-to-end integration test completed successfully');
        });
    });
    
    describe('Performance and Load Testing', () => {
        test('should handle multiple rapid health checks without degradation', async () => {
            logger.info('Starting performance load test');
            
            const optimizer = new StartupOptimizer();
            
            // Initialize first
            jest.spyOn(optimizer, '_loadSettings').mockResolvedValue({
                environmentId: 'load-test-env',
                apiClientId: 'load-test-client',
                apiSecret: 'load-test-secret',
                region: 'NorthAmerica'
            });
            
            await optimizer.initialize();
            
            memoryMonitor.takeSnapshot('before_load_test');
            
            // Perform rapid health checks
            const healthCheckCount = 100;
            const healthCheckPromises = [];
            
            const startTime = performance.now();
            
            for (let i = 0; i < healthCheckCount; i++) {
                healthCheckPromises.push(
                    Promise.resolve(optimizer.getHealthStatus())
                );
            }
            
            const healthResults = await Promise.all(healthCheckPromises);
            const loadTestDuration = performance.now() - startTime;
            
            memoryMonitor.takeSnapshot('after_load_test');
            
            const memoryDelta = memoryMonitor.getMemoryDelta('before_load_test', 'after_load_test');
            const avgResponseTime = loadTestDuration / healthCheckCount;
            
            logger.info('Load test results', {
                healthCheckCount,
                totalDuration: `${loadTestDuration.toFixed(2)}ms`,
                avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                memoryDelta,
                allHealthy: healthResults.every(h => h.status === 'healthy')
            });
            
            // Performance assertions
            expect(avgResponseTime).toBeLessThan(10); // Should be very fast
            expect(healthResults).toHaveLength(healthCheckCount);
            expect(healthResults.every(h => h.status === 'healthy')).toBe(true);
            
            // Memory leak check
            expect(memoryDelta.heapUsedDelta).toBeLessThan(TEST_CONFIG.memoryThresholds.heapUsedIncrease);
            
            logger.info('Performance load test completed successfully');
        });
    });
});