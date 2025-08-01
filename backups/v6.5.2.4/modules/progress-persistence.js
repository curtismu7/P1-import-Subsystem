/**
 * Progress Persistence Module
 * 
 * Provides functionality to store and recover progress state in localStorage
 * to handle page refreshes during long-running operations.
 * 
 * Features:
 * - Store progress state in localStorage
 * - Recover progress state after page refresh
 * - Automatic cleanup of old progress data
 */

class ProgressPersistence {
    constructor() {
        this.storageKey = 'pingone-progress-state';
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Store progress state in localStorage
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     * @param {Object} state - Progress state to store
     */
    storeState(operationType, state) {
        try {
            // Get existing state or create new one
            const existingData = this.getStoredData();
            
            // Update with new state
            existingData[operationType] = {
                ...state,
                timestamp: new Date().toISOString()
            };
            
            // Store back to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            
            console.log(`🔄 [PROGRESS] Stored progress state for ${operationType}`, state);
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to store progress state: ${error.message}`);
        }
    }

    /**
     * Get stored progress state
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     * @returns {Object|null} Stored state or null if not found
     */
    getState(operationType) {
        try {
            const data = this.getStoredData();
            
            if (data[operationType]) {
                // Check if state is still valid (not too old)
                const timestamp = new Date(data[operationType].timestamp).getTime();
                const now = Date.now();
                
                if (now - timestamp > this.maxAge) {
                    // State is too old, remove it
                    this.clearState(operationType);
                    return null;
                }
                
                return data[operationType];
            }
            
            return null;
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to get progress state: ${error.message}`);
            return null;
        }
    }

    /**
     * Clear stored progress state for an operation
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     */
    clearState(operationType) {
        try {
            const data = this.getStoredData();
            
            if (data[operationType]) {
                delete data[operationType];
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                console.log(`🔄 [PROGRESS] Cleared progress state for ${operationType}`);
            }
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to clear progress state: ${error.message}`);
        }
    }

    /**
     * Clear all stored progress states
     */
    clearAllStates() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🔄 [PROGRESS] Cleared all progress states');
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to clear all progress states: ${error.message}`);
        }
    }

    /**
     * Get all stored data
     * @private
     * @returns {Object} All stored data
     */
    getStoredData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to parse stored data: ${error.message}`);
            return {};
        }
    }

    /**
     * Check if there's any stored progress state
     * @returns {boolean} True if there's any stored progress state
     */
    hasStoredState() {
        const data = this.getStoredData();
        return Object.keys(data).length > 0;
    }

    /**
     * Check if there's a stored progress state for an operation
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     * @returns {boolean} True if there's a stored progress state for the operation
     */
    hasState(operationType) {
        return !!this.getState(operationType);
    }

    /**
     * Clean up old progress states
     */
    cleanupOldStates() {
        try {
            const data = this.getStoredData();
            const now = Date.now();
            let changed = false;
            
            Object.keys(data).forEach(key => {
                const timestamp = new Date(data[key].timestamp).getTime();
                if (now - timestamp > this.maxAge) {
                    delete data[key];
                    changed = true;
                }
            });
            
            if (changed) {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                console.log('🔄 [PROGRESS] Cleaned up old progress states');
            }
        } catch (error) {
            console.warn(`⚠️ [PROGRESS] Failed to clean up old progress states: ${error.message}`);
        }
    }
}

// Create and export a singleton instance
const progressPersistence = new ProgressPersistence();
export default progressPersistence;