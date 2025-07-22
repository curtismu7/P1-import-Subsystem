/**
 * Export Management Subsystem
 * 
 * Handles all user export operations with proper separation of concerns.
 * Manages export configuration, progress tracking, and file generation.
 */

export class ExportSubsystem {
    constructor(logger, uiManager, localClient, settingsManager, eventBus, populationService) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsManager = settingsManager;
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
     * Get export configuration from form
     */
    getExportConfiguration() {
        const populationSelect = document.getElementById('export-population-select');
        const formatSelect = document.getElementById('export-format');
        const includeHeaders = document.getElementById('include-headers');
        const limitUsers = document.getElementById('limit-users');
        const userLimit = document.getElementById('user-limit');
        
        return {
            populationId: populationSelect?.value || '',
            populationName: populationSelect?.options[populationSelect.selectedIndex]?.text || '',
            format: formatSelect?.value || 'csv',
            includeHeaders: includeHeaders?.checked || true,
            limitUsers: limitUsers?.checked || false,
            userLimit: limitUsers?.checked ? (parseInt(userLimit?.value) || 100) : null,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Execute the export process
     */
    async executeExport(config) {
        try {
            this.logger.info('Executing export with config', config);
            
            // Send export request
            const response = await this.localClient.post('/api/export', config);
            
            if (!response.success) {
                throw new Error(response.error || 'Export failed');
            }
            
            // Handle file download
            if (response.downloadUrl) {
                this.downloadFile(response.downloadUrl, response.filename);
            } else if (response.data) {
                this.downloadData(response.data, config.format, config.populationName);
            }
            
            this.logger.info('Export completed successfully');
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showSuccess('Export completed successfully');
            
        } catch (error) {
            this.logger.error('Export execution failed', error);
            throw error;
        }
    }
    
    /**
     * Download file from URL
     */
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `export_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Download data as file
     */
    downloadData(data, format, populationName) {
        let content, mimeType, extension;
        
        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'csv':
            default:
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const filename = `${populationName || 'export'}_${Date.now()}.${extension}`;
        
        this.downloadFile(url, filename);
        URL.revokeObjectURL(url);
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
     * CRITICAL: This method loads populations for export functionality
     * DO NOT modify API endpoint without verifying it matches server routes
     * Last debugged: 2025-07-21 - Added debug logging for population loading issues
     */
    async loadPopulations() {
        try {
            this.logger.info('🔄 EXPORT: Loading populations for export dropdown...');
            
            const response = await this.localClient.get('/api/populations');
            
            this.logger.debug('🔄 EXPORT: Populations API response:', {
                success: response.success,
                populationCount: response.populations?.length || 0,
                hasPopulations: !!response.populations
            });
            
            if (response.success && response.populations) {
                this.logger.info(`🔄 EXPORT: Successfully loaded ${response.populations.length} populations`);
                this.populateDropdown(response.populations);
            } else {
                this.logger.warn('🔄 EXPORT: Invalid populations response structure', { response });
                this.uiManager.showError('Population Loading Failed', 'Invalid response from populations API');
            }
            
        } catch (error) {
            this.logger.error('🔄 EXPORT: Failed to load populations', { 
                error: error.message,
                stack: error.stack,
                endpoint: '/api/populations'
            });
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            this.uiManager.showError('Failed to Load Populations', `Population loading failed: ${error.message}`);
        }
    }
    
    /**
     * Populate the population dropdown
     * CRITICAL: This method populates the export population dropdown with loaded data
     * DO NOT change the dropdown element ID without updating HTML templates
     * Last debugged: 2025-07-21 - Added debug logging for dropdown population issues
     */
    populateDropdown(populations) {
        this.logger.debug('🔄 EXPORT: Populating export population dropdown...', {
            populationCount: populations?.length || 0,
            populations: populations?.map(p => ({ id: p.id, name: p.name })) || []
        });
        
        const select = document.getElementById('export-population-select');
        if (!select) {
            this.logger.error('🔄 EXPORT: Export population dropdown element not found!', {
                expectedId: 'export-population-select',
                availableSelects: Array.from(document.querySelectorAll('select')).map(s => s.id || 'no-id')
            });
            return;
        }
        
        // Clear existing options
        select.innerHTML = '<option value="">Select Population</option>';
        this.logger.debug('🔄 EXPORT: Cleared existing dropdown options');
        
        // Add population options
        let optionsAdded = 0;
        populations.forEach(pop => {
            if (pop && pop.id && pop.name) {
                const option = document.createElement('option');
                option.value = pop.id;
                option.textContent = pop.name;
                select.appendChild(option);
                optionsAdded++;
            } else {
                this.logger.warn('🔄 EXPORT: Skipping invalid population data', { population: pop });
            }
        });
        
        this.logger.info(`🔄 EXPORT: Successfully populated dropdown with ${optionsAdded} population options`);
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
            const response = await this.localClient.get('/api/v1/auth/status');
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