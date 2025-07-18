/**
 * Button Component
 * 
 * A reusable button component with various styles and states.
 * 
 * Features:
 * - Multiple button variants
 * - Loading state
 * - Disabled state
 * - Icon support
 * - Click handling
 */

import BaseComponent from './base-component.js';

/**
 * Button Component
 * 
 * Reusable button component.
 */
class Button extends BaseComponent {
    /**
     * Create a new Button
     * @param {Object} options - Configuration options
     * @param {string} options.text - Button text
     * @param {string} options.variant - Button variant ('primary', 'secondary', 'danger', 'success')
     * @param {string} options.size - Button size ('small', 'medium', 'large')
     * @param {string} options.icon - Icon class name
     * @param {boolean} options.disabled - Whether button is disabled
     * @param {boolean} options.loading - Whether button is in loading state
     * @param {Function} options.onClick - Click handler
     */
    constructor(options = {}) {
        const {
            text = 'Button',
            variant = 'primary',
            size = 'medium',
            icon = '',
            disabled = false,
            loading = false,
            onClick = null
        } = options;
        
        // Button template
        const template = `
            <span class="button-content">
                ${icon ? `<i class="button-icon ${icon}"></i>` : ''}
                <span class="button-text">{{text}}</span>
                <span class="button-spinner" style="display: none;">
                    <i class="spinner"></i>
                </span>
            </span>
        `;
        
        super({
            tagName: 'button',
            className: `btn btn-${variant} btn-${size}`,
            attributes: {
                type: 'button'
            },
            template,
            data: { text }
        });
        
        // Button state
        this.variant = variant;
        this.size = size;
        this.icon = icon;
        this.disabled = disabled;
        this.loading = loading;
        this.onClick = onClick;
        
        // Apply initial state
        this._updateState();
    }

    /**
     * Update button state
     * @private
     */
    _updateState() {
        if (!this.element) return;
        
        // Update disabled state
        if (this.disabled || this.loading) {
            this.element.disabled = true;
            this.addClass('disabled');
        } else {
            this.element.disabled = false;
            this.removeClass('disabled');
        }
        
        // Update loading state
        const spinner = this.element.querySelector('.button-spinner');
        const text = this.element.querySelector('.button-text');
        const icon = this.element.querySelector('.button-icon');
        
        if (this.loading) {
            this.addClass('loading');
            if (spinner) spinner.style.display = 'inline-block';
            if (text) text.style.display = 'none';
            if (icon) icon.style.display = 'none';
        } else {
            this.removeClass('loading');
            if (spinner) spinner.style.display = 'none';
            if (text) text.style.display = 'inline';
            if (icon) icon.style.display = 'inline';
        }
    }

    /**
     * Set button text
     * @param {string} text - New button text
     * @returns {Button} This button for chaining
     */
    setText(text) {
        this.update({ text });
        return this;
    }

    /**
     * Set button variant
     * @param {string} variant - New button variant
     * @returns {Button} This button for chaining
     */
    setVariant(variant) {
        // Remove old variant class
        this.removeClass(`btn-${this.variant}`);
        
        // Add new variant class
        this.variant = variant;
        this.addClass(`btn-${this.variant}`);
        
        return this;
    }

    /**
     * Set button size
     * @param {string} size - New button size
     * @returns {Button} This button for chaining
     */
    setSize(size) {
        // Remove old size class
        this.removeClass(`btn-${this.size}`);
        
        // Add new size class
        this.size = size;
        this.addClass(`btn-${this.size}`);
        
        return this;
    }

    /**
     * Set disabled state
     * @param {boolean} disabled - Whether button should be disabled
     * @returns {Button} This button for chaining
     */
    setDisabled(disabled) {
        this.disabled = disabled;
        this._updateState();
        return this;
    }

    /**
     * Set loading state
     * @param {boolean} loading - Whether button should be in loading state
     * @returns {Button} This button for chaining
     */
    setLoading(loading) {
        this.loading = loading;
        this._updateState();
        return this;
    }

    /**
     * Set click handler
     * @param {Function} handler - Click handler function
     * @returns {Button} This button for chaining
     */
    setOnClick(handler) {
        // Remove old handler
        if (this.onClick) {
            this.removeEventListener('click', this.onClick);
        }
        
        // Add new handler
        this.onClick = handler;
        if (this.onClick) {
            this.addEventListener('click', this.onClick);
        }
        
        return this;
    }

    /**
     * Called when component is mounted
     */
    onMount() {
        // Add click handler if provided
        if (this.onClick) {
            this.addEventListener('click', this.onClick);
        }
        
        // Add keyboard support
        this.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!this.disabled && !this.loading && this.onClick) {
                    this.onClick(event);
                }
            }
        });
    }
}

export default Button;