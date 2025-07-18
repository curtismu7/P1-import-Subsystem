/**
 * Manual Socket.IO Test Script
 * 
 * This script provides manual testing capabilities for Socket.IO and WebSocket functionality.
 * Run this script to test real connections and event handling.
 */

import io from 'socket.io-client';
import WebSocket from 'ws';
import readline from 'readline';

// --- PORT CONFIGURATION ---
const DEFAULT_PORT = process.env.PORT || process.env.SERVER_PORT || 4000;
const cliPortArg = process.argv.find(arg => arg.startsWith('--port='));
const PORT = cliPortArg ? parseInt(cliPortArg.split('=')[1], 10) : DEFAULT_PORT;
const serverUrl = `http://localhost:${PORT}`;
const socketIOUrl = `http://localhost:${PORT}`;
const webSocketUrl = `ws://localhost:${PORT}`;

class ManualSocketTester {
    constructor() {
        this.socketIOClient = null;
        this.webSocketClient = null;
        this.testSessionId = 'manual-test-' + Date.now();
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start() {
        console.log('🚀 Starting Manual Socket.IO and WebSocket Test');
        console.log('===============================================');
        
        await this.testServerStatus();
        await this.testSocketIOConnection();
        await this.testWebSocketConnection();
        await this.runInteractiveTests();
    }

    async testServerStatus() {
        console.log('\n📡 Testing Server Status...');
        
        try {
            const response = await fetch(serverUrl);
            if (response.status === 200) {
                console.log('✅ Server is running and accessible');
            } else {
                console.log('❌ Server returned status:', response.status);
            }
        } catch (error) {
            console.log('❌ Server connection failed:', error.message);
        }
    }

    async testSocketIOConnection() {
        console.log('\n🔌 Testing Socket.IO Connection...');
        
        return new Promise((resolve) => {
            this.socketIOClient = io(socketIOUrl, {
                transports: ['polling', 'websocket'], // Try polling first, then websocket
                timeout: 10000
            });

            this.socketIOClient.on('connect', () => {
                console.log('✅ Socket.IO connected successfully');
                console.log('   Session ID:', this.socketIOClient.id);
                resolve();
            });

            this.socketIOClient.on('connect_error', (error) => {
                console.log('❌ Socket.IO connection failed:', error.message);
                resolve();
            });

            this.socketIOClient.on('error', (error) => {
                console.log('❌ Socket.IO error:', error);
            });

            this.socketIOClient.on('disconnect', (reason) => {
                console.log('🔌 Socket.IO disconnected:', reason);
            });
        });
    }

    async testWebSocketConnection() {
        console.log('\n🌐 Testing WebSocket Connection...');
        
        return new Promise((resolve) => {
            this.webSocketClient = new WebSocket(webSocketUrl);

            this.webSocketClient.on('open', () => {
                console.log('✅ WebSocket connected successfully');
                resolve();
            });

            this.webSocketClient.on('error', (error) => {
                console.log('❌ WebSocket connection failed:', error.message);
                if (error.code) {
                    console.log('   Error code:', error.code);
                }
                resolve();
            });

            this.webSocketClient.on('close', (code, reason) => {
                console.log('🔌 WebSocket closed:', code, reason);
                // Handle specific close codes
                if (code === 1006) {
                    console.log('   Abnormal closure - connection was closed without proper close frame');
                } else if (code === 1000) {
                    console.log('   Normal closure');
                } else if (code === 1001) {
                    console.log('   Going away - server is shutting down');
                }
            });

            this.webSocketClient.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('📨 WebSocket message received:', message);
                } catch (error) {
                    console.log('📨 WebSocket raw message:', data.toString());
                }
            });

            // Add timeout for connection
            setTimeout(() => {
                if (this.webSocketClient.readyState === WebSocket.CONNECTING) {
                    console.log('⏰ WebSocket connection timeout');
                    this.webSocketClient.close();
                    resolve();
                }
            }, 10000); // 10 second timeout
        });
    }

    async runInteractiveTests() {
        console.log('\n🎮 Interactive Test Mode');
        console.log('========================');
        console.log('Available commands:');
        console.log('  progress - Send test progress event');
        console.log('  completion - Send test completion event');
        console.log('  error - Send test error event');
        console.log('  join - Join test session');
        console.log('  broadcast - Broadcast test message');
        console.log('  ws-send - Send WebSocket message');
        console.log('  status - Show connection status');
        console.log('  quit - Exit test mode');
        
        this.setupEventListeners();
        this.promptForCommand();
    }

    setupEventListeners() {
        if (this.socketIOClient) {
            this.socketIOClient.on('progress', (data) => {
                console.log('📊 Progress event received:', data);
            });

            this.socketIOClient.on('completion', (data) => {
                console.log('✅ Completion event received:', data);
            });

            this.socketIOClient.on('error', (data) => {
                console.log('❌ Error event received:', data);
            });

            this.socketIOClient.on('connected', (data) => {
                console.log('🔗 Connection confirmation received:', data);
            });
        }
    }

    promptForCommand() {
        this.rl.question('\nEnter command: ', async (command) => {
            await this.executeCommand(command.trim().toLowerCase());
        });
    }

    async executeCommand(command) {
        switch (command) {
            case 'progress':
                await this.sendProgressEvent();
                break;
            case 'completion':
                await this.sendCompletionEvent();
                break;
            case 'error':
                await this.sendErrorEvent();
                break;
            case 'join':
                await this.joinSession();
                break;
            case 'broadcast':
                await this.broadcastMessage();
                break;
            case 'ws-send':
                await this.sendWebSocketMessage();
                break;
            case 'status':
                this.showStatus();
                break;
            case 'quit':
                await this.cleanup();
                return;
            default:
                console.log('❌ Unknown command:', command);
        }
        
        this.promptForCommand();
    }

    async sendProgressEvent() {
        if (!this.socketIOClient || !this.socketIOClient.connected) {
            console.log('❌ Socket.IO not connected');
            return;
        }

        const progressData = {
            sessionId: this.testSessionId,
            current: Math.floor(Math.random() * 100) + 1,
            total: 100,
            message: 'Manual test progress event',
            counts: { 
                success: Math.floor(Math.random() * 50), 
                failed: Math.floor(Math.random() * 10), 
                skipped: Math.floor(Math.random() * 5) 
            },
            user: { 
                username: 'manual-test@example.com',
                email: 'manual-test@example.com'
            },
            populationName: 'Manual Test Population',
            populationId: 'manual-test-population-id',
            timestamp: new Date().toISOString()
        };

        this.socketIOClient.emit('test-progress', progressData);
        console.log('📤 Progress event sent:', progressData);
    }

    async sendCompletionEvent() {
        if (!this.socketIOClient || !this.socketIOClient.connected) {
            console.log('❌ Socket.IO not connected');
            return;
        }

        const completionData = {
            sessionId: this.testSessionId,
            current: 100,
            total: 100,
            message: 'Manual test completion event',
            counts: { success: 95, failed: 3, skipped: 2 },
            timestamp: new Date().toISOString()
        };

        this.socketIOClient.emit('test-completion', completionData);
        console.log('📤 Completion event sent:', completionData);
    }

    async sendErrorEvent() {
        if (!this.socketIOClient || !this.socketIOClient.connected) {
            console.log('❌ Socket.IO not connected');
            return;
        }

        const errorData = {
            sessionId: this.testSessionId,
            title: 'Manual Test Error',
            message: 'This is a manual test error message',
            details: { 
                code: 'MANUAL_TEST_ERROR', 
                timestamp: new Date().toISOString() 
            }
        };

        this.socketIOClient.emit('test-error', errorData);
        console.log('📤 Error event sent:', errorData);
    }

    async joinSession() {
        if (!this.socketIOClient || !this.socketIOClient.connected) {
            console.log('❌ Socket.IO not connected');
            return;
        }

        this.socketIOClient.emit('join-session', { sessionId: this.testSessionId });
        console.log('📤 Joined session:', this.testSessionId);
    }

    async broadcastMessage() {
        if (!this.socketIOClient || !this.socketIOClient.connected) {
            console.log('❌ Socket.IO not connected');
            return;
        }

        const message = {
            sessionId: this.testSessionId,
            type: 'broadcast',
            message: 'Manual test broadcast message',
            timestamp: new Date().toISOString()
        };

        this.socketIOClient.emit('broadcast', message);
        console.log('📤 Broadcast message sent:', message);
    }

    async sendWebSocketMessage() {
        if (!this.webSocketClient || this.webSocketClient.readyState !== WebSocket.OPEN) {
            console.log('❌ WebSocket not connected');
            return;
        }

        const message = {
            type: 'manual-test',
            sessionId: this.testSessionId,
            data: {
                message: 'Manual WebSocket test message',
                timestamp: new Date().toISOString()
            }
        };

        this.webSocketClient.send(JSON.stringify(message));
        console.log('📤 WebSocket message sent:', message);
    }

    showStatus() {
        console.log('\n📊 Connection Status:');
        console.log('====================');
        
        if (this.socketIOClient) {
            console.log('Socket.IO:', this.socketIOClient.connected ? '✅ Connected' : '❌ Disconnected');
            if (this.socketIOClient.connected) {
                console.log('  Session ID:', this.socketIOClient.id);
            }
        } else {
            console.log('Socket.IO: ❌ Not initialized');
        }
        
        if (this.webSocketClient) {
            const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            console.log('WebSocket:', states[this.webSocketClient.readyState]);
        } else {
            console.log('WebSocket: ❌ Not initialized');
        }
        
        console.log('Test Session ID:', this.testSessionId);
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up connections...');
        
        if (this.socketIOClient) {
            this.socketIOClient.disconnect();
            console.log('✅ Socket.IO disconnected');
        }
        
        if (this.webSocketClient) {
            // Close WebSocket gracefully
            if (this.webSocketClient.readyState === WebSocket.OPEN) {
                this.webSocketClient.close(1000, 'Manual test cleanup');
            } else {
                this.webSocketClient.terminate();
            }
            console.log('✅ WebSocket closed');
        }
        
        this.rl.close();
        console.log('✅ Manual test completed');
        process.exit(0);
    }
}

// Run the manual test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ManualSocketTester();
    tester.start().catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

export default ManualSocketTester; 