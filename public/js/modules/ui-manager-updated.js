/**
 * UI Manager - Updated with Error Handling and Logging Subsystem Integration
 * 
 * This module manages the UI components and interactions for the PingOne Import Tool.
 * It has been updated to use the new Error Handling and Logging Subsystem.
 */

class UIManager {
    /**
     * Create a new UIManager instance
     * @param {ErrorManager} errorManager - The error manager instance
     * @param {LogManager} logManager - The log manager instance
     */
    constructor(errorManager, logManager) {
        // Initialize error handling and logging
        this.errorManager = errorManager;
        this.logger = logManager.getLogger('UIManager');
        this.errorReporter = this.errorManager.getErrorReporter();
        
        // Initialize UI elements
        this.notificationContainer = null;
        this.statusBar = null;
        this.progressContainer = null;
        this.modalContainer = null;
        
        this.logger.debug('UIManager instance created');
    }

    /**
     * Initialize the UI manager
     * @returns {boolean} True if initialization was successful
     */
    initialize() {
        try {
            this.logger.info('Initializing UI Manager');
            this.setupElements();
            this.logger.info('UI Manager initialized successfully');
            return true;
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'initialize'
            });
            return false;
        }
    }

    /**
     * Set up UI elements
     * @private
     */
    setupElements() {
        try {
            this.logger.debug('Setting up UI elements');
            
            // Initialize core UI elements with safe fallbacks
            this.notificationContainer = ElementRegistry.notificationContainer ? ElementRegistry.notificationContainer() : null;
            this.statusBar = ElementRegistry.statusBar ? ElementRegistry.statusBar() : null;
            this.progressContainer = ElementRegistry.progressContainer ? ElementRegistry.progressContainer() : null;
            this.modalContainer = ElementRegistry.modalContainer ? ElementRegistry.modalContainer() : null;
            
            // Validate critical elements
            if (!this.notificationContainer) {
                throw this.errorManager.createError(
                    'Notification container not found',
                    'UI_ELEMENT_NOT_FOUND',
                    { elementType: 'notificationContainer' }
                );
            }
            
            if (!this.statusBar) {
                throw this.errorManager.createError(
                    'Status bar not found',
                    'UI_ELEMENT_NOT_FOUND',
                    { elementType: 'statusBar' }
                );
            }
            
            this.logger.debug('UI elements set up successfully', {
                notificationContainer: !!this.notificationContainer,
                statusBar: !!this.statusBar,
                progressContainer: !!this.progressContainer,
                modalContainer: !!this.modalContainer
            });
        } catch (error) {
            this.logger.error('Failed to set up UI elements', { error });
            throw error; // Re-throw for higher-level handling
        }
    }

    /**
     * Show an error message
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    showError(title, message) {
        try {
            this.logger.debug('Showing error', { title, message });
            
            if (this.errorReporter) {
                // Use the ErrorReporter if available
                this.errorReporter.showNotification(message, {
                    title,
                    type: 'error',
                    autoDismiss: false
                });
            } else {
                // Fallback to status bar if ErrorReporter is not available
                const errorMessage = title && message ? `${title}: ${message}` : title || message;
                this.showStatusBar(errorMessage, 'error', { autoDismiss: false });
            }
            
            this.logger.info('Error displayed to user', { title, message });
        } catch (error) {
            // Last resort error handling
            this.logger.error('Failed to show error message', { 
                error,
                originalTitle: title,
                originalMessage: message
            });
            
            // Try direct DOM manipulation as a last resort
            try {
                const fallbackContainer = document.getElementById('notification-area') || document.body;
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = `${title}: ${message}`;
                fallbackContainer.appendChild(errorDiv);
            } catch (e) {
                // Nothing more we can do
                console.error('Critical UI failure:', e);
            }
        }
    }

    /**
     * Show a status bar message
     * @param {string} message - Status message
     * @param {string} type - Message type (info, success, warning, error)
     * @param {Object} options - Display options
     */
    showStatusBar(message, type = 'info', options = {}) {
        try {
            this.logger.debug('Showing status bar', { message, type, options });
            
            if (!this.statusBar) {
                throw this.errorManager.createError(
                    'Status bar not found',
                    'UI_ELEMENT_NOT_FOUND',
                    { elementType: 'statusBar' }
                );
            }
            
            // Clear existing status
            this.statusBar.innerHTML = '';
            
            // Create status message
            const statusMessage = document.createElement('div');
            statusMessage.className = `status-message ${type}`;
            statusMessage.textContent = message;
            
            // Add close button if not auto-dismiss
            if (!options.autoDismiss) {
                const closeButton = document.createElement('button');
                closeButton.className = 'close-button';
                closeButton.innerHTML = '&times;';
                closeButton.addEventListener('click', () => this.clearStatusBar());
                statusMessage.appendChild(closeButton);
            }
            
            // Add to status bar
            this.statusBar.appendChild(statusMessage);
            this.statusBar.classList.add('visible');
            
            // Auto-dismiss if specified
            if (options.autoDismiss) {
                setTimeout(() => this.clearStatusBar(), options.duration || 5000);
            }
            
            this.logger.info('Status bar message displayed', { message, type });
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'showStatusBar',
                message,
                type,
                options
            });
        }
    }

    /**
     * Clear the status bar
     */
    clearStatusBar() {
        try {
            this.logger.debug('Clearing status bar');
            
            if (!this.statusBar) {
                return;
            }
            
            this.statusBar.innerHTML = '';
            this.statusBar.classList.remove('visible');
            
            this.logger.debug('Status bar cleared');
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'clearStatusBar'
            });
        }
    }

    /**
     * Update progress display
     * @param {number} current - Current progress value
     * @param {number} total - Total progress value
     * @param {string} message - Progress message
     */
    updateProgress(current, total, message = '') {
        try {
            this.logger.debug('Updating progress', { current, total, message });
            
            if (!this.progressContainer) {
                throw this.errorManager.createError(
                    'Progress container not found',
                    'UI_ELEMENT_NOT_FOUND',
                    { elementType: 'progressContainer' }
                );
            }
            
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            
            // Update progress bar
            const progressBar = this.progressContainer.querySelector('.progress-bar-fill');
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            } else {
                this.logger.warn('Progress bar element not found');
            }
            
            // Update percentage text
            const percentageElement = this.progressContainer.querySelector('.progress-percentage');
            if (percentageElement) {
                percentageElement.textContent = `${percentage}%`;
            } else {
                this.logger.warn('Percentage element not found');
            }
            
            // Update progress text
            const progressText = this.progressContainer.querySelector('.progress-text');
            if (progressText && message) {
                progressText.textContent = message;
            } else if (!progressText) {
                this.logger.warn('Progress text element not found');
            }
            
            this.logger.info('Progress updated', { 
                current, 
                total, 
                percentage, 
                message,
                progressBarUpdated: !!progressBar,
                percentageElementUpdated: !!percentageElement,
                progressTextUpdated: !!(progressText && message)
            });
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'updateProgress',
                current,
                total,
                message
            });
        }
    }

    /**
     * Show the progress container
     */
    showProgress() {
        try {
            this.logger.debug('Showing progress container');
            
            // Try multiple ways to get the progress container
            let progressContainer = this.progressContainer;
            
            if (!progressContainer) {
                this.logger.debug('Progress container not found in UI manager, trying direct access');
                progressContainer = document.getElementById('progress-container');
            }
            
            if (!progressContainer) {
                this.logger.debug('Progress container not found by ID, trying ElementRegistry');
                if (typeof ElementRegistry !== 'undefined' && ElementRegistry.progressContainer) {
                    progressContainer = ElementRegistry.progressContainer();
                }
            }
            
            if (!progressContainer) {
                this.logger.debug('Progress container not found by ElementRegistry, trying class selector');
                progressContainer = document.querySelector('.progress-container');
            }
            
            if (!progressContainer) {
                throw this.errorManager.createError(
                    'Progress container not found by any method',
                    'UI_ELEMENT_NOT_FOUND',
                    { 
                        elementType: 'progressContainer',
                        elementsWithProgressInId: Array.from(document.querySelectorAll('[id*="progress"]')).map(el => el.id),
                        elementsWithProgressInClass: Array.from(document.querySelectorAll('[class*="progress"]')).map(el => ({ id: el.id, className: el.className }))
                    }
                );
            }
            
            // Store the found progress container
            this.progressContainer = progressContainer;
            
            // Force show the progress container
            progressContainer.style.display = 'block';
            progressContainer.classList.add('visible');
            
            // Force browser reflow to ensure the transition works
            progressContainer.offsetHeight;
            
            // Verify visibility
            setTimeout(() => {
                const isVisible = progressContainer.offsetParent !== null;
                const rect = progressContainer.getBoundingClientRect();
                
                this.logger.debug('Progress container visibility check', {
                    isVisible,
                    dimensions: { width: rect.width, height: rect.height },
                    display: progressContainer.style.display,
                    classList: progressContainer.className
                });
                
                if (!isVisible) {
                    this.logger.warn('Progress container may not be visible despite being shown');
                }
            }, 100);
            
            this.logger.info('Progress container shown');
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'showProgress'
            });
        }
    }

    /**
     * Hide the progress container
     */
    hideProgress() {
        try {
            this.logger.debug('Hiding progress container');
            
            if (!this.progressContainer) {
                this.logger.warn('Progress container not found, cannot hide');
                return;
            }
            
            this.progressContainer.classList.remove('visible');
            
            // Hide after transition
            setTimeout(() => {
                if (this.progressContainer) {
                    this.progressContainer.style.display = 'none';
                }
            }, 300);
            
            this.logger.info('Progress container hidden');
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'hideProgress'
            });
        }
    }

    /**
     * Start an import operation
     * @param {Object} options - Import options
     * @param {string} options.operationType - Type of operation (Import, Export, Modify, Delete)
     * @param {number} options.totalUsers - Total number of users
     * @param {string} options.populationName - Population name
     * @param {string} options.populationId - Population ID
     * @param {string} options.fileName - File name
     */
    startImportOperation(options = {}) {
        try {
            this.logger.info('Starting import operation', options);
            
            const { operationType, totalUsers, populationName, populationId, fileName } = options;
            
            this.showProgress();
            this.updateProgress(0, totalUsers || 0, 'Starting import operation...');
            
            // Update operation details
            const operationTypeElement = document.querySelector('.detail-value.operation-type');
            if (operationTypeElement) {
                operationTypeElement.textContent = operationType || 'Import';
            } else {
                this.logger.warn('Operation type element not found');
            }
            
            // Update population name
            const populationNameElement = document.querySelector('.detail-value.population-name');
            if (populationNameElement) {
                populationNameElement.textContent = populationName || 'N/A';
            } else {
                this.logger.warn('Population name element not found');
            }
            
            // Update file name
            const fileNameElement = document.querySelector('.detail-value.file-name');
            if (fileNameElement) {
                fileNameElement.textContent = fileName || 'N/A';
            } else {
                this.logger.warn('File name element not found');
            }
            
            this.logger.info('Import operation started', { 
                operationType, 
                totalUsers, 
                populationName, 
                populationId,
                fileName,
                detailsUpdated: {
                    operationType: !!operationTypeElement,
                    populationName: !!populationNameElement,
                    fileName: !!fileNameElement
                }
            });
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'startImportOperation',
                options
            });
        }
    }

    /**
     * Complete an import operation
     * @param {Object} options - Completion options
     * @param {boolean} options.success - Whether the operation was successful
     * @param {string} options.message - Completion message
     * @param {Object} options.stats - Operation statistics
     */
    completeImportOperation(options = {}) {
        try {
            this.logger.info('Completing import operation', options);
            
            const { success, message, stats } = options;
            
            // Update progress to 100%
            this.updateProgress(100, 100, message || (success ? 'Operation completed successfully' : 'Operation failed'));
            
            // Show completion message
            this.showStatusBar(
                message || (success ? 'Operation completed successfully' : 'Operation failed'),
                success ? 'success' : 'error',
                { autoDismiss: success }
            );
            
            // Update statistics if provided
            if (stats) {
                const statsElement = document.querySelector('.operation-stats');
                if (statsElement) {
                    // Clear existing stats
                    statsElement.innerHTML = '';
                    
                    // Add new stats
                    Object.entries(stats).forEach(([key, value]) => {
                        const statItem = document.createElement('div');
                        statItem.className = 'stat-item';
                        statItem.innerHTML = `<span class="stat-label">${key}:</span> <span class="stat-value">${value}</span>`;
                        statsElement.appendChild(statItem);
                    });
                } else {
                    this.logger.warn('Statistics element not found');
                }
            }
            
            // Hide progress after a delay
            setTimeout(() => this.hideProgress(), 3000);
            
            this.logger.info('Import operation completed', { 
                success, 
                message, 
                stats
            });
        } catch (error) {
            this.errorManager.handleError(error, {
                component: 'UIManager',
                operation: 'completeImportOperation',
                options
            });
            
            // Try to hide progress even if there was an error
            try {
                setTimeout(() => this.hideProgress(), 3000);
            } catch (e) {
                // Ignore
            }
        }
    }
}

/**
 * Create a new UIManager with the Error Handling and Logging Subsystem
 * @param {ErrorManager} errorManager - The error manager instance
 * @param {LogManager} logManager - The log manager instance
 * @returns {UIManager} A new UIManager instance
 */
export function createUIManager(errorManager, logManager) {
    return new UIManager(errorManager, logManager);
}

export default UIManager;