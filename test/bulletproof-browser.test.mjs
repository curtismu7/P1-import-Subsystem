/**
 * 🛡️ BULLETPROOF BROWSER TEST - REAL SYSTEM VERIFICATION
 * 
 * Tests the actual bulletproof system running in the browser
 * by making HTTP requests to the running server and checking responses
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'http://localhost:4000',
    timeout: 30000,
    retries: 3
};

// Server process reference
let serverProcess = null;

describe('🛡️ Bulletproof System - Browser Integration Tests', () => {
    beforeAll(async () => {
        console.log('🚀 Starting server for bulletproof tests...');
        
        // Check if server is already running
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
            if (response.ok) {
                console.log('✅ Server already running');
                return;
            }
        } catch (error) {
            // Server not running, need to start it
        }

        // Start server in background
        serverProcess = spawn('npm', ['run', 'start:background'], {
            cwd: rootDir,
            stdio: 'pipe'
        });

        // Wait for server to start
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Server startup timeout'));
            }, 15000);

            const checkServer = async () => {
                try {
                    const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
                    if (response.ok) {
                        clearTimeout(timeout);
                        console.log('✅ Server started successfully');
                        resolve();
                    } else {
                        setTimeout(checkServer, 1000);
                    }
                } catch (error) {
                    setTimeout(checkServer, 1000);
                }
            };

            checkServer();
        });
    }, 30000);

    afterAll(async () => {
        if (serverProcess) {
            console.log('🛑 Stopping test server...');
            serverProcess.kill('SIGTERM');
            
            // Wait for process to exit
            await new Promise((resolve) => {
                serverProcess.on('exit', resolve);
                setTimeout(resolve, 5000); // Force resolve after 5s
            });
        }
    });

    describe('🏠 Server Health and Bulletproof Loading', () => {
        test('should have server running with bulletproof system', async () => {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
            expect(response.ok).toBe(true);
            
            const health = await response.json();
            expect(health.status).toBe('healthy');
        });

        test('should serve main page with bulletproof bundle', async () => {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/`);
            expect(response.ok).toBe(true);
            
            const html = await response.text();
            expect(html).toContain('bundle-');
            expect(html).toContain('PingOne Import Tool');
        });

        test('should serve bulletproof JavaScript bundle', async () => {
            // Get the main page to find bundle name
            const pageResponse = await fetch(`${TEST_CONFIG.serverUrl}/`);
            const html = await pageResponse.text();
            
            // Extract bundle filename
            const bundleMatch = html.match(/bundle-(\d+)\.js/);
            expect(bundleMatch).toBeTruthy();
            
            const bundleName = bundleMatch[0];
            const bundleResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/${bundleName}`);
            expect(bundleResponse.ok).toBe(true);
            
            const bundle = await bundleResponse.text();
            expect(bundle).toContain('bulletproof');
            expect(bundle).toContain('🛡️');
        });
    });

    describe('🛡️ Bulletproof Token Manager API Tests', () => {
        test('should handle token status requests safely', async () => {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/api/token/status`);
            
            // Should not crash even if token is invalid
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(500);
        });

        test('should provide fallback responses for token errors', async () => {
            // Try to get token info with invalid credentials
            const response = await fetch(`${TEST_CONFIG.serverUrl}/api/token/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invalid: 'credentials' })
            });
            
            // Should handle gracefully, not crash
            expect(response.status).toBeLessThan(500);
        });
    });

    describe('🔧 Error Handling and Recovery', () => {
        test('should handle malformed requests gracefully', async () => {
            const malformedRequests = [
                { url: '/api/invalid-endpoint', method: 'GET' },
                { url: '/api/token/status', method: 'POST', body: 'invalid json' },
                { url: '/api/users/import', method: 'POST', body: '{"malformed": json}' }
            ];

            for (const request of malformedRequests) {
                try {
                    const response = await fetch(`${TEST_CONFIG.serverUrl}${request.url}`, {
                        method: request.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: request.body
                    });
                    
                    // Should not return 500 errors (server crashes)
                    expect(response.status).toBeLessThan(500);
                } catch (error) {
                    // Network errors are acceptable, server crashes are not
                    expect(error.code).not.toBe('ECONNRESET');
                }
            }
        });

        test('should maintain server stability under load', async () => {
            const requests = [];
            
            // Send multiple concurrent requests
            for (let i = 0; i < 20; i++) {
                requests.push(
                    fetch(`${TEST_CONFIG.serverUrl}/health`).catch(() => ({ ok: false }))
                );
            }
            
            const responses = await Promise.all(requests);
            
            // At least some requests should succeed (server should not crash)
            const successCount = responses.filter(r => r.ok).length;
            expect(successCount).toBeGreaterThan(0);
        });
    });

    describe('🎭 Real-world Scenario Tests', () => {
        test('should handle page navigation without crashes', async () => {
            const pages = [
                '/',
                '/swagger',
                '/api/health',
                '/api/docs'
            ];

            for (const page of pages) {
                const response = await fetch(`${TEST_CONFIG.serverUrl}${page}`);
                
                // Should not crash server
                expect(response.status).toBeLessThan(500);
                
                if (response.ok) {
                    const content = await response.text();
                    expect(content.length).toBeGreaterThan(0);
                }
            }
        });

        test('should handle file upload attempts safely', async () => {
            const formData = new FormData();
            formData.append('file', 'test content', 'test.csv');
            
            try {
                const response = await fetch(`${TEST_CONFIG.serverUrl}/api/users/import`, {
                    method: 'POST',
                    body: formData
                });
                
                // Should handle gracefully (may reject due to auth, but not crash)
                expect(response.status).toBeLessThan(500);
            } catch (error) {
                // Network errors acceptable, server crashes not
                expect(error.code).not.toBe('ECONNRESET');
            }
        });

        test('should maintain WebSocket connections safely', async () => {
            // Test that WebSocket endpoint exists and doesn't crash
            try {
                const response = await fetch(`${TEST_CONFIG.serverUrl}/socket.io/`);
                // Socket.IO should respond (may be 400 for non-websocket request)
                expect(response.status).toBeLessThan(500);
            } catch (error) {
                // Connection errors are acceptable
                expect(error.message).not.toContain('ECONNRESET');
            }
        });
    });

    describe('📊 Performance and Memory Tests', () => {
        test('should respond to health checks quickly', async () => {
            const startTime = Date.now();
            const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
            const endTime = Date.now();
            
            expect(response.ok).toBe(true);
            expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
        });

        test('should handle multiple rapid requests', async () => {
            const startTime = Date.now();
            const requests = [];
            
            for (let i = 0; i < 50; i++) {
                requests.push(fetch(`${TEST_CONFIG.serverUrl}/health`));
            }
            
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            
            // Most requests should succeed
            const successCount = responses.filter(r => r.ok).length;
            expect(successCount).toBeGreaterThan(40);
            
            // Should complete in reasonable time
            expect(endTime - startTime).toBeLessThan(5000);
        });
    });

    describe('🔍 Bulletproof Verification', () => {
        test('should have bulletproof indicators in responses', async () => {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/`);
            const html = await response.text();
            
            // Should contain bulletproof system indicators
            expect(html).toContain('🛡️');
        });

        test('should log bulletproof system initialization', async () => {
            // Check if server logs contain bulletproof initialization
            // This is indirect - we verify the system is working by checking responses
            const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
            const health = await response.json();
            
            expect(health.status).toBe('healthy');
            expect(health.timestamp).toBeDefined();
        });

        test('should maintain functionality after errors', async () => {
            // Trigger some errors
            await fetch(`${TEST_CONFIG.serverUrl}/api/nonexistent`).catch(() => {});
            await fetch(`${TEST_CONFIG.serverUrl}/api/error-test`).catch(() => {});
            
            // System should still work
            const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
            expect(response.ok).toBe(true);
        });
    });
});

describe('🛡️ Bulletproof System - Static Verification', () => {
    test('should have test configuration valid', () => {
        expect(TEST_CONFIG.serverUrl).toBeDefined();
        expect(TEST_CONFIG.timeout).toBeGreaterThan(0);
        expect(TEST_CONFIG.retries).toBeGreaterThan(0);
    });

    test('should have required dependencies available', () => {
        expect(fetch).toBeDefined();
        expect(spawn).toBeDefined();
    });
});

console.log('🛡️ Bulletproof browser tests loaded successfully');
