/**
 * Real-time Client
 * 
 * Provides consistent real-time communication with the enhanced backend:
 * - Automatic reconnection
 * - Message acknowledgment
 * - Subscription management
 * - Offline message queuing
 * - Connection health monitoring
 */

import { appState, actions } from '../state/app-state.js';

/**
 * Real-time Message wrapper
 */
class RealtimeMessage {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.data = data.data;
    this.timestamp = data.timestamp;
    this.sessionId = data.sessionId;
    this.connectionId = data.connectionId;
    this.sequence = data.sequence;
    this.requireAck = data.requireAck;
    this.priority = data.priority;
  }

  acknowledge(client) {
    if (this.requireAck && client.socket) {
      client.socket.emit('message-ack', { messageId: this.id });
    }
  }
}

/**
 * Real-time Client
 */
export class RealtimeClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.sessionId = null;
    this.connectionId = null;
    this.subscriptions = new Set();
    this.messageHandlers = new Map();
    this.systemHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      errors: 0
    };

    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onSystem = this.onSystem.bind(this);
  }

  /**
   * Connect to real-time server
   */
  async connect(options = {}) {
    if (this.isConnected || this.isConnecting) {
      console.log('Real-time client already connected or connecting');
      return;
    }

    this.isConnecting = true;
    actions.setConnectionStatus('connecting');

    try {
      console.log('Connecting to real-time server...');

      // Import Socket.IO dynamically
      const io = window.io;
      if (!io) {
        throw new Error('Socket.IO not available');
      }

      // Create socket connection
      this.socket = io({
        // Force long-polling to avoid websocket errors in constrained environments
        transports: ['polling'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: options.forceNew || false,
        // Ensure same-origin cookies (CSRF/session) are sent with polling requests
        withCredentials: true,
        // Explicit path to match server Socket.IO mount
        path: '/socket.io',
        ...options
      });

      // Setup event handlers
      this.setupEventHandlers();

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 20000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Associate with session
      if (this.sessionId) {
        this.associateSession(this.sessionId);
      }

      // Restore subscriptions
      for (const channel of this.subscriptions) {
        this.socket.emit('subscribe', { channel });
      }

      // Start heartbeat
      this.startHeartbeat();

      console.log('Real-time client connected successfully');
      actions.setConnectionStatus('connected');

    } catch (error) {
      console.error('Failed to connect to real-time server:', error);
      this.isConnecting = false;
      this.stats.errors++;
      actions.setConnectionStatus('disconnected');
      actions.addError(`Real-time connection failed: ${error.message}`);

      // Schedule reconnection
      this.scheduleReconnection();
      throw error;
    }
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Real-time connection established');
      this.isConnected = true;
      this.connectionId = this.socket.id;
      actions.setConnectionStatus('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Real-time connection lost:', reason);
      this.isConnected = false;
      this.connectionId = null;
      actions.setConnectionStatus('disconnected');
      
      this.stopHeartbeat();
      
      // Schedule reconnection for unexpected disconnections
      if (reason !== 'io client disconnect') {
        this.scheduleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Real-time connection error:', error);
      this.stats.errors++;
      actions.addError(`Connection error: ${error.message}`);
    });

    // Message handling
    this.socket.on('realtime-message', (response) => {
      this.handleRealtimeMessage(response);
    });

    this.socket.on('system-message', (message) => {
      this.handleSystemMessage(message);
    });

    // Heartbeat response
    this.socket.on('heartbeat-ack', (data) => {
      console.debug('Heartbeat acknowledged', data);
    });
  }

  /**
   * Handle real-time messages
   */
  handleRealtimeMessage(response) {
    try {
      if (!response.success) {
        console.error('Received error message:', response.error);
        this.stats.errors++;
        return;
      }

      const messageData = response.data;
      const message = new RealtimeMessage(messageData);
      
      this.stats.messagesReceived++;
      
      console.debug('Received real-time message:', {
        type: message.type,
        id: message.id,
        sequence: message.sequence,
        priority: message.priority
      });

      // Acknowledge message if required
      message.acknowledge(this);

      // Handle message based on type
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        try {
          handler(message.data, message);
        } catch (error) {
          console.error(`Error handling message type '${message.type}':`, error);
          this.stats.errors++;
        }
      } else {
        console.warn(`No handler for message type '${message.type}'`);
      }

      // Update app state with message (optional integration)
      try {
        if (actions && typeof actions.addRealtimeMessage === 'function') {
          actions.addRealtimeMessage({
            type: message.type,
            data: message.data,
            timestamp: message.timestamp,
            id: message.id
          });
        }
      } catch (e) {
        // Don't let optional state integration break runtime
        console.debug('Skipping addRealtimeMessage: not available');
      }

    } catch (error) {
      console.error('Error handling real-time message:', error);
      this.stats.errors++;
    }
  }

  /**
   * Handle system messages
   */
  handleSystemMessage(message) {
    console.debug('Received system message:', message.type);

    const handler = this.systemHandlers.get(message.type);
    if (handler) {
      try {
        handler(message.data, message);
      } catch (error) {
        console.error(`Error handling system message '${message.type}':`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from real-time server');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
    this.stopHeartbeat();
    actions.setConnectionStatus('disconnected');
  }

  /**
   * Associate with session
   */
  associateSession(sessionId) {
    this.sessionId = sessionId;
    
    if (this.socket && this.isConnected) {
      this.socket.emit('associate-session', { sessionId });
      console.log('Associated with session:', sessionId);
    }
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel) {
    this.subscriptions.add(channel);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe', { channel });
      console.log('Subscribed to channel:', channel);
    }
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe', { channel });
      console.log('Unsubscribed from channel:', channel);
    }
  }

  /**
   * Register message handler
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Register system message handler
   */
  onSystem(type, handler) {
    this.systemHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  offMessage(type) {
    this.messageHandlers.delete(type);
  }

  /**
   * Remove system message handler
   */
  offSystem(type) {
    this.systemHandlers.delete(type);
  }

  /**
   * Send message to server (for testing/debugging)
   */
  send(type, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot send message: not connected');
      return false;
    }

    this.socket.emit('client-message', {
      type,
      data,
      timestamp: new Date().toISOString()
    });

    this.stats.messagesSent++;
    return true;
  }

  /**
   * Start heartbeat to maintain connection
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('heartbeat');
      }
    }, 25000); // Every 25 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      actions.addError('Real-time connection lost. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    actions.setConnectionStatus('reconnecting');

    this.connectionTimeout = setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.stats.reconnections++;
      this.connect({ forceNew: true }).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionId: this.connectionId,
      sessionId: this.sessionId,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
      stats: { ...this.stats }
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

// Create singleton instance
export const realtimeClient = new RealtimeClient();

// Setup default message handlers (optional app-state integration)
realtimeClient.onMessage('progress', (data) => {
  try { if (actions && typeof actions.updateProgress === 'function') actions.updateProgress(data); } catch {}
});

realtimeClient.onMessage('notification', (data) => {
  try {
    if (actions && typeof actions.addNotification === 'function') {
      actions.addNotification({ message: data.message, type: data.type || 'info' });
    }
  } catch {}
});

realtimeClient.onMessage('error', (data) => {
  try { if (actions && typeof actions.addError === 'function') actions.addError(data.message); } catch {}
});

realtimeClient.onSystem('heartbeat-ack', (data) => {
  // Connection is healthy
  try { if (actions && typeof actions.setConnectionStatus === 'function') actions.setConnectionStatus('connected'); } catch {}
});

// Log explicit session association acknowledgments from the server
realtimeClient.onSystem('session-associated', (data) => {
  console.debug('Server acknowledged session association', data);
});

// Auto-connect when module loads, but wait for app readiness/CSRF if available
if (typeof window !== 'undefined') {
  const connectWhenReady = async (attempt = 0) => {
    try {
      if (window.csrfManager && !window.csrfManager.token) {
        await window.csrfManager.getToken().catch(() => {});
      }
    } catch (_) {}
    if (window.APP_READY || attempt >= 10) {
      realtimeClient.connect().catch(error => {
        console.warn('Initial real-time connection failed:', error);
      });
    } else {
      setTimeout(() => connectWhenReady(attempt + 1), 500);
    }
  };
  setTimeout(connectWhenReady, 1000);
}

export default realtimeClient;