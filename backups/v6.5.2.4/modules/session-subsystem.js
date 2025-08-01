/**
 * Session Management Subsystem
 * Modern replacement for legacy SessionManager
 * Handles session lifecycle, activity tracking, and cleanup
 */

export class SessionSubsystem {
    constructor(logger, settingsSubsystem, eventBus) {
        this.logger = logger;
        this.settingsSubsystem = settingsSubsystem;
        this.eventBus = eventBus;

        // Session state
        this.currentSession = null;
        this.activeSessions = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes default
        this.cleanupInterval = null;
        this.activityTimer = null;

        // Session configuration
        this.config = {
            maxSessions: 10,
            sessionTimeout: 30 * 60 * 1000,
            activityCheckInterval: 60 * 1000, // 1 minute
            autoCleanup: true
        };

        this.setupEventListeners();
        this.logger.info('Session Subsystem initialized');
    }

    /**
     * Initialize the session subsystem
     */
    async init() {
        try {
            await this.loadConfiguration();
            this.startActivityMonitoring();
            this.startCleanupProcess();
            
            // Create initial session
            await this.createSession();
            
            this.logger.info('Session Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Session Subsystem', error);
            throw error;
        }
    }

    /**
     * Load session configuration
     */
    async loadConfiguration() {
        try {
            await this.settingsSubsystem.loadCurrentSettings();
            const settings = this.settingsSubsystem.currentSettings;
            if (settings.session) {
                this.config = { ...this.config, ...settings.session };
                this.sessionTimeout = this.config.sessionTimeout;
            }
        } catch (error) {
            this.logger.warn('Failed to load session configuration, using defaults', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for user activity events
        this.eventBus.on('user:activity', () => {
            this.updateActivity();
        });

        // Listen for authentication events
        this.eventBus.on('auth:login', (data) => {
            this.handleLogin(data);
        });

        this.eventBus.on('auth:logout', () => {
            this.handleLogout();
        });

        // Listen for settings changes
        this.eventBus.on('settings:updated', (data) => {
            if (data.session) {
                this.updateConfiguration(data.session);
            }
        });

        // Browser events
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });

        window.addEventListener('focus', () => {
            this.updateActivity();
        });

        // Activity detection events
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
    }

