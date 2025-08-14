// Enhanced Token Manager with Proactive Renewal and Health Monitoring
// Version 7.3.0 - Phase 1 Improvements
// 
// This enhanced token manager extends the base TokenManager with:
// - Proactive token renewal (15 minutes before expiry)
// - Token health monitoring and alerts
// - Enhanced error recovery mechanisms
// - Real-time token status tracking

import TokenManager from './token-manager.js';
import EventEmitter from 'events';

/**
 * Enhanced Token Manager Class
 * 
 * Extends the base TokenManager with proactive renewal, health monitoring,
 * and enhanced error recovery capabilities.
 */
class EnhancedTokenManager extends TokenManager {
    constructor(logger) {
        super(logger);
        
        // Event emitter for token status updates
        this.events = new EventEmitter();
        
        // Proactive renewal configuration
        this.renewalBufferMs = 15 * 60 * 1000; // 15 minutes before expiry
        this.renewalTimer = null;
        this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
        this.healthCheckTimer = null;
        
        // Token health tracking
        this.tokenHealth = {
            status: 'unknown',
            lastRefresh: null,
            refreshCount: 0,
            errorCount: 0,
            lastError: null,
            uptime: Date.now()
        };
        
        // Auto-start health monitoring
        this.startHealthMonitoring();
        
        this.logger.info('Enhanced Token Manager initialized with proactive renewal');
    }

    /**
     * Start proactive health monitoring
     */
    startHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
        
        this.logger.debug('Token health monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
            this.renewalTimer = null;
        }
        
