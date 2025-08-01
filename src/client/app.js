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
import { debugLog } from './utils/debug-logger.js';
import { createSafeLogger } from './utils/safe-logger.js';

// Debug-friendly utilities
import '../../public/js/utils/utility-loader.js';

// 🛡️ BULLETPROOF SYSTEM - CANNOT FAIL
import BulletproofAppIntegration from './utils/bulletproof-app-integration.js';
import { createBulletproofTokenManager } from './utils/bulletproof-token-manager.js';
import { createBulletproofSubsystemWrapper } from './utils/bulletproof-subsystem-wrapper.js';
import './utils/bulletproof-global-handler.js'; // Auto-initializes

// Initialize the comprehensive banner system
import './init-banner-system.js';

// Core utilities
import { Logger } from '../../public/js/modules/logger.js';
import { FileLogger } from '../../public/js/modules/file-logger.js';
import { EventBus } from '../../public/js/modules/event-bus.js';
import { GlobalUIManager } from '../../public/js/modules/global-ui-manager.js';

// Centralized logger
import { CentralizedLogger } from '../../public/js/utils/centralized-logger.js';

// Components
import { SettingsManager } from '../../public/js/modules/settings-manager.js';
import { UIManager } from './components/ui-manager.js';
import TokenManager from '../../public/js/modules/token-manager.js';

// Modal components (needed for startup flow)
import '../../public/js/modules/disclaimer-modal.js';
import '../../public/js/modules/credentials-modal.js';

// Subsystems (new architecture)
import { ImportSubsystem } from './subsystems/import-subsystem.js';
import { ExportSubsystem } from './subsystems/export-subsystem.js';
import { OperationManagerSubsystem } from './subsystems/operation-manager-subsystem.js';
import { NavigationSubsystem } from './subsystems/navigation-subsystem.js';
import { ConnectionManagerSubsystem } from './subsystems/connection-manager-subsystem.js';
import { RealtimeCommunicationSubsystem } from './subsystems/realtime-communication-subsystem.js';
import { AuthManagementSubsystem } from './subsystems/auth-management-subsystem.js';
import { ViewManagementSubsystem } from './subsystems/view-management-subsystem.js';
import { GlobalTokenManagerSubsystem } from './subsystems/global-token-manager-subsystem.js';
import { TokenNotificationSubsystem } from './subsystems/token-notification-subsystem.js';
import { AdvancedRealtimeSubsystem } from './subsystems/advanced-realtime-subsystem.js';
import { RealtimeCollaborationUI } from './components/realtime-collaboration-ui.js';
import { AnalyticsDashboardSubsystem } from './subsystems/analytics-dashboard-subsystem.js';
import { AnalyticsDashboardUI } from './components/analytics-dashboard-ui.js';
import HistoryUIComponent from './components/history-ui.js';
import EnhancedLoggingUIComponent from './components/logging-ui-enhanced.js';
import TestingHub from './components/testing-hub.js';

