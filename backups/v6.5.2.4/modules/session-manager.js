/**
 * Session Manager for PingOne Import Tool
 * 
 * Handles session ID generation, validation, and management for SSE connections
 * across all operations (import, export, modify, delete).
 * 
 * Features:
 * - Centralized session ID generation
 * - Session ID validation and format checking
 * - Session tracking and cleanup
 * - Error handling for missing/invalid session IDs
 */

import { createWinstonLogger } from './winston-logger.js';

/**
 * Session Manager Class
 */
class SessionManager {
    constructor() {
        this.logger = createWinstonLogger({
            service: 'pingone-import-session',
            environment: process.env.NODE_ENV || 'development'
        });
        
        this.activeSessions = new Map();
        this.sessionCounter = 0;
    }

    /**
     * Generate a unique session ID
     * @returns {string} Unique session identifier
     */
    generateSessionId() {
        try {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const counter = ++this.sessionCounter;
            const sessionId = `session_${timestamp}_${random}_${counter}`;
            
            this.logger.debug('Session ID generated', { sessionId });
            return sessionId;
        } catch (error) {
            this.logger.error('Error generating session ID', { error: error.message });
            // Fallback to simple timestamp-based ID
            return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        }
    }

    /**
     * Validate session ID format and structure
     * @param {string} sessionId - Session ID to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateSessionId(sessionId) {
        try {
            if (!sessionId || typeof sessionId !== 'string') {
                this.logger.warn('Session ID validation failed: null/undefined/non-string', { sessionId, type: typeof sessionId });
                return false;
            }

            if (sessionId.trim() === '') {
                this.logger.warn('Session ID validation failed: empty string');
                return false;
            }

            // Check for minimum length (should be at least 8 characters)
            if (sessionId.length < 8) {
                this.logger.warn('Session ID validation failed: too short', { length: sessionId.length });
                return false;
            }

            // Check for valid characters (alphanumeric, underscore, hyphen)
            const validPattern = /^[a-zA-Z0-9_-]+$/;
            if (!validPattern.test(sessionId)) {
                this.logger.warn('Session ID validation failed: invalid characters', { sessionId });
                return false;
            }

            this.logger.debug('Session ID validation passed', { sessionId });
            return true;
        } catch (error) {
            this.logger.error('Error validating session ID', { error: error.message, sessionId });
            return false;
        }
    }

    /**
     * Register an active session
     * @param {string} sessionId - Session ID to register
     * @param {string} operationType - Type of operation (import, export, etc.)
     * @param {Object} metadata - Additional session metadata
     */
    registerSession(sessionId, operationType, metadata = {}) {
        try {
            if (!this.validateSessionId(sessionId)) {
                this.logger.error('Cannot register invalid session ID', { sessionId, operationType });
                return false;
            }

            const sessionData = {
                sessionId,
                operationType,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                metadata
            };

            this.activeSessions.set(sessionId, sessionData);
            this.logger.info('Session registered', { sessionId, operationType, metadata });
            return true;
        } catch (error) {
            this.logger.error('Error registering session', { error: error.message, sessionId, operationType });
            return false;
        }
    }

    /**
     * Update session activity timestamp
     * @param {string} sessionId - Session ID to update
     */
    updateSessionActivity(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.lastActivity = Date.now();
                this.logger.debug('Session activity updated', { sessionId });
            } else {
                this.logger.warn('Session not found for activity update', { sessionId });
            }
        } catch (error) {
            this.logger.error('Error updating session activity', { error: error.message, sessionId });
        }
    }

    /**
     * Unregister a session
     * @param {string} sessionId - Session ID to unregister
     */
    unregisterSession(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                this.activeSessions.delete(sessionId);
                this.logger.info('Session unregistered', { sessionId, operationType: session.operationType });
            } else {
                this.logger.warn('Session not found for unregistration', { sessionId });
            }
        } catch (error) {
            this.logger.error('Error unregistering session', { error: error.message, sessionId });
        }
    }

    /**
     * Get session information
     * @param {string} sessionId - Session ID to retrieve
     * @returns {Object|null} Session data or null if not found
     */
    getSession(sessionId) {
        try {
            return this.activeSessions.get(sessionId) || null;
        } catch (error) {
            this.logger.error('Error getting session', { error: error.message, sessionId });
            return null;
        }
    }

    /**
     * Get all active sessions
     * @returns {Array} Array of active session data
     */
    getActiveSessions() {
        try {
            return Array.from(this.activeSessions.values());
        } catch (error) {
            this.logger.error('Error getting active sessions', { error: error.message });
            return [];
        }
    }

    /**
     * Clean up expired sessions
     * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
     */
    cleanupExpiredSessions(maxAge = 60 * 60 * 1000) {
        try {
            const now = Date.now();
            const expiredSessions = [];

            for (const [sessionId, session] of this.activeSessions.entries()) {
                if (now - session.lastActivity > maxAge) {
                    expiredSessions.push(sessionId);
                }
            }

            expiredSessions.forEach(sessionId => {
                this.unregisterSession(sessionId);
            });

            if (expiredSessions.length > 0) {
                this.logger.info('Cleaned up expired sessions', { count: expiredSessions.length });
            }
        } catch (error) {
            this.logger.error('Error cleaning up expired sessions', { error: error.message });
        }
    }

    /**
     * Get session statistics
     * @returns {Object} Session statistics
     */
    getSessionStats() {
        try {
            const sessions = this.getActiveSessions();
            const stats = {
                total: sessions.length,
                byOperation: {},
                oldest: null,
                newest: null
            };

            sessions.forEach(session => {
                // Count by operation type
                stats.byOperation[session.operationType] = (stats.byOperation[session.operationType] || 0) + 1;

                // Track oldest and newest
                if (!stats.oldest || session.createdAt < stats.oldest.createdAt) {
                    stats.oldest = session;
                }
                if (!stats.newest || session.createdAt > stats.newest.createdAt) {
                    stats.newest = session;
                }
            });

            return stats;
        } catch (error) {
            this.logger.error('Error getting session stats', { error: error.message });
            return { total: 0, byOperation: {}, oldest: null, newest: null };
        }
    }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export default sessionManager; 