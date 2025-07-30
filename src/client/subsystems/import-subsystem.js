/**
 * Import Management Subsystem
 * 
 * Handles all user import operations with proper separation of concerns.
 * Manages file validation, progress tracking, real-time updates, and error handling.
 */

import { createSafeLogger } from '../utils/safe-logger.js';

export class ImportSubsystem {
    constructor(logger, uiManager, localClient, settingsManager, eventBus, populationService, authManagementSubsystem = null) {
        // Wrap the logger with our safe logger to prevent logging errors from breaking the app
        this.logger = createSafeLogger(logger || console);
        
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

        // Initialize message formatter with a fallback
        this.messageFormatter = window.messageFormatter || {
            formatMessage: (type, message) => `[${type.toUpperCase()}] ${message}`
        };
        
        try {
            this.logger.info('Import Subsystem initialized');
        } catch (e) {
            console.error('Failed to log Import Subsystem initialization:', e);
        }
        
        // Set up event listeners for cross-subsystem communication
        try {
            this.setupCrossSubsystemEvents();
        } catch (e) {
            console.error('Failed to set up cross-subsystem events:', e);
        }
    }
    
    /**
     * Initialize the import subsystem
     */
    async init() {
        try {
            const debugLog = (msg) => {
                try {
                    if (this.logger?.debug) {
                        this.logger.debug(msg);
                    } else if (window.logger?.debug) {
                        window.logger.debug(msg);
                    } else {
                        console.log(`[DEBUG] ${msg}`);
                    }
                } catch (e) {
                    console.log(`[DEBUG] ${msg} (fallback logging)`);
                }
            };
            
            debugLog('🚀 [DEBUG] ImportSubsystem: init() method called');
            
            try {
                debugLog('🔧 [DEBUG] ImportSubsystem: Setting up event listeners');
                this.setupEventListeners();
            } catch (e) {
                console.error('Failed to set up event listeners:', e);
                throw e; // Re-throw to be caught by the outer try-catch
            }
            
            try {
                debugLog('📋 [DEBUG] ImportSubsystem: About to refresh population dropdown');
                // Initialize population dropdown
                await this.refreshPopulationDropdown();
            } catch (e) {
                console.error('Failed to refresh population dropdown:', e);
                // Continue initialization even if population refresh fails
            }
            
            debugLog('🔘 [DEBUG] ImportSubsystem: Setting initial button state');
            // Set initial button state (should be disabled until form is complete)
            this.validateAndUpdateButtonState();
            
            this.logger.debug('✅ [DEBUG] ImportSubsystem: Init completed successfully');
            this.logger.info('Import Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('❌ [DEBUG] ImportSubsystem: Init failed with error:', error);
            this.logger.error('Failed to initialize Import Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners for import-related elements
     */
    setupEventListeners() {
        // Initialize utilities for safe DOM operations
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                START_IMPORT_BTN: 'start-import',
                CSV_FILE_INPUT: 'csv-file',
                IMPORT_POPULATION_SELECT: 'import-population-select'
            }
        };
        
        // Import button (correct ID is 'start-import') with Safe DOM
        const importBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.START_IMPORT_BTN);
        if (importBtn) {
            safeDOM.addEventListener(importBtn, 'click', errorHandler.wrapAsyncEventHandler(async (e) => {
                e.preventDefault();
                await this.startImport();
            }, 'Import button click handler'));
        }
        
        // CSV file input with Safe DOM
        const csvFileInput = safeDOM.selectById(UI_CONFIG.SELECTORS.CSV_FILE_INPUT);
        if (csvFileInput) {
            safeDOM.addEventListener(csvFileInput, 'change', errorHandler.wrapAsyncEventHandler(async (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.selectedFile = file; // Update the selected file
                    await this.handleFileSelect(file);
                    this.validateAndUpdateButtonState();
                }
            }, 'CSV file input change handler'));
        }
        
        // Population dropdown change with Safe DOM
        const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.IMPORT_POPULATION_SELECT);
        if (populationSelect) {
            safeDOM.addEventListener(populationSelect, 'change', errorHandler.wrapEventHandler((e) => {
                this.handlePopulationChange(e.target.value, e.target.selectedOptions[0]?.text);
                this.validateAndUpdateButtonState();
            }, 'Population dropdown change handler'));
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
            (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: checkTokenStatus called');
            (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: this.authManagementSubsystem =', this.authManagementSubsystem);
            (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: typeof this.authManagementSubsystem =', typeof this.authManagementSubsystem);
            
            if (!this.authManagementSubsystem) {
                this.logger.warn('AuthManagementSubsystem not available for token check');
                (this.logger?.debug || window.logger?.debug || console.log)('❌ [DEBUG] ImportSubsystem: AuthManagementSubsystem is null/undefined');
                return false;
            }
            
            (this.logger?.debug || window.logger?.debug || console.log)('✅ [DEBUG] ImportSubsystem: AuthManagementSubsystem is available, calling isTokenValid()');
            const isValid = this.authManagementSubsystem.isTokenValid();
            (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: isValid =', isValid);
            
            // Also get authentication status for additional info
            const authStatus = this.authManagementSubsystem.getAuthenticationStatus();
            (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: authStatus =', authStatus);
            
            return isValid;
        } catch (error) {
            this.logger.error('Error checking token status:', error);
            (this.logger?.debug || window.logger?.debug || console.log)('❌ [DEBUG] ImportSubsystem: Error in checkTokenStatus:', error);
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
        // Initialize utilities for safe DOM operations
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                TOKEN_ALERT_OVERLAY: '.token-alert-overlay',
                SETTINGS_NAV_ITEM: '[data-view="settings"]'
            },
            CLASSES: {
                TOKEN_ALERT_OVERLAY: 'token-alert-overlay'
            }
        };
        
        // Check if modal already exists using Safe DOM
        const existingModal = safeDOM.select(UI_CONFIG.SELECTORS.TOKEN_ALERT_OVERLAY);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay using Safe DOM
        const overlay = document.createElement('div');
        safeDOM.addClass(overlay, UI_CONFIG.CLASSES.TOKEN_ALERT_OVERLAY);
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
        
        // Bind events using Safe DOM
        const settingsBtn = safeDOM.select('#token-alert-settings-btn', overlay);
        const closeBtn = safeDOM.select('#token-alert-close', overlay);
        
        // Settings button - navigate to settings with error handling
        if (settingsBtn) {
            safeDOM.addEventListener(settingsBtn, 'click', errorHandler.wrapEventHandler(() => {
                overlay.remove();
                // Navigate to settings view
                if (window.app && window.app.showView) {
                    window.app.showView('settings');
                } else {
                    // Fallback: trigger the settings nav item using Safe DOM
                    const settingsNavItem = safeDOM.select(UI_CONFIG.SELECTORS.SETTINGS_NAV_ITEM);
                    if (settingsNavItem) {
                        settingsNavItem.click();
                    } else {
                        // Final fallback: redirect to home page
                        window.location.href = '/';
                    }
                }
            }, 'Authentication modal settings button click'));
        }

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
        // Initialize utilities for safe DOM operations
        const safeDOM = window.safeDOM || new SafeDOM(this.logger);
        const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
        const UI_CONFIG = window.UI_CONFIG || {
            SELECTORS: {
                START_IMPORT_BTN: 'start-import',
                IMPORT_POPULATION_SELECT: 'import-population-select'
            },
            CLASSES: {
                BTN_DISABLED: 'btn-disabled',
                BTN_PRIMARY: 'btn-primary'
            }
        };
        
        // Wrap the entire validation in error handler
        errorHandler.wrapSync(() => {
            const importBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.START_IMPORT_BTN);
            if (!importBtn) {
                this.logger.warn('Import button not found for state validation');
                return;
            }
            
            // Check if file is selected (using internal state for reliability)
            const hasFile = !!this.selectedFile;
            
            // Check if population is selected using Safe DOM
            const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.IMPORT_POPULATION_SELECT);
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
            
            // Update button appearance using Safe DOM
            if (shouldEnable) {
                safeDOM.removeClass(importBtn, UI_CONFIG.CLASSES.BTN_DISABLED);
                safeDOM.addClass(importBtn, UI_CONFIG.CLASSES.BTN_PRIMARY);
            } else {
                safeDOM.addClass(importBtn, UI_CONFIG.CLASSES.BTN_DISABLED);
                safeDOM.removeClass(importBtn, UI_CONFIG.CLASSES.BTN_PRIMARY);
            }
        }, 'Import button state validation')();
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
     * Display comprehensive file information with record count and validation
     * CRITICAL: This method provides detailed file information display for CSV import UI
     * DO NOT simplify this method - users need comprehensive file details including record counts
     * Last enhanced: 2025-07-22 - Restored missing file information section functionality
     */
    async displayFileInfo(file) {
        try {
            this.logger.info('Displaying comprehensive file information', { fileName: file.name });
            
            // Parse CSV to get record count and validation information
            let recordCount = null;
            let csvData = null;
            
            try {
                // Read and parse the CSV file to get accurate record count
                const fileContent = await this.readFileAsText(file);
                csvData = this.parseCSVContent(fileContent);
                recordCount = csvData ? csvData.length : 0;
                
                this.logger.debug('CSV parsing completed', { recordCount, hasData: !!csvData });
            } catch (parseError) {
                this.logger.warn('Failed to parse CSV for record count', { error: parseError.message });
                recordCount = 'Unable to determine';
            }
            
            // Use comprehensive file info display with all details
            this.updateFileInfoDisplay(file, recordCount, csvData);
            
        } catch (error) {
            this.logger.error('Failed to display file information', { error: error.message });
            
            // Initialize utilities for safe DOM operations
            const safeDOM = window.safeDOM || new SafeDOM(this.logger);
            const UI_CONFIG = window.UI_CONFIG || {
                SELECTORS: {
                    FILE_INFO: 'file-info'
                },
                CLASSES: {
                    FILE_INFO_ERROR: 'file-info-error'
                },
                STYLES: {
                    ERROR_BACKGROUND: '#f8d7da',
                    ERROR_BORDER: '1px solid #f5c6cb',
                    ERROR_COLOR: '#721c24'
                }
            };
            
            // Fallback to basic file info display using Safe DOM
            const fileInfoElement = safeDOM.selectById(UI_CONFIG.SELECTORS.FILE_INFO);
            if (fileInfoElement) {
                const errorHTML = `
                    <div class="${UI_CONFIG.CLASSES.FILE_INFO_ERROR}" style="background: ${UI_CONFIG.STYLES.ERROR_BACKGROUND}; border: ${UI_CONFIG.STYLES.ERROR_BORDER}; border-radius: 4px; padding: 12px; color: ${UI_CONFIG.STYLES.ERROR_COLOR};">
                        <strong>⚠️ File Information Error</strong><br>
                        Selected: ${file.name}<br>
                        Size: ${(file.size / 1024).toFixed(2)} KB<br>
                        <em>Unable to display detailed information: ${error.message}</em>
                    </div>
                `;
                safeDOM.setHTML(fileInfoElement, errorHTML);
            }
        }
    }

    /**
     * Read file as text for CSV parsing
     * @param {File} file - The file to read
     * @returns {Promise<string>} File content as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse CSV content to extract user records
     * @param {string} content - CSV file content
     * @returns {Array} Parsed CSV records
     */
    parseCSVContent(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }
        
        try {
            // Simple CSV parsing - split by lines and handle basic CSV format
            const lines = content.split('\n').filter(line => line.trim().length > 0);
            if (lines.length <= 1) {
                return []; // No data rows (only header or empty)
            }
            
            // Return data rows (excluding header)
            return lines.slice(1).map(line => {
                // Basic CSV parsing - split by comma and handle quoted fields
                const fields = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        fields.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                fields.push(current.trim()); // Add the last field
                
                return fields;
            }).filter(row => row.some(field => field.length > 0)); // Filter out empty rows
            
        } catch (error) {
            this.logger.error('CSV parsing error', { error: error.message });
            return [];
        }
    }

    /**
     * Update file info display with comprehensive information
     * @param {File} file - The selected file
     * @param {number|string} recordCount - Number of records or error message
     * @param {Array} csvData - Parsed CSV data for validation
     */
    updateFileInfoDisplay(file, recordCount, csvData) {
        const fileInfoElement = document.getElementById('file-info');
        if (!fileInfoElement) {
            this.logger.warn('File info element not found in DOM');
            return;
        }
        
        const fileSize = this.formatFileSize(file.size);
        const lastModified = new Date(file.lastModified).toLocaleString();
        const fileType = file.type || this.getFileExtension(file.name);
        const fileExtension = this.getFileExtension(file.name);
        
        // Determine if file type is valid for CSV import
        const isCSV = fileExtension === 'csv';
        const isText = fileExtension === 'txt';
        const isValidType = isCSV || isText || fileType === 'text/csv' || fileType === 'text/plain';
        
        // Create record count display
        let recordCountHTML = '';
        if (isValidType && recordCount !== null) {
            if (typeof recordCount === 'number') {
                if (recordCount > 0) {
                    recordCountHTML = `
                        <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                            <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                            <span style="color: #0073C8; font-size: 0.8rem; font-weight: bold;">${recordCount}</span>
                        </div>
                    `;
                } else {
                    recordCountHTML = `
                        <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                            <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                            <span style="color: #dc3545; font-size: 0.8rem; font-weight: bold;">No user records found</span>
                        </div>
                    `;
                }
            } else {
                recordCountHTML = `
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                        <span style="color: #ffc107; font-size: 0.8rem; font-weight: bold;">${recordCount}</span>
                    </div>
                `;
            }
        }
        
        // Create comprehensive file information display
        const fileInfoHTML = `
            <div class="file-info-details" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin: 8px 0; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                
                <!-- File Name Section -->
                <div class="file-name-section" style="text-align: center; margin-bottom: 12px; padding: 8px; background: #e6f4ff; border-radius: 4px; color: #1a237e; font-weight: bold; font-size: 1.1rem;">
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 3px; color: #1a237e; word-break: break-word; overflow-wrap: break-word;">
                        <i class="fas fa-file-csv" style="margin-right: 6px; font-size: 1.2rem; color: #1976d2;"></i>
                        ${file.name}
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.9; font-weight: 500; color: #1976d2;">
                        File Selected Successfully
                    </div>
                </div>
                
                <!-- File Information Grid -->
                <div class="file-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.8em; margin-bottom: 10px;">
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📊 File Size</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileSize}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📅 Modified</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${lastModified}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📄 Type</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileType || 'CSV'}</span>
                    </div>
                    
                    ${recordCountHTML}
                </div>
                
                <!-- File Status -->
                <div class="file-info-status" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: ${isValidType ? '#d4edda' : '#f8d7da'}; border: 1px solid ${isValidType ? '#c3e6cb' : '#f5c6cb'}; display: flex; align-items: center; gap: 6px;">
                    <i class="fas ${isValidType ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="color: ${isValidType ? '#155724' : '#721c24'};"></i>
                    <span style="color: ${isValidType ? '#155724' : '#721c24'}; font-size: 0.85rem; font-weight: 500;">
                        ${isValidType ? 'Valid CSV file format' : 'Warning: File type may not be compatible'}
                    </span>
                </div>
                
                ${csvData && csvData.length > 0 ? `
                <div class="file-info-preview" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: #fff3cd; border: 1px solid #ffeaa7;">
                    <strong style="color: #856404; font-size: 0.85rem;">📋 Ready for Import</strong>
                    <div style="color: #856404; font-size: 0.8rem; margin-top: 2px;">
                        File contains ${recordCount} user record${recordCount === 1 ? '' : 's'} ready for processing
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        fileInfoElement.innerHTML = fileInfoHTML;
        this.logger.info('File information display updated successfully', { recordCount, isValidType });
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get file extension from filename
     * @param {string} filename - The filename
     * @returns {string} File extension in lowercase
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    }
    
    /**
     * Establish real-time connection for import progress tracking
     * CRITICAL: This method was missing and causing UI freeze due to infinite await
     * Last implemented: 2025-07-22 - Fixed UI freeze issue by implementing missing method
     */
    async establishRealTimeConnection(sessionId) {
        try {
            this.logger.debug('🔗 [DEBUG] ImportSubsystem: Establishing real-time connection for session:', sessionId);
            
            // Check if Socket.IO is available
            if (typeof io !== 'undefined' && this.subsystems?.realtimeManager) {
                this.logger.debug('🔗 [DEBUG] ImportSubsystem: Socket.IO available, setting up real-time connection');
                
                // Set up Socket.IO connection through realtime subsystem
                this.socket = this.subsystems.realtimeManager.getConnection();
                
                if (this.socket) {
                    // Set up progress event listeners
                    this.socket.on(`import-progress-${sessionId}`, (data) => {
                        this.handleProgressUpdate(data);
                    });
                    
                    this.socket.on(`import-complete-${sessionId}`, (data) => {
                        this.handleImportCompletion(data);
                    });
                    
                    this.socket.on(`import-error-${sessionId}`, (data) => {
                        this.handleImportError(data);
                    });
                    
                    this.logger.info('✅ [DEBUG] ImportSubsystem: Real-time connection established successfully');
                } else {
                    this.logger.warn('⚠️ [DEBUG] ImportSubsystem: Socket.IO connection not available, using fallback polling');
                    this.setupFallbackPolling(sessionId);
                }
            } else {
                this.logger.warn('⚠️ [DEBUG] ImportSubsystem: Socket.IO not available, using fallback polling');
                this.setupFallbackPolling(sessionId);
            }
            
            // Always resolve immediately to prevent UI freeze
            return Promise.resolve();
            
        } catch (error) {
            this.logger.error('❌ [DEBUG] ImportSubsystem: Failed to establish real-time connection:', error);
            // Set up fallback polling if real-time connection fails
            this.setupFallbackPolling(sessionId);
            // Always resolve to prevent UI freeze
            return Promise.resolve();
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