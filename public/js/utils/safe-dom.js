/**
 * Safe DOM Utility
 * 
 * Provides safe DOM element selection and manipulation with error handling
 * and null checks to prevent common DOM-related errors.
 */

class SafeDOM {
    constructor(logger = null) {
        this.logger = logger || {
            warn: (msg, data) => console.warn(msg, data),
            error: (msg, data) => console.error(msg, data),
            debug: (msg, data) => console.debug(msg, data)
        };
    }

    /**
     * Safely select a single element
     */
    select(selector, context = document) {
        try {
            if (!selector) {
                this.logger.warn('SafeDOM: Empty selector provided');
                return null;
            }

            const element = context.querySelector(selector);
            if (!element) {
                this.logger.debug(`SafeDOM: Element not found for selector: ${selector}`);
            }
            
            return element;
        } catch (error) {
            this.logger.error('SafeDOM: Error selecting element', { selector, error: error.message });
            return null;
        }
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
            if (!id) {
                this.logger.warn('SafeDOM: Empty ID provided');
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
}

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafeDOM };
} else if (typeof window !== 'undefined') {
    window.SafeDOM = SafeDOM;
}

export { SafeDOM };
