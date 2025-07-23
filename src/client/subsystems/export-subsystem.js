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
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const initAction = async () => {
            this.setupEventListeners();
            await this.loadPopulations();
            this.logger.info('Export Subsystem initialized successfully');
        };

        await errorHandler.wrapAsync(
            initAction, 
            'Initialize Export Subsystem',
            'Failed to Initialize Export Subsystem' // Custom error message for UI
        )();
    }
    
    /**
     * Set up event listeners for export-related elements
     */
    setupEventListeners() {
        // Initialize utilities for safe DOM operations
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                EXPORT_BTN: 'export-btn',
                EXPORT_POPULATION_SELECT: 'export-population-select',
                EXPORT_FORMAT: 'export-format'
            }
        };

        // Export button
        const exportBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_BTN);
        if (exportBtn) {
            safeDOM.addEventListener(exportBtn, 'click', errorHandler.wrapAsyncEventHandler(async (e) => {
                e.preventDefault();
                await this.startExport();
            }, 'Export button click'));
        }

        // Population selection change
        const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_POPULATION_SELECT);
        if (populationSelect) {
            safeDOM.addEventListener(populationSelect, 'change', errorHandler.wrapEventHandler((e) => {
                this.handlePopulationChange(e.target.value);
            }, 'Export population change'));
        }

        // Export format selection
        const formatSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_FORMAT);
        if (formatSelect) {
            safeDOM.addEventListener(formatSelect, 'change', errorHandler.wrapEventHandler((e) => {
                this.handleFormatChange(e.target.value);
            }, 'Export format change'));
        }
    }
    
    /**
     * Start the export process
     */
    async startExport() {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        if (this.isExporting) {
            this.logger.warn('Export already in progress');
            return;
        }

        this.isExporting = true;
        this.logger.info('Starting export process');

        try {
            const exportAction = async () => {
                // Validate prerequisites
                if (!await this.validateExportPrerequisites()) {
                    return; // Validation failed, error already shown.
                }

                // Get export configuration
                const config = this.getExportConfiguration();

                // Show progress UI
                this.uiManager.showProgress('Exporting...');

                // Execute export
                await this.executeExport(config);
            };

            await errorHandler.wrapAsync(
            exportAction, 
            'Start export process',
            'The export failed. Please check the application logs for more details.'
        )();

        } finally {
            // This block ensures that the UI is always reset, even if validation fails or an error occurs.
            this.isExporting = false;
            this.uiManager.hideProgress();
        }
    }
    
    /**
     * Validate export prerequisites
     */
    async validateExportPrerequisites() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                EXPORT_POPULATION_SELECT: 'export-population-select'
            }
        };

        const validationAction = async () => {
            // Check for valid token
            const hasValidToken = await this.checkTokenStatus();
            if (!hasValidToken) {
                this.logger.warn('Export cancelled - no valid token');
                this.uiManager.showError('Authentication Required', 'Please get a valid token first');
                return false;
            }

            // Check population selection
            const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_POPULATION_SELECT);
            if (!populationSelect || !populationSelect.value) {
                this.uiManager.showError('No Population Selected', 'Please select a population to export');
                return false;
            }

            return true;
        };

        return await errorHandler.wrapAsync(validationAction, 'Validate export prerequisites')();
    }
    
    /**
     * Get export configuration from form
     */
    getExportConfiguration() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                EXPORT_POPULATION_SELECT: 'export-population-select',
                EXPORT_FORMAT: 'export-format',
                INCLUDE_HEADERS: 'include-headers',
                LIMIT_USERS: 'limit-users',
                USER_LIMIT: 'user-limit'
            }
        };

        const getAction = () => {
            const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_POPULATION_SELECT);
            const formatSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_FORMAT);
            const includeHeaders = safeDOM.selectById(UI_CONFIG.SELECTORS.INCLUDE_HEADERS);
            const limitUsers = safeDOM.selectById(UI_CONFIG.SELECTORS.LIMIT_USERS);
            const userLimit = safeDOM.selectById(UI_CONFIG.SELECTORS.USER_LIMIT);

            const isLimitEnabled = limitUsers ? limitUsers.checked : false;

            return {
                populationId: populationSelect ? populationSelect.value : '',
                populationName: (populationSelect && populationSelect.selectedIndex >= 0) ? populationSelect.options[populationSelect.selectedIndex].text : '',
                format: formatSelect ? formatSelect.value : 'csv',
                includeHeaders: includeHeaders ? includeHeaders.checked : true,
                limitUsers: isLimitEnabled,
                userLimit: isLimitEnabled ? (parseInt(userLimit?.value, 10) || 100) : null,
                timestamp: new Date().toISOString()
            };
        };

        return errorHandler.wrapSync(getAction, 'Get export configuration')();
    }
    
    /**
     * Execute the export process
     */
    async executeExport(config) {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const exportAction = async () => {
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
            this.uiManager.showSuccess('Export completed successfully');
        };

        // Errors will be caught and re-thrown, to be handled by the caller (startExport)
        await errorHandler.wrapAsync(
            exportAction,
            'Execute export',
            'Failed to communicate with the server during export. Please check your connection and try again.',
            { rethrow: true } // Rethrow to allow the caller to handle UI cleanup
        )();
    }
    
    /**
     * Download file from URL
     */
    downloadFile(url, filename) {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const downloadAction = () => {
            const link = safeDOM.createElement('a');
            if (!link) return; // createElement can fail

            link.href = url;
            link.download = filename || `export_${Date.now()}.csv`;
            
            safeDOM.appendChild(document.body, link);
            link.click(); // Direct click is generally safe here
            safeDOM.removeChild(document.body, link);
            
            this.logger.info('Successfully triggered file download', { filename });
        };

        errorHandler.wrapSync(
        downloadAction, 
        'Download file from URL',
        'Failed to trigger file download. Please check browser permissions and try again.'
    )();
    }
    
    /**
     * Download data as file
     */
    downloadData(data, format, populationName) {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const downloadDataAction = () => {
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

            try {
                this.downloadFile(url, filename);
            } finally {
                // Revoke the object URL to free up memory, regardless of success
                URL.revokeObjectURL(url);
                this.logger.debug('Revoked object URL for downloaded file', { url });
            }
        };

        errorHandler.wrapSync(
        downloadDataAction,
        'Download data as file',
        'Failed to prepare data for download. The data may be invalid or too large.'
    )();
    }
    
    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const convertAction = () => {
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
        };

        return errorHandler.wrapSync(
        convertAction, 
        'Convert data to CSV',
        'Failed to convert data to CSV format. The data might be structured incorrectly.'
    )() || ''; // Ensure empty string on failure
    }
    
    /**
     * Load populations for dropdown
     * CRITICAL: This method loads populations for export functionality
     * DO NOT modify API endpoint without verifying it matches server routes
     * Last debugged: 2025-07-21 - Added debug logging for population loading issues
     */
    async loadPopulations() {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const loadAction = async () => {
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
                // Let the errorHandler handle the UI notification by throwing an error.
                throw new Error('Invalid or empty response from populations API');
            }
        };

        await errorHandler.wrapAsync(
            loadAction,
            'Load populations for export',
            'Failed to load populations from the server. Please check your connection and refresh the page.'
        )();
    }
    
    /**
     * Populate the population dropdown
     * CRITICAL: This method populates the export population dropdown with loaded data
     * DO NOT change the dropdown element ID without updating HTML templates
     * Last debugged: 2025-07-21 - Added debug logging for dropdown population issues
     */
    populateDropdown(populations) {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { SELECTORS: { EXPORT_POPULATION_SELECT: 'export-population-select' } };

        const populateAction = () => {
            this.logger.debug('🔄 EXPORT: Populating export population dropdown...', {
                populationCount: populations?.length || 0,
                populations: populations?.map(p => ({ id: p.id, name: p.name })) || []
            });

            const select = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_POPULATION_SELECT);
            if (!select) {
                // safeDOM already logs the error, so we can just return.
                return;
            }

            // Clear existing options safely
            safeDOM.setHTML(select, '<option value="">Select Population</option>');
            this.logger.debug('🔄 EXPORT: Cleared existing dropdown options');

            // Add population options
            let optionsAdded = 0;
            populations.forEach(pop => {
                if (pop && pop.id && pop.name) {
                    const option = safeDOM.createElement('option');
                    if(option) {
                        option.value = pop.id;
                        safeDOM.setText(option, pop.name); // Use setText for safety
                        safeDOM.appendChild(select, option);
                        optionsAdded++;
                    }
                } else {
                    this.logger.warn('🔄 EXPORT: Skipping invalid population data', { population: pop });
                }
            });

            this.logger.info(`🔄 EXPORT: Successfully populated dropdown with ${optionsAdded} population options`);
        };
        
        errorHandler.wrapSync(
        populateAction, 
        'Populate export dropdown',
        'Failed to display populations in the dropdown. The application may be in an inconsistent state.'
    )();
    }
    
    /**
     * Handle population selection change
     */
    handlePopulationChange(populationId) {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                EXPORT_POPULATION_SELECT: 'export-population-select'
            }
        };

        const changeAction = () => {
            this.selectedPopulationId = populationId;

            const select = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_POPULATION_SELECT);
            if (select && select.selectedIndex >= 0) {
                this.selectedPopulationName = select.options[select.selectedIndex]?.text || '';
            } else {
                this.selectedPopulationName = '';
            }

            this.logger.info('Population selection changed', {
                id: this.selectedPopulationId,
                name: this.selectedPopulationName
            });

            // Update UI based on selection
            this.updateExportOptions();
        };

        errorHandler.wrapSync(
        changeAction, 
        'Handle population change',
        'Failed to update the UI after population change. Please try again.'
    )();
    }
    
    /**
     * Handle export format change
     */
    handleFormatChange(format) {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const changeAction = () => {
            this.logger.info('Export format changed', { format });

            // Update UI based on format selection
            this.updateFormatOptions(format);
        };

        errorHandler.wrapSync(
        changeAction, 
        'Handle format change',
        'Failed to update UI for the selected format. Please try again.'
    )();
    }
    
    /**
     * Update export options based on population selection
     */
    updateExportOptions() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                EXPORT_BTN: 'export-btn' 
            }
        };

        const updateAction = () => {
            const exportBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_BTN);

            if (this.selectedPopulationId) {
                safeDOM.enable(exportBtn);
                this.showExportOptions();
            } else {
                safeDOM.disable(exportBtn);
                this.hideExportOptions();
            }
        };

        errorHandler.wrapSync(
        updateAction, 
        'Update export options',
        'Failed to update export UI options. The UI may be in an inconsistent state.'
    )();
    }
    
    /**
     * Update format-specific options
     */
    updateFormatOptions(format) {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                HEADERS_OPTION: 'headers-option'
            }
        };

        const updateAction = () => {
            const headersOption = safeDOM.selectById(UI_CONFIG.SELECTORS.HEADERS_OPTION);
            if (headersOption) {
                headersOption.style.display = format === 'csv' ? 'block' : 'none';
            }
        };

        errorHandler.wrapSync(
        updateAction, 
        'Update format options',
        'Failed to update format-specific UI options. The UI may be in an inconsistent state.'
    )();
    }
    
    /**
     * Show export options
     */
    showExportOptions() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                EXPORT_OPTIONS: 'export-options'
            }
        };

        const showOptionsAction = () => {
            const optionsContainer = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_OPTIONS);
            safeDOM.show(optionsContainer);
        };

        errorHandler.wrapSync(
        showOptionsAction, 
        'Show export options',
        'Failed to show export options. The UI may be in an inconsistent state.'
    )();
    }
    
    /**
     * Hide export options
     */
    hideExportOptions() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                EXPORT_OPTIONS: 'export-options'
            }
        };

        const hideOptionsAction = () => {
            const optionsContainer = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_OPTIONS);
            safeDOM.hide(optionsContainer);
        };

        errorHandler.wrapSync(
        hideOptionsAction, 
        'Hide export options',
        'Failed to hide export options. The UI may be in an inconsistent state.'
    )();
    }
    
    /**
     * Show export progress
     */
    showExportProgress() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                EXPORT_PROGRESS: 'export-progress', 
                EXPORT_BTN: 'export-btn' 
            },
            MESSAGES: {
                EXPORTING: 'Exporting...'
            }
        };

        const showProgressAction = () => {
            const progressContainer = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_PROGRESS);
            safeDOM.show(progressContainer);

            const exportBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_BTN);
            safeDOM.disable(exportBtn);
            safeDOM.setText(exportBtn, UI_CONFIG.MESSAGES.EXPORTING);
        };

        errorHandler.wrapSync(
        showProgressAction, 
        'Show export progress',
        'Failed to show export progress. The UI may be in an inconsistent state.'
    )();
    }
    
    /**
     * Hide export progress
     */
    hideExportProgress() {
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || { 
            SELECTORS: { 
                EXPORT_PROGRESS: 'export-progress', 
                EXPORT_BTN: 'export-btn' 
            },
            MESSAGES: {
                EXPORT_USERS: 'Export Users'
            }
        };

        const hideProgressAction = () => {
            const progressContainer = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_PROGRESS);
            safeDOM.hide(progressContainer);

            const exportBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.EXPORT_BTN);
            safeDOM.enable(exportBtn);
            safeDOM.setText(exportBtn, UI_CONFIG.MESSAGES.EXPORT_USERS);
        };

        errorHandler.wrapSync(
        hideProgressAction, 
        'Hide export progress',
        'Failed to hide export progress. Please refresh the page if the UI is unresponsive.'
    )();
    }
    
    /**
     * Check token status
     */
    async checkTokenStatus() {
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const checkAction = async () => {
            const response = await this.localClient.get('/api/v1/auth/status');
            return response.valid;
        };

        try {
            // Use wrapAsync to handle logging, but catch the error to return a boolean.
            return await errorHandler.wrapAsync(checkAction, 'Check token status')();
        } catch (error) {
            // Error is already logged by the handler. Return false as per original logic.
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
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);

        const refreshAction = async () => {
            if (!this.populationService) {
                this.logger.warn('PopulationService not available for dropdown refresh');
                return; // Exit gracefully if the service is not available
            }

            await this.populationService.populateDropdown('export-population-select', {
                includeEmpty: true,
                emptyText: 'Select a population'
            });
            
            this.logger.debug('Export population dropdown refreshed successfully');
        };

        // The errorHandler will catch any failures from populateDropdown
        errorHandler.wrapAsync(
            refreshAction,
            'Refresh export population dropdown',
            'Failed to refresh the population list. Please check your connection or try again.'
        )();
    }
}