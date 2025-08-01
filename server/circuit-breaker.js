/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides a circuit breaker implementation for external API calls to prevent
 * cascading failures when external services are unavailable.
 * 
 * @version 6.5.2.4
 */

import { createWinstonLogger } from './winston-config.js';

// Circuit breaker states
const STATES = {
    CLOSED: 'CLOSED',      // Normal operation, requests flow through
    OPEN: 'OPEN',          // Circuit is open, requests fail fast
    HALF_OPEN: 'HALF_OPEN' // Testing if service is back online
};

// Create specialized logger for circuit breaker operations
const cbLogger = createWinstonLogger({
    service: 'circuit-breaker',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

/**
 * Circuit Breaker class
 */
export class CircuitBreaker {
    /**
     * Create a new circuit breaker
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.name - Name of the circuit breaker (for logging)
     * @param {number} options.failureThreshold - Number of failures before opening circuit
     * @param {number} options.resetTimeout - Time in ms before attempting to close circuit
     * @param {number} options.timeout - Request timeout in ms
     * @param {Function} options.fallbackFn - Function to call when circuit is open
     */
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        this.timeout = options.timeout || 10000; // 10 seconds
        this.fallbackFn = options.fallbackFn || null;
        
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.totalCalls = 0;
        this.totalFailures = 0;
        this.totalTimeouts = 0;
        this.totalSuccesses = 0;
        
        cbLogger.info(`Circuit breaker "${this.name}" initialized`, {
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            timeout: this.timeout,
            hasFallback: !!this.fallbackFn
        });
    }
    
    /**
     * Execute a function with circuit breaker protection
     * 
     * @param {Function} fn - Function to execute
     * @param {Array} args - Arguments to pass to the function
     * @returns {Promise} - Result of the function or fallback
     */
    async execute(fn, ...args) {
        this.totalCalls++;
        
        // Check if circuit is open
        if (this.state === STATES.OPEN) {
            // Check if it's time to try again
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                cbLogger.info(`Circuit breaker "${this.name}" transitioning to HALF_OPEN state`, {
                    failureCount: this.failureCount,
                    lastFailureTime: this.lastFailureTime
                });
                
                this.state = STATES.HALF_OPEN;
            } else {
                cbLogger.debug(`Circuit breaker "${this.name}" is OPEN, failing fast`, {
                    timeUntilReset: this.resetTimeout - (Date.now() - this.lastFailureTime)
                });
                
                // Circuit is open, fail fast
                if (this.fallbackFn) {
                    return this.fallbackFn(...args);
                }
                
                throw new Error(`Circuit breaker "${this.name}" is open`);
            }
        }
        
        // Execute the function with timeout
        try {
            const result = await this._executeWithTimeout(fn, args);
            
            // If we're in half-open state and the call succeeded, close the circuit
            if (this.state === STATES.HALF_OPEN) {
                this.successCount++;
                
                // After 2 successful calls in half-open state, close the circuit
                if (this.successCount >= 2) {
                    cbLogger.info(`Circuit breaker "${this.name}" transitioning to CLOSED state`, {
                        successCount: this.successCount
                    });
                    
                    this.state = STATES.CLOSED;
                    this.failureCount = 0;
                    this.successCount = 0;
                }
            } else {
                // Reset failure count on success in closed state
                this.failureCount = 0;
            }
            
            this.totalSuccesses++;
            return result;
        } catch (error) {
            this._handleFailure(error);
            
            // If we have a fallback function, call it
            if (this.fallbackFn) {
                return this.fallbackFn(...args);
            }
            
            // Otherwise, propagate the error
            throw error;
        }
    }
    
    /**
     * Execute a function with a timeout
     * 
     * @param {Function} fn - Function to execute
     * @param {Array} args - Arguments to pass to the function
     * @returns {Promise} - Result of the function
     * @private
     */
    async _executeWithTimeout(fn, args) {
        return new Promise((resolve, reject) => {
            // Create timeout error
            const timeoutId = setTimeout(() => {
                this.totalTimeouts++;
                reject(new Error(`Circuit breaker "${this.name}" timeout after ${this.timeout}ms`));
            }, this.timeout);
            
            // Execute the function
            Promise.resolve(fn(...args))
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }
    
    /**
     * Handle a failure
     * 
     * @param {Error} error - Error that occurred
     * @private
     */
    _handleFailure(error) {
        this.failureCount++;
        this.totalFailures++;
        this.lastFailureTime = Date.now();
        
        // Log the failure
        cbLogger.warn(`Circuit breaker "${this.name}" failure`, {
            error: error.message,
            failureCount: this.failureCount,
            state: this.state,
            isTimeout: error.message.includes('timeout')
        });
        
        // If we've reached the failure threshold, open the circuit
        if (this.state === STATES.CLOSED && this.failureCount >= this.failureThreshold) {
            cbLogger.error(`Circuit breaker "${this.name}" transitioning to OPEN state`, {
                failureCount: this.failureCount,
                failureThreshold: this.failureThreshold
            });
            
            this.state = STATES.OPEN;
            this.successCount = 0;
        } else if (this.state === STATES.HALF_OPEN) {
            // If we're in half-open state and the call failed, open the circuit again
            cbLogger.warn(`Circuit breaker "${this.name}" transitioning back to OPEN state from HALF_OPEN`, {
                error: error.message
            });
            
            this.state = STATES.OPEN;
            this.successCount = 0;
        }
    }
    
    /**
     * Get the current state of the circuit breaker
     * 
     * @returns {Object} - Circuit breaker state
     */
    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            failureThreshold: this.failureThreshold,
            lastFailureTime: this.lastFailureTime,
            resetTimeout: this.resetTimeout,
            successCount: this.successCount,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalTimeouts: this.totalTimeouts,
            totalSuccesses: this.totalSuccesses,
            uptime: this.lastFailureTime ? Math.floor((Date.now() - this.lastFailureTime) / 1000) : 0
        };
    }
    
    /**
     * Force the circuit breaker to a specific state
     * 
     * @param {string} state - State to set (OPEN, CLOSED, HALF_OPEN)
     */
    forceState(state) {
        if (Object.values(STATES).includes(state)) {
            const oldState = this.state;
            this.state = state;
            
            cbLogger.info(`Circuit breaker "${this.name}" state manually changed from ${oldState} to ${state}`);
        } else {
            throw new Error(`Invalid circuit breaker state: ${state}`);
        }
    }
    
    /**
     * Reset the circuit breaker to its initial state
     */
    reset() {
        const oldState = this.state;
        
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        
        cbLogger.info(`Circuit breaker "${this.name}" reset from ${oldState} to ${this.state}`);
    }
}

