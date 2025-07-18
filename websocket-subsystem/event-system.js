/**
 * WebSocket Event System
 * 
 * Provides functionality for handling WebSocket events with routing,
 * filtering, and subscription management.
 * 
 * Features:
 * - Event routing
 * - Event filtering
 * - Subscription management
 * - Event history
 */

/**
 * WebSocket Event System
 * 
 * Handles WebSocket events with routing and subscription management.
 */
class EventSystem {
    /**
     * Create a new EventSystem
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.connectionManager - WebSocket connection manager
     * @param {number} options.historySize - Maximum number of events to keep in history
     */
    constructor(options = {}) {
        const { 
            logger, 
            connectionManager,
            historySize = 100
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        this.connectionManager = connectionManager;
        
        if (!this.connectionManager) {
            throw new Error('Connection manager is required');
        }
        
        // Configuration
        this.historySize = historySize;
        
        // Event handlers
        this.handlers = new Map();
        
        // Event history
        this.eventHistory = [];
        
        // Initialize
        this._initialize();
    }

    /**
     * Initialize event system
     * @private
     */
    _initialize() {
        // Add connection manager event listener
        this.connectionManager.addEventListener('message', (message) => {
            this._handleMessage(message);
        });
    }

    /**
     * Handle incoming message
     * @param {Object|string} message - WebSocket message
     * @private
     */
    _handleMessage(message) {
        try {
            // Parse message if it's a string
            let eventData = message;
            
            if (typeof message === 'string') {
                try {
                    eventData = JSON.parse(message);
                } catch (e) {
                    // Not JSON, use as-is
                    this.logger.warn('Received non-JSON message:', message);
                    return;
                }
            }
            
            // Check if message has event type
            if (!eventData.type) {
                this.logger.warn('Received message without event type:', eventData);
                return;
            }
            
            // Add to history
            this._addToHistory(eventData);
            
            // Dispatch event
            this._dispatchEvent(eventData);
        } catch (error) {
            this.logger.error('Error handling WebSocket message:', error.message);
        }
    }

    /**
     * Add event to history
     * @param {Object} event - Event data
     * @private
     */
    _addToHistory(event) {
        // Add timestamp if not present
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }
        
        // Add to history
        this.eventHistory.push(event);
        
        // Trim history if needed
        if (this.eventHistory.length > this.historySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Dispatch event to handlers
     * @param {Object} event - Event data
     * @private
     */
    _dispatchEvent(event) {
        const eventType = event.type;
        
        // Call specific event handlers
        if (this.handlers.has(eventType)) {
            for (const handler of this.handlers.get(eventType)) {
                try {
                    handler(event);
                } catch (error) {
                    this.logger.warn(`Error in event handler for ${eventType}:`, error.message);
                }
            }
        }
        
        // Call wildcard handlers
        if (this.handlers.has('*')) {
            for (const handler of this.handlers.get('*')) {
                try {
                    handler(event);
                } catch (error) {
                    this.logger.warn('Error in wildcard event handler:', error.message);
                }
            }
        }
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event type to subscribe to, or '*' for all events
     * @param {Function} handler - Event handler function
     * @returns {Function} Function to unsubscribe
     */
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        
        this.handlers.get(eventType).add(handler);
        
        this.logger.debug(`Subscribed to event: ${eventType}`);
        
        // Return unsubscribe function
        return () => {
            this.unsubscribe(eventType, handler);
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event type to unsubscribe from
     * @param {Function} handler - Event handler function
     * @returns {boolean} Whether unsubscription was successful
     */
    unsubscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            return false;
        }
        
        const result = this.handlers.get(eventType).delete(handler);
        
        if (result) {
            this.logger.debug(`Unsubscribed from event: ${eventType}`);
            
            // Remove empty handler sets
            if (this.handlers.get(eventType).size === 0) {
                this.handlers.delete(eventType);
            }
        }
        
        return result;
    }

    /**
     * Unsubscribe all handlers for an event type
     * @param {string} eventType - Event type to unsubscribe from
     * @returns {boolean} Whether unsubscription was successful
     */
    unsubscribeAll(eventType) {
        const result = this.handlers.delete(eventType);
        
        if (result) {
            this.logger.debug(`Unsubscribed all handlers from event: ${eventType}`);
        }
        
        return result;
    }

    /**
     * Emit an event
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     * @returns {boolean} Whether event was sent
     */
    emit(eventType, data = {}) {
        // Create event object
        const event = {
            type: eventType,
            timestamp: Date.now(),
            ...data
        };
        
        // Send via connection manager
        return this.connectionManager.send(event);
    }

    /**
     * Get event history
     * @param {string} eventType - Optional event type to filter by
     * @param {number} limit - Maximum number of events to return
     * @returns {Array<Object>} Event history
     */
    getHistory(eventType = null, limit = this.historySize) {
        let history = [...this.eventHistory];
        
        // Filter by event type if provided
        if (eventType) {
            history = history.filter(event => event.type === eventType);
        }
        
        // Sort by timestamp (newest first)
        history.sort((a, b) => b.timestamp - a.timestamp);
        
        // Limit number of events
        if (limit && limit < history.length) {
            history = history.slice(0, limit);
        }
        
        return history;
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        this.logger.debug('Event history cleared');
    }
}

export default EventSystem;