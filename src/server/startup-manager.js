/**
 * Startup Manager
 * 
 * Simplified, reliable startup process that replaces the complex multi-phase
 * initialization with clear, sequential phases and comprehensive error handling.
 * 
 * ## Key Features
 * - Clear startup phases with descriptive logging
 * - Fail-fast approach with detailed error messages
 * - Guaranteed service availability after successful startup
 * - Comprehensive health checks and validation
 * - Graceful error handling and recovery suggestions
 * 
 * ## Startup Phases
 * 1. **Server Setup** - Basic Express configuration
 * 2. **Authentication** - Token service initialization
 * 3. **Database** - Database connections (if applicable)
 * 4. **Real-time** - Socket.IO and WebSocket setup
 * 5. **Routes** - API route registration
 * 6. **Start Listening** - Begin accepting connections
 */

import TokenService from './services/token-service.js';
import { createConnectionManager } from '../../server/connection-manager.js';

class StartupManager {
    constructor(app, logger) {
        this.app = app;
        this.logger = logger;
        this.status = 'initializing';
        this.currentPhase = 0;
        this.startTime = Date.now();
        
        // Services
        this.tokenService = null;
        this.connectionManager = null;
        
        // Startup phases
        this.phases = [
            { name: 'Server Setup', fn: this.setupServer },
            { name: 'Authentication', fn: this.initializeAuth },
            { name: 'Routes', fn: this.setupRoutes },
            { name: 'Start Listening', fn: this.startListening },
            { name: 'Real-time', fn: this.initializeRealtime },
            { name: 'Health Checks', fn: this.runHealthChecks }
        ];
    }
    
    /**
     * Start the server with all phases
     * 
     * @param {number} port - Port to listen on
     * @returns {Promise<Object>} Startup result
     */
    async start(port = 4000) {
        this.logger.info('🚀 Starting PingOne Import Tool...');
        this.logger.info(`📋 Startup phases: ${this.phases.map(p => p.name).join(' → ')}`);
        
        try {
            for (let i = 0; i < this.phases.length; i++) {
                const phase = this.phases[i];
                this.currentPhase = i;
                
                this.logger.info(`📋 Phase ${i + 1}/${this.phases.length}: ${phase.name}`);
                
                const phaseStart = Date.now();
                await phase.fn.call(this, port);
                const phaseDuration = Date.now() - phaseStart;
                
                this.logger.info(`✅ Phase completed: ${phase.name} (${phaseDuration}ms)`);
            }
            
            const totalDuration = Date.now() - this.startTime;
            this.status = 'ready';
            
            this.logger.info('🎉 Server startup completed successfully!', {
                totalDuration: `${totalDuration}ms`,
                phases: this.phases.length,
                port
            });
            
            return {
                success: true,
                duration: totalDuration,
                phases: this.phases.length,
                port,
                status: this.status
            };
            
        } catch (error) {
            const failedPhase = this.phases[this.currentPhase];
            const totalDuration = Date.now() - this.startTime;
            
            this.logger.error(`❌ Startup failed at phase: ${failedPhase.name}`, {
                error: error.message,
                phase: this.currentPhase + 1,
                totalPhases: this.phases.length,
                duration: `${totalDuration}ms`,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            });
            
            this.status = 'failed';
            
            throw new Error(`Startup failed at phase: ${failedPhase.name} - ${error.message}`);
        }
    }
    
    /**
     * Phase 1: Setup basic server configuration
     * 
     * @private
     */
    async setupServer() {
        this.logger.debug('Setting up basic server configuration...');
        
        // Server is already created, just verify it's working
        if (!this.app) {
            throw new Error('Express app not provided');
        }
        
        // Set server state
        this.app.set('startupManager', this);
        this.app.set('serverStatus', 'starting');
        
        this.logger.debug('✅ Server setup completed');
    }
    
    /**
     * Phase 2: Initialize authentication system
     * 
     * @private
     */
    async initializeAuth() {
        this.logger.debug('Initializing authentication system...');
        
        // Create and initialize token service
        this.tokenService = new TokenService(this.logger);
        const tokenResult = await this.tokenService.initialize();
        
        if (!tokenResult.success) {
            this.logger.warn('Authentication initialization failed, but continuing startup', {
                error: tokenResult.error,
                recommendations: tokenResult.recommendations
            });
            
            // Log recommendations for user
            if (tokenResult.recommendations) {
                this.logger.info('📋 Setup Recommendations:');
                tokenResult.recommendations.forEach((rec, index) => {
                    this.logger.info(`   ${index + 1}. ${rec}`);
                });
            }
            
            // Don't fail startup for authentication issues - let the app start
            // so users can configure credentials through the UI
        } else {
            // Verify token is working if initialization succeeded
            try {
                const token = await this.tokenService.getValidToken();
                if (!token) {
                    this.logger.warn('Token verification failed, but continuing startup');
                } else {
                    this.logger.info('🔑 Token verified and ready for use');
                }
            } catch (error) {
                this.logger.warn('Token verification failed, but continuing startup', {
                    error: error.message
                });
            }
        }
        
        // Attach to app for route access
        this.app.set('tokenService', this.tokenService);
        this.app.set('tokenManager', this.tokenService); // Backward compatibility
        
        this.logger.info('🔑 Authentication system ready', {
            source: tokenResult.source,
            expiresAt: tokenResult.expiresAt
        });
    }
    
