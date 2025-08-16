/**
 * Enhanced Real-time Communication Manager
 * 
 * Provides reliable, consistent real-time communication between frontend and backend:
 * - Message queuing for offline clients
 * - Delivery confirmation and retry logic
 * - Standardized message format
 * - Connection health monitoring
 * - Event deduplication and ordering
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { APIResponse } from '../utils/api-response.js';

/**
 * Connection wrapper with enhanced reliability
 */
class EnhancedConnection {
  constructor(socket, manager) {
    this.id = uuidv4();
    this.socket = socket;
    this.manager = manager;
    this.sessionId = null;
    this.isConnected = true;
    this.lastHeartbeat = Date.now();
    this.subscriptions = new Set();
    this.pendingMessages = new Map();
    this.messageSequence = 0;
    this.metadata = {
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address,
      connectedAt: new Date().toISOString()
    };
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Connection lifecycle
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.manager.handleDisconnection(this, reason);
    });

    // Heartbeat for connection health
    this.socket.on('heartbeat', () => {
      this.lastHeartbeat = Date.now();
      this.sendSystemMessage('heartbeat-ack', { 
        timestamp: Date.now(),
        connectionId: this.id 
      });
    });

    // Message acknowledgment
    this.socket.on('message-ack', (data) => {
      this.handleMessageAck(data.messageId);
    });

    // Session management
    this.socket.on('associate-session', (data) => {
      this.manager.associateSession(this, data.sessionId);
      // Send explicit acknowledgment back to client for debugging/awareness
      try {
        this.sendSystemMessage('session-associated', {
          sessionId: data.sessionId,
          connectionId: this.id,
          timestamp: Date.now()
        });
      } catch (err) {
        this.manager.logger.warn('Failed to send session-associated ack', {
          error: err?.message,
          connectionId: this.id,
          sessionId: data?.sessionId
        });
      }
    });

    // Subscription management
    this.socket.on('subscribe', (data) => {
      this.subscribe(data.channel);
    });

    this.socket.on('unsubscribe', (data) => {
      this.unsubscribe(data.channel);
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.manager.logger.error('Socket error', {
        connectionId: this.id,
        sessionId: this.sessionId,
        error: error.message
      });
    });
  }

  /**
   * Send standardized message to client
   */
  async sendMessage(type, data, options = {}) {
    if (!this.isConnected) {
      throw new Error('Connection is not active');
    }

    const message = {
      id: uuidv4(),
      type,
      data,
      sequence: ++this.messageSequence,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      connectionId: this.id,
      requireAck: options.requireAck || false,
      priority: options.priority || 'normal', // low, normal, high, critical
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    // Add to pending messages if acknowledgment required
    if (message.requireAck) {
      this.pendingMessages.set(message.id, {
        message,
        sentAt: Date.now(),
        retries: 0
      });
    }

    // Send message with standardized format
    this.socket.emit('realtime-message', {
      success: true,
      message: 'Real-time message',
      data: message,
      meta: {
        timestamp: new Date().toISOString(),
        connectionId: this.id,
        sequence: message.sequence
      }
    });

    return message.id;
  }

  /**
   * Send system message (no ack required)
   */
  sendSystemMessage(type, data) {
    if (!this.isConnected) return false;

    this.socket.emit('system-message', {
      type,
      data,
      timestamp: new Date().toISOString(),
      connectionId: this.id
    });

    return true;
  }

  /**
   * Handle message acknowledgment
   */
  handleMessageAck(messageId) {
    if (this.pendingMessages.has(messageId)) {
      this.pendingMessages.delete(messageId);
      this.manager.logger.debug('Message acknowledged', {
        messageId,
        connectionId: this.id,
        sessionId: this.sessionId
      });
    }
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel) {
    this.subscriptions.add(channel);
    this.socket.join(channel);
    
    this.manager.logger.debug('Client subscribed to channel', {
      channel,
      connectionId: this.id,
      sessionId: this.sessionId
    });
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    this.socket.leave(channel);
    
    this.manager.logger.debug('Client unsubscribed from channel', {
      channel,
      connectionId: this.id,
      sessionId: this.sessionId
    });
  }

  /**
   * Check if connection is healthy
   */
  isHealthy() {
    const heartbeatTimeout = 30000; // 30 seconds
    return this.isConnected && (Date.now() - this.lastHeartbeat < heartbeatTimeout);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      isConnected: this.isConnected,
      isHealthy: this.isHealthy(),
      lastHeartbeat: this.lastHeartbeat,
      subscriptions: Array.from(this.subscriptions),
      pendingMessages: this.pendingMessages.size,
      messageSequence: this.messageSequence,
      metadata: this.metadata
    };
  }
}

