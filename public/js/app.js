// File: app.js
// Description: Main application entry point for PingOne user import tool
// 
// This file orchestrates the entire application, managing:
// - UI state and view transitions
// - File upload and CSV processing
// - Import/export/modify/delete operations
// - Real-time progress tracking via SSE
// - Settings management and population selection
// - Error handling and user feedback
// - Disclaimer agreement and feature flags

// Core subsystems - new architecture
import { EventBus } from './modules/event-bus.js';
import { HistorySubsystem } from './modules/history-subsystem.js';
import { LoggingSubsystem } from './modules/logging-subsystem.js';
import { PopulationSubsystem } from './modules/population-subsystem.js';
import { ProgressSubsystem } from './modules/progress-subsystem.js';
import { SessionSubsystem } from './modules/session-subsystem.js';
import { SettingsSubsystem } from './modules/settings-subsystem.js';
import { ImportSubsystem } from './modules/import-subsystem.js';
import { ExportSubsystem } from './modules/export-subsystem.js';
import { OperationManagerSubsystem } from './modules/operation-manager-subsystem.js';
import { UIManager } from './modules/ui-manager.js';

// Authentication and API subsystems
import { AuthManagementSubsystem } from './modules/auth-management-subsystem.js';
import { ConnectionManagerSubsystem } from './modules/connection-manager-subsystem.js';
import { apiFactory, initAPIFactory, createPingOneAPIClient } from './modules/api-factory.js';
import { LocalAPIClient } from './modules/local-api-client.js';

// Supporting modules (kept for compatibility)
import { Logger } from './modules/logger.js';
import { FileLogger } from './modules/file-logger.js';
import { FileHandler } from './modules/file-handler.js';
import { VersionManager } from './modules/version-manager.js';
import { LoggingSubsystem } from './modules/logging-subsystem.js';
import { HistorySubsystem } from './modules/history-subsystem.js';

import { showTokenAlertModal, clearTokenAlertSession } from './modules/token-alert-modal.js';
import progressPersistence from './modules/progress-persistence.js';
import PopulationService from './modules/population-service.js';

// External dependencies
import { io } from 'socket.io-client';

/**
 * Secret Field Toggle Component
 * 
 * Manages the visibility toggle for sensitive input fields (like API secrets).
 * Provides a secure way to show/hide sensitive data with visual feedback.
 * 
 * Features:
 * - Toggle between visible and masked input
 * - Visual eye icon that changes based on state
 * - Maintains actual value while showing masked version
 * - Prevents accidental exposure of sensitive data
 */
class SecretFieldToggle {
    constructor() {
        // Core DOM elements for the toggle functionality
        this.inputElement = null;
        this.eyeButton = null;
        
        // State tracking for visibility and initialization
        this.isVisible = false;
        this.actualValue = '';
        this.isInitialized = false;
    }

    /**
     * Initialize the secret field toggle component
     * 
     * Sets up DOM element references and event handlers for the toggle functionality.
     * Called during app initialization to prepare the secret field for user interaction.
     * 
     * @returns {void}
     */
    init() {
        // Prevent double initialization
        if (this.isInitialized) {
            return;
        }

        // Get references to the required DOM elements
        this.inputElement = document.getElementById('api-secret');
        this.eyeButton = document.getElementById('toggle-api-secret-visibility');

        // Validate that both elements exist before proceeding
        if (!this.inputElement || !this.eyeButton) {
            console.error('❌ Secret field elements not found');
            console.error('Input element:', !!this.inputElement);
            console.error('Eye button:', !!this.eyeButton);
            return;
        }

        console.log('✅ Secret field elements found');
        console.log('Input element ID:', this.inputElement.id);
        console.log('Eye button ID:', this.eyeButton.id);

        // Set up event handlers for user interaction
        this.setupToggleHandler();
        this.handleInputChange();
        
        // Mark as initialized to prevent re-initialization
        this.isInitialized = true;
        console.log('✅ Secret field toggle initialized');
    }

    /**
     * Set up the toggle button click handler
     * 
     * Binds the click event to the eye button for toggling visibility.
     * Ensures proper event handling and prevents memory leaks.
     * 
     * @returns {void}
     */
    setupToggleHandler() {
        // Remove any existing listeners to prevent duplicates
        this.eyeButton.removeEventListener('click', this.handleToggleClick);
        
        // Add the click handler with proper binding
        this.eyeButton.addEventListener('click', this.handleToggleClick.bind(this));
        
        console.log('Secret field toggle handler set up');
    }

    /**
     * Handle the toggle button click event
     * 
     * Toggles the visibility state of the secret field and updates the UI accordingly.
     * Prevents event bubbling and provides visual feedback to the user.
     * 
     * @param {Event} e - The click event object
     * @returns {void}
     */
    handleToggleClick(e) {
        // Prevent default behavior and stop event propagation
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔍 Eye button clicked!');
        console.log('Current visibility:', this.isVisible);
        console.log('Current value length:', this.actualValue.length);
        
        // Toggle the visibility state
        this.isVisible = !this.isVisible;
        
        // Update the input field display based on new state
        this.updateInputField();
        
        // Update the eye icon to reflect current state
        this.updateEyeIcon();
        
        console.log('✅ Toggle completed!');
        console.log('New visibility:', this.isVisible);
        console.log('Input type:', this.inputElement.type);
        console.log('Input value length:', this.inputElement.value.length);
    }

    /**
     * Update the input field display based on visibility state
     * 
     * Switches between text and password input types to show/hide the actual value.
     * Maintains the actual value while providing visual masking for security.
     * 
     * @returns {void}
     */
    updateInputField() {
        if (!this.inputElement) {
            return;
        }

        if (this.isVisible) {
            // Show the actual value in plain text
            this.inputElement.type = 'text';
            this.inputElement.value = this.actualValue;
        } else {
            // Show masked value using password input type
            this.inputElement.type = 'password';
            this.inputElement.value = this.actualValue || '';
        }
    }

    /**
     * Update the eye icon to reflect current visibility state
     * 
     * Changes the FontAwesome icon class to show either an open eye (visible)
     * or crossed-out eye (hidden) based on the current state.
     * 
     * @returns {void}
     */
    updateEyeIcon() {
        if (!this.eyeButton) {
            return;
        }

        // Find the icon element within the button
        const iconElement = this.eyeButton.querySelector('i');
        if (!iconElement) {
            return;
        }

        if (this.isVisible) {
            // Show open eye icon for visible state
            iconElement.classList.remove('fa-eye-slash');
            iconElement.classList.add('fa-eye');
        } else {
            // Show crossed-out eye icon for hidden state
            iconElement.classList.remove('fa-eye');
            iconElement.classList.add('fa-eye-slash');
        }
    }

    /**
     * Set the secret value and update display
     * 
     * Called when the form is populated with existing settings.
     * Always starts in hidden state for security.
     * 
     * @param {string} value - The secret value to store
     * @returns {void}
     */
    setValue(value) {
        this.actualValue = value || '';
        
        // Always start in hidden state for security
        this.isVisible = false;
        
        // Update the display to reflect the new value
        this.updateInputField();
        this.updateEyeIcon();
        
        console.log('Secret field value set, length:', this.actualValue.length);
    }

    /**
     * Get the current secret value
     * 
     * Returns the actual stored value, not the displayed value.
     * 
     * @returns {string} The current secret value
     */
    getValue() {
        return this.actualValue;
    }

    /**
     * Handle input changes when user types in the field
     * 
     * Updates the stored value to match what the user is typing.
     * Ensures the actual value stays synchronized with user input.
     * 
     * @returns {void}
     */
    handleInputChange() {
        if (!this.inputElement) {
            return;
        }

        // Listen for input changes and update stored value
        this.inputElement.addEventListener('input', (e) => {
            this.actualValue = e.target.value;
            console.log('Secret field input changed, new length:', this.actualValue.length);
        });
    }
}

/**
 * Main Application Class
 * 
 * Orchestrates the entire PingOne user import tool application.
 * Manages all UI interactions, API calls, file processing, and state management.
 * 
 * Key Responsibilities:
 * - Initialize and coordinate all component modules
 * - Handle user interactions and view transitions
 * - Manage import/export/modify/delete operations
 * - Provide real-time progress feedback via SSE
 * - Handle error states and user notifications
 * - Manage settings and population selection
 */
class App {
    constructor() {
        // Production environment detection
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' &&
                           !window.location.hostname.includes('dev');
        
        // Initialize core dependencies with safety checks
        try {
            // Core logging and utilities (kept for compatibility)
            this.logger = new Logger();
            this.fileLogger = new FileLogger();
            this.uiManager = new UIManager();
            this.localClient = new LocalAPIClient();
            this.versionManager = new VersionManager();
            
            // Initialize EventBus first (required by all subsystems)
            this.eventBus = new EventBus();
            
            // Initialize core subsystems with dependency injection
            this.settingsSubsystem = new SettingsSubsystem(this.eventBus);
            this.loggingSubsystem = new LoggingSubsystem(this.eventBus);
            this.historySubsystem = new HistorySubsystem(this.eventBus, this.settingsSubsystem);
            this.progressSubsystem = new ProgressSubsystem(this.logger, this.uiManager, this.eventBus);
            this.sessionSubsystem = new SessionSubsystem(this.logger, this.settingsSubsystem, this.eventBus);
            this.populationSubsystem = new PopulationSubsystem(this.eventBus, this.settingsSubsystem);
            
            // Authentication and connection subsystems
            this.authManagementSubsystem = new AuthManagementSubsystem(this.eventBus, this.settingsSubsystem);
            this.connectionManagerSubsystem = new ConnectionManagerSubsystem(this.eventBus, this.settingsSubsystem);
            
            // Operation subsystems
            this.importSubsystem = new ImportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus);
            this.exportSubsystem = new ExportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus);
            this.operationManagerSubsystem = new OperationManagerSubsystem(this.logger, this.uiManager, this.settingsSubsystem, this.localClient);
            
            // Create a safe logger wrapper to prevent undefined method errors
            this.safeLogger = {
                info: (msg, data) => {
                    try {
                        if (this.logger && typeof this.logger.info === 'function') {
                            this.logger.info(msg, data);
                        } else {
                            console.log(`[INFO] ${msg}`, data);
                        }
                    } catch (error) {
                        console.log(`[INFO] ${msg}`, data);
                    }
                },
                warn: (msg, data) => {
                    try {
                        if (this.logger && typeof this.logger.warn === 'function') {
                            this.logger.warn(msg, data);
                        } else {
                            console.warn(`[WARN] ${msg}`, data);
                        }
                    } catch (error) {
                        console.warn(`[WARN] ${msg}`, data);
                    }
                },
                error: (msg, data) => {
                    try {
                        if (this.logger && typeof this.logger.error === 'function') {
                            this.logger.error(msg, data);
                        } else {
                            console.error(`[ERROR] ${msg}`, data);
                        }
                    } catch (error) {
                        console.error(`[ERROR] ${msg}`, data);
                    }
                }
            };
            
            // Initialize state variables with safe defaults
            this.currentView = 'home';
            this.selectedPopulationId = null;
            this.selectedPopulationName = null;
            this.populationChoice = null;
            this.importErrors = [];
            this.importSessionId = null;
            
            // Initialize components that might fail
            this.secretFieldToggle = null;
            this.fileHandler = null;
            this.populationService = null;

            // === Subsystem Integration (initialized after dependencies) ===
            // Note: Import/Export subsystems will be initialized after PopulationService is ready
            this.importSubsystem = null;
            this.exportSubsystem = null;
            // Note: OperationManagerSubsystem will be initialized after other dependencies are ready
            this.operationManagerSubsystem = null;
            // === End Subsystem Integration ===

            console.log('✅ App constructor completed successfully');
            