/**
 * Create a circuit breaker registry to manage multiple circuit breakers
 */
export class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }
    
    /**
     * Get or create a circuit breaker
     * 
     * @param {string} name - Name of the circuit breaker
     * @param {Object} options - Circuit breaker options
     * @returns {CircuitBreaker} - Circuit breaker instance
     */
    getOrCreate(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker({ name, ...options }));
        }
        
        return this.breakers.get(name);
    }
    
    /**
     * Get a circuit breaker by name
     * 
     * @param {string} name - Name of the circuit breaker
     * @returns {CircuitBreaker|null} - Circuit breaker instance or null if not found
     */
    get(name) {
        return this.breakers.get(name) || null;
    }
    
    /**
     * Get all circuit breakers
     * 
     * @returns {Array} - Array of circuit breaker instances
     */
    getAll() {
        return Array.from(this.breakers.values());
    }
    
    /**
     * Get the state of all circuit breakers
     * 
     * @returns {Object} - State of all circuit breakers
     */
    getAllStates() {
        const states = {};
        
        for (const [name, breaker] of this.breakers.entries()) {
            states[name] = breaker.getState();
        }
        
        return states;
    }
    
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
        
        cbLogger.info('All circuit breakers reset');
    }
}

// Create a singleton registry
const registry = new CircuitBreakerRegistry();

export default registry;
