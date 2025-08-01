/**
 * Export Management Subsystem
 * 
 * Handles all user export operations with proper separation of concerns.
 * Manages export configuration, progress tracking, and file generation.
 */

export class ExportSubsystem {
    constructor(logger, uiManager, localClient, settingsSubsystem, eventBus, populationService) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsSubsystem = settingsSubsystem;
        this.eventBus = eventBus;
        this.populationService = populationService;
        
        // Export state management
        this.isExporting = false;
        this.selectedPopulationId = null;
        this.selectedPopulationName = null;
        
        this.logger.info('Export Subsystem initialized');
        
        // Set up event listeners for cross-subsystem communication
        this.setupCrossSubsystemEvents();
    }
    
    /**
     * Initialize the export subsystem
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadPopulations();
            this.logger.info('Export Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Export Subsystem', error);
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('Failed to Initialize Export Subsystem', error.message);
        }
    }
    
    /**
     * Set up event listeners for export-related elements
     */
    setupEventListeners() {
        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.startExport();
            });
        }
        
        // Population selection change
        const populationSelect = document.getElementById('export-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => {
                this.handlePopulationChange(e.target.value);
            });
        }
        
        // Export format selection
        const formatSelect = document.getElementById('export-format');
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                this.handleFormatChange(e.target.value);
            });
        }
    }
    
    /**
     * Start the export process
     */
    async startExport() {
        if (this.isExporting) {
            this.logger.warn('Export already in progress');
            return;
        }
        
        try {
            this.isExporting = true;
            this.logger.info('Starting export process');
            
            // Validate prerequisites
            if (!await this.validateExportPrerequisites()) {
                return;
            }
            
            // Get export configuration
            const config = this.getExportConfiguration();
            
            // Show progress UI
            this.uiManager.showProgress('Exporting...');
            
            // Execute export
            await this.executeExport(config);
            
        } catch (error) {
            this.logger.error('Export process failed', error);
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('Export Failed', error.message);
        } finally {
            this.isExporting = false;
            this.uiManager.hideProgress();
        }
    }
    
    /**
     * Validate export prerequisites
     */
    async validateExportPrerequisites() {
        // Check for valid token
        const hasValidToken = await this.checkTokenStatus();
        if (!hasValidToken) {
            this.logger.warn('Export cancelled - no valid token');
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('Authentication Required', 'Please get a valid token first');
            return false;
        }
        
        // Check population selection
        const populationSelect = document.getElementById('export-population-select');
        if (!populationSelect || !populationSelect.value) {
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('No Population Selected', 'Please select a population to export');
            return false;
        }
        
        return true;
    }
    
    /**
     * Get export configuration from form with comprehensive validation
     */
    getExportConfiguration() {
        const populationSelect = document.getElementById('export-population-select');
        const formatSelect = document.getElementById('export-format');
        const includeHeaders = document.getElementById('include-headers');
        const limitUsers = document.getElementById('limit-users');
        const userLimit = document.getElementById('user-limit');
        const includeInactive = document.getElementById('include-inactive-users');
        const customFields = document.getElementById('custom-fields');
        const exportFilters = document.getElementById('export-filters');
        
        const config = {
            populationId: populationSelect?.value || '',
            populationName: populationSelect?.options[populationSelect.selectedIndex]?.text || '',
            format: formatSelect?.value || 'csv',
            includeHeaders: includeHeaders?.checked !== false,
            limitUsers: limitUsers?.checked || false,
            userLimit: limitUsers?.checked ? (parseInt(userLimit?.value) || 100) : null,
            includeInactive: includeInactive?.checked || false,
            customFields: customFields?.value ? customFields.value.split(',').map(f => f.trim()).filter(f => f) : [],
            filters: exportFilters?.value ? JSON.parse(exportFilters.value || '{}') : {},
            timestamp: new Date().toISOString(),
            sessionId: this.generateSessionId()
        };
        
        // Validate configuration
        this.validateExportConfiguration(config);
        
        return config;
    }
    
    /**
     * Validate export configuration
     */
    validateExportConfiguration(config) {
        const errors = [];
        
        // Validate population selection
        if (!config.populationId && config.populationId !== 'ALL') {
            errors.push('Please select a population to export');
        }
        
        // Validate format
        const supportedFormats = ['csv', 'json', 'xlsx'];
        if (!supportedFormats.includes(config.format)) {
            errors.push(`Unsupported export format: ${config.format}`);
        }
        
        // Validate user limit
        if (config.limitUsers && (!config.userLimit || config.userLimit < 1 || config.userLimit > 10000)) {
            errors.push('User limit must be between 1 and 10,000');
        }
        
        // Validate custom fields
        if (config.customFields.length > 50) {
            errors.push('Too many custom fields specified (maximum 50)');
        }
        
        if (errors.length > 0) {
            const errorMessage = 'Export configuration validation failed:\n' + errors.join('\n');
            this.logger.error('Export configuration validation failed', { errors, config });
            throw new Error(errorMessage);
        }
        
        this.logger.info('Export configuration validated successfully', config);
    }
    
    /**
     * Generate unique session ID for export tracking
     */
    generateSessionId() {
        return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Execute the export process with comprehensive error handling and progress tracking
     */
    async executeExport(config) {
        let progressInterval = null;
        
        try {
            this.logger.info('Executing export with config', config);
            
            // Emit export started event
            this.eventBus.emit('exportStarted', { config, sessionId: config.sessionId });
            
            // Show initial progress
            this.updateExportProgress(0, 100, 'Initializing export...');
            
            // Pre-export validation
            await this.validateExportPrerequisites();
            this.updateExportProgress(10, 100, 'Validating prerequisites...');
            
            // Send export request with enhanced configuration
            const exportRequest = {
                ...config,
                clientInfo: {
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };
            
            this.updateExportProgress(20, 100, 'Sending export request...');
            const response = await this.localClient.post('/api/export', exportRequest);
            
            if (!response.success) {
                throw new Error(response.error || 'Export request failed');
            }
            
            // Handle different response types
            if (response.sessionId) {
                // Long-running export with progress tracking
                await this.trackExportProgress(response.sessionId, config);
            } else if (response.downloadUrl) {
                // Direct download
                this.updateExportProgress(90, 100, 'Preparing download...');
                await this.downloadFile(response.downloadUrl, response.filename);
                this.updateExportProgress(100, 100, 'Export completed successfully');
            } else if (response.data) {
                // Inline data
                this.updateExportProgress(90, 100, 'Processing export data...');
                await this.downloadData(response.data, config.format, config.populationName);
                this.updateExportProgress(100, 100, 'Export completed successfully');
            } else {
                throw new Error('Invalid export response format');
            }
            
            // Record export success
            await this.recordExportHistory(config, 'success');
            
            this.logger.info('Export completed successfully', { sessionId: config.sessionId });
            this.uiManager.showSuccess('Export completed successfully');
            
            // Emit export completed event
            this.eventBus.emit('exportCompleted', { config, sessionId: config.sessionId });
            
        } catch (error) {
            this.logger.error('Export execution failed', { error: error.message, config });
            
            // Record export failure
            await this.recordExportHistory(config, 'failed', error.message);
            
            // Emit export failed event
            this.eventBus.emit('exportFailed', { config, error: error.message, sessionId: config.sessionId });
            
            // Enhanced error handling
            await this.handleExportError(error, config);
            
            throw error;
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            this.hideExportProgress();
        }
    }
    
    /**
     * Track export progress for long-running exports
     */
    async trackExportProgress(sessionId, config) {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(`/api/export/progress/${sessionId}`);
            let lastProgress = 0;
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'progress') {
                        lastProgress = data.progress;
                        this.updateExportProgress(
                            data.current || data.progress,
                            data.total || 100,
                            data.message || `Exporting... ${data.progress}%`
                        );
                    } else if (data.type === 'complete') {
                        eventSource.close();
                        if (data.downloadUrl) {
                            this.downloadFile(data.downloadUrl, data.filename);
                        }
                        resolve(data);
                    } else if (data.type === 'error') {
                        eventSource.close();
                        reject(new Error(data.message || 'Export failed'));
                    }
                } catch (parseError) {
                    this.logger.error('Failed to parse progress data', parseError);
                }
            };
            
            eventSource.onerror = (error) => {
                this.logger.error('Export progress tracking error', error);
                eventSource.close();
                
                // Fallback to polling if SSE fails
                this.trackExportProgressViaPolling(sessionId, resolve, reject);
            };
            
            // Timeout after 10 minutes
            setTimeout(() => {
                if (eventSource.readyState !== EventSource.CLOSED) {
                    eventSource.close();
                    reject(new Error('Export timeout - operation took too long'));
                }
            }, 600000);
        });
    }
    
    /**
     * Fallback progress tracking via polling
     */
    async trackExportProgressViaPolling(sessionId, resolve, reject) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await this.localClient.get(`/api/export/status/${sessionId}`);
                
                if (response.status === 'completed') {
                    clearInterval(pollInterval);
                    if (response.downloadUrl) {
                        this.downloadFile(response.downloadUrl, response.filename);
                    }
                    resolve(response);
                } else if (response.status === 'failed') {
                    clearInterval(pollInterval);
                    reject(new Error(response.error || 'Export failed'));
                } else if (response.status === 'processing') {
                    this.updateExportProgress(
                        response.progress || 50,
                        100,
                        response.message || 'Processing export...'
                    );
                }
            } catch (error) {
                this.logger.error('Export polling error', error);
                clearInterval(pollInterval);
                reject(error);
            }
        }, 2000); // Poll every 2 seconds
    }
    
    /**
     * Update export progress UI
     */
    updateExportProgress(current, total, message) {
        const percentage = Math.round((current / total) * 100);
        
        // Update progress bar
        const progressBar = document.getElementById('export-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        
        // Update progress text
        const progressText = document.getElementById('export-progress-text');
        if (progressText) {
            progressText.textContent = `${message} (${percentage}%)`;
        }
        
        // Update via UIManager if available
        if (this.uiManager && typeof this.uiManager.updateProgress === 'function') {
            this.uiManager.updateProgress(percentage, message);
        }
        
        this.logger.debug('Export progress updated', { current, total, percentage, message });
    }
    
    /**
     * Handle export errors with recovery options
     */
    async handleExportError(error, config) {
        const errorType = this.categorizeError(error);
        
        switch (errorType) {
            case 'network':
                this.uiManager.showError('Network Error', 'Export failed due to network issues. Please check your connection and try again.');
                break;
            case 'authentication':
                this.uiManager.showError('Authentication Error', 'Your session has expired. Please re-authenticate and try again.');
                // Emit token refresh request
                this.eventBus.emit('tokenRefreshRequired', { source: 'export', config });
                break;
            case 'validation':
                this.uiManager.showError('Validation Error', `Export configuration is invalid: ${error.message}`);
                break;
            case 'server':
                this.uiManager.showError('Server Error', 'Export failed due to a server error. Please try again later.');
                break;
            default:
                this.uiManager.showError('Export Error', `Export failed: ${error.message}`);
        }
    }
    
    /**
     * Categorize error for appropriate handling
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        } else if (message.includes('unauthorized') || message.includes('token') || message.includes('expired')) {
            return 'authentication';
        } else if (message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        } else if (message.includes('server') || message.includes('internal')) {
            return 'server';
        }
        
        return 'unknown';
    }
    
    /**
     * Record export operation in history
     */
    async recordExportHistory(config, status, errorMessage = null) {
        try {
            const historyEntry = {
                sessionId: config.sessionId,
                timestamp: new Date().toISOString(),
                populationId: config.populationId,
                populationName: config.populationName,
                format: config.format,
                userLimit: config.userLimit,
                status,
                errorMessage,
                duration: Date.now() - new Date(config.timestamp).getTime()
            };
            
            // Store in local storage for history tracking
            const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
            history.unshift(historyEntry);
            
            // Keep only last 50 entries
            if (history.length > 50) {
                history.splice(50);
            }
            
            localStorage.setItem('exportHistory', JSON.stringify(history));
            
            this.logger.info('Export history recorded', historyEntry);
        } catch (error) {
            this.logger.error('Failed to record export history', error);
        }
    }
    
    /**
     * Download file from URL with enhanced error handling
     */
    async downloadFile(url, filename) {
        try {
            this.logger.info('Starting file download', { url, filename });
            
            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `export_${Date.now()}.csv`;
            link.style.display = 'none';
            
            // Add to DOM temporarily
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            }, 100);
            
            this.logger.info('File download initiated successfully', { filename });
            
        } catch (error) {
            this.logger.error('File download failed', { error: error.message, url, filename });
            throw new Error(`Download failed: ${error.message}`);
        }
    }
    
    /**
     * Download data as file with comprehensive format support
     */
    async downloadData(data, format, populationName) {
        try {
            this.logger.info('Processing data for download', { format, populationName, recordCount: Array.isArray(data) ? data.length : 'unknown' });
            
            let content, mimeType, extension;
            
            switch (format.toLowerCase()) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                case 'xlsx':
                    content = await this.convertToXLSX(data);
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    extension = 'xlsx';
                    break;
                case 'csv':
                default:
                    content = this.convertToCSV(data);
                    mimeType = 'text/csv;charset=utf-8';
                    extension = 'csv';
                    break;
            }
            
            // Create blob with proper encoding
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            // Generate descriptive filename
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const sanitizedPopulationName = (populationName || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${sanitizedPopulationName}_${timestamp}.${extension}`;
            
            await this.downloadFile(url, filename);
            
            this.logger.info('Data download completed successfully', { filename, format });
            
        } catch (error) {
            this.logger.error('Data download failed', { error: error.message, format, populationName });
            throw new Error(`Failed to download data: ${error.message}`);
        }
    }
    
    /**
     * Hide export progress UI
     */
    hideExportProgress() {
        // Hide progress bar
        const progressContainer = document.getElementById('export-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Reset progress elements
        const progressBar = document.getElementById('export-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', 0);
        }
        
        const progressText = document.getElementById('export-progress-text');
        if (progressText) {
            progressText.textContent = '';
        }
        
        // Hide via UIManager if available
        if (this.uiManager && typeof this.uiManager.hideProgress === 'function') {
            this.uiManager.hideProgress();
        }
        
        this.logger.debug('Export progress UI hidden');
    }
    
    /**
     * Convert data to XLSX format (placeholder for future implementation)
     */
    async convertToXLSX(data) {
        // For now, fall back to CSV until XLSX library is integrated
        this.logger.warn('XLSX export not yet implemented, falling back to CSV');
        return this.convertToCSV(data);
    }
    
    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        // Get headers from first object
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        // Convert data rows
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',');
        });
        
        return [csvHeaders, ...csvRows].join('\n');
    }
    
    /**
     * Load populations for dropdown
     */
    async loadPopulations() {
        try {
            const response = await this.localClient.get('/api/populations');
            
            if (response.success && response.populations) {
                this.populateDropdown(response.populations);
            }
            
        } catch (error) {
            this.logger.error('Failed to load populations', error);
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('Failed to Load Populations', error.message);
        }
    }
    
    /**
     * Populate the population dropdown
     */
    populateDropdown(populations) {
        const select = document.getElementById('export-population-select');
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Population</option>';
        
        // Add population options
        populations.forEach(pop => {
            const option = document.createElement('option');
            option.value = pop.id;
            option.textContent = pop.name;
            select.appendChild(option);
        });
    }
    
    /**
     * Handle population selection change
     */
    handlePopulationChange(populationId) {
        this.selectedPopulationId = populationId;
        
        const select = document.getElementById('export-population-select');
        if (select) {
            const selectedOption = select.options[select.selectedIndex];
            this.selectedPopulationName = selectedOption?.text || '';
        }
        
        this.logger.info('Population selection changed', {
            id: this.selectedPopulationId,
            name: this.selectedPopulationName
        });
        
        // Update UI based on selection
        this.updateExportOptions();
    }
    
    /**
     * Handle export format change
     */
    handleFormatChange(format) {
        this.logger.info('Export format changed', { format });
        
        // Update UI based on format selection
        this.updateFormatOptions(format);
    }
    
    /**
     * Update export options based on population selection
     */
    updateExportOptions() {
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = !this.selectedPopulationId;
        }
        
        // Show/hide additional options based on population
        if (this.selectedPopulationId) {
            this.showExportOptions();
        } else {
            this.hideExportOptions();
        }
    }
    
    /**
     * Update format-specific options
     */
    updateFormatOptions(format) {
        const headersOption = document.getElementById('headers-option');
        if (headersOption) {
            headersOption.style.display = format === 'csv' ? 'block' : 'none';
        }
    }
    
    /**
     * Show export options
     */
    showExportOptions() {
        const optionsContainer = document.getElementById('export-options');
        if (optionsContainer) {
            optionsContainer.style.display = 'block';
        }
    }
    
    /**
     * Hide export options
     */
    hideExportOptions() {
        const optionsContainer = document.getElementById('export-options');
        if (optionsContainer) {
            optionsContainer.style.display = 'none';
        }
    }
    
    /**
     * Show export progress
     */
    showExportProgress() {
        const progressContainer = document.getElementById('export-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';
        }
    }
    
    /**
     * Hide export progress
     */
    hideExportProgress() {
        const progressContainer = document.getElementById('export-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export Users';
        }
    }
    
    /**
     * Check token status
     */
    async checkTokenStatus() {
        try {
            const response = await this.localClient.get('/api/token/status');
            return response.valid;
        } catch (error) {
            this.logger.error('Token status check failed', error);
            return false;
        }
    }
    
    /**
     * Set up cross-subsystem event listeners
     */
    setupCrossSubsystemEvents() {
        if (!this.eventBus) {
            this.logger.warn('EventBus not available for cross-subsystem events');
            return;
        }
        
        // Listen for token expiration events
        this.eventBus.on('tokenExpired', (data) => {
            this.logger.warn('Token expired during export operation');
            if (this.isExporting) {
                this.isExporting = false;
                this.hideExportProgress();
                this.uiManager.showError('Session Expired', 'Your authentication token expired during the export. Please re-authenticate and try again.');
            }
        });
        
        // Listen for token error events
        this.eventBus.on('tokenError', (data) => {
            this.logger.error('Token error detected', data);
            if (this.isExporting) {
                this.isExporting = false;
                this.hideExportProgress();
                this.uiManager.showError('Authentication Error', `Authentication failed: ${data.error}`);
            }
        });
        
        // Listen for token refresh events
        this.eventBus.on('tokenRefreshed', (data) => {
            this.logger.info('Token refreshed successfully');
            // Token refresh is handled automatically, just log for now
        });
        
        // Listen for population change events
        this.eventBus.on('populationsChanged', (data) => {
            this.logger.info('Populations changed, refreshing export dropdown', { count: data.count });
            this.refreshPopulationDropdown();
        });
        
        this.logger.debug('Cross-subsystem event listeners set up for ExportSubsystem');
    }
    
    /**
     * Refresh the population dropdown for export
     */
    refreshPopulationDropdown() {
        // Use PopulationService directly instead of going through app
        if (this.populationService) {
            this.populationService.populateDropdown('export-population-select', {
                includeEmpty: true,
                emptyText: 'Select a population'
            })
                .then(() => {
                    this.logger.debug('Export population dropdown refreshed successfully');
                })
                .catch(error => {
                    this.logger.error('Failed to refresh export population dropdown', error);
                    this.uiManager.showError('Population Refresh Failed', 'Failed to refresh population dropdown.');
                });
        } else {
            this.logger.warn('PopulationService not available for dropdown refresh');
        }
    }
}