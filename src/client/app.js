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

// Browser-compatible logging system
import { createLogger } from './utils/browser-logging-service.js';

// Core utilities
import { Logger } from '../../public/js/modules/logger.js';
import { FileLogger } from '../../public/js/modules/file-logger.js';
import { EventBus } from '../../public/js/modules/event-bus.js';

// Components
import { SettingsManager } from '../../public/js/modules/settings-manager.js';
import { UIManager } from './components/ui-manager.js';
import TokenManager from '../../public/js/modules/token-manager.js';

// Subsystems (new architecture)
import { ImportSubsystem } from './subsystems/import-subsystem.js';
import { ExportSubsystem } from './subsystems/export-subsystem.js';
import { OperationManagerSubsystem } from './subsystems/operation-manager-subsystem.js';
import { NavigationSubsystem } from './subsystems/navigation-subsystem.js';
import { ConnectionManagerSubsystem } from './subsystems/connection-manager-subsystem.js';
import { AuthManagementSubsystem } from './subsystems/auth-management-subsystem.js';
import { ViewManagementSubsystem } from './subsystems/view-management-subsystem.js';
import { RealtimeCommunicationSubsystem } from './subsystems/realtime-communication-subsystem.js';
import { AdvancedRealtimeSubsystem } from './subsystems/advanced-realtime-subsystem.js';
import { RealtimeCollaborationUI } from './components/realtime-collaboration-ui.js';
import { AnalyticsDashboardSubsystem } from './subsystems/analytics-dashboard-subsystem.js';
import { AnalyticsDashboardUI } from './components/analytics-dashboard-ui.js';
import HistoryUIComponent from './components/history-ui.js';
import EnhancedLoggingUIComponent from './components/logging-ui-enhanced.js';
import TestingHub from './components/testing-hub.js';

// Modern subsystems (replacing legacy modules)
import { ProgressSubsystem } from '../../public/js/modules/progress-subsystem.js';
import { SessionSubsystem } from '../../public/js/modules/session-subsystem.js';
import { LoggingSubsystem } from '../../public/js/modules/logging-subsystem.js';
import { HistorySubsystem } from '../../public/js/modules/history-subsystem.js';
import { PopulationSubsystem } from '../../public/js/modules/population-subsystem.js';
import { SettingsSubsystem } from '../../public/js/modules/settings-subsystem.js';

// Legacy modules (minimal usage, being phased out)
import { LocalAPIClient } from '../../public/js/modules/local-api-client.js';
import { PingOneClient } from '../../public/js/modules/pingone-client.js';
import { FileHandler } from '../../public/js/modules/file-handler.js';
import { VersionManager } from '../../public/js/modules/version-manager.js';
import { showTokenAlertModal, clearTokenAlertSession } from '../../public/js/modules/token-alert-modal.js';
import tokenRefreshHandler from '../../public/js/modules/token-refresh-handler.js';
import { io } from 'socket.io-client';

// Feature flags for gradual subsystem rollout
import { FEATURE_FLAGS, isFeatureEnabled, getFeatureFlagStatus } from '../shared/feature-flags.js';

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
    constructor(inputElement, toggleElement) {
        this.input = inputElement;
        this.toggle = toggleElement;
        this.isVisible = false;
        this.originalValue = '';
        
        this.init();
    }
    
    init() {
        if (!this.input || !this.toggle) return;
        
        this.toggle.addEventListener('click', () => this.toggleVisibility());
        this.input.addEventListener('input', () => this.handleInput());
        
        // Initialize with masked state
        this.updateDisplay();
    }
    
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.updateDisplay();
    }
    
    handleInput() {
        this.originalValue = this.input.value;
        if (!this.isVisible) {
            this.maskValue();
        }
    }
    
    updateDisplay() {
        if (this.isVisible) {
            this.input.value = this.originalValue;
            this.input.type = 'text';
            this.toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
            this.toggle.title = 'Hide';
        } else {
            this.maskValue();
            this.input.type = 'password';
            this.toggle.innerHTML = '<i class="fas fa-eye"></i>';
            this.toggle.title = 'Show';
        }
    }
    
    maskValue() {
        if (this.originalValue) {
            this.input.value = '•'.repeat(this.originalValue.length);
        }
    }
    
    getValue() {
        return this.originalValue;
    }
    
    setValue(value) {
        this.originalValue = value;
        this.updateDisplay();
    }
}

/**
 * Main Application Class
 * 
 * Orchestrates the entire PingOne user import tool application.
 * Manages all UI interactions, API calls, file processing, and state management.
 * 
 * Features:
 * - Subsystem-based architecture for better maintainability
 * - Centralized logging with correlation tracking
 * - Feature flags for gradual rollout
 * - Real-time progress tracking
 * - Comprehensive error handling
 */
