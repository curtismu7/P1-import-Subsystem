/**
 * Operation Summary Module
 * 
 * Handles the display and management of operation summary pages
 * for import, export, delete, and modify operations.
 */

export class OperationSummary {
    constructor(app) {
        this.app = app;
        this.logger = app.logger.child({ component: 'OperationSummary' });
        this.summaryData = null;
        
        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.updateSummary = this.updateSummary.bind(this);
        this.handleBackToHome = this.handleBackToHome.bind(this);
        this.handleNewOperation = this.handleNewOperation.bind(this);
        this.handleViewDetails = this.handleViewDetails.bind(this);
        this.handleExportResults = this.handleExportResults.bind(this);
        
        // Initialize the module
        this.initialize();
    }
    
    /**
     * Initialize the operation summary module
     */
    initialize() {
        try {
            // Cache DOM elements
            this.elements = {
                container: document.getElementById('operation-summary-view'),
                operationType: document.getElementById('summary-operation-type'),
                timestamp: document.getElementById('summary-timestamp'),
                successCount: document.getElementById('success-count'),
                failureCount: document.getElementById('failure-count'),
                skippedCount: document.getElementById('skipped-count'),
                totalCount: document.getElementById('total-count'),
                operationId: document.getElementById('operation-id'),
                startedAt: document.getElementById('started-at'),
                duration: document.getElementById('duration'),
                populationName: document.getElementById('population-name'),
                backToHomeBtn: document.getElementById('back-to-home'),
                newOperationBtn: document.getElementById('new-operation'),
                viewDetailsBtn: document.getElementById('view-details-btn'),
                exportResultsBtn: document.getElementById('export-results-btn')
            };
            
            // Add event listeners
            this.elements.backToHomeBtn.addEventListener('click', this.handleBackToHome);
            this.elements.newOperationBtn.addEventListener('click', this.handleNewOperation);
            this.elements.viewDetailsBtn.addEventListener('click', this.handleViewDetails);
            this.elements.exportResultsBtn.addEventListener('click', this.handleExportResults);
            
            this.logger.info('Operation Summary module initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Operation Summary module', { error: error.message });
        }
    }
    
    /**
     * Show the operation summary with the provided data
     * @param {Object} data - Operation result data
     * @param {string} operationType - Type of operation (import, export, delete, modify)
     */
    show(data, operationType = 'import') {
        try {
            // Store the summary data
            this.summaryData = this.prepareSummaryData(data, operationType);
            
            // Update the UI with the summary data
            this.updateUI();
            
            // Show the summary view
            this.elements.container.style.display = 'block';
            
            // Hide other views
            this.hideOtherViews();
            
            // Update the URL
            window.history.pushState({ view: 'operation-summary' }, '', '#operation-summary');
            
            this.logger.info('Showing operation summary', { 
                operationType,
                success: this.summaryData.successCount,
                failure: this.summaryData.failureCount,
                skipped: this.summaryData.skippedCount
            });
            
            // Track the operation completion
            this.trackOperationCompletion();
            
        } catch (error) {
            this.logger.error('Failed to show operation summary', { 
                error: error.message,
                operationType,
                data: JSON.stringify(data).substring(0, 200) + '...'
            });
            
            // Fallback to a simple alert if something goes wrong
            alert(`Operation completed with ${data?.successCount || 0} successful, ${data?.failureCount || 0} failed, and ${data?.skippedCount || 0} skipped.`);
        }
    }
    
    /**
     * Hide the operation summary
     */
    hide() {
        this.elements.container.style.display = 'none';
    }
    
    /**
     * Prepare summary data from operation results
     * @param {Object} data - Raw operation result data
     * @param {string} operationType - Type of operation
     * @returns {Object} Formatted summary data
     */
    prepareSummaryData(data, operationType) {
        const now = new Date();
        const startedAt = data.startedAt ? new Date(data.startedAt) : new Date(now.getTime() - (data.duration || 0));
        const durationMs = data.duration || (now.getTime() - startedAt.getTime());
        
        return {
            operationType: this.formatOperationType(operationType),
            timestamp: now,
            startedAt: startedAt,
            duration: durationMs,
            successCount: data.successCount || 0,
            failureCount: data.failureCount || 0,
            skippedCount: data.skippedCount || 0,
            totalCount: (data.successCount || 0) + (data.failureCount || 0) + (data.skippedCount || 0),
            operationId: data.operationId || this.generateOperationId(),
            populationName: data.populationName || 'N/A',
            details: data.details || [],
            metadata: data.metadata || {}
        };
    }
    
    /**
     * Update the UI with the current summary data
     */
    updateUI() {
        if (!this.summaryData) return;
        
        const { 
            operationType, 
            timestamp, 
            successCount, 
            failureCount, 
            skippedCount, 
            totalCount, 
            operationId, 
            startedAt,
            duration,
            populationName 
        } = this.summaryData;
        
        // Update operation type and timestamp
        this.elements.operationType.textContent = operationType;
        this.elements.timestamp.textContent = this.formatTimestamp(timestamp);
        
        // Update counts
        this.elements.successCount.textContent = successCount.toLocaleString();
        this.elements.failureCount.textContent = failureCount.toLocaleString();
        this.elements.skippedCount.textContent = skippedCount.toLocaleString();
        this.elements.totalCount.textContent = totalCount.toLocaleString();
        
        // Update details
        this.elements.operationId.textContent = operationId;
        this.elements.startedAt.textContent = this.formatTimestamp(startedAt, true);
        this.elements.duration.textContent = this.formatDuration(duration);
        this.elements.populationName.textContent = populationName;
        
        // Update button states based on operation type
        this.updateButtonStates();
    }
    
