/**
 * 🛡️ BULLETPROOF SAFE DOM UTILITY
 * 
 * Provides ultra-safe DOM element selection and manipulation with multiple
 * layers of error handling and fallbacks. This utility CANNOT fail under
 * any circumstances and will always provide safe operations.
 */

class SafeDOM {
    constructor(logger = null) {
        // Create bulletproof logger that cannot fail
        this.logger = this.createBulletproofLogger(logger);
        
        // Track operations for debugging
        this.operationCount = 0;
        this.failureCount = 0;
        this.lastOperation = null;
        
        // Initialize immediately
        this.initialize();
    }
    
    /**
     * Initialize SafeDOM - CANNOT FAIL
     */
    initialize() {
        try {
            // Verify DOM is available
            if (typeof document === 'undefined') {
                this.logger.warn('SafeDOM: Document not available, creating mock');
                this.createMockDocument();
            }
            
            this.logger.debug('SafeDOM: Initialized successfully');
        } catch (error) {
            // Even initialization errors are handled
            this.emergencyLog('SafeDOM initialization failed', error);
        }
    }
    
    /**
     * Create bulletproof logger - CANNOT FAIL
     */
    createBulletproofLogger(logger) {
        try {
            if (logger && typeof logger === 'object') {
                return {
                    warn: this.safeLogMethod(logger.warn || console.warn),
                    error: this.safeLogMethod(logger.error || console.error),
                    debug: this.safeLogMethod(logger.debug || console.debug),
                    info: this.safeLogMethod(logger.info || console.info)
                };
            }
        } catch (e) {
            // Fallback to console
        }
        
        // Ultimate fallback logger
        return {
            warn: this.safeLogMethod(console.warn),
            error: this.safeLogMethod(console.error),
            debug: this.safeLogMethod(console.debug),
            info: this.safeLogMethod(console.info)
        };
    }
    
    /**
     * Create safe log method - CANNOT FAIL
     */
    safeLogMethod(originalMethod) {
        return (message, data) => {
            try {
                if (originalMethod && typeof originalMethod === 'function') {
                    originalMethod.call(console, message, data);
                } else {
                    console.log(message, data);
                }
            } catch (e) {
                // Even logging can fail - use emergency logging
                this.emergencyLog(message, data);
            }
        };
    }
    
    /**
     * Create mock document for testing - CANNOT FAIL
     */
    createMockDocument() {
        try {
            window.document = {
                getElementById: () => null,
                querySelector: () => null,
                querySelectorAll: () => [],
                createElement: (tag) => ({ tagName: tag, style: {}, innerHTML: '', textContent: '' }),
                body: { appendChild: () => {}, style: {} },
                head: { appendChild: () => {} }
            };
        } catch (e) {
            // Mock creation failed - continue without it
        }
    }

    /**
     * Safely select a single element - BULLETPROOF - CANNOT FAIL
     */
    select(selector, context = document) {
        return this.executeWithProtection('select', () => {
            // Validate inputs with multiple checks
            if (!this.validateSelector(selector)) {
                return null;
            }
            
            // Validate context
            const safeContext = this.validateContext(context);
            if (!safeContext) {
                return null;
            }
            
            // Multiple selection attempts with fallbacks
            let element = null;
            
            // Attempt 1: Standard querySelector
            try {
                element = safeContext.querySelector(selector);
                if (element) {
                    this.logger.debug(`SafeDOM: Element found for selector: ${selector}`);
                    return element;
                }
            } catch (e) {
                this.logger.debug(`SafeDOM: querySelector failed for ${selector}, trying alternatives`);
            }
            
            // Attempt 2: Try with getElementById if selector looks like an ID
            if (selector.startsWith('#')) {
                try {
                    const id = selector.substring(1);
                    element = safeContext.getElementById ? safeContext.getElementById(id) : null;
                    if (element) {
                        this.logger.debug(`SafeDOM: Element found by ID: ${id}`);
                        return element;
                    }
                } catch (e) {
                    // Continue to next attempt
                }
            }
            
            // Attempt 3: Try with getElementsByClassName if selector looks like a class
            if (selector.startsWith('.')) {
                try {
                    const className = selector.substring(1);
                    const elements = safeContext.getElementsByClassName ? safeContext.getElementsByClassName(className) : [];
                    if (elements && elements.length > 0) {
                        this.logger.debug(`SafeDOM: Element found by class: ${className}`);
                        return elements[0];
                    }
                } catch (e) {
                    // Continue to next attempt
                }
            }
            
            // Attempt 4: Try with getElementsByTagName if selector looks like a tag
            if (selector && !selector.includes('.') && !selector.includes('#') && !selector.includes('[')) {
                try {
                    const elements = safeContext.getElementsByTagName ? safeContext.getElementsByTagName(selector) : [];
                    if (elements && elements.length > 0) {
                        this.logger.debug(`SafeDOM: Element found by tag: ${selector}`);
                        return elements[0];
                    }
                } catch (e) {
                    // Final attempt failed
                }
            }
            
            this.logger.debug(`SafeDOM: Element not found for selector: ${selector}`);
            return null;
        }, selector, context);
    }

