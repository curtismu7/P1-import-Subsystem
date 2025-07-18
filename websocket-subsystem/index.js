/**
 * WebSocket Subsystem
 * 
 * Provides a unified API for real-time communication using WebSockets with
 * automatic reconnection, event handling, and fallback strategies.
 * 
 * Key features:
 * - Connection management
 * - Automatic reconnection
 * - Event handling and routing
 * - Message queuing
 * - Fallback to polling when WebSockets unavailable
 * - Delivery guarantees
 * 
 * Usage:
 * ```javascript
 * import { createWebSocketClient, ConnectionManager } from 'websocket-subsystem';
 * 
 * // Create WebSocket client
 * const wsClient = createWebSocketClient({
 *   logger,
 *   url: 'ws://localhost:4000/socket',
 *   autoConnect: true,
 *   enableFallback: true
 * });
 * 
 * // Listen for events
 * wsClient.addEventListener('message', (message) => {
 *   console.log('Received message:', message);
 * });
 * 
 * // Send a message
 * wsClient.send({
 *   type: 'request',
 *   action: 'getData',
 *   payload: { id: 123 }
 * });
 * 
 * // Check connection state
 * const state = wsClient.getState();
 * console.log('Connection state:', state);
 * ```
 */

import ConnectionManager from './connection.js';
import EventSystem from './event-system.js';
import FallbackManager from './fallback.js';

/**
 * Create a WebSocket client with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {ConnectionManager} Configured WebSocket client
 */
function createWebSocketClient(options = {}) {
    return new ConnectionManager(options);
}

/**
 * Create an event system with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {EventSystem} Configured event system
 */
function createEventSystem(options = {}) {
    return new EventSystem(options);
}

/**
 * Create a fallback manager with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {FallbackManager} Configured fallback manager
 */
function createFallbackManager(options = {}) {
    return new FallbackManager(options);
}

// Export factory functions
export { createWebSocketClient, createEventSystem, createFallbackManager };

// Export classes for direct instantiation
export { ConnectionManager, EventSystem, FallbackManager };

// Export default factory function
export default createWebSocketClient;