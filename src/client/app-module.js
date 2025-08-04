/**
 * PingOne Import Tool - Module Entry Point
 * Version: 7.0.0.20
 * 
 * This is the main entry point for the application when using import maps.
 * It imports and initializes all necessary modules in the correct order.
 */

// Core imports
import { Logger } from './utils/logger.js';
import { EventBus } from './utils/event-bus.js';
import { UIManager } from './components/ui-manager.js';
import { ErrorHandler } from './utils/error-handler.js';

// Subsystems
import { EnhancedTokenStatusSubsystem } from './subsystems/enhanced-token-status-subsystem.js';
import { SettingsSubsystem } from './subsystems/settings-subsystem.js';
import { ImportSubsystem } from './subsystems/import-subsystem.js';
import { ExportSubsystem } from './subsystems/export-subsystem.js';
import { PopulationSubsystem } from './subsystems/population-subsystem.js';
import { NotificationSubsystem } from './subsystems/notification-subsystem.js';

// Initialize logger
const logger = new Logger({
    appName: 'PingOne Import Tool',
    version: '7.0.0.20',
    useConsole: true,
    useServer: true
});

// Application state
const appState = {
    initialized: false,
    subsystems: {},
    settings: {},
    ui: null,
    eventBus: null,
    errorHandler: null
};

/**
 * Initialize the application
 */
async function initializeApp() {
    logger.info('🚀 Initializing PingOne Import Tool v7.0.0.19 (Import Maps Mode)');
    
    try {
        // Initialize core systems
        appState.eventBus = new EventBus();
        appState.errorHandler = new ErrorHandler({ logger });
        
        // Initialize UI
        appState.ui = new UIManager({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler
        });
        
        // Initialize subsystems
        appState.subsystems.settings = new SettingsSubsystem({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler
        });
        
        appState.subsystems.tokenStatus = new EnhancedTokenStatusSubsystem({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler,
            settings: appState.subsystems.settings
        });
        
        appState.subsystems.notifications = new NotificationSubsystem({
            logger,
            eventBus: appState.eventBus
        });
        
        appState.subsystems.populations = new PopulationSubsystem({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler,
            settings: appState.subsystems.settings,
            tokenStatus: appState.subsystems.tokenStatus
        });
        
        appState.subsystems.import = new ImportSubsystem({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler,
            settings: appState.subsystems.settings,
            tokenStatus: appState.subsystems.tokenStatus,
            populations: appState.subsystems.populations,
            notifications: appState.subsystems.notifications
        });
        
        appState.subsystems.export = new ExportSubsystem({
            logger,
            eventBus: appState.eventBus,
            errorHandler: appState.errorHandler,
            settings: appState.subsystems.settings,
            tokenStatus: appState.subsystems.tokenStatus,
            populations: appState.subsystems.populations,
            notifications: appState.subsystems.notifications
        });
        
        // Initialize all subsystems
        await Promise.all(Object.values(appState.subsystems).map(subsystem => {
            return subsystem.initialize ? subsystem.initialize() : Promise.resolve();
        }));
        
        // Setup global error handling
        window.addEventListener('error', (event) => {
            appState.errorHandler.handleError(event.error || new Error(event.message));
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            appState.errorHandler.handleError(event.reason || new Error('Unhandled Promise rejection'));
        });
        
        // Mark as initialized
        appState.initialized = true;
        logger.info('✅ PingOne Import Tool initialized successfully');
        
        // Publish initialization complete event
        appState.eventBus.publish('app:initialized', { timestamp: Date.now() });
        
    } catch (error) {
        logger.error('❌ Failed to initialize application', error);
        appState.errorHandler?.handleError(error);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Expose global API
window.PingOneImport = {
    version: '7.0.0.19',
    getState: () => ({ ...appState }),
    getSubsystem: (name) => appState.subsystems[name] || null,
    logger,
    eventBus: appState.eventBus
};

// Export for module usage
export {
    appState,
    logger,
    initializeApp
};