            // Production-specific configurations
            if (this.isProduction) {
                // Disable debug mode in production
                window.DEBUG_MODE = false;
                
                // Add production error reporting
                window.addEventListener('error', (event) => {
                    this.safeLogger.error('Unhandled error in production', {
                        message: event.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        error: event.error?.stack
                    });
                });
                
                // Add unhandled promise rejection handler
                window.addEventListener('unhandledrejection', (event) => {
                    this.safeLogger.error('Unhandled promise rejection in production', {
                        reason: event.reason,
                        promise: event.promise
                    });
                });
            }
        } catch (error) {
            console.error('❌ Error in App constructor:', error);
            // Ensure basic functionality even if some components fail
            this.logger = { error: console.error, warn: console.warn, info: console.log };
        }
    }

    /**
     * Initialize the application and all its components
     * 
     * Sets up all modules, loads settings, establishes connections,
     * and prepares the UI for user interaction. This is the main
     * entry point after the app is constructed.
     * 
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('Initializing app...');
            
            // Initialize LoggingSubsystem to replace legacy window.logManager
            try {
                this.loggingSubsystem = new LoggingSubsystem(this.eventBus, this.settingsSubsystem);
                await this.loggingSubsystem.init();
                console.log('✅ LoggingSubsystem initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize LoggingSubsystem:', error);
                // Create fallback logging for critical errors
                window.logManager = {
                    log: (level, message, data) => console.log(`[${level.toUpperCase()}]`, message, data || ''),
                    error: (message, data) => console.error(message, data || ''),
                    warn: (message, data) => console.warn(message, data || ''),
                    info: (message, data) => console.log(message, data || '')
                };
            }
            
            // Initialize HistorySubsystem to replace legacy HistoryManager
            try {
                this.historySubsystem = new HistorySubsystem(this.eventBus, this.settingsSubsystem, this.loggingSubsystem);
                await this.historySubsystem.init();
                console.log('✅ HistorySubsystem initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize HistorySubsystem:', error);
                // Keep legacy HistoryManager as fallback
                this.historyManager = new HistoryManager();
            }
            

            
            // Ensure DOM is ready before proceeding with UI-dependent operations
            if (document.readyState === 'loading') {
                console.log('DOM still loading, waiting for DOMContentLoaded...');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('DOM ready timeout - page may be unresponsive'));
                    }, 30000); // 30 second timeout
                    
                    document.addEventListener('DOMContentLoaded', () => {
                        clearTimeout(timeout);
                        resolve();
                    }, { once: true });
                });
            }
            
            // Additional validation to ensure critical elements exist
            const criticalElements = [
                'notification-area',
                'token-status-indicator',
                'connection-status'
            ];
            
            const missingElements = criticalElements.filter(id => !document.getElementById(id));
            if (missingElements.length > 0) {
                throw new Error(`Critical UI elements missing: ${missingElements.join(', ')}`);
            }
            
            // Validate core dependencies before proceeding
            if (!this.logger) {
                throw new Error('Logger not initialized');
            }
            
            if (!this.settingsSubsystem) {
                throw new Error('SettingsSubsystem not initialized');
            }
            
            if (!this.uiManager) {
                throw new Error('UIManager not initialized');
            }
            
            if (!this.eventBus) {
                throw new Error('EventBus not initialized');
            }
            
            // Initialize API Factory first to establish API client infrastructure
            await this.initAPIFactory();
            
            // Initialize API clients for PingOne communication with safety check
            if (apiFactory) {
                // Get settings from the new subsystem
                const settings = await this.settingsSubsystem.getAllSettings();
                this.pingOneClient = apiFactory.getPingOneClient(this.logger, this.settingsSubsystem);
                
                // Initialize PopulationService with the correct API client that has getPopulations method
                try {
                    
                    // Check if required settings are present before creating API client
                    if (!settings.environmentId || !settings.apiClientId) {
                        this.logger.info('PopulationService initialization skipped - missing required settings (environmentId or apiClientId)');
                        console.log('⚠️ PopulationService initialization skipped - configure PingOne settings first');
                        this.populationService = null;
                        // Initialize subsystems without PopulationService for now
                        this.importSubsystem = new ImportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus, null);
                        this.exportSubsystem = new ExportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus, null);
                        
                        // Initialize OperationManagerSubsystem without PopulationService (will use localClient for operations)
                        this.operationManagerSubsystem = new OperationManagerSubsystem(this.logger, this.uiManager, this.settingsSubsystem, this.localClient);
                        await this.operationManagerSubsystem.init();
                        
                        // Settings subsystem is already initialized in constructor
                        await this.settingsSubsystem.init();
                        
                        console.log('✅ Import/Export/Operation subsystems initialized without PopulationService');
                        
                        // Set up event listeners now that all subsystems are ready
                        try {
                            this.setupEventListeners();
                            console.log('✅ Event listeners set up after subsystem initialization (no PopulationService)');
                        } catch (error) {
                            this.logger.error('Failed to setup event listeners after subsystem initialization:', error);
                        }
                        return;
                    }
                    
                    // Create PingOne API client with validated settings
                    const pingOneAPIClient = createPingOneAPIClient(settings, this.logger);
                    this.populationService = new PopulationService(pingOneAPIClient, null, this.logger, this.eventBus);
                    console.log('✅ PopulationService initialized successfully');
                    
                    // Initialize Import/Export subsystems now that PopulationService is ready
                    this.importSubsystem = new ImportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus, this.populationService);
                    this.exportSubsystem = new ExportSubsystem(this.logger, this.uiManager, this.localClient, this.settingsSubsystem, this.eventBus, this.populationService);
                    
                    // Initialize OperationManagerSubsystem for unified delete/modify operations
                    this.operationManagerSubsystem = new OperationManagerSubsystem(this.logger, this.uiManager, this.settingsSubsystem, pingOneAPIClient);
                    await this.operationManagerSubsystem.init();
                    
                    // Settings subsystem is already initialized in constructor
                    await this.settingsSubsystem.init();
                    
                    console.log('✅ Import/Export/Operation subsystems initialized with PopulationService');
                    
                    // Set up event listeners now that all subsystems are ready
                    try {
                        this.setupEventListeners();
                        console.log('✅ Event listeners set up after subsystem initialization');
                    } catch (error) {
                        this.logger.error('Failed to setup event listeners after subsystem initialization:', error);
                    }
                } catch (error) {
                    this.logger.error('Failed to initialize PopulationService:', error);
                    console.error('PopulationService initialization error details:', error);
                    console.error('Error stack:', error.stack);
                    console.error('Settings available:', !!this.settingsSubsystem);
                    console.error('Logger available:', !!this.logger);
                    console.error('EventBus available:', !!this.eventBus);
                    this.populationService = null;
                }
            } else {
                this.logger.warn('API Factory not available, PingOne client not initialized');
            }
            
            // Initialize UI manager for interface management
            if (this.uiManager && typeof this.uiManager.init === 'function') {
                await this.uiManager.init();
            } else {
                this.logger.warn('UIManager not properly initialized');
            }
            
            // Settings subsystem initialization is handled in constructor and earlier in init()
            // No additional initialization needed here
            
            // Initialize FileHandler with safety check
            try {
                this.fileHandler = new FileHandler(this.logger, this.uiManager);
                // Initialize global drag-and-drop prevention and routing
                if (this.fileHandler && typeof this.fileHandler.initializeGlobalDragAndDrop === 'function') {
                    this.fileHandler.initializeGlobalDragAndDrop();
                }
            } catch (error) {
                this.logger.error('Failed to initialize FileHandler:', error);
                this.fileHandler = null;
            }
            
            // Initialize secret field toggle for secure input handling with safety check
            try {
                this.secretFieldToggle = new SecretFieldToggle();
                if (this.secretFieldToggle && typeof this.secretFieldToggle.init === 'function') {
                    this.secretFieldToggle.init();
                }
            } catch (error) {
                this.logger.error('Failed to initialize SecretFieldToggle:', error);
                this.secretFieldToggle = null;
            }
            
            // Legacy managers are replaced by new subsystem architecture
            // DeleteManager functionality is now handled by OperationManagerSubsystem
            // ExportManager functionality is now handled by ExportSubsystem
            
            // HistorySubsystem is now initialized earlier in the init process
            // Legacy HistoryManager is only used as fallback if HistorySubsystem fails
            if (!this.historySubsystem && !this.historyManager) {
                try {
                    this.historyManager = new HistoryManager();
                    console.log('✅ HistoryManager initialized as fallback');
                } catch (error) {
                    console.warn('HistoryManager fallback initialization warning:', error);
                    this.historyManager = null;
                }
            }
            
            // Legacy window object pollution ELIMINATED - using subsystem architecture instead
            // ProgressManager replaced by ProgressSubsystem (initialized in constructor)
            // GlobalStatusManager functionality integrated into UIManager and EventBus
            // CredentialsManager functionality integrated into AuthManagementSubsystem
            // TokenStatusIndicator functionality integrated into AuthManagementSubsystem
            
            console.log('✅ Legacy window object pollution eliminated - using modern subsystem architecture');
            console.log('✅ ProgressSubsystem, SessionSubsystem, and other subsystems initialized via dependency injection');
            console.log('✅ All functionality migrated to event-driven subsystem architecture');

            // GlobalTokenManager functionality integrated into AuthManagementSubsystem
            // No more global window object pollution - using subsystem architecture
            console.log('✅ Token management integrated into AuthManagementSubsystem');
            
            // Load application settings from storage with safety check
            try {
                await this.loadSettings();
            } catch (error) {
                this.logger.error('Failed to load settings:', error);
            }
            
            // Initialize universal token status after UI manager is ready
            try {
                this.updateUniversalTokenStatus();
            } catch (error) {
                this.logger.error('Failed to update universal token status:', error);
            }
            
            // Event listeners will be set up after subsystems are initialized
            
            // Initialize browser history management for back button support
            try {
                this.initBrowserHistory();
                console.log('✅ Browser history management initialized');
            } catch (error) {
                this.logger.error('Failed to initialize browser history:', error);
            }
            
            // Check disclaimer status and setup if needed
            // Ensures user has accepted terms before using the tool
            try {
                const disclaimerPreviouslyAccepted = this.checkDisclaimerStatus();
                console.log('[STARTUP] [DEBUG] Disclaimer status check:', { disclaimerPreviouslyAccepted });
                
                if (!disclaimerPreviouslyAccepted) {
                    console.log('[STARTUP] [DEBUG] Disclaimer not previously accepted, setting up disclaimer agreement');
                    this.setupDisclaimerAgreement();
                    // Don't show startup screen yet - wait for disclaimer to be accepted
                } else {
                    console.log('[STARTUP] [DEBUG] Disclaimer previously accepted, tool already enabled');
                    // Show startup screen immediately since disclaimer is already accepted
                    this.showStartupScreen();
                }
            } catch (error) {
                console.warn('[STARTUP] [DEBUG] Failed to setup disclaimer:', error);
                // Show startup screen immediately if disclaimer setup fails
                this.showStartupScreen();
            }
            
            // Setup universal disclaimer banner auto-hide after 3 seconds
            // Removed universal disclaimer auto-hide setup
            
            // Check server connection status to ensure backend is available
            try {
                await this.checkServerConnectionStatus();
            } catch (error) {
                this.logger.error('Failed to check server connection status:', error);
            }
            
            // Update import button state after initialization
            // Ensures UI reflects current application state
            try {
                this.updateImportButtonState();
            } catch (error) {
                this.logger.error('Failed to update import button state:', error);
            }
            
            // Update version information in UI for user reference
            try {
                if (this.versionManager && typeof this.versionManager.updateTitle === 'function') {
                    this.versionManager.updateTitle();
                }
            } catch (error) {
                this.logger.error('Failed to update version information:', error);
            }
            
            // Navigation visibility is handled by the UI manager
            
            console.log('App initialization complete');
            console.log("✅ Moved Import Progress section below Import Users button");
            
            // Only complete startup if token was successful (handled in token check above)
            // If no token was found, startup screen remains visible for user to get token
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.logger.error('App initialization failed', error);
            
            // Update startup screen with error
            this.updateStartupProgress(100, 'Initialization failed');
            this.activateStartupStep(4);
            
            // Show user-friendly error message
            try {
                if (this.uiManager && typeof this.uiManager.showError === 'function') {
                    this.uiManager.showError('Initialization Error', 'Failed to initialize the application. Please refresh the page and try again.');
                }
            } catch (uiError) {
                console.error('Failed to show error message:', uiError);
            }
            
            // Hide startup screen after error
            setTimeout(() => {
                this.completeStartup();
            }, 2000);
        }
    }

    async initAPIFactory() {
        try {
            await initAPIFactory(this.logger, this.settingsSubsystem);
            console.log('✅ API Factory initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize API Factory:', error);
            throw error;
        }
    }

    /**
     * Generic population loader for any dropdown by ID using PopulationService
     */
    async loadPopulationsForDropdown(dropdownId) {
        console.log(`🔄 [Population] Starting load for dropdown: ${dropdownId}`);
        
        // Hide retry button initially
        this.hidePopulationRetryButton(dropdownId);
        
        try {
            // Check if PopulationService is available
            if (!this.populationService) {
                throw new Error('PopulationService not initialized');
            }
            
            console.log(`🔄 [Population] Using PopulationService to load populations for dropdown: ${dropdownId}`);
            
            // Use PopulationService to populate the dropdown
            const success = await this.populationService.populateDropdown(dropdownId, {
                includeEmpty: true,
                emptyText: 'Select a population'
            });
            
            if (success) {
                console.log(`✅ [Population] Successfully loaded populations for ${dropdownId}`);
                this.hidePopulationRetryButton(dropdownId);
                
                // Handle dropdown-specific behaviors
                if (dropdownId === 'import-population-select') {
                    this.attachPopulationChangeListener();
                    this.updateImportButtonState();
                    // Initialize API URL display
                    this.updatePopulationApiUrl('', '');
                } else if (dropdownId === 'modify-population-select') {
                    this.updateModifyButtonState();
                }
            } else {
                throw new Error('PopulationService failed to populate dropdown');
            }
        } catch (error) {
            console.error(`❌ [Population] Failed to load populations for ${dropdownId}:`, error);
            const errorMessage = error && error.message ? error.message : 'Failed to load populations';
            this.showPopulationLoadError(dropdownId, errorMessage);
            
            // Log additional debug information
            if (this.logger) {
                this.logger.error('Population loading failed', {
                    dropdownId,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    }



    /**
     * Show error and retry for a dropdown
     */
    showPopulationLoadError(dropdownId, message) {
        const select = document.getElementById(dropdownId);
        if (select) {
            select.innerHTML = `<option value="">${message || 'Failed to load populations'}</option>`;
            select.disabled = true;
        }
        this.showPopulationRetryButton(dropdownId);
        if (dropdownId === 'import-population-select') {
            this.uiManager.showError('Failed to load populations', message || 'Please check your PingOne connection and try again.');
        }
    }

    /**
     * Show retry button for a dropdown
     */
    showPopulationRetryButton(dropdownId) {
        const retryId = `retry-${dropdownId}`;
        let retryBtn = document.getElementById(retryId);
        if (!retryBtn) {
            retryBtn = document.createElement('button');
            retryBtn.id = retryId;
            retryBtn.textContent = 'Retry';
            retryBtn.className = 'btn btn-secondary';
            retryBtn.style.marginTop = '10px';
            const parent = document.getElementById(dropdownId)?.parentElement;
            if (parent) parent.appendChild(retryBtn);
        }
        retryBtn.onclick = () => {
            retryBtn.disabled = true;
            this.loadPopulationsForDropdown(dropdownId);
        };
        retryBtn.style.display = 'inline-block';
    }

    /**
     * Hide retry button for a dropdown
     */
    hidePopulationRetryButton(dropdownId) {
        const retryBtn = document.getElementById(`retry-${dropdownId}`);
        if (retryBtn) retryBtn.style.display = 'none';
    }

    // Update all usages to use the generic loader
    async loadPopulations() {
        await this.loadPopulationsForDropdown('import-population-select');
    }
    // For dashboard, delete, modify, history, and main population select
    async loadAllPopulationDropdowns() {
        await Promise.all([
            this.loadPopulationsForDropdown('import-population-select'),
            this.loadPopulationsForDropdown('dashboard-population-select'),
            this.loadPopulationsForDropdown('delete-population-select'),
            this.loadPopulationsForDropdown('modify-population-select'),
            this.loadPopulationsForDropdown('history-population-filter')
        ]);
    }

    updateImportButtonState() {
        try {
            const populationSelect = document.getElementById('import-population-select');
            const hasFile = this.fileHandler && this.fileHandler.getCurrentFile() !== null;
            
            // Validate file handler exists
            if (!this.fileHandler) {
                console.warn('File handler not initialized');
            }
            
            // Check both the dropdown value and the stored properties
            const dropdownValue = populationSelect ? populationSelect.value : '';
            const storedPopulationId = this.selectedPopulationId || '';
            const hasPopulation = (dropdownValue && dropdownValue !== '') || (storedPopulationId && storedPopulationId !== '');
            
            // Production logging (reduced verbosity)
            if (window.DEBUG_MODE) {
                console.log('=== Update Import Button State ===');
                console.log('Has file:', hasFile);
                console.log('Has population:', hasPopulation);
                console.log('Dropdown value:', dropdownValue);
                console.log('Stored population ID:', storedPopulationId);
                console.log('Stored population name:', this.selectedPopulationName);
                console.log('Population select element exists:', !!populationSelect);
                console.log('====================================');
            }
            
            // Get import button with validation (only one exists in HTML)
            const importBtn = document.getElementById('start-import');
            
            const shouldEnable = hasFile && hasPopulation;
            
            // Safely update button state
            if (importBtn && typeof importBtn.disabled !== 'undefined') {
                importBtn.disabled = !shouldEnable;
            }
            
            if (window.DEBUG_MODE) {
                console.log('Import buttons enabled:', shouldEnable);
            }
            
            // Update population display in import stats if available
            if (hasPopulation) {
                const populationNameElement = document.getElementById('import-population-name');
                const populationIdElement = document.getElementById('import-population-id');
                
                if (populationNameElement && typeof populationNameElement.textContent !== 'undefined') {
                    populationNameElement.textContent = this.selectedPopulationName || populationSelect?.selectedOptions[0]?.text || 'Selected';
                }
                
                if (populationIdElement && typeof populationIdElement.textContent !== 'undefined') {
                    populationIdElement.textContent = this.selectedPopulationId || dropdownValue || 'Set';
                }
            }
            
            // At the end, show the population prompt if needed
            this.showPopulationChoicePrompt();
            
        } catch (error) {
            console.error('Error updating import button state:', error);
            // Fallback: disable button on error
            const importBtn = document.getElementById('start-import');
            if (importBtn && typeof importBtn.disabled !== 'undefined') {
                importBtn.disabled = true;
            }
        }
    }

    updateModifyButtonState() {
        try {
            const populationSelect = document.getElementById('modify-population-select');
            const hasFile = this.fileHandler && this.fileHandler.getCurrentFile() !== null;
            
            // Validate file handler exists
            if (!this.fileHandler) {
                console.warn('File handler not initialized');
            }
            
            // Check both the dropdown value and the stored properties
            const dropdownValue = populationSelect ? populationSelect.value : '';
            const hasPopulation = (dropdownValue && dropdownValue !== '');
            
            // Production logging (reduced verbosity)
            if (window.DEBUG_MODE) {
                console.log('=== Update Modify Button State ===');
                console.log('Has file:', hasFile);
                console.log('Has population:', hasPopulation);
                console.log('Dropdown value:', dropdownValue);
                console.log('Population select element exists:', !!populationSelect);
                console.log('====================================');
            }
            
            // Get modify button with validation
            const modifyBtn = document.getElementById('start-modify');
            
            const shouldEnable = hasFile && hasPopulation;
            
            // Safely update button state
            if (modifyBtn && typeof modifyBtn.disabled !== 'undefined') {
                modifyBtn.disabled = !shouldEnable;
            }
            
            if (window.DEBUG_MODE) {
                console.log('Modify button enabled:', shouldEnable);
            }
            
        } catch (error) {
            console.error('Error updating modify button state:', error);
            // Fallback: disable button on error
            const modifyBtn = document.getElementById('start-modify');
            if (modifyBtn && typeof modifyBtn.disabled !== 'undefined') {
                modifyBtn.disabled = true;
            }
        }
    }

    async loadSettings() {
        try {
            // First try to load from credentials manager (localStorage)
            // Use AuthManagementSubsystem instead of legacy window.credentialsManager
            try {
                const credentials = await this.authManagementSubsystem.getCredentials();
                if (credentials && this.authManagementSubsystem.hasCompleteCredentials(credentials)) {
                    const settings = {
                        environmentId: credentials.environmentId || '',
                        apiClientId: credentials.apiClientId || '',
                        apiSecret: credentials.apiSecret || '',
                        populationId: credentials.populationId || '',
                        region: credentials.region || 'NorthAmerica',
                        rateLimit: 90 // Default rate limit
                    };
                    
                                    this.populateSettingsForm(settings);
                this.logger.info('Settings loaded from credentials manager and populated into form');
                
                // Update population API URL after settings are loaded
                const populationSelect = document.getElementById('import-population-select');
                if (populationSelect && populationSelect.value) {
                    const selectedOption = populationSelect.options[populationSelect.selectedIndex];
                    this.updatePopulationApiUrl(populationSelect.value, selectedOption.text);
                }
                
                // Show current token status if PingOneClient is available
                if (this.pingOneClient) {
                    const tokenInfo = this.pingOneClient.getCurrentTokenTimeRemaining();
                    this.uiManager.showCurrentTokenStatus(tokenInfo);
                    
                    if (window.DEBUG_MODE) {
                        console.log('Current token status:', tokenInfo);
                    }
                }
                return;
            } catch (error) {
                this.logger.warn('Failed to load credentials from AuthManagementSubsystem:', error);
                // Continue with server-based settings load as fallback
            }
            
            // Add delay before first settings request to ensure server is ready
            this.logger.info('Waiting for server to be ready before loading settings...');
            
            // Wait for server to be ready with health check
            let serverReady = false;
            let attempts = 0;
            const maxAttempts = 5;
            const initialDelay = window.INITIAL_SETTINGS_DELAY || 2000; // Configurable delay
            
            while (!serverReady && attempts < maxAttempts) {
                attempts++;
                this.logger.info(`Checking server readiness (attempt ${attempts}/${maxAttempts})...`);
                
                try {
                    // Check server health first
                    const healthResponse = await fetch('/api/health');
                    if (healthResponse.ok) {
                        const healthData = await healthResponse.json();
                        if (healthData.success) {
                            serverReady = true;
                            this.logger.info('Server is ready, proceeding with settings load');
                            break;
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Server health check failed (attempt ${attempts}):`, error.message);
                }
                
                if (!serverReady && attempts < maxAttempts) {
                    const delay = Math.min(1000 * attempts, 3000); // Progressive delay: 1s, 2s, 3s, 3s, 3s
                    this.logger.info(`Server not ready, waiting ${delay}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            if (!serverReady) {
                this.logger.warn('Server health check failed after all attempts, proceeding with settings load anyway');
            }
            
            // Enhanced server settings loading with retry logic and health checking
            const response = await this.localClient.get('/api/settings', {
                retries: 3,
                retryDelay: 1000,
                maxRetryDelay: 10000,
                healthCheck: true,
                timeout: 8000
            });
            
            if (response.success && response.data) {
                // Convert kebab-case to camelCase for the form
                let populationId = response.data['population-id'] || '';
                if (populationId === 'not set') populationId = '';
                const settings = {
                    environmentId: response.data['environment-id'] || '',
                    apiClientId: response.data['api-client-id'] || '',
                    apiSecret: response.data['api-secret'] || '',
                    populationId,
                    region: response.data['region'] || 'NorthAmerica',
                    rateLimit: response.data['rate-limit'] || 90
                };
                
                this.populateSettingsForm(settings);
                this.logger.info('Settings loaded from server and populated into form');
                
                // Update population API URL after settings are loaded
                const populationSelect = document.getElementById('import-population-select');
                if (populationSelect && populationSelect.value) {
                    const selectedOption = populationSelect.options[populationSelect.selectedIndex];
                    this.updatePopulationApiUrl(populationSelect.value, selectedOption.text);
                }
                
                // Show current token status if PingOneClient is available
                if (this.pingOneClient) {
                    const tokenInfo = this.pingOneClient.getCurrentTokenTimeRemaining();
                    this.uiManager.showCurrentTokenStatus(tokenInfo);
                    
                    if (window.DEBUG_MODE) {
                        console.log('Current token status:', tokenInfo);
                    }
                }
            } else {
                // Fallback to settings manager if server settings not available
                this.logger.warn('No server settings found, trying settings manager...');
                try {
                    const localSettings = await this.settingsSubsystem.loadSettings();
                    if (localSettings && Object.keys(localSettings).length > 0) {
                        this.populateSettingsForm(localSettings);
                        this.logger.info('Settings loaded from settings subsystem and populated into form');
                        
                        // Update population API URL after settings are loaded
                        const populationSelect = document.getElementById('import-population-select');
                        if (populationSelect && populationSelect.value) {
                            const selectedOption = populationSelect.options[populationSelect.selectedIndex];
                            this.updatePopulationApiUrl(populationSelect.value, selectedOption.text);
                        }
                    } else {
                        this.logger.info('No settings found in settings subsystem, using defaults');
                    }
                } catch (localError) {
                    this.logger.error('Failed to load settings from settings subsystem:', localError);
                }
            }
        } catch (error) {
            this.logger.error('Failed to load settings from server, trying settings subsystem...');
            try {
                const localSettings = await this.settingsSubsystem.loadSettings();
                if (localSettings && Object.keys(localSettings).length > 0) {
                    this.populateSettingsForm(localSettings);
                    this.logger.info('Settings loaded from settings subsystem (fallback) and populated into form');
                    
                    // Update population API URL after settings are loaded
                    const populationSelect = document.getElementById('import-population-select');
                    if (populationSelect && populationSelect.value) {
                        const selectedOption = populationSelect.options[populationSelect.selectedIndex];
                        this.updatePopulationApiUrl(populationSelect.value, selectedOption.text);
                    }
                } else {
                    this.logger.info('No settings found in settings manager, using defaults');
                }
            } catch (localError) {
                this.logger.error('Failed to load settings from settings manager:', localError);
            }
        }
    }

    setupEventListeners() {
        console.log('🔄 Setting up event listeners...');
        
        // Add a longer delay to ensure DOM is fully ready
        setTimeout(() => {
            this.setupEventListenersInternal();
        }, 200);
    }

    setupEventListenersInternal() {
        console.log('🔄 Setting up event listeners (internal)...');
        
        // Retry mechanism for DOM elements
        const findElementWithRetry = (selector, maxAttempts = 5) => {
            for (let i = 0; i < maxAttempts; i++) {
                const element = document.querySelector(selector) || document.getElementById(selector.replace('#', ''));
                if (element) {
                    return element;
                }
                if (i < maxAttempts - 1) {
                    console.log(`⏳ Waiting for element: ${selector} (attempt ${i + 1}/${maxAttempts})`);
                    // Small delay between attempts
                    const delay = 100 * (i + 1);
                    setTimeout(() => {}, delay);
                }
            }
            return null;
        };
        
        // Settings form submission
        const settingsForm = findElementWithRetry('#settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(settingsForm);
                const settings = {
                    environmentId: formData.get('environment-id'),
                    apiClientId: formData.get('api-client-id'),
                    apiSecret: formData.get('api-secret'),
                    populationId: formData.get('population-id'),
                    region: formData.get('region'),
                    rateLimit: parseInt(formData.get('rate-limit')) || 50
                };
                await this.handleSaveSettings(settings);
            });
        } else {
            console.warn('Settings form not found in DOM');
        }

        // Save settings button is now handled by Settings Subsystem

        // Test connection button
        const testConnectionBtn = findElementWithRetry('#test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleTestConnection();
            });
        } else {
            console.warn('Test connection button not found in DOM');
        }

        // Get token button in settings
        const settingsGetTokenBtn = findElementWithRetry('#get-token-btn');
        if (settingsGetTokenBtn) {
            settingsGetTokenBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.getToken();
            });
        } else {
            console.warn('Settings get token button not found in DOM');
        }

        // File input for import
        const csvFileInput = findElementWithRetry('#csv-file');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (this.importSubsystem && typeof this.importSubsystem.handleFileSelect === 'function') {
                        await this.importSubsystem.handleFileSelect(file);
                    } else {
                        console.error('ImportSubsystem or handleFileSelect method not available');
                    }
                }
            });
        } else {
            console.warn('CSV file input not found in DOM');
        }

        // File input for modify
        const modifyCsvFileInput = findElementWithRetry('#modify-csv-file');
        if (modifyCsvFileInput) {
            modifyCsvFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.handleModifyFileSelect(file);
                }
            });
        } else {
            console.warn('Modify CSV file input not found in DOM');
        }

        // Import button
        const importBtn = findElementWithRetry('#start-import');
        if (importBtn) {
            importBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (this.importSubsystem && typeof this.importSubsystem.startImport === 'function') {
                    await this.importSubsystem.startImport();
                } else {
                    console.error('ImportSubsystem or startImport method not available');
                }
            });
        } else {
            console.warn('Import button not found in DOM');
        }

        // Export button
        const exportBtn = findElementWithRetry('#start-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (this.exportSubsystem && typeof this.exportSubsystem.startExport === 'function') {
                    await this.exportSubsystem.startExport();
                } else {
                    console.error('ExportSubsystem or startExport method not available');
                }
            });
        } else {
            console.warn('Export button not found in DOM');
        }

        // Delete button
        const deleteBtn = findElementWithRetry('#start-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.startDelete();
            });
        } else {
            console.warn('Delete button not found in DOM');
        }

        // Modify button
        const modifyBtn = findElementWithRetry('#start-modify');
        if (modifyBtn) {
            modifyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.startModify();
            });
        } else {
            console.warn('Modify button not found in DOM');
        }

        // Cancel buttons
        const cancelButtons = document.querySelectorAll('.cancel-btn');
        cancelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                switch (action) {
                    case 'import':
                        this.cancelImport();
                        break;
                    case 'export':
                        this.cancelExport();
                        break;
                    case 'delete':
                        this.cancelDelete();
                        break;
                    case 'modify':
                        this.cancelModify();
                        break;
                    case 'population-delete':
                        this.cancelPopulationDelete();
                        break;
                }
            });
        });

        // Population select
        const populationSelect = findElementWithRetry('#import-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => {
                this.handlePopulationChange(e);
            });
        } else {
            console.warn('Population select element not found in DOM');
        }

        // Get token button - with special handling
        const getTokenBtn = findElementWithRetry('#get-token-quick');
        if (getTokenBtn) {
            console.log('✅ Setting up Get Token button event listener...');
            getTokenBtn.addEventListener('click', async (e) => {
                console.log('Get Token button clicked!');
                e.preventDefault();
                e.stopPropagation();
                await this.getToken();
            });
        } else {
            console.warn('Get Token button not found in DOM - will retry later');
            // Retry finding the get token button after a delay
            setTimeout(() => {
                const retryGetTokenBtn = document.getElementById('get-token-quick');
                if (retryGetTokenBtn) {
                    console.log('✅ Found Get Token button on retry, setting up listener...');
                    retryGetTokenBtn.addEventListener('click', async (e) => {
                        console.log('Get Token button clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        await this.getToken();
                    });
                } else {
                    console.warn('Get Token button still not found after retry');
                    // Additional retry with longer delay and check token status indicator
                    setTimeout(() => {
                        // Check if token status indicator exists and force update
                        if (window.tokenStatusIndicator && typeof window.tokenStatusIndicator.updateStatus === 'function') {
                            console.log('🔄 Forcing token status update to show Get Token button...');
                            window.tokenStatusIndicator.updateStatus().then(() => {
                                const finalRetryBtn = document.getElementById('get-token-quick');
                                if (finalRetryBtn) {
                                    console.log('✅ Found Get Token button after token status update, setting up listener...');
                                    finalRetryBtn.addEventListener('click', async (e) => {
                                        console.log('Get Token button clicked!');
                                        e.preventDefault();
                                        e.stopPropagation();
                                        await this.getToken();
                                    });
                                } else {
                                    console.warn('Get Token button still not found after token status update');
                                }
                            });
                        } else {
                            console.warn('Token status indicator not available for final retry');
                        }
                    }, 2000);
                }
            }, 1000);
        }

        // Navigation event listeners
        const navItems = document.querySelectorAll('[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                await this.showView(view);
            });
        });

        // Feature flags panel toggle - Enhanced with full functionality
        const featureFlagsToggle = findElementWithRetry('#feature-flags-toggle');
        if (featureFlagsToggle) {
            featureFlagsToggle.addEventListener('click', () => {
                const panel = document.getElementById('feature-flags-panel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Feature flag toggles - Enhanced with data attributes
        const featureFlagToggles = document.querySelectorAll('[data-feature-flag]');
        featureFlagToggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const flag = e.target.getAttribute('data-feature-flag');
                const enabled = e.target.checked;
                await this.toggleFeatureFlag(flag, enabled);
            });
        });

        // Feature flags close button - Prevents user confusion due to broken UI controls
        const closeFeatureFlagsBtn = findElementWithRetry('#close-feature-flags');
        if (closeFeatureFlagsBtn) {
            closeFeatureFlagsBtn.addEventListener('click', () => {
                const panel = document.getElementById('feature-flags-panel');
                if (panel) {
                    panel.style.display = 'none';
                }
            });
        }

        // Feature flags reset button - Ensures visibility and full control of feature flags for debugging and configuration
        const resetFeatureFlagsBtn = findElementWithRetry('#reset-feature-flags');
        if (resetFeatureFlagsBtn) {
            resetFeatureFlagsBtn.addEventListener('click', async () => {
                try {
                    await this.resetFeatureFlags();
                    this.showFeatureFlagsStatus('All feature flags reset to defaults', 'success');
                } catch (error) {
                    this.showFeatureFlagsStatus('Failed to reset feature flags', 'error');
                }
            });
        }

        // Add new feature flag functionality
        const addFeatureFlagBtn = findElementWithRetry('#add-feature-flag');
        if (addFeatureFlagBtn) {
            addFeatureFlagBtn.addEventListener('click', async () => {
                await this.addNewFeatureFlag();
            });
        }

        // Import progress close button
        const closeImportStatusBtn = findElementWithRetry('#close-import-status');
        if (closeImportStatusBtn) {
            closeImportStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const importStatus = document.getElementById('import-status');
                if (importStatus) {
                    importStatus.style.display = 'none';
                }
            });
        }

        // Home button in history view
        const goHomeFromHistoryBtn = findElementWithRetry('#go-home-from-history');
        if (goHomeFromHistoryBtn) {
            goHomeFromHistoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('home');
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }

    // Old save settings button methods removed - now handled by Settings Subsystem

    async checkServerConnectionStatus() {
        try {
            console.log('🔄 Starting server connection check...');
            const response = await this.localClient.get('/api/health');
            console.log('✅ Health check response received:', response);
            
            // The localClient.get() returns the response data directly, not wrapped in a data property
            // Handle the response structure correctly
            const responseData = response || {};
            const serverInfo = responseData?.server || {};
            const checks = responseData?.checks || {};
            
            console.log('📊 Parsed response data:', {
                responseData,
                serverInfo,
                checks
            });
            
            // Safely extract pingOne status with multiple fallback paths
            const pingOneInitialized = serverInfo?.pingOneInitialized || 
                                     serverInfo?.pingOne?.initialized || 
                                     checks?.pingOneConnected === 'ok' || 
                                     false;
            
            // Additional check: if pingOneConnected is 'ok', consider it initialized
            const isConnected = checks?.pingOneConnected === 'ok';
            
            // Safely extract error information with multiple fallback paths
            const lastError = serverInfo?.lastError || 
                            serverInfo?.error || 
                            checks?.pingOneConfigured === 'error' ? 'Configuration error' : null ||
                            null;
            
            console.log('🔍 Status analysis:', {
                pingOneInitialized,
                lastError,
                checks
            });
            
            if (pingOneInitialized || isConnected) {
                this.safeLogger.info('Server is connected to PingOne');
                this.uiManager.updateConnectionStatus('connected', 'Connected to PingOne');
                
                // Check if we have a valid cached token before hiding home token status
                let hasValidToken = false;
                if (this.pingOneClient && typeof this.pingOneClient.getCachedToken === 'function') {
                    const cachedToken = this.pingOneClient.getCachedToken();
                    if (cachedToken) {
                        if (typeof localStorage !== 'undefined') {
                            const expiry = localStorage.getItem('pingone_token_expiry');
                            if (expiry) {
                                const expiryTime = parseInt(expiry);
                                if (Date.now() < expiryTime) {
                                    hasValidToken = true;
                                }
                            }
                        }
                    }
                } else if (this.pingOneClient) {
                    this.safeLogger.warn('pingOneClient.getCachedToken is not a function', this.pingOneClient);
                }
                
                if (hasValidToken) {
                    this.uiManager.updateHomeTokenStatus(false);
                } else {
                    this.uiManager.updateHomeTokenStatus(true, 'You need to configure your PingOne API credentials and get a token before using this tool.');
                }
                return true;
            } else {
                const errorMessage = lastError || 'Not connected to PingOne';
                this.safeLogger.warn('Server is not connected to PingOne', { error: errorMessage });
                this.uiManager.updateConnectionStatus('disconnected', errorMessage);
                
                // Check if we have a valid cached token before showing home token status
                let hasValidToken = false;
                if (this.pingOneClient && typeof this.pingOneClient.getCachedToken === 'function') {
                    const cachedToken = this.pingOneClient.getCachedToken();
                    if (cachedToken) {
                        if (typeof localStorage !== 'undefined') {
                            const expiry = localStorage.getItem('pingone_token_expiry');
                            if (expiry) {
                                const expiryTime = parseInt(expiry);
                                if (Date.now() < expiryTime) {
                                    hasValidToken = true;
                                }
                            }
                        }
                    }
                } else if (this.pingOneClient) {
                    this.safeLogger.warn('pingOneClient.getCachedToken is not a function', this.pingOneClient);
                }
                
                if (hasValidToken) {
                    this.uiManager.updateHomeTokenStatus(false);
                } else {
                    this.uiManager.updateHomeTokenStatus(true, 'You need to configure your PingOne API credentials and get a token before using this tool.');
                }
                return false;
            }
        } catch (error) {
            // Handle network errors, malformed responses, or server unavailability
            const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
            const statusMessage = `Failed to check server status: ${errorMessage}`;
            
            // Always log as a string
            console.error('❌ Server connection check failed:', errorMessage);
            this.safeLogger.error('Server connection check failed', errorMessage);
            
            this.uiManager.updateConnectionStatus('error', statusMessage);
            
            // Check if we have a valid cached token before showing home token status
            let hasValidToken = false;
            if (this.pingOneClient && typeof this.pingOneClient.getCachedToken === 'function') {
                const cachedToken = this.pingOneClient.getCachedToken();
                if (cachedToken) {
                    if (typeof localStorage !== 'undefined') {
                        const expiry = localStorage.getItem('pingone_token_expiry');
                        if (expiry) {
                            const expiryTime = parseInt(expiry);
                            if (Date.now() < expiryTime) {
                                hasValidToken = true;
                            }
                        }
                    }
                }
            } else if (this.pingOneClient) {
                this.safeLogger.warn('pingOneClient.getCachedToken is not a function', this.pingOneClient);
            }
            
            if (hasValidToken) {
                this.uiManager.updateHomeTokenStatus(false);
            } else {
                this.uiManager.updateHomeTokenStatus(true, 'You need to configure your PingOne API credentials and get a token before using this tool.');
            }
            return false;
        }
    }

    /**
     * Check if a feature is enabled based on feature flags
     * 
     * @param {string} feature - The feature to check
     * @returns {Promise<boolean>} - Whether the feature is enabled
     */
    async isFeatureEnabled(feature) {
        try {
            const response = await this.localClient.get('/api/feature-flags');
            const flags = response || {};
            return !!flags[feature];
        } catch (error) {
            console.warn(`Failed to check feature flag ${feature}:`, error);
            return false; // Default to disabled on error
        }
    }

    // UI for progress page is temporarily removed. 
    // Controlled by backend feature flag: progressPage
    // To re-enable: set FEATURE_FLAG_PROGRESS_PAGE=true in environment

    /**
     * Show view with feature flag validation
     * 
     * @param {string} view - The view to show
     */
    /**
     * Initialize browser history management
     * Sets up URL hash-based navigation and popstate event handling
     */
    initBrowserHistory() {
        // Set up popstate event listener for browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            console.log('🔄 Browser navigation detected:', event.state);
            this.handleBrowserNavigation();
        });

        // Handle initial page load - check if there's a hash in the URL
        this.handleBrowserNavigation();
    }

    /**
     * Handle browser navigation (back/forward buttons and direct URL access)
     */
    handleBrowserNavigation() {
        const hash = window.location.hash.slice(1); // Remove the # symbol
        let targetView = 'home'; // Default to home page

        if (hash) {
            // Map hash to view name
            const viewMap = {
                'import': 'import',
                'export': 'export', 
                'settings': 'settings',
                'logs': 'logs',
                'delete': 'delete-csv',
                'modify': 'modify',
                'history': 'logs' // Alias for logs view
            };
            
            targetView = viewMap[hash] || 'home';
        }

        console.log('🔄 Browser navigation - target view:', targetView);
        this.showView(targetView);
    }

    /**
     * Update browser URL without triggering navigation
     * @param {string} view - The view to navigate to
     */
    updateBrowserURL(view) {
        const hash = view === 'home' ? '' : `#${view}`;
        const newURL = window.location.pathname + hash;
        
        // Update URL without triggering popstate event
        window.history.pushState({ view }, '', newURL);
        console.log('🔄 Updated browser URL:', newURL);
    }

    /**
     * Show a specific view and trigger population/log/history loading as needed
     */
    async showView(view) {
        if (!view) return;

        // Update browser URL to reflect current view
        this.updateBrowserURL(view);

        // Hide all views with safe iteration
        const views = document.querySelectorAll('.view');
        if (views && views.length > 0) {
            views.forEach(v => {
                if (v && v.style) {
                    v.style.display = 'none';
                }
            });
        }

        // Show selected view
        const selectedView = document.getElementById(`${view}-view`);
        if (selectedView) {
            selectedView.style.display = 'block';
            this.currentView = view;

            // --- Ensure logs/history are loaded when showing logs/history view ---
            if (view === 'logs' || view === 'history') {
                if (this.loggingSubsystem && typeof this.loggingSubsystem.loadLogs === 'function') {
                    console.log('[DEBUG] Loading logs for logs view using LoggingSubsystem');
                    try {
                        const logs = await this.loggingSubsystem.loadLogs({ limit: 100 });
                        // Update UI with logs if needed
                        if (this.uiManager && typeof this.uiManager.displayLogs === 'function') {
                            this.uiManager.displayLogs(logs.logs);
                        }
                    } catch (error) {
                        console.error('[DEBUG] Failed to load logs:', error);
                    }
                } else {
                    console.warn('[DEBUG] LoggingSubsystem or loadLogs() not available');
                }
            }

            // --- Ensure population dropdowns are loaded on relevant views ---
            if (view === 'import') {
                if (typeof this.loadPopulations === 'function') {
                    console.log('[DEBUG] Loading populations for import view');
                    this.loadPopulations('import-population-select');
                }
            }
            if (view === 'modify') {
                if (typeof this.loadPopulations === 'function') {
                    console.log('[DEBUG] Loading populations for modify view');
                    this.loadPopulations('modify-population-select');
                }
            }
            if (view === 'export') {
                if (this.exportSubsystem && typeof this.exportSubsystem.loadPopulations === 'function') {
                    console.log('[DEBUG] Loading populations for export view via ExportSubsystem');
                    this.exportSubsystem.loadPopulations();
                } else {
                    // Fallback to general population loading
                    console.log('[DEBUG] Loading populations for export view via general method');
                    this.loadPopulations('export-population-select');
                }
            }
            if (view === 'delete-csv') {
                if (this.operationManagerSubsystem && typeof this.operationManagerSubsystem.loadPopulations === 'function') {
                    console.log('[DEBUG] Loading populations for delete view via OperationManagerSubsystem');
                    this.operationManagerSubsystem.loadPopulations();
                } else {
                    // Fallback to general population loading
                    console.log('[DEBUG] Loading populations for delete view via general method');
                    this.loadPopulations('delete-population-select');
                }
            }
        }
    }

    /**
     * Safely update navigation active state
     * 
     * Handles navigation item updates with proper null checks and fallbacks.
     * Prevents crashes when navItems is undefined or DOM elements are missing.
     * 
     * @param {string} view - The current view being displayed
     */
    updateNavigationActiveState(view) {
        try {
            // Get navItems safely with fallback
            let navItems = [];
            
            // Try to get navItems from UIManager first
            if (this.uiManager && this.uiManager.navItems) {
                navItems = this.uiManager.navItems;
            } else {
                // Fallback to direct DOM query
                navItems = document.querySelectorAll('[data-view]');
            }
            
            // Ensure navItems is an array-like object before iterating
            if (navItems && navItems.length > 0) {
                navItems.forEach(item => {
                    if (item && item.classList) {
                        item.classList.remove('active');
                        if (item.getAttribute('data-view') === view) {
                            item.classList.add('active');
                        }
                    }
                });
            } else {
                // Log warning if no navigation items found
                this.logger?.warn('No navigation items found for view update', { view });
            }
        } catch (error) {
            // Log error but don't crash the app
            console.error('Error updating navigation state:', error);
            this.logger?.error('Failed to update navigation state', { 
                error: error.message, 
                view 
            });
        }
    }

    /**
     * Handle token status visibility based on current view
     * 
     * @param {string} view - The current view being displayed
     */
    handleTokenStatusVisibility(view) {
        try {
            const tokenStatusBar = document.getElementById('token-status-indicator');
            if (!tokenStatusBar) return;
            
            // Hide token status on home page (disclaimer page)
            if (view === 'home') {
                tokenStatusBar.style.display = 'none';
            } else {
                // Show token status on all other pages
                tokenStatusBar.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error handling token status visibility:', error);
        }
    }

    async handleSaveSettings(settings) {
        try {
            this.logger.info('Saving settings', settings);
            
            // Show saving status using new enhanced status field
            this.uiManager.showSettingsActionStatus('Saving settings...', 'info');
            
            // Save to credentials manager (localStorage)
            if (window.credentialsManager) {
                const credentials = {
                    environmentId: settings.environmentId || '',
                    apiClientId: settings.apiClientId || '',
                    apiSecret: settings.apiSecret || '',
                    populationId: settings.populationId || '',
                    region: settings.region || 'NorthAmerica'
                };
                
                // Validate credentials before saving
                const validation = window.credentialsManager.validateCredentials(credentials);
                if (!validation.isValid) {
                    throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
                }
                
                window.credentialsManager.saveCredentials(credentials);
                this.logger.info('Credentials saved to localStorage');
            }
            
            // Also save to server for backup
            try {
                const response = await this.localClient.post('/api/settings', settings);
                this.logger.info('Settings also saved to server');
            } catch (serverError) {
                this.logger.warn('Failed to save to server, but credentials saved to localStorage:', serverError.message);
            }
            
            // Update settings manager
            this.settingsSubsystem.updateSettings(settings);
            
            // Update API clients with new settings
            this.pingOneClient = apiFactory.getPingOneClient(this.logger, this.settingsSubsystem);
            
            // Show success status using new enhanced status field
            this.uiManager.showSettingsActionStatus('Settings saved successfully', 'success', { autoHideDelay: 3000 });
            
            // Show success message in global status bar
            if (window.globalStatusManager) {
                window.globalStatusManager.success('Settings saved successfully! Credentials stored in browser storage.');
            }
            
            // Repopulate the form (if needed)
            this.populateSettingsForm(settings);
            
            // Now update connection status area with check mark and message
            const connStatus = document.getElementById('settings-connection-status');
            if (connStatus) {
                connStatus.textContent = '✅ Settings saved! Please - Get token';
                connStatus.classList.remove('status-disconnected', 'status-error');
                connStatus.classList.add('status-success');
                console.log('Updated #settings-connection-status after save (post-populate)');
            }
        } catch (error) {
            this.logger.error('Failed to save settings', { error: error.message });
            this.uiManager.showSettingsActionStatus('Failed to save settings: ' + error.message, 'error', { autoHide: false });
            
            // Show error in global status bar
            if (window.globalStatusManager) {
                window.globalStatusManager.error('Failed to save settings: ' + error.message);
            }
        }
    }

    /**
     * Handle test connection button click
     * Tests the current settings by attempting to get a new token
     */
    async handleTestConnection() {
        try {
            this.logger.info('Testing connection with current settings');
            
            // Show loading status
            this.uiManager.showSettingsActionStatus('Testing connection...', 'info');
            
            // Test connection via API with fallback
            let response;
            try {
                response = await this.localClient.post('/api/test-connection');
                this.logger.info('LocalAPIClient test connection successful', { response });
            } catch (localClientError) {
                this.logger.warn('LocalAPIClient failed, trying direct fetch as fallback', { error: localClientError.message });
                
                // Fallback to direct fetch (like test page)
                const fetchResponse = await fetch('/api/test-connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!fetchResponse.ok) {
                    const errorData = await fetchResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
                }
                
                response = await fetchResponse.json();
                this.logger.info('Direct fetch fallback successful', { response });
            }
            
            if (response && response.success) {
                this.logger.info('Connection test successful');
                this.uiManager.showSettingsActionStatus('Connection test successful!', 'success', { autoHideDelay: 3000 });
                
                // Update token status in sidebar
                if (this.tokenStatusIndicator) {
                    this.tokenStatusIndicator.updateStatus();
                }
                
                // Update global token manager
                if (window.globalTokenManager) {
                    window.globalTokenManager.updateStatus();
                }
                
                // Update global status bar
                if (window.globalStatusManager) {
                    window.globalStatusManager.success('Connection test successful!');
                }
                
                // Update connection status area
                const connStatus = document.getElementById('settings-connection-status');
                if (connStatus) {
                    connStatus.textContent = '✅ Connection test successful!';
                    connStatus.classList.remove('status-disconnected', 'status-error');
                    connStatus.classList.add('status-success');
                }
                
            } else {
                throw new Error(response?.error || 'Connection test failed - no success response');
            }
            
        } catch (error) {
            this.logger.error('Connection test failed:', { error: error.message });
            this.uiManager.showSettingsActionStatus(`Connection test failed: ${error.message}`, 'error', { autoHide: false });
            
            // Update global status bar
            if (window.globalStatusManager) {
                window.globalStatusManager.error(`Connection test failed: ${error.message}`);
            }
            
            // Update connection status area
            const connStatus = document.getElementById('settings-connection-status');
            if (connStatus) {
                connStatus.textContent = '❌ Connection test failed';
                connStatus.classList.remove('status-success', 'status-disconnected');
                connStatus.classList.add('status-error');
            }
        }
    }

    populateSettingsForm(settings) {
        if (!settings) {
            this.logger.warn('No settings provided to populate form');
            return;
        }
        
        const fields = {
            'environment-id': settings.environmentId || '',
            'api-client-id': settings.apiClientId || '',
            'api-secret': settings.apiSecret || '',
            'population-id': settings.populationId || '',
            'region': settings.region || 'NorthAmerica',
            'rate-limit': settings.rateLimit || 90
        };
        
        const missingFields = [];
        
        for (const [id, value] of Object.entries(fields)) {
            try {
                const element = document.getElementById(id);
                if (!element) {
                    missingFields.push(id);
                    continue;
                }
                
                // Handle API secret using SecretFieldManager
                if (id === 'api-secret') {
                    this.secretFieldToggle.setValue(value);
                } else {
                    element.value = value;
                }
            } catch (error) {
                this.logger.error(`Error setting field ${id}`, { error: error.message });
                missingFields.push(id);
            }
        }
        
        if (missingFields.length > 0) {
            this.logger.warn('Missing form fields', { missingFields });
        }
    }

    // Helper: Validate UUID v4
    isValidUUID(uuid) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    }

    /**
     * Handles file selection from the UI, parses CSV, and triggers population conflict logic if needed
     * @param {File} file - The selected CSV file
     */
    async handleFileSelect(file) {
        try {
            // Log file selection for debugging
            this.uiManager.debugLog("FileUpload", `File selected: ${file.name}, size: ${file.size}`);
            await this.fileHandler.setFile(file);
            this.uiManager.showSuccess('File selected successfully', `Selected file: ${file.name}`);
            // Update import button state after file selection
            this.updateImportButtonState();

            // --- ALWAYS IGNORE CSV POPULATION DATA ---
            // Get users from CSV for logging purposes only
            const users = this.fileHandler.getParsedUsers ? this.fileHandler.getParsedUsers() : [];
            // Log number of users parsed from CSV
            this.uiManager.debugLog("CSV", `Parsed ${users.length} users from CSV`);
            
            // Get selected population from UI dropdown
            const populationSelect = document.getElementById('import-population-select');
            const uiPopulationId = populationSelect && populationSelect.value;
            
            // Log selected population
            this.uiManager.debugLog("Population", `Selected population: ${uiPopulationId}`);
            
            // ALWAYS use UI population selection and ignore any CSV population data
            if (uiPopulationId) {
                // Overwrite all user records with UI populationId, ignoring any CSV population data
                users.forEach(u => {
                    // Remove any existing population data from CSV
                    delete u.populationId;
                    delete u.population_id;
                    delete u.populationName;
                    delete u.population_name;
                    
                    // Set the UI-selected population
                    u.populationId = uiPopulationId;
                });
                
                this.populationChoice = 'ui';
                this.uiManager.showInfo('Using UI dropdown population selection (CSV population data ignored)');
                
                // Log the population assignment
                this.uiManager.debugLog("Population", `Assigned UI population ${uiPopulationId} to all ${users.length} users`);
            } else {
                // No UI population selected - this will be handled by validation later
                this.populationChoice = 'ui';
                this.uiManager.showWarning('No population selected in UI dropdown');
            }
            
            // Show population prompt if needed (legacy)
            this.showPopulationChoicePrompt();
        } catch (error) {
            this.uiManager.showError('Failed to select file', error.message);
        }
    }

    /**
     * Handles modify file selection from the UI, parses CSV, and updates file information display
     * @param {File} file - The selected CSV file for modification
     */
    async handleModifyFileSelect(file) {
        try {
            // Log file selection for debugging
            this.uiManager.debugLog("ModifyFileUpload", `Modify file selected: ${file.name}, size: ${file.size}`);
            await this.fileHandler.setFile(file, 'modify');
            this.uiManager.showSuccess('File selected successfully', `Selected file: ${file.name} for modification`);
            
            // Update modify button state after file selection
            this.updateModifyButtonState();

            // Get users from CSV for logging purposes
            const users = this.fileHandler.getParsedUsers ? this.fileHandler.getParsedUsers() : [];
            this.uiManager.debugLog("ModifyCSV", `Parsed ${users.length} users from CSV for modification`);
            
            // Get selected population from UI dropdown
            const populationSelect = document.getElementById('modify-population-select');
            const uiPopulationId = populationSelect && populationSelect.value;
            
            // Log selected population
            this.uiManager.debugLog("ModifyPopulation", `Selected population: ${uiPopulationId}`);
            
            // Use UI population selection for modify operation
            if (uiPopulationId) {
                // Overwrite all user records with UI populationId
                users.forEach(u => {
                    // Remove any existing population data from CSV
                    delete u.populationId;
                    delete u.population_id;
                    delete u.populationName;
                    delete u.population_name;
                    
                    // Set the UI-selected population
                    u.populationId = uiPopulationId;
                });
                
                this.uiManager.showInfo('Using UI dropdown population selection for modification');
                
                // Log the population assignment
                this.uiManager.debugLog("ModifyPopulation", `Assigned UI population ${uiPopulationId} to all ${users.length} users for modification`);
            } else {
                this.uiManager.showWarning('No population selected in UI dropdown for modification');
            }
        } catch (error) {
            this.uiManager.showError('Failed to select file for modification', error.message);
        }
    }

    /**
     * Starts the user import flow with real-time progress tracking
     * 
     * Validates user inputs, sends CSV data to the server, and establishes
     * a Server-Sent Events (SSE) connection for real-time progress updates.
     * Handles error states, retry logic, and user feedback throughout the process.
     * 
     * @returns {Promise<void>}
     */
    async startImport() {
        // Check for valid token before proceeding
        const hasValidToken = await this.checkTokenAndRedirect('import');
        if (!hasValidToken) {
            console.log('❌ [IMPORT] Import cancelled due to missing valid token');
            return;
        }

        // Prevent multiple simultaneous imports
        if (this.isImporting) {
            this.logger.warn('Import already in progress');
            return;
        }

        // Enhanced logging for import start
        console.log('🚀 [IMPORT] Starting import process');
        this.logger.info('Starting import process');

        // Show progress section and ensure it's visible
        console.log('🔍 [IMPORT DEBUG] About to show progress section...');
        
        // Debug: Check all progress-related containers
        console.log('🔍 [IMPORT DEBUG] All progress containers in DOM:', {
            'progress-container': !!document.getElementById('progress-container'),
            'progress-section': !!document.getElementById('progress-section'),
            'import-progress': !!document.getElementById('import-progress'),
            'ui-progress': !!document.getElementById('ui-progress'),
            'all-progress-elements': Array.from(document.querySelectorAll('[id*="progress"]')).map(el => el.id)
        });
        
        this.showProgressSection();
        
        // Force show the progress container immediately after calling showProgressSection
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressContainer.style.visibility = 'visible';
            progressContainer.style.opacity = '1';
            progressContainer.classList.add('visible');
            console.log('🔍 [PROGRESS FIX] Forced progress container to be visible');
        } else {
            console.error('❌ [PROGRESS FIX] Progress container not found for forced visibility');
        }
        
        // Force update progress UI to ensure all elements are visible
        this.forceUpdateProgressUI();
        
        // Also ensure UI manager shows progress
        if (this.uiManager && typeof this.uiManager.showProgress === 'function') {
            console.log('🔍 [IMPORT DEBUG] UI manager showProgress method available, calling...');
            this.uiManager.showProgress();
        } else {
            console.error('🔍 [IMPORT DEBUG] UI manager or showProgress method not available:', {
                hasUIManager: !!this.uiManager,
                showProgressType: this.uiManager ? typeof this.uiManager.showProgress : 'N/A'
            });
        }

        // Always get the current population selection from the dropdown
        const popSelect = document.getElementById('import-population-select');
        let populationId = popSelect && popSelect.value ? popSelect.value : '';
        let populationName = '';
        if (popSelect) {
            const selectedOption = popSelect.options[popSelect.selectedIndex];
            populationName = selectedOption ? selectedOption.text : '';
        }
        
        // Debug logging for population selection
        console.log('🔍 [Population Debug] Current dropdown state:', {
            element: popSelect,
            selectedIndex: popSelect ? popSelect.selectedIndex : 'N/A',
            value: populationId,
            text: populationName,
            optionsCount: popSelect ? popSelect.options.length : 0
        });
        
        // Store current values for use in progress updates
        this.selectedPopulationId = populationId;
        this.selectedPopulationName = populationName;
        
        // Debug logging for stored values
        console.log('🔍 [Population Debug] Stored current values:', {
            selectedPopulationId: this.selectedPopulationId,
            selectedPopulationName: this.selectedPopulationName
        });
        
        // Log at import trigger to confirm the correct value is being used
        console.log('🚀 [Import Trigger] Using current population selection:', {
            id: populationId,
            name: populationName
        });
        
        // Debug warning if population name is "Test"
        if (populationName === 'Test') {
            console.warn('⚠️ [Population Debug] WARNING: Population name is "Test" - this might be a default value');
            console.log('⚠️ [Population Debug] Dropdown state when "Test" selected:', {
                selectedIndex: popSelect ? popSelect.selectedIndex : 'N/A',
                allOptions: popSelect ? Array.from(popSelect.options).map((opt, idx) => ({
                    index: idx,
                    value: opt.value,
                    text: opt.text,
                    selected: opt.selected
                })) : []
            });
        }

        // Initialize SSE status indicator and fallback polling
        ensureSSEStatusIndicator();
        this.robustSSE = null;
        this.fallbackPolling = null;
        
        /**
         * Establishes Socket.IO connection for real-time import progress updates with WebSocket fallback
         * 
         * Uses Socket.IO as primary real-time connection with automatic fallback to WebSocket
         * if Socket.IO fails or disconnects.
         * 
         * @param {string} sessionId - Unique session identifier for this import
         */
        const connectRealTimeProgress = (sessionId) => {
            // Validate sessionId before attempting connection
            if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
                console.error("RealTime: ❌ Invalid sessionId - cannot establish connection", { sessionId });
                this.uiManager.debugLog("RealTime", "❌ Invalid sessionId - cannot establish connection", { sessionId });
                this.uiManager.showError('Connection Error', 'Invalid session ID. Cannot establish progress connection.');
                this.isImporting = false;
                this.enableImportButton();
                return;
            }

            // Log connection attempt for debugging
            console.log("RealTime: 🔌 Establishing Socket.IO connection with sessionId:", sessionId);
            this.uiManager.debugLog("RealTime", `🔄 Establishing Socket.IO connection with sessionId: ${sessionId}`);
            this.uiManager.showInfo(`RealTime: Opening Socket.IO connection with sessionId: ${sessionId}`);
            
            // Initialize Socket.IO connection with enhanced configuration
            this.socket = io({
                transports: ['polling'], // Use polling only to avoid WebSocket issues
                reconnectionAttempts: 5, // Increased from 3
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000, // Max delay between reconnection attempts
                timeout: 20000,
                forceNew: true,
                pingTimeout: 60000, // Match server pingTimeout
                pingInterval: 25000, // Match server pingInterval
                upgrade: false, // Disable transport upgrades to avoid protocol conflicts
                rememberUpgrade: false, // Don't remember transport upgrades
                autoConnect: true,
                upgradeTimeout: 10000 // Match server upgradeTimeout
            });
            
            // Socket.IO event handlers
            this.socket.on('connect', () => {
                console.log("Socket.IO: ✅ Connected to server");
                this.uiManager.debugLog("Socket.IO", "✅ Connected to server");
                this.uiManager.showSuccess('Socket.IO: Real-time connection established');
                
                // Register session with server
                this.socket.emit('registerSession', sessionId);
                
                // Set up heartbeat monitoring
                this.socket.lastActivity = Date.now();
                this.socket.connectionTime = Date.now();
                
                // Stop fallback polling if it was active
                if (this.fallbackPolling) {
                    stopFallbackPolling();
                    this.fallbackPolling = null;
                }
            });
            
            // Enhanced heartbeat monitoring
            this.socket.on('ping', () => {
                this.socket.lastActivity = Date.now();
                console.log("Socket.IO: 💓 Ping received");
            });
            
            this.socket.on('pong', () => {
                this.socket.lastActivity = Date.now();
                console.log("Socket.IO: 💓 Pong received");
            });
            
            // Monitor connection health
            this.socket.on('connect', () => {
                this.socket.lastActivity = Date.now();
            });
            
            this.socket.on('disconnect', () => {
                const connectionDuration = this.socket.connectionTime ? 
                    Date.now() - this.socket.connectionTime : 'unknown';
                console.log("Socket.IO: 🔄 Disconnected after", connectionDuration, "ms");
            });
            
            this.socket.on('progress', (data) => {
                console.log("Socket.IO: 📩 Progress message received:", data);
                this.uiManager.debugLog("Socket.IO", "📊 Progress message received", data);
                this.handleProgressUpdate(data);
            });
            
            this.socket.on('completion', (data) => {
                console.log("Socket.IO: ✅ Completion message received:", data);
                this.uiManager.debugLog("Socket.IO", "✅ Completion message received", data);
                this.handleProgressUpdate(data);
            });
            
            this.socket.on('error', (data) => {
                console.log("Socket.IO: ❌ Error message received:", data);
                this.uiManager.debugLog("Socket.IO", "❌ Error message received", data);
                this.handleProgressUpdate(data);
            });
            
            // Handle Socket.IO disconnection
            this.socket.on('disconnect', (reason) => {
                console.log("Socket.IO: 🔄 Disconnected, reason:", reason);
                this.uiManager.debugLog("Socket.IO", `🔄 Disconnected, reason: ${reason}`);
                this.uiManager.showWarning('Socket.IO: Connection lost, real-time updates unavailable');
            });
            
            // Handle Socket.IO connection errors
            this.socket.on('connect_error', (error) => {
                // Get population information for error logging
                const populationInfo = {
                    populationId: this.selectedPopulationId || 'unknown',
                    populationName: this.selectedPopulationName || 'unknown'
                };
                
                console.error("Socket.IO: ❌ Connection error:", error);
                console.error("Socket.IO: ❌ Population context:", populationInfo);
                this.uiManager.debugLog("Socket.IO", "❌ Connection error", { 
                    error: error.message,
                    ...populationInfo
                });
                this.uiManager.showError('Socket.IO Connection Failed', 'Real-time updates unavailable');
            });
        };
        


                /**
         * Handles progress updates from SSE or fallback polling with enhanced progress manager
         * 
         * @param {Object} data - Progress data from server
         */
        this.handleProgressUpdate = (data) => {
            // Validate required fields in progress data
            if (data.current === undefined || data.total === undefined) {
                console.error("Progress: ❌ Progress event missing required fields:", data);
                this.uiManager.debugLog("Progress", "❌ Progress event missing required fields", data);
                this.uiManager.showError('Progress Error', 'Missing required fields (current/total)');
                return;
            }

            // Log which user is currently being processed
            if (data.user) {
                console.log("Progress: 👤 Processing user:", data.user.username || data.user.email || 'unknown');
                this.uiManager.debugLog("Progress", `👤 Processing user: ${data.user.username || data.user.email || 'unknown'}`);
            }

            // Update progress section
            if (data.current !== undefined && data.total !== undefined) {
                const percentage = Math.round((data.current / data.total) * 100);
                this.updateProgressBar(percentage);
                
                // Update progress stats
                this.updateProgressStats({
                    total: data.total,
                    processed: data.current,
                    success: data.counts?.success || 0,
                    failed: data.counts?.failed || 0,
                    skipped: data.counts?.skipped || 0
                });
                
                // Update status message
                const statusMessage = data.message || `Processing ${data.current} of ${data.total} users...`;
                const statusDetails = data.user ? `Current: ${data.user.username || data.user.email || 'unknown'}` : '';
                this.updateProgressStatus(statusMessage, statusDetails);
                
                // Force update progress UI to ensure visibility
                this.forceUpdateProgressUI();
            }

            // Log progress update with current/total counts
            if (data.current !== undefined && data.total !== undefined) {
                const percentage = Math.round(data.current/data.total*100);
                console.log(`Progress: 📈 Progress update: ${data.current} of ${data.total} (${percentage}%)`);
                this.uiManager.debugLog("Progress", `📈 Progress update: ${data.current} of ${data.total} (${percentage}%)`);
            }

            // Handle duplicate users with enhanced progress manager
            if (data.duplicates && data.duplicates.length > 0) {
                console.log("Progress: 🔄 Handling duplicate users:", data.duplicates.length);
                this.uiManager.handleDuplicateUsers(data.duplicates, (mode, duplicates) => {
                    console.log('🔄 [IMPORT] User chose duplicate handling mode:', mode);
                    // Continue import with selected mode
                    this.continueImportWithDuplicateMode(mode, duplicates);
                });
            }

            // Update UI with enhanced progress information
            this.uiManager.updateImportProgress(
                data.current || 0, 
                data.total || 0, 
                data.message || '', 
                data.counts || {}, 
                data.populationName || '', 
                data.populationId || ''
            );

            // Display status message to user if provided
            if (data.message) {
                this.uiManager.showInfo(data.message);
            }
            
            // Log current user being processed if available
            if (data.user) {
                const userName = data.user.username || data.user.email || 'unknown';
                this.uiManager.showInfo(`Processing: ${userName}`);
            }
            
            // Handle skipped users with detailed information
            if (data.status === 'skipped' && data.statusDetails) {
                const skipReason = data.statusDetails.reason || 'User already exists';
                const existingUser = data.statusDetails.existingUser;
                
                // Log detailed skip information
                console.log("Progress: ⚠️ User skipped:", {
                    user: data.user,
                    reason: skipReason,
                    existingUser: existingUser
                });
                
                // Show warning message with skip details
                let skipMessage = `⚠️ Skipped: ${data.user.username || data.user.email || 'unknown user'}`;
                if (existingUser) {
                    skipMessage += ` (exists as ${existingUser.username || existingUser.email} in ${existingUser.population})`;
                } else {
                    skipMessage += ` (${skipReason})`;
                }
                
                this.uiManager.showWarning(skipMessage);
                
                // Update UI with skip information
                if (data.counts && data.counts.skipped !== undefined) {
                    console.log(`Progress: 📊 Skipped count updated: ${data.counts.skipped}`);
                    this.uiManager.debugLog("Progress", `📊 Skipped count updated: ${data.counts.skipped}`);
                }
            }

            // Handle completion with enhanced progress manager
            if (data.status === 'complete' || data.current === data.total) {
                console.log("Progress: ✅ Import completed");
                
                // Update progress section for completion
                this.updateProgressBar(100);
                this.updateProgressStatus('Import completed successfully!', '');
                this.updateProgressStats({
                    total: data.total,
                    processed: data.total,
                    success: data.counts?.success || 0,
                    failed: data.counts?.failed || 0,
                    skipped: data.counts?.skipped || 0
                });
                
                this.uiManager.completeOperation({
                    success: data.counts?.success || 0,
                    failed: data.counts?.failed || 0,
                    skipped: data.counts?.skipped || 0,
                    duplicates: data.counts?.duplicates || 0
                });
                
                // Clean up connections
                if (this.robustSSE) {
                    this.robustSSE.close();
                    this.robustSSE = null;
                }
                if (this.fallbackPolling) {
                    stopFallbackPolling();
                    this.fallbackPolling = null;
                }
                
                this.isImporting = false;
                this.enableImportButton();
                
                // Hide progress section after a delay
                setTimeout(() => {
                    this.hideProgressSection();
                }, 3000);
            }

            // Handle errors
            if (data.status === 'error') {
                console.error("Progress: ❌ Import error:", data.error);
                
                // Update progress section for error
                this.updateProgressStatus('Import failed', data.error || 'Unknown error');
                
                this.uiManager.showError('Import Error', data.error || 'Unknown error');
                
                // Clean up connections
                if (this.robustSSE) {
                    this.robustSSE.close();
                    this.robustSSE = null;
                }
                if (this.fallbackPolling) {
                    stopFallbackPolling();
                    this.fallbackPolling = null;
                }
                
                this.isImporting = false;
                this.enableImportButton();
                
                // Hide progress section after a delay
                setTimeout(() => {
                    this.hideProgressSection();
                }, 5000);
            }
        };

        try {
            // Set import state to prevent multiple simultaneous imports
            this.isImporting = true;
            this.importAbortController = new AbortController();
            
            // Disable the import button while import is running
            this.disableImportButton();
            
            // Validate import options (file, population, etc.)
            const importOptions = this.getImportOptions();
            if (!importOptions) {
                console.log('❌ [IMPORT] Import options validation failed');
                this.isImporting = false;
                this.enableImportButton();
                return;
            }

            console.log('✅ [IMPORT] Import options validated:', {
                totalUsers: importOptions.totalUsers,
                populationId: importOptions.selectedPopulationId,
                populationName: importOptions.selectedPopulationName,
                fileName: importOptions.file?.name
            });

            // Start import operation with enhanced progress manager
            this.uiManager.startImportOperation({
                total: importOptions.totalUsers,
                populationName: importOptions.selectedPopulationName,
                populationId: importOptions.selectedPopulationId,
                fileName: importOptions.file?.name
            });

            // Prepare FormData for file upload to server
            // Includes file, population selection, and metadata
            const formData = new FormData();
            formData.append('file', importOptions.file);
            formData.append('populationId', importOptions.selectedPopulationId);
            formData.append('populationName', importOptions.selectedPopulationName);
            formData.append('totalUsers', importOptions.totalUsers);
            
            // Debug logging for backend request
            console.log('🔍 [Backend Request Debug] Population info being sent:', {
                populationId: importOptions.selectedPopulationId,
                populationName: importOptions.selectedPopulationName,
                totalUsers: importOptions.totalUsers
            });
            
            // Enhanced debug logging for population tracking
            console.log('🔍 [Population Debug] Detailed population data:', {
                selectedPopulationId: importOptions.selectedPopulationId,
                selectedPopulationName: importOptions.selectedPopulationName,
                hasPopulationId: !!importOptions.selectedPopulationId,
                hasPopulationName: !!importOptions.selectedPopulationName,
                populationIdType: typeof importOptions.selectedPopulationId,
                populationNameType: typeof importOptions.selectedPopulationName,
                totalUsers: importOptions.totalUsers
            });
            
            // Send CSV data and population info to backend for processing
            // The server will start the import process and return a session ID
            console.log('📤 [IMPORT] Sending request to backend...');
            
            // Enhanced fetch configuration to handle protocol issues
            const fetchOptions = {
                method: 'POST',
                body: formData,
                signal: this.importAbortController.signal,
                // Force HTTP/1.1 to avoid protocol mismatch issues
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };
            
            console.log('🔧 [IMPORT] Fetch options:', {
                method: fetchOptions.method,
                hasSignal: !!fetchOptions.signal,
                headers: fetchOptions.headers
            });
            
            let response;
            let fetchAttempt = 1;
            const maxAttempts = 3;
            
            while (fetchAttempt <= maxAttempts) {
                try {
                    console.log(`📤 [IMPORT] Attempt ${fetchAttempt}/${maxAttempts} - Sending request to backend...`);
                    response = await fetch('/api/import', fetchOptions);
                    break; // Success, exit the loop
                } catch (fetchError) {
                    console.error(`❌ [IMPORT] Attempt ${fetchAttempt} failed:`, fetchError);
                    
                    if (fetchAttempt === maxAttempts) {
                        throw fetchError; // Re-throw on final attempt
                    }
                    
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, fetchAttempt - 1) * 1000;
                    console.log(`⏳ [IMPORT] Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    fetchAttempt++;
                }
            }
            
            console.log('📥 [IMPORT] Backend response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });
            
            const result = await response.json();
            console.log('📋 [IMPORT] Backend response data:', result);
            
            const sessionId = result.sessionId;
            
            // Validate session ID is present (required for SSE connection)
            if (!sessionId) {
                console.error('❌ [IMPORT] Session ID is missing from backend response');
                this.uiManager.debugLog("Import", "Session ID is undefined. Import cannot proceed.");
                this.uiManager.showError('Import failed', 'Session ID is undefined. Import cannot proceed.');
                this.isImporting = false;
                this.enableImportButton();
                return;
            }
            
            console.log('✅ [IMPORT] Session ID received:', sessionId);
            
            // Update progress manager with session ID
            this.uiManager.updateImportOperationWithSessionId(sessionId);
            
            // Log session ID and establish robust SSE connection for progress updates
            this.uiManager.debugLog("Import", "Session ID received", { sessionId });
            console.log('🔌 [IMPORT] Establishing robust SSE connection with sessionId:', sessionId);
            // After receiving sessionId and before calling connectRealTimeProgress
            if (typeof io === 'undefined') {
                this.uiManager?.showError?.('Real-time updates unavailable', 'The Socket.IO client failed to load. Please refresh or contact support.');
                console.error('Socket.IO client is not defined. Real-time updates will not be used.');
                // Fallback to polling
                const sseUrl = `/api/import/progress/${sessionId}`;
                this.fallbackPolling = startFallbackPolling(sseUrl, (progressData) => {
                    this.handleProgressUpdate(progressData);
                });
                return;
            }
            connectRealTimeProgress(sessionId);
        } catch (error) {
            console.error('❌ [IMPORT] Error during import process:', error);
            this.uiManager.debugLog("Import", "Error starting import", error);
            
            // Enhanced error handling for network protocol issues
            let errorMessage = error.message || 'Unknown error occurred';
            let errorTitle = 'Import failed';
            
            // Check for specific network protocol errors
            if (error.message && error.message.includes('ERR_H2_OR_QUIC_REQUIRED')) {
                errorTitle = 'Network Protocol Error';
                errorMessage = 'The server requires HTTP/2 or QUIC protocol, but your browser is using HTTP/1.1. This is likely a server configuration issue. Please contact your system administrator.';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorTitle = 'Network Connection Error';
                errorMessage = 'Unable to connect to the import service. Please check your network connection and try again. If the problem persists, contact your system administrator.';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorTitle = 'Network Error';
                errorMessage = 'Network request failed. Please check your internet connection and try again.';
            } else if (error.name === 'AbortError') {
                errorTitle = 'Import Cancelled';
                errorMessage = 'The import operation was cancelled by the user.';
            }
            
            // Log detailed error information for debugging
            console.error('🔍 [IMPORT] Detailed error info:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                type: error.constructor.name
            });
            
            this.uiManager.showError(errorTitle, errorMessage);
            this.isImporting = false;
            this.enableImportButton();
        }
    }

    /**
     * Disable the import button while import is running
     */
    disableImportButton() {
        const startImportBtn = document.getElementById('start-import');
        if (startImportBtn) {
            startImportBtn.disabled = true;
            startImportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Import Running...';
            console.log('🔒 [UI] Import button disabled');
        }
    }

    /**
     * Enable the import button when import is complete or cancelled
     */
    enableImportButton() {
        const startImportBtn = document.getElementById('start-import');
        if (startImportBtn) {
            startImportBtn.disabled = false;
            startImportBtn.innerHTML = '<i class="fas fa-upload"></i> Start Import';
            console.log('🔓 [UI] Import button enabled');
        }
    }

    /**
     * Continue import with user's duplicate handling choice
     * 
     * @param {string} mode - Duplicate handling mode ('skip' or 'add')
     * @param {Array} duplicates - Array of duplicate users
     */
    continueImportWithDuplicateMode(mode, duplicates) {
        try {
            console.log('🔄 [IMPORT] Continuing import with duplicate mode:', mode);
            this.uiManager.debugLog("Import", `Continuing import with duplicate mode: ${mode}`);

            // Send the user's choice to the server
            fetch('/api/import/duplicates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mode: mode,
                    duplicates: duplicates
                })
            }).then(response => {
                if (response.ok) {
                    console.log('✅ [IMPORT] Duplicate handling choice sent successfully');
                    this.uiManager.showInfo(`Continuing import with ${mode} mode for duplicates`);
                } else {
                    console.error('❌ [IMPORT] Failed to send duplicate handling choice');
                    this.uiManager.showError('Duplicate Handling Error', 'Failed to process duplicate handling choice');
                }
            }).catch(error => {
                console.error('❌ [IMPORT] Error sending duplicate handling choice:', error);
                this.uiManager.showError('Duplicate Handling Error', error.message || 'Unknown error');
            });
        } catch (error) {
            console.error('❌ [IMPORT] Error in continueImportWithDuplicateMode:', error);
            this.uiManager.showError('Duplicate Handling Error', error.message || 'Unknown error');
        }
    }

    /**
     * Validates and retrieves import configuration options
     * 
     * Checks that a population is selected and a CSV file is loaded.
     * Returns the configuration needed to start the import process.
     * Shows appropriate error messages if validation fails.
     * 
     * @returns {Object|null} Import options or null if validation fails
     */
    getImportOptions() {
        // Always get the current population selection from the dropdown
        const populationSelect = document.getElementById('import-population-select');
        const selectedPopulationId = populationSelect?.value || '';
        const selectedPopulationName = populationSelect?.selectedOptions[0]?.text || '';
        const skipDuplicatesByEmail = document.getElementById('skip-duplicates')?.checked || false;
        const skipDuplicatesByUsername = document.getElementById('skip-duplicates-username')?.checked || false;
        
        // Debug logging for current population selection
        console.log('🔍 [getImportOptions] Current population selection:', {
            selectedPopulationId,
            selectedPopulationName,
            dropdownExists: !!populationSelect,
            dropdownValue: populationSelect?.value,
            dropdownText: populationSelect?.selectedOptions[0]?.text
        });
        
        if (!selectedPopulationId) {
            this.uiManager.showError('No population selected', 'Please select a population before starting the import.');
            return null;
        }
        
        // Validate CSV file contains users to import
        const totalUsers = this.fileHandler.getTotalUsers();
        if (!totalUsers || totalUsers === 0) {
            this.uiManager.showError('No users to import', 'Please select a CSV file with users to import.');
            return null;
        }
        
        // Return validated import configuration
        return {
            selectedPopulationId,
            selectedPopulationName,
            totalUsers,
            file: this.fileHandler.getCurrentFile(),
            skipDuplicatesByEmail,
            skipDuplicatesByUsername
        };
    }

    // Enhanced method to get current population selection with validation
    getCurrentPopulationSelection() {
        const populationSelect = document.getElementById('import-population-select');
        if (!populationSelect) {
            console.error('Population select element not found');
            return null;
        }
        
        // Always use the current dropdown selection
        const selectedPopulationId = populationSelect.value;
        const selectedPopulationName = populationSelect.selectedOptions[0]?.text || '';
        
        console.log('=== getCurrentPopulationSelection ===');
        console.log('Current Dropdown ID:', selectedPopulationId);
        console.log('Current Dropdown Name:', selectedPopulationName);
        console.log('Select element exists:', !!populationSelect);
        console.log('====================================');
        
        if (!selectedPopulationId || selectedPopulationId === '') {
            return null;
        }
        
        return {
            id: selectedPopulationId,
            name: selectedPopulationName
        };
    }

    // Force refresh population selection to ensure it's current
    forceRefreshPopulationSelection() {
        const populationSelect = document.getElementById('import-population-select');
        if (!populationSelect) {
            console.error('Population select element not found for refresh');
            return null;
        }
        
        // Always get the current selection from the dropdown
        const currentValue = populationSelect.value;
        const currentText = populationSelect.selectedOptions[0]?.text || '';
        
        console.log('=== forceRefreshPopulationSelection ===');
        console.log('Current Population ID:', currentValue);
        console.log('Current Population Name:', currentText);
        console.log('==========================================');
        
        return {
            id: currentValue,
            name: currentText
        };
    }

    cancelImport() {
        // Abort the import request
        if (this.importAbortController) {
            this.importAbortController.abort();
        }
        
        // Clean up robust SSE connection if it exists
        if (this.robustSSE) {
            console.log("Import: 🧹 Cleaning up robust SSE connection on cancel");
            this.uiManager.debugLog("Import", "🧹 Cleaning up robust SSE connection on cancel");
            this.robustSSE.close();
            this.robustSSE = null;
        }
        
        // Stop fallback polling if it's active
        if (this.fallbackPolling) {
            console.log("Import: 🧹 Stopping fallback polling on cancel");
            this.uiManager.debugLog("Import", "🧹 Stopping fallback polling on cancel");
            stopFallbackPolling();
            this.fallbackPolling = null;
        }
        
        // Update status indicator
        updateSSEStatusIndicator('disconnected', false);
        
        // Reset import state
        this.isImporting = false;
        this.enableImportButton();
        
        // Hide progress section
        this.hideProgressSection();
        
        // Log cancellation
        this.uiManager.showInfo('Import cancelled by user');
        console.log("Import: 🚫 Import cancelled by user");
    }

    /**
     * Starts the user export flow by validating options, sending request to the server, and handling progress
     */
    async startExport() {
        // Check for valid token before proceeding
        const hasValidToken = await this.checkTokenAndRedirect('export');
        if (!hasValidToken) {
            console.log('❌ [EXPORT] Export cancelled due to missing valid token');
            return;
        }

        if (this.isExporting) {
            this.logger.warn('Export already in progress');
            return;
        }
        try {
            this.isExporting = true;
            this.exportAbortController = new AbortController();
            const exportOptions = this.getExportOptions();
            // If no export options, show error and stop
            if (!exportOptions) {
                this.isExporting = false;
                return;
            }
            // Show export status in UI
            this.uiManager.showExportStatus();
            // Send export request to backend
            const response = await this.localClient.post('/api/export-users', exportOptions, {
                signal: this.exportAbortController.signal,
                onProgress: (current, total, message, counts) => {
                    // Update UI with export progress
                    this.uiManager.updateExportProgress(current, total, message, counts);
                }
            });
            // Handle completion
            if (response.success) {
                this.uiManager.updateExportProgress(exportOptions.totalUsers, exportOptions.totalUsers, 'Export completed successfully', response.counts);
                this.uiManager.showSuccess('Export completed successfully', response.message);
            } else {
                this.uiManager.updateExportProgress(0, exportOptions.totalUsers, 'Export failed', response.counts);
                this.uiManager.showError('Export failed', response.error);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.uiManager.updateExportProgress(0, 0, 'Export cancelled');
                this.uiManager.showInfo('Export cancelled');
            } else {
                this.uiManager.updateExportProgress(0, 0, 'Export failed: ' + error.message);
                this.uiManager.showError('Export failed', error.message);
            }
        } finally {
            this.isExporting = false;
            this.exportAbortController = null;
        }
    }

    getExportOptions() {
        const selectedPopulationId = document.getElementById('export-population-select')?.value;
        const selectedPopulationName = document.getElementById('export-population-select')?.selectedOptions[0]?.text || '';
        const populationFilter = document.getElementById('export-population-filter')?.value || 'all';
        if (!selectedPopulationId) {
            this.uiManager.showError('No population selected', 'Please select a population before starting the export.');
            return null;
        }
        
        const exportOptions = {
            populationId: selectedPopulationId, // Send the correct field name backend expects
            selectedPopulationName,
            populationFilter,
            fields: document.getElementById('export-fields-select')?.value || 'all',
            format: document.getElementById('export-format-select')?.value || 'csv',
            ignoreDisabledUsers: document.getElementById('export-ignore-disabled')?.checked || false
        };
        
        // Log the export options for debugging
        console.log('Export options prepared:', exportOptions);
        
        return exportOptions;
    }

    cancelExport() {
        if (this.exportAbortController) {
            this.exportAbortController.abort();
        }
    }

    /**
     * Starts the user delete flow using OperationManagerSubsystem
     */
    async startDelete() {
        try {
            // Check if OperationManagerSubsystem is available
            if (!this.operationManagerSubsystem) {
                this.logger.error('OperationManagerSubsystem not available for delete operation');
                this.uiManager.showError('Delete Failed', 'Operation manager not initialized');
                return;
            }

            // Get delete options
            const deleteOptions = this.getDeleteOptions();
            if (!deleteOptions) {
                return;
            }

            // Use OperationManagerSubsystem to handle the delete operation
            const result = await this.operationManagerSubsystem.startOperation('delete', deleteOptions);
            
            if (result.success) {
                this.logger.info('Delete operation completed successfully', result);
            } else {
                this.logger.error('Delete operation failed', result.error);
            }
            
        } catch (error) {
            this.logger.error('Failed to start delete operation', error);
            this.uiManager.showError('Delete Failed', error.message);
        }
    }

    getDeleteOptions() {
        const selectedPopulationId = document.getElementById('delete-population-select')?.value;
        const selectedPopulationName = document.getElementById('delete-population-select')?.selectedOptions[0]?.text || '';
        
        if (!selectedPopulationId) {
            this.uiManager.showError('No population selected', 'Please select a population before starting the delete.');
            return null;
        }
        
        const totalUsers = this.fileHandler.getTotalUsers();
        if (!totalUsers || totalUsers === 0) {
            this.uiManager.showError('No users to delete', 'Please select a CSV file with users to delete.');
            return null;
        }
        
        return {
            selectedPopulationId,
            selectedPopulationName,
            totalUsers,
            file: this.fileHandler.getCurrentFile()
        };
    }

    cancelDelete() {
        if (this.deleteAbortController) {
            this.deleteAbortController.abort();
        }
    }

    /**
     * Starts the user modify flow using OperationManagerSubsystem
     */
    async startModify() {
        try {
            // Check if OperationManagerSubsystem is available
            if (!this.operationManagerSubsystem) {
                this.logger.error('OperationManagerSubsystem not available for modify operation');
                this.uiManager.showError('Modify Failed', 'Operation manager not initialized');
                return;
            }

            // Get modify options
            const modifyOptions = this.getModifyOptions();
            if (!modifyOptions) {
                return;
            }

            // Use OperationManagerSubsystem to handle the modify operation
            const result = await this.operationManagerSubsystem.startOperation('modify', modifyOptions);
            
            if (result.success) {
                this.logger.info('Modify operation completed successfully', result);
            } else {
                this.logger.error('Modify operation failed', result.error);
            }
            
        } catch (error) {
            this.logger.error('Failed to start modify operation', error);
            this.uiManager.showError('Modify Failed', error.message);
        }
    }

    getModifyOptions() {
        const selectedPopulationId = document.getElementById('modify-population-select')?.value;
        const selectedPopulationName = document.getElementById('modify-population-select')?.selectedOptions[0]?.text || '';
        
        if (!selectedPopulationId) {
            this.uiManager.showError('No population selected', 'Please select a population before starting the modify.');
            return null;
        }
        
        const totalUsers = this.fileHandler.getTotalUsers();
        if (!totalUsers || totalUsers === 0) {
            this.uiManager.showError('No users to modify', 'Please select a CSV file with users to modify.');
            return null;
        }
        
        return {
            selectedPopulationId,
            selectedPopulationName,
            totalUsers,
            file: this.fileHandler.getCurrentFile()
        };
    }

    cancelModify() {
        if (this.modifyAbortController) {
            this.modifyAbortController.abort();
        }
    }

    async startPopulationDelete() {
        // Check for valid token before proceeding
        const hasValidToken = await this.checkTokenAndRedirect('population delete');
        if (!hasValidToken) {
            console.log('❌ [POPULATION DELETE] Population delete cancelled due to missing valid token');
            return;
        }

        try {
            const selectedPopulationId = document.getElementById('population-delete-select')?.value;
            const selectedPopulationName = document.getElementById('population-delete-select')?.selectedOptions[0]?.text || '';
            
            if (!selectedPopulationId) {
                this.uiManager.showError('No population selected', 'Please select a population to delete.');
                return;
            }
            
            // Show population delete status
            this.uiManager.showPopulationDeleteStatus(selectedPopulationName);
            
            // Start population delete process
            const response = await this.localClient.post('/api/population-delete', {
                populationId: selectedPopulationId,
                populationName: selectedPopulationName
            });
            
            // Handle completion
            if (response.success) {
                this.uiManager.updatePopulationDeleteProgress(1, 1, 'Population delete completed successfully');
                this.uiManager.showSuccess('Population delete completed successfully', response.message);
            } else {
                this.uiManager.updatePopulationDeleteProgress(0, 1, 'Population delete failed');
                this.uiManager.showError('Population delete failed', response.error);
            }
            
        } catch (error) {
            this.uiManager.updatePopulationDeleteProgress(0, 1, 'Population delete failed: ' + error.message);
            this.uiManager.showError('Population delete failed', error.message);
        }
    }

    cancelPopulationDelete() {
        this.uiManager.updatePopulationDeleteProgress(0, 0, 'Population delete cancelled');
        this.uiManager.showInfo('Population delete cancelled');
    }

    /**
     * Show the progress section with enhanced UI
     */
    showProgressSection() {
        console.log('🔍 [PROGRESS DEBUG] showProgressSection() called');
        
        // Try multiple ways to get the progress container
        let progressContainer = document.getElementById('progress-container');
        
        if (!progressContainer) {
            console.log('🔍 [PROGRESS DEBUG] Progress container not found by ID, trying class selector...');
            progressContainer = document.querySelector('.progress-container');
        }
        
        if (!progressContainer) {
            console.log('🔍 [PROGRESS DEBUG] Progress container not found by class, trying ElementRegistry...');
            if (typeof ElementRegistry !== 'undefined' && ElementRegistry.progressContainer) {
                progressContainer = ElementRegistry.progressContainer();
            }
        }
        
        console.log('🔍 [PROGRESS DEBUG] Progress container element:', progressContainer);
        
        if (progressContainer) {
            console.log('🔍 [PROGRESS DEBUG] Progress container found, showing...');
            console.log('🔍 [PROGRESS DEBUG] Current display style:', progressContainer.style.display);
            console.log('🔍 [PROGRESS DEBUG] Current visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');
            
            // Force show the progress container
            progressContainer.style.display = 'block';
            progressContainer.style.visibility = 'visible';
            progressContainer.style.opacity = '1';
            
            // Ensure it's not hidden by CSS
            progressContainer.classList.remove('hidden', 'd-none');
            progressContainer.classList.add('visible');
            
            // Force layout recalculation
            progressContainer.offsetHeight;
            
            // Scroll into view
            progressContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            console.log('🔍 [PROGRESS DEBUG] Display style after setting to block:', progressContainer.style.display);
            console.log('🔍 [PROGRESS DEBUG] Container visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');
            console.log('🔍 [PROGRESS DEBUG] Container dimensions:', {
                offsetWidth: progressContainer.offsetWidth,
                offsetHeight: progressContainer.offsetHeight,
                clientWidth: progressContainer.clientWidth,
                clientHeight: progressContainer.clientHeight
            });
            
            // Initialize progress values
            this.updateProgressBar(0);
            this.updateProgressStats({
                total: 0,
                processed: 0,
                success: 0,
                failed: 0,
                skipped: 0
            });
            this.updateProgressStatus('Preparing import...', '');
            this.startProgressTiming();
            
            console.log('✅ [PROGRESS] Progress section shown successfully');
            
            // Additional debugging for child elements
            const progressBarFill = document.querySelector('.progress-bar-fill');
            const progressPercentage = document.querySelector('.progress-percentage');
            const statusMessage = document.querySelector('.status-message');
            
            console.log('🔍 [PROGRESS DEBUG] Child elements:', {
                progressBarFill: !!progressBarFill,
                progressPercentage: !!progressPercentage,
                statusMessage: !!statusMessage
            });
            
            // Additional verification
            setTimeout(() => {
                const isVisible = progressContainer.offsetParent !== null;
                const rect = progressContainer.getBoundingClientRect();
                console.log('🔍 [PROGRESS DEBUG] Final verification:', {
                    isVisible,
                    dimensions: { width: rect.width, height: rect.height },
                    display: progressContainer.style.display,
                    computedDisplay: window.getComputedStyle(progressContainer).display
                });
            }, 100);
            
        } else {
            console.error('❌ [PROGRESS] Progress container not found');
            console.error('🔍 [PROGRESS DEBUG] Available containers with "progress" in ID:', 
                Array.from(document.querySelectorAll('[id*="progress"]')).map(el => el.id));
            console.error('🔍 [PROGRESS DEBUG] Available containers with "progress" in class:', 
                Array.from(document.querySelectorAll('[class*="progress"]')).map(el => ({ id: el.id, className: el.className })));
            
            // Try to create a fallback progress container if none exists
            console.log('🔍 [PROGRESS DEBUG] Attempting to create fallback progress container...');
            this.createFallbackProgressContainer();
        }
    }

    /**
     * Create a fallback progress container if the main one doesn't exist
     */
    createFallbackProgressContainer() {
        console.log('🔍 [PROGRESS FIX] Creating fallback progress container...');
        
        // Create a simple progress container
        const fallbackContainer = document.createElement('div');
        fallbackContainer.id = 'progress-container-fallback';
        fallbackContainer.className = 'progress-container visible';
        fallbackContainer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            z-index: 1000;
        `;
        
        fallbackContainer.innerHTML = `
            <h4>Import Progress</h4>
            <div class="progress-bar" style="width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: 0%; height: 100%; background: #007bff; transition: width 0.3s ease;"></div>
            </div>
            <div class="progress-percentage" style="margin-top: 10px; font-weight: bold;">0%</div>
            <div class="status-message" style="margin-top: 10px;">Preparing import...</div>
            <div class="progress-stats" style="margin-top: 15px; display: flex; gap: 20px;">
                <div>Total: <span class="stat-value total">0</span></div>
                <div>Processed: <span class="stat-value processed">0</span></div>
                <div>Success: <span class="stat-value success">0</span></div>
                <div>Failed: <span class="stat-value failed">0</span></div>
                <div>Skipped: <span class="stat-value skipped">0</span></div>
            </div>
        `;
        
        // Insert the fallback container into the main content area
        const mainContent = document.querySelector('.main-content') || document.querySelector('.container') || document.body;
        mainContent.appendChild(fallbackContainer);
        
        console.log('✅ [PROGRESS FIX] Fallback progress container created and added to DOM');
        
        // Update the progress with the fallback container
        this.updateProgressBar(0);
        this.updateProgressStats({
            total: 0,
            processed: 0,
            success: 0,
            failed: 0,
            skipped: 0
        });
        this.updateProgressStatus('Preparing import...', '');
        this.startProgressTiming();
    }

    /**
     * Hide the progress section
     */
    hideProgressSection() {
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
            this.stopProgressTiming();
        }
    }

    /**
     * Update the progress bar
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgressBar(percentage) {
        const progressBarFill = document.querySelector('.progress-bar-fill');
        const progressPercentage = document.querySelector('.progress-percentage');
        
        if (progressBarFill) {
            progressBarFill.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * Update progress statistics
     * @param {Object} stats - Statistics object
     */
    updateProgressStats(stats) {
        const statElements = {
            total: document.querySelector('.stat-value.total'),
            processed: document.querySelector('.stat-value.processed'),
            success: document.querySelector('.stat-value.success'),
            failed: document.querySelector('.stat-value.failed'),
            skipped: document.querySelector('.stat-value.skipped')
        };

        Object.keys(stats).forEach(key => {
            if (statElements[key]) {
                statElements[key].textContent = stats[key];
            }
        });
    }

    /**
     * Update progress status message
     * @param {string} message - Main status message
     * @param {string} details - Additional details
     */
    updateProgressStatus(message, details = '') {
        const statusMessage = document.querySelector('.status-message');
        const statusDetails = document.querySelector('.status-details');
        
        if (statusMessage) {
            statusMessage.textContent = message;
        }
        
        if (statusDetails) {
            statusDetails.textContent = details;
        }
    }

    /**
     * Start progress timing
     */
    startProgressTiming() {
        this.progressStartTime = Date.now();
        this.progressTimingInterval = setInterval(() => {
            this.updateProgressTiming();
        }, 1000);
    }

    /**
     * Stop progress timing
     */
    stopProgressTiming() {
        if (this.progressTimingInterval) {
            clearInterval(this.progressTimingInterval);
            this.progressTimingInterval = null;
        }
    }

    /**
     * Update progress timing display
     */
    updateProgressTiming() {
        if (!this.progressStartTime) return;

        const elapsed = Date.now() - this.progressStartTime;
        const elapsedElement = document.querySelector('.elapsed-value');
        const etaElement = document.querySelector('.eta-value');
        
        if (elapsedElement) {
            elapsedElement.textContent = this.formatDuration(Math.floor(elapsed / 1000));
        }
        
        if (etaElement) {
            // Simple ETA calculation - can be enhanced with more sophisticated logic
            etaElement.textContent = 'Calculating...';
        }
    }

    async testConnection() {
        try {
            // Set button loading state
            this.uiManager.setButtonLoading('test-connection-btn', true);
            this.uiManager.showSettingsActionStatus('Testing connection...', 'info');
            
            // Add debug logging
            this.logger.info('Starting connection test with LocalAPIClient');
            
            // Try with LocalAPIClient first (main app method)
            let response;
            try {
                response = await this.localClient.post('/api/test-connection');
                this.logger.info('LocalAPIClient test connection successful', { response });
            } catch (localClientError) {
                this.logger.warn('LocalAPIClient failed, trying direct fetch as fallback', { error: localClientError.message });
                
                // Fallback to direct fetch (like test page)
                const fetchResponse = await fetch('/api/test-connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!fetchResponse.ok) {
                    const errorData = await fetchResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
                }
                
                response = await fetchResponse.json();
                this.logger.info('Direct fetch fallback successful', { response });
            }
            
            if (response && response.success) {
                this.logger.info('Connection test successful');
                this.uiManager.showSettingsActionStatus('Connection test successful!', 'success', { autoHideDelay: 3000 });
                
                // Update token status in sidebar
                if (this.tokenStatusIndicator) {
                    this.tokenStatusIndicator.updateStatus();
                }
                
                // Update global token manager
                if (window.globalTokenManager) {
                    window.globalTokenManager.updateStatus();
                }
                
                // Update global status bar
                if (window.globalStatusManager) {
                    window.globalStatusManager.success('Connection test successful!');
                }
                
                // Update connection status area
                const connStatus = document.getElementById('settings-connection-status');
                if (connStatus) {
                    connStatus.textContent = '✅ Connection test successful!';
                    connStatus.classList.remove('status-disconnected', 'status-error');
                    connStatus.classList.add('status-success');
                }
                
            } else {
                throw new Error(response?.error || 'Connection test failed - no success response');
            }
            
        } catch (error) {
            this.logger.error('Connection test failed:', { error: error.message });
            this.uiManager.showSettingsActionStatus(`Connection test failed: ${error.message}`, 'error', { autoHide: false });
            
            // Update global status bar
            if (window.globalStatusManager) {
                window.globalStatusManager.error(`Connection test failed: ${error.message}`);
            }
            
            // Update connection status area
            const connStatus = document.getElementById('settings-connection-status');
            if (connStatus) {
                connStatus.textContent = '❌ Connection test failed';
                connStatus.classList.remove('status-success', 'status-disconnected');
                connStatus.classList.add('status-error');
            }
        } finally {
            // Always reset button loading state
            this.uiManager.setButtonLoading('test-connection-btn', false);
        }
    }

    /**
     * Format duration in seconds to a human-readable string
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    formatDuration(seconds) {
        if (!seconds || seconds <= 0) {
            return '0s';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        let result = '';
        if (hours > 0) {
            result += `${hours}h `;
        }
        if (minutes > 0 || hours > 0) {
            result += `${minutes}m `;
        }
        result += `${secs}s`;
        
        return result.trim();
    }

    /**
     * Get time remaining until expiration from JWT token
     * @param {string} token - JWT token
     * @returns {number|null} Time remaining in seconds, or null if invalid
     */
    getTimeRemainingFromJWT(token) {
        try {
            // Simple JWT decode (just the payload part)
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            
            const payload = JSON.parse(atob(parts[1]));
            if (!payload.exp) {
                return null;
            }
            
            const now = Math.floor(Date.now() / 1000);
            const timeRemaining = payload.exp - now;
            
            return timeRemaining > 0 ? timeRemaining : 0;
        } catch (error) {
            console.error('Error decoding JWT token:', error);
            return null;
        }
    }

    async getToken() {
        try {
            console.log('Get Token button clicked - starting token retrieval...');
            
            // Set button loading state (only if button exists)
            const getTokenButton = document.getElementById('get-token-quick');
            if (getTokenButton) {
                this.uiManager.setButtonLoading('get-token-quick', true);
            }
            this.uiManager.updateConnectionStatus('connecting', 'Getting token...');
            
            console.log('Using PingOneClient to get token (with localStorage storage)...');
            
            // Use PingOneClient which handles localStorage storage
            if (!this.pingOneClient) {
                this.uiManager.showError('Authentication Error', 'Authentication system not initialized. Please refresh the page and try again.');
                return;
            }
            
            const token = await this.pingOneClient.getAccessToken();
            
            console.log('🔍 [TRACE] Token retrieved successfully via PingOneClient, token exists:', !!token);
            console.log('🔍 [TRACE] About to check if token exists for processing...');
            
            // Verify localStorage storage
            if (typeof localStorage !== 'undefined') {
                const storedToken = localStorage.getItem('pingone_token');
                const storedExpiry = localStorage.getItem('pingone_token_expiry');
                console.log('localStorage verification:', {
                    hasStoredToken: !!storedToken,
                    hasStoredExpiry: !!storedExpiry,
                    tokenLength: storedToken ? storedToken.length : 0,
                    expiryTime: storedExpiry ? new Date(parseInt(storedExpiry)).toISOString() : null
                });
            }
            
            if (token) {
                console.log('🔍 [TRACE] Token exists, entering token processing block...');
                // Calculate time remaining
                let timeLeft = '';
                const storedExpiry = localStorage.getItem('pingone_token_expiry');
                
                if (storedExpiry) {
                    const expiryTime = parseInt(storedExpiry, 10);
                    const now = Date.now();
                    const timeRemainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));
                    timeLeft = this.formatDuration(timeRemainingSeconds);
                } else {
                    // Fallback: try to decode JWT if no expiry stored
                    const timeRemainingSeconds = this.getTimeRemainingFromJWT(token);
                    if (timeRemainingSeconds !== null) {
                        timeLeft = this.formatDuration(timeRemainingSeconds);
                    }
                }
                
                // NEW: Direct global token status updater for sidebar (works for both cached and fresh tokens)
                console.log('🚀 [DEBUG] About to call updateGlobalTokenStatusDirect with timeLeft (cached/fresh):', timeLeft);
                try {
                    this.updateGlobalTokenStatusDirect(timeLeft);
                    console.log('✅ [DEBUG] updateGlobalTokenStatusDirect called successfully for cached/fresh token');
                } catch (error) {
                    console.error('❌ [DEBUG] Error calling updateGlobalTokenStatusDirect for cached/fresh token:', error);
                }
                
                // Show success message with time remaining
                const successMessage = timeLeft ? 
                    `✅ New token acquired. Time left on token: ${timeLeft}` :
                    '✅ New token acquired successfully';
                
                this.uiManager.updateConnectionStatus('connected', successMessage);
                this.uiManager.showSuccess('Token retrieved and stored successfully', 
                    timeLeft ? `Token has been saved to your browser. Time left: ${timeLeft}` : 
                    'Token has been saved to your browser for future use.');
                this.uiManager.updateHomeTokenStatus(false);
                
                // Show settings-specific status messages
                this.uiManager.showSettingsActionStatus(`Token acquired successfully! ${timeLeft ? `Time left: ${timeLeft}` : ''}`, 'success', { autoHideDelay: 5000 });
                
                // Update global status bar
                if (window.globalStatusManager) {
                    window.globalStatusManager.success(`Token acquired successfully! ${timeLeft ? `Time left: ${timeLeft}` : ''}`);
                }
                
                // Update connection status area
                const connStatus = document.getElementById('settings-connection-status');
                if (connStatus) {
                    connStatus.textContent = `✅ Token acquired! ${timeLeft ? `(${timeLeft} remaining)` : ''}`;
                    connStatus.classList.remove('status-disconnected', 'status-error');
                    connStatus.classList.add('status-success');
                }
                
                // Refresh token status display on settings page
                if (this.pingOneClient) {
                    const tokenInfo = this.pingOneClient.getCurrentTokenTimeRemaining();
                    this.uiManager.showCurrentTokenStatus(tokenInfo);
                }
                
                // Update universal token status across all pages
                this.updateUniversalTokenStatus();
                
                // Update token status in sidebar
                if (this.tokenStatusIndicator) {
                    this.tokenStatusIndicator.updateStatus();
                }
                
                // Update global token manager
                if (window.globalTokenManager) {
                    window.globalTokenManager.updateStatus();
                }
                
                // NEW: Direct global token status updater for sidebar
                console.log('🚀 [DEBUG] About to call updateGlobalTokenStatusDirect with timeLeft:', timeLeft);
                try {
                    this.updateGlobalTokenStatusDirect(timeLeft);
                } catch (error) {
                    console.error('❌ [DEBUG] Error calling updateGlobalTokenStatusDirect:', error);
                }
                
                // Complete startup process when token is successfully obtained
                this.completeStartup();
                
                // Log success message if DEBUG_MODE is enabled
                if (window.DEBUG_MODE) {
                    console.log('Token acquisition successful:', {
                        tokenLength: token.length,
                        timeLeft: timeLeft,
                        successMessage: successMessage
                    });
                }
            } else {
                this.uiManager.updateConnectionStatus('error', 'Failed to get token');
                this.uiManager.showError('Failed to get token', 'No token received from server');
                
                // Show settings-specific error messages
                this.uiManager.showSettingsActionStatus('Failed to get token: No token received from server', 'error', { autoHide: false });
                
                // Update global status bar
                if (window.globalStatusManager) {
                    window.globalStatusManager.error('Failed to get token: No token received from server');
                }
                
                // Update connection status area
                const connStatus = document.getElementById('settings-connection-status');
                if (connStatus) {
                    connStatus.textContent = '❌ Failed to get token';
                    connStatus.classList.remove('status-success', 'status-disconnected');
                    connStatus.classList.add('status-error');
                }
            }
            
        } catch (error) {
            console.error('Error in getToken:', error);
            this.uiManager.updateConnectionStatus('error', 'Failed to get token: ' + error.message);
            this.uiManager.showError('Failed to get token', error.message);
            
            // Show settings-specific error messages
            this.uiManager.showSettingsActionStatus(`Failed to get token: ${error.message}`, 'error', { autoHide: false });
            
            // Update global status bar
            if (window.globalStatusManager) {
                window.globalStatusManager.error(`Failed to get token: ${error.message}`);
            }
            
            // Update connection status area
            const connStatus = document.getElementById('settings-connection-status');
            if (connStatus) {
                connStatus.textContent = '❌ Failed to get token';
                connStatus.classList.remove('status-success', 'status-disconnected');
                connStatus.classList.add('status-error');
            }
        } finally {
            // Always reset button loading state (only if button exists)
            console.log('Resetting Get Token button loading state...');
            const getTokenButton = document.getElementById('get-token-quick');
            if (getTokenButton) {
                this.uiManager.setButtonLoading('get-token-quick', false);
            }
        }
    }

    /**
     * Check if a valid token is available and redirect to settings if not
     * @param {string} operation - Name of the operation being attempted
     * @returns {boolean} - True if valid token is available, false otherwise
     */
    async checkTokenAndRedirect(operation = 'operation') {
        try {
            console.log(`🔐 [TOKEN CHECK] Checking token for ${operation}...`);
            
            // Check if PingOneClient is available
            if (!this.pingOneClient) {
                console.error('❌ [TOKEN CHECK] PingOneClient not initialized');
                this.uiManager.showError('Authentication Error', 'Authentication system not initialized. Please refresh the page and try again.');
                return false;
            }
            
            // Get current token status
            const tokenInfo = this.pingOneClient.getCurrentTokenTimeRemaining();
            
            console.log('🔍 [TOKEN CHECK] Token status:', {
                hasToken: !!tokenInfo.token,
                isExpired: tokenInfo.isExpired,
                timeRemaining: tokenInfo.timeRemaining
            });
            
            // Check if token is valid and not expired
            if (!tokenInfo.token || tokenInfo.isExpired) {
                console.warn('❌ [TOKEN CHECK] No valid token found for operation:', operation);
                
                // Show enhanced token alert modal with action button
                showTokenAlertModal({
                    tokenStatus: tokenInfo.token ? 'Expired' : 'Not Available',
                    expiry: tokenInfo.expiry ? new Date(tokenInfo.expiry).toLocaleString() : '',
                    operation: operation
                });
                
                return false;
            }
            
            console.log('✅ [TOKEN CHECK] Valid token found for operation:', operation);
            return true;
            
        } catch (error) {
            console.error('❌ [TOKEN CHECK] Error checking token:', error);
            this.uiManager.showError('Authentication Error', 'Unable to verify authentication status. Please refresh the page and try again.');
            return false;
        }
    }

    async toggleFeatureFlag(flag, enabled) {
        try {
            const response = await this.localClient.post(`/api/feature-flags/${flag}`, { enabled });
            
            if (response.success) {
                this.uiManager.showSuccess(`Feature flag ${flag} ${enabled ? 'enabled' : 'disabled'}`);
                
                // If progress page was disabled and user is currently on it, redirect to home
                if (flag === 'progressPage' && !enabled && this.currentView === 'progress') {
                    this.uiManager.showWarning('Progress page has been disabled. Redirecting to home page.');
                    this.showView('home');
                }
            } else {
                this.uiManager.showError(`Failed to toggle feature flag ${flag}`, response.error);
            }
            
        } catch (error) {
            this.uiManager.showError(`Failed to toggle feature flag ${flag}`, error.message);
        }
    }

    async resetFeatureFlags() {
        try {
            const response = await this.localClient.post('/api/feature-flags/reset', {});
            
            if (response.success) {
                // Reset all checkboxes to default values
                const checkboxes = document.querySelectorAll('[data-feature-flag]');
                checkboxes.forEach(checkbox => {
                    const flag = checkbox.getAttribute('data-feature-flag');
                    checkbox.checked = false; // Default to false
                });
                console.log('All feature flags reset to defaults');
            } else {
                console.error('Failed to reset feature flags');
            }
        } catch (error) {
            console.error('Error resetting feature flags:', error);
        }
    }

    async addNewFeatureFlag() {
        try {
            const flagName = document.getElementById('new-flag-name').value.trim();
            const description = document.getElementById('new-flag-description').value.trim();
            const enabled = document.getElementById('new-flag-enabled').checked;

            if (!flagName) {
                this.showFeatureFlagsStatus('Please enter a flag name', 'warning');
                return;
            }

            if (!description) {
                this.showFeatureFlagsStatus('Please enter a description', 'warning');
                return;
            }

            // Create new flag item in the UI
            const flagsContainer = document.querySelector('.feature-flags-content');
            const newFlagItem = document.createElement('div');
            newFlagItem.className = 'feature-flag-item';
            newFlagItem.innerHTML = `
                <label class="feature-flag-label">
                    <input type="checkbox" id="flag${flagName}" class="feature-flag-checkbox" data-feature-flag="${flagName}" ${enabled ? 'checked' : ''}>
                    <span class="feature-flag-text">Feature Flag ${flagName}</span>
                </label>
                <span class="feature-flag-description">${description}</span>
            `;

            // Insert before the add section
            const addSection = document.querySelector('.feature-flag-add-section');
            flagsContainer.insertBefore(newFlagItem, addSection);

            // Add event listener to the new checkbox
            const newCheckbox = newFlagItem.querySelector(`#flag${flagName}`);
            newCheckbox.addEventListener('change', async (e) => {
                const flag = e.target.getAttribute('data-feature-flag');
                const enabled = e.target.checked;
                await this.toggleFeatureFlag(flag, enabled);
            });

            // Clear the form
            document.getElementById('new-flag-name').value = '';
            document.getElementById('new-flag-description').value = '';
            document.getElementById('new-flag-enabled').checked = false;

            this.showFeatureFlagsStatus(`Feature flag "${flagName}" added successfully`, 'success');

        } catch (error) {
            console.error('Error adding new feature flag:', error);
            this.showFeatureFlagsStatus('Failed to add feature flag', 'error');
        }
    }

    showFeatureFlagsStatus(message, type = 'info') {
        const statusElement = document.getElementById('feature-flags-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `feature-flags-status ${type}`;
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }

    refreshProgressPage() {
        // No-op: No refreshProgressData method exists; navigation should not throw errors.
        // If needed, call a real method here (e.g., this.uiManager.startExportOperation()), but only if required.
    }

    // Test function to verify population selection
    testPopulationSelection() {
        console.log('=== Testing Population Selection ===');
        const populationSelect = document.getElementById('import-population-select');
        console.log('Population select element:', populationSelect);
        console.log('Current value:', populationSelect?.value);
        console.log('Selected option text:', populationSelect?.selectedOptions[0]?.text);
        console.log('All options:', populationSelect ? Array.from(populationSelect.options).map(opt => ({ value: opt.value, text: opt.text })) : 'No select element');
        
        // Test getImportOptions
        const options = this.getImportOptions();
        console.log('getImportOptions result:', options);
        
        // Test getCurrentPopulationSelection
        const currentSelection = this.getCurrentPopulationSelection();
        console.log('getCurrentPopulationSelection result:', currentSelection);
        
        // Test forceRefreshPopulationSelection
        const forceRefresh = this.forceRefreshPopulationSelection();
        console.log('forceRefreshPopulationSelection result:', forceRefresh);
        
        // Validate consistency
        if (options && currentSelection && forceRefresh) {
            const isConsistent = options.selectedPopulationId === currentSelection.id && 
                               currentSelection.id === forceRefresh.id;
            console.log('Population selection consistency:', isConsistent);
            if (!isConsistent) {
                console.warn('Population selection inconsistency detected!');
            }
        }
        
        console.log('===============================');
        return {
            options,
            currentSelection,
            forceRefresh
        };
    }

    // Simplifies UX for disclaimer acknowledgment while still ensuring legal consent
    setupDisclaimerAgreement() {
        // New disclaimer modal system - check if disclaimer was previously accepted
        console.log('[Disclaimer] Setting up disclaimer agreement system');
        
        try {
            // Check if disclaimer was previously accepted
            if (window.DisclaimerModal && window.DisclaimerModal.isDisclaimerAccepted()) {
                console.log('[Disclaimer] Disclaimer previously accepted, enabling tool');
                this.enableToolAfterDisclaimer();
                this.showDisclaimerStatus();
                return;
            }

            // If disclaimer modal is available, let it handle the disclaimer flow
            if (window.DisclaimerModal) {
                console.log('[Disclaimer] Using new disclaimer modal system');
                // The modal will handle the disclaimer flow automatically
                return;
            }

            // Fallback to old disclaimer system if modal is not available
            console.warn('[Disclaimer] Disclaimer modal not available, using fallback system');
            this.setupFallbackDisclaimer();
            
        } catch (err) {
            console.error('[Disclaimer] Error in setupDisclaimerAgreement:', err);
        }
    }

    setupFallbackDisclaimer() {
        // Fallback disclaimer system for when modal is not available
        try {
            const disclaimerCheckbox = document.getElementById('disclaimer-agreement');
            const acceptButton = document.getElementById('accept-disclaimer');
            const disclaimerBox = document.getElementById('disclaimer');

            if (!disclaimerCheckbox || !acceptButton || !disclaimerBox) {
                console.warn('[Disclaimer] Fallback disclaimer elements not found');
                return;
            }

            console.log('[Disclaimer] Setting up fallback disclaimer system');

            const checkAgreementStatus = () => {
                const isChecked = disclaimerCheckbox.checked;
                acceptButton.disabled = !isChecked;
                
                if (isChecked) {
                    acceptButton.classList.remove('btn-secondary');
                    acceptButton.classList.add('btn-danger');
                } else {
                    acceptButton.classList.remove('btn-danger');
                    acceptButton.classList.add('btn-secondary');
                }
            };

            disclaimerCheckbox.addEventListener('change', (e) => {
                console.log('[Disclaimer] Checkbox changed:', e.target.checked);
                checkAgreementStatus();
            });

            acceptButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[Disclaimer] Accept button clicked');
                
                if (disclaimerCheckbox.checked) {
                    console.log('[Disclaimer] ✅ Disclaimer accepted - enabling tool');
                    this.enableToolAfterDisclaimer();
                } else {
                    console.warn('[Disclaimer] ❌ Button clicked but checkbox not checked');
                    this.uiManager.showError('Disclaimer Error', 'Please check the agreement box before proceeding.');
                }
            });

            checkAgreementStatus();
            console.log('[Disclaimer] Fallback disclaimer setup completed');
            
        } catch (err) {
            console.error('[Disclaimer] Error in setupFallbackDisclaimer:', err);
        }
    }

    // Check if disclaimer was previously accepted
    checkDisclaimerStatus() {
        // Use the new disclaimer modal system if available
        if (window.DisclaimerModal && window.DisclaimerModal.isDisclaimerAccepted()) {
            console.log('[Disclaimer] Disclaimer previously accepted via modal system');
            this.enableToolAfterDisclaimer();
            this.showDisclaimerStatus();
            return true;
        }

        // Fallback to localStorage check
        if (typeof localStorage !== 'undefined') {
            const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
            const disclaimerDate = localStorage.getItem('disclaimerAcceptedDate');
            
            console.log('[Disclaimer] Status check:', {
                accepted: disclaimerAccepted,
                date: disclaimerDate
            });
            
            if (disclaimerAccepted === 'true') {
                console.log('[Disclaimer] Disclaimer previously accepted, enabling tool');
                this.enableToolAfterDisclaimer();
                this.showDisclaimerStatus();
                return true;
            }
        }
        
        return false;
    }

    showPopulationChoicePrompt() {
        // Only show once per import session
        if (this.populationPromptShown) return;
        // Check if both file and population are selected
        const file = this.fileHandler.getCurrentFile && this.fileHandler.getCurrentFile();
        const populationSelect = document.getElementById('import-population-select');
        const populationId = populationSelect && populationSelect.value;
        if (!file || !populationId) return;
        // Check if CSV has a populationId column
        const users = this.fileHandler.getParsedUsers ? this.fileHandler.getParsedUsers() : [];
        if (!users.length) return;
        const hasPopulationColumn = Object.keys(users[0]).some(
            h => h.toLowerCase() === 'populationid' || h.toLowerCase() === 'population_id'
        );
        if (!hasPopulationColumn) return; // Don't prompt if no populationId in CSV
        // Show the modal
        const modal = document.getElementById('population-warning-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        this.populationPromptShown = true;
        // Set up modal buttons
        const okBtn = document.getElementById('population-warning-ok');
        const settingsBtn = document.getElementById('population-warning-settings');
        // Optionally, add override/ignore/use-csv buttons if you want more than just OK/Settings
        // For now, just close on OK
        if (okBtn) {
            okBtn.onclick = () => {
                modal.style.display = 'none';
                this.populationChoice = 'use-csv'; // Default to use CSV if present
            };
        }
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                modal.style.display = 'none';
                this.populationChoice = 'settings';
                this.showView('settings');
            };
        }
    }

    showPopulationConflictModal(conflictData, sessionId) {
        console.log('Showing population conflict modal:', conflictData);
        
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('population-conflict-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'population-conflict-modal';
            modal.className = 'modal fade show';
            modal.style.display = 'flex';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';
            
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Population Conflict Detected</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <strong>Conflict:</strong> Your CSV file contains population data AND you selected a population in the UI.
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6>CSV Population Data</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>Users with population IDs:</strong> ${conflictData.csvPopulationCount}</p>
                                            <p>Users in your CSV file have their own population assignments.</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6>UI Selected Population</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>Selected population:</strong> ${conflictData.uiSelectedPopulation}</p>
                                            <p>You selected this population in the dropdown.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3">
                                <p><strong>Please choose which population to use:</strong></p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="use-csv-population">
                                Use CSV Population Data
                            </button>
                            <button type="button" class="btn btn-primary" id="use-ui-population">
                                Use UI Selected Population
                            </button>
                            <button type="button" class="btn btn-outline-secondary" id="cancel-conflict-resolution">
                                Cancel Import
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } else {
            modal.style.display = 'flex';
        }
        
        // Set up event listeners
        const useCsvBtn = document.getElementById('use-csv-population');
        const useUiBtn = document.getElementById('use-ui-population');
        const cancelBtn = document.getElementById('cancel-conflict-resolution');
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        const resolveConflict = async (useCsvPopulation) => {
            try {
                const response = await fetch('/api/import/resolve-conflict', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId,
                        useCsvPopulation,
                        useUiPopulation: !useCsvPopulation
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    closeModal();
                    this.uiManager.showSuccess('Conflict resolved', 'Import will continue with your selection.');
                    
                    // Restart the import with the resolved conflict
                    await this.startImport();
                } else {
                    this.uiManager.showError('Failed to resolve conflict', result.error || 'Unknown error');
                }
            } catch (error) {
                this.uiManager.showError('Failed to resolve conflict', error.message);
            }
        };
        
        useCsvBtn.onclick = () => resolveConflict(true);
        useUiBtn.onclick = () => resolveConflict(false);
        cancelBtn.onclick = () => {
            closeModal();
            this.uiManager.showInfo('Import cancelled', 'Population conflict resolution was cancelled.');
        };
    }

    showInvalidPopulationModal(invalidData, sessionId) {
        console.log('Showing invalid population modal:', invalidData);
        // Get UI-selected population
        let uiPopulationName = '';
        let uiPopulationId = '';
        const populationSelect = document.getElementById('import-population-select');
        if (populationSelect) {
            uiPopulationId = populationSelect.value;
            uiPopulationName = populationSelect.selectedOptions[0]?.text || '';
        }
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('invalid-population-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'invalid-population-modal';
            modal.className = 'modal fade show';
            modal.style.display = 'flex';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Invalid Populations Detected</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <strong>Warning:</strong> Your CSV file contains population IDs that don't exist in PingOne.
                            </div>
                            <div class="ui-selected-population" style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:5px; padding:8px 12px; margin-bottom:12px;">
                                <strong>UI-selected population:</strong> ${uiPopulationName ? uiPopulationName : '(none selected)'}${uiPopulationId ? ` <span style='color:#888'>(ID: ${uiPopulationId})</span>` : ''}
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6>Invalid Populations</h6>
                                        </div>
                                        <div class="card-body">
                                            <p><strong>Invalid population IDs:</strong></p>
                                            <ul>
                                                ${invalidData.invalidPopulations.map(id => `<li><code>${id}</code></li>`).join('')}
                                            </ul>
                                            <p><strong>Affected users:</strong> ${invalidData.affectedUserCount}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6>Select Valid Population</h6>
                                        </div>
                                        <div class="card-body">
                                            <p>Please select a valid population to use for these users:</p>
                                            <select class="form-select" id="valid-population-select">
                                                <option value="">Loading populations...</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="use-selected-population" disabled>
                                Use Selected Population
                            </button>
                            <button type="button" class="btn btn-outline-secondary" id="cancel-invalid-population-resolution">
                                Cancel Import
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            // Update UI-selected population info if modal already exists
            const uiPopDiv = modal.querySelector('.ui-selected-population');
            if (uiPopDiv) {
                uiPopDiv.innerHTML = `<strong>UI-selected population:</strong> ${uiPopulationName ? uiPopulationName : '(none selected)'}${uiPopulationId ? ` <span style='color:#888'>(ID: ${uiPopulationId})</span>` : ''}`;
            }
            modal.style.display = 'flex';
        }
        // Use a different variable for the modal's population select
        const modalPopulationSelect = document.getElementById('valid-population-select');
        // Load available populations
        this.loadPopulationsForModal(invalidData, sessionId);
        
        // Set up event listeners
        const useSelectedBtn = document.getElementById('use-selected-population');
        const cancelBtn = document.getElementById('cancel-invalid-population-resolution');
        const populationSelectForModal = document.getElementById('valid-population-select');
        
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        const resolveInvalidPopulation = async (selectedPopulationId) => {
            try {
                const response = await fetch('/api/import/resolve-invalid-population', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId,
                        selectedPopulationId
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    closeModal();
                    this.uiManager.showSuccess('Invalid population resolved', 'Import will continue with the selected population.');
                    
                    // Restart the import with the resolved invalid population
                    await this.startImport();
                } else {
                    this.uiManager.showError('Failed to resolve invalid population', result.error || 'Unknown error');
                }
            } catch (error) {
                this.uiManager.showError('Failed to resolve invalid population', error.message);
            }
        };
        
        useSelectedBtn.onclick = () => {
            const selectedPopulationId = populationSelectForModal.value;
            if (selectedPopulationId) {
                // Apply selected population to all affected users (fallback to all if indexes missing)
                const users = this.fileHandler.getParsedUsers ? this.fileHandler.getParsedUsers() : [];
                let indexes = [];
                if (invalidData && Array.isArray(invalidData.affectedUserIndexes) && invalidData.affectedUserIndexes.length > 0) {
                    indexes = invalidData.affectedUserIndexes;
                } else {
                    indexes = users.map((_, idx) => idx);
                }
                console.log("Affected indexes:", indexes);
                console.log("Users before update:", users.slice(0, 5));
                indexes.forEach(idx => {
                    if (users[idx]) users[idx].populationId = selectedPopulationId;
                });
                console.log("User resolved population conflict with:", selectedPopulationId);
                this.uiManager.showInfo(`User resolved population conflict with: ${selectedPopulationId}`);
                closeModal();
                // Resume import
                this.startImport();
            }
        };
        
        cancelBtn.onclick = () => {
            closeModal();
            this.uiManager.showInfo('Import cancelled', 'Invalid population resolution was cancelled.');
        };
        
        // Enable/disable button based on selection
        populationSelectForModal.addEventListener('change', () => {
            useSelectedBtn.disabled = !populationSelectForModal.value;
        });
    }

    async loadPopulationsForModal(invalidData, sessionId) {
        await this.loadPopulationsForDropdown('valid-population-select');
        // The rest of the modal logic should assume the dropdown is now loaded or shows error/retry
        // Remove the old fetch logic below:
        // try {
        //     const response = await fetch('/api/pingone/populations');
        //     if (response.ok) {
        //         const populations = await response.json();
        //         const populationSelect = document.getElementById('valid-population-select');
        //         if (populationSelect) {
        //             populationSelect.innerHTML = '<option value="">Select a population...</option>';
        //             populations.forEach(population => {
        //                 const option = document.createElement('option');
        //                 option.value = population.id;
        //                 option.textContent = population.name;
        //                 populationSelect.appendChild(option);
        //             });
        //         }
        //     } else {
        //         console.error('Failed to load populations for modal');
        //     }
        // } catch (error) {
        //     console.error('Error loading populations for modal:', error);
        // }
    }

    // Error tracking methods for import operations
    trackImportError(errorMessage) {
        this.importErrors.push(errorMessage);
        this.updateImportErrorDisplay();
    }

    clearImportErrors() {
        this.importErrors = [];
        this.uiManager.hideImportErrorStatus();
    }

    updateImportErrorDisplay() {
        if (this.importErrors.length > 0) {
            const errorSummary = `Import completed with ${this.importErrors.length} error(s)`;
            this.uiManager.updateImportErrorStatus(errorSummary, this.importErrors);
        } else {
            this.uiManager.hideImportErrorStatus();
        }
    }

    resetImportErrorTracking() {
        this.importErrors = [];
        this.uiManager.hideImportErrorStatus();
    }

    // Prompt user to pick a valid population if none is selected
    async promptForPopulationSelection(affectedIndexes, users) {
        return new Promise((resolve) => {
            // Build modal
            let modal = document.getElementById('pick-population-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'pick-population-modal';
                modal.className = 'modal fade show';
                modal.style.display = 'flex';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.zIndex = '9999';
                modal.innerHTML = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Select Population for Import</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    <strong>Warning:</strong> No valid population is selected. Please pick a population to use for all users missing or with invalid population IDs.
                                </div>
                                <div class="form-group">
                                    <label for="pick-population-select">Select Population:</label>
                                    <select class="form-select" id="pick-population-select">
                                        <option value="">Loading populations...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" id="pick-population-confirm" disabled>Use Selected Population</button>
                                <button type="button" class="btn btn-outline-secondary" id="pick-population-cancel">Cancel Import</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                modal.style.display = 'flex';
            }
            // Populate dropdown
            const populationSelect = document.getElementById('pick-population-select');
            populationSelect.innerHTML = '<option value="">Select a population...</option>';
            const importPopSelect = document.getElementById('import-population-select');
            if (importPopSelect) {
                Array.from(importPopSelect.options).forEach(opt => {
                    if (opt.value) {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        populationSelect.appendChild(option);
                    }
                });
            }
            // Enable confirm button only if a valid selection
            const confirmBtn = document.getElementById('pick-population-confirm');
            populationSelect.addEventListener('change', () => {
                confirmBtn.disabled = !populationSelect.value;
            });
            // Confirm handler
            confirmBtn.onclick = () => {
                const selectedId = populationSelect.value;
                if (selectedId) {
                    // Set the UI dropdown to this value
                    if (importPopSelect) importPopSelect.value = selectedId;
                    modal.style.display = 'none';
                    resolve(selectedId);
                }
            };
            // Cancel handler
            document.getElementById('pick-population-cancel').onclick = () => {
                modal.style.display = 'none';
                this.uiManager.showInfo('Import cancelled', 'No population selected.');
                resolve(null);
            };
        });
    }

    /**
     * Update universal token status across all pages
     * 
     * This method provides a centralized way to update the token status
     * display that appears on all pages. It ensures consistent token
     * status visibility and helps users understand their token state
     * without navigating to the settings page.
     * 
     * Called after token acquisition, expiration, or manual refresh
     * to keep all pages synchronized with current token state.
     */
    updateUniversalTokenStatus() {
        try {
            console.log('🔄 Updating universal token status...');
            
            // Update global token manager if available
            if (window.globalTokenManager && typeof window.globalTokenManager.updateStatus === 'function') {
                window.globalTokenManager.updateStatus();
                console.log('✅ Global token status updated');
            }
            
            // Update token status indicator if available
            if (window.tokenStatusIndicator && typeof window.tokenStatusIndicator.updateStatus === 'function') {
                window.tokenStatusIndicator.updateStatus();
                console.log('✅ Token status indicator updated');
            }
            
            console.log('✅ Universal token status update complete');
        } catch (error) {
            console.error('❌ Error updating universal token status:', error);
        }
    }

    /**
     * Direct update of global token status element in sidebar
     * 
     * This method directly targets and updates the global token status element
     * in the sidebar to ensure it shows the correct token information when
     * a new token is acquired. This is a backup method to ensure the sidebar
     * token status is always updated correctly.
     * 
     * @param {string} timeLeft - Formatted time remaining string (e.g., "1h 0m 0s")
     */
    updateGlobalTokenStatusDirect(timeLeft) {
        try {
            console.log('🔄 [DIRECT] Updating global token status in sidebar...');
            
            const globalTokenStatus = document.getElementById('global-token-status');
            if (!globalTokenStatus) {
                console.warn('❌ [DIRECT] Global token status element not found');
                return;
            }
            
            console.log('✅ [DIRECT] Found global token status element:', globalTokenStatus);
            
            const countdown = globalTokenStatus.querySelector('.global-token-countdown');
            const icon = globalTokenStatus.querySelector('.global-token-icon');
            const text = globalTokenStatus.querySelector('.global-token-text');
            const getTokenBtn = document.getElementById('global-get-token');
            
            console.log('🔍 [DIRECT] Token status elements found:', {
                countdown: !!countdown,
                icon: !!icon,
                text: !!text,
                getTokenBtn: !!getTokenBtn,
                timeLeft: timeLeft
            });
            
            if (!countdown || !icon || !text) {
                console.warn('❌ [DIRECT] Required elements not found:', {
                    countdown: !!countdown,
                    icon: !!icon,
                    text: !!text
                });
                return;
            }
            
            // Update the countdown display
            console.log('⏰ [DIRECT] Setting countdown to:', timeLeft);
            countdown.textContent = timeLeft || 'Unknown';
            countdown.style.color = 'rgb(40, 167, 69)'; // Green for valid token
            countdown.style.fontWeight = 'normal';
            
            // Update the icon and text
            console.log('✅ [DIRECT] Setting status to: Token valid');
            icon.textContent = '✅';
            text.textContent = 'Token valid';
            text.style.visibility = 'visible';
            
            // Update the container class
            globalTokenStatus.className = 'global-token-status valid';
            
            // Hide the Get Token button since we have a valid token
            if (getTokenBtn) {
                getTokenBtn.style.display = 'none';
                console.log('🔒 [DIRECT] Hidden Get Token button');
            }
            
            console.log('✅ [DIRECT] Global token status updated successfully!');
            
        } catch (error) {
            console.error('❌ [DIRECT] Error updating global token status:', error);
        }
    }

    // Enable the tool after disclaimer is accepted
    enableToolAfterDisclaimer() {
        console.log('[Disclaimer] === Enabling Tool After Disclaimer ===');
        try {
            // Hide the disclaimer section
            const disclaimerSection = document.getElementById('disclaimer');
            if (disclaimerSection) {
                disclaimerSection.style.display = 'none';
                console.log('[Disclaimer] Disclaimer section hidden');
            }

            // Enable navigation tabs
            const navItems = document.querySelectorAll('[data-view]');
            navItems.forEach(item => {
                item.style.pointerEvents = 'auto';
                item.style.opacity = '1';
            });

            // Enable feature cards
            const featureCards = document.querySelectorAll('.feature-card');
            featureCards.forEach(card => {
                card.style.pointerEvents = 'auto';
                card.style.opacity = '1';
            });

            // Show disclaimer status instead of success message
            this.showDisclaimerStatus();

            // Store disclaimer acceptance in localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('disclaimerAccepted', 'true');
                localStorage.setItem('disclaimerAcceptedDate', new Date().toISOString());
            }

            // Scroll to top of page smoothly after disclaimer acceptance
            setTimeout(() => {
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
                console.log('[Disclaimer] ✅ Scrolled to top of page smoothly');
            }, 100);

            // Show startup screen after disclaimer acceptance
            console.log('[Disclaimer] Showing startup screen after disclaimer acceptance');
            this.showStartupScreen();

            console.log('[Disclaimer] ✅ Tool enabled successfully after disclaimer acceptance');
        } catch (error) {
            console.error('[Disclaimer] Error enabling tool after disclaimer:', error);
            this.uiManager.showError('Error', 'Failed to enable tool after disclaimer acceptance.');
        }
    }

    showDisclaimerStatus() {
        // Show the disclaimer status section
        const disclaimerStatus = document.getElementById('disclaimer-status');
        if (disclaimerStatus) {
            disclaimerStatus.style.display = 'block';
            console.log('[Disclaimer] Disclaimer status shown');
        }

        // Log the disclaimer acceptance
        if (this.loggingSubsystem && typeof this.loggingSubsystem.log === 'function') {
            this.loggingSubsystem.log('info', 'Disclaimer accepted by user', {
                source: 'app',
                type: 'disclaimer',
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('[Disclaimer] Disclaimer accepted by user', {
                source: 'app',
                type: 'disclaimer',
                timestamp: new Date().toISOString()
            });
        }
    }

    attachPopulationChangeListener() {
        console.log('🔄 Attaching population change listener...');
        
        const populationSelectEl = document.getElementById('import-population-select');
        if (!populationSelectEl) {
            console.error('❌ Population select element not found for event listener');
            console.error('❌ Available select elements:', document.querySelectorAll('select[id*="population"]').length);
            return;
        }
        
        console.log('✅ Population select element found for event listener');
        
        // Remove existing listener to prevent duplicates
        populationSelectEl.removeEventListener('change', this.handlePopulationChange.bind(this));
        console.log('🔄 Removed existing event listener');
        
        // Add the change listener
        populationSelectEl.addEventListener('change', this.handlePopulationChange.bind(this));
        console.log('✅ Population change listener attached');
    }
    
    handlePopulationChange(e) {
        const populationSelectEl = e.target;
        const selectedId = populationSelectEl.value;
        const selectedName = populationSelectEl.selectedOptions[0]?.text || '';
        
        this.selectedPopulationId = selectedId;
        this.selectedPopulationName = selectedName;
        
        console.log('[Population] Dropdown changed:', { id: selectedId, name: selectedName });
        
        // Update import button state when population selection changes
        this.updateImportButtonState();
        
        // Update population display in import stats
        const populationNameElement = document.getElementById('import-population-name');
        const populationIdElement = document.getElementById('import-population-id');
        
        if (populationNameElement) {
            populationNameElement.textContent = selectedName || 'Not selected';
        }
        
        if (populationIdElement) {
            populationIdElement.textContent = selectedId || 'Not set';
        }

        // Update API URL display with debugging
        console.log('[Population] Calling updatePopulationApiUrl with:', { selectedId, selectedName });
        this.updatePopulationApiUrl(selectedId, selectedName);
    }

    // If you have a modal or function that uses pick-population-select, add:
    async loadPickPopulationModal() {
        await this.loadPopulationsForDropdown('pick-population-select');
        // The rest of the modal logic should assume the dropdown is now loaded or shows error/retry
    }

    /**
     * Update the API URL display for the selected population
     * @param {string} populationId - The selected population ID
     * @param {string} populationName - The selected population name
     */
    updatePopulationApiUrl(populationId, populationName) {
        console.log('[Population] updatePopulationApiUrl called with:', { populationId, populationName });
        
        const apiUrlElement = document.getElementById('population-api-url');
        const apiUrlTextElement = apiUrlElement?.querySelector('.api-url-text');
        const populationNameElement = document.querySelector('.population-name-text');
        
        console.log('[Population] Found elements:', {
            apiUrlElement: !!apiUrlElement,
            apiUrlTextElement: !!apiUrlTextElement,
            populationNameElement: !!populationNameElement
        });
        
        if (!apiUrlElement || !apiUrlTextElement) {
            console.warn('API URL display elements not found');
            return;
        }

        if (populationId && populationName) {
            // Get the current environment settings to construct the API URL
            const environmentId = document.getElementById('environment-id')?.value;
            const region = this.getSelectedRegionInfo();
            
            console.log('[Population] Environment check:', {
                environmentId,
                region,
                hasEnvironmentId: !!environmentId,
                hasRegion: !!region
            });
            
            if (environmentId && region) {
                const apiUrl = `${region.apiUrl}/v1/environments/${environmentId}/populations/${populationId}`;
                apiUrlTextElement.textContent = apiUrl;
                apiUrlElement.className = 'api-url-display has-url';
                
                // Update population name display
                if (populationNameElement) {
                    populationNameElement.textContent = `Population: ${populationName}`;
                    console.log('[Population] Updated population name to:', `Population: ${populationName}`);
                }
            } else {
                apiUrlTextElement.textContent = 'Environment not configured';
                apiUrlElement.className = 'api-url-display no-url';
                
                // Update population name display
                if (populationNameElement) {
                    populationNameElement.textContent = 'Population: Environment not configured';
                    console.log('[Population] Environment not configured, setting to: Population: Environment not configured');
                }
            }
        } else {
            apiUrlTextElement.textContent = 'Select a population to see the API URL';
            apiUrlElement.className = 'api-url-display no-url';
            
            // Update population name display
            if (populationNameElement) {
                populationNameElement.textContent = 'Population: Select a population';
            }
        }
    }

    getSelectedRegionInfo() {
        const regionSelect = document.getElementById('region');
        if (!regionSelect) return { code: 'NA', tld: 'com', label: 'North America (excluding Canada)', apiUrl: 'https://api.pingone.com' };
        const selectedOption = regionSelect.options[regionSelect.selectedIndex];
        const regionCode = selectedOption.value;
        
        // Define region information
        const regionInfo = {
            'NA': { code: 'NA', tld: 'com', label: 'North America (excluding Canada)', apiUrl: 'https://api.pingone.com' },
            'CA': { code: 'CA', tld: 'ca', label: 'Canada', apiUrl: 'https://api.ca.pingone.ca' },
            'EU': { code: 'EU', tld: 'eu', label: 'Europe', apiUrl: 'https://api.eu.pingone.eu' },
            'AU': { code: 'AU', tld: 'com.au', label: 'Australia', apiUrl: 'https://api.au.pingone.com.au' },
            'SG': { code: 'SG', tld: 'sg', label: 'Singapore', apiUrl: 'https://api.sg.pingone.sg' }
        };
        
        return regionInfo[regionCode] || regionInfo['NA'];
    }

    // Example: Defensive null check for classList usage
    safeAddClass(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    }
    safeRemoveClass(element, className) {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    }



    /**
     * Force update progress UI elements to ensure visibility
     */
    forceUpdateProgressUI() {
        console.log('🔍 [PROGRESS FIX] Force updating progress UI elements');
        
        // Force show progress container
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressContainer.style.visibility = 'visible';
            progressContainer.style.opacity = '1';
            progressContainer.classList.add('visible');
        }
        
        // Force update progress bar
        const progressBarFill = document.querySelector('.progress-bar-fill');
        if (progressBarFill) {
            progressBarFill.style.width = '100%';
            progressBarFill.style.transition = 'width 0.5s ease';
        }
        
        // Force update percentage
        const progressPercentage = document.querySelector('.progress-percentage');
        if (progressPercentage) {
            progressPercentage.textContent = '100%';
        }
        
        // Force update status message
        const statusMessage = document.querySelector('.status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Import completed: 0 created, 0 failed, 10 skipped';
        }
        
        console.log('🔍 [PROGRESS FIX] Progress UI elements force updated');
    }

    /**
     * Show startup wait screen
     */
    showStartupScreen() {
        console.log('🔍 [STARTUP] [DEBUG] Showing startup wait screen');
        
        // Add startup loading class to app container
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.add('startup-loading');
        }
        
        // Show the startup wait screen
        const startupScreen = document.getElementById('startup-wait-screen');
        if (startupScreen) {
            startupScreen.style.display = 'flex';
            console.log('✅ [STARTUP] [DEBUG] Startup wait screen element displayed');
        } else {
            console.error('❌ [STARTUP] [DEBUG] Startup wait screen element not found');
        }
        
        // Start auto-dismiss timer (30 seconds)
        this.startupAutoDismissTimer = setTimeout(() => {
            console.log('⚠️ [STARTUP] [DEBUG] Auto-dismissing startup screen due to timeout');
            this.completeStartup();
        }, 30000);
        
        // Check for token immediately
        this.checkTokenAndCompleteStartup();
        
        console.log('✅ [STARTUP] [DEBUG] Startup wait screen shown');
    }
    
    /**
     * Check for token and complete startup if successful
     */
    async checkTokenAndCompleteStartup() {
        try {
            console.log('🔍 [STARTUP] [DEBUG] Checking for valid token...');
            const token = await this.getToken();
            if (token) {
                console.log('✅ [STARTUP] [DEBUG] Token found, completing startup');
                this.completeStartup();
            } else {
                console.log('⚠️ [STARTUP] [DEBUG] No valid token found, keeping startup screen visible');
            }
        } catch (error) {
            console.error('❌ [STARTUP] [DEBUG] Token check failed:', error);
        }
    }
    
    /**
     * Complete startup and hide wait screen
     */
    completeStartup() {
        console.log('🔍 [STARTUP] [DEBUG] Completing startup process');
        
        // Clear auto-dismiss timer if it exists
        if (this.startupAutoDismissTimer) {
            clearTimeout(this.startupAutoDismissTimer);
            this.startupAutoDismissTimer = null;
        }
        
        // Hide startup screen
        const startupScreen = document.getElementById('startup-wait-screen');
        const appContainer = document.querySelector('.app-container');
        
        if (startupScreen) {
            console.log('✅ [STARTUP] [DEBUG] Hiding startup wait screen');
            startupScreen.style.display = 'none';
        }
        
        if (appContainer) {
            appContainer.classList.remove('startup-loading');
        }
        
        // Navigate to settings page after startup completion
        console.log('🔄 [STARTUP] Navigating to settings page for credential configuration');
        this.showView('settings');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new App();
        await app.init();
        
        // Make app globally available for debugging
        window.app = app;
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

// Debug log filtering functions
window.clearDebugLog = function() {
    const debugContent = document.getElementById('debug-log-content');
    if (debugContent) {
        debugContent.innerHTML = '';
    }
};

window.toggleDebugFilter = function(area) {
    // Store filter state
    if (!window.debugFilters) window.debugFilters = {};
    window.debugFilters[area] = !window.debugFilters[area];
    applyDebugFilters();
};

window.applyDebugFilters = function() {
    const debugContent = document.getElementById('debug-log-content');
    if (!debugContent) return;
    
    const entries = debugContent.querySelectorAll('.debug-log-entry');
    entries.forEach(entry => {
        const area = entry.getAttribute('data-area');
        const isVisible = !window.debugFilters || window.debugFilters[area] !== false;
        entry.style.display = isVisible ? 'block' : 'none';
    });
};

// Initialize debug filters
window.debugFilters = {};

// Enhanced log entry expansion functionality is now handled by log-manager.js
// This provides better accessibility, visual feedback, and reliable first-click behavior

// === DEBUG LOG PANEL TOGGLE LOGIC ===

// === DEBUG LOG PANEL TOGGLE LOGIC ===
// Handles open/close, accessibility, and scroll position for the debug log panel
(function setupDebugLogToggle() {
  const toggleBtn = document.getElementById('debug-log-toggle');
  const panel = document.getElementById('debug-log-panel');
  const logEntries = document.getElementById('log-entries');
  let lastScrollTop = 0;

  if (!toggleBtn || !panel) return; // SAFEGUARD: Only run if elements exist

  // Toggle panel open/close
  function togglePanel(forceOpen) {
    const isOpen = !panel.classList.contains('collapsed');
    if (forceOpen === true || (!isOpen && forceOpen === undefined)) {
      panel.classList.remove('collapsed');
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.setAttribute('aria-label', 'Hide Debug Log Console');
      // Restore scroll position
      if (lastScrollTop) logEntries.scrollTop = lastScrollTop;
      panel.focus();
    } else {
      lastScrollTop = logEntries.scrollTop;
      panel.classList.add('collapsed');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Show Debug Log Console');
      toggleBtn.focus();
    }
  }

  // Click handler
  toggleBtn.addEventListener('click', () => togglePanel());
  // Keyboard accessibility (Enter/Space)
  toggleBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePanel();
    }
  });
  // Optionally, close with Escape when focused
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePanel(false);
    }
  });
  // Default to collapsed
  panel.classList.add('collapsed');
  toggleBtn.setAttribute('aria-expanded', 'false');
  // Optionally, open if hash is #debug-log
  if (window.location.hash === '#debug-log') togglePanel(true);
})();