    /**
     * Create a new session
     */
    async createSession(userId = null) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            userId: userId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + this.sessionTimeout,
            isActive: true,
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href
            }
        };

        this.activeSessions.set(sessionId, session);
        this.currentSession = session;

        // Cleanup old sessions if needed
        if (this.activeSessions.size > this.config.maxSessions) {
            this.cleanupOldSessions();
        }

        this.logger.info('Session created', { 
            sessionId, 
            userId,
            totalSessions: this.activeSessions.size 
        });

        this.eventBus.emit('session:created', { session });
        return session;
    }

    /**
     * Update session activity
     */
    updateActivity() {
        if (!this.currentSession) return;

        const now = Date.now();
        this.currentSession.lastActivity = now;
        this.currentSession.expiresAt = now + this.sessionTimeout;

        // Update in sessions map
        this.activeSessions.set(this.currentSession.id, this.currentSession);

        this.logger.debug('Session activity updated', { 
            sessionId: this.currentSession.id,
            lastActivity: new Date(now).toISOString()
        });

        this.eventBus.emit('session:activity', { 
            sessionId: this.currentSession.id,
            timestamp: now 
        });
    }

    /**
     * Handle user login
     */
    async handleLogin(data) {
        if (this.currentSession) {
            this.currentSession.userId = data.userId;
            this.currentSession.lastActivity = Date.now();
            this.activeSessions.set(this.currentSession.id, this.currentSession);
        } else {
            await this.createSession(data.userId);
        }

        this.logger.info('User logged in', { 
            userId: data.userId,
            sessionId: this.currentSession?.id 
        });

        this.eventBus.emit('session:login', { 
            userId: data.userId,
            sessionId: this.currentSession?.id 
        });
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        if (this.currentSession) {
            this.endSession(this.currentSession.id);
        }

        this.logger.info('User logged out');
        this.eventBus.emit('session:logout');
    }

    /**
     * End a session
     */
    endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            session.endedAt = Date.now();
            
            this.activeSessions.delete(sessionId);
            
            if (this.currentSession && this.currentSession.id === sessionId) {
                this.currentSession = null;
            }

            this.logger.info('Session ended', { sessionId });
            this.eventBus.emit('session:ended', { sessionId, session });
        }
    }

    /**
     * Start activity monitoring
     */
    startActivityMonitoring() {
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
        }

        this.activityTimer = setInterval(() => {
            this.checkSessionExpiry();
        }, this.config.activityCheckInterval);

        this.logger.debug('Activity monitoring started');
    }

    /**
     * Check for expired sessions
     */
    checkSessionExpiry() {
        const now = Date.now();
        const expiredSessions = [];

        this.activeSessions.forEach((session, sessionId) => {
            if (session.expiresAt < now) {
                expiredSessions.push(sessionId);
            }
        });

        expiredSessions.forEach(sessionId => {
            this.logger.info('Session expired', { sessionId });
            this.endSession(sessionId);
            this.eventBus.emit('session:expired', { sessionId });
        });

        if (expiredSessions.length > 0) {
            this.logger.info('Expired sessions cleaned up', { count: expiredSessions.length });
        }
    }

    /**
     * Start cleanup process
     */
    startCleanupProcess() {
        if (!this.config.autoCleanup) return;

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldSessions();
        }, 5 * 60 * 1000);

        this.logger.debug('Cleanup process started');
    }

    /**
     * Cleanup old sessions
     */
    cleanupOldSessions() {
        const sessions = Array.from(this.activeSessions.values());
        const sortedSessions = sessions.sort((a, b) => b.lastActivity - a.lastActivity);
        
        // Keep only the most recent sessions up to maxSessions
        const sessionsToRemove = sortedSessions.slice(this.config.maxSessions);
        
        sessionsToRemove.forEach(session => {
            this.endSession(session.id);
        });

        if (sessionsToRemove.length > 0) {
            this.logger.info('Old sessions cleaned up', { count: sessionsToRemove.length });
        }
    }

    /**
     * Update configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.sessionTimeout = this.config.sessionTimeout;

        // Restart monitoring with new config
        this.startActivityMonitoring();
        this.startCleanupProcess();

        this.logger.info('Session configuration updated', this.config);
        this.eventBus.emit('session:config-updated', this.config);
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload() {
        if (this.currentSession) {
            // Mark session as potentially ending
            this.eventBus.emit('session:before-unload', { 
                sessionId: this.currentSession.id 
            });
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `session_${timestamp}_${random}`;
    }

    /**
     * Get current session
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Get active session count
     */
    getActiveSessionCount() {
        return this.activeSessions.size;
    }

    /**
     * Get session statistics
     */
    getSessionStats() {
        const sessions = this.getActiveSessions();
        const now = Date.now();

        return {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.isActive).length,
            expiredSessions: sessions.filter(s => s.expiresAt < now).length,
            averageSessionDuration: this.calculateAverageSessionDuration(sessions),
            oldestSession: sessions.reduce((oldest, session) => 
                (!oldest || session.createdAt < oldest.createdAt) ? session : oldest, null
            ),
            newestSession: sessions.reduce((newest, session) => 
                (!newest || session.createdAt > newest.createdAt) ? session : newest, null
            )
        };
    }

    /**
     * Calculate average session duration
     */
    calculateAverageSessionDuration(sessions) {
        if (sessions.length === 0) return 0;

        const totalDuration = sessions.reduce((total, session) => {
            const endTime = session.endedAt || Date.now();
            return total + (endTime - session.createdAt);
        }, 0);

        return Math.round(totalDuration / sessions.length);
    }

    /**
     * Export session data
     */
    exportSessionData() {
        const sessions = this.getActiveSessions();
        const stats = this.getSessionStats();

        return {
            currentSession: this.currentSession,
            sessions: sessions.map(session => ({
                ...session,
                duration: (session.endedAt || Date.now()) - session.createdAt
            })),
            statistics: stats,
            configuration: this.config,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Destroy the session subsystem
     */
    destroy() {
        // Clear timers
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // End all sessions
        this.activeSessions.forEach((session, sessionId) => {
            this.endSession(sessionId);
        });

        this.currentSession = null;
        this.activeSessions.clear();

        this.logger.info('Session Subsystem destroyed');
        this.eventBus.emit('session:destroyed');
    }
}

// Export for ES modules
export default SessionSubsystem;
