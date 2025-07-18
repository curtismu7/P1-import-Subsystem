/**
 * Progress Container UI Component
 * 
 * Provides a UI component for displaying progress information.
 * 
 * Features:
 * - Multiple progress bars
 * - Status messages
 * - Cancel buttons
 * - Collapsible details
 */

/**
 * Progress Container
 * 
 * UI component for displaying progress information.
 */
class ProgressContainer {
    /**
     * Create a new ProgressContainer
     * @param {Object} options - Configuration options
     * @param {Object} options.progressTracker - Progress tracker instance
     * @param {string} options.containerId - Container element ID
     * @param {Object} options.templates - HTML templates
     */
    constructor(options = {}) {
        const { 
            progressTracker, 
            containerId = 'progress-container',
            templates = {}
        } = options;
        
        // Store dependencies
        this.progressTracker = progressTracker;
        
        if (!this.progressTracker) {
            throw new Error('Progress tracker is required');
        }
        
        // Container element
        this.containerId = containerId;
        this.container = null;
        
        // Templates
        this.templates = {
            container: `
                <div class="progress-container">
                    <div class="progress-header">
                        <h3>Progress</h3>
                        <button class="progress-minimize-btn">_</button>
                    </div>
                    <div class="progress-items"></div>
                </div>
            `,
            progressItem: `
                <div class="progress-item" data-id="{{id}}">
                    <div class="progress-item-header">
                        <span class="progress-item-title">{{title}}</span>
                        <span class="progress-item-status">{{status}}</span>
                    </div>
                    <div class="progress-item-body">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: {{percent}}%"></div>
                        </div>
                        <div class="progress-item-message">{{message}}</div>
                        <div class="progress-item-actions">
                            {{cancelButton}}
                        </div>
                    </div>
                </div>
            `,
            cancelButton: `
                <button class="progress-cancel-btn" data-id="{{id}}">Cancel</button>
            `,
            ...templates
        };
        
        // Initialize
        this._initialize();
    }

    /**
     * Initialize the progress container
     * @private
     */
    _initialize() {
        // Create container if it doesn't exist
        this._createContainer();
        
        // Add event listeners
        this._addEventListeners();
    }

    /**
     * Create the progress container
     * @private
     */
    _createContainer() {
        // Check if container already exists
        let container = document.getElementById(this.containerId);
        
        if (!container) {
            // Create container
            container = document.createElement('div');
            container.id = this.containerId;
            document.body.appendChild(container);
        }
        
        // Store container
        this.container = container;
        
        // Set initial HTML
        this.container.innerHTML = this.templates.container;
    }

    /**
     * Add event listeners
     * @private
     */
    _addEventListeners() {
        // Add progress tracker event listeners
        this.progressTracker.addEventListener('start', (id, state) => {
            this._renderProgressItem(id, state);
        });
        
        this.progressTracker.addEventListener('update', (id, state) => {
            this._updateProgressItem(id, state);
        });
        
        this.progressTracker.addEventListener('complete', (id, state) => {
            this._updateProgressItem(id, state);
            
            // Auto-remove completed items after delay
            setTimeout(() => {
                this._removeProgressItem(id);
            }, 5000);
        });
        
        this.progressTracker.addEventListener('fail', (id, state) => {
            this._updateProgressItem(id, state);
        });
        
        this.progressTracker.addEventListener('cancel', (id, state) => {
            this._updateProgressItem(id, state);
            
            // Auto-remove cancelled items after delay
            setTimeout(() => {
                this._removeProgressItem(id);
            }, 3000);
        });
        
        // Add UI event listeners
        this.container.addEventListener('click', (event) => {
            // Handle minimize button
            if (event.target.classList.contains('progress-minimize-btn')) {
                this._toggleMinimize();
            }
            
            // Handle cancel button
            if (event.target.classList.contains('progress-cancel-btn')) {
                const id = event.target.dataset.id;
                if (id) {
                    this.progressTracker.cancel(id, { message: 'Cancelled by user' });
                }
            }
        });
    }

