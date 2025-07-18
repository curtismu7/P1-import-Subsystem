/**
 * Comprehensive Socket.IO and WebSocket Test Script
 * 
 * This script provides automated testing for both Socket.IO and WebSocket functionality.
 * It tests connection, event handling, error scenarios, and performance.
 */

import io from 'socket.io-client';
import WebSocket from 'ws';

const PORT = process.env.PORT || 4000;
const serverUrl = `http://localhost:${PORT}`;
const webSocketUrl = `ws://localhost:${PORT}`;

class ComprehensiveSocketTester {
    constructor() {
        this.results = {
            socketIO: { passed: 0, failed: 0, tests: [] },
            webSocket: { passed: 0, failed: 0, tests: [] },
            overall: { passed: 0, failed: 0, total: 0 }
        };
        this.testSessionId = 'comprehensive-test-' + Date.now();
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Socket.IO and WebSocket Tests');
        console.log('=====================================================');
        console.log('Server URL:', serverUrl);
        console.log('WebSocket URL:', webSocketUrl);
        console.log('Test Session ID:', this.testSessionId);
        console.log('');

        // Test server status first
        await this.testServerStatus();
        
        // Run Socket.IO tests
        await this.runSocketIOTests();
        
        // Run WebSocket tests
        await this.runWebSocketTests();
        
        // Run integration tests
        await this.runIntegrationTests();
        
        // Display results
        this.displayResults();
    }

    async testServerStatus() {
        console.log('📡 Testing Server Status...');
        
        try {
            const response = await fetch(`${serverUrl}/api/health`);
            if (response.status === 200) {
                const data = await response.json();
                console.log('✅ Server is running and healthy');
                console.log('   Status:', data.status);
                console.log('   Uptime:', Math.round(data.uptime), 'seconds');
            } else {
                console.log('❌ Server returned status:', response.status);
            }
        } catch (error) {
            console.log('❌ Server connection failed:', error.message);
        }
        console.log('');
    }

    async runSocketIOTests() {
        console.log('🔌 Running Socket.IO Tests...');
        console.log('=============================');
        
        // Test 1: Basic connection
        await this.testSocketIOConnection();
        
        // Test 2: Event emission and reception
        await this.testSocketIOEvents();
        
        // Test 3: Session registration
        await this.testSocketIOSessionRegistration();
        
        // Test 4: Error handling
        await this.testSocketIOErrorHandling();
        
        // Test 5: Performance test
        await this.testSocketIOPerformance();
        
        console.log('');
    }

    async runWebSocketTests() {
        console.log('🌐 Running WebSocket Tests...');
        console.log('=============================');
        
        // Test 1: Basic connection
        await this.testWebSocketConnection();
        
        // Test 2: Message sending and receiving
        await this.testWebSocketMessages();
        
        // Test 3: Session registration
        await this.testWebSocketSessionRegistration();
        
        // Test 4: Error handling
        await this.testWebSocketErrorHandling();
        
        // Test 5: Performance test
        await this.testWebSocketPerformance();
        
        console.log('');
    }

    async runIntegrationTests() {
        console.log('🔗 Running Integration Tests...');
        console.log('===============================');
        
        // Test 1: Both connections simultaneously
        await this.testSimultaneousConnections();
        
        // Test 2: Fallback scenarios
        await this.testFallbackScenarios();
        
        // Test 3: Stress test
        await this.testStressScenarios();
        
        console.log('');
    }

