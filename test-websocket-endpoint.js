// Test WebSocket endpoint
import { WebSocket } from 'ws';

async function testWebSocketEndpoint() {
    console.log('🔍 Testing WebSocket endpoint...');
    
    try {
        const ws = new WebSocket('ws://127.0.0.1:4000/ws');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connection successful!');
            
            // Send a test message
            ws.send(JSON.stringify({
                type: 'join-session',
                sessionId: 'test-session-' + Date.now()
            }));
        });
        
        ws.on('message', (data) => {
            console.log('📨 Received message:', data.toString());
            ws.close();
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }, 5000);
        
    } catch (error) {
        console.log('❌ WebSocket test failed:', error.message);
    }
}

testWebSocketEndpoint(); 