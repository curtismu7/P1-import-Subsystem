/**
 * Import Management Subsystem
 * 
 * Handles all user import operations with proper separation of concerns.
 * Manages file validation, progress tracking, real-time updates, and error handling.
 */

export class ImportSubsystem {
    constructor(logger, uiManager, localClient, settingsManager, eventBus, populationService) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsManager = settingsManager;
        this.eventBus = eventBus;
        this.populationService = populationService;
        
        // Import state management
        this.isImporting = false;
        this.socket = null;
        this.selectedPopulationId = null;
        this.selectedPopulationName = null;
        this.fallbackPolling = null;
        
        this.logger.info('Import Subsystem initialized');
        
        // Set up event listeners for cross-subsystem communication
        this.setupCrossSubsystemEvents();
    }
    
    /**
     * Initialize the import subsystem
     */
    async init() {
        try {
            this.setupEventListeners();
            this.logger.info('Import Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Import Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners for import-related elements
     */
    setupEventListeners() {
        // Import button
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.startImport();
            });
        }
        
        // CSV file input
        const csvFileInput = document.getElementById('csv-file');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.handleFileSelect(file);
                }
            });
        }
    }
    
    /**
     * Start the import process
     */
    async startImport() {
        if (this.isImporting) {
            this.uiManager.showNotification('An import is already in progress. Please wait for it to complete.', {
                type: 'warning',
                duration: 5000,
                title: 'Import In Progress'
            });
            return;
        }
        
        try {
            this.isImporting = true;
            this.logger.info('Starting import process');
            
            // Validate prerequisites
            if (!await this.validateImportPrerequisites()) {
                return;
            }
            
            // Get population selection
            this.getPopulationSelection();
            
            // Show progress UI
            this.uiManager.showProgress();
            
            // Start real-time connection
            const sessionId = this.generateSessionId();
            await this.establishRealTimeConnection(sessionId);
            
            // Begin import process
            await this.executeImport(sessionId);
            
        } catch (error) {
            this.logger.error('Import process failed', error);
            this.uiManager.showError('Import Failed', error.message || 'An unexpected error occurred during the import process.');
        } finally {
            this.isImporting = false;
        }
    }
    
    /**
     * Validate import prerequisites
     */
    async validateImportPrerequisites() {
        // Check for valid token
        const hasValidToken = await this.checkTokenStatus();
        if (!hasValidToken) {
            this.uiManager.showError('Authentication Required', 'You must have a valid token to start an import. Please authenticate first.');
            return false;
        }
        
        // Check file selection
        const fileInput = document.getElementById('csv-file');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
            this.uiManager.showError('No File Selected', 'Please select a CSV file to import.');
            return false;
        }
        
        return true;
    }
    
    /**
     * Get current population selection
     */
    getPopulationSelection() {
        const popSelect = document.getElementById('import-population-select');
        this.selectedPopulationId = popSelect?.value || '';
        
        if (popSelect) {
            const selectedOption = popSelect.options[popSelect.selectedIndex];
            this.selectedPopulationName = selectedOption?.text || '';
        }
        
        this.logger.info('Population selection', {
            id: this.selectedPopulationId,
            name: this.selectedPopulationName
        });
    }
    
    /**
     * Handle progress updates
     */
    handleProgressUpdate(data) {
        if (!data || data.current === undefined || data.total === undefined) {
            this.logger.error('Invalid progress data', data);
            return;
        }
        
        const percentage = Math.round((data.current / data.total) * 100);
        
        // Update progress UI
        this.uiManager.updateProgress(percentage, data.message || `Processing ${data.current} of ${data.total} users...`);
        
        this.logger.info('Progress update', {
            current: data.current,
            total: data.total,
            percentage
        });
    }
    
    /**
     * Handle import completion
     */
    handleImportCompletion(data) {
        this.logger.info('Import completed', data);
        // TODO: Refactor: Use Notification from UI subsystem instead of alert.
        this.cleanupConnections();
    }
    
    /**
     * Handle import errors
     */
    handleImportError(data) {
        this.logger.error('Import error', data);
        // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
        this.cleanupConnections();
    }
    
    /**
     * Execute the import process
     */
    async executeImport(sessionId) {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('populationId', this.selectedPopulationId);
        formData.append('sessionId', sessionId);
        
        try {
            const response = await this.localClient.post('/api/import', formData);
            
            if (!response.success) {
                throw new Error(response.error || 'Import failed');
            }
            
            this.logger.info('Import request sent successfully');
            
        } catch (error) {
            this.logger.error('Import request failed', error);
            throw error;
        }
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Handle file selection
     */
    async handleFileSelect(file) {
        try {
            this.logger.info('File selected for import', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // Validate file
            if (!this.validateFile(file)) {
                return;
            }
            
            // Show file info
            this.displayFileInfo(file);
            
        } catch (error) {
            this.logger.error('File selection failed', error);
            this.uiManager.showError('File Selection Error', error.message);
        }
    }
    
    /**
     * Validate selected file
     */
    validateFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.uiManager.showError('Invalid File Type', 'Please select a CSV file');
            return false;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.uiManager.showError('File Too Large', 'File size must be less than 10MB');
            return false;
        }
        
        return true;
    }
    
    /**
     * Display file information
     */
    displayFileInfo(file) {
        const fileInfoElement = document.getElementById('file-info');
        if (fileInfoElement) {
            fileInfoElement.innerHTML = `
                <div class="file-info">
                    <strong>Selected File:</strong> ${file.name}<br>
                    <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                    <strong>Type:</strong> ${file.type || 'CSV'}
                </div>
            `;
        }
    }
    
    /**
     * Clean up connections and resources
     */
    cleanupConnections() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        if (this.fallbackPolling) {
            clearInterval(this.fallbackPolling);
            this.fallbackPolling = null;
        }
        
        this.isImporting = false;
    }
    
    /**
     * Set up fallback polling if Socket.IO fails
     */
    setupFallbackPolling(sessionId) {
        this.fallbackPolling = setInterval(async () => {
            try {
                const response = await this.localClient.get(`/api/import/status/${sessionId}`);
                if (response.data) {
                    this.handleProgressUpdate(response.data);
                }
            } catch (error) {
                this.logger.error('Fallback polling failed', error);
            }
        }, 2000);
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
            this.logger.warn('Token expired during import operation');
            if (this.isImporting) {
                this.cleanupConnections();
                this.uiManager.showError('Session Expired', 'Your authentication token expired during the import. Please re-authenticate and try again.');
            }
        });
        
        // Listen for token error events
        this.eventBus.on('tokenError', (data) => {
            this.logger.error('Token error detected', data);
            if (this.isImporting) {
                this.cleanupConnections();
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
            this.logger.info('Populations changed, refreshing import dropdown', { count: data.count });
            this.refreshPopulationDropdown();
        });
        
        this.logger.debug('Cross-subsystem event listeners set up for ImportSubsystem');
    }
    
    /**
     * Refresh the population dropdown for import
     */
    refreshPopulationDropdown() {
        // Use PopulationService directly instead of going through app
        if (this.populationService) {
            this.populationService.populateDropdown('import-population-select', {
                includeEmpty: true,
                emptyText: 'Select a population'
            })
                .then(() => {
                    this.logger.debug('Import population dropdown refreshed successfully');
                })
                .catch(error => {
                    this.logger.error('Failed to refresh import population dropdown', error);
                    this.uiManager.showError('Population Refresh Failed', 'Failed to refresh population dropdown.');
                });
        } else {
            this.logger.warn('PopulationService not available for dropdown refresh');
        }
    }
}