/**
 * Message queue for offline clients
 */
class MessageQueue {
  constructor(maxSize = 1000, maxAge = 3600000) { // 1 hour
    this.queues = new Map(); // sessionId -> messages[]
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    
    // Cleanup old messages periodically
    setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  enqueue(sessionId, message) {
    if (!this.queues.has(sessionId)) {
      this.queues.set(sessionId, []);
    }

    const queue = this.queues.get(sessionId);
    
    // Add queued timestamp
    const queuedMessage = {
      ...message,
      queuedAt: new Date().toISOString(),
      queuedTimestamp: Date.now()
    };
    
    queue.push(queuedMessage);

    // Limit queue size (remove oldest messages)
    if (queue.length > this.maxSize) {
      const removed = queue.splice(0, queue.length - this.maxSize);
      console.warn(`Message queue overflow for session ${sessionId}, removed ${removed.length} messages`);
    }
  }

  dequeue(sessionId) {
    const queue = this.queues.get(sessionId);
    if (!queue || queue.length === 0) {
      return [];
    }

    const messages = [...queue];
    this.queues.delete(sessionId);
    return messages;
  }

  getQueueSize(sessionId) {
    const queue = this.queues.get(sessionId);
    return queue ? queue.length : 0;
  }

  cleanup() {
    const now = Date.now();
    let totalCleaned = 0;
    
    for (const [sessionId, queue] of this.queues.entries()) {
      const validMessages = queue.filter(msg => 
        now - msg.queuedTimestamp < this.maxAge
      );
      
      const cleanedCount = queue.length - validMessages.length;
      totalCleaned += cleanedCount;
      
      if (validMessages.length === 0) {
        this.queues.delete(sessionId);
      } else if (cleanedCount > 0) {
        this.queues.set(sessionId, validMessages);
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`Cleaned ${totalCleaned} expired messages from queue`);
    }
  }

  getStats() {
    let totalMessages = 0;
    const queueSizes = [];
    
    for (const queue of this.queues.values()) {
      totalMessages += queue.length;
      queueSizes.push(queue.length);
    }
    
    return {
      totalQueues: this.queues.size,
      totalMessages,
      averageQueueSize: this.queues.size > 0 ? totalMessages / this.queues.size : 0,
      maxQueueSize: queueSizes.length > 0 ? Math.max(...queueSizes) : 0,
      minQueueSize: queueSizes.length > 0 ? Math.min(...queueSizes) : 0
    };
  }
}

/**
 * Enhanced Real-time Communication Manager
 */
export class EnhancedRealtimeManager extends EventEmitter {
  constructor(io, logger) {
    super();
    this.io = io;
    this.logger = logger || console;
    this.connections = new Map(); // connectionId -> EnhancedConnection
    this.sessionConnections = new Map(); // sessionId -> Set<connectionId>
    this.messageQueue = new MessageQueue();
    this.channels = new Map(); // channel -> Set<connectionId>
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesQueued: 0,
      messagesDelivered: 0,
      reconnections: 0,
      errors: 0
    };
    
    this.setupIOHandlers();
    this.startHealthCheck();
    this.startRetryProcessor();
    this.startStatsReporting();
  }

  setupIOHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    const connection = new EnhancedConnection(socket, this);
    this.connections.set(connection.id, connection);
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    
    this.logger.info('New real-time connection established', {
      connectionId: connection.id,
      userAgent: connection.metadata.userAgent,
      ip: connection.metadata.ip,
      totalConnections: this.stats.activeConnections
    });

