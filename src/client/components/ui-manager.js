// File: ui-manager.js
// Description: UI management for PingOne user import tool
// 
// This module handles all user interface interactions and state management:
// - Status notifications and user feedback
// - Progress tracking and real-time updates
// - View transitions and navigation
// - Debug logging and error display
// - Connection status indicators
// - Form handling and validation feedback
// 
// Provides a centralized interface for updating the UI based on application events.

import { createCircularProgress } from '../../../public/js/modules/circular-progress.js';
import { ElementRegistry } from '../../../public/js/modules/element-registry.js';
import progressManager from '../../../public/js/modules/progress-manager.js';
import { ErrorTypes } from '../../../public/js/modules/error/error-types.js';

// Enable debug mode for development (set to false in production)
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * UI Manager Class
 * 
 * Manages all user interface interactions and updates with centralized error handling.
 */
class UIManager {
    /**
     * Create a new UIManager instance
     * @param {Object} options - Configuration options
     * @param {Object} options.errorManager - Error manager instance
     * @param {Object} options.logger - Logger instance
     */
    constructor({ errorManager, logger } = {}) {
        // Initialize logger from provided logger or fallback to console
        this.logger = logger ? logger.child({ component: 'UIManager' }) : console;
        
        // Initialize error manager
        this.errorManager = errorManager || {
            handleError: (error, context) => {
                (window.logger?.error || console.error)('Unhandled error (no error manager):', error, context);
            }
        };
        
        // Initialize UI elements
        this.notificationContainer = null;
        this.progressContainer = null;
        this.statusBarElement = null;
        this.tokenStatusElement = null;
        this.connectionStatusElement = null;
        
        // Initialize the UI manager
        this.initialize();
    }
    
    /**
     * Initialize UI manager and setup core functionality
     */
    /**
     * Initialize the UI Manager
     * @private
     */
    initialize() {
        try {
            this.setupElements();
            this.logger.info('UI Manager initialized successfully');
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'initialize',
                severity: 'error',
                context: { 
                    message: 'Failed to initialize UI Manager',
                    error: error.message 
                }
            });
        }
    }
    
    /**
     * Initialize UI manager (alias for initialize for compatibility)
     * @returns {Promise<void>} Promise that resolves when initialization is complete
     */
    async init() {
        this.initialize();
        return Promise.resolve();
    }
    
    /**
 * 🛡️ BULLETPROOF UI ELEMENTS SETUP - MAXIMUM ROBUSTNESS
 * This method is designed to NEVER fail and always provide working progress containers
 * Last Enhanced: 2025-07-30 - Added dynamic container creation and comprehensive validation
 */