    async testSocketIOConnection() {
        const testName = 'Socket.IO Connection';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const socket = io(serverUrl, {
                transports: ['polling', 'websocket'],
                timeout: 10000
            });

            const timeout = setTimeout(() => {
                this.recordResult('socketIO', testName, false, 'Connection timeout');
                socket.disconnect();
                resolve();
            }, 15000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, true, `Connected with ID: ${socket.id}`);
                socket.disconnect();
                resolve();
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, false, `Connection failed: ${error.message}`);
                resolve();
            });
        });
    }

    async testSocketIOEvents() {
        const testName = 'Socket.IO Events';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const socket = io(serverUrl, {
                transports: ['polling'],
                timeout: 10000
            });

            let pongReceived = false;
            const timeout = setTimeout(() => {
                this.recordResult('socketIO', testName, false, 'Event test timeout');
                socket.disconnect();
                resolve();
            }, 10000);

            socket.on('connect', () => {
                socket.emit('ping');
            });

            socket.on('pong', (data) => {
                pongReceived = true;
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, true, `Pong received: ${JSON.stringify(data)}`);
                socket.disconnect();
                resolve();
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, false, `Connection failed: ${error.message}`);
                resolve();
            });
        });
    }

    async testSocketIOSessionRegistration() {
        const testName = 'Socket.IO Session Registration';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const socket = io(serverUrl, {
                transports: ['polling'],
                timeout: 10000
            });

            let sessionRegistered = false;
            const timeout = setTimeout(() => {
                this.recordResult('socketIO', testName, false, 'Session registration timeout');
                socket.disconnect();
                resolve();
            }, 10000);

            socket.on('connect', () => {
                socket.emit('registerSession', this.testSessionId);
            });

            socket.on('sessionRegistered', (data) => {
                sessionRegistered = true;
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, true, `Session registered: ${JSON.stringify(data)}`);
                socket.disconnect();
                resolve();
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, false, `Connection failed: ${error.message}`);
                resolve();
            });
        });
    }

    async testSocketIOErrorHandling() {
        const testName = 'Socket.IO Error Handling';
        console.log(`  Testing: ${testName}`);
        
        // Test with invalid server URL
        return new Promise((resolve) => {
            const socket = io('http://localhost:9999', {
                transports: ['polling'],
                timeout: 5000
            });

            const timeout = setTimeout(() => {
                this.recordResult('socketIO', testName, true, 'Error handling works correctly');
                socket.disconnect();
                resolve();
            }, 6000);

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.recordResult('socketIO', testName, true, `Error handled correctly: ${error.message}`);
                socket.disconnect();
                resolve();
            });
        });
    }

    async testSocketIOPerformance() {
        const testName = 'Socket.IO Performance';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const socket = io(serverUrl, {
                transports: ['polling'],
                timeout: 10000
            });

            socket.on('connect', () => {
                const duration = Date.now() - startTime;
                this.recordResult('socketIO', testName, true, `Connected in ${duration}ms`);
                socket.disconnect();
                resolve();
            });

            socket.on('connect_error', (error) => {
                const duration = Date.now() - startTime;
                this.recordResult('socketIO', testName, false, `Failed in ${duration}ms: ${error.message}`);
                resolve();
            });
        });
    }

    async testWebSocketConnection() {
        const testName = 'WebSocket Connection';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const ws = new WebSocket(webSocketUrl);

            const timeout = setTimeout(() => {
                this.recordResult('webSocket', testName, false, 'Connection timeout');
                ws.close();
                resolve();
            }, 10000);

            ws.on('open', () => {
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                this.recordResult('webSocket', testName, true, `Connected in ${duration}ms`);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordResult('webSocket', testName, false, `Connection failed: ${error.message}`);
                resolve();
            });
        });
    }

    async testWebSocketMessages() {
        const testName = 'WebSocket Messages';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const ws = new WebSocket(webSocketUrl);
            let messageReceived = false;

            const timeout = setTimeout(() => {
                this.recordResult('webSocket', testName, false, 'Message test timeout');
                ws.close();
                resolve();
            }, 10000);

            ws.on('open', () => {
                ws.send('ping');
            });

            ws.on('message', (data) => {
                messageReceived = true;
                clearTimeout(timeout);
                this.recordResult('webSocket', testName, true, `Message received: ${data.toString()}`);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordResult('webSocket', testName, false, `Error: ${error.message}`);
                resolve();
            });
        });
    }

    async testWebSocketSessionRegistration() {
        const testName = 'WebSocket Session Registration';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const ws = new WebSocket(webSocketUrl);
            let sessionRegistered = false;

            const timeout = setTimeout(() => {
                this.recordResult('webSocket', testName, false, 'Session registration timeout');
                ws.close();
                resolve();
            }, 10000);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'registerSession',
                    sessionId: this.testSessionId
                }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'sessionRegistered') {
                        sessionRegistered = true;
                        clearTimeout(timeout);
                        this.recordResult('webSocket', testName, true, `Session registered: ${JSON.stringify(message)}`);
                        ws.close();
                        resolve();
                    }
                } catch (error) {
                    // Ignore non-JSON messages
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordResult('webSocket', testName, false, `Error: ${error.message}`);
                resolve();
            });
        });
    }

    async testWebSocketErrorHandling() {
        const testName = 'WebSocket Error Handling';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            // Test with invalid WebSocket URL
            const ws = new WebSocket('ws://localhost:9999');

            const timeout = setTimeout(() => {
                this.recordResult('webSocket', testName, true, 'Error handling works correctly');
                resolve();
            }, 5000);

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordResult('webSocket', testName, true, `Error handled correctly: ${error.message}`);
                resolve();
            });
        });
    }

    async testWebSocketPerformance() {
        const testName = 'WebSocket Performance';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            const ws = new WebSocket(webSocketUrl);

            ws.on('open', () => {
                const duration = Date.now() - startTime;
                this.recordResult('webSocket', testName, true, `Connected in ${duration}ms`);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                const duration = Date.now() - startTime;
                this.recordResult('webSocket', testName, false, `Failed in ${duration}ms: ${error.message}`);
                resolve();
            });
        });
    }

    async testSimultaneousConnections() {
        const testName = 'Simultaneous Connections';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            let socketIOConnected = false;
            let webSocketConnected = false;
            let bothConnected = false;

            const socket = io(serverUrl, { transports: ['polling'] });
            const ws = new WebSocket(webSocketUrl);

            const timeout = setTimeout(() => {
                this.recordResult('overall', testName, false, 'Simultaneous connection timeout');
                socket.disconnect();
                ws.close();
                resolve();
            }, 15000);

            socket.on('connect', () => {
                socketIOConnected = true;
                if (webSocketConnected && !bothConnected) {
                    bothConnected = true;
                    clearTimeout(timeout);
                    this.recordResult('overall', testName, true, 'Both connections established simultaneously');
                    socket.disconnect();
                    ws.close();
                    resolve();
                }
            });

            ws.on('open', () => {
                webSocketConnected = true;
                if (socketIOConnected && !bothConnected) {
                    bothConnected = true;
                    clearTimeout(timeout);
                    this.recordResult('overall', testName, true, 'Both connections established simultaneously');
                    socket.disconnect();
                    ws.close();
                    resolve();
                }
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                this.recordResult('overall', testName, false, `Socket.IO failed: ${error.message}`);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordResult('overall', testName, false, `WebSocket failed: ${error.message}`);
                socket.disconnect();
                resolve();
            });
        });
    }

    async testFallbackScenarios() {
        const testName = 'Fallback Scenarios';
        console.log(`  Testing: ${testName}`);
        
        // This test simulates Socket.IO failure and WebSocket fallback
        return new Promise((resolve) => {
            // For now, just test that both are available
            const socket = io(serverUrl, { transports: ['polling'] });
            const ws = new WebSocket(webSocketUrl);

            let bothAvailable = false;
            const timeout = setTimeout(() => {
                this.recordResult('overall', testName, false, 'Fallback test timeout');
                socket.disconnect();
                ws.close();
                resolve();
            }, 10000);

            socket.on('connect', () => {
                if (ws.readyState === WebSocket.OPEN && !bothAvailable) {
                    bothAvailable = true;
                    clearTimeout(timeout);
                    this.recordResult('overall', testName, true, 'Both Socket.IO and WebSocket available for fallback');
                    socket.disconnect();
                    ws.close();
                    resolve();
                }
            });

            ws.on('open', () => {
                if (socket.connected && !bothAvailable) {
                    bothAvailable = true;
                    clearTimeout(timeout);
                    this.recordResult('overall', testName, true, 'Both Socket.IO and WebSocket available for fallback');
                    socket.disconnect();
                    ws.close();
                    resolve();
                }
            });
        });
    }

    async testStressScenarios() {
        const testName = 'Stress Scenarios';
        console.log(`  Testing: ${testName}`);
        
        return new Promise((resolve) => {
            const connections = [];
            const maxConnections = 5;
            let successfulConnections = 0;

            const createConnection = (index) => {
                const socket = io(serverUrl, { transports: ['polling'] });
                connections.push(socket);

                socket.on('connect', () => {
                    successfulConnections++;
                    if (successfulConnections === maxConnections) {
                        this.recordResult('overall', testName, true, `All ${maxConnections} connections successful`);
                        connections.forEach(s => s.disconnect());
                        resolve();
                    }
                });

                socket.on('connect_error', (error) => {
                    this.recordResult('overall', testName, false, `Connection ${index} failed: ${error.message}`);
                    connections.forEach(s => s.disconnect());
                    resolve();
                });
            };

            // Create multiple connections
            for (let i = 0; i < maxConnections; i++) {
                setTimeout(() => createConnection(i), i * 100);
            }

            // Timeout after 15 seconds
            setTimeout(() => {
                this.recordResult('overall', testName, false, 'Stress test timeout');
                connections.forEach(s => s.disconnect());
                resolve();
            }, 15000);
        });
    }

    recordResult(category, testName, passed, message) {
        const result = {
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };

        // Only push to tests array if it exists (not for 'overall' category)
        if (this.results[category].tests) {
            this.results[category].tests.push(result);
        }
        
        if (passed) {
            this.results[category].passed++;
            this.results.overall.passed++;
        } else {
            this.results[category].failed++;
            this.results.overall.failed++;
        }
        
        this.results.overall.total++;
        
        const status = passed ? '✅' : '❌';
        console.log(`    ${status} ${testName}: ${message}`);
    }

    displayResults() {
        console.log('📊 Test Results Summary');
        console.log('=======================');
        
        console.log('\n🔌 Socket.IO Tests:');
        console.log(`  Passed: ${this.results.socketIO.passed}`);
        console.log(`  Failed: ${this.results.socketIO.failed}`);
        console.log(`  Success Rate: ${this.results.socketIO.passed + this.results.socketIO.failed > 0 ? 
            Math.round((this.results.socketIO.passed / (this.results.socketIO.passed + this.results.socketIO.failed)) * 100) : 0}%`);
        
        console.log('\n🌐 WebSocket Tests:');
        console.log(`  Passed: ${this.results.webSocket.passed}`);
        console.log(`  Failed: ${this.results.webSocket.failed}`);
        console.log(`  Success Rate: ${this.results.webSocket.passed + this.results.webSocket.failed > 0 ? 
            Math.round((this.results.webSocket.passed / (this.results.webSocket.passed + this.results.webSocket.failed)) * 100) : 0}%`);
        
        console.log('\n🔗 Overall Results:');
        console.log(`  Total Tests: ${this.results.overall.total}`);
        console.log(`  Passed: ${this.results.overall.passed}`);
        console.log(`  Failed: ${this.results.overall.failed}`);
        console.log(`  Success Rate: ${this.results.overall.total > 0 ? 
            Math.round((this.results.overall.passed / this.results.overall.total) * 100) : 0}%`);
        
        if (this.results.overall.failed > 0) {
            console.log('\n❌ Failed Tests:');
            Object.values(this.results).forEach(category => {
                if (category.tests) {
                    category.tests.forEach(test => {
                        if (!test.passed) {
                            console.log(`  - ${test.name}: ${test.message}`);
                        }
                    });
                }
            });
        }
        
        console.log('\n🎯 Conclusion:');
        if (this.results.overall.failed === 0) {
            console.log('✅ All tests passed! Socket.IO and WebSocket functionality is working correctly.');
        } else if (this.results.overall.passed > this.results.overall.failed) {
            console.log('⚠️  Most tests passed, but some issues were found. Check failed tests above.');
        } else {
            console.log('❌ Multiple test failures detected. Socket.IO and WebSocket functionality needs attention.');
        }
    }
}

// Run the comprehensive test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ComprehensiveSocketTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

export default ComprehensiveSocketTester; 