    /**
     * Render a progress item
     * @param {string} id - Progress ID
     * @param {Object} state - Progress state
     * @private
     */
    _renderProgressItem(id, state) {
        // Get progress items container
        const itemsContainer = this.container.querySelector('.progress-items');
        
        if (!itemsContainer) {
            return;
        }
        
        // Check if item already exists
        let item = itemsContainer.querySelector(`.progress-item[data-id="${id}"]`);
        
        if (!item) {
            // Create item
            const percent = Math.round((state.progress / state.total) * 100);
            const title = state.metadata.title || id;
            const status = this._formatStatus(state.status);
            const message = state.message || '';
            
            // Create cancel button if operation is running
            const cancelButton = state.status === 'running' 
                ? this.templates.cancelButton.replace(/{{id}}/g, id)
                : '';
            
            // Create item HTML
            const itemHtml = this.templates.progressItem
                .replace(/{{id}}/g, id)
                .replace(/{{title}}/g, title)
                .replace(/{{status}}/g, status)
                .replace(/{{percent}}/g, percent)
                .replace(/{{message}}/g, message)
                .replace(/{{cancelButton}}/g, cancelButton);
            
            // Create item element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemHtml;
            item = tempDiv.firstChild;
            
            // Add to container
            itemsContainer.appendChild(item);
        } else {
            // Update existing item
            this._updateProgressItem(id, state);
        }
        
        // Show container
        this._showContainer();
    }

    /**
     * Update a progress item
     * @param {string} id - Progress ID
     * @param {Object} state - Progress state
     * @private
     */
    _updateProgressItem(id, state) {
        // Get progress item
        const item = this.container.querySelector(`.progress-item[data-id="${id}"]`);
        
        if (!item) {
            return;
        }
        
        // Update progress bar
        const percent = Math.round((state.progress / state.total) * 100);
        const progressBar = item.querySelector('.progress-bar');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        // Update status
        const statusElement = item.querySelector('.progress-item-status');
        
        if (statusElement) {
            statusElement.textContent = this._formatStatus(state.status);
            
            // Update status class
            statusElement.className = 'progress-item-status';
            statusElement.classList.add(`status-${state.status}`);
        }
        
        // Update message
        const messageElement = item.querySelector('.progress-item-message');
        
        if (messageElement) {
            messageElement.textContent = state.message || '';
        }
        
        // Update cancel button
        const actionsElement = item.querySelector('.progress-item-actions');
        
        if (actionsElement) {
            if (state.status === 'running') {
                // Add cancel button if not present
                if (!actionsElement.querySelector('.progress-cancel-btn')) {
                    const cancelButton = this.templates.cancelButton.replace(/{{id}}/g, id);
                    actionsElement.innerHTML = cancelButton;
                }
            } else {
                // Remove cancel button
                actionsElement.innerHTML = '';
            }
        }
        
        // Update item class based on status
        item.className = 'progress-item';
        item.classList.add(`status-${state.status}`);
    }

    /**
     * Remove a progress item
     * @param {string} id - Progress ID
     * @private
     */
    _removeProgressItem(id) {
        // Get progress item
        const item = this.container.querySelector(`.progress-item[data-id="${id}"]`);
        
        if (!item) {
            return;
        }
        
        // Remove item with animation
        item.classList.add('removing');
        
        setTimeout(() => {
            item.remove();
            
            // Hide container if no items left
            const itemsContainer = this.container.querySelector('.progress-items');
            
            if (itemsContainer && !itemsContainer.children.length) {
                this._hideContainer();
            }
        }, 500);
    }

    /**
     * Show the progress container
     * @private
     */
    _showContainer() {
        this.container.classList.remove('hidden');
    }

    /**
     * Hide the progress container
     * @private
     */
    _hideContainer() {
        this.container.classList.add('hidden');
    }

    /**
     * Toggle minimize state
     * @private
     */
    _toggleMinimize() {
        this.container.classList.toggle('minimized');
        
        // Update minimize button text
        const minimizeBtn = this.container.querySelector('.progress-minimize-btn');
        
        if (minimizeBtn) {
            minimizeBtn.textContent = this.container.classList.contains('minimized') ? '+' : '_';
        }
    }

    /**
     * Format status for display
     * @param {string} status - Status value
     * @returns {string} Formatted status
     * @private
     */
    _formatStatus(status) {
        switch (status) {
            case 'running':
                return 'Running';
                
            case 'completed':
                return 'Completed';
                
            case 'failed':
                return 'Failed';
                
            case 'cancelled':
                return 'Cancelled';
                
            default:
                return status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    /**
     * Clear all progress items
     */
    clearAll() {
        // Get progress items container
        const itemsContainer = this.container.querySelector('.progress-items');
        
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
        
        // Hide container
        this._hideContainer();
    }
}

export default ProgressContainer;