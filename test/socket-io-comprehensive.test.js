/**
 * Comprehensive Socket.IO and WebSocket Fallback Test Suite
 * 
 * This test suite validates the real-time communication system with:
 * - Socket.IO primary connection
 * - WebSocket fallback mechanism
 * - Connection manager functionality
 * - Event sending and receiving
 * - Error handling and recovery
 */

const io = require('socket.io-client');
const WebSocket = require('ws');
const http = require('http');
const assert = require('assert');

describe('Socket.IO and WebSocket Comprehensive Testing', () => {
    let server;
    let socketIOClient;
    let webSocketClient;
    let serverUrl = 'http://localhost:4000';
    let socketIOUrl = 'http://localhost:4000';
    let webSocketUrl = 'ws://localhost:4000';

    beforeAll(async () => {
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(async () => {
        if (socketIOClient) {
            socketIOClient.disconnect();
        }
        if (webSocketClient) {
            webSocketClient.close();
        }
    });

    describe('Server Status Check', () => {
        test('Server should be running and accessible', async () => {
            const response = await fetch(serverUrl);
            assert.strictEqual(response.status, 200);
        });

        test('Socket.IO endpoint should be available', async () => {
            const response = await fetch(`${serverUrl}/socket.io/`);
            assert.strictEqual(response.status, 200);
        });
    });

    describe('Socket.IO Connection Tests', () => {
        test('Should establish Socket.IO connection', (done) => {
            socketIOClient = io(socketIOUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000
            });

            socketIOClient.on('connect', () => {
                console.log('✅ Socket.IO connected successfully');
                assert.strictEqual(socketIOClient.connected, true);
                done();
            });

            socketIOClient.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection failed:', error.message);
                done(error);
            });

            socketIOClient.on('error', (error) => {
                console.error('❌ Socket.IO error:', error);
                done(error);
            });
        });

        test('Should receive connection confirmation', (done) => {
            socketIOClient.on('connected', (data) => {
                console.log('✅ Received connection confirmation:', data);
                assert.ok(data.sessionId);
                assert.ok(data.timestamp);
                done();
            });
        });

        test('Should handle session-based events', (done) => {
            const testSessionId = 'test-session-' + Date.now();
            
            socketIOClient.emit('join-session', { sessionId: testSessionId });
            
            // Listen for session-specific events
            socketIOClient.on('progress', (data) => {
                console.log('✅ Received progress event:', data);
                assert.ok(data.current);
                assert.ok(data.total);
                assert.ok(data.message);
                done();
            });

            // Simulate a progress event
            setTimeout(() => {
                socketIOClient.emit('test-progress', {
                    sessionId: testSessionId,
                    current: 1,
                    total: 10,
                    message: 'Test progress'
                });
            }, 1000);
        });
    });

    describe('WebSocket Fallback Tests', () => {
        test('Should establish WebSocket connection as fallback', (done) => {
            webSocketClient = new WebSocket(webSocketUrl);

            webSocketClient.on('open', () => {
                console.log('✅ WebSocket connected successfully');
                assert.strictEqual(webSocketClient.readyState, WebSocket.OPEN);
                done();
            });

            webSocketClient.on('error', (error) => {
                console.error('❌ WebSocket connection failed:', error.message);
                done(error);
            });
        });

        test('Should send and receive WebSocket messages', (done) => {
            const testMessage = {
                type: 'test',
                sessionId: 'test-ws-session',
                data: { message: 'Hello WebSocket' }
            };

            webSocketClient.on('message', (data) => {
                try {
                    const received = JSON.parse(data.toString());
                    console.log('✅ Received WebSocket message:', received);
                    assert.ok(received.type);
                    done();
                } catch (error) {
                    done(error);
                }
            });

            webSocketClient.send(JSON.stringify(testMessage));
        });
    });

    describe('Connection Manager Tests', () => {
        test('Should handle connection manager status', async () => {
            const response = await fetch(`${serverUrl}/api/connection-status`);
            const data = await response.json();
            
            console.log('✅ Connection manager status:', data);
            assert.ok(data.socketIO);
            assert.ok(data.webSocket);
        });

        test('Should handle connection statistics', async () => {
            const response = await fetch(`${serverUrl}/api/connection-stats`);
            const data = await response.json();
            
            console.log('✅ Connection statistics:', data);
            assert.ok(data.socketIO);
            assert.ok(data.webSocket);
        });
    });

    describe('Event Broadcasting Tests', () => {
        test('Should broadcast progress events', (done) => {
            const testData = {
                sessionId: 'broadcast-test',
                current: 5,
                total: 100,
                message: 'Broadcast test progress',
                counts: { success: 3, failed: 1, skipped: 1 },
                user: { username: 'testuser@example.com' },
                populationName: 'Test Population',
                populationId: 'test-population-id'
            };

            socketIOClient.on('progress', (data) => {
                console.log('✅ Received broadcast progress:', data);
                assert.strictEqual(data.current, testData.current);
                assert.strictEqual(data.total, testData.total);
                assert.strictEqual(data.message, testData.message);
                done();
            });

            // Simulate progress event broadcast
            socketIOClient.emit('broadcast-progress', testData);
        });

        test('Should broadcast completion events', (done) => {
            const testData = {
                sessionId: 'completion-test',
                current: 100,
                total: 100,
                message: 'Import completed successfully',
                counts: { success: 95, failed: 3, skipped: 2 }
            };

            socketIOClient.on('completion', (data) => {
                console.log('✅ Received completion event:', data);
                assert.strictEqual(data.current, testData.current);
                assert.strictEqual(data.total, testData.total);
                assert.strictEqual(data.message, testData.message);
                done();
            });

            socketIOClient.emit('broadcast-completion', testData);
        });

        test('Should broadcast error events', (done) => {
            const testData = {
                sessionId: 'error-test',
                title: 'Test Error',
                message: 'This is a test error message',
                details: { code: 'TEST_ERROR', timestamp: new Date().toISOString() }
            };

            socketIOClient.on('error', (data) => {
                console.log('✅ Received error event:', data);
                assert.strictEqual(data.title, testData.title);
                assert.strictEqual(data.message, testData.message);
                done();
            });

            socketIOClient.emit('broadcast-error', testData);
        });
    });

    describe('Error Handling and Recovery Tests', () => {
        test('Should handle Socket.IO disconnection gracefully', (done) => {
            socketIOClient.on('disconnect', (reason) => {
                console.log('✅ Socket.IO disconnected:', reason);
                assert.ok(reason);
                done();
            });

            socketIOClient.disconnect();
        });

        test('Should handle WebSocket disconnection gracefully', (done) => {
            webSocketClient.on('close', (code, reason) => {
                console.log('✅ WebSocket closed:', code, reason);
                assert.ok(code);
                done();
            });

            webSocketClient.close();
        });

        test('Should handle connection timeouts', (done) => {
            const timeoutClient = io('http://localhost:9999', {
                timeout: 1000,
                transports: ['websocket']
            });

            timeoutClient.on('connect_error', (error) => {
                console.log('✅ Expected connection timeout:', error.message);
                assert.ok(error.message.includes('timeout') || error.message.includes('ECONNREFUSED'));
                timeoutClient.disconnect();
                done();
            });
        });
    });

    describe('Performance and Load Tests', () => {
        test('Should handle multiple concurrent connections', (done) => {
            const clients = [];
            const maxClients = 5;
            let connectedCount = 0;

            for (let i = 0; i < maxClients; i++) {
                const client = io(socketIOUrl);
                
                client.on('connect', () => {
                    connectedCount++;
                    console.log(`✅ Client ${i + 1} connected (${connectedCount}/${maxClients})`);
                    
                    if (connectedCount === maxClients) {
                        console.log('✅ All clients connected successfully');
                        
                        // Clean up
                        clients.forEach(c => c.disconnect());
                        done();
                    }
                });

                client.on('connect_error', (error) => {
                    console.error(`❌ Client ${i + 1} failed to connect:`, error.message);
                    done(error);
                });

                clients.push(client);
            }
        });

        test('Should handle rapid event broadcasting', (done) => {
            const events = [];
            const maxEvents = 10;
            let receivedCount = 0;

            socketIOClient.on('progress', (data) => {
                receivedCount++;
                console.log(`✅ Received event ${receivedCount}/${maxEvents}:`, data.message);
                
                if (receivedCount === maxEvents) {
                    console.log('✅ All rapid events received successfully');
                    done();
                }
            });

            // Send rapid events
            for (let i = 0; i < maxEvents; i++) {
                setTimeout(() => {
                    socketIOClient.emit('rapid-progress', {
                        sessionId: 'rapid-test',
                        current: i + 1,
                        total: maxEvents,
                        message: `Rapid event ${i + 1}`
                    });
                }, i * 100);
            }
        });
    });

    describe('Integration Tests', () => {
        test('Should handle import operation with real-time updates', (done) => {
            const testSessionId = 'import-test-' + Date.now();
            
            socketIOClient.emit('join-session', { sessionId: testSessionId });
            
            let progressCount = 0;
            let completionReceived = false;

            socketIOClient.on('progress', (data) => {
                progressCount++;
                console.log(`✅ Import progress ${progressCount}:`, data.message);
                
                if (progressCount >= 3 && completionReceived) {
                    console.log('✅ Import operation completed successfully');
                    done();
                }
            });

            socketIOClient.on('completion', (data) => {
                completionReceived = true;
                console.log('✅ Import completion received:', data.message);
                
                if (progressCount >= 3) {
                    console.log('✅ Import operation completed successfully');
                    done();
                }
            });

            // Simulate import operation
            setTimeout(() => {
                socketIOClient.emit('start-import', {
                    sessionId: testSessionId,
                    file: 'test-users.csv',
                    populationId: 'test-population',
                    populationName: 'Test Population'
                });
            }, 500);
        });

        test('Should handle export operation with real-time updates', (done) => {
            const testSessionId = 'export-test-' + Date.now();
            
            socketIOClient.emit('join-session', { sessionId: testSessionId });
            
            let progressCount = 0;
            let completionReceived = false;

            socketIOClient.on('progress', (data) => {
                progressCount++;
                console.log(`✅ Export progress ${progressCount}:`, data.message);
                
                if (progressCount >= 2 && completionReceived) {
                    console.log('✅ Export operation completed successfully');
                    done();
                }
            });

            socketIOClient.on('completion', (data) => {
                completionReceived = true;
                console.log('✅ Export completion received:', data.message);
                
                if (progressCount >= 2) {
                    console.log('✅ Export operation completed successfully');
                    done();
                }
            });

            // Simulate export operation
            setTimeout(() => {
                socketIOClient.emit('start-export', {
                    sessionId: testSessionId,
                    populationId: 'test-population',
                    format: 'csv'
                });
            }, 500);
        });
    });
}); 