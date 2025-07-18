/**
 * Progress Tracker
 * 
 * Provides functionality for tracking progress of long-running operations.
 * 
 * Features:
 * - Multiple concurrent progress tracking
 * - Progress normalization
 * - Event notifications
 * - Cancelable operations
 * - Persistent progress state
 */

/**
 * Progress Tracker
 * 
 * Tracks progress of long-running operations.
 */
class ProgressTracker {
    /**
     * Create a new ProgressTracker
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {boolean} options.persistent - Whether to persist progress state
     * @param {string} options.storageKey - localStorage key for persistent state
     */
    constructor(options = {}) {
        const { 
            logger, 
            persistent = false,
            storageKey = 'progress_state'
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.persistent = persistent;
        this.storageKey = storageKey;
        
        // Progress state
        this.progressState = new Map();
        
        // Event listeners
        this.listeners = new Map();
        
        // Cancellation tokens
        this.cancellationTokens = new Map();
        
        // Initialize
        this._initialize();
    }

    /**
     * Initialize progress tracker
     * @private
     */
    _initialize() {
        // Load persistent state if enabled
        if (this.persistent) {
            this._loadState();
        }
    }

    /**
     * Start tracking progress for an operation
     * @param {string} id - Operation ID
     * @param {Object} options - Progress options
     * @returns {Object} Progress state
     */
    start(id, options = {}) {
        const {
            total = 100,
            message = 'Starting...',
            autoComplete = false,
            autoCompleteDelay = 500,
            metadata = {}
        } = options;
        
        // Create progress state
        const progressState = {
            id,
            progress: 0,
            total,
            message,
            status: 'running',
            startTime: Date.now(),
            updateTime: Date.now(),
            endTime: null,
            autoComplete,
            autoCompleteDelay,
            metadata
        };
        
        // Store progress state
        this.progressState.set(id, progressState);
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
        
        // Notify listeners
        this._notifyListeners('start', id, progressState);
        
        return progressState;
    }

    /**
     * Update progress for an operation
     * @param {string} id - Operation ID
     * @param {Object} update - Progress update
     * @returns {Object} Updated progress state
     */
    update(id, update = {}) {
        // Get current progress state
        const progressState = this.progressState.get(id);
        
        if (!progressState) {
            this.logger.warn(`Cannot update progress for unknown operation: ${id}`);
            return null;
        }
        
        // Update progress state
        const updatedState = {
            ...progressState,
            ...update,
            updateTime: Date.now()
        };
        
        // Normalize progress
        if (update.progress !== undefined) {
            updatedState.progress = Math.min(Math.max(0, update.progress), updatedState.total);
        }
        
        // Store updated state
        this.progressState.set(id, updatedState);
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
        
        // Notify listeners
        this._notifyListeners('update', id, updatedState);
        
        // Auto-complete if progress is at total
        if (updatedState.autoComplete && updatedState.progress >= updatedState.total) {
            setTimeout(() => {
                this.complete(id, { message: updatedState.message || 'Completed' });
            }, updatedState.autoCompleteDelay);
        }
        
        return updatedState;
    }

    /**
     * Complete an operation
     * @param {string} id - Operation ID
     * @param {Object} options - Completion options
     * @returns {Object} Final progress state
     */
    complete(id, options = {}) {
        // Get current progress state
        const progressState = this.progressState.get(id);
        
        if (!progressState) {
            this.logger.warn(`Cannot complete unknown operation: ${id}`);
            return null;
        }
        
        // Update progress state
        const completedState = {
            ...progressState,
            progress: progressState.total,
            status: 'completed',
            endTime: Date.now(),
            updateTime: Date.now(),
            ...options
        };
        
        // Store updated state
        this.progressState.set(id, completedState);
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
        
        // Notify listeners
        this._notifyListeners('complete', id, completedState);
        
        return completedState;
    }

    /**
     * Fail an operation
     * @param {string} id - Operation ID
     * @param {Object} options - Failure options
     * @returns {Object} Final progress state
     */
    fail(id, options = {}) {
        // Get current progress state
        const progressState = this.progressState.get(id);
        
        if (!progressState) {
            this.logger.warn(`Cannot fail unknown operation: ${id}`);
            return null;
        }
        
        // Update progress state
        const failedState = {
            ...progressState,
            status: 'failed',
            endTime: Date.now(),
            updateTime: Date.now(),
            ...options
        };
        
        // Store updated state
        this.progressState.set(id, failedState);
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
        
        // Notify listeners
        this._notifyListeners('fail', id, failedState);
        
        return failedState;
    }

    /**
     * Cancel an operation
     * @param {string} id - Operation ID
     * @param {Object} options - Cancellation options
     * @returns {Object} Final progress state
     */
    cancel(id, options = {}) {
        // Get current progress state
        const progressState = this.progressState.get(id);
        
        if (!progressState) {
            this.logger.warn(`Cannot cancel unknown operation: ${id}`);
            return null;
        }
        
        // Update progress state
        const cancelledState = {
            ...progressState,
            status: 'cancelled',
            endTime: Date.now(),
            updateTime: Date.now(),
            ...options
        };
        
        // Store updated state
        this.progressState.set(id, cancelledState);
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
        
        // Notify listeners
        this._notifyListeners('cancel', id, cancelledState);
        
        // Execute cancellation token if exists
        const token = this.cancellationTokens.get(id);
        if (token && typeof token === 'function') {
            try {
                token();
            } catch (error) {
                this.logger.error(`Error executing cancellation token for ${id}:`, error.message);
            }
        }
        
        // Remove cancellation token
        this.cancellationTokens.delete(id);
        
        return cancelledState;
    }

    /**
     * Get progress state for an operation
     * @param {string} id - Operation ID
     * @returns {Object} Progress state
     */
    getProgress(id) {
        return this.progressState.get(id) || null;
    }

    /**
     * Get all progress states
     * @returns {Array<Object>} All progress states
     */
    getAllProgress() {
        return Array.from(this.progressState.values());
    }

    /**
     * Get active progress states
     * @returns {Array<Object>} Active progress states
     */
    getActiveProgress() {
        return Array.from(this.progressState.values())
            .filter(state => state.status === 'running');
    }

    /**
     * Clear completed progress states
     */
    clearCompleted() {
        for (const [id, state] of this.progressState.entries()) {
            if (state.status !== 'running') {
                this.progressState.delete(id);
            }
        }
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
    }

    /**
     * Clear all progress states
     */
    clearAll() {
        this.progressState.clear();
        
        // Save state if persistent
        if (this.persistent) {
            this._saveState();
        }
    }

    /**
     * Register a cancellation token for an operation
     * @param {string} id - Operation ID
     * @param {Function} token - Cancellation token function
     */
    registerCancellationToken(id, token) {
        if (typeof token !== 'function') {
            throw new Error('Cancellation token must be a function');
        }
        
        this.cancellationTokens.set(id, token);
    }

    /**
     * Add an event listener
     * @param {string} event - Event name ('start', 'update', 'complete', 'fail', 'cancel', or '*' for all)
     * @param {Function} listener - Listener function
     * @returns {Function} Function to remove the listener
     */
    addEventListener(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(listener);
        
        // Return function to remove listener
        return () => {
            if (this.listeners.has(event)) {
                this.listeners.get(event).delete(listener);
            }
        };
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeEventListeners(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllEventListeners() {
        this.listeners.clear();
    }

    /**
     * Load progress state from localStorage
     * @private
     */
    _loadState() {
        try {
            const storedState = localStorage.getItem(this.storageKey);
            
            if (storedState) {
                const parsedState = JSON.parse(storedState);
                
                // Convert to Map
                this.progressState = new Map(
                    Object.entries(parsedState)
                );
                
                this.logger.debug('Loaded progress state from localStorage');
            }
        } catch (error) {
            this.logger.warn('Failed to load progress state from localStorage:', error.message);
        }
    }

    /**
     * Save progress state to localStorage
     * @private
     */
    _saveState() {
        try {
            // Convert Map to object
            const stateObject = Object.fromEntries(this.progressState);
            
            localStorage.setItem(this.storageKey, JSON.stringify(stateObject));
            
            this.logger.debug('Saved progress state to localStorage');
        } catch (error) {
            this.logger.warn('Failed to save progress state to localStorage:', error.message);
        }
    }

    /**
     * Notify listeners of an event
     * @param {string} event - Event name
     * @param {string} id - Operation ID
     * @param {Object} state - Progress state
     * @private
     */
    _notifyListeners(event, id, state) {
        // Notify specific event listeners
        if (this.listeners.has(event)) {
            for (const listener of this.listeners.get(event)) {
                try {
                    listener(id, state);
                } catch (error) {
                    this.logger.warn(`Error in progress listener for ${event}:`, error.message);
                }
            }
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener(event, id, state);
                } catch (error) {
                    this.logger.warn('Error in global progress listener:', error.message);
                }
            }
        }
    }
}

export default ProgressTracker;