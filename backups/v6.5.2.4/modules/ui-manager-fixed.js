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
import { createSafeLogger } from '../../src/client/utils/safe-logger.js';

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
            level: process.env.LOG_LEVEL || 'INFO',
            defaultMeta: {
                component: 'UIManager',
                instanceId,
                env: process.env.NODE_ENV || 'development'
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
            this.setupEventListeners();
            this.logger.info('UIManager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize UIManager', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Set up DOM element references
     */
    setupElements() {
        try {
            // Main containers
            this.notificationContainer = document.getElementById('notifications');
            this.progressContainer = document.getElementById('progress-container');
            this.tokenStatusElement = document.getElementById('token-status');
            this.connectionStatusElement = document.getElementById('connection-status');
            
            // Create status bar if it doesn't exist
            this.createStatusBar();
            
            this.logger.debug('UI elements initialized');
        } catch (error) {
            this.logger.error('Failed to set up UI elements', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add any global event listeners here
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }
    
    /**
     * Handle global click events
     * @param {Event} event - The click event
     */
    handleGlobalClick(event) {
        // Handle global click events if needed
    }
    
    /**
     * Create a status bar if it doesn't exist
     */
    createStatusBar() {
        try {
            // Check if status bar already exists
            let statusBar = document.getElementById('global-status-bar');
            
            if (!statusBar) {
                // Create status bar element
                statusBar = document.createElement('div');
                statusBar.id = 'global-status-bar';
                statusBar.className = 'global-status-bar';
                statusBar.setAttribute('role', 'status');
                statusBar.setAttribute('aria-live', 'polite');
                statusBar.style.display = 'none';
                
                // Create status content
                const statusContent = document.createElement('div');
                statusContent.className = 'status-content';
                
                // Create status icon
                const statusIcon = document.createElement('i');
                statusIcon.className = 'status-icon fas';
                
                // Create status text
                const statusText = document.createElement('span');
                statusText.className = 'status-text';
                
                // Create close button
                const closeButton = document.createElement('button');
                closeButton.className = 'status-close';
                closeButton.innerHTML = '&times;';
                closeButton.setAttribute('aria-label', 'Close notification');
                closeButton.addEventListener('click', () => this.clearStatusBar());
                
                // Assemble status bar
                statusContent.appendChild(statusIcon);
                statusContent.appendChild(statusText);
                statusContent.appendChild(closeButton);
                statusBar.appendChild(statusContent);
                
                // Add to DOM
                document.body.insertBefore(statusBar, document.body.firstChild);
                
                this.logger.debug('Status bar created');
            }
            
            this.statusBarElement = statusBar;
            
        } catch (error) {
            this.logger.error('Failed to create status bar', { error: error.message });
            throw error;
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
        
        // Ensure status bar exists
        if (!this.statusBarElement) {
            this.createStatusBar();
            
            // If still no status bar after creation, log and return
            if (!this.statusBarElement) {
                this.logger.error('Failed to create status bar');
                return;
            }
        }
        
        try {
            // Get status bar elements
            const statusBar = this.statusBarElement;
            const statusText = statusBar.querySelector('.status-text');
            const statusIcon = statusBar.querySelector('.status-icon');
            
            if (!statusText || !statusIcon) {
                this.logger.error('Status bar elements not found');
                return;
            }
            
            // Set message and type
            statusText.textContent = message;
            
            // Clear previous classes
            statusBar.className = 'global-status-bar';
            statusIcon.className = 'status-icon fas';
            
            // Set type-specific styling and icon
            switch (type) {
                case 'success':
                    statusBar.classList.add('success');
                    statusIcon.classList.add('fa-check-circle');
                    this.logger.info(`SUCCESS: ${message}`, { type, duration, ...context });
                    break;
                    
                case 'error':
                    statusBar.classList.add('error');
                    statusIcon.classList.add('fa-exclamation-circle');
                    this.logger.error(message, { type, duration, errorId, ...context });
                    break;
                    
                case 'warning':
                case 'warn':
                    statusBar.classList.add('warning');
                    statusIcon.classList.add('fa-exclamation-triangle');
                    this.logger.warn(message, { type, duration, ...context });
                    break;
                    
                case 'info':
                default:
                    statusBar.classList.add('info');
                    statusIcon.classList.add('fa-info-circle');
                    this.logger.info(message, { type, duration, ...context });
            }
            
            // Show the status bar with animation
            statusBar.classList.add('visible', 'slide-in');
            statusBar.style.display = 'flex';
            
            // Auto-dismiss if enabled
            if (autoDismiss) {
                this.scheduleStatusBarClear(duration);
            }
            
            // Log the status update
            this.logger.debug(`Status bar updated: ${type}`, {
                message,
                type,
                duration,
                autoDismiss,
                errorId,
                source,
                ...context
            });
            
        } catch (error) {
            this.logger.error('Error showing status bar:', error, { message, type, ...options });
        }
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
            if (this.statusBarElement) {
                this.clearStatusBar();
            }
            this.statusBarTimeout = null;
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
                    if (this.statusBarElement) {
                        this.statusBarElement.style.display = 'none';
                        this.statusBarElement.style.opacity = '1';
                        this.cleanupStatusBarContent();
                    }
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
    showInfo(message, options = {}) {
        this.showStatusBar(message, 'info', options);
    }
    
    showSuccess(message, options = {}) {
        this.showStatusBar(message, 'success', options);
    }
    
    showWarning(message, options = {}) {
        this.showStatusBar(message, 'warning', options);
    }
    
    showError(message, options = {}) {
        this.showStatusBar(message, 'error', { ...options, autoDismiss: false });
    }
}

// Export the UIManager class
export { UIManager };
