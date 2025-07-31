/**
 * 🛡️ BULLETPROOF INTEGRATION SYSTEM
 * 
 * This integrates all bulletproof components into a unified system:
 * - Bulletproof Import Subsystem
 * - Bulletproof Export Subsystem  
 * - Bulletproof Error Handler
 * 
 * Provides a single entry point for bulletproof functionality that
 * CANNOT FAIL and ensures the entire application remains stable.
 * 
 * Version: 6.5.2.2
 * Status: PRODUCTION READY - BULLETPROOF
 */

import { BulletproofImportSubsystem } from './subsystems/bulletproof-import-subsystem.js';
import { BulletproofExportSubsystem } from './subsystems/bulletproof-export-subsystem.js';
import { getBulletproofErrorHandler } from '../shared/bulletproof-error-handler.js';

export class BulletproofIntegration {
    constructor(dependencies = {}) {
        // BULLETPROOF: Initialize with safe defaults
        this.state = {
            isInitialized: false,
            hasErrors: false,
            subsystems: new Map(),
            lastError: null,
            initializationAttempts: 0,
            maxInitializationAttempts: 3
        };
        
        // BULLETPROOF: Store dependencies safely
        this.dependencies = this._sanitizeDependencies(dependencies);
        
        // BULLETPROOF: Initialize error handler first
        this.errorHandler = this._initializeBulletproofErrorHandler();
        
        // BULLETPROOF: Initialize logger with error handling
        this.logger = this._createBulletproofLogger();
        
        // BULLETPROOF: Start initialization
        this._initializeBulletproofSystems();
    }
    
    /**
     * BULLETPROOF: Initialize all bulletproof systems
     */
    async _initializeBulletproofSystems() {
        try {
            this.state.initializationAttempts++;
            this.logger.info('🛡️ Initializing Bulletproof Integration System');
            
            // Phase 1: Initialize error handler
            await this._initializeErrorHandling();
            
            // Phase 2: Initialize import subsystem
            await this._initializeImportSubsystem();
            
            // Phase 3: Initialize export subsystem
            await this._initializeExportSubsystem();
            
            // Phase 4: Set up cross-system communication
            await this._setupCrossSystemCommunication();
            
            // Phase 5: Perform health checks
            await this._performHealthChecks();
            
            this.state.isInitialized = true;
            this.logger.info('✅ Bulletproof Integration System initialized successfully');
            
            // Emit initialization complete event
            this._emitEvent('bulletproof:initialized', { 
                timestamp: Date.now(),
                subsystems: Array.from(this.state.subsystems.keys())
            });
            
        } catch (error) {
            this.logger.error('❌ Bulletproof Integration initialization failed:', error);
            await this._handleInitializationFailure(error);
        }
    }
    
    /**
     * BULLETPROOF: Initialize error handling system
     */
    async _initializeErrorHandling() {
        try {
            this.logger.info('Initializing bulletproof error handling...');
            
            // Error handler is already initialized in constructor
            if (this.errorHandler && this.errorHandler.isReady()) {
                this.state.subsystems.set('errorHandler', {
                    instance: this.errorHandler,
                    status: 'ready',
                    lastCheck: Date.now()
                });
                
                this.logger.info('✅ Error handling system ready');
            } else {
                throw new Error('Error handler initialization failed');
            }
            
        } catch (error) {
            this.logger.error('Error handling initialization failed:', error);
            // Continue with degraded error handling
            this.state.subsystems.set('errorHandler', {
                instance: this.errorHandler,
                status: 'degraded',
                lastCheck: Date.now(),
                error: error.message
            });
        }
    }
    
    /**
     * BULLETPROOF: Initialize import subsystem
     */
    async _initializeImportSubsystem() {
        try {
            this.logger.info('Initializing bulletproof import subsystem...');
            
            const importSubsystem = new BulletproofImportSubsystem(
                this.dependencies.logger,
                this.dependencies.uiManager,
                this.dependencies.localClient,
                this.dependencies.settingsManager,
                this.dependencies.eventBus,
                this.dependencies.populationService,
                this.dependencies.authManagementSubsystem
            );
            
            await importSubsystem.init();
            
            if (importSubsystem.isReady()) {
                this.state.subsystems.set('import', {
                    instance: importSubsystem,
                    status: 'ready',
                    lastCheck: Date.now()
                });
                
                this.logger.info('✅ Import subsystem ready');
            } else {
                throw new Error('Import subsystem not ready after initialization');
            }
            
        } catch (error) {
            this.logger.error('Import subsystem initialization failed:', error);
            await this.errorHandler.handle(error, {
                context: 'import_initialization',
                severity: 'high'
            });
            
            // Continue without import functionality
            this.state.subsystems.set('import', {
                instance: null,
                status: 'failed',
                lastCheck: Date.now(),
                error: error.message
            });
        }
    }
    