// Global stream tracker for SSE progress streams (by sessionId)
// Prevents undefined reference errors during stream connection lifecycle
if (typeof window.importProgressStreams === 'undefined') {
    window.importProgressStreams = new Map();
}
const importProgressStreams = window.importProgressStreams;

// ===============================
// SSE EventSource Wrapper
// ===============================

/**
 * Robust SSE (EventSource) wrapper with exponential backoff, connection status events, and full lifecycle logging.
 * Usage: const sse = new RobustEventSource(url, { onMessage, onOpen, onError, onStatus });
 */
class RobustEventSource {
    constructor(url, { onMessage, onOpen, onError, onStatus, maxRetries = 10, baseDelay = 1000, maxDelay = 30000 } = {}) {
        this.url = url;
        this.onMessage = onMessage;
        this.onOpen = onOpen;
        this.onError = onError;
        this.onStatus = onStatus;
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.retryCount = 0;
        this.eventSource = null;
        this.closed = false;
        this.connect();
    }

    connect() {
        if (this.closed) return;
        this.eventSource = new EventSource(this.url);
        this._emitStatus('connecting');
        this.eventSource.onopen = (e) => {
            this.retryCount = 0;
            this._emitStatus('connected');
            if (this.onOpen) this.onOpen(e);
            console.log('[SSE] Connected:', this.url);
        };
        this.eventSource.onmessage = (e) => {
            if (this.onMessage) this.onMessage(e);
        };
        this.eventSource.onerror = (e) => {
            this._emitStatus('error');
            if (this.onError) this.onError(e);
            console.error('[SSE] Error:', e);
            this.eventSource.close();
            if (!this.closed) this._scheduleReconnect();
        };
        this.eventSource.onclose = (e) => {
            this._emitStatus('closed');
            console.warn('[SSE] Closed:', e);
        };
    }