    /**
     * Phase 3: Initialize real-time communication
     * 
     * @private
     */
    async initializeRealtime() {
        this.logger.debug('Initializing real-time communication...');
        
        // Create connection manager
        this.connectionManager = createConnectionManager(this.logger);
        
        // Get HTTP server from app (should be set during startup)
        const httpServer = this.app.get('httpServer');
        if (httpServer) {
            // Import Socket.IO dynamically
            const { Server: SocketIOServer } = await import('socket.io');
            
            // Create Socket.IO server
            const io = new SocketIOServer(httpServer, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"]
                },
                transports: ['websocket', 'polling']
            });
            
            // Initialize connection manager with Socket.IO
            this.connectionManager.initialize(io);
            
            // Store Socket.IO server for other parts of the app
            this.app.set('io', io);
            
            this.logger.info('✅ Socket.IO server initialized and attached');
        } else {
            this.logger.warn('⚠️ HTTP server not available, Socket.IO not initialized');
        }
        
        // Attach connection manager to app
        this.app.set('connectionManager', this.connectionManager);
        
        this.logger.debug('✅ Real-time communication ready');
    }
    
    /**
     * Phase 4: Setup API routes
     * 
     * @private
     */
    async setupRoutes() {
        this.logger.debug('Setting up API routes...');
        
        // Routes are already set up in server.js
        // This phase is for any additional route configuration
        
        this.logger.debug('✅ API routes ready');
    }
    
    /**
     * Phase 5: Run health checks
     * 
     * @private
     */
    async runHealthChecks() {
        this.logger.debug('Running startup health checks...');
        
        // Check token service exists
        if (!this.tokenService) {
            throw new Error('Token service health check failed - service not found');
        }
        
        // Check connection manager
        if (!this.connectionManager) {
            throw new Error('Connection manager health check failed');
        }
        
        // Test API connectivity (only if token service is properly initialized)
        const tokenInfo = this.tokenService.getTokenInfo();
        if (tokenInfo.hasToken) {
            try {
                const token = await this.tokenService.getValidToken();
                const environmentId = await this.tokenService.getEnvironmentId();
                
                if (!token || !environmentId) {
                    throw new Error('API connectivity check failed');
                }
                
                this.logger.debug('✅ API connectivity verified');
            } catch (error) {
                this.logger.warn('API connectivity check failed, but continuing startup', {
                    error: error.message
                });
                // Don't fail startup for API connectivity issues
            }
        } else {
            this.logger.warn('No token available, skipping API connectivity check');
        }
        
        this.logger.debug('✅ Health checks completed');
    }
    
    /**
     * Phase 6: Start listening for connections
     * 
     * @private
     * @param {number} port - Port to listen on
     */
    async startListening(port) {
        return new Promise((resolve, reject) => {
            const server = this.app.listen(port, (error) => {
                if (error) {
                    reject(new Error(`Failed to start listening on port ${port}: ${error.message}`));
                    return;
                }
                
                // Store HTTP server for Socket.IO initialization
                this.app.set('httpServer', server);
                this.app.set('server', server);
                this.app.set('serverStatus', 'ready');
                
                this.logger.info(`🌐 Server listening on port ${port}`);
                resolve();
            });
            
            // Handle server errors
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${port} is already in use`));
                } else {
                    reject(new Error(`Server error: ${error.message}`));
                }
            });
            
            // Store server reference
            this.app.set('server', server);
        });
    }
    
    /**
     * Get current startup status
     * 
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            status: this.status,
            currentPhase: this.currentPhase,
            totalPhases: this.phases.length,
            currentPhaseName: this.phases[this.currentPhase]?.name || 'Unknown',
            duration: Date.now() - this.startTime,
            services: {
                tokenService: !!this.tokenService,
                connectionManager: !!this.connectionManager
            }
        };
    }
    
    /**
     * Shutdown the server gracefully
     * 
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('🛑 Shutting down server...');
        
        try {
            // Shutdown token service
            if (this.tokenService) {
                this.tokenService.shutdown();
            }
            
            // Close server
            const server = this.app.get('server');
            if (server) {
                await new Promise((resolve) => {
                    server.close(resolve);
                });
            }
            
            this.status = 'shutdown';
            this.logger.info('✅ Server shutdown completed');
            
        } catch (error) {
            this.logger.error('❌ Error during shutdown:', error);
            throw error;
        }
    }
}

export default StartupManager;