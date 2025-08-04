/**
 * @module
 * @description ES Module (converted from CommonJS)
 */

/**
 * Event Management Utility for PingOne Import Tool
 * 
 * Centralizes event handling with:
 * - Automatic cleanup and memory leak prevention
 * - Event delegation and performance optimization
 * - Consistent error handling in event callbacks
 * - Event tracking and debugging
 */

class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedEvents = new Map();
        this.logger = window.logger?.child('EventManager') || console;
        this.eventCount = 0;
    }

    /**
     * Add event listener with automatic cleanup tracking
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) {
            this.logger.warn('Invalid addEventListener parameters');
            return null;
        }

        const wrappedHandler = this.wrapHandler(handler, `${event} on ${element.tagName || 'unknown'}`);
        const listenerId = `${++this.eventCount}-${event}-${Date.now()}`;

        try {
            element.addEventListener(event, wrappedHandler, options);
            
            // Track for cleanup
            this.listeners.set(listenerId, {
                element,
                event,
                handler: wrappedHandler,
                originalHandler: handler,
                options,
                timestamp: Date.now()
            });

            this.logger.debug(`Added event listener: ${event}`, { listenerId });
            return listenerId;

        } catch (error) {
            this.logger.error('Failed to add event listener', { event, error: error.message });
            return null;
        }
    }

    /**
     * Remove specific event listener
     */
    removeEventListener(listenerId) {
        if (!this.listeners.has(listenerId)) {
            this.logger.warn(`Event listener not found: ${listenerId}`);
            return false;
        }

        const { element, event, handler, options } = this.listeners.get(listenerId);
        
        try {
            element.removeEventListener(event, handler, options);
            this.listeners.delete(listenerId);
            this.logger.debug(`Removed event listener: ${listenerId}`);
            return true;

        } catch (error) {
            this.logger.error('Failed to remove event listener', { listenerId, error: error.message });
            return false;
        }
    }

    /**
     * Event delegation for dynamic content
     */
    delegate(container, selector, event, handler) {
        if (!container || !selector || !event || !handler) {
            this.logger.warn('Invalid delegate parameters');
            return null;
        }

        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                try {
                    handler.call(target, e);
                } catch (error) {
                    this.logger.error(`Delegated event handler error: ${event}`, { 
                        selector, 
                        error: error.message 
                    });
                }
            }
        };

        const listenerId = this.addEventListener(container, event, delegatedHandler, true);
        
        if (listenerId) {
            this.delegatedEvents.set(listenerId, { container, selector, event, handler });
            this.logger.debug(`Added delegated event: ${event} for ${selector}`);
        }

        return listenerId;
    }

    /**
     * Wrap event handlers with error handling and logging
     */
    wrapHandler(handler, context) {
        return (event) => {
            try {
                return handler(event);
            } catch (error) {
                this.logger.error(`Event handler error: ${context}`, {
                    error: error.message,
                    stack: error.stack,
                    eventType: event.type,
                    target: event.target?.tagName || 'unknown'
                });

                // Prevent event from breaking the application
                event.preventDefault?.();
                event.stopPropagation?.();
            }
        };
    }

    /**
     * Add multiple event listeners to the same element
     */
    addMultipleListeners(element, events, handler, options = {}) {
        const listenerIds = [];

        for (const event of events) {
            const id = this.addEventListener(element, event, handler, options);
            if (id) {
                listenerIds.push(id);
            }
        }

        return listenerIds;
    }

    /**
     * Create a one-time event listener
     */
    once(element, event, handler, options = {}) {
        const onceHandler = (e) => {
            handler(e);
            this.removeEventListener(listenerId);
        };

        const listenerId = this.addEventListener(element, event, onceHandler, options);
        return listenerId;
    }

    /**
     * Throttle event handler execution
     */
    throttle(element, event, handler, delay = 100, options = {}) {
        let lastCall = 0;
        
        const throttledHandler = (e) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                handler(e);
            }
        };

        return this.addEventListener(element, event, throttledHandler, options);
    }

    /**
     * Debounce event handler execution
     */
    debounce(element, event, handler, delay = 300, options = {}) {
        let timeoutId;
        
        const debouncedHandler = (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler(e), delay);
        };

        return this.addEventListener(element, event, debouncedHandler, options);
    }

    /**
     * Clean up all event listeners
     */
    cleanup() {
        let cleanedCount = 0;

        for (const [listenerId, { element, event, handler, options }] of this.listeners) {
            try {
                element.removeEventListener(event, handler, options);
                cleanedCount++;
            } catch (error) {
                this.logger.warn(`Failed to clean up listener ${listenerId}`, { error: error.message });
            }
        }

        this.listeners.clear();
        this.delegatedEvents.clear();
        
        this.logger.info(`Cleaned up ${cleanedCount} event listeners`);
        return cleanedCount;
    }

    /**
     * Get statistics about managed events
     */
    getStats() {
        return {
            totalListeners: this.listeners.size,
            delegatedEvents: this.delegatedEvents.size,
            eventTypes: this.getEventTypeStats(),
            oldestListener: this.getOldestListener()
        };
    }

    getEventTypeStats() {
        const stats = {};
        for (const { event } of this.listeners.values()) {
            stats[event] = (stats[event] || 0) + 1;
        }
        return stats;
    }

    getOldestListener() {
        let oldest = null;
        let oldestTime = Date.now();

        for (const [id, { timestamp }] of this.listeners) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldest = id;
            }
        }

        return oldest ? { id: oldest, age: Date.now() - oldestTime } : null;
    }
}

// Create global instance
const eventManager = new EventManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        eventManager.cleanup();
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports.EventManager = EventManager;
    module.exports.eventManager = eventManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
    window.eventManager = eventManager;
    
    // Create convenient global functions
    window.addListener = (el, event, handler, options) => eventManager.addEventListener(el, event, handler, options);
    window.removeListener = (id) => eventManager.removeEventListener(id);
    window.delegateEvent = (container, selector, event, handler) => eventManager.delegate(container, selector, event, handler);
}
