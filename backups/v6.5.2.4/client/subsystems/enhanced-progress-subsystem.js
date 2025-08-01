/**
 * Enhanced Progress Subsystem
 * 
 * Modern progress tracking subsystem that handles all types of operations
 * (import, export, delete, modify) with real-time updates and better UI
 */

import { createLogger } from '../utils/browser-logging-service.js';

export class EnhancedProgressSubsystem {
    constructor(logger, uiManager, eventBus, realtimeComm) {
        this.logger = logger || createLogger({
            serviceName: 'enhanced-progress-subsystem',
            enableServer: true
        });
        
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.realtimeComm = realtimeComm;
        
        // Progress state
        this.currentOperation = null;
        this.isActive = false;
        this.startTime = null;
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            errors: []
        };
        
        // UI elements
        this.progressContainer = null;
        this.progressElements = {};
        
        // Operation types
        this.OPERATION_TYPES = {
            IMPORT: 'import',
            EXPORT: 'export',
            DELETE: 'delete',
            MODIFY: 'modify'
        };
        
        this.logger.info('Enhanced Progress Subsystem initialized');
    }
    
    /**
     * Initialize the subsystem
     */
    async init() {
        try {
            this.logger.debug('Initializing Enhanced Progress Subsystem...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            // Initialize progress UI for each operation type
            this.initializeProgressUI();
            
            this.logger.info('Enhanced Progress Subsystem initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Enhanced Progress Subsystem', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for operation events
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
        
        this.eventBus.on('operation:cancelled', (data) => {
            this.cancelOperation(data);
        });
        
        this.logger.debug('Enhanced Progress event listeners set up');
    }
    
    /**
     * Set up real-time listeners
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
            
            this.logger.debug('Enhanced Progress real-time listeners set up');
        }
    }
    
    /**
     * Initialize progress UI for all operation types
     */
    initializeProgressUI() {
        // Find existing progress containers or create them
        Object.values(this.OPERATION_TYPES).forEach(operationType => {
            const containerId = `${operationType}-progress-container`;
            let container = document.getElementById(containerId);
            
            if (!container) {
                container = this.createProgressContainer(operationType);
            }
            
            this.progressElements[operationType] = {
                container: container,
                progressBar: container.querySelector('.progress-bar-fill'),
                percentage: container.querySelector('.progress-percentage'),
                statusMessage: container.querySelector('.status-message'),
                progressText: container.querySelector('.progress-text'),
                statusDetails: container.querySelector('.status-details'),
                stats: {
                    total: container.querySelector('.stat-value.total'),
                    processed: container.querySelector('.stat-value.processed'),
                    success: container.querySelector('.stat-value.success'),
                    failed: container.querySelector('.stat-value.failed'),
                    skipped: container.querySelector('.stat-value.skipped')
                },
                timing: {
                    elapsed: container.querySelector('.elapsed-value'),
                    eta: container.querySelector('.eta-value')
                },
                cancelButton: container.querySelector('.cancel-import-btn, .cancel-export-btn, .cancel-delete-btn, .cancel-modify-btn')
            };
        });
        
        this.logger.debug('Enhanced Progress UI initialized for all operation types');
    }
    
    /**
     * Create progress container for an operation type
     */
    createProgressContainer(operationType) {
        const container = document.createElement('div');
        container.id = `${operationType}-progress-container`;
        container.className = 'progress-container enhanced-progress';
        container.style.display = 'none';
        
        const operationTitle = operationType.charAt(0).toUpperCase() + operationType.slice(1);
        
        container.innerHTML = `
            <div class="progress-section">
                <div class="progress-header">
                    <h3><i class="fas fa-cog fa-spin"></i> ${operationTitle} Progress</h3>
                    <button class="close-progress-btn" type="button" aria-label="Close progress">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="progress-content">
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-bar-fill"></div>
                        </div>
                        <div class="progress-percentage">0%</div>
                    </div>
                    
                    <div class="progress-status">
                        <div class="status-message">Preparing ${operationType}...</div>
                        <div class="progress-text"></div>
                        <div class="status-details"></div>
                    </div>
                    
                    <div class="progress-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total:</span>
                            <span class="stat-value total">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Processed:</span>
                            <span class="stat-value processed">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Success:</span>
                            <span class="stat-value success">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Failed:</span>
                            <span class="stat-value failed">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Skipped:</span>
                            <span class="stat-value skipped">0</span>
                        </div>
                    </div>
                    
                    <div class="progress-timing">
                        <div class="time-elapsed">
                            <i class="fas fa-clock"></i>
                            <span>Elapsed: <span class="elapsed-value">00:00</span></span>
                        </div>
                        <div class="time-remaining">
                            <i class="fas fa-hourglass-half"></i>
                            <span>ETA: <span class="eta-value">Calculating...</span></span>
                        </div>
                    </div>
                    
                    <div class="progress-actions">
                        <button class="btn btn-secondary cancel-${operationType}-btn" type="button">
                            <i class="fas fa-stop"></i> Cancel ${operationTitle}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Find the appropriate view to append to
        const viewContainer = document.getElementById(`${operationType}-view`);
        if (viewContainer) {
            viewContainer.appendChild(container);
        } else {
            // Fallback to body
            document.body.appendChild(container);
        }
        
        // Set up close button
        const closeBtn = container.querySelector('.close-progress-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideProgress(operationType));
        }
        
        // Set up cancel button
        const cancelBtn = container.querySelector(`.cancel-${operationType}-btn`);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.requestCancel(operationType));
        }
        
        return container;
    }
    
    /**
     * Start a new operation
     */
    startOperation(operationType, options = {}) {
        this.currentOperation = operationType;
        this.isActive = true;
        this.startTime = Date.now();
        
        // Reset stats
        this.stats = {
            processed: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            total: options.total || 0,
            errors: []
        };
        
        // Show progress UI
        this.showProgress(operationType);
        
        // Update UI with initial state
        this.updateProgressUI(operationType, {
            message: `Starting ${operationType} operation...`,
            percentage: 0
        });
        
        this.logger.info('🔧 PROGRESS: Operation started', {
            type: operationType,
            total: this.stats.total,
            options
        });
        
        this.eventBus.emit('progress:operation-started', {
            type: operationType,
            stats: this.stats,
            options
        });
    }
    
    /**
     * Update progress
     */
    updateProgress(data) {
        if (!this.isActive || !this.currentOperation) return;
        
        // Update stats
        if (data.processed !== undefined) this.stats.processed = data.processed;
        if (data.successful !== undefined) this.stats.successful = data.successful;
        if (data.failed !== undefined) this.stats.failed = data.failed;
        if (data.skipped !== undefined) this.stats.skipped = data.skipped;
        if (data.total !== undefined) this.stats.total = data.total;
        if (data.error) this.stats.errors.push(data.error);
        
        // Calculate progress percentage
        const percentage = this.stats.total > 0 
            ? Math.round((this.stats.processed / this.stats.total) * 100)
            : 0;
        
        // Calculate timing
        const elapsed = Date.now() - this.startTime;
        const rate = this.stats.processed / (elapsed / 1000); // items per second
        const remaining = this.stats.total - this.stats.processed;
        const eta = rate > 0 ? remaining / rate : 0;
        
        // Update UI
        this.updateProgressUI(this.currentOperation, {
            percentage,
            message: data.message || `Processing ${this.currentOperation}...`,
            progressText: `${this.stats.processed} of ${this.stats.total} processed`,
            elapsed: this.formatTime(elapsed / 1000),
            eta: eta > 0 ? this.formatTime(eta) : 'Calculating...'
        });
        
        this.logger.debug('🔧 PROGRESS: Progress updated', {
            type: this.currentOperation,
            percentage,
            stats: this.stats
        });
        
        this.eventBus.emit('progress:updated', {
            type: this.currentOperation,
            percentage,
            stats: this.stats,
            data
        });
    }
    
    /**
     * Complete operation
     */
    completeOperation(data) {
        if (!this.isActive || !this.currentOperation) return;
        
        const operationType = this.currentOperation;
        const success = this.stats.failed === 0;
        const elapsed = Date.now() - this.startTime;
        
        // Update final stats
        if (data.stats) {
            Object.assign(this.stats, data.stats);
        }
        
        // Update UI with completion state
        this.updateProgressUI(operationType, {
            percentage: 100,
            message: success 
                ? `${operationType.charAt(0).toUpperCase() + operationType.slice(1)} completed successfully!`
                : `${operationType.charAt(0).toUpperCase() + operationType.slice(1)} completed with ${this.stats.failed} errors`,
            progressText: `Completed ${this.stats.processed} items in ${this.formatTime(elapsed / 1000)}`,
            elapsed: this.formatTime(elapsed / 1000),
            eta: 'Complete'
        });
        
        // Auto-hide after delay for successful operations
        if (success) {
            setTimeout(() => this.hideProgress(operationType), 5000);
        }
        
        this.isActive = false;
        
        this.logger.info('🔧 PROGRESS: Operation completed', {
            type: operationType,
            success,
            stats: this.stats,
            duration: elapsed
        });
        
        this.eventBus.emit('progress:operation-completed', {
            type: operationType,
            success,
            stats: this.stats,
            duration: elapsed,
            data
        });
    }
    
    /**
     * Handle operation error
     */
    handleError(error) {
        if (!this.isActive || !this.currentOperation) return;
        
        this.stats.errors.push(error);
        this.stats.failed++;
        
        this.updateProgressUI(this.currentOperation, {
            message: `Error: ${error.message || error.toString()}`,
            statusDetails: `${this.stats.errors.length} error(s) occurred`
        });
        
        this.logger.error('🔧 PROGRESS: Operation error', {
            type: this.currentOperation,
            error: error.message,
            stats: this.stats
        });
        
        this.eventBus.emit('progress:error', {
            type: this.currentOperation,
            error,
            stats: this.stats
        });
    }
    
    /**
     * Cancel operation
     */
    cancelOperation(data) {
        if (!this.isActive || !this.currentOperation) return;
        
        const operationType = this.currentOperation;
        
        this.updateProgressUI(operationType, {
            message: `${operationType.charAt(0).toUpperCase() + operationType.slice(1)} operation cancelled`,
            statusDetails: 'Operation was cancelled by user'
        });
        
        this.isActive = false;
        
        this.logger.info('🔧 PROGRESS: Operation cancelled', {
            type: operationType,
            stats: this.stats
        });
        
        this.eventBus.emit('progress:operation-cancelled', {
            type: operationType,
            stats: this.stats,
            data
        });
        
        // Hide progress after a short delay
        setTimeout(() => this.hideProgress(operationType), 2000);
    }
    
    /**
     * Request operation cancellation
     */
    requestCancel(operationType) {
        this.logger.info('🔧 PROGRESS: Cancel requested', { type: operationType });
        
        // Emit cancel request event
        this.eventBus.emit('operation:cancel-requested', {
            type: operationType
        });
        
        // Update UI to show cancelling state
        this.updateProgressUI(operationType, {
            message: 'Cancelling operation...',
            statusDetails: 'Please wait while the operation is cancelled'
        });
    }
    
    /**
     * Update progress UI elements
     */
    updateProgressUI(operationType, updates) {
        const elements = this.progressElements[operationType];
        if (!elements) return;
        
        // Update progress bar
        if (updates.percentage !== undefined && elements.progressBar) {
            elements.progressBar.style.width = `${updates.percentage}%`;
        }
        
        // Update percentage text
        if (updates.percentage !== undefined && elements.percentage) {
            elements.percentage.textContent = `${updates.percentage}%`;
        }
        
        // Update status message
        if (updates.message && elements.statusMessage) {
            elements.statusMessage.textContent = updates.message;
        }
        
        // Update progress text
        if (updates.progressText && elements.progressText) {
            elements.progressText.textContent = updates.progressText;
        }
        
        // Update status details
        if (updates.statusDetails && elements.statusDetails) {
            elements.statusDetails.textContent = updates.statusDetails;
        }
        
        // Update stats
        if (elements.stats) {
            Object.keys(elements.stats).forEach(key => {
                if (elements.stats[key] && this.stats[key] !== undefined) {
                    elements.stats[key].textContent = this.stats[key];
                }
            });
        }
        
        // Update timing
        if (elements.timing) {
            if (updates.elapsed && elements.timing.elapsed) {
                elements.timing.elapsed.textContent = updates.elapsed;
            }
            if (updates.eta && elements.timing.eta) {
                elements.timing.eta.textContent = updates.eta;
            }
        }
    }
    
    /**
     * Show progress UI
     */
    showProgress(operationType) {
        const elements = this.progressElements[operationType];
        if (elements && elements.container) {
            elements.container.style.display = 'block';
            elements.container.classList.add('active');
        }
        
        this.logger.debug('🔧 PROGRESS: Progress UI shown', { type: operationType });
    }
    
    /**
     * Hide progress UI
     */
    hideProgress(operationType) {
        const elements = this.progressElements[operationType];
        if (elements && elements.container) {
            elements.container.style.display = 'none';
            elements.container.classList.remove('active');
        }
        
        this.logger.debug('🔧 PROGRESS: Progress UI hidden', { type: operationType });
    }
    
    /**
     * Format time in seconds to human readable format
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }
    
    /**
     * Get current progress state
     */
    getState() {
        return {
            currentOperation: this.currentOperation,
            isActive: this.isActive,
            startTime: this.startTime,
            stats: { ...this.stats }
        };
    }
    
    /**
     * Reset progress state
     */
    reset(operationType = null) {
        if (operationType) {
            this.hideProgress(operationType);
        } else {
            // Reset all
            Object.keys(this.progressElements).forEach(type => {
                this.hideProgress(type);
            });
        }
        
        if (!operationType || operationType === this.currentOperation) {
            this.currentOperation = null;
            this.isActive = false;
            this.startTime = null;
            this.stats = {
                processed: 0,
                successful: 0,
                failed: 0,
                skipped: 0,
                total: 0,
                errors: []
            };
        }
        
        this.logger.info('🔧 PROGRESS: Progress reset', { type: operationType || 'all' });
    }
    
    /**
     * Destroy the subsystem
     */
    destroy() {
        // Hide all progress UIs
        Object.keys(this.progressElements).forEach(type => {
            this.hideProgress(type);
        });
        
        // Clean up
        this.isActive = false;
        this.currentOperation = null;
        this.progressElements = {};
        
        this.logger.info('Enhanced Progress Subsystem destroyed');
    }
}

export default EnhancedProgressSubsystem;