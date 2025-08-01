/**
 * Progress Management Subsystem
 * Modern replacement for legacy ProgressManager
 * Handles all progress tracking, UI updates, and real-time communication
 */

export class ProgressSubsystem {
    constructor(logger, uiManager, eventBus, realtimeComm) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.realtimeComm = realtimeComm;

        // Progress state
        this.currentOperation = null;
        this.isActive = false;
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            total: 0,
            errors: []
        };

        // UI elements
        this.progressContainer = null;
        this.progressBar = null;
        this.statusText = null;
        this.detailsContainer = null;

        // Event listeners
        this.setupEventListeners();
        
        this.logger.info('Progress Subsystem initialized');
    }

    /**
     * Initialize the progress subsystem
     */
    async init() {
        try {
            this.initializeProgressElements();
            this.setupRealtimeListeners();
            this.logger.info('Progress Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Progress Subsystem', error);
            throw error;
        }
    }

    /**
     * Initialize progress UI elements
     */
    initializeProgressElements() {
        this.progressContainer = document.getElementById('progress-container');
        this.progressBar = document.querySelector('.progress-bar');
        this.statusText = document.querySelector('.progress-status');
        this.detailsContainer = document.querySelector('.progress-details');

        if (!this.progressContainer) {
            this.logger.warn('Progress container not found, creating dynamic elements');
            this.createProgressElements();
        }
    }

    /**
     * Create progress elements dynamically
     */
    createProgressElements() {
        // Create progress container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'progress-container';
        container.className = 'progress-container';
        container.style.display = 'none';

        container.innerHTML = `
            <div class="progress-header">
                <h3 class="progress-title">Operation Progress</h3>
                <button class="progress-close" aria-label="Close progress">×</button>
            </div>
            <div class="progress-content">
                <div class="progress-bar-container">
                    <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-percentage">0%</div>
                </div>
                <div class="progress-status">Ready</div>
                <div class="progress-details">
                    <div class="progress-stats">
                        <span class="stat-item">Processed: <span class="stat-processed">0</span></span>
                        <span class="stat-item">Successful: <span class="stat-successful">0</span></span>
                        <span class="stat-item">Failed: <span class="stat-failed">0</span></span>
                        <span class="stat-item">Total: <span class="stat-total">0</span></span>
                    </div>
                    <div class="progress-errors" style="display: none;">
                        <h4>Errors:</h4>
                        <ul class="error-list"></ul>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.progressContainer = container;
        this.progressBar = container.querySelector('.progress-bar');
        this.statusText = container.querySelector('.progress-status');
        this.detailsContainer = container.querySelector('.progress-details');

        // Setup close button
        const closeBtn = container.querySelector('.progress-close');
        closeBtn?.addEventListener('click', () => this.hide());
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('operation:started', (data) => {
            this.startOperation(data.type, data.options);
        });

        this.eventBus.on('operation:progress', (data) => {
            this.updateProgress(data);
        });

        this.eventBus.on('operation:completed', (data) => {
            this.completeOperation(data);
        });

        this.eventBus.on('operation:error', (data) => {
            this.handleError(data);
        });
    }

    /**
     * Setup real-time listeners
     */
    setupRealtimeListeners() {
        if (this.realtimeComm) {
            this.realtimeComm.on('progress', (data) => {
                this.updateProgress(data);
            });

            this.realtimeComm.on('operation-complete', (data) => {
                this.completeOperation(data);
            });

            this.realtimeComm.on('operation-error', (data) => {
                this.handleError(data);
            });
        }
    }

    /**
     * Start a new operation
     */
    startOperation(operationType, options = {}) {
        this.currentOperation = operationType;
        this.isActive = true;
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            total: options.total || 0,
            errors: []
        };

        this.show();
        this.updateOperationDetails(options);
        this.updateStatus(`Starting ${operationType} operation...`);
        this.updateProgressBar(0);

        this.logger.info('Operation started', { type: operationType, options });
        this.eventBus.emit('progress:operation-started', { type: operationType, options });
    }

    /**
     * Update progress
     */
    updateProgress(data) {
        if (!this.isActive) return;

        // Update stats
        if (data.processed !== undefined) this.stats.processed = data.processed;
        if (data.successful !== undefined) this.stats.successful = data.successful;
        if (data.failed !== undefined) this.stats.failed = data.failed;
        if (data.total !== undefined) this.stats.total = data.total;
        if (data.error) this.stats.errors.push(data.error);

        // Update UI
        this.updateProgressBar();
        this.updateStatsDisplay();
        
        if (data.message) {
            this.updateStatus(data.message);
        }

        this.logger.debug('Progress updated', { stats: this.stats, message: data.message });
        this.eventBus.emit('progress:updated', { stats: this.stats, data });
    }

    /**
     * Update progress bar
     */
    updateProgressBar(percentage = null) {
        if (!this.progressBar) return;

        let percent = percentage;
        if (percent === null && this.stats.total > 0) {
            percent = Math.round((this.stats.processed / this.stats.total) * 100);
        }
        
        if (percent !== null) {
            const fill = this.progressBar.querySelector('.progress-fill');
            const percentageText = this.progressContainer?.querySelector('.progress-percentage');
            
            if (fill) {
                fill.style.width = `${percent}%`;
            }
            
            if (percentageText) {
                percentageText.textContent = `${percent}%`;
            }

            this.progressBar.setAttribute('aria-valuenow', percent.toString());
        }
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        if (!this.detailsContainer) return;

        const elements = {
            processed: this.detailsContainer.querySelector('.stat-processed'),
            successful: this.detailsContainer.querySelector('.stat-successful'),
            failed: this.detailsContainer.querySelector('.stat-failed'),
            total: this.detailsContainer.querySelector('.stat-total')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = this.stats[key].toString();
            }
        });

        // Update errors display
        if (this.stats.errors.length > 0) {
            this.updateErrorsDisplay();
        }
    }

    /**
     * Update errors display
     */
    updateErrorsDisplay() {
        const errorsContainer = this.detailsContainer?.querySelector('.progress-errors');
        const errorsList = this.detailsContainer?.querySelector('.error-list');

        if (errorsContainer && errorsList) {
            errorsContainer.style.display = 'block';
            errorsList.innerHTML = '';

            this.stats.errors.slice(-5).forEach(error => { // Show last 5 errors
                const li = document.createElement('li');
                li.textContent = error.message || error.toString();
                li.className = 'error-item';
                errorsList.appendChild(li);
            });
        }
    }

    /**
     * Update operation details
     */
    updateOperationDetails(options) {
        const title = this.progressContainer?.querySelector('.progress-title');
        if (title) {
            title.textContent = `${this.currentOperation} Operation Progress`;
        }

        // Update any operation-specific details
        if (options.populationName) {
            this.updateStatus(`Processing population: ${options.populationName}`);
        }
    }

    /**
     * Update status text
     */
    updateStatus(message) {
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        this.logger.debug('Status updated', { message });
    }

    /**
     * Complete operation
     */
    completeOperation(data) {
        this.isActive = false;
        
        const success = this.stats.failed === 0;
        const message = success 
            ? `${this.currentOperation} completed successfully! Processed ${this.stats.processed} items.`
            : `${this.currentOperation} completed with ${this.stats.failed} errors. Processed ${this.stats.processed} items.`;

        this.updateStatus(message);
        this.updateProgressBar(100);

        // Auto-hide after delay for successful operations
        if (success) {
            setTimeout(() => this.hide(), 3000);
        }

        this.logger.info('Operation completed', { 
            type: this.currentOperation, 
            stats: this.stats, 
            success 
        });

        this.eventBus.emit('progress:operation-completed', { 
            type: this.currentOperation, 
            stats: this.stats, 
            success,
            data 
        });
    }

    /**
     * Handle operation error
     */
    handleError(error) {
        this.stats.errors.push(error);
        this.stats.failed++;
        
        this.updateStatsDisplay();
        this.updateStatus(`Error: ${error.message || error.toString()}`);

        this.logger.error('Operation error', error);
        this.eventBus.emit('progress:error', { error, stats: this.stats });
    }

    /**
     * Show progress container
     */
    show() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
            this.progressContainer.classList.add('active');
        }
        this.eventBus.emit('progress:shown');
    }

    /**
     * Hide progress container
     */
    hide() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
            this.progressContainer.classList.remove('active');
        }
        this.isActive = false;
        this.eventBus.emit('progress:hidden');
    }

    /**
     * Reset progress state
     */
    reset() {
        this.currentOperation = null;
        this.isActive = false;
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            total: 0,
            errors: []
        };

        this.updateProgressBar(0);
        this.updateStatsDisplay();
        this.updateStatus('Ready');
        
        this.logger.info('Progress subsystem reset');
        this.eventBus.emit('progress:reset');
    }

    /**
     * Get current progress state
     */
    getState() {
        return {
            currentOperation: this.currentOperation,
            isActive: this.isActive,
            stats: { ...this.stats }
        };
    }

    /**
     * Destroy the progress subsystem
     */
    destroy() {
        this.hide();
        this.isActive = false;
        
        if (this.progressContainer && this.progressContainer.parentNode) {
            this.progressContainer.parentNode.removeChild(this.progressContainer);
        }

        this.logger.info('Progress Subsystem destroyed');
        this.eventBus.emit('progress:destroyed');
    }
}

// Export for ES modules
export default ProgressSubsystem;
