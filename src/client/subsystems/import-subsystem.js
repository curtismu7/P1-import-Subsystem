/**
 * Import Management Subsystem
 * 
 * Handles all user import operations with proper separation of concerns.
 * Manages file validation, progress tracking, real-time updates, and error handling.
 */

export class ImportSubsystem {
    constructor(logger, uiManager, localClient, settingsManager, eventBus, populationService, authManagementSubsystem = null) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.settingsManager = settingsManager;
        this.eventBus = eventBus;
        this.populationService = populationService;
        this.authManagementSubsystem = authManagementSubsystem;
        
        // Import state management
        this.isImporting = false;
        this.socket = null;
        this.selectedPopulationId = null;
        this.selectedPopulationName = null;
        this.fallbackPolling = null;
        this.selectedFile = null; // Tracks the selected file for import
        
        this.logger.info('Import Subsystem initialized');
        
        // Set up event listeners for cross-subsystem communication
        this.setupCrossSubsystemEvents();
    }
    
    /**
     * Initialize the import subsystem
     */
    async init() {
        console.log('🚀 [DEBUG] ImportSubsystem: init() method called');
        try {
            console.log('🔧 [DEBUG] ImportSubsystem: Setting up event listeners');
            this.setupEventListeners();
            
            console.log('📋 [DEBUG] ImportSubsystem: About to refresh population dropdown');
            // Initialize population dropdown
            this.refreshPopulationDropdown();
            
            console.log('🔘 [DEBUG] ImportSubsystem: Setting initial button state');
            // Set initial button state (should be disabled until form is complete)
            this.validateAndUpdateButtonState();
            
            console.log('✅ [DEBUG] ImportSubsystem: Init completed successfully');
            this.logger.info('Import Subsystem initialized successfully');
        } catch (error) {
            console.error('❌ [DEBUG] ImportSubsystem: Init failed with error:', error);
            this.logger.error('Failed to initialize Import Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners for import-related elements
     */
    setupEventListeners() {
        // Import button (correct ID is 'start-import')
        const importBtn = document.getElementById('start-import');
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
                    this.selectedFile = file; // Update the selected file
                    await this.handleFileSelect(file);
                    this.validateAndUpdateButtonState();
                }
            });
        }
        
        // Population dropdown change
        const populationSelect = document.getElementById('import-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => {
                this.handlePopulationChange(e.target.value, e.target.selectedOptions[0]?.text);
                this.validateAndUpdateButtonState();
            });
        }
        
        // Drag & Drop functionality
        this.setupDragAndDropListeners();
    }
    
    /**
     * Set up drag and drop event listeners for CSV file upload
     */
    setupDragAndDropListeners() {
        const dropArea = document.getElementById('import-drop-zone');
        const fileInput = document.getElementById('csv-file');
        
        if (!dropArea) {
            this.logger.warn('Import drop zone not found in DOM');
            return;
        }
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });
        
        // Handle dropped files
        dropArea.addEventListener('drop', async (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const file = files[0];
                this.selectedFile = file; // Update the selected file
                
                // Update the file input to reflect the dropped file
                if (fileInput) {
                    // Create a new FileList-like object
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                }
                
                await this.handleFileSelect(file);
                this.validateAndUpdateButtonState();
            }
        }, false);
        
        // Handle click to browse files
        dropArea.addEventListener('click', () => {
            if (fileInput) {
                fileInput.click();
            }
        });
        
        this.logger.info('Drag and drop listeners set up successfully');
    }
    
    /**
     * Start the import process
     */
    async startImport() {
        this.logger.info('🚀 [DEBUG] ImportSubsystem: Start import button clicked');
        
        if (this.isImporting) {
            this.logger.warn('🚀 [DEBUG] ImportSubsystem: Import already in progress');
            this.uiManager.showNotification('An import is already in progress. Please wait for it to complete.', {
                type: 'warning',
                duration: 5000,
                title: 'Import In Progress'
            });
            return;
        }
        
        try {
            this.isImporting = true;
            this.logger.info('🚀 [DEBUG] ImportSubsystem: Starting import process');
            
            // Validate prerequisites
            this.logger.debug('🚀 [DEBUG] ImportSubsystem: Validating prerequisites...');
            if (!await this.validateImportPrerequisites()) {
                this.logger.warn('🚀 [DEBUG] ImportSubsystem: Prerequisites validation failed, aborting import');
                return;
            }
            
            this.logger.info('🚀 [DEBUG] ImportSubsystem: Prerequisites validated, proceeding with import');
            
            // Get population selection
            this.getPopulationSelection();
            
            // Show progress UI
            this.logger.debug('🚀 [DEBUG] ImportSubsystem: Showing progress UI');
            this.uiManager.showProgress();
            
            // Start real-time connection
            const sessionId = this.generateSessionId();
            this.logger.debug('🚀 [DEBUG] ImportSubsystem: Establishing real-time connection with session:', sessionId);
            await this.establishRealTimeConnection(sessionId);
            
            // Begin import process
            this.logger.debug('🚀 [DEBUG] ImportSubsystem: Executing import with session:', sessionId);
            await this.executeImport(sessionId);
            
        } catch (error) {
            this.logger.error('🚀 [DEBUG] ImportSubsystem: Import process failed', error);
            this.uiManager.showError('Import Failed', error.message || 'An unexpected error occurred during the import process.');
        } finally {
            this.isImporting = false;
            this.logger.debug('🚀 [DEBUG] ImportSubsystem: Import process completed, resetting isImporting flag');
        }
    }
    
    /**
     * Validate import prerequisites
     */
    async validateImportPrerequisites() {
        this.logger.debug('🔍 [DEBUG] ImportSubsystem: Validating import prerequisites');
        
        // Check for valid token
        const hasValidToken = await this.checkTokenStatus();
        if (!hasValidToken) {
            this.logger.warn('🔍 [DEBUG] ImportSubsystem: Token validation failed');
            // Show user-friendly authentication modal with "Go to Settings" button
            this.showAuthenticationModal('Import');
            return false;
        }
        
        // Check file selection using the internal selectedFile property
        if (!this.selectedFile) {
            this.logger.warn('🔍 [DEBUG] ImportSubsystem: No file selected (selectedFile is null)');
            this.uiManager.showError('No File Selected', 'Please select a CSV file to import.');
            return false;
        }
        
        // Check population selection
        const populationSelect = document.getElementById('import-population-select');
        if (!populationSelect || !populationSelect.value || populationSelect.value === '') {
            this.logger.warn('🔍 [DEBUG] ImportSubsystem: No population selected');
            this.uiManager.showError('No Population Selected', 'Please select a population for the import.');
            return false;
        }
        
        this.logger.info('✅ [DEBUG] ImportSubsystem: All prerequisites validated successfully', {
            hasFile: !!this.selectedFile,
            fileName: this.selectedFile?.name,
            hasPopulation: !!populationSelect?.value,
            populationId: populationSelect?.value
        });
        
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
            console.log('🔍 [DEBUG] ImportSubsystem: checkTokenStatus called');
            console.log('🔍 [DEBUG] ImportSubsystem: this.authManagementSubsystem =', this.authManagementSubsystem);
            console.log('🔍 [DEBUG] ImportSubsystem: typeof this.authManagementSubsystem =', typeof this.authManagementSubsystem);
            
            if (!this.authManagementSubsystem) {
                this.logger.warn('AuthManagementSubsystem not available for token check');
                console.log('❌ [DEBUG] ImportSubsystem: AuthManagementSubsystem is null/undefined');
                return false;
            }
            
            console.log('✅ [DEBUG] ImportSubsystem: AuthManagementSubsystem is available, calling isTokenValid()');
            const isValid = this.authManagementSubsystem.isTokenValid();
            console.log('🔍 [DEBUG] ImportSubsystem: isValid =', isValid);
            
            // Also get authentication status for additional info
            const authStatus = this.authManagementSubsystem.getAuthenticationStatus();
            console.log('🔍 [DEBUG] ImportSubsystem: authStatus =', authStatus);
            
            return isValid;
        } catch (error) {
            this.logger.error('Error checking token status:', error);
            console.log('❌ [DEBUG] ImportSubsystem: Error in checkTokenStatus:', error);
            return false;
        }
    }

    /**
     * Show authentication modal with "Go to Settings" button
     */
    showAuthenticationModal(operation = 'Import') {
        try {
            // Create authentication modal directly to avoid bundling issues
            this.createAuthenticationModal(operation);
        } catch (error) {
            this.logger.error('Error showing authentication modal:', error);
            // Fallback to generic error
            this.uiManager.showError('Authentication Required', 
                `You must have a valid token to start an ${operation.toLowerCase()}. Please go to Settings to configure your credentials.`);
        }
    }

    /**
     * Create authentication modal with "Go to Settings" button
     */
    createAuthenticationModal(operation) {
        // Check if modal already exists
        const existingModal = document.querySelector('.token-alert-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'token-alert-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'token-alert-title');
        overlay.setAttribute('aria-describedby', 'token-alert-content');

        // Modal content with enhanced styling and action button
        overlay.innerHTML = `
            <div class="token-alert-modal" tabindex="-1">
                <div class="token-alert-header">
                    <h2 id="token-alert-title">
                        <span class="warning-icon" aria-hidden="true">⚠️</span>
                        <span>Authentication Required</span>
                    </h2>
                    <button type="button" class="token-alert-close" id="token-alert-close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="token-alert-body">
                    <div id="token-alert-content" class="token-alert-content">
                        <div class="token-alert-icon">
                            <span aria-hidden="true">🔐</span>
                        </div>
                        <h3>No Valid Token Available</h3>
                        <p class="token-alert-message">
                            <strong>Authentication is required to continue.</strong>
                            You need valid credentials to perform the "${operation}" operation.
                        </p>
                        <div class="token-status-info">
                            <p><strong>Current Status:</strong> No token available</p>
                        </div>
                        <div class="token-alert-actions">
                            <button type="button" class="btn btn-primary btn-lg" id="token-alert-settings-btn">
                                <span class="btn-icon">⚙️</span>
                                Go to Settings
                            </button>
                            <p class="token-alert-help">
                                Add your PingOne credentials in the Settings page to generate a new token.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        // Bind events
        const settingsBtn = overlay.querySelector('#token-alert-settings-btn');
        const closeBtn = overlay.querySelector('#token-alert-close');
        
        // Settings button - navigate to settings
        settingsBtn.addEventListener('click', () => {
            overlay.remove();
            // Navigate to settings view
            if (window.app && window.app.showView) {
                window.app.showView('settings');
            } else {
                // Fallback: trigger the settings nav item
                const settingsNavItem = document.querySelector('[data-view="settings"]');
                if (settingsNavItem) {
                    settingsNavItem.click();
                } else {
                    // Final fallback: redirect to home page
                    window.location.href = '/';
                }
            }
        });

        // Close button - allow manual dismissal
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        // Trap focus within modal
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
            }
        });
        
        // Show modal with animation
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);
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
     * Validate form state and update Import button enabled/disabled state
     */
    validateAndUpdateButtonState() {
        const importBtn = document.getElementById('start-import');
        if (!importBtn) {
            this.logger.warn('Import button not found for state validation');
            return;
        }
        
        // Check if file is selected (using internal state for reliability)
        const hasFile = !!this.selectedFile;
        
        // Check if population is selected
        const populationSelect = document.getElementById('import-population-select');
        const hasPopulation = populationSelect && populationSelect.value && populationSelect.value !== '';
        
        // Enable button only if both file and population are selected
        const shouldEnable = hasFile && hasPopulation;
        
        importBtn.disabled = !shouldEnable;
        
        this.logger.debug('Import button state updated', {
            hasFile,
            hasPopulation,
            shouldEnable,
            buttonDisabled: importBtn.disabled
        });
        
        // Update button appearance
        if (shouldEnable) {
            importBtn.classList.remove('btn-disabled');
            importBtn.classList.add('btn-primary');
        } else {
            importBtn.classList.add('btn-disabled');
            importBtn.classList.remove('btn-primary');
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
     * Handle population selection change
     */
    handlePopulationChange(populationId, populationName) {
        this.logger.info('🔄 [DEBUG] ImportSubsystem: Population changed', { populationId, populationName });
        
        // Update population name display with better visual distinction
        const populationNameDisplay = document.querySelector('.population-name-text');
        if (populationNameDisplay) {
            if (populationId && populationName) {
                populationNameDisplay.innerHTML = `<span class="population-label">Population:</span> <span class="population-value">${populationName}</span>`;
                this.logger.debug('Updated population name display', { populationName });
            } else {
                populationNameDisplay.innerHTML = `<span class="population-label">Population:</span> <span class="population-placeholder">Select a population</span>`;
            }
        }
        
        // Update API URL display
        const apiUrlDisplay = document.querySelector('.api-url-text');
        if (apiUrlDisplay) {
            if (populationId) {
                // Construct the API URL for the selected population
                const apiUrl = `/api/populations/${populationId}/users`;
                apiUrlDisplay.textContent = apiUrl;
                this.logger.debug('Updated API URL display', { apiUrl });
            } else {
                apiUrlDisplay.textContent = 'Select a population to see the API URL';
            }
        }
        
        // Store the selected population for import operations
        this.selectedPopulationId = populationId;
        this.selectedPopulationName = populationName;
        
        // Emit event for other subsystems
        if (this.eventBus) {
            this.eventBus.emit('importPopulationChanged', {
                populationId,
                populationName
            });
        }
    }
    
    /**
     * Refresh the population dropdown for import
     */
    refreshPopulationDropdown() {
        this.logger.info('🔍 [DEBUG] ImportSubsystem: refreshPopulationDropdown called');
        
        // Use PopulationService directly instead of going through app
        if (this.populationService) {
            this.logger.info('🔍 [DEBUG] ImportSubsystem: PopulationService available, calling populateDropdown');
            
            this.populationService.populateDropdown('import-population-select', {
                includeEmpty: true,
                emptyText: 'Select a population'
            })
                .then(() => {
                    this.logger.info('✅ [DEBUG] ImportSubsystem: Import population dropdown refreshed successfully');
                })
                .catch(error => {
                    this.logger.error('❌ [DEBUG] ImportSubsystem: Failed to refresh import population dropdown', error);
                    this.uiManager.showError('Population Refresh Failed', 'Failed to refresh population dropdown.');
                });
        } else {
            this.logger.error('❌ [DEBUG] ImportSubsystem: PopulationService not available for dropdown refresh', {
                populationServiceType: typeof this.populationService,
                populationServiceExists: !!this.populationService
            });
        }
    }
}