/**
 * WebSocket Fallback
 * 
 * Provides fallback mechanisms for WebSocket communication when
 * WebSockets are not available or fail to connect.
 * 
 * Features:
 * - HTTP long polling
 * - Server-Sent Events (SSE) fallback
 * - Automatic detection and switching
 */

/**
 * WebSocket Fallback
 * 
 * Implements fallback mechanisms for WebSocket communication.
 */
class WebSocketFallback {
    /**
     * Create a new WebSocketFallback
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {string} options.baseUrl - Base URL for fallback endpoints
     * @param {string} options.fallbackType - Fallback type ('polling' or 'sse')
     * @param {number} options.pollInterval - Polling interval in milliseconds
     */
    constructor(options = {}) {
        const { 
            logger, 
            baseUrl,
            fallbackType = 'auto',
            pollInterval = 5000
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.baseUrl = baseUrl;
        this.fallbackType = fallbackType;
        this.pollInterval = pollInterval;
        
        // State
        this.connected = false;
        this.connecting = false;
        this.eventSource = null;
        this.pollTimer = null;
        this.messageQueue = [];
        this.lastMessageId = 0;
        
        // Event listeners
        this.listeners = new Map();
    }

    /**
     * Connect using fallback mechanism
     * @returns {Promise<boolean>} Connection success
     */
    async connect() {
        // Don't connect if already connected or connecting
        if (this.connected || this.connecting) {
            return true;
        }
        
        // Check if base URL is provided
        if (!this.baseUrl) {
            this.logger.error('Cannot connect: Base URL not provided');
            return false;
        }
        
        this.connecting = true;
        
        try {
            // Determine fallback type
            const fallbackType = this.fallbackType === 'auto' 
                ? await this._detectFallbackType() 
                : this.fallbackType;
            
            this.logger.info(`Using fallback type: ${fallbackType}`);
            
            // Connect using appropriate fallback
            let success = false;
            
            switch (fallbackType) {
                case 'sse':
                    success = await this._connectSSE();
                    break;
                    
                case 'polling':
                default:
                    success = await this._connectPolling();
                    break;
            }
            
            this.connecting = false;
            this.connected = success;
            
            if (success) {
                // Process queued messages
                this._processQueue();
                
                // Notify listeners
                this._notifyListeners('connect');
            }
            
            return success;
        } catch (error) {
            this.logger.error('Failed to connect using fallback:', error.message);
            this.connecting = false;
            return false;
        }
    }

    /**
     * Disconnect fallback mechanism
     */
    disconnect() {
        // Stop SSE if active
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        // Stop polling if active
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        this.connected = false;
        this.connecting = false;
        
        this.logger.info('Fallback disconnected');
        
        // Notify listeners
        this._notifyListeners('disconnect');
    }

    /**
     * Send a message using fallback mechanism
     * @param {string|Object} message - Message to send
     * @returns {boolean} Send success
     */
    async send(message) {
        // Convert object to JSON string
        const messageString = typeof message === 'object' 
            ? JSON.stringify(message) 
            : message;
        
        // If connected, send immediately
        if (this.connected) {
            try {
                const success = await this._sendMessage(messageString);
                
                if (!success) {
                    // Queue message for later
                    this.messageQueue.push(messageString);
                }
                
                return success;
            } catch (error) {
                this.logger.error('Failed to send message:', error.message);
                
                // Queue message for later
                this.messageQueue.push(messageString);
                return false;
            }
        } else {
            // Queue message for later
            this.logger.debug('Fallback not connected, queueing message');
            this.messageQueue.push(messageString);
            return false;
        }
    }

    /**
     * Add an event listener
     * @param {string} event - Event name ('connect', 'disconnect', 'message', 'error', or '*' for all)
     * @param {Function} listener - Listener function
     * @returns {Function} Function to remove the listener
     */
    addEventListener(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(listener);
        
        // Return function to remove listener
        return () => {
            if (this.listeners.has(event)) {
                this.listeners.get(event).delete(listener);
            }
        };
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeEventListeners(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllEventListeners() {
        this.listeners.clear();
    }

    /**
     * Check if connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.connected;
    }

    /**
     * Get connection state
     * @returns {Object} Connection state
     */
    getState() {
        return {
            connected: this.connected,
            connecting: this.connecting,
            fallbackType: this.fallbackType,
            queuedMessages: this.messageQueue.length
        };
    }

    /**
     * Detect available fallback type
     * @returns {Promise<string>} Fallback type
     * @private
     */
    async _detectFallbackType() {
        try {
            // Check if SSE is supported
            if (typeof EventSource !== 'undefined') {
                // Check if server supports SSE
                const response = await fetch(`${this.baseUrl}/api/v1/sse-check`);
                
                if (response.ok) {
                    return 'sse';
                }
            }
        } catch (error) {
            this.logger.warn('Error detecting SSE support:', error.message);
        }
        
        // Default to polling
        return 'polling';
    }

    /**
     * Connect using Server-Sent Events
     * @returns {Promise<boolean>} Connection success
     * @private
     */
    async _connectSSE() {
        return new Promise((resolve) => {
            try {
                this.logger.debug('Connecting using SSE');
                
                // Create EventSource
                this.eventSource = new EventSource(`${this.baseUrl}/api/v1/events`);
                
                // Set up event handlers
                this.eventSource.onopen = () => {
                    this.logger.info('SSE connected');
                    resolve(true);
                };
                
                this.eventSource.onerror = (error) => {
                    this.logger.error('SSE error:', error);
                    
                    // Notify listeners
                    this._notifyListeners('error', error);
                    
                    // Close and clean up
                    this.eventSource.close();
                    this.eventSource = null;
                    this.connected = false;
                    
                    // Notify listeners
                    this._notifyListeners('disconnect');
                    
                    resolve(false);
                };
                
                this.eventSource.onmessage = (event) => {
                    this._handleMessage(event.data);
                };
                
                // Set timeout for connection
                setTimeout(() => {
                    if (!this.connected) {
                        this.logger.warn('SSE connection timeout');
                        
                        // Close and clean up
                        if (this.eventSource) {
                            this.eventSource.close();
                            this.eventSource = null;
                        }
                        
                        resolve(false);
                    }
                }, 10000);
            } catch (error) {
                this.logger.error('Failed to connect using SSE:', error.message);
                resolve(false);
            }
        });
    }

    /**
     * Connect using long polling
     * @returns {Promise<boolean>} Connection success
     * @private
     */
    async _connectPolling() {
        try {
            this.logger.debug('Connecting using long polling');
            
            // Test connection
            const response = await fetch(`${this.baseUrl}/api/v1/poll`);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            // Start polling
            this._startPolling();
            
            return true;
        } catch (error) {
            this.logger.error('Failed to connect using polling:', error.message);
            return false;
        }
    }

    /**
     * Start polling for messages
     * @private
     */
    _startPolling() {
        // Clear existing timer
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        
        this.logger.debug(`Starting polling every ${this.pollInterval}ms`);
        
        // Start polling
        this.pollTimer = setInterval(() => {
            this._pollForMessages();
        }, this.pollInterval);
        
        // Poll immediately
        this._pollForMessages();
    }

    /**
     * Poll for messages
     * @private
     */
    async _pollForMessages() {
        try {
            const url = `${this.baseUrl}/api/v1/poll?lastId=${this.lastMessageId}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process messages
            if (data.messages && Array.isArray(data.messages)) {
                for (const message of data.messages) {
                    this._handleMessage(message);
                    
                    // Update last message ID
                    if (message.id && message.id > this.lastMessageId) {
                        this.lastMessageId = message.id;
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error polling for messages:', error.message);
        }
    }

    /**
     * Send message using fallback mechanism
     * @param {string} message - Message to send
     * @returns {Promise<boolean>} Send success
     * @private
     */
    async _sendMessage(message) {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            return true;
        } catch (error) {
            this.logger.error('Error sending message:', error.message);
            return false;
        }
    }

    /**
     * Process queued messages
     * @private
     */
    async _processQueue() {
        if (this.messageQueue.length === 0) {
            return;
        }
        
        this.logger.debug(`Processing ${this.messageQueue.length} queued messages`);
        
        // Clone queue and clear original
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        
        // Send queued messages
        for (const message of queue) {
            try {
                const success = await this._sendMessage(message);
                
                if (!success) {
                    // Re-queue failed message
                    this.messageQueue.push(message);
                }
            } catch (error) {
                this.logger.error('Failed to send queued message:', error.message);
                
                // Re-queue failed message
                this.messageQueue.push(message);
            }
        }
    }

    /**
     * Handle incoming message
     * @param {string} messageData - Message data
     * @private
     */
    _handleMessage(messageData) {
        try {
            // Parse message if it's a string
            let message = messageData;
            
            if (typeof messageData === 'string') {
                try {
                    message = JSON.parse(messageData);
                } catch (e) {
                    // Not JSON, use as-is
                }
            }
            
            // Notify listeners
            this._notifyListeners('message', message);
        } catch (error) {
            this.logger.error('Error handling message:', error.message);
        }
    }

    /**
     * Notify listeners of an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    _notifyListeners(event, data) {
        // Notify specific event listeners
        if (this.listeners.has(event)) {
            for (const listener of this.listeners.get(event)) {
                try {
                    listener(data);
                } catch (error) {
                    this.logger.warn(`Error in fallback listener for ${event}:`, error.message);
                }
            }
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener(event, data);
                } catch (error) {
                    this.logger.warn('Error in global fallback listener:', error.message);
                }
            }
        }
    }
}

export default WebSocketFallback;