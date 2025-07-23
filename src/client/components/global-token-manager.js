/**
 * Global Token Manager Module
 * 
 * Provides a prominent global token status display in the sidebar
 * with real-time countdown timer and enhanced visibility across all windows.
 */

class GlobalTokenManager {
    constructor() {
        // Timer for updating token status
        this.globalTokenTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.updateGlobalTokenStatus = this.updateGlobalTokenStatus.bind(this);
        this.setupGlobalTokenEventListeners = this.setupGlobalTokenEventListeners.bind(this);
        this.startGlobalTokenTimer = this.startGlobalTokenTimer.bind(this);
        this.getNewToken = this.getNewToken.bind(this);
    }

    /**
     * Initialize the global token manager
     */
    init() {
        (window.logger?.info || console.log)('Initializing Global Token Manager...');
        this.initGlobalTokenStatus();
    }

    /**
     * Update the global token status display
     */
    updateGlobalTokenStatus() {
        (window.logger?.debug || console.log)('🔄 Updating global token status in sidebar...');
        const statusBox = document.getElementById('global-token-status');
        if (!statusBox) {
            (window.logger?.warn || console.warn)('❌ Global token status box not found');
            return;
        }

        const countdown = statusBox.querySelector('.global-token-countdown');
        const icon = statusBox.querySelector('.global-token-icon');
        const text = statusBox.querySelector('.global-token-text');
        const getTokenBtn = document.getElementById('global-get-token');

        if (!countdown || !icon || !text) {
            (window.logger?.warn || console.warn)('❌ Global token status elements not found');
            return;
        }

        // Get current token info
        const tokenInfo = this.getTokenInfo();
        
        if (tokenInfo.hasToken) {
            // Token exists
            const timeLeft = tokenInfo.timeLeft;
            const formattedTime = this.formatTime(timeLeft);
            
            countdown.textContent = formattedTime;
            
            if (timeLeft <= 0) {
                // Token expired
                statusBox.className = 'global-token-status expired';
                icon.textContent = '❌';
                text.textContent = 'Token expired';
                if (getTokenBtn) getTokenBtn.style.display = 'inline-block';
            } else if (timeLeft <= 300) { // 5 minutes
                // Token expiring soon
                statusBox.className = 'global-token-status warning';
                icon.textContent = '⚠️';
                text.textContent = 'Token expiring soon';
                if (getTokenBtn) getTokenBtn.style.display = 'none';
            } else {
                // Token valid
                statusBox.className = 'global-token-status valid';
                icon.textContent = '✅';
                text.textContent = 'Token valid';
                if (getTokenBtn) getTokenBtn.style.display = 'none';
            }
        } else {
            // No token
            statusBox.className = 'global-token-status missing';
            icon.textContent = '❌';
            text.textContent = 'No valid token';
            countdown.textContent = 'No Token';
            if (getTokenBtn) getTokenBtn.style.display = 'inline-block';
        }
    }

    /**
     * Format time in mm:ss format
     */
    formatTime(seconds) {
        if (seconds <= 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Get current token information
     */
    getTokenInfo() {
        try {
            // Try to get token info from localStorage or token manager
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return { hasToken: false, timeLeft: 0 };
            }
            
            const expiryTime = parseInt(expiry);
            const currentTime = Date.now();
            const timeLeft = Math.floor((expiryTime - currentTime) / 1000);
            
            return {
                hasToken: true,
                timeLeft: Math.max(0, timeLeft)
            };
        } catch (error) {
            (window.logger?.error || console.error)('Error getting token info:', error);
            return { hasToken: false, timeLeft: 0 };
        }
    }

    /**
     * Initialize the global token status
     */
    initGlobalTokenStatus() {
        this.waitForAppAndInit();
    }

    /**
     * Wait for app to be available and then initialize
     */
    async waitForAppAndInit() {
        let attempts = 0;
        const maxAttempts = 10;
        const retryDelay = 500;
        
        while (attempts < maxAttempts) {
            if (document.getElementById('global-token-status')) {
                (window.logger?.info || console.log)('✅ Global token status element found, initializing...');
                this.setupGlobalTokenEventListeners();
                this.startGlobalTokenTimer();
                this.updateGlobalTokenStatus();
                return;
            } else {
                attempts++;
                (window.logger?.debug || console.log)(`⏳ Waiting for global token status element... (attempt ${attempts}/${maxAttempts})`);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        
        (window.logger?.warn || console.warn)('⚠️ Global token status element not found after waiting');
    }

    /**
     * Set up event listeners for global token buttons
     */
    setupGlobalTokenEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('global-refresh-token');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateGlobalTokenStatus();
            });
        }

        // Get Token button
        const getTokenBtn = document.getElementById('global-get-token');
        if (getTokenBtn) {
            getTokenBtn.addEventListener('click', () => {
                this.getNewToken();
            });
        }
    }

    /**
     * Start the timer to update token status every second
     */
    startGlobalTokenTimer() {
        if (this.globalTokenTimer) {
            clearInterval(this.globalTokenTimer);
        }
        
        this.globalTokenTimer = setInterval(() => {
            this.updateGlobalTokenStatus();
        }, 1000);
    }

    /**
     * Get new token
     */
    async getNewToken() {
        try {
            (window.logger?.info || console.log)('Getting new token via global token manager...');
            
            // Try to use the app's token refresh functionality
            if (window.app && typeof window.app.getToken === 'function') {
                await window.app.getToken();
                this.updateGlobalTokenStatus();
                (window.logger?.info || console.log)('Token refreshed successfully');
                return;
            }
            
            // Fallback: try to trigger token refresh through API
            const response = await fetch('/api/auth/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                (window.logger?.info || console.log)('Token refreshed via API:', result);
                this.updateGlobalTokenStatus();
            } else {
                (window.logger?.error || console.error)('Failed to refresh token via API:', response.statusText);
            }
            
        } catch (error) {
            (window.logger?.error || console.error)('Error getting new token:', error);
        }
    }

    /**
     * Update status (called from external modules)
     */
    updateStatus() {
        this.updateGlobalTokenStatus();
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.globalTokenTimer) {
            clearInterval(this.globalTokenTimer);
            this.globalTokenTimer = null;
        }
    }
}

export default GlobalTokenManager;
