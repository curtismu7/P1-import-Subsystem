import request from 'supertest';
import app from '../../server.js';

describe('API Security Test Suite', () => {
    let server;
    
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
    });
    
    describe('Authentication Security', () => {
        test('Should reject requests without authentication', async () => {
            const protectedEndpoints = [
                '/api/users',
                '/api/populations',
                '/api/settings',
                '/api/users/import',
                '/api/users/export'
            ];
            
            for (const endpoint of protectedEndpoints) {
                const response = await request(server)
                    .get(endpoint);
                    
                expect([401, 403]).toContain(response.status);
            }
        });
        
        test('Should reject invalid JWT tokens', async () => {
            const invalidTokens = [
                'invalid-token',
                'Bearer invalid-token',
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
                'Bearer expired-token',
                ''
            ];
            
            for (const token of invalidTokens) {
                const response = await request(server)
                    .get('/api/users')
                    .set('Authorization', token);
                    
                expect([401, 403]).toContain(response.status);
            }
        });
        
        test('Should handle malformed authorization headers', async () => {
            const malformedHeaders = [
                'Basic dGVzdDp0ZXN0', // Basic auth instead of Bearer
                'Bearer', // Missing token
                'InvalidScheme token',
                'Bearer token with spaces'
            ];
            
            for (const header of malformedHeaders) {
                const response = await request(server)
                    .get('/api/users')
                    .set('Authorization', header);
                    
                expect([400, 401]).toContain(response.status);
            }
        });
    });
    
    describe('Input Validation Security', () => {
        test('Should sanitize SQL injection attempts', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "'; SELECT * FROM users; --",
                "' UNION SELECT * FROM users --"
            ];
            
            for (const payload of sqlInjectionPayloads) {
                const response = await request(server)
                    .post('/api/auth/token')
                    .send({
                        clientId: payload,
                        clientSecret: 'test-secret',
                        environmentId: 'test-env'
                    });
                    
                expect([400, 401]).toContain(response.status);
                expect(response.body).not.toContain('DROP TABLE');
            }
        });
        
        test('Should prevent XSS attacks', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '"><script>alert("xss")</script>'
            ];
            
            for (const payload of xssPayloads) {
                const response = await request(server)
                    .post('/api/populations')
                    .set('Authorization', 'Bearer test-token')
                    .send({
                        name: payload,
                        description: 'Test population'
                    });
                    
                expect([400, 401]).toContain(response.status);
                if (response.body.name) {
                    expect(response.body.name).not.toContain('<script>');
                }
            }
        });
        
        test('Should validate file upload types', async () => {
            const maliciousFiles = [
                { content: '<?php echo "hack"; ?>', filename: 'malicious.php' },
                { content: '<script>alert("xss")</script>', filename: 'malicious.html' },
                { content: 'executable content', filename: 'malicious.exe' },
                { content: 'shell script', filename: 'malicious.sh' }
            ];
            
            for (const file of maliciousFiles) {
                const response = await request(server)
                    .post('/api/upload')
                    .set('Authorization', 'Bearer test-token')
                    .attach('file', Buffer.from(file.content), file.filename);
                    
                expect([400, 401, 415]).toContain(response.status);
            }
        });
    });    

    describe('Rate Limiting Security', () => {
        test('Should enforce rate limits on authentication attempts', async () => {
            const requests = Array(20).fill().map(() =>
                request(server)
                    .post('/api/auth/token')
                    .send({
                        clientId: 'test-client',
                        clientSecret: 'wrong-secret',
                        environmentId: 'test-env'
                    })
            );
            
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            // Should have some rate limiting after multiple failed attempts
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
        
        test('Should enforce rate limits on file uploads', async () => {
            const testFile = Buffer.from('test,data\n1,2');
            
            const requests = Array(15).fill().map(() =>
                request(server)
                    .post('/api/upload')
                    .set('Authorization', 'Bearer test-token')
                    .attach('file', testFile, 'test.csv')
            );
            
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            // Should have rate limiting on uploads
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });
    
    describe('CORS Security', () => {
        test('Should handle CORS preflight requests', async () => {
            const response = await request(server)
                .options('/api/users')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET')
                .set('Access-Control-Request-Headers', 'Authorization');
                
            expect([200, 204]).toContain(response.status);
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
        
        test('Should reject requests from unauthorized origins', async () => {
            const response = await request(server)
                .get('/api/health')
                .set('Origin', 'http://malicious-site.com');
                
            // Should either reject or not include CORS headers for unauthorized origins
            if (response.headers['access-control-allow-origin']) {
                expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
            }
        });
    });
    
    describe('HTTP Security Headers', () => {
        test('Should include security headers', async () => {
            const response = await request(server)
                .get('/api/health');
                
            // Check for common security headers
            const securityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
                'strict-transport-security'
            ];
            
            securityHeaders.forEach(header => {
                if (response.headers[header]) {
                    console.log(`✓ ${header}: ${response.headers[header]}`);
                }
            });
        });
        
        test('Should prevent clickjacking', async () => {
            const response = await request(server)
                .get('/api/health');
                
            if (response.headers['x-frame-options']) {
                expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
            }
        });
    });
    
    describe('Data Exposure Prevention', () => {
        test('Should not expose sensitive information in error messages', async () => {
            const response = await request(server)
                .post('/api/auth/token')
                .send({
                    clientId: 'test',
                    clientSecret: 'wrong-secret',
                    environmentId: 'test'
                });
                
            if (response.body.error) {
                // Should not expose internal paths, stack traces, or sensitive data
                expect(response.body.error).not.toMatch(/\/Users\/|\/home\/|C:\\/);
                expect(response.body.error).not.toMatch(/at Object\.|at Function\./);
                expect(response.body.error).not.toContain('password');
                expect(response.body.error).not.toContain('secret');
            }
        });
        
        test('Should not expose server information', async () => {
            const response = await request(server)
                .get('/api/health');
                
            // Should not expose server version, technology stack details
            expect(response.headers['server']).toBeUndefined();
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });
    
    describe('File Upload Security', () => {
        test('Should enforce file size limits', async () => {
            // Create a large file (simulate)
            const largeContent = 'a'.repeat(50 * 1024 * 1024); // 50MB
            
            const response = await request(server)
                .post('/api/upload')
                .set('Authorization', 'Bearer test-token')
                .attach('file', Buffer.from(largeContent), 'large.csv');
                
            expect([413, 400]).toContain(response.status);
        });
        
        test('Should validate CSV content structure', async () => {
            const maliciousContent = '=cmd|"/c calc"!A1';
            
            const response = await request(server)
                .post('/api/upload')
                .set('Authorization', 'Bearer test-token')
                .attach('file', Buffer.from(maliciousContent), 'malicious.csv');
                
            expect([400, 401]).toContain(response.status);
        });
    });
});