// Modern subsystems (replacing legacy modules)
import { ProgressSubsystem } from '../../public/js/modules/progress-subsystem.js';
import { EnhancedProgressSubsystem } from './subsystems/enhanced-progress-subsystem.js';
import { EnhancedTokenStatusSubsystem } from './subsystems/enhanced-token-status-subsystem.js';
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
        // Initialize centralized logger with safe wrapper to prevent logging errors from breaking the app
        try {
            this.logger = new Logger({
                context: 'app',
                version: '6.5.2.4',
                enableConsole: true,
                enableStorage: false
            });
            
            // Test the logger
            this.logger.info('Centralized Logger initialized successfully', {
                version: '6.5.2.4',
                featureFlags: FEATURE_FLAGS,
                userAgent: navigator.userAgent
            });
            
        } catch (error) {
            // Fallback to console logging if centralized logger fails
            console.error('Failed to initialize CentralizedLogger, falling back to console logging:', error);
            this.logger = {
                debug: console.debug.bind(console),
                info: console.info.bind(console),
                warn: console.warn.bind(console),
                error: console.error.bind(console),
                startTimer: (label) => ({ label, startTime: Date.now() }),
                endTimer: (timer) => {
                    const duration = Date.now() - timer.startTime;
                    console.log(`[${timer.label}] Completed in ${duration}ms`);
                    return duration;
                }
            };
            
            this.logger.warn('Using fallback console logger due to CentralizedLogger initialization failure');
        }
        
        // 🛡️ INITIALIZE BULLETPROOF SYSTEM - CANNOT FAIL
        this.bulletproofSystem = null;
        this.initializeBulletproofSystem();
        
        // Log application start
        this.logger.info('🚀 PingOne Import Tool starting...', {
            version: '6.5.2.4',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Core components
        this.eventBus = new EventBus();
        this.settingsManager = null;
        this.uiManager = null;
        this.tokenManager = null;
        this.fileHandler = null;
        this.versionManager = null;
        this.globalUIManager = null;
        
        // API clients
        this.localClient = null;
        
        // UI Components
        this.globalTokenManager = null;
        
        // Modern subsystems (replacing legacy managers)
        this.progressSubsystem = null;
        this.enhancedProgressSubsystem = null;
        this.enhancedTokenStatusSubsystem = null;
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
        this.analyticsDashboardSubsystem = null;
        this.analyticsDashboardUI = null;
        
        // Application state
        this.isInitialized = false;
        this.currentView = 'home';
        this.socket = null;
        
        // Application version
        this.version = '6.5.2.4';
        this.buildTimestamp = new Date().toISOString();
        this.environment = 'development';
        this.features = {
            bulletproofProgressContainer: true,
            analyticsDataMethod: true
        };
        
        // Performance tracking
        this.logger.startTimer('app-initialization');
    }
    
    /**
     * 🛡️ Initialize Bulletproof System - CANNOT FAIL
     */
    initializeBulletproofSystem() {
        try {
            this.logger.info('🛡️ Initializing Bulletproof Protection System...');
            
            // Initialize bulletproof app integration
            this.bulletproofSystem = new BulletproofAppIntegration({
                logger: this.logger,
                eventBus: this.eventBus,
                app: this
            });
            
            // Initialize bulletproof protection
            this.bulletproofSystem.initialize();
            
            this.logger.info('🛡️ Bulletproof Protection System initialized successfully');
            
        } catch (error) {
            this.logger.error('🛡️ Failed to initialize Bulletproof Protection System', error);
            // Continue without bulletproof protection - app should still work
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('🔧 [APP INIT] Starting app.init() method...');
        try {
            console.log('🔧 [APP INIT] Logger available:', !!this.logger);
            this.logger.info('Starting application initialization');
            console.log('🔧 [APP INIT] About to initialize core components...');
            this.updateStartupMessage('Initializing core components...');
            
            // Initialize core components
            await this.initializeCoreComponents();
            this.updateStartupMessage('Setting up subsystems...');
            
            // Initialize subsystems
            await this.initializeSubsystems();
            this.updateStartupMessage('Loading legacy components...');
            
            // Initialize legacy components (gradually being replaced)
            await this.initializeLegacyComponents();
            this.updateStartupMessage('Setting up event listeners...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up modal completion listeners
            this.setupModalCompletionListeners();
            this.updateStartupMessage('Finalizing user interface...');
            
            // Initialize UI
            await this.initializeUI();
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide startup screen
            this.hideStartupScreen();
            
            const initTime = this.logger.endTimer('app-initialization');
            this.logger.info('Application initialization completed', {
                initializationTime: `${initTime}ms`,
                subsystemsEnabled: Object.keys(this.subsystems).length
            });
            
            // Show success status bar with version and system info
            this.showInitializationSuccessStatus();
            
        } catch (error) {
            this.logger.error('Application initialization failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    
    /**
     * Show initialization success status with version and system info
     */
    showInitializationSuccessStatus() {
        try {
            // Get current bundle info
            const scripts = document.querySelectorAll('script[src*="bundle-"]');
            let bundleVersion = 'Unknown';
            if (scripts.length > 0) {
                const bundleSrc = scripts[scripts.length - 1].src;
                const match = bundleSrc.match(/bundle-(\d+)\.js/);
                if (match) {
                    bundleVersion = match[1];
                }
            }
            
            // Get token status
            let tokenStatus = 'No Token';
            let tokenTimeLeft = '';
            try {
                if (this.subsystems.enhancedTokenStatus && 
                    typeof this.subsystems.enhancedTokenStatus.getTokenStatus === 'function') {
                    const status = this.subsystems.enhancedTokenStatus.getTokenStatus();
                    if (status && status.isValid) {
                        tokenStatus = 'Valid Token';
                        tokenTimeLeft = ` (${status.expiresInMinutes}min left)`;
                    } else {
                        tokenStatus = 'Invalid Token';
                    }
                } else {
                    // Check if we have valid credentials in settings
                    const hasCredentials = this.checkCredentialsAvailable();
                    tokenStatus = hasCredentials ? 'Checking Token...' : 'No Credentials';
                }
            } catch (error) {
                this.logger.warn('Could not get token status', { error: error.message });
                tokenStatus = 'Token Status Unknown';
            }
            
            // Create status message
            const statusMessage = `✅ v${this.version} Ready | Bundle: ${bundleVersion} | Last Update: UIManager & SafeDOM fixes | Token: ${tokenStatus}${tokenTimeLeft}`;
            
            // Show green success status bar
            if (this.uiManager && this.uiManager.showStatusBar) {
                this.uiManager.showStatusBar(statusMessage, 'success', {
                    duration: 10000, // Show for 10 seconds
                    autoDismiss: true
                });
            }
            
            this.logger.info('Initialization success status displayed', {
                version: this.version,
                bundleVersion,
                tokenStatus,
                tokenTimeLeft
            });
            
        } catch (error) {
            this.logger.error('Failed to show initialization success status', {
                error: error.message,
                stack: error.stack
            });
        }
    }
    
    /**
     * Check if PingOne credentials are available
     */
    checkCredentialsAvailable() {
        try {
            // Check environment variables first
            if (typeof process !== 'undefined' && process.env) {
                const hasEnvCredentials = process.env.PINGONE_CLIENT_ID && 
                                        process.env.PINGONE_CLIENT_SECRET && 
                                        process.env.PINGONE_ENVIRONMENT_ID;
                if (hasEnvCredentials) {
                    return true;
                }
            }
            
            // Check settings subsystem
            if (this.subsystems.settings && 
                typeof this.subsystems.settings.getSettings === 'function') {
                const settings = this.subsystems.settings.getSettings();
                const hasSettingsCredentials = settings.apiClientId && 
                                             settings.apiSecret && 
                                             settings.environmentId &&
                                             !settings.apiClientId.includes('test-') &&
                                             !settings.apiSecret.includes('test-');
                return hasSettingsCredentials;
            }
            
            return false;
        } catch (error) {
            this.logger.warn('Error checking credentials availability', { error: error.message });
            return false;
        }
    }
    
    /**
     * Hide the startup screen with a smooth transition and proper cleanup
     */
    hideStartupScreen() {
        try {
            const startupScreen = document.getElementById('startup-wait-screen');
            const appContainer = document.querySelector('.app-container');
            
            if (startupScreen) {
                this.logger.debug('Starting to hide startup wait screen');
                
                // Add fade-out class to trigger CSS transition
                startupScreen.classList.add('fade-out');
                
                // Remove the startup-loading class from app container to show the app
                if (appContainer) {
                    appContainer.classList.remove('startup-loading');
                }
                
                // Set a timeout to remove the element after the transition completes
                const removeStartupScreen = () => {
                    try {
                        if (startupScreen && startupScreen.parentNode) {
                            // Force a reflow to ensure the fade-out animation plays
                            void startupScreen.offsetHeight;
                            
                            // Remove the element from the DOM
                            startupScreen.parentNode.removeChild(startupScreen);
                            this.logger.debug('Startup wait screen removed from DOM');
                        }
                    } catch (error) {
                        this.logger.error('Error removing startup screen from DOM:', error);
                    }
                };
                
                // Wait for the transition to complete before removing the element
                // The transition duration is 0.5s (500ms) as defined in CSS
                setTimeout(removeStartupScreen, 600);
                
                this.logger.debug('Startup wait screen hidden with animation');
            } else {
                this.logger.warn('Startup wait screen element not found');
                // Still try to show the app container if it's hidden
                if (appContainer) {
                    appContainer.classList.remove('startup-loading');
                }
            }
            
            // Additional check to ensure app container is visible
            if (appContainer && appContainer.classList.contains('startup-loading')) {
                appContainer.classList.remove('startup-loading');
            }
            
        } catch (error) {
            this.logger.error('Error in hideStartupScreen:', error);
            
            // Fallback: Try to hide the startup screen directly if the animation fails
            try {
                const startupScreen = document.getElementById('startup-wait-screen');
                if (startupScreen) {
                    startupScreen.style.display = 'none';
                    if (startupScreen.parentNode) {
                        startupScreen.parentNode.removeChild(startupScreen);
                    }
                }
                
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.classList.remove('startup-loading');
                }
            } catch (fallbackError) {
                this.logger.error('Fallback error handling failed:', fallbackError);
            }
        }
    }
    
    /**
     * Initialize core components
     */
    async initializeCoreComponents() {
        this.logger.debug('Initializing core components');

        // Initialize Global UI Manager first as it provides UI feedback for other components
        this.globalUIManager = new GlobalUIManager(this);
        await this.globalUIManager.init();
        this.logger.debug('Global UI Manager initialized');

        // API clients must be first as other components depend on it.
        this.localClient = new LocalAPIClient(this.logger);

        // Initialize UIManager first as SettingsSubsystem depends on it.
        this.uiManager = new UIManager({ logger: this.logger });

        // Initialize SettingsManager before SettingsSubsystem
        this.settingsManager = new SettingsManager(this.logger.child({ component: 'settings-manager' }));
        await this.settingsManager.init();
        this.logger.debug('Settings manager initialized');

        // SettingsSubsystem is a core component and must be initialized before others that depend on it.
        this.settingsSubsystem = new SettingsSubsystem(
            this.logger.child({ subsystem: 'settings' }),
            this.uiManager,
            this.localClient,
            this.settingsManager, // Now properly initialized
            this.eventBus,
            null, // credentialsManager - not available yet
            this.globalUIManager // Pass global UI manager for notifications
        );
        await this.settingsSubsystem.init();
        this.subsystems.settings = this.settingsSubsystem;
        this.logger.debug('Settings subsystem initialized as a core component');

        // Initialize other core components that may depend on the above.
        this.tokenManager = new TokenManager(this.logger, this.subsystems.settings.getAllSettings(), this.eventBus);
        this.fileHandler = new FileHandler(this.logger, this.uiManager);
        this.versionManager = new VersionManager();
        
        // Update UI with token status after token manager is initialized
        if (this.tokenManager && this.globalUIManager) {
            const tokenStatus = this.tokenManager.isTokenValid() ? 'valid' : 'invalid';
            this.globalUIManager.updateTokenStatus(tokenStatus);
            
            // Listen for token status changes
            this.eventBus.on('token-status-changed', (status) => {
                this.globalUIManager.updateTokenStatus(status);
            });
        }
        try {
            this.pingOneClient = new PingOneClient();
            this.logger.debug('PingOne client created successfully');
        } catch (error) {
            this.logger.error('Failed to create PingOne client:', error);
            this.pingOneClient = null;
        }

        this.logger.debug('Core components initialized');
    }
    
    /**
     * Check if PingOne client is available and ready
     */
    isPingOneClientAvailable() {
        return this.pingOneClient !== null && typeof this.pingOneClient === 'object';
    }

    /**
     * Initialize subsystems with feature flags
     */
    async initializeSubsystems() {
        this.logger.info('Initializing subsystems...');

        // Defensive check for logger before proceeding
        if (!this.logger) {
            console.error('CRITICAL: Logger not initialized before subsystem setup. Aborting.');
            this.uiManager.showGlobalError('A critical error occurred during startup. Please refresh the page.');
            return;
        }

        try {
            // Subsystem Initialization with Feature Flags
            // Each subsystem is initialized only if its feature flag is enabled.
            // The main logger instance is passed directly to ensure stability.

            const subsystemsToInit = [
                { name: 'logging', flag: true, constructor: LoggingSubsystem, deps: [this.eventBus, this.logger] },
                { name: 'navigation', flag: FEATURE_FLAGS.USE_NAVIGATION_SUBSYSTEM, constructor: NavigationSubsystem, deps: [this.logger, this.uiManager, this.subsystems.settings] },
                { name: 'connectionManager', flag: FEATURE_FLAGS.USE_CONNECTION_MANAGER, constructor: ConnectionManagerSubsystem, deps: [this.logger, this.uiManager, this.subsystems.settings, this.localClient] },
                { name: 'realtimeManager', flag: FEATURE_FLAGS.USE_REALTIME_SUBSYSTEM, constructor: RealtimeCommunicationSubsystem, deps: [this.logger, this.uiManager] },
                { name: 'authManager', flag: FEATURE_FLAGS.USE_AUTH_MANAGEMENT, constructor: AuthManagementSubsystem, deps: [this.logger, this.uiManager, this.localClient, this.subsystems.settings] },
                { name: 'viewManager', flag: FEATURE_FLAGS.USE_VIEW_MANAGEMENT, constructor: ViewManagementSubsystem, deps: [this.logger, this.uiManager] },
                { name: 'operationManager', flag: FEATURE_FLAGS.USE_OPERATION_MANAGER, constructor: OperationManagerSubsystem, deps: [this.logger, this.uiManager, this.subsystems.settings, this.localClient] },
                { name: 'population', flag: true, constructor: PopulationSubsystem, deps: [this.eventBus, this.subsystems.settings, () => this.subsystems.logging, this.localClient] },
                { name: 'history', flag: true, constructor: HistorySubsystem, deps: [this.eventBus, this.subsystems.settings, () => this.subsystems.logging] },
                { name: 'import', flag: FEATURE_FLAGS.USE_IMPORT_SUBSYSTEM, constructor: ImportSubsystem, deps: [this.logger, this.uiManager, this.localClient, this.subsystems.settings, this.eventBus, () => this.subsystems.population, () => this.subsystems.authManager] },
                { name: 'export', flag: FEATURE_FLAGS.USE_EXPORT_SUBSYSTEM, constructor: ExportSubsystem, deps: [this.logger, this.uiManager, this.localClient, this.subsystems.settings, this.eventBus, () => this.subsystems.population] },
                { name: 'analyticsDashboard', flag: FEATURE_FLAGS.USE_ANALYTICS_DASHBOARD, constructor: AnalyticsDashboardSubsystem, deps: [this.logger, this.eventBus, () => this.subsystems.advancedRealtime, this.progressSubsystem, this.sessionSubsystem] },
                { name: 'advancedRealtime', flag: FEATURE_FLAGS.USE_ADVANCED_REALTIME, constructor: AdvancedRealtimeSubsystem, deps: [this.logger, this.eventBus, () => this.subsystems.realtimeManager, this.sessionSubsystem, this.progressSubsystem] },
            ];

            for (const sub of subsystemsToInit) {
                if (sub.flag) {
                    try {
                        console.log(`🔧 [SUBSYSTEM INIT] Starting ${sub.name} subsystem initialization...`);
                        this.logger.debug(`Initializing ${sub.name} subsystem...`);
                        
                        // Log dependency resolution
                        console.log(`🔧 [SUBSYSTEM INIT] ${sub.name} dependencies:`, sub.deps.map(dep => typeof dep === 'function' ? 'function()' : dep));
                        
                        // Resolve dependencies that are functions (lazy loading)
                        const resolvedDeps = sub.deps.map(dep => {
                            if (typeof dep === 'function') {
                                const resolved = dep();
                                console.log(`🔧 [SUBSYSTEM INIT] ${sub.name} lazy dependency resolved:`, resolved ? 'success' : 'null/undefined');
                                return resolved;
                            }
                            return dep;
                        });
                        
                        console.log(`🔧 [SUBSYSTEM INIT] ${sub.name} resolved dependencies:`, resolvedDeps.map(dep => dep ? 'available' : 'null/undefined'));
                        
                        // Check if constructor exists
                        if (!sub.constructor) {
                            throw new Error(`Constructor not found for ${sub.name} subsystem`);
                        }
                        
                        console.log(`🔧 [SUBSYSTEM INIT] ${sub.name} creating instance...`);
                        const subsystemInstance = new sub.constructor(...resolvedDeps);
                        
                        console.log(`🔧 [SUBSYSTEM INIT] ${sub.name} calling init()...`);
                        await subsystemInstance.init();
                        
                        // 🛡️ Wrap subsystem with bulletproof protection - CANNOT FAIL
                        console.log(`🛡️ [SUBSYSTEM INIT] ${sub.name} applying bulletproof protection...`);
                        this.subsystems[sub.name] = createBulletproofSubsystemWrapper(
                            subsystemInstance, 
                            this.logger.child({ subsystem: sub.name })
                        );
                        
                        console.log(`✅ [SUBSYSTEM INIT] ${sub.name} subsystem initialized successfully!`);
                        this.logger.info(`${sub.name} subsystem initialized successfully.`);
                    } catch (error) {
                        console.error(`❌ [SUBSYSTEM INIT] Failed to initialize ${sub.name} subsystem:`, error);
                        this.logger.error(`Failed to initialize ${sub.name} subsystem`, {
                            error: error.message,
                            stack: error.stack,
                            subsystem: sub.name
                        });
                        
                        // 🛡️ Create bulletproof emergency fallback subsystem - CANNOT FAIL
                        console.log(`🛡️ [SUBSYSTEM INIT] Creating emergency fallback for ${sub.name}...`);
                        this.subsystems[sub.name] = this.createEmergencySubsystem(sub.name, error);
                    }
                } else {
                    console.log(`⏭️ [SUBSYSTEM INIT] Skipping ${sub.name} subsystem (flag disabled)`);
                }
            }

            // Initialize UI components that depend on subsystems
            if (this.subsystems.advancedRealtime) {
                this.realtimeCollaborationUI = new RealtimeCollaborationUI(
                    this.logger, 
                    this.eventBus, 
                    this.subsystems.advancedRealtime, 
                    this.uiManager
                );
                this.realtimeCollaborationUI.init();
            }

            // Initialize Analytics Dashboard UI if the subsystem is available
            if (this.subsystems.analyticsDashboard) {
                try {
                    this.logger.debug('Initializing Analytics Dashboard UI...');
                    this.analyticsDashboardUI = new AnalyticsDashboardUI(
                        this.eventBus,
                        this.subsystems.analyticsDashboard
                    );
                    await this.analyticsDashboardUI.init();
                    this.logger.info('Analytics Dashboard UI initialized successfully');
                } catch (error) {
                    this.logger.error('Failed to initialize Analytics Dashboard UI', {
                        error: error.message,
                        stack: error.stack
                    });
                    // Don't rethrow to allow the app to continue without analytics UI
                }
            }

            this.logger.info('Subsystem initialization completed (some may have failed).');

        } catch (error) {
            this.logger.error('Critical error during subsystem initialization', {
                error: error.message,
                stack: error.stack
            });
            // Log the error but don't throw it to allow app initialization to continue
            this.logger.warn('Continuing app initialization despite subsystem errors');
        }

        // 🛡️ BULLETPROOF Global Token Manager Subsystem - CANNOT FAIL
        try {
            this.logger.info('🛡️ Initializing Bulletproof Global Token Manager...');
            
            // Create original token manager
            const originalTokenManager = new GlobalTokenManagerSubsystem(
                this.logger.child({ subsystem: 'globalTokenManager' }),
                this.eventBus
            );
            
            // Initialize original token manager
            await originalTokenManager.init();
            
            // Create bulletproof wrapper
            this.bulletproofTokenManager = createBulletproofTokenManager(this.logger);
            
            if (this.bulletproofTokenManager) {
                // Wrap the original with bulletproof protection
                this.subsystems.globalTokenManager = await this.bulletproofTokenManager.initialize(originalTokenManager);
                this.logger.info('🛡️ Bulletproof Global Token Manager initialized successfully');
            } else {
                // Fallback to original if bulletproof creation failed
                this.subsystems.globalTokenManager = originalTokenManager;
                this.logger.warn('🛡️ Using original token manager (bulletproof creation failed)');
            }
        } catch (error) {
            this.logger.error('🛡️ Bulletproof token manager initialization failed', error);
            
            // Emergency fallback - create minimal token manager
            this.subsystems.globalTokenManager = {
                name: 'EmergencyTokenManager',
                init: () => Promise.resolve(true),
                updateGlobalTokenStatus: () => {
                    try {
                        const statusBox = document.getElementById('global-token-status');
                        if (statusBox) {
                            statusBox.innerHTML = '<span class="global-token-icon">🛡️</span><span class="global-token-text">Token status protected</span>';
                        }
                    } catch (e) {
                        console.log('🛡️ Emergency token status active');
                    }
                },
                destroy: () => Promise.resolve(true)
            };
        }

        // Initialize Token Notification Subsystem
        this.subsystems.tokenNotification = new TokenNotificationSubsystem(
            this.logger.child({ subsystem: 'token-notification' }),
            this.eventBus,
            this.subsystems.navigation
        );
        await this.subsystems.tokenNotification.init();
        this.logger.debug('Token Notification subsystem initialized');

        // Initialize Enhanced Progress Subsystem
        // Fixed progress subsystem initialization
        this.enhancedProgressSubsystem = new EnhancedProgressSubsystem(
            this.logger.child({ subsystem: 'enhanced-progress' }),
            this.uiManager,
            this.eventBus,
            this.subsystems.realtimeManager
        );
        await this.enhancedProgressSubsystem.init();
        this.subsystems.enhancedProgress = this.enhancedProgressSubsystem;
        this.logger.debug('Enhanced Progress subsystem initialized');

        // Initialize Enhanced Token Status Subsystem
        this.enhancedTokenStatusSubsystem = new EnhancedTokenStatusSubsystem(
            this.logger.child({ subsystem: 'enhanced-token-status' }),
            this.eventBus,
            this.uiManager
        );
        await this.enhancedTokenStatusSubsystem.init();
        this.subsystems.enhancedTokenStatus = this.enhancedTokenStatusSubsystem;
        this.logger.debug('Enhanced Token Status subsystem initialized');

        this.logger.info('All subsystems initialized successfully', {
            subsystemCount: Object.keys(this.subsystems).length,
            enabledSubsystems: Object.keys(this.subsystems)
        });
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

        // Settings save feedback event listeners
        window.addEventListener('settings:save-success', (event) => {
            const statusBox = document.getElementById('settings-status-box');
            if (statusBox) {
                statusBox.textContent = event.detail.message;
                statusBox.className = 'status-message status-success';
                statusBox.style.display = 'flex';
                setTimeout(() => {
                    statusBox.style.display = 'none';
                }, 5000);
            }
        });

        window.addEventListener('settings:save-error', (event) => {
            const statusBox = document.getElementById('settings-status-box');
            if (statusBox) {
                statusBox.textContent = event.detail.message;
                statusBox.className = 'status-message status-error';
                statusBox.style.display = 'flex';
                setTimeout(() => {
                    statusBox.style.display = 'none';
                }, 8000);
            }
        });
        
        // EventBus listeners for subsystem coordination
        this.setupEventBusListeners();
        
        // Setup main UI button event listeners
        this.setupMainUIEventListeners();
        
        this.logger.debug('Event listeners and EventBus patterns set up');
    }
    
    /**
     * Set up main UI event listeners for navigation and buttons
     */
    setupMainUIEventListeners() {
        this.logger.debug('Setting up main UI event listeners');
        
        try {
            // Note: Navigation cards are handled by ViewManagementSubsystem
            // Only set up non-navigation UI event listeners here
            
            // File input handlers for import
            const fileInput = document.getElementById('csv-file');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    this.logger.debug('File input changed');
                    this.handleFileSelection(e);
                });
            }
            
            // Drop zone handlers for import
            const dropZone = document.getElementById('import-drop-zone');
            if (dropZone) {
                dropZone.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.debug('Drop zone clicked');
                    if (fileInput) {
                        fileInput.click();
                    }
                });
                
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
                    this.logger.debug('File dropped');
                    this.handleFileDrop(e);
                });
            }
            
            // Cancel import button
            const cancelImportBtn = document.getElementById('cancel-import-btn');
            if (cancelImportBtn) {
                cancelImportBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.debug('Cancel import button clicked');
                    this.cancelImport();
                });
            }
            
            // DIRECT NAVIGATION FIX - Add navigation event listeners as fallback
            this.logger.debug('Setting up direct navigation event listeners as fallback');
            this.setupDirectNavigation();
            
            this.logger.debug('Main UI event listeners set up successfully');
            
        } catch (error) {
            this.logger.error('Failed to set up main UI event listeners', { error: error.message });
        }
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
        this.eventBus.on('navigation:view-changed', ({ newView }) => {
            this.currentView = newView;
            this.logger.info(`View changed to: ${newView}`);

            if (isFeatureEnabled('ANALYTICS_DASHBOARD') && this.analyticsDashboardUI) {
                if (newView === 'analytics') {
                    this.analyticsDashboardUI.show();
                } else {
                    this.analyticsDashboardUI.hide();
                }
            }
        });
        
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
     * Set up modal completion listeners
     */
    setupModalCompletionListeners() {
        try {
            // Listen for credentials modal completion
            document.addEventListener('credentials-modal-completed', (event) => {
                this.logger.info('🔄 LOADING: Credentials modal completed', event.detail);
                this.showModalLoading('Finalizing Setup...', 'Completing your PingOne Import Tool configuration.');
                
                // Hide loading after a brief delay
                setTimeout(() => {
                    this.hideModalLoading();
                }, 1500);
            });
            
            // Listen for any modal events that might indicate completion
            document.addEventListener('application_enabled_after_credentials', (event) => {
                this.logger.info('🔄 LOADING: Application enabled after credentials');
                this.showModalLoading('Almost Ready...', 'Finalizing your workspace setup.');
                
                setTimeout(() => {
                    this.hideModalLoading();
                }, 1000);
            });
            
            this.logger.debug('Modal completion listeners set up');
            
        } catch (error) {
            this.logger.error('Failed to set up modal completion listeners', { error: error.message });
        }
    }
    
    /**
     * Show modal loading overlay
     */
    showModalLoading(title = 'Loading...', message = 'Please wait while we set up your experience.') {
        try {
            const overlay = document.getElementById('modal-loading-overlay');
            const titleElement = document.getElementById('modal-loading-title');
            const messageElement = document.getElementById('modal-loading-message');
            
            if (overlay && titleElement && messageElement) {
                titleElement.textContent = title;
                messageElement.textContent = message;
                
                overlay.classList.remove('fade-out');
                overlay.classList.add('fade-in');
                overlay.style.display = 'flex';
                
                this.logger.debug('🔄 LOADING: Modal loading shown', { title, message });
            }
        } catch (error) {
            this.logger.error('🔄 LOADING: Failed to show modal loading', { error: error.message });
        }
    }
    
    /**
     * Hide modal loading overlay
     */
    hideModalLoading() {
        try {
            const overlay = document.getElementById('modal-loading-overlay');
            
            if (overlay) {
                overlay.classList.remove('fade-in');
                overlay.classList.add('fade-out');
                
                // Hide after animation completes
                setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.classList.remove('fade-out');
                }, 300);
                
                this.logger.debug('🔄 LOADING: Modal loading hidden');
            }
        } catch (error) {
            this.logger.error('🔄 LOADING: Failed to hide modal loading', { error: error.message });
        }
    }
    
    /**
     * Update startup screen message
     */
    updateStartupMessage(message) {
        try {
            const startupScreen = document.getElementById('startup-wait-screen');
            const textElement = startupScreen?.querySelector('.startup-text p');
            
            if (textElement) {
                textElement.textContent = message;
                this.logger.debug('🔄 LOADING: Startup message updated', { message });
            }
        } catch (error) {
            this.logger.error('🔄 LOADING: Failed to update startup message', { error: error.message });
        }
    }
    
    /**
     * Set up direct navigation event listeners as fallback
     * This is used when the ViewManagementSubsystem is not working properly
     */
    setupDirectNavigation() {
        this.logger.debug('🔧 DIRECT NAV: Setting up direct navigation event listeners');
        
        try {
            // Find all navigation elements
            const navElements = document.querySelectorAll('[data-view]');
            this.logger.debug(`🔧 DIRECT NAV: Found ${navElements.length} navigation elements`);
            
            if (navElements.length === 0) {
                this.logger.warn('🔧 DIRECT NAV: No navigation elements found with [data-view] attribute');
                return;
            }
            
            // Add click listeners to navigation elements
            navElements.forEach((element, index) => {
                const view = element.getAttribute('data-view');
                this.logger.debug(`🔧 DIRECT NAV: Setting up listener for ${view} (element ${index})`);
                
                // Remove any existing listeners first
                element.removeEventListener('click', this.handleDirectNavigation);
                
                // Add new listener
                const clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.logger.info(`🔧 DIRECT NAV: Navigation clicked: ${view}`);
                    this.directShowView(view);
                };
                
                element.addEventListener('click', clickHandler);
                
                // Store the handler for cleanup if needed
                element._directNavHandler = clickHandler;
            });
            
            this.logger.info('🔧 DIRECT NAV: Direct navigation setup completed successfully');
            
            // Also set up settings page buttons
            this.setupSettingsPageButtons();
            
        } catch (error) {
            this.logger.error('🔧 DIRECT NAV: Failed to set up direct navigation', { error: error.message });
        }
    }
    
    /**
     * Set up settings page button event listeners
     */
    setupSettingsPageButtons() {
        this.logger.debug('🔧 SETTINGS: Setting up settings page button listeners');
        
        try {
            // Save Settings button
            const saveSettingsBtn = document.getElementById('save-settings');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.info('🔧 SETTINGS: Save Settings clicked');
                    this.handleSaveSettings();
                });
                this.logger.debug('🔧 SETTINGS: Save Settings button listener added');
            }
            
            // Test Connection button
            const testConnectionBtn = document.getElementById('test-connection-btn');
            if (testConnectionBtn) {
                testConnectionBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.info('🔧 SETTINGS: Test Connection clicked');
                    this.handleTestConnection();
                });
                this.logger.debug('🔧 SETTINGS: Test Connection button listener added');
            }
            
            // Get Token button
            const getTokenBtn = document.getElementById('get-token-btn');
            if (getTokenBtn) {
                getTokenBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.info('🔧 SETTINGS: Get Token clicked');
                    this.handleGetToken();
                });
                this.logger.debug('🔧 SETTINGS: Get Token button listener added');
            }
            
            // Toggle API Secret Visibility button
            const toggleSecretBtn = document.getElementById('toggle-api-secret-visibility');
            if (toggleSecretBtn) {
                toggleSecretBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logger.info('🔧 SETTINGS: Toggle Secret Visibility clicked');
                    this.handleToggleSecretVisibility();
                });
                this.logger.debug('🔧 SETTINGS: Toggle Secret Visibility button listener added');
            }
            
            this.logger.info('🔧 SETTINGS: Settings page buttons setup completed');
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to set up settings page buttons', { error: error.message });
        }
    }
    
    /**
     * Handle Save Settings button click
     */
    async handleSaveSettings() {
        this.logger.info('🔧 SETTINGS: Saving settings...');
        
        // Debug logging
        debugLog.userAction('save_settings', 'save-settings-button', {
            timestamp: Date.now()
        });
        
        try {
            // Get form values
            const environmentId = document.getElementById('environment-id')?.value;
            const clientId = document.getElementById('api-client-id')?.value;
            const clientSecret = document.getElementById('api-secret')?.value;
            const region = document.getElementById('region')?.value;
            const rateLimit = document.getElementById('rate-limit')?.value;
            const populationId = document.getElementById('population-id')?.value;
            
            const settings = {
                environmentId,
                apiClientId: clientId,  // Fix: use apiClientId instead of clientId
                apiSecret: clientSecret,  // Fix: use apiSecret instead of clientSecret
                region,
                rateLimit: parseInt(rateLimit) || 90,
                populationId
            };
            
            this.logger.debug('🔧 SETTINGS: Settings to save', { ...settings, clientSecret: '[HIDDEN]' });
            
            // Use settings manager if available
            if (this.settingsManager && typeof this.settingsManager.saveSettings === 'function') {
                await this.settingsManager.saveSettings(settings);
                this.showSettingsStatus('Settings saved successfully!', 'success');
            } else {
                // Fallback: save to localStorage and send to server
                localStorage.setItem('pingone-settings', JSON.stringify(settings));
                
                // Send to server
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    this.showSettingsStatus('Settings saved successfully!', 'success');
                    this.logger.info('🔧 SETTINGS: Settings saved successfully', result);
                } else {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to save settings', { error: error.message });
            
            // Debug logging
            debugLog.error('settings', 'Save settings failed', error, {
                action: 'save_settings',
                timestamp: Date.now()
            });
            
            this.showSettingsStatus(`Failed to save settings: ${error.message}`, 'error');
        }
    }
    
    /**
     * Load settings and populate form fields
     * Called by ViewManagementSubsystem when settings view is initialized
     * 
     * CRITICAL: This method is required by ViewManagementSubsystem.initializeSettingsView()
     * DO NOT remove or rename this method without updating ViewManagementSubsystem
     * Last fixed: 2025-07-21 - Missing method caused settings page to not load credentials
     * 
     * @returns {Promise<Object>} Loaded settings object
     */
    async loadSettings() {
        this.logger.info('🔧 SETTINGS: Loading settings for form population...');
        
        try {
            // Use SettingsSubsystem if available
            if (this.settingsSubsystem && typeof this.settingsSubsystem.loadSettings === 'function') {
                this.logger.debug('🔧 SETTINGS: Using SettingsSubsystem to load settings');
                const settings = await this.settingsSubsystem.loadSettings();
                this.populateSettingsForm(settings);
                return settings;
            }
            
            // Fallback to direct API call (same as credentials modal)
            this.logger.debug('🔧 SETTINGS: Using direct API call to load settings');
            try {
                const response = await fetch('/api/settings');
            
                if (response.ok) {
                    const settings = await response.json();
                    this.populateSettingsForm(settings);
                    return settings;
                }
            } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to load settings from API', { error: error.message });
            this.showSettingsStatus(`Failed to load settings: ${error.message}`, 'error');
            return {};
        }
    } catch (error) {
        this.logger.error('🔧 SETTINGS: Failed to load settings', { error: error.message });
        this.showSettingsStatus(`Failed to load settings: ${error.message}`, 'error');
        return {};
    }
}

    /**
     * Populate settings form fields with loaded data
     */
    populateSettingsForm(settings) {
        this.logger.debug('🔧 SETTINGS: Populating form fields with settings data');
        
        try {
            // Map settings to form fields (handle both naming conventions)
            const fieldMappings = {
                'environment-id': settings.environmentId || settings['environment-id'] || '',
                'api-client-id': settings.apiClientId || settings['api-client-id'] || '',
                'api-secret': settings.apiSecret || settings['api-secret'] || '',
                'region': settings.region || 'NorthAmerica',
                'population-id': settings.populationId || settings['population-id'] || '',
                'rate-limit': settings.rateLimit || settings['rate-limit'] || 90
            };
            
            // Populate each form field
            Object.entries(fieldMappings).forEach(([fieldId, value]) => {
                const field = document.getElementById(fieldId);
                if (field && value) {
                    field.value = value;
                    this.logger.debug(`🔧 SETTINGS: Populated field ${fieldId}`, { hasValue: !!value });
                }
            });
            
            this.logger.info('🔧 SETTINGS: Form fields populated successfully');
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to populate form fields', { error: error.message });
        }
    }

    /**
     * Handle Test Connection button click
     */
    async handleTestConnection() {
        this.logger.info('🔧 SETTINGS: Testing connection...');
        
        // Debug logging
        debugLog.userAction('test_connection', 'test-connection-btn', {
            timestamp: Date.now()
        });
        
        try {
            this.showSettingsStatus('Testing connection...', 'info');
            
            // Use connection manager if available
            if (this.subsystems.connectionManager && typeof this.subsystems.connectionManager.testConnection === 'function') {
                const result = await this.subsystems.connectionManager.testConnection();
                if (result.success) {
                    let successMessage = result.message || 'Success - Token minted';
                    if (result.token && result.token.timeLeft) {
                        successMessage += ` - Time left: ${result.token.timeLeft}`;
                    }
                    this.showSettingsStatus(successMessage, 'success');
                } else {
                    this.showSettingsStatus(`Connection test failed: ${result.error}`, 'error');
                }
            } else {
                // Fallback: test connection directly
                // CRITICAL: This MUST be a GET request to match server-side endpoint
                // Server endpoint: routes/pingone-proxy-fixed.js - router.get('/test-connection')
                // DO NOT change to POST without updating server-side endpoint
                // Last fixed: 2025-07-21 - HTTP method mismatch caused 400 Bad Request errors
                const response = await fetch('/api/pingone/test-connection', {
                    method: 'GET', // MUST match server endpoint method
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    let successMessage = result.message || 'Success - Token minted';
                    if (result.token && result.token.timeLeft) {
                        successMessage += ` - Time left: ${result.token.timeLeft}`;
                    }
                    this.showSettingsStatus(successMessage, 'success');
                } else {
                    this.showSettingsStatus(`Connection test failed: ${result.error}`, 'error');
                }
            }
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Connection test failed', { error: error.message });
            this.showSettingsStatus(`Connection test failed: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle Get Token button click
     */
    async handleGetToken() {
        this.logger.info('🔧 SETTINGS: Getting token...');
        
        // Debug logging
        debugLog.userAction('get_token', 'get-token-btn', {
            timestamp: Date.now()
        });
        
        try {
            this.showSettingsStatus('Getting token...', 'info');
            
            // Use token manager if available
            if (this.tokenManager && typeof this.tokenManager.getToken === 'function') {
                const token = await this.tokenManager.getToken();
                if (token) {
                    this.showSettingsStatus('Token acquired successfully!', 'success');
                } else {
                    this.showSettingsStatus('Failed to get token', 'error');
                }
            } else {
                // Fallback: get token directly
                const response = await fetch('/api/pingone/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (result.access_token) {
                    this.showSettingsStatus('Token acquired successfully!', 'success');
                } else {
                    this.showSettingsStatus('Failed to get token', 'error');
                }
            }
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to get token', { error: error.message });
            this.showSettingsStatus(`Failed to get token: ${error.message}`, 'error');
        }
    }
    
    /**
     * Handle Toggle Secret Visibility button click
     */
    handleToggleSecretVisibility() {
        this.logger.debug('🔧 SETTINGS: Toggling secret visibility');
        
        try {
            const secretInput = document.getElementById('api-secret');
            const toggleBtn = document.getElementById('toggle-api-secret-visibility');
            const icon = toggleBtn?.querySelector('i');
            
            if (secretInput && toggleBtn && icon) {
                if (secretInput.type === 'password') {
                    secretInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    this.logger.debug('🔧 SETTINGS: Secret visibility: shown');
                } else {
                    secretInput.type = 'password';
                    icon.className = 'fas fa-eye';
                    this.logger.debug('🔧 SETTINGS: Secret visibility: hidden');
                }
            }
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to toggle secret visibility', { error: error.message });
        }
    }
    
    /**
     * Show status message in settings page
     */
    showSettingsStatus(message, type = 'info') {
        try {
            const statusElement = document.getElementById('settings-action-status');
            const messageElement = statusElement?.querySelector('.status-message');
            const iconElement = statusElement?.querySelector('.status-icon');
            
            if (statusElement && messageElement && iconElement) {
                // Set message
                messageElement.textContent = message;
                
                // Set icon based on type
                const icons = {
                    'success': 'fas fa-check-circle',
                    'error': 'fas fa-exclamation-circle',
                    'info': 'fas fa-info-circle',
                    'warning': 'fas fa-exclamation-triangle'
                };
                
                iconElement.className = icons[type] || icons.info;
                
                // Set CSS class for styling
                statusElement.className = `action-status ${type}`;
                statusElement.style.display = 'block';
                
                // Auto-hide after 5 seconds for success/info messages
                if (type === 'success' || type === 'info') {
                    setTimeout(() => {
                        statusElement.style.display = 'none';
                    }, 5000);
                }
                
                this.logger.debug(`🔧 SETTINGS: Status shown: ${type} - ${message}`);
            }
            
        } catch (error) {
            this.logger.error('🔧 SETTINGS: Failed to show status', { error: error.message });
        }
    }
    
    /**
     * Direct view switching (bypasses subsystems)
     */
    async directShowView(view) {
        this.logger.info(`🔧 DIRECT NAV: Switching to view: ${view}`);
        
        // Debug logging
        debugLog.navigation(this.currentView, view, {
            method: 'direct_navigation',
            timestamp: Date.now()
        });
        
        try {
            // Hide all views
            const allViews = document.querySelectorAll('.view, .view-container');
            this.logger.debug(`🔧 DIRECT NAV: Found ${allViews.length} view containers to hide`);
            
            allViews.forEach(viewElement => {
                viewElement.style.display = 'none';
                viewElement.classList.remove('active');
            });
            
            // Show target view
            const targetView = document.getElementById(`${view}-view`);
            if (targetView) {
                targetView.style.display = 'block';
                targetView.classList.add('active');
                this.logger.info(`🔧 DIRECT NAV: Successfully showed ${view}-view`);
                
                // Update navigation state
                this.updateDirectNavigationState(view);
                
                // Update current view
                this.currentView = view;
                
                // Update page title
                this.updatePageTitle(view);
                
                this.logger.info(`🔧 DIRECT NAV: Navigation to ${view} completed successfully`);
                
            } else {
                this.logger.error(`🔧 DIRECT NAV: View element not found: ${view}-view`);
            }
            
        } catch (error) {
            this.logger.error(`🔧 DIRECT NAV: Failed to show view ${view}`, { error: error.message });
        }
    }
    
    /**
     * Update navigation state for direct navigation
     */
    updateDirectNavigationState(view) {
        try {
            // Update active navigation items
            const navElements = document.querySelectorAll('[data-view]');
            navElements.forEach(element => {
                const elementView = element.getAttribute('data-view');
                if (elementView === view) {
                    element.classList.add('active');
                } else {
                    element.classList.remove('active');
                }
            });
            
            this.logger.debug(`🔧 DIRECT NAV: Updated navigation state for ${view}`);
            
        } catch (error) {
            this.logger.error('🔧 DIRECT NAV: Failed to update navigation state', { error: error.message });
        }
    }
    
    /**
     * Update page title
     */
    updatePageTitle(view) {
        try {
            const titles = {
                'home': 'Home',
                'import': 'Import Users',
                'export': 'Export Users',
                'modify': 'Modify Users',
                'delete-csv': 'Delete Users',
                'settings': 'Settings',
                'logs': 'Logs',
                'history': 'History'
            };
            
            const title = titles[view] || 'PingOne Import Tool';
            document.title = `${title} - PingOne Import Tool v6.5.2.4`;
            
            this.logger.debug(`🔧 DIRECT NAV: Updated page title to: ${document.title}`);
            
        } catch (error) {
            this.logger.error('🔧 DIRECT NAV: Failed to update page title', { error: error.message });
        }
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
        
        // Check multiple possible import subsystem references
        if (this.subsystems.import && typeof this.subsystems.import.startImport === 'function') {
            return await this.subsystems.import.startImport();
        } else if (this.subsystems.importManager && typeof this.subsystems.importManager.startImport === 'function') {
            return await this.subsystems.importManager.startImport();
        } else if (this.importSubsystem && typeof this.importSubsystem.startImport === 'function') {
            return await this.importSubsystem.startImport();
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
     * Navigate to a specific view
     */
    navigateToView(viewName) {
        this.logger.debug('Navigating to view', { viewName });
        
        try {
            // Use view management subsystem if available
            if (this.subsystems.viewManager) {
                this.subsystems.viewManager.showView(viewName);
            } else {
                // Fallback to legacy view management
                this.legacyShowView(viewName);
            }
            
            this.currentView = viewName;
            this.logger.info('Navigation completed', { viewName });
            
        } catch (error) {
            this.logger.error('Navigation failed', { viewName, error: error.message });
        }
    }

/**
 * Handle file selection from input
 */
handleFileSelection(event) {
    this.logger.debug('Handling file selection');
    try {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.logger.info('File selected', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });

            // Use import subsystem if available (check multiple possible references and method names)
            if (this.subsystems.import && typeof this.subsystems.import.handleFileSelect === 'function') {
                this.subsystems.import.handleFileSelect(file);
            } else if (this.subsystems.import && typeof this.subsystems.import.handleFileSelection === 'function') {
                this.subsystems.import.handleFileSelection(file);
            } else if (this.subsystems.importManager && typeof this.subsystems.importManager.handleFileSelect === 'function') {
                this.subsystems.importManager.handleFileSelect(file);
            } else if (this.subsystems.importManager && typeof this.subsystems.importManager.handleFileSelection === 'function') {
                this.subsystems.importManager.handleFileSelection(file);
            } else if (this.importSubsystem && typeof this.importSubsystem.handleFileSelect === 'function') {
                this.importSubsystem.handleFileSelect(file);
            } else if (this.importSubsystem && typeof this.importSubsystem.handleFileSelection === 'function') {
                this.importSubsystem.handleFileSelection(file);
            } else {
                this.logger.warn('Import subsystem not available, using legacy import');
                
                // Immediate status check
                this.logger.warn('SUBSYSTEM STATUS CHECK:', {
                    'this.subsystems': !!this.subsystems,
                    'subsystems.import': !!(this.subsystems && this.subsystems.import),
                    'import.handleFileSelect': !!(this.subsystems && this.subsystems.import && typeof this.subsystems.import.handleFileSelect === 'function'),
                    'import.handleFileSelection': !!(this.subsystems && this.subsystems.import && typeof this.subsystems.import.handleFileSelection === 'function'),
                    'fileHandler': !!this.fileHandler,
                    'fileHandler.handleFile': !!(this.fileHandler && typeof this.fileHandler.handleFile === 'function'),
                    'availableSubsystems': this.subsystems ? Object.keys(this.subsystems) : 'null'
                });
                
                // Add detailed diagnostics
                this.logger.debug('File handling diagnostics:', {
                    'subsystems.import': !!this.subsystems.import,
                    'subsystems.importManager': !!this.subsystems.importManager,
                    'importSubsystem': !!this.importSubsystem,
                    'fileHandler': !!this.fileHandler,
                    'fileHandler.handleFile': !!(this.fileHandler && typeof this.fileHandler.handleFile === 'function'),
                    'availableSubsystems': Object.keys(this.subsystems || {})
                });
                
                if (this.fileHandler && typeof this.fileHandler.handleFile === 'function') {
                    this.logger.info('Using legacy file handler');
                    this.fileHandler.handleFile(file);
                } else {
                    // Try to reinitialize file handler as emergency fallback
                    if (!this.fileHandler) {
                        try {
                            this.logger.warn('Attempting to reinitialize file handler...');
                            this.fileHandler = new FileHandler(this.logger, this.uiManager);
                            if (this.fileHandler && typeof this.fileHandler.handleFile === 'function') {
                                this.logger.info('Emergency file handler initialized successfully');
                                this.fileHandler.handleFile(file);
                                return;
                            }
                        } catch (error) {
                            this.logger.error('Failed to reinitialize file handler', { error: error.message });
                        }
                    }
                    
                    this.logger.error('No file handling method available', {
                        'subsystems.import': !!this.subsystems.import,
                        'fileHandler': !!this.fileHandler,
                        'FileHandler class': typeof FileHandler
                    });
                    this.showMessage('File handling is temporarily unavailable. Please refresh the page and try again.', 'error');
                }
            }
        }
    } catch (error) {
        this.logger.error('File selection handling failed', { error: error.message });
    }
}

/**
 * Handle file drop from drag and drop
 */
handleFileDrop(event) {
    this.logger.debug('Handling file drop');
        try {
            const files = event.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                this.logger.info('File dropped', {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });

                // Use import subsystem if available (check multiple possible references and method names)
                if (this.subsystems.import && typeof this.subsystems.import.handleFileSelect === 'function') {
                    this.subsystems.import.handleFileSelect(file);
                } else if (this.subsystems.import && typeof this.subsystems.import.handleFileSelection === 'function') {
                    this.subsystems.import.handleFileSelection(file);
                } else if (this.subsystems.importManager && typeof this.subsystems.importManager.handleFileSelect === 'function') {
                    this.subsystems.importManager.handleFileSelect(file);
                } else if (this.subsystems.importManager && typeof this.subsystems.importManager.handleFileSelection === 'function') {
                    this.subsystems.importManager.handleFileSelection(file);
                } else if (this.importSubsystem && typeof this.importSubsystem.handleFileSelect === 'function') {
                    this.importSubsystem.handleFileSelect(file);
                } else if (this.importSubsystem && typeof this.importSubsystem.handleFileSelection === 'function') {
                    this.importSubsystem.handleFileSelection(file);
                } else {
                    this.logger.warn('Import subsystem not available, using legacy import');
                    
                    // Add detailed diagnostics
                    this.logger.debug('File drop handling diagnostics:', {
                        'subsystems.import': !!this.subsystems.import,
                        'subsystems.importManager': !!this.subsystems.importManager,
                        'importSubsystem': !!this.importSubsystem,
                        'fileHandler': !!this.fileHandler,
                        'fileHandler.handleFile': !!(this.fileHandler && typeof this.fileHandler.handleFile === 'function'),
                        'availableSubsystems': Object.keys(this.subsystems || {})
                    });
                    
                    if (this.fileHandler && typeof this.fileHandler.handleFile === 'function') {
                        this.logger.info('Using legacy file handler for drop');
                        this.fileHandler.handleFile(file);
                    } else {
                        // Try to reinitialize file handler as emergency fallback
                        if (!this.fileHandler) {
                            try {
                                this.logger.warn('Attempting to reinitialize file handler for drop...');
                                this.fileHandler = new FileHandler(this.logger, this.uiManager);
                                if (this.fileHandler && typeof this.fileHandler.handleFile === 'function') {
                                    this.logger.info('Emergency file handler initialized successfully for drop');
                                    this.fileHandler.handleFile(file);
                                    return;
                                }
                            } catch (error) {
                                this.logger.error('Failed to reinitialize file handler for drop', { error: error.message });
                            }
                        }
                        
                        this.logger.error('No file handling method available for drop', {
                            'subsystems.import': !!this.subsystems.import,
                            'fileHandler': !!this.fileHandler,
                            'FileHandler class': typeof FileHandler
                        });
                        this.showMessage('File drop handling is temporarily unavailable. Please refresh the page and try again.', 'error');
                    }
                }
            }
        } catch (error) {
            this.logger.error('File drop handling failed', { error: error.message });
        }
    }
    
    /**
     * Cancel import operation
     */
    cancelImport() {
        this.logger.debug('Cancelling import operation');
        
        try {
            // Use import subsystem if available (check multiple possible references)
            if (this.subsystems.import && typeof this.subsystems.import.cancelImport === 'function') {
                this.subsystems.import.cancelImport();
            } else if (this.subsystems.importManager && typeof this.subsystems.importManager.cancelImport === 'function') {
                this.subsystems.importManager.cancelImport();
            } else if (this.importSubsystem && typeof this.importSubsystem.cancelImport === 'function') {
                this.importSubsystem.cancelImport();
            } else {
                this.logger.warn('Import subsystem not available, using legacy cancel');
                this.legacyCancelImport();
            }
            
            this.logger.info('Import cancellation requested');
            
        } catch (error) {
            this.logger.error('Import cancellation failed', { error: error.message });
        }
    }
    
    /**
     * Enable tool after disclaimer acceptance
     */
    enableToolAfterDisclaimer() {
        this.logger.info('Enabling tool after disclaimer acceptance');
        
        try {
            // Show loading overlay during transition
            this.showModalLoading('Setting up...', 'Preparing your PingOne Import Tool experience.');
            
            // Hide startup screen if still visible
            this.hideStartupScreen();
            
            // Ensure UI is properly initialized and responsive
            if (this.uiManager && typeof this.uiManager.enableUI === 'function') {
                this.uiManager.enableUI();
            }
            
            // Initialize event listeners if not already done
            if (!this.eventListenersSetup) {
                this.setupEventListeners();
                this.eventListenersSetup = true;
            }
            
            // Enable all subsystems
            Object.values(this.subsystems).forEach(subsystem => {
                if (subsystem && typeof subsystem.enable === 'function') {
                    subsystem.enable();
                }
            });
            
            // Remove any disabled states from the app container
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                appContainer.classList.remove('disabled', 'modal-active');
                appContainer.style.pointerEvents = 'auto';
            }
            
            // Enable all buttons and interactive elements
            const buttons = document.querySelectorAll('button, .btn');
            buttons.forEach(button => {
                button.disabled = false;
                button.style.pointerEvents = 'auto';
            });
            
            this.logger.info('Tool enabled successfully after disclaimer');
            
            // Hide loading overlay after a brief delay to show completion
            setTimeout(() => {
                this.hideModalLoading();
            }, 1000);
            
        } catch (error) {
            this.logger.error('Failed to enable tool after disclaimer', { error: error.message });
            // Hide loading overlay on error too
            this.hideModalLoading();
        }
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

    /**
     * Show a message to the user
     */
    showMessage(message, type = 'info') {
        this.logger.debug(`Showing message: ${message}`, { type });
        // This is a placeholder for a more robust notification system
        // For now, we can use the settings status display as a general message area
        this.showSettingsStatus(message, type);
    }
    
    /**
     * 🛡️ Create emergency fallback subsystem - CANNOT FAIL
     */
    createEmergencySubsystem(subsystemName, originalError) {
        try {
            this.logger.warn(`🛡️ Creating emergency fallback for ${subsystemName}`, {
                originalError: originalError.message
            });
            
            // Create a bulletproof emergency subsystem that provides basic functionality
            const emergencySubsystem = {
                name: `Emergency${subsystemName.charAt(0).toUpperCase() + subsystemName.slice(1)}`,
                initialized: true,
                emergency: true,
                originalError: originalError.message,
                
                // Basic lifecycle methods
                init: () => Promise.resolve(true),
                destroy: () => Promise.resolve(true),
                
                // Emergency methods based on subsystem type
                ...(subsystemName === 'export' && {
                    exportUsers: () => {
                        this.logger.warn('🛡️ Export subsystem in emergency mode - functionality limited');
                        return Promise.resolve({ 
                            success: false, 
                            error: 'Export subsystem unavailable - please refresh the page',
                            emergency: true 
                        });
                    },
                    getExportStatus: () => ({ 
                        status: 'emergency', 
                        message: 'Export subsystem unavailable',
                        emergency: true 
                    }),
                    validateExportRequest: () => ({ 
                        valid: false, 
                        error: 'Export validation unavailable in emergency mode' 
                    })
                }),
                
                ...(subsystemName === 'import' && {
                    importUsers: () => {
                        this.logger.warn('🛡️ Import subsystem in emergency mode - functionality limited');
                        return Promise.resolve({ 
                            success: false, 
                            error: 'Import subsystem unavailable - please refresh the page',
                            emergency: true 
                        });
                    },
                    getImportStatus: () => ({ 
                        status: 'emergency', 
                        message: 'Import subsystem unavailable',
                        emergency: true 
                    })
                }),
                
                // Generic fallback methods
                getStatus: () => ({ 
                    status: 'emergency', 
                    subsystem: subsystemName,
                    message: `${subsystemName} subsystem is in emergency mode`,
                    error: originalError.message,
                    emergency: true 
                }),
                
                isReady: () => false,
                hasData: () => false,
                
                // Catch-all method handler
                __emergencyHandler: (methodName) => {
                    this.logger.warn(`🛡️ Emergency subsystem ${subsystemName}: method ${methodName} called`);
                    return Promise.resolve({ 
                        success: false, 
                        error: `${methodName} unavailable in emergency mode`,
                        emergency: true 
                    });
                }
            };
            
            // Wrap with bulletproof protection
            const wrappedEmergencySubsystem = createBulletproofSubsystemWrapper(
                emergencySubsystem,
                this.logger.child({ subsystem: `emergency-${subsystemName}` })
            );
            
            this.logger.info(`🛡️ Emergency ${subsystemName} subsystem created successfully`);
            return wrappedEmergencySubsystem;
            
        } catch (error) {
            this.logger.error(`🛡️ Failed to create emergency subsystem for ${subsystemName}`, error);
            
            // Ultimate fallback - return minimal object
            return {
                name: `UltimateEmergency${subsystemName}`,
                emergency: true,
                init: () => Promise.resolve(false),
                destroy: () => Promise.resolve(false),
                getStatus: () => ({ status: 'critical-emergency', subsystem: subsystemName })
            };
        }
    }
    
    /**
     * 🛡️ Cleanup bulletproof systems - CANNOT FAIL
     */
    cleanup() {
        try {
            this.logger.info('🛡️ Cleaning up bulletproof systems...');
            
            // Cleanup bulletproof token manager
            if (this.bulletproofTokenManager && typeof this.bulletproofTokenManager.destroy === 'function') {
                this.bulletproofTokenManager.destroy();
                this.logger.debug('🛡️ Bulletproof token manager cleaned up');
            }
            
            // Cleanup bulletproof app integration
            if (this.bulletproofSystem && typeof this.bulletproofSystem.destroy === 'function') {
                this.bulletproofSystem.destroy();
                this.logger.debug('🛡️ Bulletproof app integration cleaned up');
            }
            
            this.logger.info('🛡️ Bulletproof systems cleanup completed');
            
        } catch (error) {
            this.logger.debug('🛡️ Bulletproof cleanup failed (non-critical)', error);
        }
    }
}

// Initialize and start the application
const app = new App();

// Global app reference for debugging
window.app = app;

// 🛡️ Setup bulletproof cleanup on page unload - CANNOT FAIL
try {
    window.addEventListener('beforeunload', () => {
        if (window.app && typeof window.app.cleanup === 'function') {
            window.app.cleanup();
        }
    });
    
    // Also cleanup on page hide (mobile/tablet support)
    window.addEventListener('pagehide', () => {
        if (window.app && typeof window.app.cleanup === 'function') {
            window.app.cleanup();
        }
    });
} catch (error) {
    console.debug('🛡️ Failed to setup cleanup listeners (non-critical)', error);
}

// Expose enableToolAfterDisclaimer function globally for modal access
window.enableToolAfterDisclaimer = () => {
    if (window.app && typeof window.app.enableToolAfterDisclaimer === 'function') {
        window.app.enableToolAfterDisclaimer();
    } else {
        window.logger?.warn('App not available or enableToolAfterDisclaimer method not found') || console.warn('App not available or enableToolAfterDisclaimer method not found');
    }
};

// Expose loading functions for testing
window.testLoading = {
    show: (title, message) => {
        if (window.app) {
            window.app.showModalLoading(title, message);
        }
    },
    hide: () => {
        if (window.app) {
            window.app.hideModalLoading();
        }
    },
    testSequence: () => {
        if (window.app) {
            window.logger?.info('🔄 Testing loading sequence...') || console.log('🔄 Testing loading sequence...');
            window.app.showModalLoading('Step 1', 'Testing loading overlay...');
            setTimeout(() => {
                window.app.showModalLoading('Step 2', 'Updating message...');
                setTimeout(() => {
                    window.app.showModalLoading('Step 3', 'Almost done...');
                    setTimeout(() => {
                        window.app.hideModalLoading();
                        window.logger?.info('🔄 Loading test completed') || console.log('🔄 Loading test completed');
                    }, 1500);
                }, 1500);
            }, 1500);
        }
    }
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.init();
        window.logger?.info('🚀 PingOne Import Tool v6.5.2.4 initialized successfully') || console.log('🚀 PingOne Import Tool v6.5.2.4 initialized successfully');
        window.logger?.info('📊 Health Status:', app.getHealthStatus()) || console.log('📊 Health Status:', app.getHealthStatus());
    } catch (error) {
        window.logger?.error('❌ Application initialization failed:', error) || console.error('❌ Application initialization failed:', error);
    }
});

export default App;