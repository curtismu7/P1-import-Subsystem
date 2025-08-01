/**
 * UI Manager for PingOne Import Tool
 * 
 * Handles all UI interactions including:
 * - Status bar notifications
 * - Progress indicators
 * - Error handling and display
 * - View management
 * - Centralized logging and error reporting
 */

import { ElementRegistry } from './element-registry.js';
import { createSafeLogger } from '../../../src/client/utils/safe-logger.js';

class UIManager {
    /**
     * Create a new UIManager instance
     * @param {Object} options - Configuration options
     * @param {Object} options.errorManager - Error manager instance
     * @param {Object} options.logManager - Log manager instance
     * @param {string} options.instanceId - Unique identifier for this UIManager instance
     */
    constructor({ errorManager, logManager, instanceId = 'default' } = {}) {
        // Initialize safe logger with context
        this.logger = createSafeLogger(logManager?.getLogger('UIManager') || console, {
            level: (typeof process !== 'undefined' && process.env ? process.env.LOG_LEVEL : null) || 'INFO',
            defaultMeta: {
                component: 'UIManager',
                instanceId,
                env: (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : null) || 'development'
            }
        });
        
        // Initialize error manager with safe logging
        this.errorManager = errorManager || {
            handleError: (error, context = {}) => {
                this.logger.error('Unhandled error', { 
                    error: error instanceof Error ? error.message : String(error),
                    stack: error.stack,
                    ...context 
                });
                
                // Show error in UI if possible
                if (this.statusBarElement) {
                    this.showError(error.message || 'An error occurred', {
                        autoDismiss: false,
                        errorId: context.errorId || 'unhandled-error'
                    });
                }
            }
        };
        
        // Initialize UI element references
        this.notificationContainer = null;
        this.progressContainer = null;
        this.tokenStatusElement = null;
        this.connectionStatusElement = null;
        this.statusBarElement = null;
        this.statusBarTimeout = null;
        
        // Initialize the UI manager
        this.initialize();
    }
    
    /**
     * Initialize the UI manager
     */
    initialize() {
        try {
            this.setupElements();
            this.logger.log('[UIManager] Initialized successfully');
        } catch (error) {
            this.logger.error('[UIManager] Error during initialization:', error);
        }
    }
    
    /**
     * Set up DOM element references
     */
    setupElements() {
        try {
            // Status bar element
            this.statusBarElement = document.getElementById('global-status-bar');
            
            // If status bar doesn't exist, create it
            if (!this.statusBarElement) {
                this.createStatusBar();
            }
            
            // Other UI elements
            this.notificationContainer = ElementRegistry.notificationContainer?.() || 
                                      document.querySelector('.notification-container');
            
            this.progressContainer = ElementRegistry.progressContainer?.() || 
                                   document.querySelector('.progress-container');
            
            this.tokenStatusElement = ElementRegistry.tokenStatus?.() || 
                                    document.querySelector('.token-status');
            
            this.connectionStatusElement = ElementRegistry.connectionStatus?.() || 
                                         document.querySelector('.connection-status');
            
            this.logger.log('[UIManager] UI elements initialized');
            
        } catch (error) {
            this.logger.error('[UIManager] Error setting up UI elements:', error);
        }
    }
    
    /**
     * Create a status bar if it doesn't exist
     */
    createStatusBar() {
        try {
            this.statusBarElement = document.createElement('div');
            this.statusBarElement.id = 'global-status-bar';
            this.statusBarElement.className = 'global-status-bar';
            this.statusBarElement.style.display = 'none';
            this.statusBarElement.setAttribute('role', 'status');
            this.statusBarElement.setAttribute('aria-live', 'polite');
            
            const container = document.createElement('div');
            container.className = 'status-container';
            
            const content = document.createElement('div');
            content.className = 'status-content';
            
            const icon = document.createElement('i');
            icon.className = 'status-icon fas';
            
            const text = document.createElement('span');
            text.className = 'status-text';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'status-close';
            closeBtn.setAttribute('aria-label', 'Dismiss message');
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.addEventListener('click', () => this.clearStatusBar());
            
            content.appendChild(icon);
            content.appendChild(text);
            content.appendChild(closeBtn);
            container.appendChild(content);
            this.statusBarElement.appendChild(container);
            
            // Add to the top of the main content or body
            const mainContent = document.querySelector('main') || document.body;
            mainContent.insertBefore(this.statusBarElement, mainContent.firstChild);
            
            this.logger.log('[UIManager] Created status bar element');
            
        } catch (error) {
            this.logger.error('[UIManager] Error creating status bar:', error);
        }
    }
    
