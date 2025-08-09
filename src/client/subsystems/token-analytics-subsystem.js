/**
 * Token Analytics Subsystem
 * 
 * Collects and tracks token-related metrics including:
 * - Total token requests
 * - Successful requests
 * - Failed requests  
 * - Token refreshes
 * 
 * Provides real-time analytics data for the Token Analytics dashboard.
 */

export class TokenAnalyticsSubsystem {
    constructor(eventBus, logger) {
        this.eventBus = eventBus;
        this.logger = logger || console;
        
        // Analytics data
        this.analytics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            tokenRefreshes: 0,
            lastUpdated: Date.now()
        };
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load existing analytics data
        this.loadAnalyticsData();
        
        this.logger.info('Token Analytics Subsystem initialized');
    }
    
    /**
     * Initialize event listeners for token operations
     */
    initializeEventListeners() {
        if (!this.eventBus) {
            this.logger.warn('EventBus not available, analytics tracking limited');
            return;
        }
        
        // Track token requests
        this.eventBus.on('tokenRequest', () => {
            this.incrementMetric('totalRequests');
        });
        
        // Track successful token operations
        this.eventBus.on('tokenRefreshed', () => {
            this.incrementMetric('successfulRequests');
            this.incrementMetric('tokenRefreshes');
        });
        
        this.eventBus.on('tokenObtained', () => {
            this.incrementMetric('successfulRequests');
        });
        
        // Track failed token operations
        this.eventBus.on('tokenError', () => {
            this.incrementMetric('failedRequests');
        });
        
        this.eventBus.on('tokenRefreshFailed', () => {
            this.incrementMetric('failedRequests');
        });
        
        // Track manual token operations
        this.eventBus.on('manualTokenRequest', () => {
            this.incrementMetric('totalRequests');
        });
        
        this.eventBus.on('manualTokenSuccess', () => {
            this.incrementMetric('successfulRequests');
        });
        
        this.eventBus.on('manualTokenFailure', () => {
            this.incrementMetric('failedRequests');
        });
        
        this.logger.debug('Token analytics event listeners initialized');
    }
    
    /**
     * Increment a specific metric
     */
    incrementMetric(metricName) {
        if (this.analytics.hasOwnProperty(metricName)) {
            this.analytics[metricName]++;
            this.analytics.lastUpdated = Date.now();
            this.saveAnalyticsData();
            this.updateUI();
            
            this.logger.debug(`Token analytics: ${metricName} incremented to ${this.analytics[metricName]}`);
        }
    }
    
    /**
     * Get current analytics data
     */
    getAnalyticsData() {
        return { ...this.analytics };
    }
    
    /**
     * Reset analytics data
     */
    resetAnalytics() {
        this.analytics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            tokenRefreshes: 0,
            lastUpdated: Date.now()
        };
        this.saveAnalyticsData();
        this.updateUI();
        
        this.logger.info('Token analytics data reset');
    }
    
    /**
     * Load analytics data from localStorage
     */
    loadAnalyticsData() {
        try {
            const stored = localStorage.getItem('tokenAnalytics');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.analytics = { ...this.analytics, ...parsed };
                this.logger.debug('Token analytics data loaded from storage');
            }
        } catch (error) {
            this.logger.warn('Failed to load token analytics data', error);
        }
    }
    
    /**
     * Save analytics data to localStorage
     */
    saveAnalyticsData() {
        try {
            localStorage.setItem('tokenAnalytics', JSON.stringify(this.analytics));
        } catch (error) {
            this.logger.warn('Failed to save token analytics data', error);
        }
    }
    
    /**
     * Update the UI with current analytics data
     */
    updateUI() {
        const elements = {
            totalRequests: document.getElementById('total-requests'),
            successfulRequests: document.getElementById('successful-requests'),
            failedRequests: document.getElementById('failed-requests'),
            tokenRefreshes: document.getElementById('token-refreshes')
        };
        
        // Update each element if it exists
        Object.entries(elements).forEach(([key, element]) => {
            if (element && this.analytics.hasOwnProperty(key)) {
                element.textContent = this.analytics[key];
            }
        });
    }
    
    /**
     * Get analytics summary for display
     */
    getAnalyticsSummary() {
        const successRate = this.analytics.totalRequests > 0 
            ? Math.round((this.analytics.successfulRequests / this.analytics.totalRequests) * 100)
            : 0;
            
        return {
            ...this.analytics,
            successRate,
            lastUpdated: new Date(this.analytics.lastUpdated).toLocaleString()
        };
    }
    
    /**
     * Manually track a token request (for external systems)
     */
    trackTokenRequest(success = true) {
        this.incrementMetric('totalRequests');
        if (success) {
            this.incrementMetric('successfulRequests');
        } else {
            this.incrementMetric('failedRequests');
        }
    }
    
    /**
     * Manually track a token refresh
     */
    trackTokenRefresh(success = true) {
        this.incrementMetric('totalRequests');
        this.incrementMetric('tokenRefreshes');
        if (success) {
            this.incrementMetric('successfulRequests');
        } else {
            this.incrementMetric('failedRequests');
        }
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (this.eventBus) {
            this.eventBus.off('tokenRequest');
            this.eventBus.off('tokenRefreshed');
            this.eventBus.off('tokenObtained');
            this.eventBus.off('tokenError');
            this.eventBus.off('tokenRefreshFailed');
            this.eventBus.off('manualTokenRequest');
            this.eventBus.off('manualTokenSuccess');
            this.eventBus.off('manualTokenFailure');
        }
        
        this.logger.info('Token Analytics Subsystem destroyed');
    }
}
