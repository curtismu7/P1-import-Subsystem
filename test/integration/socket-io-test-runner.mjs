/**
 * Socket.IO Test Runner
 * 
 * Manages server startup and Socket.IO testing with real data
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-07-30
 */

import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import fetch from 'node-fetch';

class SocketIOTestRunner {
    constructor(options = {}) {
        this.serverScript = options.serverScript || 'server.js';
        this.serverPort = options.serverPort || 4000;
        this.testPort = options.testPort || 4001;
        this.timeout = options.timeout || 60000;
        this.serverProcess = null;
        this.isServerReady = false;
    }
    
    async startServer() {
        console.log('🚀 Starting server for Socket.IO tests...');
        
        this.serverProcess = spawn('node', [this.serverScript], {
            env: { 
                ...process.env, 
                PORT: this.testPort,
                NODE_ENV: 'test',
                TEST_MODE: 'true'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Capture server output
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[SERVER] ${output.trim()}`);
            
            // Check for server ready indicators
            if (output.includes('listening') || output.includes('Server running')) {
                this.isServerReady = true;
            }
        });
        
        this.serverProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.error(`[SERVER ERROR] ${output.trim()}`);
        });
        
        this.serverProcess.on('error', (error) => {
            console.error('Server process error:', error);
        });
        
        this.serverProcess.on('exit', (code, signal) => {
            console.log(`Server process exited with code ${code} and signal ${signal}`);
            this.isServerReady = false;
        });
        
        // Wait for server to be ready
        await this.waitForServer();
        
        console.log(`✅ Server started on port ${this.testPort}`);
        return this.serverProcess;
    }
    
    async waitForServer(maxAttempts = 30) {
        console.log('⏳ Waiting for server to be ready...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(`http://localhost:${this.testPort}/api/health`, {
                    timeout: 3000
                });
                
                if (response.ok) {
                    console.log(`✅ Server is ready after ${attempt} attempts`);
                    this.isServerReady = true;
                    return true;
                }
            } catch (error) {
                console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Server not ready yet...`);
            }
            
            await delay(2000); // Wait 2 seconds between attempts
        }
        
        throw new Error(`Server failed to start after ${maxAttempts} attempts`);
    }
    
    async stopServer() {
        if (this.serverProcess) {
            console.log('🛑 Stopping test server...');
            
            this.serverProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('⚠️ Force killing server process...');
                    this.serverProcess.kill('SIGKILL');
                    resolve();
                }, 10000);
                
                this.serverProcess.on('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
            
            this.serverProcess = null;
            this.isServerReady = false;
            console.log('✅ Server stopped');
        }
    }
    
    async runTests() {
        try {
            // Start server
            await this.startServer();
            
            // Run Socket.IO tests
            console.log('🧪 Running Socket.IO tests with real data...');
            
            const testProcess = spawn('npx', [
                'jest',
                'test/integration/socket-io-real-data.test.mjs',
                '--config=jest.config.mjs',
                '--verbose',
                '--detectOpenHandles',
                '--forceExit'
            ], {
                env: {
                    ...process.env,
                    TEST_SERVER_URL: `http://localhost:${this.testPort}`,
                    NODE_ENV: 'test'
                },
                stdio: 'inherit'
            });
            
            const testResult = await new Promise((resolve) => {
                testProcess.on('exit', (code) => {
                    resolve(code);
                });
            });
            
            if (testResult === 0) {
                console.log('✅ All Socket.IO tests passed!');
            } else {
                console.log('❌ Some Socket.IO tests failed');
            }
            
            return testResult;
            
        } catch (error) {
            console.error('❌ Test runner error:', error);
            return 1;
        } finally {
            // Always stop server
            await this.stopServer();
        }
    }
    
    async runQuickTest() {
        try {
            console.log('🔍 Running quick Socket.IO connection test...');
            
            // Check if server is already running
            try {
                const response = await fetch(`http://localhost:${this.serverPort}/api/health`);
                if (response.ok) {
                    console.log('✅ Server is already running, testing Socket.IO connection...');
                    return await this.testSocketIOConnection(`http://localhost:${this.serverPort}`);
                }
            } catch (error) {
                console.log('⚠️ Server not running on default port, starting test server...');
            }
            
            // Start test server
            await this.startServer();
            
            // Test Socket.IO connection
            const result = await this.testSocketIOConnection(`http://localhost:${this.testPort}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Quick test error:', error);
            return false;
        } finally {
            await this.stopServer();
        }
    }
    
    async testSocketIOConnection(serverUrl) {
        try {
            const { io } = await import('socket.io-client');
            
            const client = io(serverUrl, {
                timeout: 10000,
                reconnection: false
            });
            
            const connectionTest = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);
                
                client.on('connect', () => {
                    clearTimeout(timeout);
                    console.log(`✅ Socket.IO connection successful: ${client.id}`);
                    
                    // Test session registration
                    const sessionId = `quick-test-${Date.now()}`;
                    
                    client.on('sessionRegistered', (data) => {
                        console.log(`✅ Session registered: ${data.sessionId}`);
                        client.disconnect();
                        resolve(true);
                    });
                    
                    client.emit('join-session', { sessionId });
                });
                
                client.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            return await connectionTest;
            
        } catch (error) {
            console.error('❌ Socket.IO connection test failed:', error);
            return false;
        }
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new SocketIOTestRunner();
    
    const command = process.argv[2] || 'test';
    
    switch (command) {
        case 'test':
        case 'run':
            const exitCode = await runner.runTests();
            process.exit(exitCode);
            break;
            
        case 'quick':
        case 'check':
            const success = await runner.runQuickTest();
            process.exit(success ? 0 : 1);
            break;
            
        case 'start':
            await runner.startServer();
            console.log('Server started. Press Ctrl+C to stop.');
            process.on('SIGINT', async () => {
                await runner.stopServer();
                process.exit(0);
            });
            break;
            
        default:
            console.log(`
Socket.IO Test Runner

Usage:
  node test/integration/socket-io-test-runner.mjs [command]

Commands:
  test, run    - Start server and run full Socket.IO test suite
  quick, check - Quick Socket.IO connection test
  start        - Start test server and keep running
  
Examples:
  node test/integration/socket-io-test-runner.mjs test
  node test/integration/socket-io-test-runner.mjs quick
  node test/integration/socket-io-test-runner.mjs start
            `);
            break;
    }
}

export default SocketIOTestRunner;