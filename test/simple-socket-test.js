/**
 * Simple Socket.IO Test Script
 *
 * This script provides a minimal test for Socket.IO functionality.
 */

import io from 'socket.io-client';

const PORT = process.env.PORT || 4000;
const serverUrl = `http://localhost:${PORT}`;

console.log('🔌 Testing Socket.IO Connection...');
console.log('Server URL:', serverUrl);

// Create Socket.IO client with minimal configuration
const socket = io(serverUrl, {
  transports: ['polling'], // Try polling only first
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully');
  console.log('   Socket ID:', socket.id);

  // Test basic emit
  socket.emit('ping');

  setTimeout(() => {
    socket.disconnect();
    console.log('✅ Test completed');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket.IO connection failed:', error.message);
  console.log('   Error details:', error);

  // Try with websocket transport
  console.log('\n🔄 Trying with websocket transport...');
  const socket2 = io(serverUrl, {
    transports: ['websocket'],
    timeout: 10000,
    forceNew: true
  });

  socket2.on('connect', () => {
    console.log('✅ Socket.IO connected with websocket transport');
    socket2.disconnect();
    process.exit(0);
  });

  socket2.on('connect_error', (error2) => {
    console.log('❌ Socket.IO websocket transport also failed:', error2.message);
    process.exit(1);
  });
});

socket.on('pong', (data) => {
  console.log('📨 Pong received:', data);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  socket.disconnect();
  process.exit(1);
}, 15000);
