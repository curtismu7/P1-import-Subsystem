/**
 * Notification Component
 * 
 * A notification/toast component for displaying messages to users.
 * 
 * Features:
 * - Multiple notification types
 * - Auto-dismiss functionality
 * - Manual dismiss
 * - Animation support
 * - Positioning
 */

import BaseComponent from './base-component.js';

/**
 * Notification Component
 * 
 * Displays notification messages to users.
 */
class Notification extends BaseComponent {
    /**
     * Create a new Notification
     * @param {Object} options - Configuration options
     * @param {string} options.message - Notification message
     * @param {string} options.type - Notification type ('info', 'success', 'warning', 'error')
     * @param {number} options.duration - Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
     * @param {boolean} options.closable - Whether notification can be manually closed
     * @param {string} options.position - Notification position ('top-right', 'top-left', 'bottom-right', 'bottom-left')
     * @param {Function} options.onClose - Close handler
     */
    constructor(options = {}) {
        const {
            message = 'Notification',
            type = 'info',
            duration = 5000,
            closable = true,
            position = 'top-right',
            onClose = null
        } = options;
        
        // Get icon for notification type
        const icon = Notification.getTypeIcon(type);
        
        // Notification template
        const template = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-message">{{message}}</div>
                ${closable ? '<button class="notification-close" aria-label="Close">&times;</button>' : ''}
            </div>
        `;
        
        super({
            tagName: 'div',
            className: `notification notification-${type} notification-${position}`,
            template,
            data: { message }
        });
        
        // Notification state
        this.type = type;
        this.duration = duration;
        this.closable = closable;
        this.position = position;
        this.onClose = onClose;
        this.autoCloseTimer = null;
        
        // Bind methods
        this._handleCloseClick = this._handleCloseClick.bind(this);
    }

    /**
     * Show the notification
     * @returns {Notification} This notification for chaining
     */
    show() {
        if (this.destroyed) {
            return this;
        }
        
        // Mount to notification container or body
        const container = this._getOrCreateContainer();
        this.mount(container);
        
        // Add show class for animation
        setTimeout(() => {
            this.addClass('show');
        }, 10);
        
        // Set up auto-close timer
        if (this.duration > 0) {
            this.autoCloseTimer = setTimeout(() => {
                this.hide();
            }, this.duration);
        }
        
        return this;
    }

    /**
     * Hide the notification
     * @returns {Notification} This notification for chaining
     */
    hide() {
        if (this.destroyed) {
            return this;
        }
        
        // Clear auto-close timer
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
        
        // Add hide animation
        this.addClass('hide');
        
        // Remove after animation
        setTimeout(() => {
            this.destroy();
            
            // Call close handler
            if (this.onClose) {
                this.onClose();
            }
        }, 300);
        
        return this;
    }

    /**
     * Set notification message
     * @param {string} message - New message
     * @returns {Notification} This notification for chaining
     */
    setMessage(message) {
        this.update({ message });
        return this;
    }

    /**
     * Set notification type
     * @param {string} type - New type
     * @returns {Notification} This notification for chaining
     */
    setType(type) {
        // Remove old type class
        this.removeClass(`notification-${this.type}`);
        
        // Add new type class
        this.type = type;
        this.addClass(`notification-${this.type}`);
        
        // Update icon
        const iconElement = this.element.querySelector('.notification-icon i');
        if (iconElement) {
            iconElement.className = Notification.getTypeIcon(type);
        }
        
        return this;
    }

    /**
     * Get or create notification container
     * @returns {HTMLElement} Container element
     * @private
     */
    _getOrCreateContainer() {
        const containerId = `notification-container-${this.position}`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = `notification-container notification-container-${this.position}`;
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Handle close button click
     * @param {Event} event - Click event
     * @private
     */
    _handleCloseClick(event) {
        event.preventDefault();
        this.hide();
    }

    /**
     * Called when component is mounted
     */
    onMount() {
        // Add close button handler
        if (this.closable) {
            const closeButton = this.element.querySelector('.notification-close');
            if (closeButton) {
                closeButton.addEventListener('click', this._handleCloseClick);
            }
        }
        
        // Add hover handlers to pause auto-close
        if (this.duration > 0) {
            this.addEventListener('mouseenter', () => {
                if (this.autoCloseTimer) {
                    clearTimeout(this.autoCloseTimer);
                    this.autoCloseTimer = null;
                }
            });
            
            this.addEventListener('mouseleave', () => {
                if (this.duration > 0 && !this.autoCloseTimer) {
                    this.autoCloseTimer = setTimeout(() => {
                        this.hide();
                    }, this.duration);
                }
            });
        }
    }

    /**
     * Called when component is destroyed
     */
    onDestroy() {
        // Clear auto-close timer
        if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }

    /**
     * Get icon class for notification type
     * @param {string} type - Notification type
     * @returns {string} Icon class
     * @static
     */
    static getTypeIcon(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     * @static
     */
    static show(message, options = {}) {
        const notification = new Notification({
            message,
            ...options
        });
        
        notification.show();
        
        return notification;
    }

    /**
     * Show an info notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     * @static
     */
    static info(message, options = {}) {
        return Notification.show(message, { ...options, type: 'info' });
    }

    /**
     * Show a success notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     * @static
     */
    static success(message, options = {}) {
        return Notification.show(message, { ...options, type: 'success' });
    }

    /**
     * Show a warning notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     * @static
     */
    static warning(message, options = {}) {
        return Notification.show(message, { ...options, type: 'warning' });
    }

    /**
     * Show an error notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     * @static
     */
    static error(message, options = {}) {
        return Notification.show(message, { ...options, type: 'error' });
    }
}

export default Notification;