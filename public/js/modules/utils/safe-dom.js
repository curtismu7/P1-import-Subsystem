/**
 * Safe DOM Utilities
 * 
 * Provides safe DOM manipulation methods with error handling and validation.
 * Used throughout the application for robust DOM operations.
 */

class SafeDOM {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Safely get an element by ID
     * @param {string} id - Element ID
     * @returns {Element|null} Element or null if not found
     */
    getElementById(id) {
        try {
            return document.getElementById(id);
        } catch (error) {
            this.logger.error('Error getting element by ID:', { id, error: error.message });
            return null;
        }
    }

    /**
     * Safely query selector
     * @param {string} selector - CSS selector
     * @returns {Element|null} Element or null if not found
     */
    querySelector(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            this.logger.error('Error with querySelector:', { selector, error: error.message });
            return null;
        }
    }

    /**
     * Safely query all selectors
     * @param {string} selector - CSS selector
     * @returns {NodeList|Array} NodeList or empty array if error
     */
    querySelectorAll(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (error) {
            this.logger.error('Error with querySelectorAll:', { selector, error: error.message });
            return [];
        }
    }

    /**
     * Safely set text content
     * @param {Element} element - DOM element
     * @param {string} text - Text to set
     */
    setText(element, text) {
        try {
            if (element && typeof element.textContent !== 'undefined') {
                element.textContent = text;
            }
        } catch (error) {
            this.logger.error('Error setting text content:', { text, error: error.message });
        }
    }

    /**
     * Safely set HTML content
     * @param {Element} element - DOM element
     * @param {string} html - HTML to set
     */
    setHTML(element, html) {
        try {
            if (element && typeof element.innerHTML !== 'undefined') {
                element.innerHTML = html;
            }
        } catch (error) {
            this.logger.error('Error setting HTML content:', { html, error: error.message });
        }
    }

    /**
     * Safely show element
     * @param {Element} element - DOM element
     */
    show(element) {
        try {
            if (element && element.style) {
                element.style.display = 'block';
            }
        } catch (error) {
            this.logger.error('Error showing element:', { error: error.message });
        }
    }

    /**
     * Safely hide element
     * @param {Element} element - DOM element
     */
    hide(element) {
        try {
            if (element && element.style) {
                element.style.display = 'none';
            }
        } catch (error) {
            this.logger.error('Error hiding element:', { error: error.message });
        }
    }

    /**
     * Safely add class
     * @param {Element} element - DOM element
     * @param {string} className - Class name to add
     */
    addClass(element, className) {
        try {
            if (element && element.classList) {
                element.classList.add(className);
            }
        } catch (error) {
            this.logger.error('Error adding class:', { className, error: error.message });
        }
    }

    /**
     * Safely remove class
     * @param {Element} element - DOM element
     * @param {string} className - Class name to remove
     */
    removeClass(element, className) {
        try {
            if (element && element.classList) {
                element.classList.remove(className);
            }
        } catch (error) {
            this.logger.error('Error removing class:', { className, error: error.message });
        }
    }

    /**
     * Safely set attribute
     * @param {Element} element - DOM element
     * @param {string} name - Attribute name
     * @param {string} value - Attribute value
     */
    setAttribute(element, name, value) {
        try {
            if (element && typeof element.setAttribute === 'function') {
                element.setAttribute(name, value);
            }
        } catch (error) {
            this.logger.error('Error setting attribute:', { name, value, error: error.message });
        }
    }

    /**
     * Safely get attribute
     * @param {Element} element - DOM element
     * @param {string} name - Attribute name
     * @returns {string|null} Attribute value or null
     */
    getAttribute(element, name) {
        try {
            if (element && typeof element.getAttribute === 'function') {
                return element.getAttribute(name);
            }
            return null;
        } catch (error) {
            this.logger.error('Error getting attribute:', { name, error: error.message });
            return null;
        }
    }

    /**
     * Safely add event listener
     * @param {Element} element - DOM element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    addEventListener(element, event, handler) {
        try {
            if (element && typeof element.addEventListener === 'function') {
                element.addEventListener(event, handler);
            }
        } catch (error) {
            this.logger.error('Error adding event listener:', { event, error: error.message });
        }
    }

    /**
     * Safely remove event listener
     * @param {Element} element - DOM element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    removeEventListener(element, event, handler) {
        try {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler);
            }
        } catch (error) {
            this.logger.error('Error removing event listener:', { event, error: error.message });
        }
    }
}

// Create global instance
// Export for ES modules only
export { SafeDOM };
export default SafeDOM;
