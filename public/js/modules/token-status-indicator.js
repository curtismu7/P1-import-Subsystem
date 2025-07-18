/**
 * Token Status Indicator Module
 * 
 * Provides a visible token status indicator across all pages in the application.
 * Shows current PingOne token state with color-coded status and automatic refresh.
 */

class TokenStatusIndicator {
    constructor() {
        this.statusBar = null;
        this.statusIcon = null;
        this.statusText = null;
        this.statusTime = null;
        this.refreshButton = null;
        this.getTokenButton = null;
        this.refreshInterval = null;
        this.refreshIntervalMs = 30000; // 30 seconds
        this.warningThresholdMs = 5 * 60 * 1000; // 5 minutes
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the token status indicator
     */
    async init() {
        if (this.isInitialized) {
            console.log('TokenStatusIndicator already initialized');
            return;
        }

        console.log('🔄 Initializing TokenStatusIndicator...');
        
        try {
            this.createStatusBar();
            this.bindEvents();
            this.startRefreshTimer();
            
            // Force initial status update
            await this.updateStatus();
            
            this.isInitialized = true;
            console.log('✅ TokenStatusIndicator initialized successfully');
            
            // Debug: Check if Get Token button exists and is visible
            if (this.getTokenButton) {
                console.log('✅ Get Token button found:', {
                    exists: !!this.getTokenButton,
                    display: this.getTokenButton.style.display,
                    visible: this.getTokenButton.style.display !== 'none'
                });
            } else {
                console.warn('⚠️ Get Token button not found in status bar');
            }
        } catch (error) {
            console.error('❌ Failed to initialize TokenStatusIndicator:', error);
            throw error;
        }
    }

    /**
     * Create the status bar HTML structure
     */
    createStatusBar() {
        console.log('Creating status bar...');
        // Check if status bar already exists
        if (document.getElementById('token-status-indicator')) {
            console.log('Token status indicator already exists, using existing element');
            this.statusBar = document.getElementById('token-status-indicator');
            this.statusIcon = this.statusBar.querySelector('.token-status-icon');
            this.statusText = this.statusBar.querySelector('.token-status-text');
            this.statusTime = this.statusBar.querySelector('.token-status-time');
            this.refreshButton = this.statusBar.querySelector('#refresh-token-status');
            this.getTokenButton = this.statusBar.querySelector('#get-token-quick');
            console.log('Found existing elements:', {
                statusBar: !!this.statusBar,
                statusIcon: !!this.statusIcon,
                statusText: !!this.statusText,
                statusTime: !!this.statusTime,
                refreshButton: !!this.refreshButton,
                getTokenButton: !!this.getTokenButton
            });
            return;
        }

        // Create status bar
        this.statusBar = document.createElement('div');
        this.statusBar.id = 'token-status-indicator';
        this.statusBar.className = 'token-status-indicator';
        this.statusBar.setAttribute('role', 'status');
        this.statusBar.setAttribute('aria-live', 'polite');

        this.statusBar.innerHTML = `
            <div class="token-status-content">
                <span class="token-status-icon" aria-hidden="true">⏳</span>
                <span class="token-status-text">Checking token status...</span>
                <span class="token-status-time"></span>
            </div>
            <div class="token-status-actions">
                <button id="refresh-token-status" class="btn btn-sm btn-outline-secondary" title="Refresh token status">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button id="get-token-quick" class="btn btn-sm btn-success" title="Get new token" style="display: none;">
                    <i class="fas fa-key"></i> Get Token
                </button>
            </div>
        `;

        // Get references to elements
        this.statusIcon = this.statusBar.querySelector('.token-status-icon');
        this.statusText = this.statusBar.querySelector('.token-status-text');
        this.statusTime = this.statusBar.querySelector('.token-status-time');
        this.refreshButton = this.statusBar.querySelector('#refresh-token-status');
        this.getTokenButton = this.statusBar.querySelector('#get-token-quick');

        // Add to page
        this.insertStatusBar();
    }

    /**
     * Insert status bar into the page
     */
    insertStatusBar() {
        // Try to find the sidebar first
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert at the end of the sidebar, after the nav-links
            const navLinks = sidebar.querySelector('.nav-links');
            if (navLinks) {
                // Insert after nav-links
                sidebar.appendChild(this.statusBar);
                return;
            }
        }

        // Fallback: Try to find a good location for the status bar
        const locations = [
            () => document.querySelector('.main-content'),
            () => document.querySelector('#app'),
            () => document.body
        ];

        for (const getLocation of locations) {
            const location = getLocation();
            if (location) {
                // Insert at the beginning of the main content
                location.insertBefore(this.statusBar, location.firstChild);
                return;
            }
        }

        // Fallback to body
        document.body.appendChild(this.statusBar);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => {
                this.refreshStatus();
            });
        }

        if (this.getTokenButton) {
            this.getTokenButton.addEventListener('click', () => {
                this.getNewToken();
            });
        }

        // Listen for token updates from other parts of the app
        window.addEventListener('token-updated', () => {
            this.updateStatus();
        });

        // Listen for page visibility changes to refresh when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateStatus();
            }
        });
    }

    /**
     * Start the automatic refresh timer
     */
    startRefreshTimer() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.updateStatus();
        }, this.refreshIntervalMs);

        console.log(`Token status auto-refresh started (${this.refreshIntervalMs / 1000}s interval)`);
    }

    /**
     * Stop the automatic refresh timer
     */
    stopRefreshTimer() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Token status auto-refresh stopped');
        }
    }

    /**
     * Get current token information
     */
    async getTokenInfo() {
        try {
            // Check localStorage first
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');

            if (!token || !expiry) {
                return {
                    status: 'missing',
                    message: 'No token available',
                    timeRemaining: null,
                    isExpired: true,
                    isExpiring: false
                };
            }

            const expiryTime = parseInt(expiry, 10);
            const now = Date.now();
            const timeRemaining = expiryTime - now;

            if (timeRemaining <= 0) {
                return {
                    status: 'expired',
                    message: '',
                    timeRemaining: 0,
                    isExpired: true,
                    isExpiring: false
                };
            }

            const isExpiring = timeRemaining <= this.warningThresholdMs;
            const status = isExpiring ? 'expiring' : 'valid';
            const message = isExpiring ? 'Token expires soon' : 'Token valid';

            return {
                status,
                message,
                timeRemaining,
                isExpired: false,
                isExpiring
            };
        } catch (error) {
            console.error('Error getting token info:', error);
            return {
                status: 'error',
                message: 'Error retrieving token',
                timeRemaining: null,
                isExpired: true,
                isExpiring: false
            };
        }
    }

    /**
     * Format time remaining
     */
    formatTimeRemaining(ms) {
        if (!ms || ms <= 0) return '0m 0s';

        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Update the token status indicator display with actual token status
     * @param {string} status - Token status ('valid', 'expired', 'missing', 'error', etc.)
     * @param {string} [message] - Optional status message
     */
    async updateDisplay(status, message) {
        const indicator = document.getElementById('token-status-indicator');
        if (!indicator) return;

        try {
            // Get actual token status
            const tokenInfo = await this.getTokenInfo();
            
            let text = tokenInfo.message;
            let className = 'token-status-indicator';

            switch (tokenInfo.status) {
                case 'valid':
                    text = tokenInfo.message;
                    className += ' valid';
                    break;
                case 'expired':
                    text = ''; // Keep empty as requested
                    className += ' expired';
                    break;
                case 'missing':
                    text = tokenInfo.message;
                    className += ' missing';
                    break;
                case 'error':
                    text = tokenInfo.message;
                    className += ' error';
                    break;
                case 'expiring':
                    text = tokenInfo.message;
                    className += ' expiring';
                    break;
                default:
                    text = tokenInfo.message || 'Checking token...';
            }

            indicator.textContent = text;
            indicator.className = className;
            indicator.style.display = '';
            
            console.log('✅ updateDisplay updated with actual token status:', tokenInfo.status, tokenInfo.message);
            
        } catch (error) {
            console.error('❌ Error in updateDisplay:', error);
            
            // Fallback to original behavior if error
            let text = 'Checking token...';
            let className = 'token-status-indicator';

            switch (status) {
                case 'valid':
                    text = 'Token valid';
                    className += ' valid';
                    break;
                case 'expired':
                    text = '';
                    className += ' expired';
                    break;
                case 'missing':
                    text = 'Token missing';
                    className += ' missing';
                    break;
                case 'error':
                    text = 'Token error';
                    className += ' error';
                    break;
                default:
                    text = message || 'Checking token...';
            }

            indicator.textContent = text;
            indicator.className = className;
            indicator.style.display = '';
        }
    }

    /**
     * Update the token status indicator
     */
    async updateStatus() {
        try {
            console.log('🔄 Updating token status...');
            
            const tokenInfo = await this.getTokenInfo();
            console.log('📊 Token info:', tokenInfo);
            
            // Update status bar elements
            if (this.statusIcon) {
                let icon = '⏳';
                let iconClass = '';
                
                switch (tokenInfo.status) {
                    case 'valid':
                        icon = '✅';
                        iconClass = 'valid';
                        break;
                    case 'expired':
                        icon = '❌';
                        iconClass = 'expired';
                        break;
                    case 'missing':
                        icon = '⚠️';
                        iconClass = 'missing';
                        break;
                    case 'error':
                        icon = '🚨';
                        iconClass = 'error';
                        break;
                    case 'expiring':
                        icon = '⏰';
                        iconClass = 'expiring';
                        break;
                }
                
                this.statusIcon.textContent = icon;
                this.statusIcon.className = `token-status-icon ${iconClass}`;
            }
            
            if (this.statusText) {
                this.statusText.textContent = tokenInfo.message;
            }
            
            if (this.statusTime && tokenInfo.timeRemaining !== null) {
                this.statusTime.textContent = `(${this.formatTimeRemaining(tokenInfo.timeRemaining)})`;
            }
            
            // Update status bar class
            if (this.statusBar) {
                this.statusBar.className = `token-status-indicator ${tokenInfo.status}`;
            }
            
            // Show/hide Get Token button based on token state
            if (this.getTokenButton) {
                if (tokenInfo.isExpired || tokenInfo.status === 'missing' || tokenInfo.status === 'error') {
                    this.getTokenButton.style.display = 'inline-block';
                    console.log('✅ Showing Get Token button - token is expired/missing/error');
                } else {
                    this.getTokenButton.style.display = 'none';
                    console.log('✅ Hiding Get Token button - token is valid');
                }
            } else {
                console.warn('⚠️ Get Token button not found in status bar');
            }
            
            console.log('✅ Token status updated successfully');
            return tokenInfo;
            
        } catch (error) {
            console.error('❌ Error updating token status:', error);
            
            // Set error state
            if (this.statusIcon) this.statusIcon.textContent = '🚨';
            if (this.statusText) this.statusText.textContent = 'Error checking token';
            if (this.statusBar) this.statusBar.className = 'token-status-indicator error';
            
            // Show Get Token button on error
            if (this.getTokenButton) {
                this.getTokenButton.style.display = 'inline-block';
            }
            
            return {
                status: 'error',
                message: 'Error checking token',
                timeRemaining: null,
                isExpired: true,
                isExpiring: false
            };
        }
    }

    /**
     * Set error state
     */
    setErrorState() {
        if (this.statusIcon) this.statusIcon.textContent = '🚨';
        if (this.statusText) this.statusText.textContent = 'Token error';
        if (this.statusBar) this.statusBar.className = 'token-status-indicator error';
        if (this.getTokenButton) this.getTokenButton.style.display = 'inline-block';
    }

    /**
     * Refresh token status
     */
    async refreshStatus() {
        console.log('Manually refreshing token status...');
        await this.updateStatus();
    }

    /**
     * Get new token
     */
    async getNewToken() {
        try {
            console.log('Requesting new token...');
            
            const response = await fetch('/api/pingone/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get token: ${response.status}`);
            }

            const data = await response.json();
            
            // Store token in localStorage
            const expiryTime = Date.now() + (data.expires_in * 1000);
            localStorage.setItem('pingone_worker_token', data.access_token);
            localStorage.setItem('pingone_token_expiry', expiryTime.toString());

            // Update status
            await this.updateStatus();

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('token-updated', {
                detail: { token: data.access_token, expiresIn: data.expires_in }
            }));

            console.log('New token obtained successfully');
        } catch (error) {
            console.error('Error getting new token:', error);
            this.setErrorState();
        }
    }

    /**
     * Show the status indicator
     */
    show() {
        if (this.statusBar) {
            this.statusBar.style.display = 'block';
        }
    }

    /**
     * Hide the status indicator
     */
    hide() {
        if (this.statusBar) {
            this.statusBar.style.display = 'none';
        }
    }

    /**
     * Destroy the indicator
     */
    destroy() {
        this.stopRefreshTimer();
        
        if (this.statusBar && this.statusBar.parentNode) {
            this.statusBar.parentNode.removeChild(this.statusBar);
        }
        
        this.isInitialized = false;
    }

    /**
     * Get current status
     */
    getCurrentStatus() {
        return this.getTokenInfo();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenStatusIndicator;
} else {
    // Browser environment
    window.TokenStatusIndicator = TokenStatusIndicator;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tokenStatusIndicator = new TokenStatusIndicator();
    });
} else {
    window.tokenStatusIndicator = new TokenStatusIndicator();
} 