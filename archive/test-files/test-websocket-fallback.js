#!/usr/bin/env node

/**
 * WebSocket Fallback Test
 * 
 * This script tests the WebSocket fallback functionality by:
 * 1. Connecting to the WebSocket server
 * 2. Registering a session
 * 3. Listening for events
 * 4. Simulating import progress
 * 
 * @author PingOne Import Tool
 * @version 5.0
 */

import WebSocket from 'ws';

const SERVER_URL = 'ws://127.0.0.1:4000';
const SESSION_ID = 'test-session-' + Date.now();

console.log('🧪 Testing WebSocket Fallback');
console.log('='.repeat(50));
console.log(`Server: ${SERVER_URL}`);
console.log(`Session: ${SESSION_ID}`);
console.log('='.repeat(50));

// Create WebSocket connection
const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
    console.log('✅ WebSocket connection established');
    
    // Register session
    const registerMessage = {
        type: 'registerSession',
        sessionId: SESSION_ID
    };
    
    ws.send(JSON.stringify(registerMessage));
    console.log('📝 Session registration sent');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', message.type);
        
        switch (message.type) {
            case 'connected':
                console.log('✅ Connection confirmed');
                break;
            case 'sessionRegistered':
                console.log('✅ Session registered successfully');
                console.log('🎯 Ready to receive events');
                break;
            case 'progress':
                console.log('📊 Progress update:', {
                    current: message.current,
                    total: message.total,
                    message: message.message
                });
                break;
            case 'completion':
                console.log('✅ Import completed:', {
                    current: message.current,
                    total: message.total,
                    counts: message.counts
                });
                break;
            case 'error':
                console.log('❌ Error received:', {
                    title: message.title,
                    message: message.message
                });
                break;
            case 'pong':
                console.log('🏓 Pong received');
                break;
            default:
                console.log('📨 Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('❌ Failed to parse message:', error.message);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket connection closed:', {
        code,
        reason: reason?.toString()
    });
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test...');
    ws.close();
    process.exit(0);
});

// Keep connection alive with periodic pings
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
        console.log('🏓 Ping sent');
    }
}, 30000);

console.log('⏳ Waiting for events... (Press Ctrl+C to exit)'); 