/**
 * API Debug Test Suite
 * 
 * Comprehensive testing suite for API endpoints with detailed debugging,
 * error injection, performance monitoring, and integration testing.
 * 
 * Features:
 * - Request/response logging with correlation IDs
 * - Error injection and recovery testing
 * - Performance benchmarking
 * - Concurrent request testing
 * - Memory leak detection
 * - Real API integration testing (when enabled)
 * 
 * @author PingOne Import Tool Debug Team
 * @version 1.0.0
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import apiRouter from '../../routes/api/index.js';

// Test configuration
const API_TEST_CONFIG = {
    enableRealApiTests: process.env.ENABLE_REAL_API_TESTS === 'true',
    testTimeout: 30000,
    performanceThresholds: {
        healthCheck: 100, // 100ms
        tokenRequest: 2000, // 2 seconds
        populationFetch: 3000, // 3 seconds
        fileUpload: 5000 // 5 seconds
    },
    concurrencyLevels: [1, 5, 10, 20],
    memoryThresholds: {
        maxHeapIncrease: 100 * 1024 * 1024 // 100MB
    }
};

// Enhanced test utilities
class APITestLogger {
    constructor(testName) {
        this.testName = testName;
        this.requests = [];
        this.responses = [];
        this.errors = [];
        this.startTime = Date.now();
    }
    
    logRequest(method, path, body = null, headers = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const request = {
            requestId,
            timestamp: new Date().toISOString(),
            method,
            path,
            body: body ? JSON.stringify(body).substring(0, 500) : null,
            headers,
            elapsed: Date.now() - this.startTime
        };
        
        this.requests.push(request);
        console.log(`[API-DEBUG] [${this.testName}] REQUEST: ${method} ${path}`, {
            requestId,
            bodySize: body ? JSON.stringify(body).length : 0
        });
        
        return requestId;
    }
    
    logResponse(requestId, status, body = null, duration = 0) {
        const response = {
            requestId,
            timestamp: new Date().toISOString(),
            status,
            body: body ? JSON.stringify(body).substring(0, 500) : null,
            duration: `${duration}ms`,
            elapsed: Date.now() - this.startTime
        };
        
        this.responses.push(response);
        console.log(`[API-DEBUG] [${this.testName}] RESPONSE: ${status}`, {
            requestId,
            duration: response.duration,
            bodySize: body ? JSON.stringify(body).length : 0
        });
    }
    
    logError(requestId, error, context = {}) {
        const errorLog = {
            requestId,
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context,
            elapsed: Date.now() - this.startTime
        };
        
        this.errors.push(errorLog);
        console.error(`[API-DEBUG] [${this.testName}] ERROR:`, {
            requestId,
            error: error.message,
            context
        });
    }
    
    getStats() {
        const totalRequests = this.requests.length;
        const totalResponses = this.responses.length;
        const totalErrors = this.errors.length;
        
        const responseTimes = this.responses.map(r => parseFloat(r.duration));
        const avgResponseTime = responseTimes.length > 0 ? 
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        
        const statusCodes = this.responses.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalRequests,
            totalResponses,
            totalErrors,
            avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
            statusCodes,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) + '%' : '0%',
            testDuration: Date.now() - this.startTime
        };
    }
}

class APIPerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.memorySnapshots = [];
    }
    
    startOperation(operationName) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();
        
        return {
            operationName,
            startTime,
            startMemory,
            end: () => {
                const endTime = performance.now();
                const endMemory = process.memoryUsage();
                const duration = endTime - startTime;
                
                const metric = {
                    operationName,
                    duration,
                    memoryDelta: {
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                        rss: endMemory.rss - startMemory.rss
                    },
                    timestamp: new Date().toISOString()
                };
                
                this.metrics.push(metric);
                return metric;
            }
        };
    }
    
    takeMemorySnapshot(label) {
        const snapshot = {
            label,
            timestamp: Date.now(),
            ...process.memoryUsage()
        };
        this.memorySnapshots.push(snapshot);
        return snapshot;
    }
    
    getPerformanceReport() {
        const operationStats = this.metrics.reduce((acc, metric) => {
            if (!acc[metric.operationName]) {
                acc[metric.operationName] = {
                    count: 0,
                    totalDuration: 0,
                    minDuration: Infinity,
                    maxDuration: 0,
                    avgMemoryDelta: { heapUsed: 0, heapTotal: 0, rss: 0 }
                };
            }
            
            const stats = acc[metric.operationName];
            stats.count++;
            stats.totalDuration += metric.duration;
            stats.minDuration = Math.min(stats.minDuration, metric.duration);
            stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
            
            // Average memory delta
            stats.avgMemoryDelta.heapUsed += metric.memoryDelta.heapUsed;
            stats.avgMemoryDelta.heapTotal += metric.memoryDelta.heapTotal;
            stats.avgMemoryDelta.rss += metric.memoryDelta.rss;
            
            return acc;
        }, {});
        
        // Calculate averages
        Object.values(operationStats).forEach(stats => {
            stats.avgDuration = stats.totalDuration / stats.count;
            stats.avgMemoryDelta.heapUsed /= stats.count;
            stats.avgMemoryDelta.heapTotal /= stats.count;
            stats.avgMemoryDelta.rss /= stats.count;
        });
        
        return {
            operationStats,
            totalOperations: this.metrics.length,
            memorySnapshots: this.memorySnapshots.length
        };
    }
}

// Create test app with enhanced logging
function createTestApp() {
    const app = express();
    
    // Enhanced request logging middleware
    app.use((req, res, next) => {
        const startTime = Date.now();
        req.testStartTime = startTime;
        req.testRequestId = `test_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Override res.end to capture response details
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
            const duration = Date.now() - startTime;
            
            // Log response details
            console.log(`[TEST-APP] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
                requestId: req.testRequestId,
                contentLength: chunk ? chunk.length : 0
            });
            
            originalEnd.call(res, chunk, encoding);
        };
        
        next();
    });
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Mock token manager
    app.set('tokenManager', {
        getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
        isTokenValid: jest.fn().mockReturnValue(true),
        refreshToken: jest.fn().mockResolvedValue('refreshed-mock-token')
    });
    
    // Mock startup optimizer
    app.set('startupOptimizer', {
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
    });
    
    // Use the actual API router
    app.use('/api', apiRouter);
    
    // Global error handler
    app.use((err, req, res, next) => {
        console.error(`[TEST-APP] Error in ${req.method} ${req.path}:`, {
            error: err.message,
            stack: err.stack,
            requestId: req.testRequestId
        });
        
        res.status(500).json({
            success: false,
            error: err.message,
            requestId: req.testRequestId,
            timestamp: new Date().toISOString()
        });
    });
    
    return app;
}

describe('API Debug Test Suite', () => {
    let app;
    let logger;
    let performanceMonitor;
    
    beforeAll(() => {
        // Set up test environment
        process.env.NODE_ENV = 'test';
        process.env.DEBUG_MODE = 'true';
        
        app = createTestApp();
    });
    
    beforeEach(() => {
        logger = new APITestLogger(expect.getState().currentTestName);
        performanceMonitor = new APIPerformanceMonitor();
        
        performanceMonitor.takeMemorySnapshot('test_start');
        
        console.log(`[API-DEBUG] Starting test: ${expect.getState().currentTestName}`);
    });
    
    afterEach(() => {
        performanceMonitor.takeMemorySnapshot('test_end');
        
        const stats = logger.getStats();
        const performanceReport = performanceMonitor.getPerformanceReport();
        
        console.log(`[API-DEBUG] Test completed: ${expect.getState().currentTestName}`);
        console.log('[API-DEBUG] Request Stats:', stats);
        console.log('[API-DEBUG] Performance Report:', performanceReport);
        
        // Check for performance issues
        Object.entries(performanceReport.operationStats).forEach(([operation, stats]) => {
            if (stats.avgDuration > 1000) { // 1 second threshold
                console.warn(`[API-DEBUG] Performance warning: ${operation} avg duration: ${stats.avgDuration.toFixed(2)}ms`);
            }
        });
        
        jest.clearAllMocks();
    });
    
    describe('Health Check Endpoint', () => {
        test('should respond quickly with comprehensive health information', async () => {
            const operation = performanceMonitor.startOperation('health_check');
            const requestId = logger.logRequest('GET', '/api/health');
            
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            
            const metric = operation.end();
            logger.logResponse(requestId, response.status, response.body, metric.duration);
            
            // Performance validation
            expect(metric.duration).toBeLessThan(API_TEST_CONFIG.performanceThresholds.healthCheck);
            
            // Response structure validation
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('checks');
            expect(response.body).toHaveProperty('responseTime');
            
            // Detailed checks validation
            const checks = response.body.checks;
            expect(checks).toHaveProperty('server', true);
            expect(checks).toHaveProperty('timestamp');
            expect(checks).toHaveProperty('uptime');
            expect(checks).toHaveProperty('memory');
            expect(checks).toHaveProperty('environment');
            
            console.log('[API-DEBUG] Health check response validated successfully');
        });
        
        test('should handle concurrent health check requests efficiently', async () => {
            const concurrentRequests = 10;
            const promises = [];
            
            console.log(`[API-DEBUG] Starting ${concurrentRequests} concurrent health checks`);
            
            const overallOperation = performanceMonitor.startOperation('concurrent_health_checks');
            
            for (let i = 0; i < concurrentRequests; i++) {
                const requestId = logger.logRequest('GET', '/api/health', null, { 'X-Request-Index': i });
                
                const promise = request(app)
                    .get('/api/health')
                    .expect(200)
                    .then(response => {
                        logger.logResponse(requestId, response.status, response.body);
                        return response;
                    })
                    .catch(error => {
                        logger.logError(requestId, error);
                        throw error;
                    });
                
                promises.push(promise);
            }
            
            const responses = await Promise.all(promises);
            const overallMetric = overallOperation.end();
            
            console.log(`[API-DEBUG] Concurrent health checks completed in ${overallMetric.duration.toFixed(2)}ms`);
            
            // Validate all responses
            responses.forEach((response, index) => {
                expect(response.body.success).toBe(true);
                expect(response.body.status).toBe('healthy');
            });
            
            // Performance validation
            const avgResponseTime = overallMetric.duration / concurrentRequests;
            expect(avgResponseTime).toBeLessThan(API_TEST_CONFIG.performanceThresholds.healthCheck * 2);
            
            console.log(`[API-DEBUG] Average response time: ${avgResponseTime.toFixed(2)}ms`);
        });
    });
    
    describe('Error Handling and Recovery', () => {
        test('should handle malformed requests gracefully', async () => {
            const testCases = [
                { method: 'POST', path: '/api/nonexistent', body: null, expectedStatus: 404 },
                { method: 'POST', path: '/api/health', body: { invalid: 'data' }, expectedStatus: 405 },
                { method: 'GET', path: '/api/health', body: null, expectedStatus: 200, headers: { 'Content-Type': 'invalid' } }
            ];
            
            for (const [index, testCase] of testCases.entries()) {
                console.log(`[API-DEBUG] Testing error case ${index + 1}:`, testCase);
                
                const operation = performanceMonitor.startOperation(`error_case_${index + 1}`);
                const requestId = logger.logRequest(testCase.method, testCase.path, testCase.body, testCase.headers);
                
                try {
                    const requestBuilder = request(app)[testCase.method.toLowerCase()](testCase.path);
                    
                    if (testCase.headers) {
                        Object.entries(testCase.headers).forEach(([key, value]) => {
                            requestBuilder.set(key, value);
                        });
                    }
                    
                    if (testCase.body) {
                        requestBuilder.send(testCase.body);
                    }
                    
                    const response = await requestBuilder.expect(testCase.expectedStatus);
                    const metric = operation.end();
                    
                    logger.logResponse(requestId, response.status, response.body, metric.duration);
                    
                    // Validate error response structure
                    if (testCase.expectedStatus >= 400) {
                        expect(response.body).toHaveProperty('success', false);
                        expect(response.body).toHaveProperty('error');
                    }
                    
                } catch (error) {
                    const metric = operation.end();
                    logger.logError(requestId, error, testCase);
                    throw error;
                }
            }
            
            console.log('[API-DEBUG] Error handling test completed successfully');
        });
        
        test('should recover from temporary service failures', async () => {
            // Mock a temporary failure in the token manager
            const mockTokenManager = app.get('tokenManager');
            
            // First call fails
            mockTokenManager.getAccessToken.mockRejectedValueOnce(new Error('Temporary service failure'));
            
            // Subsequent calls succeed
            mockTokenManager.getAccessToken.mockResolvedValue('recovered-token');
            
            const operation = performanceMonitor.startOperation('service_recovery');
            const requestId = logger.logRequest('GET', '/api/health');
            
            // Should still return healthy status even with token manager failure
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            
            const metric = operation.end();
            logger.logResponse(requestId, response.status, response.body, metric.duration);
            
            // Should handle the failure gracefully
            expect(response.body.success).toBe(true);
            expect(response.body.checks).toHaveProperty('tokenManager', false);
            expect(response.body.checks).toHaveProperty('tokenStatus', 'error');
            
            console.log('[API-DEBUG] Service recovery test completed successfully');
        });
    });
    
    describe('Performance and Load Testing', () => {
        test('should maintain performance under load', async () => {
            const loadTestConfig = {
                duration: 5000, // 5 seconds
                concurrency: 5,
                endpoint: '/api/health'
            };
            
            console.log(`[API-DEBUG] Starting load test:`, loadTestConfig);
            
            const startTime = Date.now();
            const requests = [];
            let requestCount = 0;
            
            const overallOperation = performanceMonitor.startOperation('load_test');
            
            // Generate load for specified duration
            while (Date.now() - startTime < loadTestConfig.duration) {
                const batch = [];
                
                for (let i = 0; i < loadTestConfig.concurrency; i++) {
                    requestCount++;
                    const requestId = logger.logRequest('GET', loadTestConfig.endpoint, null, { 'X-Load-Test': requestCount });
                    
                    const promise = request(app)
                        .get(loadTestConfig.endpoint)
                        .then(response => {
                            logger.logResponse(requestId, response.status, response.body);
                            return response;
                        })
                        .catch(error => {
                            logger.logError(requestId, error);
                            return { error: true, status: 500 };
                        });
                    
                    batch.push(promise);
                }
                
                requests.push(...batch);
                
                // Wait a bit before next batch
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Wait for all requests to complete
            const responses = await Promise.all(requests);
            const overallMetric = overallOperation.end();
            
            // Analyze results
            const successfulResponses = responses.filter(r => !r.error && r.status === 200);
            const failedResponses = responses.filter(r => r.error || r.status !== 200);
            
            const successRate = (successfulResponses.length / responses.length) * 100;
            const avgResponseTime = overallMetric.duration / responses.length;
            
            console.log(`[API-DEBUG] Load test results:`, {
                totalRequests: responses.length,
                successfulRequests: successfulResponses.length,
                failedRequests: failedResponses.length,
                successRate: `${successRate.toFixed(2)}%`,
                avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                testDuration: `${overallMetric.duration.toFixed(2)}ms`
            });
            
            // Performance assertions
            expect(successRate).toBeGreaterThan(95); // 95% success rate
            expect(avgResponseTime).toBeLessThan(API_TEST_CONFIG.performanceThresholds.healthCheck * 3);
            
            console.log('[API-DEBUG] Load test completed successfully');
        });
    });
    
    describe('Memory and Resource Management', () => {
        test('should not leak memory during repeated operations', async () => {
            const iterations = 50;
            const endpoint = '/api/health';
            
            console.log(`[API-DEBUG] Starting memory leak test with ${iterations} iterations`);
            
            performanceMonitor.takeMemorySnapshot('memory_test_start');
            
            // Perform repeated operations
            for (let i = 0; i < iterations; i++) {
                const operation = performanceMonitor.startOperation(`memory_test_${i}`);
                const requestId = logger.logRequest('GET', endpoint);
                
                const response = await request(app)
                    .get(endpoint)
                    .expect(200);
                
                const metric = operation.end();
                logger.logResponse(requestId, response.status, response.body, metric.duration);
                
                // Take memory snapshots at intervals
                if (i % 10 === 0) {
                    performanceMonitor.takeMemorySnapshot(`memory_test_iteration_${i}`);
                }
            }
            
            performanceMonitor.takeMemorySnapshot('memory_test_end');
            
            // Analyze memory usage
            const snapshots = performanceMonitor.memorySnapshots;
            const startSnapshot = snapshots.find(s => s.label === 'memory_test_start');
            const endSnapshot = snapshots.find(s => s.label === 'memory_test_end');
            
            const memoryIncrease = endSnapshot.heapUsed - startSnapshot.heapUsed;
            const memoryIncreasePercent = (memoryIncrease / startSnapshot.heapUsed) * 100;
            
            console.log(`[API-DEBUG] Memory usage analysis:`, {
                startHeapUsed: `${(startSnapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                endHeapUsed: `${(endSnapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
                memoryIncreasePercent: `${memoryIncreasePercent.toFixed(2)}%`,
                iterations
            });
            
            // Memory leak assertion
            expect(memoryIncrease).toBeLessThan(API_TEST_CONFIG.memoryThresholds.maxHeapIncrease);
            
            console.log('[API-DEBUG] Memory leak test completed successfully');
        });
    });
});