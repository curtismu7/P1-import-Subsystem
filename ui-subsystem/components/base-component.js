/**
 * Base Component
 * 
 * Provides a foundation for creating UI components with consistent behavior,
 * event handling, and lifecycle management.
 * 
 * Features:
 * - Component lifecycle
 * - Event handling
 * - State management
 * - Template rendering
 * - CSS class management
 */

/**
 * Base Component
 * 
 * Base class for all UI components.
 */
class BaseComponent {
    /**
     * Create a new BaseComponent
     * @param {Object} options - Configuration options
     * @param {string} options.tagName - HTML tag name for the component
     * @param {string} options.className - CSS class name
     * @param {Object} options.attributes - HTML attributes
     * @param {string} options.template - HTML template
     * @param {Object} options.data - Initial data
     */
    constructor(options = {}) {
        const {
            tagName = 'div',
            className = '',
            attributes = {},
            template = '',
            data = {}
        } = options;
        
        // Component configuration
        this.tagName = tagName;
        this.className = className;
        this.attributes = attributes;
        this.template = template;
        
        // Component state
        this.data = { ...data };
        this.mounted = false;
        this.destroyed = false;
        
        // DOM element
        this.element = null;
        
        // Event listeners
        this.listeners = new Map();
        
        // Child components
        this.children = new Map();
        
        // Initialize component
        this._initialize();
    }

    /**
     * Initialize the component
     * @private
     */
    _initialize() {
        // Create DOM element
        this._createElement();
        
        // Call lifecycle hook
        this.onCreate();
    }

    /**
     * Create DOM element
     * @private
     */
    _createElement() {
        // Create element
        this.element = document.createElement(this.tagName);
        
        // Set class name
        if (this.className) {
            this.element.className = this.className;
        }
        
        // Set attributes
        for (const [key, value] of Object.entries(this.attributes)) {
            this.element.setAttribute(key, value);
        }
        
        // Set initial content
        if (this.template) {
            this.element.innerHTML = this._renderTemplate(this.template, this.data);
        }
    }

