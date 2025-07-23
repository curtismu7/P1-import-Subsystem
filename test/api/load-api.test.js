/**
 * API Load Test Suite
 * 
 * This test suite focuses on testing the API endpoints under load conditions,
 * including concurrent requests, high volume data processing, and performance
 * under stress.
 * 
 * Features:
 * - Concurrent request handling
 * - Performance under load
 * - Resource utilization monitoring
 * - Stress testing
 * 
 * @author PingOne Import Tool Team
 * @version 1.0.0
 */

import request from 'supertest';
import app from '../../server.js';
import { performance } from 'perf_hooks';

describe('API Load Test Suite', () => {
    let server;
    let authToken;
    
    // Performance metrics collection
    const metrics = {
        responseTime: [],
        throughput: [],
        memoryUsage: [],
        errorRate: []
    };
    
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
        
        // Log performance summary
        console.log('\n=== LOAD TEST PERFORMANCE SUMMARY ===');
        console.log(`Average Response Time: ${calculateAverage(metrics.responseTime)}ms`);
        
        // Safely calculate max/min values to avoid errors with empty arrays
        const maxResponseTime = metrics.responseTime.length > 0 ? Math.max(...metrics.responseTime) : 0;
        const minResponseTime = metrics.responseTime.length > 0 ? Math.min(...metrics.responseTime) : 0;
        
        console.log(`Max Response Time: ${maxResponseTime}ms`);
        console.log(`Min Response Time: ${minResponseTime}ms`);
        console.log(`Average Throughput: ${calculateAverage(metrics.throughput)} req/sec`);
        console.log(`Error Rate: ${calculateAverage(metrics.errorRate)}%`);
    });
    
    function calculateAverage(arr) {
        return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
    }
    
    function measurePerformance(testName) {
        return {
            start: () => performance.now(),
            end: (startTime) => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                metrics.responseTime.push(duration);
                console.log(`${testName}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }
    
    describe('Concurrent Request Handling', () => {
        const concurrencyLevels = [5, 10, 20, 50];
        
        test.each(concurrencyLevels)('%i concurrent health check requests', async (concurrency) => {
            console.log(`🔄 Testing ${concurrency} concurrent health check requests`);
            
            const perf = measurePerformance(`${concurrency} Concurrent Health Checks`);
            const start = perf.start();
            
            const requests = Array(concurrency).fill().map(() =>
                request(server)
                    .get('/api/health')
                    .expect((res) => {
                        expect([200, 429]).toContain(res.status);
                    })
            );
            
            const responses = await Promise.all(requests);
            const duration = perf.end(start);
            
            // Calculate metrics
            const successfulResponses = responses.filter(res => res.status === 200);
            const errorResponses = responses.filter(res => res.status !== 200);
            
            const errorRate = (errorResponses.length / responses.length) * 100;
            const throughput = concurrency / (duration / 1000);
            
            metrics.throughput.push(throughput);
            metrics.errorRate.push(errorRate);
            
            console.log(`✅ ${successfulResponses.length}/${responses.length} successful responses`);
            console.log(`⚠️ Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`📈 Throughput: ${throughput.toFixed(2)} req/sec`);
            
            // Assertions
            expect(responses.length).toBe(concurrency);
            expect(errorRate).toBeLessThan(20); // Less than 20% error rate
        }, 30000);
        
        test.each(concurrencyLevels)('%i concurrent status check requests', async (concurrency) => {
            console.log(`🔄 Testing ${concurrency} concurrent status check requests`);
            
            const perf = measurePerformance(`${concurrency} Concurrent Status Checks`);
            const start = perf.start();
            
            const requests = Array(concurrency).fill().map(() =>
                request(server)
                    .get('/api/status')
                    .expect((res) => {
                        expect([200, 404, 429]).toContain(res.status);
                    })
            );
            
            const responses = await Promise.all(requests);
            const duration = perf.end(start);
            
            // Calculate metrics
            const successfulResponses = responses.filter(res => res.status === 200);
            const errorResponses = responses.filter(res => res.status !== 200);
            
            const errorRate = (errorResponses.length / responses.length) * 100;
            const throughput = concurrency / (duration / 1000);
            
            metrics.throughput.push(throughput);
            metrics.errorRate.push(errorRate);
            
            console.log(`✅ ${successfulResponses.length}/${responses.length} successful responses`);
            console.log(`⚠️ Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`📈 Throughput: ${throughput.toFixed(2)} req/sec`);
            
            // Assertions
            expect(responses.length).toBe(concurrency);
        }, 30000);
    });
    
    describe('Authentication Load Testing', () => {
        test('Multiple concurrent token requests', async () => {
            console.log('🔄 Testing multiple concurrent token requests');
            
            const concurrency = 10;
            const perf = measurePerformance(`${concurrency} Concurrent Token Requests`);
            const start = perf.start();
            
            const requests = Array(concurrency).fill().map(() =>
                request(server)
                    .post('/api/auth/token')
                    .send({
                        clientId: 'test-client',
                        clientSecret: 'test-secret',
                        environmentId: 'test-env'
                    })
                    .expect((res) => {
                        expect([200, 400, 401, 429]).toContain(res.status);
                    })
            );
            
            const responses = await Promise.all(requests);
            const duration = perf.end(start);
            
            // Calculate metrics
            const successfulResponses = responses.filter(res => res.status === 200);
            const errorResponses = responses.filter(res => res.status !== 200);
            
            const errorRate = (errorResponses.length / responses.length) * 100;
            const throughput = concurrency / (duration / 1000);
            
            metrics.throughput.push(throughput);
            metrics.errorRate.push(errorRate);
            
            console.log(`✅ ${successfulResponses.length}/${responses.length} successful responses`);
            console.log(`⚠️ Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`📈 Throughput: ${throughput.toFixed(2)} req/sec`);
            
            // Assertions
            expect(responses.length).toBe(concurrency);
        }, 30000);
    });
    
    describe('Data Processing Load Testing', () => {
        test('Processing large CSV file', async () => {
            console.log('🔄 Testing large CSV file processing');
            
            // Skip if no auth token
            if (!authToken) {
                console.log('⏭️ Skipping large CSV test (no auth token)');
                return;
            }
            
            // Generate large CSV content (1000 users)
            const csvHeader = 'email,firstName,lastName,phone,title';
            const csvRows = Array(1000).fill().map((_, i) => 
                `user${i}@example.com,FirstName${i},LastName${i},+1234567${i.toString().padStart(4, '0')},Title${i}`
            );
            const csvContent = [csvHeader, ...csvRows].join('\n');
            
            const perf = measurePerformance('Large CSV Processing');
            const start = perf.start();
            
            const response = await request(server)
                .post('/api/users/import')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from(csvContent), 'large_test.csv')
                .field('populationId', 'test-population');
                
            const duration = perf.end(start);
            
            console.log(`✅ Large CSV processing response time: ${duration.toFixed(2)}ms`);
            console.log(`✅ Response status: ${response.status}`);
            
            // Assertions
            expect([200, 400, 401, 413]).toContain(response.status);
            
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success');
                expect(response.body).toHaveProperty('sessionId');
            }
        }, 60000);
    });
    
    describe('Memory Usage Monitoring', () => {
        test('Memory usage during API calls', async () => {
            console.log('🔄 Testing memory usage during API calls');
            
            const initialMemory = process.memoryUsage();
            
            // Make multiple API calls
            const requests = Array(50).fill().map(() =>
                request(server)
                    .get('/api/health')
                    .expect(200)
            );
            
            await Promise.all(requests);
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            metrics.memoryUsage.push(memoryIncrease);
            
            console.log(`✅ Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            
            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        });
    });
    
    describe('Error Rate Testing', () => {
        test('Error handling under load', async () => {
            console.log('🔄 Testing error handling under load');
            
            const totalRequests = 100;
            let errorCount = 0;
            
            const perf = measurePerformance('Error Rate Test');
            const start = perf.start();
            
            const requests = Array(totalRequests).fill().map(async () => {
                try {
                    const response = await request(server)
                        .get('/api/health');
                    return response.status;
                } catch (error) {
                    errorCount++;
                    return 500;
                }
            });
            
            const responses = await Promise.all(requests);
            const duration = perf.end(start);
            
            const errorRate = (errorCount / totalRequests) * 100;
            metrics.errorRate.push(errorRate);
            
            console.log(`✅ Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`✅ Successful responses: ${responses.filter(status => status === 200).length}`);
            
            // Error rate should be minimal
            expect(errorRate).toBeLessThan(5); // Less than 5% error rate
        });
    });
    
    describe('Stress Testing', () => {
        test('Rapid sequential API calls', async () => {
            console.log('🔄 Testing rapid sequential API calls');
            
            const callCount = 100;
            const endpoints = [
                '/api/health',
                '/api/status',
                '/api/version'
            ];
            
            const perf = measurePerformance('Rapid Sequential Calls');
            const start = perf.start();
            
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < callCount; i++) {
                const endpoint = endpoints[i % endpoints.length];
                try {
                    const response = await request(server).get(endpoint);
                    if (response.status === 200) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                }
            }
            
            const duration = perf.end(start);
            const throughput = callCount / (duration / 1000);
            metrics.throughput.push(throughput);
            
            console.log(`✅ Completed ${callCount} rapid sequential calls`);
            console.log(`✅ Success rate: ${(successCount / callCount * 100).toFixed(2)}%`);
            console.log(`✅ Throughput: ${throughput.toFixed(2)} req/sec`);
            
            // Assertions
            expect(successCount + failCount).toBe(callCount);
            expect(successCount / callCount).toBeGreaterThan(0.9); // >90% success rate
        }, 60000);
        
        test('Burst traffic simulation', async () => {
            console.log('🔄 Testing burst traffic simulation');
            
            // Simulate burst traffic with 3 waves of requests
            const waves = 3;
            const requestsPerWave = 20;
            
            for (let wave = 1; wave <= waves; wave++) {
                console.log(`🌊 Starting burst wave ${wave}/${waves}`);
                
                const perf = measurePerformance(`Burst Wave ${wave}`);
                const start = perf.start();
                
                const requests = Array(requestsPerWave).fill().map(() =>
                    request(server)
                        .get('/api/health')
                        .expect((res) => {
                            expect([200, 429]).toContain(res.status);
                        })
                );
                
                const responses = await Promise.all(requests);
                const duration = perf.end(start);
                
                const successCount = responses.filter(res => res.status === 200).length;
                const throughput = requestsPerWave / (duration / 1000);
                metrics.throughput.push(throughput);
                
                console.log(`✅ Wave ${wave} completed: ${successCount}/${requestsPerWave} successful`);
                console.log(`✅ Throughput: ${throughput.toFixed(2)} req/sec`);
                
                // Short pause between waves
                if (wave < waves) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }, 60000);
    });
});