    /**
     * Show a status message in the status bar
     * @param {string} message - The message to display
     * @param {string} [type='info'] - Message type (info, success, warning, error)
     * @param {Object} [options] - Additional options
     * @param {number} [options.duration=5000] - Duration in milliseconds to show the message
     * @param {boolean} [options.autoDismiss=true] - Whether to auto-dismiss the message
     * @param {string} [options.errorId] - Unique error ID for tracking
     * @param {Object} [options.context] - Additional context for the message
     * @param {string} [options.source] - Source of the status message
     */
    showStatusBar(message, type = 'info', options = {}) {
        const { 
            duration = 5000, 
            autoDismiss = true, 
            errorId, 
            context = {},
            source = 'ui'
        } = options;
        
        // Log the status update
        const logContext = {
            type,
            duration,
            autoDismiss,
            errorId,
            source,
            ...context
        };
        
        switch (type) {
            case 'error':
                this.logger.error(message, logContext);
                break;
            case 'warn':
            case 'warning':
                this.logger.warn(message, logContext);
                break;
            case 'success':
                this.logger.info(`SUCCESS: ${message}`, logContext);
                break;
            case 'debug':
                this.logger.debug(message, logContext);
                break;
            default:
                this.logger.info(message, logContext);
        }
        if (!this.statusBarElement) {
            this.logger.warn('[UIManager] Status bar not available');
            return;
        }
        
        try {
            // Update status bar content
            const content = this.statusBarElement.querySelector('.status-content');
            const icon = this.statusBarElement.querySelector('.status-icon');
            const text = this.statusBarElement.querySelector('.status-text');
            
            if (content && icon && text) {
                // Update classes based on message type
                content.className = 'status-content';
                content.classList.add(`status-${type}`);
                
                // Set appropriate icon
                const iconMap = {
                    'success': 'check-circle',
                    'warning': 'exclamation-triangle',
                    'error': 'exclamation-circle',
                    'info': 'info-circle'
                };
                
                const iconClass = iconMap[type] || 'info-circle';
                icon.className = `status-icon fas fa-${iconClass}`;
                
                // Set message text
                text.textContent = message;
                
                // Show the status bar
                this.statusBarElement.style.display = 'block';
                
                // Auto-dismiss if enabled
                if (autoDismiss) {
                    this.scheduleStatusBarClear(duration);
                }
                
                this.logger.log(`[UIManager] Status bar updated (${type}):`, message);
            }
            
        } catch (error) {
            this.logger.error('[UIManager] Error showing status bar:', error);
        }
    }
    
    /**
     * Handle and display an error
     * @param {Error|string|Object} error - The error to handle
     * @param {Object} [context={}] - Additional context about the error
     * @param {string} [context.errorId] - Unique error identifier for tracking
     * @param {boolean} [context.showInUI=true] - Whether to show the error in the UI
     * @param {string} [context.source] - Source of the error
     * @returns {Error} The processed error object
     */
    handleError(error, context = {}) {
        const { 
            errorId = `err-${Date.now()}`,
            showInUI = true,
            source = 'ui',
            ...restContext 
        } = context;
        
        let errorMessage;
        let errorObj;
        
        // Normalize the error
        if (error instanceof Error) {
            errorMessage = error.message;
            errorObj = error;
        } else if (typeof error === 'object' && error !== null) {
            errorMessage = error.message || JSON.stringify(error);
            errorObj = new Error(errorMessage);
            Object.assign(errorObj, error);
        } else {
            errorMessage = String(error);
            errorObj = new Error(errorMessage);
        }
        
        // Add error ID to the error object
        errorObj.errorId = errorId;
        
        // Prepare error context for logging
        const errorContext = {
            errorId,
            source,
            showInUI,
            stack: errorObj.stack,
            ...restContext
        };
        
        // Log the error
        this.logger.error(errorMessage, errorContext);
        
        // Show in UI if enabled
        if (showInUI) {
            this.showStatusBar(errorMessage, 'error', {
                autoDismiss: false,
                errorId,
                source,
                context: errorContext
            });
        }
        
        // Pass to error manager if available
        if (this.errorManager) {
            this.errorManager.handleError(errorObj, errorContext);
        } else {
            // Fallback error handling
            console.error(`[${errorId}] ${errorMessage}`, errorContext);
        }
        
        return errorObj;
    }
    
