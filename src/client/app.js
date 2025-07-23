import { Logger } from './utils/logger.js';
import { UIManager } from './components/ui-manager.js';
import LocalApiClient from './utils/local-api-client.js'; // Assuming path
import SettingsSubsystem from './subsystems/settings-subsystem.js';
import { EventBus } from './utils/event-bus.js';
import CredentialManager from './components/credentials-manager.js';
import SettingsManager from './components/settings-manager.js';
import PingOneClient from './utils/pingone-client.js'; // Assuming path
import { ConnectionManagerSubsystem } from './subsystems/connection-manager-subsystem.js';
import { AuthManagementSubsystem } from './subsystems/auth-management-subsystem.js';
import { AdvancedRealtimeSubsystem } from './subsystems/advanced-realtime-subsystem.js';
import { ViewManagementSubsystem } from './subsystems/view-management-subsystem.js';
import { OperationManagerSubsystem } from './subsystems/operation-manager-subsystem.js';
import { PopulationSubsystem } from './subsystems/population-subsystem.js';
import { HistorySubsystem } from './subsystems/history-subsystem.js';
import { ImportSubsystem } from './subsystems/import-subsystem.js';
import { NavigationSubsystem } from './subsystems/navigation-subsystem.js';
import { RealtimeCommunicationSubsystem } from './subsystems/realtime-communication-subsystem.js';

class App {
    constructor() {
        this.version = 'loading...'; // Will be loaded dynamically from server
        this.logger = new Logger('pingone-import-app', 'dezh8e30');
        this.eventBus = new EventBus(this.logger.child({ component: 'event-bus' }));
        this.uiManager = new UIManager(this.logger.child({ component: 'ui-manager' }));
        this.localClient = new LocalApiClient('/api/v1', this.logger.child({ component: 'local-api-client' }));

        this.subsystems = {};

        window.app = this; // For debugging
    }

    async init() {
        this.logger.info('Initializing application...');
        this.uiManager.showStartupWaitScreen('Initializing application...');

        try {
            // Load version first
            await this.loadVersion();
            
            await this.initializeCoreComponents();
            await this.initializeSubsystems();
                        // No longer needed, handled by NavigationSubsystem
            // this.setupEventListeners();

            this.logger.info('Application initialized successfully.');
            this.uiManager.hideStartupWaitScreen();
        } catch (error) {
            this.logger.error('Application initialization failed:', { error: error.message, stack: error.stack });
            this.uiManager.showError('Application failed to start. Please check the console for details.');
        }
    }

    /**
     * Load application version from server
     */
    async loadVersion() {
        try {
            this.uiManager.updateStartupMessage('Loading version information...');
            const response = await fetch('/api/version');
            if (response.ok) {
                const versionData = await response.json();
                this.version = versionData.version;
                this.logger.info('Version loaded from server:', { version: this.version });
                
                // Update version display immediately
                this.updateVersionDisplay();
            } else {
                throw new Error(`Failed to load version: ${response.status}`);
            }
        } catch (error) {
            this.logger.warn('Failed to load version from server, using fallback:', { error: error.message });
            this.version = '6.5.1.3'; // Fallback version
            this.updateVersionDisplay();
        }
    }

    /**
     * Update version display in UI
     */
    updateVersionDisplay() {
        try {
            // Update version widget
            const versionDisplay = document.getElementById('version-display');
            if (versionDisplay) {
                versionDisplay.textContent = `v${this.version}`;
            }
            
            // Update page title
            document.title = `PingOne User Import v${this.version}`;
            
            this.logger.debug('Version display updated:', { version: this.version });
        } catch (error) {
            this.logger.error('Failed to update version display:', { error: error.message });
        }
    }

