/**
 * Global Loading Spinner Utility
 * Version: 7.0.0.19
 * 
 * This module provides a global loading spinner that can be shown during page transitions,
 * API calls, or any other operations that might take time to complete.
 */

class LoadingSpinner {
    constructor() {
        this.initialized = false;
        this.spinnerElement = null;
        this.spinnerOverlay = null;
        this.spinnerMessage = null;
        this.defaultMessage = 'Loading...';
        this.timeoutId = null;
        this.minDisplayTime = 300; // Minimum time to show spinner in ms
        this.showDelay = 200;      // Delay before showing spinner in ms
    }

    /**
     * Initialize the spinner by creating and appending necessary DOM elements
     */
    initialize() {
        if (this.initialized) return;

        // Create spinner overlay
        this.spinnerOverlay = document.createElement('div');
        this.spinnerOverlay.className = 'global-spinner-overlay';
        
        // Create spinner element
        this.spinnerElement = document.createElement('div');
        this.spinnerElement.className = 'global-spinner';
        
        // Create message element
        this.spinnerMessage = document.createElement('div');
        this.spinnerMessage.className = 'global-spinner-message';
        this.spinnerMessage.textContent = this.defaultMessage;
        
        // Assemble and append to body
        this.spinnerOverlay.appendChild(this.spinnerElement);
        this.spinnerOverlay.appendChild(this.spinnerMessage);
        document.body.appendChild(this.spinnerOverlay);
        
        this.initialized = true;
        
        // Add event listeners for page transitions
        this.setupPageTransitionListeners();
    }

    /**
     * Show the spinner with an optional custom message
     * @param {string} message - Optional custom message to display
     * @param {boolean} immediate - If true, show immediately without delay
     */
    show(message = this.defaultMessage, immediate = false) {
        if (!this.initialized) {
            this.initialize();
        }
        
        // Clear any existing timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        // Update message
        this.spinnerMessage.textContent = message;
        
        // Show spinner (with delay unless immediate is true)
        if (immediate) {
            this.spinnerOverlay.classList.add('active');
        } else {
            this.timeoutId = setTimeout(() => {
                this.spinnerOverlay.classList.add('active');
            }, this.showDelay);
        }
    }

    /**
     * Hide the spinner
     * @param {boolean} force - If true, hide immediately regardless of minimum display time
     */
    hide(force = false) {
        if (!this.initialized) return;
        
        // Clear any pending show timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (force) {
            this.spinnerOverlay.classList.remove('active');
            return;
        }
        
        // Ensure spinner stays visible for minimum time to avoid flickering
        const currentlyVisible = this.spinnerOverlay.classList.contains('active');
        if (currentlyVisible) {
            setTimeout(() => {
                this.spinnerOverlay.classList.remove('active');
            }, this.minDisplayTime);
        } else {
            this.spinnerOverlay.classList.remove('active');
        }
    }

    /**
     * Set up listeners for page transitions and AJAX requests
     */
    setupPageTransitionListeners() {
        // Listen for view changes
        if (window.EventBus) {
            window.EventBus.subscribe('view:changing', (data) => {
                this.show(`Loading ${data.view || 'page'}...`);
            });
            
            window.EventBus.subscribe('view:changed', () => {
                this.hide();
            });
        }
        
        // Intercept fetch API to show spinner during API calls
        this.interceptFetch();
        
        // Intercept XMLHttpRequest to show spinner during AJAX calls
        this.interceptXHR();
    }

    /**
     * Intercept fetch API to show/hide spinner during API calls
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        const spinner = this;
        
        window.fetch = function(...args) {
            // Don't show spinner for certain requests (like health checks)
            const url = args[0]?.url || args[0];
            if (typeof url === 'string' && 
                (url.includes('/api/health') || 
                 url.includes('/ping') || 
                 url.includes('/favicon'))) {
                return originalFetch.apply(this, args);
            }
            
            spinner.show('Loading data...');
            
            return originalFetch.apply(this, args)
                .then(response => {
                    spinner.hide();
                    return response;
                })
                .catch(error => {
                    spinner.hide();
                    throw error;
                });
        };
    }

    /**
     * Intercept XMLHttpRequest to show/hide spinner during AJAX calls
     */
    interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const spinner = this;
        
        XMLHttpRequest.prototype.open = function(...args) {
            this._requestUrl = args[1];
            return originalOpen.apply(this, args);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
            // Don't show spinner for certain requests
            if (this._requestUrl && 
                (this._requestUrl.includes('/api/health') || 
                 this._requestUrl.includes('/ping') || 
                 this._requestUrl.includes('/favicon'))) {
                return originalSend.apply(this, args);
            }
            
            spinner.show('Loading data...');
            
            // Set up listeners to hide spinner when request completes
            this.addEventListener('load', () => spinner.hide());
            this.addEventListener('error', () => spinner.hide());
            this.addEventListener('abort', () => spinner.hide());
            
            return originalSend.apply(this, args);
        };
    }

    /**
     * Create and return an inline spinner element
     * @returns {HTMLElement} Inline spinner element
     */
    createInlineSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'inline-spinner';
        return spinner;
    }
}

// Create singleton instance
const loadingSpinner = new LoadingSpinner();

// Export the singleton
export default loadingSpinner;
