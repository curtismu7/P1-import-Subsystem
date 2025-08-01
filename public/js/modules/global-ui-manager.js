/**
 * Global UI Manager
 * 
 * Manages global UI elements like the status bar, token status, and notifications.
 * Ensures consistent UI state across the application.
 */

export class GlobalUIManager {
    constructor(app) {
        this.app = app;
        this.logger = app.logger || console;
        this.initialized = false;
        this.bundleNumber = 'unknown';
        this.tokenStatus = 'initializing';
    }

    /**
     * Initialize the global UI manager
     */
    async init() {
        if (this.initialized) return;
        
        try {
            this.logger.info('Initializing Global UI Manager...');
            
            // Initialize UI elements
            this.initBundleVersion();
            this.initTokenStatus();
            
            // Show the status bar
            this.showStatusBar();
            
            this.initialized = true;
            this.logger.info('Global UI Manager initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Global UI Manager', error);
            throw error;
        }
    }

    /**
     * Initialize bundle version display
     */
    initBundleVersion() {
        try {
            // Extract bundle number from script tag
            const scriptTag = document.querySelector('script[src*="bundle-"]');
            if (scriptTag) {
                const match = scriptTag.src.match(/bundle-(\d+)\.js/);
                if (match && match[1]) {
                    this.bundleNumber = match[1];
                    const bundleElement = document.getElementById('bundle-number');
                    if (bundleElement) {
                        bundleElement.textContent = this.bundleNumber;
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to initialize bundle version', error);
        }
    }

    /**
     * Initialize token status display
     */
    initTokenStatus() {
        // Set up token status updates
        this.updateTokenStatus('initializing');
        
        // Listen for token status changes
        if (this.app.eventBus) {
            this.app.eventBus.on('token-status-changed', (status) => {
                this.updateTokenStatus(status);
            });
        } else {
            this.logger.warn('Event bus not available for token status updates');
        }
    }

    /**
     * Update token status display
     * @param {string} status - Token status ('valid', 'invalid', 'expiring', 'initializing')
     */
    updateTokenStatus(status) {
        this.tokenStatus = status;
        const tokenElement = document.getElementById('token-status');
        if (!tokenElement) return;

        // Update status text and class
        const statusText = tokenElement.querySelector('.status-text');
        const statusIcon = tokenElement.querySelector('.status-indicator');
        
        if (!statusText || !statusIcon) return;
        
        switch (status) {
            case 'valid':
                tokenElement.className = 'token-status valid';
                statusText.textContent = 'Token: Valid';
                break;
                
            case 'invalid':
                tokenElement.className = 'token-status invalid';
                statusText.textContent = 'Token: Invalid';
                break;
                
            case 'expiring':
                tokenElement.className = 'token-status warning';
                statusText.textContent = 'Token: Expiring Soon';
                break;
                
            case 'initializing':
            default:
                tokenElement.className = 'token-status';
                statusText.textContent = 'Initializing...';
                break;
        }
    }

    /**
     * Show the global status bar
     */
    showStatusBar() {
        const statusBar = document.getElementById('global-status-bar');
        if (statusBar) {
            statusBar.style.display = 'block';
        }
    }

    /**
     * Hide the global status bar
     */
    hideStatusBar() {
        const statusBar = document.getElementById('global-status-bar');
        if (statusBar) {
            statusBar.style.display = 'none';
        }
    }

    /**
     * Show a notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds (0 = don't auto-close)
     */
    showNotification(title, message, type = 'info', duration = 5000) {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            this.logger.warn('Notification area not found');
            return null;
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Set icon based on type
        let icon = 'info-circle';
        switch (type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
        }

        // Build notification HTML
        notification.innerHTML = `
            <i class="fas fa-${icon} notification-icon"></i>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to notification area
        notificationArea.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-close if duration is set
        if (duration > 0) {
            setTimeout(() => this.closeNotification(notification), duration);
        }

        // Add close button handler
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeNotification(notification));
        }

        return notification;
    }

    /**
     * Close a notification
     * @param {HTMLElement} notification - Notification element to close
     */
    closeNotification(notification) {
        if (!notification) return;
        
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, { once: true });
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {string} title - Optional title (default: 'Success')
     */
    showSuccess(message, title = 'Success') {
        return this.showNotification(title, message, 'success');
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {string} title - Optional title (default: 'Error')
     */
    showError(message, title = 'Error') {
        return this.showNotification(title, message, 'error');
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {string} title - Optional title (default: 'Warning')
     */
    showWarning(message, title = 'Warning') {
        return this.showNotification(title, message, 'warning');
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {string} title - Optional title (default: 'Info')
     */
    showInfo(message, title = 'Info') {
        return this.showNotification(title, message, 'info');
    }
}