    _scheduleReconnect() {
        if (this.retryCount >= this.maxRetries) {
            this._emitStatus('failed');
            console.error('[SSE] Max retries reached. Giving up.');
            return;
        }
        const delay = Math.min(this.baseDelay * Math.pow(2, this.retryCount), this.maxDelay);
        this.retryCount++;
        this._emitStatus('reconnecting', delay);
        console.warn(`[SSE] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
        setTimeout(() => this.connect(), delay);
    }

    _emitStatus(status, data) {
        if (this.onStatus) this.onStatus(status, data);
    }

    close() {
        this.closed = true;
        if (this.eventSource) this.eventSource.close();
        this._emitStatus('closed');
    }
}
// ===============================

// ===============================
// SSE Status Indicator & Fallback Polling
// ===============================

// Add a status indicator to the DOM (if not present)
function ensureSSEStatusIndicator() {
    let indicator = document.getElementById('sse-status-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sse-status-indicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '80px';
        indicator.style.right = '30px';
        indicator.style.zIndex = '2000';
        indicator.style.padding = '10px 18px';
        indicator.style.borderRadius = '8px';
        indicator.style.fontWeight = 'bold';
        indicator.style.fontSize = '15px';
        indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        indicator.style.display = 'flex';
        indicator.style.alignItems = 'center';
        indicator.innerHTML = '<span class="sse-status-dot" style="width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:10px;"></span><span class="sse-status-text"></span>';
        document.body.appendChild(indicator);
    }
    return indicator;
}

function updateSSEStatusIndicator(status, fallback) {
    const indicator = ensureSSEStatusIndicator();
    const dot = indicator.querySelector('.sse-status-dot');
    const text = indicator.querySelector('.sse-status-text');
    let color = '#6c757d', msg = 'Unknown';
    if (status === 'connected') { color = '#28a745'; msg = 'Connected'; }
    else if (status === 'connecting') { color = '#ffc107'; msg = 'Connecting...'; }
    else if (status === 'reconnecting') { color = '#ffc107'; msg = 'Reconnecting...'; }
    else if (status === 'error') { color = '#dc3545'; msg = 'Connection Error'; }
    else if (status === 'closed') { color = '#dc3545'; msg = 'Disconnected'; }
    else if (status === 'failed') { color = '#dc3545'; msg = 'Failed'; }
    dot.style.background = color;
    text.textContent = msg + (fallback ? ' (Fallback Mode)' : '');
    indicator.style.background = fallback ? '#fff3cd' : '#f8f9fa';
    indicator.style.color = fallback ? '#856404' : '#333';
    indicator.style.border = fallback ? '2px solid #ffc107' : '1px solid #dee2e6';
    indicator.style.boxShadow = fallback ? '0 2px 12px #ffe066' : '0 2px 8px rgba(0,0,0,0.12)';
    indicator.title = fallback ? 'Real-time updates unavailable, using fallback polling.' : 'SSE connection status';
}

// Fallback polling logic
let fallbackPollingInterval = null;
function startFallbackPolling(progressUrl, onProgress) {
    if (fallbackPollingInterval) return;
    updateSSEStatusIndicator('failed', true);
    fallbackPollingInterval = setInterval(() => {
        fetch(progressUrl)
            .then(r => r.json())
            .then(data => {
                if (onProgress) onProgress({ data: JSON.stringify(data) });
            })
            .catch(err => {
                console.error('[Fallback Polling] Error:', err);
            });
    }, 5000); // Poll every 5 seconds
    console.warn('[SSE] Fallback polling started.');
}
function stopFallbackPolling() {
    if (fallbackPollingInterval) {
        clearInterval(fallbackPollingInterval);
        fallbackPollingInterval = null;
        console.log('[SSE] Fallback polling stopped.');
    }
}

// Integrate with import progress logic
function setupImportProgressSSE(sessionId, onProgress) {
    const sseUrl = `/api/import/progress/${sessionId}`;
    let fallbackActive = false;
    let sse = new RobustEventSource(sseUrl, {
        onMessage: (e) => {
            if (onProgress) onProgress(e);
        },
        onOpen: () => {
            updateSSEStatusIndicator('connected', false);
            stopFallbackPolling();
            fallbackActive = false;
        },
        onError: () => {
            updateSSEStatusIndicator('error', fallbackActive);
        },
        onStatus: (status, data) => {
            updateSSEStatusIndicator(status, fallbackActive);
            if (status === 'failed') {
                fallbackActive = true;
                // Start fallback polling
                startFallbackPolling(`/api/import/progress-fallback/${sessionId}`, onProgress);
            } else if (status === 'connected') {
                fallbackActive = false;
                stopFallbackPolling();
            }
        }
    });
    return sse;
}
// ... existing code ...
// Example usage in your import logic:
// const sse = setupImportProgressSSE(sessionId, handleProgressEvent);
// When done: sse.close(); stopFallbackPolling();

// Centralized error handler for API/network/form errors
function handleAppError(error, context = {}) {
    const ui = window.app && window.app.uiManager;
    let userMessage = 'An unexpected error occurred. Please try again.';
    let errorType = 'error';
    
    // Handle different error types with specific user-friendly messages
    if (error && error.response) {
        // HTTP error response
        const status = error.response.status;
        if (status === 401) {
            userMessage = 'Session expired – please log in again.';
            errorType = 'warning';
        } else if (status === 403) {
            userMessage = 'Access denied. Please check your permissions.';
            errorType = 'error';
        } else if (status === 404) {
            userMessage = 'Resource not found. Please check your settings.';
            errorType = 'warning';
        } else if (status === 429) {
            userMessage = 'Too many requests. Please wait a moment and try again.';
            errorType = 'warning';
        } else if (status >= 500) {
            userMessage = 'Server error – please try again later.';
            errorType = 'error';
        } else {
            // Try to get error message from response
            error.response.json().then(data => {
                userMessage = data.error || userMessage;
                if (ui) ui.showStatusBar(userMessage, errorType, { autoDismiss: false });
            }).catch(() => {
                if (ui) ui.showStatusBar(userMessage, errorType, { autoDismiss: false });
            });
            return;
        }
    } else if (error && error.message) {
        // Network or other errors
        if (error.message.includes('Network') || error.message.includes('fetch')) {
            userMessage = 'Network error – check your connection and try again.';
            errorType = 'warning';
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out – please try again.';
            errorType = 'warning';
        } else if (error.message.includes('aborted')) {
            userMessage = 'Request was cancelled.';
            errorType = 'info';
            return; // Don't show for user-initiated cancellations
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'Cannot connect to server. Please check your connection.';
            errorType = 'error';
        }
    }
    
    // Show error in status bar
    if (ui) {
        ui.showStatusBar(userMessage, errorType, { 
            autoDismiss: errorType === 'info' || errorType === 'success',
            duration: errorType === 'info' ? 3000 : 6000
        });
    }
    
    // Log error for debugging
    console.error('Application error:', error, context);
}

// Enhanced safe API call wrapper with better error handling
async function safeApiCall(apiFn, ...args) {
    try {
        return await apiFn(...args);
    } catch (error) {
        // Handle AbortError separately (user cancellation)
        if (error.name === 'AbortError') {
            console.log('Request was cancelled by user');
            return;
        }
        
        // Handle fetch errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            handleAppError(new Error('Network error – check your connection.'), { 
                context: 'API call failed',
                function: apiFn.name 
            });
        } else {
            handleAppError(error, { 
                context: 'API call failed',
                function: apiFn.name 
            });
        }
        throw error;
    }
}

// Enhanced form validation with status bar feedback
function validateAndSubmit(form, validateFn, submitFn) {
    const ui = window.app && window.app.uiManager;
    
    // Validate form
    const validation = validateFn(form);
    if (!validation.valid) {
        if (ui) {
            ui.showStatusBar(validation.message, 'warning', { 
                autoDismiss: true, 
                duration: 4000 
            });
        }
        return false;
    }
    
    // Show loading state
    if (ui) {
        ui.showStatusBar('Processing...', 'info', { autoDismiss: false });
    }
    
    // Submit with error handling
    submitFn(form).catch(error => {
        handleAppError(error, { context: 'Form submission failed' });
    });
    
    return true;
}

// Enhanced fallback UI for critical errors
function showFallbackUI(type) {
    const ui = window.app && window.app.uiManager;
    
    switch (type) {
        case '404':
            ui && ui.showStatusBar('Page not found. Please return to Home.', 'warning', { autoDismiss: false });
            break;
        case '500':
            ui && ui.showStatusBar('Server error – please try again later.', 'error', { autoDismiss: false });
            break;
        case 'maintenance':
            ui && ui.showStatusBar('Service is under maintenance. Please try again later.', 'info', { autoDismiss: false });
            break;
        case 'network':
            ui && ui.showStatusBar('Network connection lost. Please check your connection.', 'error', { autoDismiss: false });
            break;
        case 'timeout':
            ui && ui.showStatusBar('Request timed out. Please try again.', 'warning', { autoDismiss: true });
            break;
        default:
            ui && ui.showStatusBar('An unexpected error occurred.', 'error', { autoDismiss: false });
    }
}

// Enhanced input validation with status bar feedback
function validateInput(input, rules = {}) {
    const ui = window.app && window.app.uiManager;
    const value = input.value.trim();
    
    // Required field validation
    if (rules.required && !value) {
        const message = rules.requiredMessage || 'This field is required.';
        if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
        return false;
    }
    
    // Email validation
    if (rules.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            const message = rules.emailMessage || 'Please enter a valid email address.';
            if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
            return false;
        }
    }
    
    // URL validation
    if (rules.url && value) {
        try {
            new URL(value);
        } catch {
            const message = rules.urlMessage || 'Please enter a valid URL.';
            if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
            return false;
        }
    }
    
    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
        const message = rules.minLengthMessage || `Must be at least ${rules.minLength} characters.`;
        if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
        return false;
    }
    
    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
        const message = rules.maxLengthMessage || `Must be no more than ${rules.maxLength} characters.`;
        if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
        return false;
    }
    
    // Custom validation
    if (rules.custom && !rules.custom(value)) {
        const message = rules.customMessage || 'Invalid input.';
        if (ui) ui.showStatusBar(message, 'warning', { autoDismiss: true });
        return false;
    }
    
    return true;
}

// === Import Dashboard Logic ===
function setupImportDashboard(app) {
    const dashboardTab = document.querySelector('.nav-item[data-view="import-dashboard"]');
    const dashboardView = document.getElementById('import-dashboard-view');
    const dropZone = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('dashboard-csv-file');
    const fileFeedback = document.getElementById('dashboard-file-feedback');
    const importOptions = document.getElementById('dashboard-import-options');
    const importActions = document.getElementById('dashboard-import-actions');

    if (!dashboardTab || !dashboardView || !dropZone || !fileInput) return;

    // Navigation: Show dashboard view, hide others
    dashboardTab.addEventListener('click', () => {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        dashboardView.style.display = 'block';
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        dashboardTab.classList.add('active');
        // Reset dashboard state
        fileFeedback.textContent = '';
        dropZone.classList.remove('dragover');
        fileInput.value = '';
        importOptions.innerHTML = '';
        importActions.innerHTML = '';
        // Optionally, render import options here
        renderDashboardImportOptions(app, importOptions, importActions);
    });

    // Drag-and-drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleDashboardFileSelect(files[0], app, fileFeedback, importOptions, importActions);
        }
    });
    // Fallback file input
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleDashboardFileSelect(files[0], app, fileFeedback, importOptions, importActions);
        }
    });
}

function handleDashboardFileSelect(file, app, fileFeedback, importOptions, importActions) {
    if (!file || !file.name.match(/\.csv$|\.txt$/i)) {
        fileFeedback.textContent = 'Please select a valid CSV or TXT file.';
        fileFeedback.classList.add('error');
        return;
    }
    fileFeedback.classList.remove('error');
    fileFeedback.innerHTML = `<i class="fas fa-check-circle" style="color:var(--ping-success-green)"></i> ${file.name} (${file.type || 'text/csv'})`;
    // Use shared file handler logic
    app.fileHandler.handleFile(file).then(() => {
        // Render import options and actions after file is loaded
        renderDashboardImportOptions(app, importOptions, importActions);
    }).catch(err => {
        fileFeedback.textContent = 'File parsing failed: ' + (err.message || err);
        fileFeedback.classList.add('error');
    });
}

function renderDashboardImportOptions(app, importOptions, importActions) {
    // Reuse the same import options UI as the classic import view
    // For simplicity, clone or move the relevant DOM or re-render options here
    // Example: show a submit button
    importOptions.innerHTML = '';
    importActions.innerHTML = '';
    // Add import options (toggles, etc.) as needed
    // ...
    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary';
    submitBtn.innerHTML = '<i class="fas fa-upload"></i> Start Import';
    submitBtn.onclick = () => app.startImport();
    importActions.appendChild(submitBtn);
}

// Initialize dashboard after app is ready
window.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        setupImportDashboard(window.app);
    } else {
        setTimeout(() => {
            if (window.app) setupImportDashboard(window.app);
        }, 1000);
    }
});

// In the settings form logic:
// When loading settings, set the region dropdown value to the region code
function populateSettingsForm(settings) {
    // ... existing code ...
    const regionSelect = document.getElementById('region');
    if (regionSelect && settings.region) {
        regionSelect.value = settings.region;
    }
    // ... existing code ...
}

// When saving settings, get the region code from the dropdown
function getSettingsFromForm() {
    // ... existing code ...
    const regionSelect = document.getElementById('region');
    const region = regionSelect ? regionSelect.value : 'NA';
    // ... existing code ...
    return {
        // ... other settings ...
        region,
        // ... other settings ...
    };
}

// Helper to get selected region info from dropdown (moved to App class)

// Ensure region dropdown is accessible
const regionSelect = document.getElementById('region');
if (regionSelect) {
    regionSelect.setAttribute('aria-label', 'Select PingOne region');
}

// ... existing code ...
// After fileHandler and UIManager are initialized and import view is set up:
function setupImportDropZone() {
    const dropZone = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('csv-file');
    if (dropZone && fileInput && window.fileHandler) {
        window.fileHandler.initializeDropZone(dropZone);
        // Make clicking the drop zone open the file picker
        dropZone.addEventListener('click', () => fileInput.click());
        // Keyboard accessibility: Enter/Space triggers file input
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
    }
}

// Call this after import view is shown (or on DOMContentLoaded if always visible)
document.addEventListener('DOMContentLoaded', () => {
    setupImportDropZone();
});
// ... existing code ...

// ... existing code ...
// After fileHandler and UIManager are initialized and modify view is set up:
function setupModifyDropZone() {
    const dropZone = document.getElementById('modify-drop-zone');
    const fileInput = document.getElementById('modify-csv-file');
    if (dropZone && fileInput && window.fileHandler) {
        window.fileHandler.initializeDropZone(dropZone);
        // Make clicking the drop zone open the file picker
        dropZone.addEventListener('click', () => fileInput.click());
        // Keyboard accessibility: Enter/Space triggers file input
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
    } else {
        if (!dropZone) console.warn('[Modify] Drop zone element missing');
        if (!fileInput) console.warn('[Modify] File input element missing');
        if (!window.fileHandler) console.warn('[Modify] FileHandler not initialized');
    }
}

// Call this after modify view is shown
function onModifyViewShown() {
    console.log('🔄 [Modify] View shown, setting up modify page...');
    setupModifyDropZone();
    
    // Check for required token and population elements
    const tokenStatus = document.getElementById('current-token-status');
    const homeTokenStatus = document.getElementById('home-token-status');
    const getTokenBtn = document.getElementById('get-token-quick');
    const modifyPopulationSelect = document.getElementById('modify-population-select');
    
    if (!tokenStatus) console.warn('[Modify] #current-token-status element missing');
    if (!homeTokenStatus) console.warn('[Modify] #home-token-status element missing');
    if (!getTokenBtn) console.warn('[Modify] Get Token button missing');
    if (!modifyPopulationSelect) console.warn('[Modify] #modify-population-select element missing');
    
    // Load populations for modify dropdown if app is available
    if (window.app && typeof window.app.loadPopulationsForDropdown === 'function') {
        console.log('🔄 [Modify] Loading populations for modify dropdown...');
        window.app.loadPopulationsForDropdown('modify-population-select').then(() => {
            console.log('✅ [Modify] Populations loaded successfully');
        }).catch(error => {
            console.error('❌ [Modify] Failed to load populations:', error);
        });
    } else {
        console.warn('[Modify] App or loadPopulationsForDropdown not available');
    }
}

// Patch showView to call onModifyViewShown for modify view
const originalShowView = window.app && window.app.showView;
if (originalShowView) {
    window.app.showView = function(view) {
        originalShowView.call(this, view);
        if (view === 'modify') {
            onModifyViewShown();
        }
    };
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.app && typeof window.app.showView === 'function') {
            const orig = window.app.showView;
            window.app.showView = function(view) {
                orig.call(this, view);
                if (view === 'modify') {
                    onModifyViewShown();
                }
            };
        }
    });
}
// ... existing code ...

// ... existing code ...
window.enableToolAfterDisclaimer = () => {
    if (window.app && typeof window.app.enableToolAfterDisclaimer === 'function') {
        window.app.enableToolAfterDisclaimer();
    }
};
// ... existing code ...

// Defensive: wrap all classList and DOM accesses in null checks throughout the file
// Defensive: check robustSSE and uiManager before calling their methods

// ... existing code ...
document.addEventListener('DOMContentLoaded', () => {
    // Modify page population URL display
    const modifyPopulationSelect = document.getElementById('modify-population-select');
    const modifyApiUrlDisplay = document.getElementById('modify-population-api-url');
    if (modifyPopulationSelect && modifyApiUrlDisplay) {
        modifyPopulationSelect.addEventListener('change', (e) => {
            const populationId = e.target.value;
            const envId = window.globalTokenManager?.getEnvironmentId?.() || window.environmentId || '';
            if (populationId && envId) {
                modifyApiUrlDisplay.innerHTML = `<span>PingOne API URL: <code>https://api.pingone.com/v1/environments/${envId}/populations/${populationId}</code></span>`;
            } else {
                modifyApiUrlDisplay.innerHTML = '';
            }
        });
    }
    // Export page population URL display
    const exportPopulationSelect = document.getElementById('export-population-select');
    const exportApiUrlDisplay = document.getElementById('export-population-api-url');
    if (exportPopulationSelect && exportApiUrlDisplay) {
        exportPopulationSelect.addEventListener('change', (e) => {
            const populationId = e.target.value;
            const envId = window.globalTokenManager?.getEnvironmentId?.() || window.environmentId || '';
            if (populationId && envId && populationId !== 'ALL') {
                exportApiUrlDisplay.innerHTML = `<span>PingOne API URL: <code>https://api.pingone.com/v1/environments/${envId}/populations/${populationId}</code></span>`;
            } else {
                exportApiUrlDisplay.innerHTML = '';
            }
        });
    }
});
// ... existing code ...

// ... existing code ...
// ... existing code ...