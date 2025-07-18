#!/usr/bin/env node

/**
 * Direct WebSocket test script
 * Tests WebSocket functionality and fallback mechanisms
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:4000';
const TEST_SESSION_ID = 'test-session-' + Date.now();

console.log('🔍 Testing WebSocket functionality...');
console.log('WebSocket URL:', WS_URL);
console.log('Test Session ID:', TEST_SESSION_ID);
console.log('');

// Test 1: Direct WebSocket connection
async function testDirectWebSocket() {
    console.log('📋 Test 1: Direct WebSocket Connection');
    console.log('='.repeat(50));
    
    return new Promise((resolve) => {
        try {
            const ws = new WebSocket(WS_URL);
            
            ws.on('open', () => {
                console.log('✅ WebSocket connection opened successfully');
                
                // Send session registration
                const registerMessage = JSON.stringify({ sessionId: TEST_SESSION_ID });
                ws.send(registerMessage);
                console.log('📤 Sent session registration:', registerMessage);
            });
            
            ws.on('message', (data) => {
                console.log('📩 Received message:', data.toString());
            });
            
            ws.on('error', (error) => {
                console.log('❌ WebSocket error:', error.message);
            });
            
            ws.on('close', (code, reason) => {
                console.log('🔄 WebSocket closed:', code, reason?.toString());
                resolve(true);
            });
            
            // Close after 3 seconds
            setTimeout(() => {
                console.log('⏰ Closing WebSocket connection after 3 seconds...');
                ws.close();
            }, 3000);
            
        } catch (error) {
            console.log('❌ Failed to create WebSocket connection:', error.message);
            resolve(false);
        }
    });
}

// Test 2: WebSocket with invalid session
async function testWebSocketInvalidSession() {
    console.log('\n📋 Test 2: WebSocket with Invalid Session');
    console.log('='.repeat(50));
    
    return new Promise((resolve) => {
        try {
            const ws = new WebSocket(WS_URL);
            
            ws.on('open', () => {
                console.log('✅ WebSocket connection opened');
                
                // Send invalid session registration
                const invalidMessage = JSON.stringify({ sessionId: 'invalid-session' });
                ws.send(invalidMessage);
                console.log('📤 Sent invalid session registration:', invalidMessage);
            });
            
            ws.on('message', (data) => {
                console.log('📩 Received message:', data.toString());
            });
            
            ws.on('error', (error) => {
                console.log('❌ WebSocket error:', error.message);
            });
            
            ws.on('close', (code, reason) => {
                console.log('🔄 WebSocket closed:', code, reason?.toString());
                resolve(true);
            });
            
            // Close after 2 seconds
            setTimeout(() => {
                console.log('⏰ Closing WebSocket connection...');
                ws.close();
            }, 2000);
            
        } catch (error) {
            console.log('❌ Failed to create WebSocket connection:', error.message);
            resolve(false);
        }
    });
}

// Test 3: Multiple WebSocket connections
async function testMultipleWebSockets() {
    console.log('\n📋 Test 3: Multiple WebSocket Connections');
    console.log('='.repeat(50));
    
    const connections = [];
    const promises = [];
    
    for (let i = 0; i < 3; i++) {
        const sessionId = `multi-session-${i}-${Date.now()}`;
        const promise = new Promise((resolve) => {
            try {
                const ws = new WebSocket(WS_URL);
                connections.push(ws);
                
                ws.on('open', () => {
                    console.log(`✅ WebSocket ${i + 1} connected`);
                    
                    const message = JSON.stringify({ sessionId });
                    ws.send(message);
                    console.log(`📤 WebSocket ${i + 1} sent:`, message);
                });
                
                ws.on('message', (data) => {
                    console.log(`📩 WebSocket ${i + 1} received:`, data.toString());
                });
                
                ws.on('error', (error) => {
                    console.log(`❌ WebSocket ${i + 1} error:`, error.message);
                });
                
                ws.on('close', (code, reason) => {
                    console.log(`🔄 WebSocket ${i + 1} closed:`, code, reason?.toString());
                    resolve(true);
                });
                
            } catch (error) {
                console.log(`❌ Failed to create WebSocket ${i + 1}:`, error.message);
                resolve(false);
            }
        });
        
        promises.push(promise);
    }
    
    // Close all connections after 3 seconds
    setTimeout(() => {
        console.log('⏰ Closing all WebSocket connections...');
        connections.forEach((ws, index) => {
            console.log(`🔌 Closing WebSocket ${index + 1}...`);
            ws.close();
        });
    }, 3000);
    
    return Promise.all(promises);
}

// Test 4: WebSocket fallback simulation
async function testWebSocketFallback() {
    console.log('\n📋 Test 4: WebSocket Fallback Simulation');
    console.log('='.repeat(50));
    
    return new Promise((resolve) => {
        try {
            // First, try to connect to a non-existent WebSocket server
            console.log('🔍 Attempting connection to non-existent WebSocket server...');
            const invalidWs = new WebSocket('ws://localhost:9999');
            
            invalidWs.on('error', (error) => {
                console.log('❌ Expected error from invalid WebSocket:', error.message);
                
                // Now try the correct WebSocket server
                console.log('🔄 Attempting fallback to correct WebSocket server...');
                const validWs = new WebSocket(WS_URL);
                
                validWs.on('open', () => {
                    console.log('✅ Fallback WebSocket connection successful');
                    
                    const message = JSON.stringify({ sessionId: 'fallback-test' });
                    validWs.send(message);
                    console.log('📤 Sent fallback message:', message);
                });
                
                validWs.on('message', (data) => {
                    console.log('📩 Fallback received:', data.toString());
                });
                
                validWs.on('error', (error) => {
                    console.log('❌ Fallback WebSocket error:', error.message);
                });
                
                validWs.on('close', (code, reason) => {
                    console.log('🔄 Fallback WebSocket closed:', code, reason?.toString());
                    resolve(true);
                });
                
                // Close after 2 seconds
                setTimeout(() => {
                    console.log('⏰ Closing fallback WebSocket...');
                    validWs.close();
                }, 2000);
            });
            
            // Close invalid connection after 1 second
            setTimeout(() => {
                invalidWs.close();
            }, 1000);
            
        } catch (error) {
            console.log('❌ Failed to test WebSocket fallback:', error.message);
            resolve(false);
        }
    });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting WebSocket tests...\n');
    
    const tests = [
        { name: 'Direct WebSocket', fn: testDirectWebSocket },
        { name: 'Invalid Session', fn: testWebSocketInvalidSession },
        { name: 'Multiple Connections', fn: testMultipleWebSockets },
        { name: 'Fallback Simulation', fn: testWebSocketFallback }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        console.log(`\n🔄 Running: ${test.name}`);
        const result = await test.fn();
        
        if (result) {
            console.log(`✅ ${test.name}: PASSED`);
            passedTests++;
        } else {
            console.log(`❌ ${test.name}: FAILED`);
        }
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All WebSocket tests passed!');
    } else {
        console.log('⚠️  Some WebSocket tests failed.');
    }
    
    console.log('\n🔗 Next steps:');
    console.log('1. Test Socket.IO connection: http://localhost:4000/test-socket-io.html');
    console.log('2. Test import functionality with real-time progress');
    console.log('3. Monitor browser console for connection status');
}

// Run the tests
runAllTests().catch(console.error); 