    this.emit('connection', connection);
  }

  handleDisconnection(connection, reason) {
    this.connections.delete(connection.id);
    this.stats.activeConnections--;
    
    // Remove from session mapping
    if (connection.sessionId) {
      const sessionConnections = this.sessionConnections.get(connection.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connection.id);
        if (sessionConnections.size === 0) {
          this.sessionConnections.delete(connection.sessionId);
        }
      }
    }
    
    // Remove from channel subscriptions
    for (const channel of connection.subscriptions) {
      const channelConnections = this.channels.get(channel);
      if (channelConnections) {
        channelConnections.delete(connection.id);
        if (channelConnections.size === 0) {
          this.channels.delete(channel);
        }
      }
    }
    
    this.logger.info('Real-time connection disconnected', {
      connectionId: connection.id,
      sessionId: connection.sessionId,
      reason,
      duration: Date.now() - new Date(connection.metadata.connectedAt).getTime(),
      activeConnections: this.stats.activeConnections
    });

    this.emit('disconnection', connection, reason);
  }

  associateSession(connection, sessionId) {
    // Remove from old session if exists
    if (connection.sessionId) {
      const oldSessionConnections = this.sessionConnections.get(connection.sessionId);
      if (oldSessionConnections) {
        oldSessionConnections.delete(connection.id);
        if (oldSessionConnections.size === 0) {
          this.sessionConnections.delete(connection.sessionId);
        }
      }
    }

    // Add to new session
    connection.sessionId = sessionId;
    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId).add(connection.id);

    // Deliver queued messages
    this.deliverQueuedMessages(sessionId, connection);
    
    this.logger.info('Session associated with connection', {
      connectionId: connection.id,
      sessionId,
      queuedMessages: this.messageQueue.getQueueSize(sessionId)
    });
  }

  async deliverQueuedMessages(sessionId, connection) {
    const queuedMessages = this.messageQueue.dequeue(sessionId);
    
    if (queuedMessages.length > 0) {
      this.logger.info('Delivering queued messages', {
        sessionId,
        connectionId: connection.id,
        messageCount: queuedMessages.length
      });
      
      for (const message of queuedMessages) {
        try {
          await connection.sendMessage(message.type, message.data, {
            requireAck: message.requireAck,
            priority: 'high' // Queued messages get high priority
          });
          this.stats.messagesDelivered++;
        } catch (error) {
          this.logger.error('Failed to deliver queued message', {
            sessionId,
            connectionId: connection.id,
            messageId: message.id,
            error: error.message
          });
          this.stats.errors++;
        }
      }
    }
  }

  /**
   * Send message to specific session with standardized format
   */
  async sendToSession(sessionId, type, data, options = {}) {
    const message = {
      id: uuidv4(),
      type,
      data,
      timestamp: new Date().toISOString(),
      sessionId,
      priority: options.priority || 'normal'
    };

    const sessionConnections = this.sessionConnections.get(sessionId);
    
    if (!sessionConnections || sessionConnections.size === 0) {
      // Queue message for offline session
      if (options.queue !== false) {
        this.messageQueue.enqueue(sessionId, message);
        this.stats.messagesQueued++;
        
        this.logger.debug('Message queued for offline session', {
          sessionId,
          type,
          messageId: message.id,
          priority: message.priority
        });
      }
      return { delivered: false, queued: options.queue !== false };
    }

    // Send to all connections for this session
    let delivered = 0;
    const errors = [];
    
    for (const connectionId of sessionConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isConnected) {
        try {
          await connection.sendMessage(type, data, options);
          delivered++;
          this.stats.messagesSent++;
        } catch (error) {
          errors.push({
            connectionId,
            error: error.message
          });
          this.stats.errors++;
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn('Some messages failed to deliver', {
        sessionId,
        type,
        delivered,
        errors
      });
    }

    return { 
      delivered: delivered > 0, 
      connectionCount: delivered,
      errors: errors.length 
    };
  }

  /**
   * Broadcast message to all connections with standardized format
   */
  async broadcast(type, data, options = {}) {
    const message = {
      id: uuidv4(),
      type,
      data,
      timestamp: new Date().toISOString(),
      broadcast: true
    };

    let delivered = 0;
    const errors = [];
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected) {
        try {
          await connection.sendMessage(type, data, options);
          delivered++;
          this.stats.messagesSent++;
        } catch (error) {
          errors.push({
            connectionId: connection.id,
            error: error.message
          });
          this.stats.errors++;
        }
      }
    }

    this.logger.info('Broadcast message sent', {
      type,
      delivered,
      totalConnections: this.connections.size,
      errors: errors.length
    });

    return { delivered, errors: errors.length };
  }

  /**
   * Send to specific channel with standardized format
   */
  async sendToChannel(channel, type, data, options = {}) {
    const channelConnections = this.channels.get(channel);
    
    if (!channelConnections || channelConnections.size === 0) {
      this.logger.debug('No connections subscribed to channel', { channel });
      return { delivered: 0, errors: 0 };
    }

    let delivered = 0;
    const errors = [];
    
    for (const connectionId of channelConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isConnected) {
        try {
          await connection.sendMessage(type, data, options);
          delivered++;
          this.stats.messagesSent++;
        } catch (error) {
          errors.push({
            connectionId,
            error: error.message
          });
          this.stats.errors++;
        }
      }
    }

    this.logger.debug('Channel message sent', {
      channel,
      type,
      delivered,
      subscribedConnections: channelConnections.size,
      errors: errors.length
    });

    return { delivered, errors: errors.length };
  }

  /**
   * Health check for connections
   */
  startHealthCheck() {
    setInterval(() => {
      const unhealthyConnections = [];
      
      for (const connection of this.connections.values()) {
        if (!connection.isHealthy()) {
          unhealthyConnections.push(connection);
        }
      }
      
      // Disconnect unhealthy connections
      for (const connection of unhealthyConnections) {
        this.logger.warn('Disconnecting unhealthy connection', {
          connectionId: connection.id,
          sessionId: connection.sessionId,
          lastHeartbeat: connection.lastHeartbeat,
          timeSinceHeartbeat: Date.now() - connection.lastHeartbeat
        });
        
        connection.socket.disconnect(true);
      }
      
    }, 30000); // Check every 30 seconds
  }

  /**
   * Retry processor for failed messages
   */
  startRetryProcessor() {
    setInterval(() => {
      const now = Date.now();
      const retryTimeout = 5000; // 5 seconds
      
      for (const connection of this.connections.values()) {
        for (const [messageId, pendingMessage] of connection.pendingMessages.entries()) {
          if (now - pendingMessage.sentAt > retryTimeout) {
            if (pendingMessage.retries < pendingMessage.message.maxRetries) {
              // Retry message
              pendingMessage.retries++;
              pendingMessage.sentAt = now;
              pendingMessage.message.retryCount = pendingMessage.retries;
              
              connection.socket.emit('realtime-message', {
                success: true,
                message: 'Real-time message (retry)',
                data: pendingMessage.message,
                meta: {
                  timestamp: new Date().toISOString(),
                  connectionId: connection.id,
                  retry: pendingMessage.retries
                }
              });
              
              this.logger.debug('Retrying message delivery', {
                messageId,
                retries: pendingMessage.retries,
                connectionId: connection.id,
                sessionId: connection.sessionId
              });
            } else {
              // Give up on message
              connection.pendingMessages.delete(messageId);
              
              this.logger.warn('Message delivery failed after max retries', {
                messageId,
                maxRetries: pendingMessage.message.maxRetries,
                connectionId: connection.id,
                sessionId: connection.sessionId
              });
              
              this.stats.errors++;
            }
          }
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Periodic stats reporting
   */
  startStatsReporting() {
    setInterval(() => {
      const stats = this.getStats();
      this.logger.info('Real-time communication stats', stats);
    }, 300000); // Every 5 minutes
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const queueStats = this.messageQueue.getStats();
    const connectionStats = Array.from(this.connections.values()).map(conn => conn.getStats());
    
    return {
      ...this.stats,
      messageQueue: queueStats,
      channels: {
        total: this.channels.size,
        list: Array.from(this.channels.keys())
      },
      sessions: {
        total: this.sessionConnections.size,
        averageConnectionsPerSession: this.sessionConnections.size > 0 
          ? this.stats.activeConnections / this.sessionConnections.size 
          : 0
      },
      connections: {
        total: connectionStats.length,
        healthy: connectionStats.filter(c => c.isHealthy).length,
        withPendingMessages: connectionStats.filter(c => c.pendingMessages > 0).length
      }
    };
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId) {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) {
      return null;
    }

    const connections = Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn)
      .map(conn => conn.getStats());

    return {
      sessionId,
      connectionCount: connections.length,
      connections,
      queuedMessages: this.messageQueue.getQueueSize(sessionId),
      isOnline: connections.some(c => c.isConnected)
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Disconnect all connections
    for (const connection of this.connections.values()) {
      connection.socket.disconnect(true);
    }
    
    this.connections.clear();
    this.sessionConnections.clear();
    this.channels.clear();
    this.removeAllListeners();
    
    this.logger.info('Enhanced real-time manager destroyed');
  }
}

export default EnhancedRealtimeManager;