    /**
     * Schedule the status bar to be cleared after a delay
     * @param {number} duration - Delay in milliseconds
     */
    scheduleStatusBarClear(duration) {
        // Clear any existing timeout
        if (this.statusBarTimeout) {
            clearTimeout(this.statusBarTimeout);
        }
        
        // Set new timeout
        this.statusBarTimeout = setTimeout(() => {
            this.clearStatusBar();
        }, duration);
    }
    
    /**
     * Clear the status bar with animation and proper cleanup
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.force=false] - Force immediate hide without animation
     */
    clearStatusBar(options = {}) {
        const { force = false } = options;
        
        if (!this.statusBarElement) {
            this.logger.debug('Status bar element not available for clearing');
            return;
        }
        
        // Clear any pending timeout to prevent race conditions
        this.cancelPendingStatusBarClear();
        
        try {
            if (force) {
                // Immediate hide without animation
                this.statusBarElement.style.display = 'none';
                this.cleanupStatusBarContent();
            } else {
                // Animated fade out
                this.statusBarElement.style.transition = 'opacity 0.3s ease-in-out';
                this.statusBarElement.style.opacity = '0';
                
                // Wait for animation to complete before hiding and cleaning up
                this.statusBarTimeout = setTimeout(() => {
                    this.statusBarElement.style.display = 'none';
                    this.statusBarElement.style.opacity = '1';
                    this.cleanupStatusBarContent();
                    this.statusBarTimeout = null;
                }, 300);
            }
        } catch (error) {
            this.logger.error('Failed to clear status bar', { 
                error: error.message,
                stack: error.stack,
                force
            });
            // Fallback to immediate hide
            if (this.statusBarElement) {
                this.statusBarElement.style.display = 'none';
                this.cleanupStatusBarContent();
            }
        }
    }
    
    /**
     * Clean up status bar content and reset its state
     * @private
     */
    cleanupStatusBarContent() {
        if (!this.statusBarElement) return;
        
        try {
            // Clear text content
            const textElements = this.statusBarElement.querySelectorAll('.status-text, .status-icon');
            textElements.forEach(el => {
                if (el) el.textContent = '';
            });
            
            // Reset classes and attributes
            const content = this.statusBarElement.querySelector('.status-content');
            if (content) {
                content.className = 'status-content';
                content.removeAttribute('title');
                content.removeAttribute('aria-label');
            }
            
            // Reset any inline styles
            this.statusBarElement.style.cssText = '';
            
        } catch (error) {
            this.logger.error('Failed to clean up status bar content', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Cancel any pending status bar clear timeout
     * @private
     */
    cancelPendingStatusBarClear() {
        if (this.statusBarTimeout) {
            clearTimeout(this.statusBarTimeout);
            this.statusBarTimeout = null;
        }
    }
    
    /**
     * Clean up all UI resources and event listeners
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            this.logger.debug('Starting UIManager cleanup');
            
            // Clear any pending timeouts
            this.cancelPendingStatusBarClear();
            
            // Reset status bar
            this.clearStatusBar({ force: true });
            
            // Clean up any active notifications
            if (this.notificationContainer) {
                try {
                    this.notificationContainer.innerHTML = '';
                } catch (error) {
                    this.logger.error('Failed to clean up notifications', { error: error.message });
                }
            }
            
            // Clean up progress indicators
            if (this.progressContainer) {
                try {
                    this.progressContainer.innerHTML = '';
                } catch (error) {
                    this.logger.error('Failed to clean up progress indicators', { error: error.message });
                }
            }
            
            // Reset element references (but don't remove from DOM)
            this.statusBarElement = null;
            this.notificationContainer = null;
            this.progressContainer = null;
            this.tokenStatusElement = null;
            this.connectionStatusElement = null;
            
            this.logger.info('UIManager cleanup completed');
        } catch (error) {
            this.logger.error('Error during UIManager cleanup', { 
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    // Helper methods for different message types
    showInfo(message, options) {
        this.showStatusBar(message, 'info', options);
    }
    
    showSuccess(message, options) {
        this.showStatusBar(message, 'success', options);
    }
    
    showWarning(message, options) {
        this.showStatusBar(message, 'warning', options);
    }
    
    showError(message, options) {
        this.showStatusBar(message, 'error', { ...options, autoDismiss: false });
    }
}

// Export the UIManager class
export { UIManager };

// Create a default UI manager instance for convenience
const defaultUIManager = new UIManager();

// Export as default for backward compatibility
export default defaultUIManager;