setupElements() {
    try {
        this.logger.debug('🔧 Starting bulletproof UI elements setup...');
        
        // Initialize core UI elements with safe fallbacks
        this.notificationContainer = this._safeGetElement(() => ElementRegistry.notificationContainer?.(), 'notification container');
        this.statusBarElement = this._safeGetElement(() => ElementRegistry.statusBar?.(), 'global status bar');
        this.tokenStatusElement = this._safeGetElement(() => ElementRegistry.tokenStatus?.(), 'token status element');
        this.connectionStatusElement = this._safeGetElement(() => ElementRegistry.connectionStatus?.(), 'connection status element');
        
        // 🛡️ BULLETPROOF PROGRESS CONTAINER SYSTEM
        this.progressContainer = this._getBulletproofProgressContainer();
        
        // Setup navigation items with fallback
        this.navItems = document.querySelectorAll('[data-view]') || [];
        
        // 🔍 COMPREHENSIVE VALIDATION
        this._validateProgressContainer();
        
        // 📊 DETAILED LOGGING
        this.logger.debug('✅ Bulletproof UI elements setup completed', {
            hasNotificationContainer: !!this.notificationContainer,
            hasStatusBarElement: !!this.statusBarElement,
            hasProgressContainer: !!this.progressContainer,
            progressContainerId: this.progressContainer?.id || 'dynamic-created',
            progressContainerValid: this._isProgressContainerValid(),
            hasTokenStatusElement: !!this.tokenStatusElement,
            hasConnectionStatusElement: !!this.connectionStatusElement,
            navItemsCount: this.navItems ? this.navItems.length : 0
        });
        
    } catch (error) {
        this.logger.error('🚨 Critical error in UI elements setup - applying emergency fallbacks', { error: error.message });
        this._applyEmergencyFallbacks();
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
     */
    /**
     * Show a status message in the status bar
     * @param {string} message - The message to display
     * @param {string} [type='info'] - Message type (info, success, warning, error)
     * @param {Object} [options] - Additional options
     * @param {number} [options.duration=5000] - Duration in milliseconds to show the message
     * @param {boolean} [options.autoDismiss=true] - Whether to auto-dismiss the message
     * @param {string} [options.errorId] - Unique error ID for tracking
     * @param {Object} [options.context] - Additional context for the message
     */
    showStatusBar(message, type = 'info', options = {}) {
        const { 
            duration = 5000, 
            autoDismiss = true,
            errorId,
            context = {}
        } = options;
        
        try {
            // Log the status message with appropriate level
            const logLevel = {
                info: 'info',
                success: 'info',
                warning: 'warn',
                error: 'error'
            }[type] || 'log';
            
            // Create log context
            const logContext = {
                messageType: type,
                ...(errorId && { errorId }),
                ...context
            };
            
            // Log the message with context
            this.logger[logLevel](`Status: ${message}`, logContext);
            
            // If status bar element is not available, just log and return
            if (!this.statusBarElement) {
                this.logger.debug('Status bar element not available in current view', logContext);
                return;
            }
            
            // Clear any existing timers
            if (this.statusBarTimer) {
                clearTimeout(this.statusBarTimer);
                this.statusBarTimer = null;
            }
            
            // Clear existing content using Safe DOM
            const safeDOM = window.safeDOM || new SafeDOM(this.logger);
            const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
            const UI_CONFIG = window.UI_CONFIG || { CLASSES: { ERROR: 'error', SUCCESS: 'success' } };
            
            safeDOM.setHTML(this.statusBarElement, '');
            
            // Create message element using Safe DOM
            const msg = document.createElement('span');
            safeDOM.addClass(msg, 'status-message');
            
            // Add error ID to the message if available
            let displayMessage = message;
            if (type === UI_CONFIG.CLASSES.ERROR && errorId) {
                displayMessage += ` (Error ID: ${errorId})`;
                
                // In development, show more context for errors
                if (process.env.NODE_ENV === 'development' && Object.keys(context).length > 0) {
                    displayMessage += `\n${JSON.stringify(context, null, 2)}`;
                }
            }
            
            safeDOM.setText(msg, displayMessage);
            this.statusBarElement.appendChild(msg);
            
            // Add dismiss button for error/warning (persistent messages)
            if (type === UI_CONFIG.CLASSES.ERROR || type === 'warning') {
                const dismiss = document.createElement('button');
                safeDOM.addClass(dismiss, 'status-dismiss');
                safeDOM.setHTML(dismiss, '&times;');
                dismiss.setAttribute('aria-label', 'Dismiss message');
                
                // Use error handler to wrap the event handler
                dismiss.onclick = errorHandler.wrapEventHandler(
                    () => this.clearStatusBar(),
                    'Status bar dismiss button click'
                );
                
                this.statusBarElement.appendChild(dismiss);
            }
            
            // Set status bar classes
            this.statusBarElement.className = `status-bar status-bar-${type} visible`;
            
            // Auto-dismiss for success/info messages or if explicitly enabled
            const shouldAutoDismiss = autoDismiss && (type === 'success' || type === 'info');
            if (shouldAutoDismiss) {
                this.statusBarTimer = setTimeout(() => {
                    this.clearStatusBar();
                }, duration);
            }
            
        } catch (error) {
            // If there's an error showing the status bar, report it but don't crash
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'showStatusBar',
                severity: 'warning',
                context: {
                    originalMessage: message,
                    type,
                    options,
                    errorMessage: error.message
                }
            });
            
            // Fallback to console if the error manager fails
            (window.logger?.error || console.error)('Failed to show status bar:', error);
            (window.logger?.debug || console.log)('Original message:', message);
            
            // Try to show a simplified error message
            try {
                if (this.statusBarElement) {
                    this.statusBarElement.textContent = `Error: ${message.substring(0, 100)}`;
                    this.statusBarElement.className = 'status-bar status-bar-error visible';
                }
            } catch (e) {
                // If we can't even show the error message, just give up
                (window.logger?.error || console.error)('Completely failed to show status bar:', e);
            }
        }
    }
    
    /**
     * Clear the status bar with smooth animation
     * @param {Object} [options] - Additional options
     * @param {boolean} [options.force=false] - Force clear without animation
     */
    clearStatusBar(options = {}) {
        try {
            // Clear any pending auto-dismiss timers
            if (this.statusBarTimer) {
                clearTimeout(this.statusBarTimer);
                this.statusBarTimer = null;
            }
            
            // If status bar element doesn't exist, just return
            if (!this.statusBarElement) {
                this.logger.debug('Status bar element not found during clear');
                return;
            }
            
            const { force = false } = options;
            
            const safeDOM = window.safeDOM || new SafeDOM(this.logger);
            const UI_CONFIG = window.UI_CONFIG || { TIMEOUTS: { ANIMATION: 300 } };
            
            if (force) {
                // Immediate removal using Safe DOM
                safeDOM.setHTML(this.statusBarElement, '');
                this.statusBarElement.className = 'status-bar';
                this.logger.debug('Status bar cleared immediately');
            } else {
                // Animate out using Safe DOM
                safeDOM.removeClass(this.statusBarElement, 'visible');
                
                // Remove the element after animation completes
                setTimeout(() => {
                    if (this.statusBarElement) {
                        safeDOM.setHTML(this.statusBarElement, '');
                        this.statusBarElement.className = 'status-bar';
                    }
                }, UI_CONFIG.TIMEOUTS?.ANIMATION || 300); // Use config constant for timeout
                
                this.logger.debug('Status bar cleared with animation');
            }
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'clearStatusBar',
                severity: 'warning',
                context: {
                    options,
                    errorMessage: error.message
                }
            });
            
            // Fallback to direct DOM manipulation if possible
            try {
                if (this.statusBarElement) {
                    this.statusBarElement.innerHTML = '';
                    this.statusBarElement.className = 'status-bar';
                }
            } catch (e) {
                (window.logger?.error || console.error)('Failed to clear status bar:', e);
            }
        }
    }
    
    /**
     * Show a success message
     * @param {string} message - The success message to display
     * @param {Object} [details] - Additional details to log
     */
    showSuccess(message, details = {}) {
        this.showStatusBar(message, 'success');
        this.logger.info('Success message shown', { message, ...details });
    }

    /**
     * Show a warning message
     * @param {string} message - The warning message to display
     * @param {Object} [details] - Additional details to log
     */
    showWarning(message, details = {}) {
        this.showStatusBar(message, 'warning');
        this.logger.warn('Warning message shown', { message, ...details });
    }
    
    /**
     * Show an info message
     * @param {string} message - The info message to display
     * @param {Object} [details] - Additional details to log
     */
    showInfo(message, details = {}) {
        this.showStatusBar(message, 'info');
    }
    /**
     * Show an error message to the user
     * @param {string|Error} error - Error title, message, or Error object
     * @param {string|Object} [details] - Additional error details or options object
     * @param {Object} [options] - Additional options
     * @param {string} [options.errorId] - Unique error ID for tracking
     * @param {Object} [options.context] - Additional context for the error
     * @param {boolean} [options.reportToServer=true] - Whether to report the error to the server
     * @param {string} [options.operation] - The operation that failed
     * @param {string} [options.component] - The component where the error occurred
     */
    showError(error, details = {}, options = {}) {
        // Handle different parameter patterns
        let errorMessage, errorObj, errorContext;
        
        if (error instanceof Error) {
            // First parameter is an Error object
            errorObj = error;
            errorMessage = error.message;
            errorContext = typeof details === 'object' && details !== null ? details : {};
        } else if (typeof error === 'string' && details instanceof Error) {
            // First is title, second is Error object
            errorObj = details;
            errorMessage = `${error}: ${details.message}`;
            errorContext = {};
        } else if (typeof error === 'string' && typeof details === 'string') {
            // Both are strings (title and message)
            errorMessage = `${error}: ${details}`;
            errorObj = new Error(errorMessage);
            errorObj.name = error;
            errorContext = {};
        } else if (typeof error === 'string') {
            // First is message, second is options
            errorMessage = error;
            errorObj = new Error(errorMessage);
            errorContext = typeof details === 'object' && details !== null ? details : {};
        } else {
            // Invalid parameters
            const invalidError = new Error('Invalid parameters passed to showError');
            this.errorManager.handleError(invalidError, {
                component: 'UIManager',
                operation: 'showError',
                severity: 'error',
                context: {
                    error,
                    details,
                    options
                }
            });
            return;
        }
            
            // Merge contexts
            const mergedContext = {
                ...errorContext,
                ...options.context
            };
            
            // Report the error through the error manager
            if (options.reportToServer !== false) {
                this.errorManager.handleError(errorObj, {
                    component: options.component || 'UIManager',
                    operation: options.operation || 'showError',
                    severity: 'error',
                    context: mergedContext
                });
            }
            
            // Show the error in the UI
            this.showStatusBar(errorMessage, 'error', {
                autoDismiss: false,
                errorId: options.errorId,
                context: mergedContext,
                ...options
            });
            
            // Log the error with additional context
            this.logger.error('Error message shown', {
                error: errorMessage,
                name: errorObj.name,
                stack: errorObj.stack,
                ...mergedContext
            });
            
        } catch (error) {
            // If there's an error in the error handler, log to console
            (window.logger?.error || console.error)('Error in showError:', error);
            
            // Try to show a basic error message
            try {
                const fallbackMessage = 'An error occurred';
                this.showStatusBar(fallbackMessage, 'error', {
                    autoDismiss: false,
                    context: { 
                        originalError: error instanceof Error ? error.message : String(error),
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (e) {
                // If we can't even show the error message, just give up
                (window.logger?.error || console.error)('Completely failed to show error:', e);
            }
        }

    /**
     * Hide loading indicator dand optionally show success message
     * @param {string} successMessage - Optional success message to show after hiding loading
     */
    hideLoading(successMessage = null) {
        this.clearStatusBar();
        
        if (successMessage) {
            this.showSuccess(successMessage);
        }
        
        this.logger.debug('Loading indicator hidden');
    }
    
    /**
     * Update progress bar with current and total values
     * @param {number} current - Current progress value
     * @param {number} total - Total progress value
     * @param {string} message - Progress message
     */
    updateProgress(current, total, message = '') {
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() called with:', { current, total, message });
        
        if (!this.progressContainer) {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found in updateProgress');
            this.logger.warn('Progress container not found');
            return;
        }
        
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container found, calculating percentage...');
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Calculated percentage:', percentage);
        
        // Initialize utilities for safe DOM operations
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                PROGRESS_BAR_FILL: '.progress-bar-fill',
                PROGRESS_PERCENTAGE: '.progress-percentage',
                PROGRESS_TEXT: '.progress-text'
            }
        };
        
        // BULLETPROOF: Update progress bar using Safe DOM with graceful fallback
        const progressBar = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_BAR_FILL, this.progressContainer);
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar element:', progressBar);
        if (progressBar) {
            try {
                progressBar.style.width = `${percentage}%`;
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar updated to:', `${percentage}%`);
            } catch (error) {
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar update failed:', error.message);
            }
        } else {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar element not found - container may not be fully initialized');
        }
        
        // BULLETPROOF: Update percentage text using Safe DOM with graceful fallback
        const percentageElement = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_PERCENTAGE, this.progressContainer);
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage element:', percentageElement);
        if (percentageElement) {
            try {
                safeDOM.setText(percentageElement, `${percentage}%`);
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage text updated to:', `${percentage}%`);
            } catch (error) {
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage text update failed:', error.message);
            }
        } else {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage element not found - container may not be fully initialized');
        }
        
        // BULLETPROOF: Update progress text using Safe DOM with graceful fallback
        const progressText = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_TEXT, this.progressContainer);
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text element:', progressText);
        if (progressText && message) {
            try {
                safeDOM.setText(progressText, message);
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text updated to:', message);
            } catch (error) {
                (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text update failed:', error.message);
            }
        } else if (!progressText) {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text element not found - container may not be fully initialized');
        } else {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text element found but no message provided');
        }
        
        this.logger.debug('Progress updated', { current, total, percentage, message });
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() completed');
    }
    /**
     * Update token status display
     * @param {string} status - Token status (valid, expired, etc.)
     * @param {string} message - Status message
     */
    updateTokenStatus(status, message = '') {
        if (!this.tokenStatusElement) {
            this.logger.warn('Token status element not found');
            return;
        }
        
        this.tokenStatusElement.className = `token-status ${status}`;
        this.tokenStatusElement.textContent = message || status;
        
        this.logger.debug('Token status updated', { status, message });
    }
    
    /**
     * Update connection status display
     * @param {string} status - Connection status (connected, disconnected, etc.)
     * @param {string} message - Status message
     */
    updateConnectionStatus(status, message = '') {
        if (!this.connectionStatusElement) {
            this.logger.warn('Connection status element not found');
            return;
        }
        
        this.connectionStatusElement.className = `connection-status ${status}`;
        this.connectionStatusElement.textContent = message || status;
        
        this.logger.debug('Connection status updated', { status, message });
    }
    
    /**
     * Show current token status with detailed information
     * @param {Object} tokenInfo - Token information object
     */
    showCurrentTokenStatus(tokenInfo) {
        if (!tokenInfo) {
            this.logger.warn('No token info provided');
            return;
        }
        
        const { isValid, expiresAt, timeRemaining } = tokenInfo;
        
        if (!isValid) {
            this.updateTokenStatus('expired', '');
            return;
        }
        
        const timeRemainingText = timeRemaining ? ` (${timeRemaining})` : '';
        this.updateTokenStatus('valid', `Token valid${timeRemainingText}`);
        
        this.logger.info('Current token status displayed', { 
            isValid, 
            expiresAt, 
            timeRemaining 
        });
    }
    
    /**
     * Update universal token status bar
     * @param {Object} tokenInfo - Token information object
     */
    updateUniversalTokenStatus(tokenInfo) {
        // Redirect to token-status-indicator instead of universal-token-status
        const tokenStatusBar = document.getElementById('token-status-indicator');
        if (!tokenStatusBar) {
            this.logger.warn('Token status indicator not found');
            return;
        }
        
        if (!tokenInfo) {
            tokenStatusBar.style.display = 'none';
            return;
        }
        
        const { isValid, expiresAt, timeRemaining } = tokenInfo;
        const statusContent = tokenStatusBar.querySelector('.token-status-content');
        
        if (statusContent) {
            const icon = statusContent.querySelector('.token-status-icon');
            const text = statusContent.querySelector('.token-status-text');
            const time = statusContent.querySelector('.token-status-time');
            
            if (isValid) {
                icon.textContent = '✅';
                text.textContent = 'Token valid';
                time.textContent = timeRemaining || '';
            } else {
                icon.textContent = '❌';
                text.textContent = '';
                text.style.visibility = 'hidden';
                time.textContent = '';
            }
        }
        
        tokenStatusBar.style.display = 'block';
        this.logger.debug('Token status indicator updated', { isValid, timeRemaining });
    }
    
    /**
     * Update home page token status
     * @param {boolean} isLoading - Whether to show loading state
     * @param {string} message - Status message
     */
    updateHomeTokenStatus(isLoading = false, message = '') {
        const homeTokenStatus = document.getElementById('home-token-status');
        if (!homeTokenStatus) {
            (window.logger?.error || console.log)('❌ home-token-status element not found!');
            return;
        }
        (window.logger?.debug || console.log)('✅ Found home-token-status element:', homeTokenStatus);

        // Check current token status to determine button color
        let hasValidToken = false;
        let buttonClass = 'btn-danger'; // Default to red
        let buttonText = 'Get New Token';
        
        try {
            // First check for stashed token in localStorage
            hasValidToken = this.checkForStashedToken();
            
            // If no stashed token, check PingOne client
            if (!hasValidToken && window.app && window.app.pingOneClient) {
                const tokenInfo = window.app.pingOneClient.getCurrentTokenTimeRemaining();
                if (tokenInfo && tokenInfo.token && !tokenInfo.isExpired) {
                    hasValidToken = true;
                }
            }
            
            // Set button appearance based on token status
            if (hasValidToken) {
                buttonClass = 'btn-success'; // Green when token is valid
                buttonText = 'Token Valid';
            }
        } catch (error) {
            (window.logger?.error || console.log)('Error checking token status:', error);
        }

        // Move to bottom of sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && homeTokenStatus.parentNode !== sidebar) {
            sidebar.appendChild(homeTokenStatus);
            (window.logger?.debug || console.log)('✅ Moved home-token-status to bottom of sidebar');
        }

        // Add debug label to home-token-status container (red, above box)
        if (!document.getElementById('debug-home-token-status-label')) {
            const debugLabel = document.createElement('div');
            debugLabel.id = 'debug-home-token-status-label';
            debugLabel.style.cssText = `
                position: absolute !important;
                top: -30px !important;
                left: 0 !important;
                background: #ff0000 !important;
                color: #ffffff !important;
                padding: 4px 8px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                border: 2px solid #000 !important;
                z-index: 9999 !important;
                white-space: nowrap !important;
                pointer-events: none !important;
            `;
            debugLabel.textContent = 'DEBUG: home-token-status CONTAINER';
            
            // Ensure container has relative positioning
            homeTokenStatus.style.cssText = `
                position: relative !important;
                background: #ffffcc !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 6px !important;
                padding: 2px !important;
                width: fit-content !important;
                height: auto !important;
                display: block !important;
                overflow: visible !important;
                margin-top: auto !important;
            `;
            
            homeTokenStatus.appendChild(debugLabel);
            (window.logger?.debug || console.log)('✅ Added debug label to home-token-status container');
        }

        if (isLoading) {
            homeTokenStatus.innerHTML = '';
        } else {
            // Use the provided token-status-indicator markup with dynamic button color and enhanced styling
            homeTokenStatus.innerHTML = `
                <div id="token-status-indicator" class="token-status-indicator valid" role="status" aria-live="polite" style="display: block !important; padding: 0 !important; margin: 0 !important; background: none !important; border: none !important;">
                    <button id="get-token-btn" class="btn ${buttonClass}" style="font-size: 14px !important; padding: 8px 16px !important; margin: 0 !important; font-weight: 500 !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; transition: all 0.2s ease !important;">
                        <i class="fas fa-key"></i> ${buttonText}
                    </button>
                </div>
            `;
            // Wire up the button to call getNewToken if available
            const getTokenBtn = document.getElementById('get-token-btn');
            if (getTokenBtn) {
                getTokenBtn.addEventListener('click', () => {
                    if (window.tokenStatusIndicator && typeof window.tokenStatusIndicator.getNewToken === 'function') {
                        window.tokenStatusIndicator.getNewToken();
                    } else if (typeof this.getNewToken === 'function') {
                        this.getNewToken();
                    } else {
                        // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
// alert('Get New Token functionality is not available.');
                    }
                });
            }
        }
        
        homeTokenStatus.style.display = 'block';
        this.logger.debug('Home token status updated', { isLoading, message, hasValidToken, buttonClass });
    }

    /**
     * Check for stashed token in localStorage
     * @returns {boolean} True if valid token is found
     */
    checkForStashedToken() {
        try {
            if (typeof localStorage === 'undefined') {
                return false;
            }
            
            const token = localStorage.getItem('pingone_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return false;
            }
            
            const expiryTime = parseInt(expiry, 10);
            const now = Date.now();
            
            // Check if token is expired (with 5 minute buffer)
            if (isNaN(expiryTime) || now >= expiryTime - (5 * 60 * 1000)) {
                return false;
            }
            
            return true;
        } catch (error) {
            (window.logger?.error || console.error)('Error checking for stashed token:', error);
            return false;
        }
    }
    
    /**
     * Update settings save status with message and type
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, warning, info)
     */
    updateSettingsSaveStatus(message, type = 'info') {
        const settingsStatus = document.querySelector('.settings-save-status');
        if (!settingsStatus) {
            this.logger.warn('Settings save status element not found');
            return;
        }
        
        // Update classes
        settingsStatus.className = `settings-save-status ${type} show`;
        
        // Create simple HTML structure with text on the left, icon on the right
        const iconClass = this.getStatusIcon(type);
        settingsStatus.innerHTML = `
            <span>${message}</span>
            <i class="fas ${iconClass}"></i>
        `;
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                settingsStatus.classList.remove('show');
            }, 3000);
        }
        
        this.logger.info('Settings save status updated', { message, type });
    }
    
    /**
     * Show settings action status with enhanced options
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, warning, info)
     * @param {Object} options - Additional display options
     * @param {boolean} options.autoDismiss - Whether to auto-dismiss
     * @param {number} options.duration - Duration before auto-dismiss
     */
    showSettingsActionStatus(message, type = 'info', options = {}) {
        const settingsActionStatus = document.getElementById('settings-action-status');
        if (!settingsActionStatus) {
            this.logger.warn('Settings action status element not found');
            return;
        }
        
        // Clear existing content
        settingsActionStatus.innerHTML = '';
        settingsActionStatus.className = `settings-action-status ${type}`;
        
        // Create status content
        const statusContent = document.createElement('div');
        statusContent.className = 'status-content';
        
        const text = document.createElement('span');
        text.textContent = message;
        statusContent.appendChild(text);
        
        const icon = document.createElement('i');
        icon.className = `fas ${this.getStatusIcon(type)}`;
        statusContent.appendChild(icon);
        
        settingsActionStatus.appendChild(statusContent);
        settingsActionStatus.style.display = 'block';
        
        // No auto-dismiss for any type
        this.logger.info('Settings action status shown', { message, type, autoDismiss: false });
    }
    
    /**
     * Get appropriate icon class for status type
     * @param {string} type - Status type
     * @returns {string} Icon class name
     */
    getStatusIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Hide settings action status
     */
    hideSettingsActionStatus() {
        const settingsActionStatus = document.getElementById('settings-action-status');
        if (settingsActionStatus) {
            settingsActionStatus.style.display = 'none';
            this.logger.debug('Settings action status hidden');
        }
    }
    
    /**
     * Show import status with operation details
     * @param {string} status - Import status
     * @param {string} message - Status message
     * @param {Object} details - Additional details
     */
    showImportStatus(status, message = '', details = {}) {
        const importStatus = document.getElementById('import-status');
        if (!importStatus) {
            this.logger.warn('Import status element not found');
            return;
        }
        
        importStatus.style.display = 'block';
        importStatus.className = `import-status ${status}`;
        
        const statusText = importStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message || status;
        }
        
        this.logger.info('Import status shown', { status, message, details });
    }
    
    /**
     * Clear all notifications from the UI
     */
    clearNotifications() {
        if (this.notificationContainer) {
            this.notificationContainer.innerHTML = '';
            this.logger.debug('All notifications cleared');
        }
        
        this.clearStatusBar();
    }
    
    /**
     * Hide progress display
     */
    hideProgress() {
        if (this.progressContainer) {
            const safeDOM = window.safeDOM || new SafeDOM(this.logger);
            safeDOM.hide(this.progressContainer);
            this.logger.debug('Progress display hidden');
        }
    }
    
    /**
     * Show progress section with enhanced debugging and fallback mechanisms
     */
    showProgress() {
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] showProgress() called');
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] this.progressContainer:', this.progressContainer);
        
        // Try multiple ways to get the progress container
        let progressContainer = this.progressContainer;
        
        if (!progressContainer) {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found in UI manager, trying direct access...');
            progressContainer = document.getElementById('progress-container');
        }
        
        if (!progressContainer) {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found by ID, trying ElementRegistry...');
            if (typeof ElementRegistry !== 'undefined' && ElementRegistry.progressContainer) {
                progressContainer = ElementRegistry.progressContainer();
            }
        }
        
        if (!progressContainer) {
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found by ElementRegistry, trying class selector...');
            progressContainer = document.querySelector('.progress-container');
        }
        
        if (!progressContainer) {
            (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Progress container not found by any method');
            (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Available containers with "progress" in ID:', 
                Array.from(document.querySelectorAll('[id*="progress"]')).map(el => el.id));
            (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Available containers with "progress" in class:', 
                Array.from(document.querySelectorAll('[class*="progress"]')).map(el => ({ id: el.id, className: el.className })));
            return;
        }
        
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container found, showing...');
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Current display style:', progressContainer.style.display);
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Current visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');
        
        // Force show the progress container
        progressContainer.style.display = 'block';
        progressContainer.style.visibility = 'visible';
        progressContainer.style.opacity = '1';
        
        // Ensure it's not hidden by CSS
        progressContainer.classList.remove('hidden', 'd-none');
        progressContainer.classList.add('visible');
        
        // Force layout recalculation
        progressContainer.offsetHeight;
        
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Display style after setting to block:', progressContainer.style.display);
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Container visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Container dimensions:', {
            offsetWidth: progressContainer.offsetWidth,
            offsetHeight: progressContainer.offsetHeight,
            clientWidth: progressContainer.clientWidth,
            clientHeight: progressContainer.clientHeight
        });
        
        // Scroll into view if needed
        if (progressContainer.offsetParent !== null) {
            progressContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Update UI manager's reference
        this.progressContainer = progressContainer;
        
        this.logger.debug('Progress display shown');
        
        // Additional verification
        setTimeout(() => {
            const isVisible = progressContainer.offsetParent !== null;
            const rect = progressContainer.getBoundingClientRect();
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Final verification:', {
                isVisible,
                dimensions: { width: rect.width, height: rect.height },
                display: progressContainer.style.display,
                computedDisplay: window.getComputedStyle(progressContainer).display
            });
        }, 100);
    }
    
    /**
     * Set button loading state
     * @param {string} buttonId - Button element ID
     * @param {boolean} isLoading - Whether to show loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) {
            // Don't log warning for buttons that are intentionally hidden or optional
            if (buttonId === 'get-token-quick') {
                this.logger.debug(`Button with ID '${buttonId}' not found (may be hidden)`);
            } else {
                this.logger.warn(`Button with ID '${buttonId}' not found`);
            }
            return;
        }
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            button.classList.remove('loading');
        }
        
        this.logger.debug('Button loading state updated', { buttonId, isLoading });
    }
    
    /**
     * Update population dropdown fields with available populations
     * @param {Array} populations - Array of population objects
     */
    updatePopulationFields(populations) {
        if (!populations || !Array.isArray(populations)) {
            this.logger.warn('Invalid populations data provided');
            return;
        }
        
        const populationSelects = document.querySelectorAll('select[id*="population"]');
        
        populationSelects.forEach(select => {
            // Store current selection
            const currentValue = select.value;
            
            // Clear existing options
            select.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select a population...';
            select.appendChild(defaultOption);
            
            // Add population options
            populations.forEach(population => {
                const option = document.createElement('option');
                option.value = population.id;
                option.textContent = population.name;
                select.appendChild(option);
            });
            
            // Restore selection if it still exists
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            }
        });
        
        this.logger.info('Population fields updated', { 
            populationCount: populations.length,
            selectCount: populationSelects.length 
        });
    }
    
    /**
     * Show notification with enhanced options
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {Object} options - Additional display options
     * @param {boolean} options.autoDismiss - Whether to auto-dismiss
     * @param {number} options.duration - Duration before auto-dismiss
     */
    showNotification(title, message, type = 'info', options = {}) {
        if (!this.notificationContainer) {
            this.logger.warn('Notification container not found');
            return;
        }
        
        // Clear existing content
        this.notificationContainer.innerHTML = '';
        
        // Create status header content
        const statusContent = document.createElement('div');
        statusContent.className = 'status-content';
        
        // Add icon
        const icon = document.createElement('i');
        icon.className = `fas ${this.getStatusIcon(type)}`;
        statusContent.appendChild(icon);
        
        // Add text
        const text = document.createElement('span');
        if (title && message) {
            text.textContent = `${title}: ${message}`;
        } else {
            text.textContent = title || message;
        }
        statusContent.appendChild(text);
        
        // Add to container
        this.notificationContainer.appendChild(statusContent);
        
        // Auto-dismiss if specified (but keep persistent for success messages)
        const shouldAutoDismiss = options.autoDismiss !== false && type !== 'error' && type !== 'success';
        if (shouldAutoDismiss) {
            const duration = options.duration || 5000;
            setTimeout(() => {
                if (this.notificationContainer && this.notificationContainer.contains(statusContent)) {
                    this.notificationContainer.innerHTML = '';
                }
            }, duration);
        }
        
        this.logger.info('Status header updated', { title, message, type, autoDismiss: shouldAutoDismiss });
    }
    
    /**
     * Update import progress with detailed statistics
     * @param {number} current - Current progress value
     * @param {number} total - Total progress value
     * @param {string} message - Progress message
     * @param {Object} counts - Statistics counts
     * @param {number} counts.processed - Number of processed items
     * @param {number} counts.success - Number of successful items
     * @param {number} counts.failed - Number of failed items
     * @param {number} counts.skipped - Number of skipped items
     * @param {string} populationName - Population name
     * @param {string} populationId - Population ID
     */
    updateImportProgress(current, total, message = '', counts = {}, populationName = '', populationId = '') {
        // Update main progress
        this.updateProgress(current, total, message);
        
        // Update statistics if provided
        if (counts && typeof counts === 'object') {
            Object.entries(counts).forEach(([key, value]) => {
                const statElement = document.querySelector(`.stat-value.${key}`);
                if (statElement) {
                    statElement.textContent = value || 0;
                }
            });
        }
        
        // Update population information if provided
        if (populationName || populationId) {
            const populationElement = document.querySelector('.detail-value.population-info');
            if (populationElement) {
                populationElement.textContent = populationName || populationId || 'Unknown';
            }
        }
        
        this.logger.debug('Import progress updated', { 
            current, 
            total, 
            message, 
            counts, 
            populationName, 
            populationId 
        });
    }
    
    /**
     * Start import operation with progress tracking
     * @param {Object} options - Operation options
     * @param {string} options.operationType - Type of operation
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     * @param {string} options.populationId - Population ID
     */
    startImportOperation(options = {}) {
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] startImportOperation() called with options:', options);
        
        const { operationType, totalUsers, populationName, populationId } = options;
        
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] About to call showProgress()...');
        this.showProgress();
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] showProgress() completed');
        
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] About to call updateProgress()...');
        this.updateProgress(0, totalUsers || 0, 'Starting import operation...');
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() completed');
        
        // Update operation details
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Operation type element:', operationTypeElement);
        if (operationTypeElement) {
            operationTypeElement.textContent = operationType || 'Import';
            (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Operation type updated to:', operationType || 'Import');
        } else {
            (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Operation type element not found');
        }
        
        this.logger.info('Import operation started', { operationType, totalUsers, populationName, populationId });
        (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] startImportOperation() completed');
    }
    
    /**
     * Update import operation with session ID
     * @param {string} sessionId - Session ID for tracking
     */
    updateImportOperationWithSessionId(sessionId) {
        if (!sessionId) {
            this.logger.warn('No session ID provided for import operation');
            return;
        }
        
        const sessionElement = document.querySelector('.detail-value.session-id');
        if (sessionElement) {
            sessionElement.textContent = sessionId;
        }
        
        this.logger.info('Import operation session ID updated', { sessionId });
    }
    
    /**
     * Start export operation with progress tracking
     * @param {Object} options - Operation options
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     */
    startExportOperation(options = {}) {
        const { totalUsers, populationName } = options;
        
        this.showProgress();
        this.updateProgress(0, totalUsers || 0, 'Starting export operation...');
        
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = 'Export';
        }
        
        this.logger.info('Export operation started', { totalUsers, populationName });
    }
    
    /**
     * Start delete operation with progress tracking
     * @param {Object} options - Operation options
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     */
    startDeleteOperation(options = {}) {
        const { totalUsers, populationName } = options;
        
        this.showProgress();
        this.updateProgress(0, totalUsers || 0, 'Starting delete operation...');
        
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = 'Delete';
        }
        
        this.logger.info('Delete operation started', { totalUsers, populationName });
    }
    
    /**
     * Start modify operation with progress tracking
     * @param {Object} options - Operation options
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     */
    startModifyOperation(options = {}) {
        const { totalUsers, populationName } = options;
        
        this.showProgress();
        this.updateProgress(0, totalUsers || 0, 'Starting modify operation...');
        
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = 'Modify';
        }
        
        this.logger.info('Modify operation started', { totalUsers, populationName });
    }
    
    /**
     * Complete operation with results
     * @param {Object} results - Operation results
     * @param {number} results.processed - Number of processed items
     * @param {number} results.success - Number of successful items
     * @param {number} results.failed - Number of failed items
     * @param {number} results.skipped - Number of skipped items
     */
    completeOperation(results = {}) {
        const { processed, success, failed, skipped } = results;
        
        this.updateProgress(processed || 0, processed || 0, 'Operation completed');
        
        // Show completion message
        const message = `Operation completed: ${success || 0} successful, ${failed || 0} failed, ${skipped || 0} skipped`;
        this.showSuccess(message);
        
        // Hide progress after delay
        setTimeout(() => {
            this.hideProgress();
        }, 2000);
        
        this.logger.info('Operation completed', { processed, success, failed, skipped });
    }
    
    /**
     * Handle duplicate users with decision callback
     * @param {Array} duplicates - Array of duplicate user objects
     * @param {Function} onDecision - Callback function for user decision
     */
    handleDuplicateUsers(duplicates, onDecision) {
        if (!duplicates || duplicates.length === 0) {
            this.logger.warn('No duplicates provided for handling');
            return;
        }
        
        const message = `Found ${duplicates.length} duplicate users. How would you like to proceed?`;
        this.showWarning(message);
        
        // In a real implementation, you would show a modal or dialog here
        // For now, we'll just log the decision
        this.logger.info('Duplicate users found', { count: duplicates.length });
        
        if (onDecision && typeof onDecision === 'function') {
            onDecision('skip'); // Default to skip
        }
    }
    
    /**
     * Debug logging for development
     * @param {string} area - Debug area
     * @param {string} message - Debug message
     */
    debugLog(area, message) {
        if (DEBUG_MODE) {
            this.logger.debug(`[${area}] ${message}`);
        }
    }
    
    /**
     * Show status message with type
     * @param {string} type - Message type
     * @param {string} message - Message content
     * @param {string} details - Additional details
     */
    showStatusMessage(type, message, details = '') {
        const fullMessage = details ? `${message}: ${details}` : message;
        this.showNotification('Status Update', fullMessage, type);
    }
    
    /**
     * Show export status
     */
    showExportStatus() {
        this.showProgress();
        this.updateProgress(0, 100, 'Preparing export...');
        this.logger.info('Export status shown');
    }
    
    /**
     * Update export progress
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} message - Progress message
     * @param {Object} counts - Statistics counts
     */
    updateExportProgress(current, total, message, counts = {}) {
        this.updateProgress(current, total, message);
        
        // Update export-specific statistics
        if (counts && typeof counts === 'object') {
            Object.entries(counts).forEach(([key, value]) => {
                const statElement = document.querySelector(`.stat-value.${key}`);
                if (statElement) {
                    statElement.textContent = value || 0;
                }
            });
        }
        
        this.logger.debug('Export progress updated', { current, total, message, counts });
    }
    
    /**
     * Show delete status
     * @param {number} totalUsers - Total number of users
     * @param {string} populationName - Population name
     * @param {string} populationId - Population ID
     */
    showDeleteStatus(totalUsers, populationName, populationId) {
        this.showProgress();
        this.updateProgress(0, totalUsers || 0, 'Preparing delete operation...');
        
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = 'Delete';
        }
        
        this.logger.info('Delete status shown', { totalUsers, populationName, populationId });
    }
    
    /**
     * Update delete progress
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} message - Progress message
     * @param {Object} counts - Statistics counts
     * @param {string} populationName - Population name
     * @param {string} populationId - Population ID
     */
    updateDeleteProgress(current, total, message, counts = {}, populationName = '', populationId = '') {
        this.updateProgress(current, total, message);
        
        // Update delete-specific statistics
        if (counts && typeof counts === 'object') {
            Object.entries(counts).forEach(([key, value]) => {
                const statElement = document.querySelector(`.stat-value.${key}`);
                if (statElement) {
                    statElement.textContent = value || 0;
                }
            });
        }
        
        this.logger.debug('Delete progress updated', { 
            current, 
            total, 
            message, 
            counts, 
            populationName, 
            populationId 
        });
    }
    
    /**
     * Show modify status
     * @param {number} totalUsers - Total number of users
     */
    showModifyStatus(totalUsers) {
        this.showProgress();
        this.updateProgress(0, totalUsers || 0, 'Preparing modify operation...');
        
        const operationTypeElement = document.querySelector('.detail-value.operation-type');
        if (operationTypeElement) {
            operationTypeElement.textContent = 'Modify';
        }
        
        this.logger.info('Modify status shown', { totalUsers });
    }
    
    /**
     * Update modify progress
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} message - Progress message
     * @param {Object} counts - Statistics counts
     */
    updateModifyProgress(current, total, message, counts = {}) {
        this.updateProgress(current, total, message);
        
        // Update modify-specific statistics
        if (counts && typeof counts === 'object') {
            Object.entries(counts).forEach(([key, value]) => {
                const statElement = document.querySelector(`.stat-value.${key}`);
                if (statElement) {
                    statElement.textContent = value || 0;
                }
            });
        }
        
        this.logger.debug('Modify progress updated', { current, total, message, counts });
    }

    /**
     * 🛡️ BULLETPROOF PROGRESS CONTAINER GETTER
     * This method GUARANTEES a working progress container is always available
     * Uses 6-tier fallback system with dynamic creation as last resort
     */
    _getBulletproofProgressContainer() {
        const strategies = [
            // Strategy 1: ElementRegistry (original method)
            () => {
                const container = ElementRegistry.progressContainer?.();
                if (container) {
                    this.logger.debug('✅ Progress container found via ElementRegistry');
                    return container;
                }
                return null;
            },
            
            // Strategy 2: Known container IDs (most reliable)
            () => {
                const knownIds = [
                    'import-progress-container',
                    'export-progress-container',
                    'delete-progress-container',
                    'modify-progress-container',
                    'progress-container'
                ];
                
                for (const id of knownIds) {
                    const container = document.getElementById(id);
                    if (container) {
                        this.logger.debug(`✅ Progress container found by ID: ${id}`);
                        return container;
                    }
                }
                return null;
            },
            
            // Strategy 3: Class selectors (broader search)
            () => {
                const classSelectors = [
                    '.progress-container',
                    '.import-progress',
                    '.export-progress',
                    '.progress-wrapper',
                    '[data-progress-container]'
                ];
                
                for (const selector of classSelectors) {
                    const container = document.querySelector(selector);
                    if (container) {
                        this.logger.debug(`✅ Progress container found by selector: ${selector}`);
                        return container;
                    }
                }
                return null;
            },
            
            // Strategy 4: Search within known parent containers
            () => {
                const parentSelectors = [
                    '#import-section',
                    '#export-section',
                    '.main-content',
                    '.content-area',
                    'main'
                ];
                
                for (const parentSelector of parentSelectors) {
                    const parent = document.querySelector(parentSelector);
                    if (parent) {
                        const container = parent.querySelector('.progress-container, [id*="progress"]');
                        if (container) {
                            this.logger.debug(`✅ Progress container found in parent: ${parentSelector}`);
                            return container;
                        }
                    }
                }
                return null;
            },
            
            // Strategy 5: Find any element with progress-related attributes
            () => {
                const progressElements = document.querySelectorAll('[id*="progress"], [class*="progress"], [data-progress]');
                for (const element of progressElements) {
                    if (element.querySelector('.progress-bar-fill, .progress-percentage, .progress-text')) {
                        this.logger.debug('✅ Progress container found by progress-related attributes');
                        return element;
                    }
                }
                return null;
            },
            
            // Strategy 6: DYNAMIC CREATION (guaranteed success)
            () => {
                this.logger.warn('🔧 No existing progress container found - creating dynamic container');
                return this._createDynamicProgressContainer();
            }
        ];
        
        // Try each strategy until one succeeds
        for (let i = 0; i < strategies.length; i++) {
            try {
                const container = strategies[i]();
                if (container) {
                    this.logger.debug(`🎯 Progress container acquired using strategy ${i + 1}`);
                    return container;
                }
            } catch (error) {
                this.logger.warn(`⚠️ Strategy ${i + 1} failed:`, error.message);
            }
        }
        
        // This should never happen due to dynamic creation, but just in case
        this.logger.error('🚨 CRITICAL: All progress container strategies failed - this should be impossible!');
        return this._createEmergencyProgressContainer();
    }

    /**
     * 🔧 CREATE DYNAMIC PROGRESS CONTAINER
     * Creates a fully functional progress container when none exists
     */
    _createDynamicProgressContainer() {
        try {
            // Create container element
            const container = document.createElement('div');
            container.id = 'ui-manager-dynamic-progress-container';
            container.className = 'progress-container dynamic-created';
            container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 300px;
                display: none;
            `;
            
            // Create progress bar structure
            container.innerHTML = `
                <div class="progress-header">
                    <h3>Progress</h3>
                </div>
                <div class="progress-bar-container" style="background: #f0f0f0; border-radius: 4px; height: 20px; margin: 10px 0;">
                    <div class="progress-bar-fill" style="background: #007bff; height: 100%; border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div class="progress-info">
                    <div class="progress-percentage" style="font-weight: bold; text-align: center;">0%</div>
                    <div class="progress-text" style="margin-top: 5px; font-size: 14px; color: #666;">Initializing...</div>
                </div>
            `;
            
            // Append to body
            document.body.appendChild(container);
            
            this.logger.debug('✅ Dynamic progress container created successfully');
            return container;
            
        } catch (error) {
            this.logger.error('🚨 Failed to create dynamic progress container:', error);
            return this._createEmergencyProgressContainer();
        }
    }

    /**
     * 🚨 EMERGENCY PROGRESS CONTAINER
     * Absolute last resort - creates minimal working container
     */
    _createEmergencyProgressContainer() {
        const container = document.createElement('div');
        container.id = 'emergency-progress-container';
        container.innerHTML = `
            <div class="progress-bar-fill" style="width: 0%;"></div>
            <div class="progress-percentage">0%</div>
            <div class="progress-text">Ready</div>
        `;
        container.style.display = 'none';
        document.body.appendChild(container);
        
        this.logger.warn('🚨 Emergency progress container created');
        return container;
    }

    /**
     * 🔍 VALIDATE PROGRESS CONTAINER
     * Ensures the progress container has all required child elements
     */
    _validateProgressContainer() {
        if (!this.progressContainer) {
            this.logger.error('🚨 Progress container validation failed - container is null');
            return false;
        }
        
        const requiredElements = [
            { selector: '.progress-bar-fill', name: 'progress bar fill' },
            { selector: '.progress-percentage', name: 'progress percentage' },
            { selector: '.progress-text', name: 'progress text' }
        ];
        
        let allValid = true;
        const missingElements = [];
        
        for (const { selector, name } of requiredElements) {
            const element = this.progressContainer.querySelector(selector);
            if (!element) {
                missingElements.push(name);
                allValid = false;
            }
        }
        
        if (!allValid) {
            this.logger.warn('⚠️ Progress container missing elements:', missingElements);
            this._addMissingProgressElements(missingElements);
        } else {
            this.logger.debug('✅ Progress container validation passed');
        }
        
        return allValid;
    }

    /**
     * 🔧 ADD MISSING PROGRESS ELEMENTS
     * Dynamically adds missing progress elements to container
     */
    _addMissingProgressElements(missingElements) {
        try {
            if (missingElements.includes('progress bar fill')) {
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar-fill';
                progressBar.style.cssText = 'width: 0%; height: 20px; background: #007bff; border-radius: 4px; transition: width 0.3s ease;';
                this.progressContainer.appendChild(progressBar);
            }
            
            if (missingElements.includes('progress percentage')) {
                const percentage = document.createElement('div');
                percentage.className = 'progress-percentage';
                percentage.style.cssText = 'font-weight: bold; text-align: center; margin: 5px 0;';
                percentage.textContent = '0%';
                this.progressContainer.appendChild(percentage);
            }
            
            if (missingElements.includes('progress text')) {
                const text = document.createElement('div');
                text.className = 'progress-text';
                text.style.cssText = 'font-size: 14px; color: #666; text-align: center;';
                text.textContent = 'Ready';
                this.progressContainer.appendChild(text);
            }
            
            this.logger.debug('✅ Missing progress elements added successfully');
        } catch (error) {
            this.logger.error('🚨 Failed to add missing progress elements:', error);
        }
    }

    /**
     * 🔍 CHECK IF PROGRESS CONTAINER IS VALID
     */
    _isProgressContainerValid() {
        return this.progressContainer && 
               this.progressContainer.querySelector('.progress-bar-fill') &&
               this.progressContainer.querySelector('.progress-percentage') &&
               this.progressContainer.querySelector('.progress-text');
    }

    /**
     * 🛡️ SAFE ELEMENT GETTER
     * Safely attempts to get an element with error handling
     */
    _safeGetElement(getter, elementName) {
        try {
            const element = getter();
            if (element) {
                this.logger.debug(`✅ ${elementName} found`);
            } else {
                this.logger.debug(`⚠️ ${elementName} not found`);
            }
            return element;
        } catch (error) {
            this.logger.warn(`⚠️ Error getting ${elementName}:`, error.message);
            return null;
        }
    }

    /**
     * 🚨 EMERGENCY FALLBACKS
     * Applied when critical errors occur during setup
     */
    _applyEmergencyFallbacks() {
        try {
            this.logger.warn('🚨 Applying emergency fallbacks...');
            
            // Ensure we have a progress container no matter what
            if (!this.progressContainer) {
                this.progressContainer = this._createEmergencyProgressContainer();
            }
            
            // Ensure we have navigation items array
            if (!this.navItems) {
                this.navItems = [];
            }
            
            this.logger.debug('✅ Emergency fallbacks applied successfully');
        } catch (error) {
            this.logger.error('🚨 CRITICAL: Emergency fallbacks failed:', error);
            // At this point, create absolute minimal fallbacks
            this.progressContainer = document.createElement('div');
            this.navItems = [];
        }
    }
}

// Export the UIManager class
export { UIManager };