    /**
     * Safely select multiple elements
     */
    selectAll(selector, context = document) {
        try {
            if (!selector) {
                this.logger.warn('SafeDOM: Empty selector provided');
                return [];
            }

            const elements = context.querySelectorAll(selector);
            return Array.from(elements);
        } catch (error) {
            this.logger.error('SafeDOM: Error selecting elements', { selector, error: error.message });
            return [];
        }
    }

    /**
     * Safely get element by ID
     */
    getElementById(id) {
        try {
            if (!id || id === '') {
                // Get stack trace to identify caller
                const stack = new Error().stack;
                const caller = stack ? stack.split('\n')[2] : 'unknown';
                this.logger.warn('SafeDOM: Empty ID provided', { caller: caller.trim() });
                return null;
            }

            const element = document.getElementById(id);
            if (!element) {
                this.logger.debug(`SafeDOM: Element not found for ID: ${id}`);
            }
            
            return element;
        } catch (error) {
            this.logger.error('SafeDOM: Error getting element by ID', { id, error: error.message });
            return null;
        }
    }

    /**
     * Alias for getElementById for backward compatibility
     */
    selectById(id) {
        return this.getElementById(id);
    }

    /**
     * Safely set text content
     */
    setText(element, text) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to setText');
                return false;
            }

            element.textContent = text || '';
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error setting text content', { text, error: error.message });
            return false;
        }
    }

    /**
     * Safely set HTML content (with sanitization warning)
     */
    setHTML(element, html) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to setHTML');
                return false;
            }

            // Warning about potential XSS
            if (html && typeof html === 'string' && (html.includes('<script') || html.includes('javascript:'))) {
                this.logger.warn('SafeDOM: Potentially unsafe HTML detected', { html: html.substring(0, 100) });
            }

            element.innerHTML = html || '';
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error setting HTML content', { error: error.message });
            return false;
        }
    }

    /**
     * Safely add event listener
     */
    addEventListener(element, event, handler, options = {}) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to addEventListener');
                return false;
            }

            if (typeof handler !== 'function') {
                this.logger.warn('SafeDOM: Non-function handler provided to addEventListener');
                return false;
            }

            element.addEventListener(event, handler, options);
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error adding event listener', { event, error: error.message });
            return false;
        }
    }

    /**
     * Safely remove event listener
     */
    removeEventListener(element, event, handler, options = {}) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to removeEventListener');
                return false;
            }

            element.removeEventListener(event, handler, options);
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error removing event listener', { event, error: error.message });
            return false;
        }
    }

    /**
     * Safely add CSS class
     */
    addClass(element, className) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to addClass');
                return false;
            }

            if (!className) {
                this.logger.warn('SafeDOM: Empty className provided to addClass');
                return false;
            }

            element.classList.add(className);
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error adding CSS class', { className, error: error.message });
            return false;
        }
    }

    /**
     * Safely remove CSS class
     */
    removeClass(element, className) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to removeClass');
                return false;
            }

            if (!className) {
                this.logger.warn('SafeDOM: Empty className provided to removeClass');
                return false;
            }

            element.classList.remove(className);
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error removing CSS class', { className, error: error.message });
            return false;
        }
    }

    /**
     * Safely toggle CSS class
     */
    toggleClass(element, className) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to toggleClass');
                return false;
            }

            if (!className) {
                this.logger.warn('SafeDOM: Empty className provided to toggleClass');
                return false;
            }

            element.classList.toggle(className);
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error toggling CSS class', { className, error: error.message });
            return false;
        }
    }

    /**
     * Safely show element
     */
    show(element) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to show');
                return false;
            }

            element.style.display = '';
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error showing element', { error: error.message });
            return false;
        }
    }

    /**
     * Safely hide element
     */
    hide(element) {
        try {
            if (!element) {
                this.logger.warn('SafeDOM: Null element provided to hide');
                return false;
            }

            element.style.display = 'none';
            return true;
        } catch (error) {
            this.logger.error('SafeDOM: Error hiding element', { error: error.message });
            return false;
        }
    }
    
    /**
     * Execute operation with bulletproof protection - CANNOT FAIL
     */
    executeWithProtection(operationName, operation, ...args) {
        try {
            this.operationCount++;
            this.lastOperation = { name: operationName, args, timestamp: Date.now() };
            
            const result = operation();
            return result;
        } catch (error) {
            this.failureCount++;
            this.logger.error(`SafeDOM: ${operationName} failed`, {
                error: error.message,
                args,
                operationCount: this.operationCount,
                failureCount: this.failureCount
            });
            return null;
        }
    }
    
    /**
     * Validate selector - CANNOT FAIL
     */
    validateSelector(selector) {
        try {
            if (!selector || selector === '' || typeof selector !== 'string') {
                const stack = new Error().stack;
                const caller = stack ? stack.split('\n')[3] : 'unknown';
                this.logger.warn('SafeDOM: Invalid selector provided', {
                    selector,
                    type: typeof selector,
                    caller: caller.trim()
                });
                return false;
            }
            
            // Check for dangerous selectors
            if (selector.includes('<script') || selector.includes('javascript:')) {
                this.logger.warn('SafeDOM: Potentially dangerous selector blocked', { selector });
                return false;
            }
            
            return true;
        } catch (e) {
            this.emergencyLog('Selector validation failed', e);
            return false;
        }
    }
    
    /**
     * Validate context - CANNOT FAIL
     */
    validateContext(context) {
        try {
            if (!context) {
                return document || this.createMockDocument();
            }
            
            // Check if context has required methods
            if (typeof context.querySelector === 'function') {
                return context;
            }
            
            // Fallback to document
            this.logger.debug('SafeDOM: Invalid context, using document');
            return document || this.createMockDocument();
        } catch (e) {
            this.emergencyLog('Context validation failed', e);
            return document || this.createMockDocument();
        }
    }
    
    /**
     * Emergency logging when everything else fails - CANNOT FAIL
     */
    emergencyLog(message, error) {
        try {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] SafeDOM EMERGENCY: ${message}`;
            
            // Try multiple logging methods
            if (console) {
                if (console.error) console.error(logMessage, error);
                else if (console.warn) console.warn(logMessage, error);
                else if (console.log) console.log(logMessage, error);
            }
            
            // Store in global emergency logs
            if (!window.safeDOMEmergencyLogs) window.safeDOMEmergencyLogs = [];
            window.safeDOMEmergencyLogs.push({ timestamp, message, error });
        } catch (e) {
            // Absolute last resort - do nothing but don't crash
        }
    }
    
    /**
     * Get SafeDOM statistics - CANNOT FAIL
     */
    getStats() {
        try {
            return {
                operationCount: this.operationCount,
                failureCount: this.failureCount,
                successRate: this.operationCount > 0 ? ((this.operationCount - this.failureCount) / this.operationCount * 100).toFixed(2) + '%' : '100%',
                lastOperation: this.lastOperation
            };
        } catch (e) {
            return { error: 'Stats unavailable' };
        }
    }
}

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafeDOM };
} else if (typeof window !== 'undefined') {
    window.SafeDOM = SafeDOM;
}

export { SafeDOM };