        this.logger.debug('Token health monitoring stopped');
    }

    /**
     * Perform token health check
     */
    async performHealthCheck() {
        try {
            const tokenInfo = this.getTokenInfo();
            
            if (!tokenInfo) {
                this.updateTokenHealth('no_token', 'No token available');
                return;
            }
            
            const timeToExpiry = tokenInfo.expiresAt - Date.now();
            const isExpired = timeToExpiry <= 0;
            const needsRenewal = timeToExpiry <= this.renewalBufferMs;
            
            if (isExpired) {
                this.updateTokenHealth('expired', 'Token has expired');
                await this.proactiveRenewal();
            } else if (needsRenewal) {
                this.updateTokenHealth('renewal_needed', `Token expires in ${Math.floor(timeToExpiry / 1000)}s`);
                await this.proactiveRenewal();
            } else {
                this.updateTokenHealth('healthy', `Token valid for ${Math.floor(timeToExpiry / 1000)}s`);
            }
            
        } catch (error) {
            this.updateTokenHealth('error', error.message);
            this.logger.error('Token health check failed:', error.message);
        }
    }

    /**
     * Update token health status
     */
    updateTokenHealth(status, message) {
        const previousStatus = this.tokenHealth.status;
        
        this.tokenHealth.status = status;
        this.tokenHealth.lastCheck = Date.now();
        
        if (status === 'error') {
            this.tokenHealth.errorCount++;
            this.tokenHealth.lastError = message;
        } else if (status === 'healthy') {
            this.tokenHealth.errorCount = 0;
            this.tokenHealth.lastError = null;
        }
        
        // Emit status change events
        if (previousStatus !== status) {
            this.events.emit('statusChange', {
                previous: previousStatus,
                current: status,
                message,
                timestamp: Date.now()
            });
            
            this.logger.info(`Token status changed: ${previousStatus} → ${status}`, { message });
        }
    }

    /**
     * Proactive token renewal
     */
    async proactiveRenewal() {
        if (this.isRefreshing) {
            this.logger.debug('Token renewal already in progress, skipping proactive renewal');
            return;
        }
        
        try {
            this.logger.info('Starting proactive token renewal');
            
            const newToken = await this.getAccessToken();
            
            if (newToken) {
                this.tokenHealth.refreshCount++;
                this.tokenHealth.lastRefresh = Date.now();
                this.updateTokenHealth('renewed', 'Token proactively renewed');
                
                // Schedule next renewal
                this.scheduleNextRenewal();
                
                // Emit renewal event
                this.events.emit('tokenRenewed', {
                    timestamp: Date.now(),
                    method: 'proactive',
                    tokenInfo: this.getTokenInfo()
                });
                
                this.logger.info('Proactive token renewal completed successfully');
            }
            
        } catch (error) {
            this.updateTokenHealth('renewal_failed', error.message);
            this.logger.error('Proactive token renewal failed:', error.message);
            
            // Retry renewal in 1 minute
            setTimeout(() => this.proactiveRenewal(), 60000);
        }
    }

    /**
     * Schedule next proactive renewal
     */
    scheduleNextRenewal() {
        if (this.renewalTimer) {
            clearTimeout(this.renewalTimer);
        }
        
        const tokenInfo = this.getTokenInfo();
        if (!tokenInfo) return;
        
        const timeToRenewal = (tokenInfo.expiresAt - Date.now()) - this.renewalBufferMs;
        
        if (timeToRenewal > 0) {
            this.renewalTimer = setTimeout(() => {
                this.proactiveRenewal();
            }, timeToRenewal);
            
            this.logger.debug(`Next proactive renewal scheduled in ${Math.floor(timeToRenewal / 1000)}s`);
        }
    }

    /**
     * Override getAccessToken to include proactive renewal
     */
    async getAccessToken(customSettings = null) {
        const token = await super.getAccessToken(customSettings);
        
        // Schedule proactive renewal for new tokens
        if (token && !this.renewalTimer) {
            this.scheduleNextRenewal();
        }
        
        return token;
    }

    /**
     * Get comprehensive token health status
     */
    getTokenHealthStatus() {
        const tokenInfo = this.getTokenInfo();
        const uptime = Date.now() - this.tokenHealth.uptime;
        
        return {
            ...this.tokenHealth,
            uptime: Math.floor(uptime / 1000),
            tokenInfo,
            renewalBuffer: Math.floor(this.renewalBufferMs / 1000),
            healthCheckInterval: Math.floor(this.healthCheckInterval / 1000),
            nextRenewal: this.renewalTimer ? 'scheduled' : 'not_scheduled',
            monitoring: !!this.healthCheckTimer
        };
    }

    /**
     * Get token status for dashboard
     */
    getTokenStatusForDashboard() {
        const health = this.getTokenHealthStatus();
        const tokenInfo = this.getTokenInfo();
        
        let statusColor = 'gray';
        let statusText = 'Unknown';
        
        if (health.status === 'healthy') {
            statusColor = 'green';
            statusText = 'Healthy';
        } else if (health.status === 'renewal_needed') {
            statusColor = 'yellow';
            statusText = 'Renewal Needed';
        } else if (health.status === 'expired' || health.status === 'no_token') {
            statusColor = 'red';
            statusText = 'Expired/Missing';
        } else if (health.status === 'error' || health.status === 'renewal_failed') {
            statusColor = 'red';
            statusText = 'Error';
        }
        
        return {
            status: health.status,
            statusText,
            statusColor,
            isValid: tokenInfo && tokenInfo.expiresAt > Date.now(),
            expiresAt: tokenInfo?.expiresAt,
            timeToExpiry: tokenInfo ? tokenInfo.expiresAt - Date.now() : 0,
            refreshCount: health.refreshCount,
            errorCount: health.errorCount,
            lastError: health.lastError,
            uptime: health.uptime,
            proactiveRenewal: true
        };
    }

    /**
     * Force token refresh for testing/debugging
     */
    async forceRefresh() {
        this.logger.info('Forcing token refresh');
        this.clearToken();
        return await this.getAccessToken();
    }

    /**
     * Add event listener for token events
     */
    onTokenEvent(event, callback) {
        this.events.on(event, callback);
    }

    /**
     * Remove event listener
     */
    offTokenEvent(event, callback) {
        this.events.off(event, callback);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopHealthMonitoring();
        this.events.removeAllListeners();
        this.logger.info('Enhanced Token Manager destroyed');
    }
}

export default EnhancedTokenManager;
