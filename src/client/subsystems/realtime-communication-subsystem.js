/**
 * Real-time Communication Subsystem
 * 
 * Handles all real-time communication including Socket.IO connections,
 * WebSocket fallbacks, and Server-Sent Events for progress updates.
 */

export class RealtimeCommunicationSubsystem {
    constructor(logger, uiManager) {
        this.logger = logger;
        this.uiManager = uiManager;
        
        // Connection state management
        this.socket = null;
        this.eventSource = null;
        this.fallbackPolling = null;
        this.connectionType = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        this.logger.info('Real-time Communication Subsystem initialized');
    }
    
    /**
     * Initialize the real-time communication subsystem
     */
    async init() {
        try {
            this.setupConnectionMonitoring();
            this.logger.info('Real-time Communication Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Real-time Communication Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Establish real-time connection with fallback strategy
     */
    async establishConnection(sessionId, options = {}) {
        const {
            preferredTransport = 'socketio',
            enableFallback = true,
            timeout = 10000
        } = options;
        
        this.logger.info('Establishing real-time connection', {
            sessionId,
            preferredTransport,
            enableFallback
        });
        
        try {
            // Try primary transport first
            if (preferredTransport === 'socketio') {
                await this.connectSocketIO(sessionId, timeout);
            } else if (preferredTransport === 'sse') {
                await this.connectSSE(sessionId, timeout);
            } else if (preferredTransport === 'websocket') {
                await this.connectWebSocket(sessionId, timeout);
            }
            
        } catch (error) {
            this.logger.warn('Primary transport failed', { error: error.message });
            
            if (enableFallback) {
                await this.tryFallbackConnections(sessionId);
            } else {
                throw error;
            }
        }
    }
    
    /**
     * Connect using Socket.IO
     */
    async connectSocketIO(sessionId, timeout = 10000) {
        return new Promise(async (resolve, reject) => {
            try {
                // Import Socket.IO dynamically
                const { io } = await import('socket.io-client');
                
                this.socket = io({
                    transports: ['polling'],
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay,
                    timeout: timeout,
                    forceNew: true,
                    autoConnect: true
                });
                
                // Set up connection timeout
                const connectionTimeout = setTimeout(() => {
                    reject(new Error('Socket.IO connection timeout'));
                }, timeout);
                
                // Connection success
                this.socket.on('connect', () => {
                    clearTimeout(connectionTimeout);
                    this.connectionType = 'socketio';
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Register session
                    this.socket.emit('registerSession', sessionId);
                    
                    this.logger.info('Socket.IO connected successfully');
                    this.uiManager.showSuccess('Real-time connection established (Socket.IO)');
                    
                    resolve();
                });
                
                // Connection error
                this.socket.on('connect_error', (error) => {
                    clearTimeout(connectionTimeout);
                    this.logger.error('Socket.IO connection error', error);
                    reject(error);
                });
                
                // Set up event handlers
                this.setupSocketIOHandlers();
                
            } catch (error) {
                this.logger.error('Failed to initialize Socket.IO', error);
                reject(error);
            }
        });
    }
    
    /**
     * Connect using Server-Sent Events
     */
    async connectSSE(sessionId, timeout = 10000) {
        return new Promise((resolve, reject) => {
            try {
                const sseUrl = `/api/progress/stream/${sessionId}`;
                this.eventSource = new EventSource(sseUrl);
                
                // Set up connection timeout
                const connectionTimeout = setTimeout(() => {
                    reject(new Error('SSE connection timeout'));
                }, timeout);
                
                // Connection success
                this.eventSource.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connectionType = 'sse';
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    this.logger.info('SSE connected successfully');
                    this.uiManager.showSuccess('Real-time connection established (SSE)');
                    
                    resolve();
                };
                
                // Connection error
                this.eventSource.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    this.logger.error('SSE connection error', error);
                    reject(error);
                };
                
                // Set up event handlers
                this.setupSSEHandlers();
                
            } catch (error) {
                this.logger.error('Failed to initialize SSE', error);
                reject(error);
            }
        });
    }
    
    /**
     * Connect using WebSocket
     */
    async connectWebSocket(sessionId, timeout = 10000) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://${window.location.host}/ws/${sessionId}`;
                this.websocket = new WebSocket(wsUrl);
                
                // Set up connection timeout
                const connectionTimeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, timeout);
                
                // Connection success
                this.websocket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connectionType = 'websocket';
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    this.logger.info('WebSocket connected successfully');
                    this.uiManager.showSuccess('Real-time connection established (WebSocket)');
                    