class App {
    constructor() {
        // Initialize centralized logging
        this.logger = FEATURE_FLAGS.USE_CENTRALIZED_LOGGING 
            ? createLogger({
                serviceName: 'pingone-import-app',
                enableServer: true,
                enableConsole: true
              })
            : new Logger();
            
        this.logger.info('Application initialization started', {
            version: '6.1.0',
            featureFlags: FEATURE_FLAGS
        });
        
        // Core components
        this.eventBus = new EventBus();
        this.settingsManager = null;
        this.uiManager = null;
        this.tokenManager = null;
        this.fileHandler = null;
        this.versionManager = null;
        
        // API clients
        this.localClient = null;
        
        // Modern subsystems (replacing legacy managers)
        this.progressSubsystem = null;
        this.sessionSubsystem = null;
        this.loggingSubsystem = null;
        this.historySubsystem = null;
        this.populationSubsystem = null;
        this.settingsSubsystem = null;
        
        // Advanced real-time features
        this.advancedRealtimeSubsystem = null;
        this.realtimeCollaborationUI = null;
        
        // Subsystems (new architecture)
        this.subsystems = {};
        
        // Application state
        this.isInitialized = false;
        this.currentView = 'import';
        this.socket = null;
        
        // Performance tracking
        this.logger.startTimer('app-initialization');
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            this.logger.info('Starting application initialization');
            
            // Initialize core components
            await this.initializeCoreComponents();
            
            // Initialize subsystems
            await this.initializeSubsystems();
            
            // Initialize legacy components (gradually being replaced)
            await this.initializeLegacyComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI
            await this.initializeUI();
            
            // Mark as initialized
            this.isInitialized = true;
            
            const initTime = this.logger.endTimer('app-initialization');
            this.logger.info('Application initialization completed', {
                initializationTime: `${initTime}ms`,
                subsystemsEnabled: Object.keys(this.subsystems).length
            });
            
        } catch (error) {
            this.logger.error('Application initialization failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Initialize core components
     */
    async initializeCoreComponents() {
        this.logger.debug('Initializing core components');
        
        // Settings manager
        this.settingsManager = new SettingsManager();
        await this.settingsManager.init();
        
        // UI manager (enhanced with logManager)
        this.uiManager = new UIManager({ logManager: { getLogger: (name) => this.logger } });
        
        // Token manager (requires logger, settings, and eventBus)
        this.tokenManager = new TokenManager(this.logger, this.settingsManager.getAllSettings(), this.eventBus);
        
        // File handler (requires logger and uiManager)
        this.fileHandler = new FileHandler(this.logger, this.uiManager);
        
        // Version manager
        this.versionManager = new VersionManager();
        
        // API clients
        this.localClient = new LocalAPIClient(this.logger);
        this.pingOneClient = new PingOneClient();
        
        this.logger.debug('Core components initialized');
    }
    
    /**
     * Initialize subsystems with feature flags
     */
    async initializeSubsystems() {
        console.log('🚀 [DEBUG] App: initializeSubsystems() method called');
        this.logger.debug('Initializing subsystems', { featureFlags: FEATURE_FLAGS });
        
        try {
            console.log('🔧 [DEBUG] App: Starting subsystem initialization');
            // Navigation Subsystem
            if (FEATURE_FLAGS.USE_NAVIGATION_SUBSYSTEM) {
                this.subsystems.navigation = new NavigationSubsystem(
                    this.logger.child({ subsystem: 'navigation' }),
                    this.uiManager,
                    this.settingsManager
                );
                await this.subsystems.navigation.init();
                this.logger.debug('Navigation subsystem initialized');
            }
            
            // Connection Manager Subsystem
            if (FEATURE_FLAGS.USE_CONNECTION_MANAGER) {
                this.subsystems.connectionManager = new ConnectionManagerSubsystem(
                    this.logger.child({ subsystem: 'connection' }),
                    this.uiManager,
                    this.settingsManager,
                    this.localClient
                );
                await this.subsystems.connectionManager.init();
                this.logger.debug('Connection manager subsystem initialized');
            }
            
            // Auth Management Subsystem
            if (FEATURE_FLAGS.USE_AUTH_MANAGEMENT) {
                this.subsystems.authManager = new AuthManagementSubsystem(
                    this.logger.child({ subsystem: 'auth' }),
                    this.uiManager,
                    this.localClient,
                    this.settingsManager
                );
                await this.subsystems.authManager.init();
                this.logger.debug('Auth management subsystem initialized');
            }
            
            // View Management Subsystem
            if (FEATURE_FLAGS.USE_VIEW_MANAGEMENT) {
                this.subsystems.viewManager = new ViewManagementSubsystem(
                    this.logger.child({ subsystem: 'view' }),
                    this.uiManager
                );
                await this.subsystems.viewManager.init();
                this.logger.debug('View management subsystem initialized');
            }
            
            // Operation Manager Subsystem
            if (FEATURE_FLAGS.USE_OPERATION_MANAGER) {
                this.subsystems.operationManager = new OperationManagerSubsystem(
                    this.logger.child({ subsystem: 'operation' }),
                    this.uiManager,
                    this.settingsManager,
                    this.localClient
                );
                await this.subsystems.operationManager.init();
                this.logger.debug('Operation manager subsystem initialized');
            }
            
            // Population Subsystem (needed by Import/Export subsystems)
            this.populationSubsystem = new PopulationSubsystem(
                this.eventBus,
                this.settingsSubsystem,
                this.loggingSubsystem,
                this.localClient
            );
            await this.populationSubsystem.init();
            this.subsystems.population = this.populationSubsystem;
            this.logger.debug('Population subsystem initialized');
            
            // Import Subsystem
            console.log('📋 [DEBUG] App: Checking USE_IMPORT_SUBSYSTEM feature flag:', FEATURE_FLAGS.USE_IMPORT_SUBSYSTEM);
            if (FEATURE_FLAGS.USE_IMPORT_SUBSYSTEM) {
                console.log('🚀 [DEBUG] App: Creating ImportSubsystem instance');
                this.subsystems.importManager = new ImportSubsystem(
                    this.logger.child({ subsystem: 'import' }),
                    this.uiManager,
                    this.localClient,
                    this.settingsManager,
                    this.eventBus,
                    this.populationSubsystem,
                    this.subsystems.authManager
                );
                console.log('🔧 [DEBUG] App: About to initialize ImportSubsystem');
                await this.subsystems.importManager.init();
                console.log('✅ [DEBUG] App: ImportSubsystem initialized successfully');
                this.logger.debug('Import subsystem initialized');
            } else {
                console.log('❌ [DEBUG] App: ImportSubsystem feature flag is disabled');
            }
            
            // Export Subsystem
            if (FEATURE_FLAGS.USE_EXPORT_SUBSYSTEM) {
                this.subsystems.exportManager = new ExportSubsystem(
                    this.logger.child({ subsystem: 'export' }),
                    this.uiManager,
                    this.localClient,
                    this.settingsManager,
                    this.eventBus,
                    this.populationSubsystem
                );
                await this.subsystems.exportManager.init();
                this.logger.debug('Export subsystem initialized');
            }
            
            // Realtime Communication Subsystem
            if (FEATURE_FLAGS.USE_REALTIME_SUBSYSTEM) {
                this.subsystems.realtimeManager = new RealtimeCommunicationSubsystem(
                    this.logger.child({ subsystem: 'realtime' }),
                    this.uiManager
                );
                await this.subsystems.realtimeManager.init();
                this.logger.debug('Realtime communication subsystem initialized');
            }
            
            // Modern Core Subsystems (replacing legacy managers)
            
            // Settings Subsystem (initialize first as other subsystems depend on it)
            this.settingsSubsystem = new SettingsSubsystem(
                this.logger.child({ subsystem: 'settings' }),
                this.uiManager,
                this.localClient,
                this.settingsManager,
                this.eventBus,
                null // credentialsManager - will be set later if needed
            );
            await this.settingsSubsystem.init();
            this.subsystems.settings = this.settingsSubsystem;
            this.logger.debug('Settings subsystem initialized');
            
            // Progress Subsystem
            this.progressSubsystem = new ProgressSubsystem(
                this.logger.child({ subsystem: 'progress' }),
                this.uiManager,
                this.eventBus,
                null // realtimeComm - will be set later when realtime subsystem is initialized
            );
            await this.progressSubsystem.init();
            this.subsystems.progress = this.progressSubsystem;
            this.logger.debug('Progress subsystem initialized');
            
            // Session Subsystem
            this.sessionSubsystem = new SessionSubsystem(
                this.logger.child({ subsystem: 'session' }),
                this.settingsSubsystem,
                this.eventBus
            );
            await this.sessionSubsystem.init();
            this.subsystems.session = this.sessionSubsystem;
            this.logger.debug('Session subsystem initialized');
            
            // Logging Subsystem
            this.loggingSubsystem = new LoggingSubsystem(
                this.eventBus,
                this.settingsSubsystem
            );
            await this.loggingSubsystem.init();
            this.subsystems.logging = this.loggingSubsystem;
            this.logger.debug('Logging subsystem initialized');
            
            // History Subsystem
            this.historySubsystem = new HistorySubsystem(
                this.eventBus,
                this.settingsSubsystem,
                this.loggingSubsystem
            );
            await this.historySubsystem.init();
            this.subsystems.history = this.historySubsystem;
            this.logger.debug('History subsystem initialized');
            
            // Population Subsystem already initialized above for Import/Export dependencies
            
            // Initialize advanced real-time subsystem and UI
            this.advancedRealtimeSubsystem = new AdvancedRealtimeSubsystem(
                this.logger.child({ subsystem: 'advanced-realtime' }),
                this.eventBus,
                this.subsystems.realtimeManager,
                this.sessionSubsystem,
                this.progressSubsystem
            );
            
            this.realtimeCollaborationUI = new RealtimeCollaborationUI(
                this.logger.child({ subsystem: 'realtime-collaboration-ui' }),
                this.eventBus,
                this.advancedRealtimeSubsystem,
                this.uiManager
            );
            
            // Initialize analytics dashboard subsystem and UI
            this.analyticsDashboardSubsystem = new AnalyticsDashboardSubsystem(
                this.logger.child({ subsystem: 'analytics-dashboard' }),
                this.eventBus,
                this.advancedRealtimeSubsystem,
                this.progressSubsystem,
                this.sessionSubsystem
            );
            
            this.analyticsDashboardUI = new AnalyticsDashboardUI(
                this.eventBus,
                this.analyticsDashboardSubsystem
            );
            
            // Initialize History UI Component
            this.historyUIComponent = new HistoryUIComponent(
                this.historySubsystem,
                this.eventBus,
                this.logger.child({ component: 'history-ui' })
            );
            
            // Initialize Enhanced Logging UI Component
            this.loggingUIComponent = new EnhancedLoggingUIComponent(
                this.loggingSubsystem,
                this.eventBus,
                this.logger.child({ component: 'enhanced-logging-ui' })
            );
            
            // Initialize Testing Hub
            this.testingHub = new TestingHub(
                this.eventBus,
                {
                    import: this.importSubsystem,
                    export: this.exportSubsystem,
                    history: this.historySubsystem,
                    logging: this.loggingSubsystem,
                    settings: this.settingsSubsystem,
                    auth: this.authManagementSubsystem
                }
            );
            
            // Make testing hub globally available
            window.testingHub = this.testingHub;
            
            // Initialize subsystems
            await this.advancedRealtimeSubsystem.init();
            await this.analyticsDashboardSubsystem.init();
            
            // Initialize UI components
            await this.realtimeCollaborationUI.init();
            await this.analyticsDashboardUI.init();
            await this.historyUIComponent.init();
            await this.loggingUIComponent.init();
            
            this.logger.debug('Advanced real-time and analytics subsystems initialized');
            
            this.logger.info('All subsystems initialized successfully', {
                subsystemCount: Object.keys(this.subsystems).length,
                enabledSubsystems: Object.keys(this.subsystems)
            });
        
        } catch (error) {
            this.logger.error('Subsystem initialization failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Initialize remaining legacy components (minimal usage)
     */
    async initializeLegacyComponents() {
        this.logger.debug('Initializing remaining legacy components');
        
        // Note: Most legacy managers have been replaced by modern subsystems
        // Only keeping minimal legacy components that haven't been fully migrated yet
        
        this.logger.debug('Legacy components initialized (minimal set)');
    }
    
    /**
     * Set up event listeners and EventBus patterns
     */
    setupEventListeners() {
        this.logger.debug('Setting up event listeners and EventBus patterns');
        
        // Global error handler with EventBus integration
        window.addEventListener('error', (event) => {
            const errorData = {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack
            };
            this.logger.error('Global error caught', errorData);
            this.eventBus.emit('app:global-error', errorData);
        });
        
        // Unhandled promise rejection handler with EventBus integration
        window.addEventListener('unhandledrejection', (event) => {
            const rejectionData = {
                reason: event.reason,
                promise: event.promise
            };
            this.logger.error('Unhandled promise rejection', rejectionData);
            this.eventBus.emit('app:unhandled-rejection', rejectionData);
        });
        
        // Performance monitoring with EventBus integration
        window.addEventListener('load', () => {
            const performanceData = {
                loadTime: performance.now(),
                timing: performance.timing
            };
            this.logger.info('Page load completed', performanceData);
            this.eventBus.emit('app:page-loaded', performanceData);
        });
        
        // EventBus listeners for subsystem coordination
        this.setupEventBusListeners();
        
        this.logger.debug('Event listeners and EventBus patterns set up');
    }
    
    /**
     * Set up EventBus listeners for subsystem coordination
     */
    setupEventBusListeners() {
        this.logger.debug('Setting up EventBus listeners for subsystem coordination');
        
        // Application lifecycle events
        this.eventBus.on('app:init-complete', (data) => {
            this.logger.info('Application initialization complete', data);
        });
        
        this.eventBus.on('app:shutdown', (data) => {
            this.logger.info('Application shutdown initiated', data);
        });
        
        // Subsystem communication events
        this.eventBus.on('subsystem:error', (data) => {
            this.logger.error('Subsystem error occurred', data);
        });
        
        this.eventBus.on('subsystem:ready', (data) => {
            this.logger.debug('Subsystem ready', data);
        });
        
        // Operation lifecycle events
        this.eventBus.on('operation:started', (data) => {
            this.logger.info('Operation started', data);
        });
        
        this.eventBus.on('operation:completed', (data) => {
            this.logger.info('Operation completed', data);
        });
        
        this.eventBus.on('operation:failed', (data) => {
            this.logger.error('Operation failed', data);
        });
        
        // Progress and status events
        this.eventBus.on('progress:updated', (data) => {
            this.logger.debug('Progress updated', data);
        });
        
        this.eventBus.on('status:changed', (data) => {
            this.logger.debug('Status changed', data);
        });
        
        this.logger.debug('EventBus listeners set up for subsystem coordination');
    }
    
    /**
     * Initialize UI
     */
    async initializeUI() {
        this.logger.debug('Initializing UI');
        
        // Use view management subsystem if available
        if (this.subsystems.viewManager) {
            await this.subsystems.viewManager.showView(this.currentView);
        } else {
            // Fallback to legacy view management
            await this.legacyShowView(this.currentView);
        }
        
        this.logger.debug('UI initialized');
    }
    
    /**
     * Show view using subsystem or fallback to legacy
     */
    async showView(view) {
        this.logger.debug('Showing view', { view, useSubsystem: !!this.subsystems.viewManager });
        
        if (this.subsystems.viewManager) {
            return await this.subsystems.viewManager.showView(view);
        } else {
            return await this.legacyShowView(view);
        }
    }
    
    /**
     * Legacy view management (fallback)
     */
    async legacyShowView(view) {
        this.logger.debug('Using legacy view management', { view });
        // Legacy implementation would go here
        this.currentView = view;
    }
    
    /**
     * Start import operation
     */
    async startImport() {
        this.logger.info('Starting import operation');
        
        if (this.subsystems.importManager) {
            return await this.subsystems.importManager.startImport();
        } else {
            // Fallback to legacy import
            this.logger.warn('Using legacy import - subsystem not available');
            return await this.legacyStartImport();
        }
    }
    
    /**
     * Start export operation
     */
    async startExport() {
        this.logger.info('Starting export operation');
        
        if (this.subsystems.exportManager) {
            return await this.subsystems.exportManager.startExport();
        } else {
            // Fallback to legacy export
            this.logger.warn('Using legacy export - subsystem not available');
            return await this.legacyStartExport();
        }
    }
    
    /**
     * Get authentication token
     */
    async getToken() {
        this.logger.debug('Getting authentication token');
        
        if (this.subsystems.authManager) {
            return await this.subsystems.authManager.getToken();
        } else {
            // Fallback to legacy token management
            this.logger.warn('Using legacy token management - subsystem not available');
            return await this.tokenManager.getToken();
        }
    }
    
    /**
     * Legacy methods (to be removed as subsystems are fully integrated)
     */
    async legacyStartImport() {
        this.logger.debug('Legacy import method called');
        // Legacy implementation
    }
    
    async legacyStartExport() {
        this.logger.debug('Legacy export method called');
        // Legacy implementation
    }
    
    /**
     * Get application health status
     */
    getHealthStatus() {
        return {
            initialized: this.isInitialized,
            subsystems: Object.keys(this.subsystems).reduce((status, key) => {
                status[key] = this.subsystems[key].isInitialized || false;
                return status;
            }, {}),
            featureFlags: FEATURE_FLAGS,
            currentView: this.currentView,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize and start the application
const app = new App();

// Global app reference for debugging
window.app = app;

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.init();
        console.log('🚀 PingOne Import Tool v6.0 initialized successfully');
        console.log('📊 Health Status:', app.getHealthStatus());
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
    }
});

export default App;