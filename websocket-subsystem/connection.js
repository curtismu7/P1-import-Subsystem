/**
 * WebSocket Connection Manager
 * 
 * Provides functionality for managing WebSocket connections with automatic
 * reconnection, event handling, and fallback strategies.
 * 
 * Features:
 * - Connection management
 * - Automatic reconnection
 * - Event handling
 * - Message queuing
 * - Fallback to polling
 */

/**
 * WebSocket Connection Manager
 * 
 * Manages WebSocket connections with automatic reconnection.
 */
class ConnectionManager {
    /**
     * Create a new ConnectionManager
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {string} options.url - WebSocket URL
     * @param {boolean} options.autoConnect - Whether to connect automatically
     * @param {boolean} options.autoReconnect - Whether to reconnect automatically
     * @param {number} options.reconnectDelay - Delay between reconnection attempts
     * @param {number} options.maxReconnectAttempts - Maximum reconnection attempts
     * @param {boolean} options.enableFallback - Whether to enable fallback to polling
     */
    constructor(options = {}) {
        const { 
            logger, 
            url, 
            autoConnect = true,
            autoReconnect = true,
            reconnectDelay = 1000,
            maxReconnectAttempts = 5,
            enableFallback = true
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.url = url;
        this.autoConnect = autoConnect;
        this.autoReconnect = autoReconnect;
        this.reconnectDelay = reconnectDelay;
        this.maxReconnectAttempts = maxReconnectAttempts;
        this.enableFallback = enableFallback;
        
        // Connection state
        this.socket = null;
        this.connected = false;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        
        // Message queue for offline messages
        this.messageQueue = [];
        
        // Event listeners
        this.listeners = new Map();
        
        // Fallback state
        this.usingFallback = false;
        this.pollInterval = null;
        this.pollIntervalTime = 5000; // 5 seconds
        
        // Initialize
        if (this.autoConnect && this.url) {
            this.connect();
        }
    }

    /**
     * Connect to WebSocket server
     * @returns {Promise<boolean>} Connection success
     */
    async connect() {
        // Don't connect if already connected or connecting
        if (this.connected || this.connecting) {
            return true;
        }
        
        // Check if URL is provided
        if (!this.url) {
            this.logger.error('Cannot connect: WebSocket URL not provided');
            return false;
        }
        
        this.connecting = true;
        
        try {
            // Create WebSocket connection
            return await new Promise((resolve, reject) => {
                try {
                    this.logger.debug(`Connecting to WebSocket: ${this.url}`);
                    
                    this.socket = new WebSocket(this.url);
                    
                    // Set up event handlers
                    this.socket.onopen = () => {
                        this.connected = true;
                        this.connecting = false;
                        this.reconnectAttempts = 0;
                        
                        this.logger.info('WebSocket connected');
                        
                        // Process queued messages
                        this._processQueue();
                        
                        // Notify listeners
                        this._notifyListeners('connect');
                        
                        resolve(true);
                    };
                    
                    this.socket.onclose = (event) => {
                        this.connected = false;
                        this.connecting = false;
                        
                        this.logger.warn(`WebSocket disconnected: ${event.code} ${event.reason}`);
                        
                        // Notify listeners
                        this._notifyListeners('disconnect', { code: event.code, reason: event.reason });
                        
                        // Attempt reconnection if enabled
                        if (this.autoReconnect) {
                            this._scheduleReconnect();
                        } else if (this.enableFallback && !this.usingFallback) {
                            this._enableFallback();
                        }
                        
                        resolve(false);
                    };
                    
                    this.socket.onerror = (error) => {
                        this.logger.error('WebSocket error:', error);
                        
                        // Notify listeners
                        this._notifyListeners('error', error);
                        
                        // Only reject if still connecting
                        if (this.connecting) {
                            this.connecting = false;
                            reject(error);
                        }
                    };
                    
                    this.socket.onmessage = (event) => {
                        this._handleMessage(event);
                    };
                } catch (error) {
                    this.connecting = false;
                    this.logger.error('Failed to create WebSocket:', error.message);
                    
                    // Enable fallback if available
                    if (this.enableFallback && !this.usingFallback) {
                        this._enableFallback();
                    }
                    
                    reject(error);
                }
            });
        } catch (error) {
            this.connecting = false;
            return false;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            // Clear reconnect timer
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            // Clear poll interval
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            
            // Close socket
            this.socket.close();
            this.socket = null;
            
            this.connected = false;
            this.connecting = false;
            this.usingFallback = false;
            
            this.logger.info('WebSocket disconnected');
            
            // Notify listeners
            this._notifyListeners('disconnect', { code: 1000, reason: 'Disconnected by client' });
        }
    }

    /**
     * Send a message
     * @param {string|Object} message - Message to send
     * @returns {boolean} Send success
     */
    send(message) {
        // Convert object to JSON string
        const messageString = typeof message === 'object' 
            ? JSON.stringify(message) 
            : message;
        
        // If connected, send immediately
        if (this.connected && this.socket) {
            try {
                this.socket.send(messageString);
                return true;
            } catch (error) {
                this.logger.error('Failed to send message:', error.message);
                
                // Queue message for later
                this.messageQueue.push(messageString);
                return false;
            }
        } else if (this.usingFallback) {
            // Send via fallback
            return this._sendViaFallback(messageString);
        } else {
            // Queue message for later
            this.logger.debug('WebSocket not connected, queueing message');
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
        return this.connected || this.usingFallback;
    }

    /**
     * Get connection state
     * @returns {Object} Connection state
     */
    getState() {
        return {
            connected: this.connected,
            connecting: this.connecting,
            usingFallback: this.usingFallback,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length
        };
    }

    /**
     * Schedule reconnection attempt
     * @private
     */
    _scheduleReconnect() {
        // Clear existing timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        // Check if max attempts reached
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.warn('Max reconnection attempts reached');
            
            // Enable fallback if available
            if (this.enableFallback && !this.usingFallback) {
                this._enableFallback();
            }
            
            return;
        }
        
        // Increment attempts
        this.reconnectAttempts++;
        
        // Calculate delay with exponential backoff
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        
        this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        // Schedule reconnection
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {
                // Connection failed, will be handled by connect method
            });
        }, delay);
    }

    /**
     * Process queued messages
     * @private
     */
    _processQueue() {
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
                if (this.connected && this.socket) {
                    this.socket.send(message);
                } else if (this.usingFallback) {
                    this._sendViaFallback(message);
                } else {
                    // Re-queue if not connected
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
     * @param {MessageEvent} event - WebSocket message event
     * @private
     */
    _handleMessage(event) {
        try {
            // Parse message if it's JSON
            let message = event.data;
            
            try {
                message = JSON.parse(event.data);
            } catch (e) {
                // Not JSON, use as-is
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
                    this.logger.warn(`Error in WebSocket listener for ${event}:`, error.message);
                }
            }
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener(event, data);
                } catch (error) {
                    this.logger.warn('Error in global WebSocket listener:', error.message);
                }
            }
        }
    }

    /**
     * Enable fallback mechanism
     * @private
     */
    _enableFallback() {
        if (!this.enableFallback || this.usingFallback) {
            return;
        }
        
        this.logger.info('Enabling WebSocket fallback mechanism');
        
        this.usingFallback = true;
        
        // Notify listeners
        this._notifyListeners('fallback', { enabled: true });
        
        // Start polling for messages
        this._startPolling();
        
        // Process queued messages
        this._processQueue();
    }

    /**
     * Disable fallback mechanism
     * @private
     */
    _disableFallback() {
        if (!this.usingFallback) {
            return;
        }
        
        this.logger.info('Disabling WebSocket fallback mechanism');
        
        this.usingFallback = false;
        
        // Stop polling
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Notify listeners
        this._notifyListeners('fallback', { enabled: false });
    }

    /**
     * Start polling for messages
     * @private
     */
    _startPolling() {
        // Clear existing interval
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.logger.debug(`Starting polling every ${this.pollIntervalTime}ms`);
        
        // Start polling
        this.pollInterval = setInterval(() => {
            this._pollForMessages();
        }, this.pollIntervalTime);
        
        // Poll immediately
        this._pollForMessages();
    }

    /**
     * Poll for messages
     * @private
     */
    async _pollForMessages() {
        try {
            // Extract base URL from WebSocket URL
            const baseUrl = this.url.replace(/^ws/, 'http').replace(/\/socket$/, '');
            const pollUrl = `${baseUrl}/api/v1/messages/poll`;
            
            const response = await fetch(pollUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process messages
            if (data.messages && Array.isArray(data.messages)) {
                for (const message of data.messages) {
                    this._handleMessage({ data: message });
                }
            }
        } catch (error) {
            this.logger.error('Error polling for messages:', error.message);
        }
    }

    /**
     * Send message via fallback mechanism
     * @param {string} message - Message to send
     * @returns {boolean} Send success
     * @private
     */
    async _sendViaFallback(message) {
        try {
            // Extract base URL from WebSocket URL
            const baseUrl = this.url.replace(/^ws/, 'http').replace(/\/socket$/, '');
            const sendUrl = `${baseUrl}/api/v1/messages/send`;
            
            const response = await fetch(sendUrl, {
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
            this.logger.error('Error sending message via fallback:', error.message);
            
            // Queue message for later
            this.messageQueue.push(message);
            return false;
        }
    }
}

export default ConnectionManager;