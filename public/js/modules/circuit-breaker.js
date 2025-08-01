/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides protection against cascading failures when external services are unavailable.
 * Implements the circuit breaker pattern with configurable thresholds and automatic recovery.
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import logger from './logger.js';

// Circuit breaker states
const STATES = {
    CLOSED: 'CLOSED',    // Normal operation - requests pass through
    OPEN: 'OPEN',        // Failure threshold exceeded - requests fail fast
    HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

class CircuitBreaker {
    /**
     * Create a new circuit breaker
     * @param {string} name - Unique name for this circuit breaker
     * @param {Object} options - Configuration options
     * @param {number} options.failureThreshold - Number of failures before opening circuit (default: 5)
     * @param {number} options.resetTimeout - Time in ms before attempting reset (default: 30000)
     * @param {Function} options.fallbackFn - Optional fallback function to call when circuit is open
     */
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.fallbackFn = options.fallbackFn;
        
        // Initialize state
        this._state = {
            state: STATES.CLOSED,
            failureCount: 0,
            lastFailureTime: null,
            lastSuccessTime: null,
            resetTimer: null
        };
        
        logger.debug(`Circuit breaker "${name}" initialized`, {
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            hasFallback: !!this.fallbackFn
        });
    }
    
    /**
     * Execute a function with circuit breaker protection
     * @param {Function} fn - Function to execute
     * @param {boolean} useFallback - Whether to use fallback function if circuit is open
     * @returns {Promise<*>} Result of the function or fallback
     * @throws {Error} If circuit is open and no fallback is provided or useFallback is false
     */
    async execute(fn, useFallback = false) {
        // Check if circuit is open
        if (this._state.state === STATES.OPEN) {
            // Check if it's time to try resetting
            if (Date.now() - this._state.lastFailureTime >= this.resetTimeout) {
                this._transitionToHalfOpen();
            } else {
                // Circuit is open and not ready to reset
                logger.debug(`Circuit "${this.name}" is open, failing fast`, {
                    failureCount: this._state.failureCount,
                    lastFailure: new Date(this._state.lastFailureTime).toISOString(),
                    remainingTimeout: this.resetTimeout - (Date.now() - this._state.lastFailureTime)
                });
                
                // Use fallback if available and requested
                if (this.fallbackFn && useFallback) {
                    logger.debug(`Using fallback for circuit "${this.name}"`);
                    return this.fallbackFn();
                }
                
                throw new Error(`Circuit breaker "${this.name}" is open`);
            }
        }
        
        try {
            // Execute the function
            const result = await fn();
            
            // Record success
            this._recordSuccess();
            
            return result;
        } catch (error) {
            // Record failure
            this._recordFailure();
            
            // Re-throw the error
            throw error;
        }
    }
    
    /**
     * Record a successful execution
     * @private
     */
    _recordSuccess() {
        this._state.lastSuccessTime = Date.now();
        
        // If in half-open state, transition back to closed
        if (this._state.state === STATES.HALF_OPEN) {
            this._transitionToClosed();
        }
    }
    
    /**
     * Record a failed execution
     * @private
     */
    _recordFailure() {
        this._state.failureCount++;
        this._state.lastFailureTime = Date.now();
        
        // If in half-open state, transition back to open
        if (this._state.state === STATES.HALF_OPEN) {
            this._transitionToOpen();
            return;
        }
        
        // If failure threshold is reached, transition to open
        if (this._state.state === STATES.CLOSED && 
            this._state.failureCount >= this.failureThreshold) {
            this._transitionToOpen();
        }
    }
    
    /**
     * Transition to closed state (normal operation)
     * @private
     */
    _transitionToClosed() {
        const previousState = this._state.state;
        
        this._state.state = STATES.CLOSED;
        this._state.failureCount = 0;
        
        logger.info(`Circuit "${this.name}" transitioned from ${previousState} to ${STATES.CLOSED}`);
    }
    
    /**
     * Transition to open state (failing fast)
     * @private
     */
    _transitionToOpen() {
        const previousState = this._state.state;
        
        this._state.state = STATES.OPEN;
        
        logger.warn(`Circuit "${this.name}" transitioned from ${previousState} to ${STATES.OPEN}`, {
            failureCount: this._state.failureCount,
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout
        });
        
        // Set up reset timer
        if (this._state.resetTimer) {
            clearTimeout(this._state.resetTimer);
        }
        
        this._state.resetTimer = setTimeout(() => {
            this._transitionToHalfOpen();
        }, this.resetTimeout);
    }
    
    /**
     * Transition to half-open state (testing recovery)
     * @private
     */
    _transitionToHalfOpen() {
        const previousState = this._state.state;
        
        this._state.state = STATES.HALF_OPEN;
        
        logger.info(`Circuit "${this.name}" transitioned from ${previousState} to ${STATES.HALF_OPEN}`, {
            failureCount: this._state.failureCount,
            lastFailure: new Date(this._state.lastFailureTime).toISOString()
        });
        
        // Clear the reset timer
        if (this._state.resetTimer) {
            clearTimeout(this._state.resetTimer);
            this._state.resetTimer = null;
        }
    }
    
    /**
     * Get the current state of the circuit breaker
     * @returns {Object} Current state
     */
    getState() {
        return {
            name: this.name,
            state: this._state.state,
            failureCount: this._state.failureCount,
            lastFailureTime: this._state.lastFailureTime ? new Date(this._state.lastFailureTime).toISOString() : null,
            lastSuccessTime: this._state.lastSuccessTime ? new Date(this._state.lastSuccessTime).toISOString() : null,
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            hasFallback: !!this.fallbackFn
        };
    }
    
    /**
     * Reset the circuit breaker to closed state
     * Useful for manual recovery
     */
    reset() {
        // Clear any reset timer
        if (this._state.resetTimer) {
            clearTimeout(this._state.resetTimer);
            this._state.resetTimer = null;
        }
        
        // Reset to closed state
        this._state.state = STATES.CLOSED;
        this._state.failureCount = 0;
        
        logger.info(`Circuit "${this.name}" manually reset to ${STATES.CLOSED}`);
    }
}

// Registry to manage multiple circuit breakers
class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }
    
    /**
     * Get an existing circuit breaker or create a new one
     * @param {string} name - Unique name for the circuit breaker
     * @param {Object} options - Configuration options (see CircuitBreaker constructor)
     * @returns {CircuitBreaker} The circuit breaker instance
     */
    getOrCreate(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }
    
    /**
     * Get all circuit breakers
     * @returns {Map<string, CircuitBreaker>} Map of all circuit breakers
     */
    getAll() {
        return this.breakers;
    }
    
    /**
     * Reset a specific circuit breaker
     * @param {string} name - Name of the circuit breaker to reset
     * @returns {boolean} True if the breaker was found and reset, false otherwise
     */
    reset(name) {
        const breaker = this.breakers.get(name);
        if (breaker) {
            breaker.reset();
            return true;
        }
        return false;
    }
    
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        this.breakers.forEach(breaker => breaker.reset());
        logger.info(`Reset all circuit breakers (${this.breakers.size})`);
    }
    
    /**
     * Get the status of all circuit breakers
     * @returns {Array<Object>} Array of circuit breaker states
     */
    getStatus() {
        return Array.from(this.breakers.values()).map(breaker => breaker.getState());
    }
}

// Create and export singleton registry
const registry = new CircuitBreakerRegistry();

// Export CircuitBreaker class for direct use
export { CircuitBreaker };

// Export registry as default
export default registry;