    /**
     * Update button states based on the current operation type
     */
    updateButtonStates() {
        const { operationType, details } = this.summaryData;
        const hasDetails = details && details.length > 0;
        
        // Enable/disable view details button based on whether we have details
        this.elements.viewDetailsBtn.disabled = !hasDetails;
        this.elements.viewDetailsBtn.title = hasDetails 
            ? 'View detailed operation results' 
            : 'No detailed results available';
        
        // Update export button based on operation type
        const canExport = ['import', 'export', 'modify'].includes(operationType.toLowerCase());
        this.elements.exportResultsBtn.disabled = !canExport || !hasDetails;
        this.elements.exportResultsBtn.title = canExport 
            ? (hasDetails ? 'Export detailed results to CSV' : 'No data available to export')
            : 'Export not available for this operation type';
    }
    
    /**
     * Handle back to home button click
     */
    handleBackToHome() {
        this.hide();
        this.app.showView('home');
    }
    
    /**
     * Handle new operation button click
     */
    handleNewOperation() {
        const { operationType } = this.summaryData;
        this.hide();
        
        // Navigate to the appropriate view based on the operation type
        const viewMap = {
            'import': 'import',
            'export': 'export',
            'delete': 'delete',
            'modify': 'modify'
        };
        
        const targetView = viewMap[operationType.toLowerCase()] || 'home';
        this.app.showView(targetView);
    }
    
    /**
     * Handle view details button click
     */
    handleViewDetails() {
        if (!this.summaryData || !this.summaryData.details) {
            this.logger.warn('No details available to view');
            return;
        }
        
        // TODO: Implement detailed results view
        this.logger.info('Viewing detailed results', { 
            operationId: this.summaryData.operationId,
            detailCount: this.summaryData.details.length 
        });
        
        // For now, just show an alert with the first few details
        const sampleDetails = this.summaryData.details
            .slice(0, 5)
            .map((d, i) => `${i + 1}. ${d.status}: ${d.id || d.email || d.username || 'Unknown record'}`)
            .join('\n');
            
        alert(`Showing first 5 of ${this.summaryData.details.length} detailed records:\n\n${sampleDetails}`);
    }
    
    /**
     * Handle export results button click
     */
    handleExportResults() {
        if (!this.summaryData || !this.summaryData.details) {
            this.logger.warn('No data available to export');
            return;
        }
        
        // TODO: Implement actual export functionality
        this.logger.info('Exporting results', { 
            operationId: this.summaryData.operationId,
            detailCount: this.summaryData.details.length 
        });
        
        // For now, just show an alert
        alert(`Preparing to export ${this.summaryData.details.length} records...`);
    }
    
    /**
     * Hide all other views
     */
    hideOtherViews() {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            if (view.id !== 'operation-summary-view') {
                view.style.display = 'none';
            }
        });
    }
    
    /**
     * Format operation type for display
     */
    formatOperationType(type) {
        if (!type) return 'Operation';
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
    
    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp, includeSeconds = false) {
        if (!timestamp) return 'N/A';
        
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        if (includeSeconds) {
            options.second = '2-digit';
        }
        
        return date.toLocaleString(undefined, options);
    }
    
    /**
     * Format duration in milliseconds to a human-readable string
     */
    formatDuration(ms) {
        if (!ms && ms !== 0) return 'N/A';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds % 60}.${Math.floor((ms % 1000) / 100)}s`;
        }
    }
    
    /**
     * Generate a unique operation ID
     */
    generateOperationId() {
        return 'op_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Track operation completion for analytics
     */
    trackOperationCompletion() {
        if (!this.summaryData) return;
        
        const { operationType, successCount, failureCount, skippedCount, totalCount, duration } = this.summaryData;
        
        // Log the operation completion
        this.logger.info('Operation completed', {
            operationType,
            successCount,
            failureCount,
            skippedCount,
            totalCount,
            durationMs: duration
        });
        
        // TODO: Implement actual analytics tracking
        // Example: this.app.analytics.track('operation_completed', { ... });
    }
    
    /**
     * Update the summary with new data
     * @param {Object} data - New summary data
     */
    updateSummary(data) {
        if (!data) return;
        
        // Update the summary data
        this.summaryData = {
            ...this.summaryData,
            ...data,
            // Recalculate total count if any counts changed
            totalCount: (data.successCount || this.summaryData?.successCount || 0) +
                       (data.failureCount || this.summaryData?.failureCount || 0) +
                       (data.skippedCount || this.summaryData?.skippedCount || 0)
        };
        
        // Update the UI
        this.updateUI();
    }
}

// Export a singleton instance
export let operationSummary = null;

/**
 * Initialize the operation summary module
 * @param {Object} app - Main application instance
 */
export function initOperationSummary(app) {
    if (!operationSummary) {
        operationSummary = new OperationSummary(app);
    }
    return operationSummary;
}

/**
 * Show the operation summary
 * @param {Object} data - Operation result data
 * @param {string} operationType - Type of operation
 */
export function showOperationSummary(data, operationType = 'import') {
    if (!operationSummary) {
        console.error('Operation Summary module not initialized');
        return;
    }
    operationSummary.show(data, operationType);
}

/**
 * Update the operation summary with new data
 * @param {Object} data - Updated operation data
 */
export function updateOperationSummary(data) {
    if (!operationSummary) {
        console.error('Operation Summary module not initialized');
        return;
    }
    operationSummary.updateSummary(data);
}