    async initializeCoreComponents() {
        this.logger.debug('Initializing core components');
        this.uiManager.setupUI();

        this.settingsManager = new SettingsManager(this.logger.child({ component: 'settings-manager' }));
        await this.settingsManager.init();
        this.logger.debug('Settings manager initialized');

        this.settingsSubsystem = new SettingsSubsystem(
            this.logger.child({ subsystem: 'settings' }),
            this.uiManager,
            this.localClient,
            this.settingsManager,
            this.eventBus
        );
        await this.settingsSubsystem.init();
        this.logger.debug('Settings subsystem initialized as a core component');

        this.pingoneClient = new PingOneClient(this.localClient, this.logger.child({ component: 'pingone-client' }));
        this.logger.debug('PingOne client created successfully');

        this.realtimeComm = new RealtimeCommunicationSubsystem(this.logger.child({ subsystem: 'realtime-comm' }), this.uiManager);
        this.logger.debug('Realtime communication subsystem initialized as a core component');

        this.logger.debug('Core components initialized');
    }

    async initializeSubsystems() {
        this.logger.info('Initializing subsystems...');
        this.uiManager.updateStartupMessage('Initializing subsystems...');

        // Ensure NavigationSubsystem gets the correct app reference and settingsManager is initialized
        const subsystemConfigs = [
            { name: 'navigationSubsystem', constructor: NavigationSubsystem, deps: [this.logger.child({ subsystem: 'navigation' }), this.uiManager, this.settingsManager, this] },
            { name: 'connectionManager', constructor: ConnectionManagerSubsystem, deps: [this.logger.child({ subsystem: 'connection' }), this.eventBus, this.uiManager, this.localClient] },
            { name: 'realtimeManager', constructor: AdvancedRealtimeSubsystem, deps: [this.logger.child({ subsystem: 'realtime' }), this.eventBus, this.realtimeComm, this.subsystems.settingsSubsystem, this.subsystems.operationManager] },
            { name: 'authManager', constructor: AuthManagementSubsystem, deps: [this.logger.child({ subsystem: 'auth' }), this.pingoneClient, this.eventBus, this.uiManager, this.localClient] },
            { name: 'viewManager', constructor: ViewManagementSubsystem, deps: [this.logger.child({ subsystem: 'view' }), this.uiManager, this.eventBus] },
            { name: 'operationManager', constructor: OperationManagerSubsystem, deps: [this.logger.child({ subsystem: 'operation' }), this.eventBus, this.uiManager] },
            { name: 'populationSubsystem', constructor: PopulationSubsystem, deps: [this.logger.child({ subsystem: 'population' }), this.uiManager, this.localClient, this.eventBus] },
            { name: 'historySubsystem', constructor: HistorySubsystem, deps: [this.logger.child({ subsystem: 'history' }), this.localClient, this.uiManager, this.eventBus] },
            { name: 'importSubsystem', constructor: ImportSubsystem, deps: [this.logger.child({ subsystem: 'import' }), this.uiManager, this.localClient, this.eventBus, () => this.subsystems.authManager] },
        ];

        for (const config of subsystemConfigs) {
            try {
                this.logger.debug(`Initializing ${config.name} subsystem...`);
                const resolvedDeps = config.deps.map(dep => (typeof dep === 'function' ? dep() : dep));
                this.subsystems[config.name] = new config.constructor(...resolvedDeps);
                if (typeof this.subsystems[config.name].init === 'function') {
                    await this.subsystems[config.name].init();
                }
            } catch (error) {
                this.logger.error(`Failed to initialize subsystem: ${config.name}`, { error: error.message, stack: error.stack });
                throw new Error(`Subsystem initialization failed for ${config.name}`);
            }
        }

        this.logger.info('All subsystems initialized successfully.');
    }

    setupEventListeners() {
        this.logger.debug('Setting up global event listeners');

        // Centralized error handling
        window.addEventListener('error', (event) => {
            this.logger.error('Unhandled global error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? event.error.stack : 'N/A'
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logger.warn('Unhandled promise rejection:', {
                reason: event.reason ? event.reason.stack : 'N/A'
            });
        });

        this.logger.debug('Global event listeners set up');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init().catch(err => {
        console.error('FATAL: Application failed to initialize.', err);
        // Display a fatal error message to the user if UI is available
        if (app.uiManager) {
            app.uiManager.showError('A fatal error occurred during startup. The application cannot continue.');
        }
    });
});