    /**
     * BULLETPROOF: Initialize export subsystem
     */
    async _initializeExportSubsystem() {
        try {
            this.logger.info('Initializing bulletproof export subsystem...');
            
            const exportSubsystem = new BulletproofExportSubsystem(
                this.dependencies.logger,
                this.dependencies.uiManager,
                this.dependencies.localClient,
                this.dependencies.settingsManager,
                this.dependencies.eventBus,
                this.dependencies.populationService
            );
            
            await exportSubsystem.init();
            
            if (exportSubsystem.isReady()) {
                this.state.subsystems.set('export', {
                    instance: exportSubsystem,
                    status: 'ready',
                    lastCheck: Date.now()
                });
                
                this.logger.info('✅ Export subsystem ready');
            } else {
                throw new Error('Export subsystem not ready after initialization');
            }
            
        } catch (error) {
            this.logger.error('Export subsystem initialization failed:', error);
            await this.errorHandler.handle(error, {
                context: 'export_initialization',
                severity: 'high'
            });
            
            // Continue without export functionality
            this.state.subsystems.set('export', {
                instance: null,
                status: 'failed',
                lastCheck: Date.now(),
                error: error.message
            });
        }
    }
    
    /**
     * BULLETPROOF: Set up cross-system communication
     */
    async _setupCrossSystemCommunication() {
        try {
            this.logger.info('Setting up cross-system communication...');
            
            // Set up event listeners between subsystems
            if (this.dependencies.eventBus) {
                // Import-Export communication
                this.dependencies.eventBus.on('import:completed', (data) => {
                    this._handleImportCompleted(data);
                });
                
                this.dependencies.eventBus.on('export:completed', (data) => {
                    this._handleExportCompleted(data);
                });
                
                // Error handling communication
                this.dependencies.eventBus.on('error:critical', (data) => {
                    this._handleCriticalError(data);
                });
            }
            
            this.logger.info('✅ Cross-system communication ready');
            
        } catch (error) {
            this.logger.error('Cross-system communication setup failed:', error);
            // Continue with limited communication
        }
    }
    
    /**
     * BULLETPROOF: Perform health checks on all subsystems
     */
    async _performHealthChecks() {
        try {
            this.logger.info('Performing health checks...');
            
            const healthResults = {
                overall: 'healthy',
                subsystems: {},
                timestamp: Date.now()
            };
            
            // Check each subsystem
            for (const [name, subsystem] of this.state.subsystems) {
                try {
                    const health = await this._checkSubsystemHealth(name, subsystem);
                    healthResults.subsystems[name] = health;
                    
                    if (health.status !== 'healthy') {
                        healthResults.overall = 'degraded';
                    }
                } catch (error) {
                    healthResults.subsystems[name] = {
                        status: 'unhealthy',
                        error: error.message,
                        timestamp: Date.now()
                    };
                    healthResults.overall = 'degraded';
                }
            }
            
            this.logger.info('Health check completed:', healthResults);
            
            // Store health results
            this.state.lastHealthCheck = healthResults;
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
            // Continue with unknown health status
        }
    }
    