    /**
     * Render template with data
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string} Rendered template
     * @private
     */
    _renderTemplate(template, data) {
        let rendered = template;
        
        // Simple template rendering - replace {{key}} with data[key]
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, value || '');
        }
        
        return rendered;
    }

    /**
     * Mount component to DOM
     * @param {HTMLElement} parent - Parent element
     * @returns {BaseComponent} This component for chaining
     */
    mount(parent) {
        if (this.mounted || this.destroyed) {
            return this;
        }
        
        // Append to parent
        if (parent && parent.appendChild) {
            parent.appendChild(this.element);
        }
        
        this.mounted = true;
        
        // Call lifecycle hook
        this.onMount();
        
        return this;
    }

    /**
     * Unmount component from DOM
     * @returns {BaseComponent} This component for chaining
     */
    unmount() {
        if (!this.mounted || this.destroyed) {
            return this;
        }
        
        // Remove from parent
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.mounted = false;
        
        // Call lifecycle hook
        this.onUnmount();
        
        return this;
    }

    /**
     * Destroy component
     * @returns {BaseComponent} This component for chaining
     */
    destroy() {
        if (this.destroyed) {
            return this;
        }
        
        // Unmount if mounted
        if (this.mounted) {
            this.unmount();
        }
        
        // Destroy child components
        for (const child of this.children.values()) {
            if (child && typeof child.destroy === 'function') {
                child.destroy();
            }
        }
        
        // Remove event listeners
        this.removeAllListeners();
        
        // Clear references
        this.element = null;
        this.children.clear();
        this.listeners.clear();
        
        this.destroyed = true;
        
        // Call lifecycle hook
        this.onDestroy();
        
        return this;
    }

    /**
     * Update component data and re-render
     * @param {Object} newData - New data
     * @returns {BaseComponent} This component for chaining
     */
    update(newData = {}) {
        if (this.destroyed) {
            return this;
        }
        
        // Merge new data
        this.data = { ...this.data, ...newData };
        
        // Re-render if template exists
        if (this.template && this.element) {
            this.element.innerHTML = this._renderTemplate(this.template, this.data);
        }
        
        // Call lifecycle hook
        this.onUpdate(newData);
        
        return this;
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {BaseComponent} This component for chaining
     */
    addEventListener(event, handler, options = {}) {
        if (!this.element || this.destroyed) {
            return this;
        }
        
        // Store listener for cleanup
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(handler);
        
        // Add DOM event listener
        this.element.addEventListener(event, handler, options);
        
        return this;
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {BaseComponent} This component for chaining
     */
    removeEventListener(event, handler) {
        if (!this.element || this.destroyed) {
            return this;
        }
        
        // Remove from stored listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(handler);
        }
        
        // Remove DOM event listener
        this.element.removeEventListener(event, handler);
        
        return this;
    }

    /**
     * Remove all event listeners
     * @returns {BaseComponent} This component for chaining
     */
    removeAllListeners() {
        if (!this.element || this.destroyed) {
            return this;
        }
        
        // Remove all stored listeners
        for (const [event, handlers] of this.listeners.entries()) {
            for (const handler of handlers) {
                this.element.removeEventListener(event, handler);
            }
        }
        
        this.listeners.clear();
        
        return this;
    }

    /**
     * Add child component
     * @param {string} name - Child name
     * @param {BaseComponent} component - Child component
     * @returns {BaseComponent} This component for chaining
     */
    addChild(name, component) {
        if (this.destroyed) {
            return this;
        }
        
        this.children.set(name, component);
        
        return this;
    }

    /**
     * Get child component
     * @param {string} name - Child name
     * @returns {BaseComponent|null} Child component
     */
    getChild(name) {
        return this.children.get(name) || null;
    }

    /**
     * Remove child component
     * @param {string} name - Child name
     * @returns {BaseComponent} This component for chaining
     */
    removeChild(name) {
        const child = this.children.get(name);
        
        if (child && typeof child.destroy === 'function') {
            child.destroy();
        }
        
        this.children.delete(name);
        
        return this;
    }

    /**
     * Add CSS class
     * @param {string} className - Class name to add
     * @returns {BaseComponent} This component for chaining
     */
    addClass(className) {
        if (this.element && !this.destroyed) {
            this.element.classList.add(className);
        }
        
        return this;
    }

    /**
     * Remove CSS class
     * @param {string} className - Class name to remove
     * @returns {BaseComponent} This component for chaining
     */
    removeClass(className) {
        if (this.element && !this.destroyed) {
            this.element.classList.remove(className);
        }
        
        return this;
    }

    /**
     * Toggle CSS class
     * @param {string} className - Class name to toggle
     * @returns {BaseComponent} This component for chaining
     */
    toggleClass(className) {
        if (this.element && !this.destroyed) {
            this.element.classList.toggle(className);
        }
        
        return this;
    }

    /**
     * Check if has CSS class
     * @param {string} className - Class name to check
     * @returns {boolean} Whether class exists
     */
    hasClass(className) {
        return this.element && !this.destroyed 
            ? this.element.classList.contains(className)
            : false;
    }

    /**
     * Set attribute
     * @param {string} name - Attribute name
     * @param {string} value - Attribute value
     * @returns {BaseComponent} This component for chaining
     */
    setAttribute(name, value) {
        if (this.element && !this.destroyed) {
            this.element.setAttribute(name, value);
        }
        
        return this;
    }

    /**
     * Get attribute
     * @param {string} name - Attribute name
     * @returns {string|null} Attribute value
     */
    getAttribute(name) {
        return this.element && !this.destroyed 
            ? this.element.getAttribute(name)
            : null;
    }

    /**
     * Remove attribute
     * @param {string} name - Attribute name
     * @returns {BaseComponent} This component for chaining
     */
    removeAttribute(name) {
        if (this.element && !this.destroyed) {
            this.element.removeAttribute(name);
        }
        
        return this;
    }

    // Lifecycle hooks (to be overridden by subclasses)
    
    /**
     * Called when component is created
     */
    onCreate() {
        // Override in subclasses
    }

    /**
     * Called when component is mounted to DOM
     */
    onMount() {
        // Override in subclasses
    }

    /**
     * Called when component is unmounted from DOM
     */
    onUnmount() {
        // Override in subclasses
    }

    /**
     * Called when component data is updated
     * @param {Object} newData - New data that was added
     */
    onUpdate(newData) {
        // Override in subclasses
    }

    /**
     * Called when component is destroyed
     */
    onDestroy() {
        // Override in subclasses
    }
}

export default BaseComponent;