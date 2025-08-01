
/**
 * Resource Manager - Prevents memory leaks from event listeners and intervals
 */
class ResourceManager {
    constructor() {
        this.eventListeners = new Map();
        this.intervals = new Set();
        this.timeouts = new Set();
        this.setupCleanup();
    }

    setupCleanup() {
        window.addEventListener('beforeunload', () => this.cleanupAll());
    }

    addEventListener(element, event, handler, options = {}) {
        const wrappedHandler = (...args) => {
            try {
                return handler(...args);
            } catch (error) {
                console.error(`Event handler error (${event}):`, error);
            }
        };

        element.addEventListener(event, wrappedHandler, options);
        
        const key = `${Date.now()}-${Math.random()}`;
        this.eventListeners.set(key, { element, event, handler: wrappedHandler, options });
        return key;
    }

    setInterval(callback, delay) {
        const wrappedCallback = () => {
            try {
                callback();
            } catch (error) {
                console.error('Interval callback error:', error);
            }
        };

        const intervalId = setInterval(wrappedCallback, delay);
        this.intervals.add(intervalId);
        return intervalId;
    }

    setTimeout(callback, delay) {
        const wrappedCallback = () => {
            try {
                callback();
            } catch (error) {
                console.error('Timeout callback error:', error);
            } finally {
                this.timeouts.delete(timeoutId);
            }
        };

        const timeoutId = setTimeout(wrappedCallback, delay);
        this.timeouts.add(timeoutId);
        return timeoutId;
    }

    cleanupAll() {
        // Clean event listeners
        for (const [key, { element, event, handler, options }] of this.eventListeners) {
            element.removeEventListener(event, handler, options);
        }
        this.eventListeners.clear();

        // Clean intervals
        for (const intervalId of this.intervals) {
            clearInterval(intervalId);
        }
        this.intervals.clear();

        // Clean timeouts
        for (const timeoutId of this.timeouts) {
            clearTimeout(timeoutId);
        }
        this.timeouts.clear();

        console.log('✅ Resources cleaned up');
    }
}

window.resourceManager = new ResourceManager();