                    resolve();
                };
                
                // Connection error
                this.websocket.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    this.logger.error('WebSocket connection error', error);
                    reject(error);
                };
                
                // Set up event handlers
                this.setupWebSocketHandlers();
                
            } catch (error) {
                this.logger.error('Failed to initialize WebSocket', error);
                reject(error);
            }
        });
    }
    
    /**
     * Try fallback connections in order
     */
    async tryFallbackConnections(sessionId) {
        const fallbackOrder = ['sse', 'websocket', 'polling'];
        
        for (const transport of fallbackOrder) {
            if (transport === this.connectionType) {
                continue; // Skip the one that already failed
            }
            
            try {
                this.logger.info(`Trying fallback transport: ${transport}`);
                
                if (transport === 'sse') {
                    await this.connectSSE(sessionId);
                } else if (transport === 'websocket') {
                    await this.connectWebSocket(sessionId);
                } else if (transport === 'polling') {
                    await this.setupFallbackPolling(sessionId);
                }
                
                return; // Success, exit loop
                
            } catch (error) {
                this.logger.warn(`Fallback transport ${transport} failed`, error);
            }
        }
        
        throw new Error('All connection methods failed');
    }
    
    /**
     * Set up Socket.IO event handlers
     */
    setupSocketIOHandlers() {
        this.socket.on('progress', (data) => {
            this.handleProgressEvent(data);
        });
        
        this.socket.on('completion', (data) => {
            this.handleCompletionEvent(data);
        });
        
        this.socket.on('error', (data) => {
            this.handleErrorEvent(data);
        });
        
        this.socket.on('disconnect', (reason) => {
            this.handleDisconnection(reason);
        });
        
        this.socket.on('reconnect', () => {
            this.handleReconnection();
        });
    }
    
    /**
     * Set up SSE event handlers
     */
    setupSSEHandlers() {
        this.eventSource.addEventListener('progress', (event) => {
            const data = JSON.parse(event.data);
            this.handleProgressEvent(data);
        });
        
        this.eventSource.addEventListener('completion', (event) => {
            const data = JSON.parse(event.data);
            this.handleCompletionEvent(data);
        });
        
        this.eventSource.addEventListener('error', (event) => {
            const data = JSON.parse(event.data);
            this.handleErrorEvent(data);
        });
    }
    
    /**
     * Set up WebSocket event handlers
     */
    setupWebSocketHandlers() {
        this.websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'progress':
                        this.handleProgressEvent(message.data);
                        break;
                    case 'completion':
                        this.handleCompletionEvent(message.data);
                        break;
                    case 'error':
                        this.handleErrorEvent(message.data);
                        break;
                }
            } catch (error) {
                this.logger.error('Failed to parse WebSocket message', error);
            }
        };
        
        this.websocket.onclose = () => {
            this.handleDisconnection('WebSocket closed');
        };
    }
    
    /**
     * Set up fallback polling
     */
    async setupFallbackPolling(sessionId) {
        this.connectionType = 'polling';
        this.isConnected = true;
        
        this.fallbackPolling = setInterval(async () => {
            try {
                const response = await fetch(`/api/progress/poll/${sessionId}`);
                const data = await response.json();
                
                if (data.events && data.events.length > 0) {
                    data.events.forEach(event => {
                        switch (event.type) {
                            case 'progress':
                                this.handleProgressEvent(event.data);
                                break;
                            case 'completion':
                                this.handleCompletionEvent(event.data);
                                break;
                            case 'error':
                                this.handleErrorEvent(event.data);
                                break;
                        }
                    });
                }
                
            } catch (error) {
                this.logger.error('Polling request failed', error);
            }
        }, 2000);
        
        this.logger.info('Fallback polling established');
        this.uiManager.showInfo('Using polling for updates (limited real-time capability)');
    }
    
    /**
     * Handle progress events
     */
    handleProgressEvent(data) {
        this.logger.info('Progress event received', data);
        this.triggerEvent('progress', data);
    }
    
    /**
     * Handle completion events
     */
    handleCompletionEvent(data) {
        this.logger.info('Completion event received', data);
        this.triggerEvent('completion', data);
        this.disconnect();
    }
    
    /**
     * Handle error events
     */
    handleErrorEvent(data) {
        this.logger.error('Error event received', data);
        this.triggerEvent('error', data);
    }
    
    /**
     * Handle disconnection
     */
    handleDisconnection(reason) {
        this.isConnected = false;
        this.logger.warn('Connection lost', { reason, type: this.connectionType });
        this.uiManager.showWarning('Real-time connection lost');
        
        // Attempt reconnection
        this.attemptReconnection();
    }
    
    /**
     * Handle reconnection
     */
    handleReconnection() {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.info('Connection restored');
        this.uiManager.showSuccess('Real-time connection restored');
    }
    
    /**
     * Attempt reconnection
     */
    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached');
            this.uiManager.showError('Connection Lost', 'Unable to restore real-time connection');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        this.logger.info('Attempting reconnection', {
            attempt: this.reconnectAttempts,
            delay
        });
        
        setTimeout(async () => {
            try {
                // Reconnection logic depends on connection type
                if (this.connectionType === 'socketio' && this.socket) {
                    this.socket.connect();
                } else {
                    // For other types, we'd need the session ID
                    // This would typically be handled by the calling code
                }
            } catch (error) {
                this.logger.error('Reconnection failed', error);
                this.attemptReconnection();
            }
        }, delay);
    }
    
    /**
     * Set up connection monitoring
     */
    setupConnectionMonitoring() {
        // Monitor connection health
        setInterval(() => {
            if (this.isConnected) {
                this.checkConnectionHealth();
            }
        }, 30000); // Check every 30 seconds
    }
    
    /**
     * Check connection health
     */
    checkConnectionHealth() {
        if (this.connectionType === 'socketio' && this.socket) {
            // Socket.IO has built-in heartbeat
            if (!this.socket.connected) {
                this.handleDisconnection('Health check failed');
            }
        } else if (this.connectionType === 'sse' && this.eventSource) {
            if (this.eventSource.readyState === EventSource.CLOSED) {
                this.handleDisconnection('SSE connection closed');
            }
        } else if (this.connectionType === 'websocket' && this.websocket) {
            if (this.websocket.readyState === WebSocket.CLOSED) {
                this.handleDisconnection('WebSocket connection closed');
            }
        }
    }
    
    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Trigger event
     */
    triggerEvent(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    this.logger.error('Event handler error', { event, error: error.message });
                }
            });
        }
    }
    
    /**
     * Disconnect all connections
     */
    disconnect() {
        this.isConnected = false;
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        if (this.fallbackPolling) {
            clearInterval(this.fallbackPolling);
            this.fallbackPolling = null;
        }
        
        this.connectionType = null;
        this.logger.info('All real-time connections closed');
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            connectionType: this.connectionType,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}