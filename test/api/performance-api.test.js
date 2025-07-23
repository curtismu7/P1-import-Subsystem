const request = require('supertest');
const app = require('../../server');
const { performance } = require('perf_hooks');

describe('API Performance Test Suite', () => {
    let server;
    const performanceMetrics = {
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
    });
    
    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        
        // Log performance summary
        console.log('\n=== PERFORMANCE SUMMARY ===');
        console.log(`Average Response Time: ${calculateAverage(performanceMetrics.responseTime)}ms`);
        
        // Safely calculate max/min values to avoid errors with empty arrays
        const maxResponseTime = performanceMetrics.responseTime.length > 0 ? Math.max(...performanceMetrics.responseTime) : 0;
        const minResponseTime = performanceMetrics.responseTime.length > 0 ? Math.min(...performanceMetrics.responseTime) : 0;
        
        console.log(`Max Response Time: ${maxResponseTime}ms`);
        console.log(`Min Response Time: ${minResponseTime}ms`);
        console.log(`Total Requests: ${performanceMetrics.responseTime.length}`);
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
                performanceMetrics.responseTime.push(duration);
                console.log(`${testName}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }
    
    describe('Response Time Benchmarks', () => {
        test('Health endpoint response time', async () => {
            const perf = measurePerformance('Health Check');
            const start = perf.start();
            
            const response = await request(server)
                .get('/api/health')
                .expect(200);
                
            const duration = perf.end(start);
            expect(duration).toBeLessThan(100); // Should respond within 100ms
            expect(response.body).toHaveProperty('status', 'healthy');
        });
        
        test('Status endpoint response time', async () => {
            const perf = measurePerformance('Status Check');
            const start = perf.start();
            
            const response = await request(server)
                .get('/api/status')
                .expect(200);
                
            const duration = perf.end(start);
            expect(duration).toBeLessThan(200); // Should respond within 200ms
        });
        
        test('Authentication endpoint response time', async () => {
            const perf = measurePerformance('Auth Token');
            const start = perf.start();
            
            const response = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'test-client',
                    clientSecret: 'test-secret',
                    environmentId: 'test-env'
                });
                
            const duration = perf.end(start);
            expect(duration).toBeLessThan(500); // Auth might take longer
        });
    });
    
    describe('Load Testing', () => {
        test('Concurrent health checks', async () => {
            const concurrentRequests = 20;
            const perf = measurePerformance(`${concurrentRequests} Concurrent Health Checks`);
            const start = perf.start();
            
            const requests = Array(concurrentRequests).fill().map(() =>
                request(server)
                    .get('/api/health')
                    .expect(200)
            );
            
            const responses = await Promise.all(requests);
            const duration = perf.end(start);
            
            expect(responses).toHaveLength(concurrentRequests);
            expect(duration).toBeLessThan(2000); // All should complete within 2 seconds
            
            // Calculate throughput
            const throughput = concurrentRequests / (duration / 1000);
            performanceMetrics.throughput.push(throughput);
            console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);
        });
        
        test('Sequential API calls performance', async () => {
            const endpoints = [
                '/api/health',
                '/api/status',
                '/api/version',
                '/api/settings'
            ];
            
            const perf = measurePerformance('Sequential API Calls');
            const start = perf.start();
            
            for (const endpoint of endpoints) {
                await request(server)
                    .get(endpoint)
                    .expect((res) => {
                        expect([200, 401]).toContain(res.status);
                    });
            }
            
            const duration = perf.end(start);
            expect(duration).toBeLessThan(1000); // All sequential calls within 1 second
        });
    });    

    describe('Memory Usage Monitoring', () => {
        test('Memory usage during API calls', async () => {
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
            
            performanceMetrics.memoryUsage.push(memoryIncrease);
            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            
            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        });
    });
    
    describe('Error Rate Testing', () => {
        test('Error handling under load', async () => {
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
            performanceMetrics.errorRate.push(errorRate);
            
            console.log(`Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`Successful responses: ${responses.filter(status => status === 200).length}`);
            
            // Error rate should be minimal
            expect(errorRate).toBeLessThan(5); // Less than 5% error rate
        });
    });
    
    describe('File Upload Performance', () => {
        test('Small file upload performance', async () => {
            const smallCsv = 'email,firstName,lastName\n' + 
                Array(100).fill('test@example.com,Test,User').join('\n');
            
            const perf = measurePerformance('Small File Upload');
            const start = perf.start();
            
            const response = await request(server)
                .post('/api/upload')
                .attach('file', Buffer.from(smallCsv), 'small.csv');
                
            const duration = perf.end(start);
            
            expect([200, 400, 401]).toContain(response.status);
            expect(duration).toBeLessThan(1000); // Should upload within 1 second
        });
        
        test('Large file upload performance', async () => {
            const largeCsv = 'email,firstName,lastName\n' + 
                Array(5000).fill('test@example.com,Test,User').join('\n');
            
            const perf = measurePerformance('Large File Upload');
            const start = perf.start();
            
            const response = await request(server)
                .post('/api/upload')
                .attach('file', Buffer.from(largeCsv), 'large.csv');
                
            const duration = perf.end(start);
            
            expect([200, 400, 401, 413]).toContain(response.status);
            expect(duration).toBeLessThan(5000); // Should upload within 5 seconds
        });
    });
    
    describe('Database Operation Performance', () => {
        test('User list retrieval performance', async () => {
            const perf = measurePerformance('User List Retrieval');
            const start = perf.start();
            
            const response = await request(server)
                .get('/api/users')
                .set('Authorization', 'Bearer test-token');
                
            const duration = perf.end(start);
            
            expect([200, 401]).toContain(response.status);
            expect(duration).toBeLessThan(2000); // Should retrieve within 2 seconds
        });
        
        test('Population list retrieval performance', async () => {
            const perf = measurePerformance('Population List Retrieval');
            const start = perf.start();
            
            const response = await request(server)
                .get('/api/populations')
                .set('Authorization', 'Bearer test-token');
                
            const duration = perf.end(start);
            
            expect([200, 401]).toContain(response.status);
            expect(duration).toBeLessThan(2000); // Should retrieve within 2 seconds
        });
    });
});