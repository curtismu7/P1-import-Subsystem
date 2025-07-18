/**
 * Global Status Manager
 * Manages the global status bar at the top of the screen
 */
class GlobalStatusManager {
    constructor() {
        this.statusBar = null;
        this.currentMessage = null;
        this.autoHideTimer = null;
        this.init();
    }

    /**
     * Initialize the global status manager
     */
    init() {
        this.statusBar = document.getElementById('global-status-bar');
        if (!this.statusBar) {
            console.warn('Global status bar element not found');
            return;
        }

        // Setup close button event listener
        const closeBtn = this.statusBar.querySelector('.status-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        console.log('Global Status Manager initialized');
    }

    /**
     * Show a status message in the global status bar
     * @param {string} message - The message to display
     * @param {string} type - Message type: info, success, warning, error
     * @param {Object} options - Additional options
     * @param {boolean} options.autoHide - Whether to auto-hide the message
     * @param {number} options.duration - Duration in milliseconds before auto-hide
     * @param {string} options.icon - Custom icon class (optional)
     */
    show(message, type = 'info', options = {}) {
        if (!this.statusBar) return;

        const {
            autoHide = true,
            duration = 5000,
            icon = null
        } = options;

        // Clear any existing timers
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }

        // Remove display: none style to allow CSS animations to work
        this.statusBar.style.display = '';

        // Update the status bar content
        const statusText = this.statusBar.querySelector('.status-text');
        const statusIcon = this.statusBar.querySelector('.status-icon');

        if (statusText) {
            statusText.textContent = message;
        }

        if (statusIcon) {
            // Set icon based on type or custom icon
            const iconClass = icon || this.getIconForType(type);
            statusIcon.className = `status-icon ${iconClass}`;
        }

        // Update classes
        this.statusBar.className = `global-status-bar ${type}`;
        this.statusBar.classList.add('show');

        // Store current message
        this.currentMessage = { message, type, options };

        // Auto-hide if enabled
        if (autoHide && duration > 0) {
            this.autoHideTimer = setTimeout(() => {
                this.hide();
            }, duration);
        }

        console.log(`Global status: ${type.toUpperCase()} - ${message}`);
    }

    /**
     * Hide the global status bar
     */
    hide() {
        if (!this.statusBar) return;

        // Clear any existing timers
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }

        // Hide the status bar
        this.statusBar.classList.remove('show');
        
        // Add a small delay before hiding completely to allow animation to complete
        setTimeout(() => {
            if (!this.statusBar.classList.contains('show')) {
                this.statusBar.style.display = 'none';
            }
        }, 300);
        
        this.currentMessage = null;

        console.log('Global status bar hidden');
    }

    /**
     * Get the appropriate icon class for a message type
     * @param {string} type - Message type
     * @returns {string} Icon class
     */
    getIconForType(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show info message
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    info(message, options = {}) {
        this.show(message, 'info', options);
    }

    /**
     * Show success message
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    success(message, options = {}) {
        this.show(message, 'success', options);
    }

    /**
     * Show warning message
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    warning(message, options = {}) {
        this.show(message, 'warning', options);
    }

    /**
     * Show error message
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     */
    error(message, options = {}) {
        this.show(message, 'error', options);
    }

    /**
     * Get current message
     * @returns {Object|null} Current message object or null
     */
    getCurrentMessage() {
        return this.currentMessage;
    }

    /**
     * Check if status bar is visible
     * @returns {boolean} True if visible
     */
    isVisible() {
        return this.statusBar && this.statusBar.classList.contains('show');
    }
}

// Export for use in other modules
window.GlobalStatusManager = GlobalStatusManager; 