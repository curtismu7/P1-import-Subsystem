/**
 * Modal Component
 * 
 * A reusable modal dialog component with overlay and customizable content.
 * 
 * Features:
 * - Overlay backdrop
 * - Close on escape key
 * - Close on backdrop click
 * - Customizable header, body, and footer
 * - Animation support
 */

import BaseComponent from './base-component.js';
import Button from './button.js';

/**
 * Modal Component
 * 
 * Reusable modal dialog component.
 */
class Modal extends BaseComponent {
    /**
     * Create a new Modal
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal content HTML
     * @param {string} options.size - Modal size ('small', 'medium', 'large')
     * @param {boolean} options.closable - Whether modal can be closed
     * @param {boolean} options.closeOnBackdrop - Whether to close on backdrop click
     * @param {boolean} options.closeOnEscape - Whether to close on escape key
     * @param {Array} options.buttons - Array of button configurations
     * @param {Function} options.onClose - Close handler
     */
    constructor(options = {}) {
        const {
            title = 'Modal',
            content = '',
            size = 'medium',
            closable = true,
            closeOnBackdrop = true,
            closeOnEscape = true,
            buttons = [],
            onClose = null
        } = options;
        
        // Modal template
        const template = `
            <div class="modal-backdrop">
                <div class="modal-dialog modal-${size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">{{title}}</h3>
                            ${closable ? '<button class="modal-close" aria-label="Close">&times;</button>' : ''}
                        </div>
                        <div class="modal-body">
                            {{content}}
                        </div>
                        <div class="modal-footer">
                            <!-- Buttons will be added programmatically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        super({
            tagName: 'div',
            className: 'modal',
            template,
            data: { title, content }
        });
        
        // Modal state
        this.size = size;
        this.closable = closable;
        this.closeOnBackdrop = closeOnBackdrop;
        this.closeOnEscape = closeOnEscape;
        this.buttons = buttons;
        this.onClose = onClose;
        this.visible = false;
        
        // Button components
        this.buttonComponents = [];
        
        // Bind methods
        this._handleBackdropClick = this._handleBackdropClick.bind(this);
        this._handleEscapeKey = this._handleEscapeKey.bind(this);
        this._handleCloseClick = this._handleCloseClick.bind(this);
    }

    /**
     * Show the modal
     * @returns {Modal} This modal for chaining
     */
    show() {
        if (this.visible || this.destroyed) {
            return this;
        }
        
        // Mount to body if not already mounted
        if (!this.mounted) {
            this.mount(document.body);
        }
        
        // Show modal
        this.visible = true;
        this.addClass('show');
        
        // Add event listeners
        this._addEventListeners();
        
        // Focus management
        this._focusModal();
        
        // Prevent body scroll
        document.body.classList.add('modal-open');
        
        return this;
    }

    /**
     * Hide the modal
     * @returns {Modal} This modal for chaining
     */
    hide() {
        if (!this.visible || this.destroyed) {
            return this;
        }
        
        // Hide modal
        this.visible = false;
        this.removeClass('show');
        
        // Remove event listeners
        this._removeEventListeners();
        
        // Restore body scroll
        document.body.classList.remove('modal-open');
        
        // Call close handler
        if (this.onClose) {
            this.onClose();
        }
        
        return this;
    }

    /**
     * Toggle modal visibility
     * @returns {Modal} This modal for chaining
     */
    toggle() {
        return this.visible ? this.hide() : this.show();
    }

    /**
     * Set modal title
     * @param {string} title - New title
     * @returns {Modal} This modal for chaining
     */
    setTitle(title) {
        this.update({ title });
        return this;
    }

    /**
     * Set modal content
     * @param {string} content - New content HTML
     * @returns {Modal} This modal for chaining
     */
    setContent(content) {
        this.update({ content });
        return this;
    }

    /**
     * Add event listeners
     * @private
     */
    _addEventListeners() {
        // Backdrop click
        if (this.closeOnBackdrop) {
            this.addEventListener('click', this._handleBackdropClick);
        }
        
        // Escape key
        if (this.closeOnEscape) {
            document.addEventListener('keydown', this._handleEscapeKey);
        }
        
        // Close button
        if (this.closable) {
            const closeButton = this.element.querySelector('.modal-close');
            if (closeButton) {
                closeButton.addEventListener('click', this._handleCloseClick);
            }
        }
    }

    /**
     * Remove event listeners
     * @private
     */
    _removeEventListeners() {
        // Remove document event listeners
        document.removeEventListener('keydown', this._handleEscapeKey);
        
        // Close button listener is handled by component cleanup
    }

    /**
     * Handle backdrop click
     * @param {Event} event - Click event
     * @private
     */
    _handleBackdropClick(event) {
        if (event.target === this.element.querySelector('.modal-backdrop')) {
            this.hide();
        }
    }

    /**
     * Handle escape key
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleEscapeKey(event) {
        if (event.key === 'Escape' && this.visible) {
            this.hide();
        }
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
     * Focus the modal
     * @private
     */
    _focusModal() {
        const dialog = this.element.querySelector('.modal-dialog');
        if (dialog) {
            dialog.focus();
        }
    }

    /**
     * Called when component is mounted
     */
    onMount() {
        // Create buttons
        this._createButtons();
        
        // Set up ARIA attributes
        this.setAttribute('role', 'dialog');
        this.setAttribute('aria-modal', 'true');
        
        const dialog = this.element.querySelector('.modal-dialog');
        if (dialog) {
            dialog.setAttribute('tabindex', '-1');
        }
    }

    /**
     * Create button components
     * @private
     */
    _createButtons() {
        const footer = this.element.querySelector('.modal-footer');
        if (!footer || this.buttons.length === 0) {
            return;
        }
        
        // Clear existing buttons
        this.buttonComponents.forEach(btn => btn.destroy());
        this.buttonComponents = [];
        footer.innerHTML = '';
        
        // Create new buttons
        this.buttons.forEach((buttonConfig, index) => {
            const button = new Button({
                text: buttonConfig.text || 'Button',
                variant: buttonConfig.variant || 'secondary',
                onClick: buttonConfig.onClick || (() => this.hide())
            });
            
            button.mount(footer);
            this.buttonComponents.push(button);
            this.addChild(`button-${index}`, button);
        });
    }

    /**
     * Called when component is destroyed
     */
    onDestroy() {
        // Hide modal if visible
        if (this.visible) {
            this.hide();
        }
        
        // Clean up button components
        this.buttonComponents.forEach(btn => btn.destroy());
        this.buttonComponents = [];
        
        // Remove document event listeners
        this._removeEventListeners();
    }
}

export default Modal;