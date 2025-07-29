/**
 * Worker Token Status Banner
 * 
 * Displays real-time worker token status at the top of the page
 */

export class WorkerTokenBanner {
    constructor(logger) {
        this.logger = logger || console;
        this.banner = null;
        this.updateInterval = null;
        this.checkInterval = 30000; // 30 seconds
        this.lastStatus = null;
        
        this.logger.debug('🔑 Worker Token Banner initialized');
    }

    /**
     * Initialize the banner
     */
    init() {
        this.banner = document.getElementById('worker-token-banner');
        if (!this.banner) {
            this.logger.error('❌ Worker token banner element not found');
            return;
        }

        this.logger.debug('✅ Worker token banner element found');
        
        // Show initial checking state
        this.showChecking();
        
        // Start periodic status checks
        this.startStatusChecks();
        
        // Add body class for padding
        document.body.classList.add('has-worker-token-banner');
        
        this.logger.info('🔑 Worker Token Banner initialized and visible');
    }

    /**
     * Start periodic status checks
     */
    startStatusChecks() {
        // Initial check
        this.checkStatus();
        
        // Set up periodic checks
        this.updateInterval = setInterval(() => {
            this.checkStatus();
        }, this.checkInterval);
        
        this.logger.debug('🔄 Started periodic worker token status checks');
    }

    /**
     * Check current worker token status
     */
    async checkStatus() {
        try {
            this.logger.debug('🔍 Checking worker token status...');
            
            // Get token info from localStorage first
            const tokenInfo = this.getLocalTokenInfo();
            
            if (!tokenInfo.hasToken) {
                this.updateStatus('expired', 'No worker token available', 'Please configure credentials');
                return;
            }

            if (tokenInfo.isExpired) {
                this.updateStatus('expired', 'Worker token expired', 'Token needs refresh');
                return;
            }

            if (tokenInfo.isExpiring) {
                this.updateStatus('expiring', 'Worker token expiring soon', `${tokenInfo.timeRemaining} remaining`);
                return;
            }

            // Valid token
            this.updateStatus('valid', 'Worker token valid', `${tokenInfo.timeRemaining} remaining`);
            
        } catch (error) {
            this.logger.error('❌ Error checking worker token status:', error);
            this.updateStatus('error', 'Token status error', 'Check configuration');
        }
    }

    /**
     * Get token info from localStorage
     */
    getLocalTokenInfo() {
        try {
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return {
                    hasToken: false,
                    isExpired: true,
                    isExpiring: false,
                    timeRemaining: 0
                };
            }

            const expiryTime = parseInt(expiry, 10);
            const now = Date.now();
            const timeRemaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
            
            const isExpired = timeRemaining <= 0;
            const isExpiring = timeRemaining <= 300; // 5 minutes warning
            
            return {
                hasToken: true,
                isExpired,
                isExpiring,
                timeRemaining: this.formatTime(timeRemaining)
            };
            
        } catch (error) {
            this.logger.error('❌ Error getting local token info:', error);
            return {
                hasToken: false,
                isExpired: true,
                isExpiring: false,
                timeRemaining: 0
            };
        }
    }

    /**
     * Format time remaining in human readable format
     */
    formatTime(seconds) {
        if (seconds <= 0) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Show checking state
     */
    showChecking() {
        if (!this.banner) return;
        
        this.banner.className = 'worker-token-banner checking';
        this.banner.querySelector('.status-icon').textContent = '⏳';
        this.banner.querySelector('.status-text').textContent = 'Checking worker token status...';
        this.banner.querySelector('.status-details').textContent = 'Please wait...';
        this.banner.classList.remove('hidden');
    }

    /**
     * Update banner status
     */
    updateStatus(status, text, details) {
        if (!this.banner) return;
        
        // Don't update if status hasn't changed
        if (this.lastStatus === status && this.lastText === text) {
            return;
        }
        
        this.lastStatus = status;
        this.lastText = text;
        
        // Update classes
        this.banner.className = `worker-token-banner ${status}`;
        
        // Update icon
        const iconMap = {
            'valid': '✅',
            'expired': '❌',
            'expiring': '⚠️',
            'error': '🚨',
            'checking': '⏳'
        };
        
        this.banner.querySelector('.status-icon').textContent = iconMap[status] || '🔑';
        
        // Update text
        this.banner.querySelector('.status-text').textContent = text;
        this.banner.querySelector('.status-details').textContent = details;
        
        // Show banner
        this.banner.classList.remove('hidden');
        
        this.logger.debug(`🔑 Worker token banner updated: ${status} - ${text}`);
    }

    /**
     * Hide the banner
     */
    hide() {
        if (this.banner) {
            this.banner.classList.add('hidden');
        }
    }

    /**
     * Show the banner
     */
    show() {
        if (this.banner) {
            this.banner.classList.remove('hidden');
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        document.body.classList.remove('has-worker-token-banner');
        
        this.logger.debug('🔑 Worker Token Banner destroyed');
    }
}