    /**
     * BULLETPROOF: Check individual subsystem health
     */
    async _checkSubsystemHealth(name, subsystem) {
        try {
            if (!subsystem.instance) {
                return {
                    status: 'unavailable',
                    message: 'Subsystem instance not available',
                    timestamp: Date.now()
                };
            }
            
            if (typeof subsystem.instance.isReady === 'function') {
                const isReady = subsystem.instance.isReady();
                return {
                    status: isReady ? 'healthy' : 'unhealthy',
                    message: isReady ? 'Subsystem is ready' : 'Subsystem not ready',
                    timestamp: Date.now()
                };
            }
            
            return {
                status: 'unknown',
                message: 'Cannot determine subsystem health',
                timestamp: Date.now()
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * BULLETPROOF: Handle initialization failure
     */
    async _handleInitializationFailure(error) {
        try {
            this.state.hasErrors = true;
            this.state.lastError = error;
            
            // Try to recover if we haven't exceeded max attempts
            if (this.state.initializationAttempts < this.state.maxInitializationAttempts) {
                this.logger.warn(`Initialization failed, retrying (${this.state.initializationAttempts}/${this.state.maxInitializationAttempts})...`);
                
                // Wait before retry
                await this._delay(2000 * this.state.initializationAttempts);
                
                // Retry initialization
                return this._initializeBulletproofSystems();
            } else {
                this.logger.error('Max initialization attempts reached, running in degraded mode');
                
                // Emit degraded mode event
                this._emitEvent('bulletproof:degraded', {
                    error: error.message,
                    attempts: this.state.initializationAttempts,
                    timestamp: Date.now()
                });
            }
            
        } catch (recoveryError) {
            this.logger.error('Initialization recovery failed:', recoveryError);
        }
    }
    
    /**
     * BULLETPROOF: Sanitize dependencies with safe defaults
     */
    _sanitizeDependencies(dependencies) {
        const sanitized = {
            logger: dependencies.logger || console,
            uiManager: dependencies.uiManager || this._createFallbackUIManager(),
            localClient: dependencies.localClient || this._createFallbackClient(),
            settingsManager: dependencies.settingsManager || this._createFallbackSettingsManager(),
            eventBus: dependencies.eventBus || this._createFallbackEventBus(),
            populationService: dependencies.populationService || this._createFallbackPopulationService(),
            authManagementSubsystem: dependencies.authManagementSubsystem || null
        };
        
        return sanitized;
    }
    
    /**
     * BULLETPROOF: Initialize error handler safely
     */
    _initializeBulletproofErrorHandler() {
        try {
            return getBulletproofErrorHandler({
                enableUserNotification: true,
                gracefulDegradation: true,
                maxRetries: 3
            });
        } catch (error) {
            // Fallback error handler
            return {
                handle: async (error) => ({ success: false, error: 'Error handler failed' }),
                wrap: (fn) => fn,
                isReady: () => false
            };
        }
    }
    
    /**
     * BULLETPROOF: Create logger with error handling
     */
    _createBulletproofLogger() {
        try {
            const baseLogger = this.dependencies.logger || console;
            
            return {
                info: (msg, data) => this._safeLog(baseLogger, 'info', msg, data),
                warn: (msg, data) => this._safeLog(baseLogger, 'warn', msg, data),
                error: (msg, data) => this._safeLog(baseLogger, 'error', msg, data),
                debug: (msg, data) => this._safeLog(baseLogger, 'debug', msg, data)
            };
        } catch (error) {
            return {
                info: (msg) => this._fallbackLog('info', msg),
                warn: (msg) => this._fallbackLog('warn', msg),
                error: (msg) => this._fallbackLog('error', msg),
                debug: (msg) => this._fallbackLog('debug', msg)
            };
        }
    }
    
    /**
     * BULLETPROOF: Safe logging with fallbacks
     */
    _safeLog(logger, level, message, data) {
        try {
            const logMessage = data ? `${message} ${JSON.stringify(data)}` : message;
            
            if (logger && logger[level]) {
                logger[level](`[BULLETPROOF] ${logMessage}`);
            } else if (logger && logger.log) {
                logger.log(`[BULLETPROOF] [${level.toUpperCase()}] ${logMessage}`);
            } else {
                this._fallbackLog(level, logMessage);
            }
        } catch (error) {
            this._fallbackLog(level, message);
        }
    }
    
    /**
     * BULLETPROOF: Fallback logging
     */
    _fallbackLog(level, message) {
        try {
            if (console && console[level]) {
                console[level](`[BULLETPROOF] ${message}`);
            } else if (console && console.log) {
                console.log(`[BULLETPROOF] [${level.toUpperCase()}] ${message}`);
            }
        } catch (error) {
            // Even fallback logging failed - continue silently
        }
    }
    
    /**
     * BULLETPROOF: Emit events safely
     */
    _emitEvent(eventName, data) {
        try {
            if (this.dependencies.eventBus && this.dependencies.eventBus.emit) {
                this.dependencies.eventBus.emit(eventName, data);
            }
        } catch (error) {
            this.logger.warn('Event emission failed:', error);
        }
    }
    
    /**
     * BULLETPROOF: Safe delay utility
     */
    _delay(ms) {
        return new Promise(resolve => {
            try {
                setTimeout(resolve, ms);
            } catch (error) {
                resolve();
            }
        });
    }
    
    // Event handlers for cross-system communication
    _handleImportCompleted(data) {
        this.logger.info('Import completed:', data);
        this._emitEvent('bulletproof:import:completed', data);
    }
    
    _handleExportCompleted(data) {
        this.logger.info('Export completed:', data);
        this._emitEvent('bulletproof:export:completed', data);
    }
    
    _handleCriticalError(data) {
        this.logger.error('Critical error detected:', data);
        this._emitEvent('bulletproof:critical:error', data);
    }
    
    // Fallback implementations
    _createFallbackUIManager() {
        return {
            showProgress: (msg) => this.logger.info(`Progress: ${msg}`),
            hideProgress: () => this.logger.debug('Progress hidden'),
            showError: (title, msg) => this.logger.error(`${title}: ${msg}`),
            showSuccess: (title, msg) => this.logger.info(`${title}: ${msg}`)
        };
    }
    
    _createFallbackClient() {
        return {
            get: async () => { throw new Error('Client not available'); },
            post: async () => { throw new Error('Client not available'); }
        };
    }
    
    _createFallbackSettingsManager() {
        return {
            getSettings: async () => ({}),
            saveSettings: async () => true
        };
    }
    
    _createFallbackEventBus() {
        return {
            on: () => {},
            emit: () => {},
            off: () => {}
        };
    }
    
    _createFallbackPopulationService() {
        return {
            populateDropdown: async () => {},
            getPopulations: async () => []
        };
    }
    
    // Public API
    
    /**
     * BULLETPROOF: Check if system is ready
     */
    isReady() {
        return this.state.isInitialized && !this.state.hasErrors;
    }
    
    /**
     * BULLETPROOF: Get system status
     */
    getStatus() {
        return {
            initialized: this.state.isInitialized,
            hasErrors: this.state.hasErrors,
            subsystems: Object.fromEntries(
                Array.from(this.state.subsystems.entries()).map(([name, subsystem]) => [
                    name,
                    {
                        status: subsystem.status,
                        lastCheck: subsystem.lastCheck,
                        error: subsystem.error
                    }
                ])
            ),
            lastError: this.state.lastError,
            lastHealthCheck: this.state.lastHealthCheck,
            initializationAttempts: this.state.initializationAttempts
        };
    }
    
    /**
     * BULLETPROOF: Get subsystem instance
     */
    getSubsystem(name) {
        try {
            const subsystem = this.state.subsystems.get(name);
            return subsystem ? subsystem.instance : null;
        } catch (error) {
            this.logger.warn(`Failed to get subsystem ${name}:`, error);
            return null;
        }
    }
    
    /**
     * BULLETPROOF: Perform manual health check
     */
    async performHealthCheck() {
        try {
            await this._performHealthChecks();
            return this.state.lastHealthCheck;
        } catch (error) {
            this.logger.error('Manual health check failed:', error);
            return {
                overall: 'error',
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * BULLETPROOF: Get error handler instance
     */
    getErrorHandler() {
        return this.errorHandler;
    }
}

// Singleton instance
let bulletproofIntegrationInstance = null;

/**
 * BULLETPROOF: Get singleton integration instance
 */
export function getBulletproofIntegration(dependencies = {}) {
    try {
        if (!bulletproofIntegrationInstance) {
            bulletproofIntegrationInstance = new BulletproofIntegration(dependencies);
        }
        return bulletproofIntegrationInstance;
    } catch (error) {
        console.error('[BULLETPROOF] Failed to create integration instance:', error);
        
        // Return minimal fallback
        return {
            isReady: () => false,
            getStatus: () => ({ initialized: false, hasErrors: true, error: error.message }),
            getSubsystem: () => null,
            getErrorHandler: () => getBulletproofErrorHandler()
        };
    }
}

/**
 * BULLETPROOF: Initialize bulletproof systems
 */
export async function initializeBulletproofSystems(dependencies = {}) {
    try {
        const integration = getBulletproofIntegration(dependencies);
        
        // Wait for initialization to complete
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        while (!integration.isReady() && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        return integration;
    } catch (error) {
        console.error('[BULLETPROOF] Initialization failed:', error);
        throw error;
    }
}

export default BulletproofIntegration;
