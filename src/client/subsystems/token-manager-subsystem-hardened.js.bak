/**
 * Token Manager Subsystem - Enhanced and Hardened Version
 * Manages PingOne access tokens with comprehensive error handling,
 * retry mechanisms, auto-refresh, and robust status updates
 */

class TokenManagerSubsystem {
    constructor(logger, uiManager, localClient) {
        this.logger = logger;
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.isInitialized = false;
        this.autoRefreshInterval = null;
        this.tokenHistory = [];
        
        // Enhanced logging function with timestamp and module tag
        this.logTokenManager = (level, message, data = {}) => {
            const timestamp = new Date().toISOString();
            const emoji = level === 'info' ? '📋' : level === 'success' ? '✅' : level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '🔧';
            console.log(`${emoji} [TOKEN-MANAGER] ${timestamp} ${message}`, data);
        };
        
        this.logger.info('Token Manager subsystem constructed');
    }

    /**
     * Initialize the Token Manager subsystem
     */
    async initialize() {
        try {
            this.logTokenManager('info', 'Initializing Token Manager UI...');
            
            this.setupEventListeners();
            this.loadStoredToken();
            this.setupAutoRefresh();
            this.isInitialized = true;
            
            this.logTokenManager('success', 'Token Manager initialized successfully');
            return { success: true };
        } catch (error) {
            this.logTokenManager('error', 'Failed to initialize Token Manager', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Enhanced retry fetch with exponential backoff
     */
    async retryFetch(url, options = {}, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logTokenManager('info', `API call attempt ${attempt}/${maxRetries}`, { url });
                const response = await fetch(url, options);
                
                if (response.ok) {
                    this.logTokenManager('success', `API call successful on attempt ${attempt}`, { url });
                    return response;
                } else if (attempt === maxRetries) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                
            } catch (error) {
                if (attempt === maxRetries) {
                    this.logTokenManager('error', `API call failed after ${maxRetries} attempts`, { url, error: error.message });
                    throw error;
                }
                this.logTokenManager('warning', `API call attempt ${attempt} failed, retrying...`, { url, error: error.message });
            }
        }
    }

    /**
     * Enhanced token storage with localStorage persistence
     */
    storeToken(tokenData) {
        try {
            const tokenInfo = {
                token: tokenData.token,
                timestamp: new Date().toISOString(),
                expiresAt: tokenData.expiresAt,
                environmentId: tokenData.environmentId,
                region: tokenData.region
            };
            localStorage.setItem('pingone_token_cache', JSON.stringify(tokenInfo));
            this.logTokenManager('success', 'Token stored in localStorage', { timestamp: tokenInfo.timestamp });
            return tokenInfo;
        } catch (error) {
            this.logTokenManager('error', 'Failed to store token', { error: error.message });
            return null;
        }
    }

    /**
     * Load token from localStorage on page load
     */
    loadStoredToken() {
        try {
            const stored = localStorage.getItem('pingone_token_cache');
            if (stored) {
                const tokenInfo = JSON.parse(stored);
                this.logTokenManager('info', 'Found stored token', { timestamp: tokenInfo.timestamp });
                
                // Check if token is still valid (not expired)
                if (tokenInfo.expiresAt && new Date(tokenInfo.expiresAt) > new Date()) {
                    const tokenTextarea = document.getElementById('raw-token-display');
                    if (tokenTextarea) {
                        tokenTextarea.value = tokenInfo.token;
                        this.logTokenManager('success', 'Restored valid token from storage');
                    }
                    
                    // Update status
                    this.updateTokenStatusDisplay({
                        valid: true,
                        expiresIn: `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        environmentId: tokenInfo.environmentId,
                        region: tokenInfo.region
                    });
                    
                    return tokenInfo;
                } else {
                    this.logTokenManager('warning', 'Stored token is expired, clearing cache');
                    localStorage.removeItem('pingone_token_cache');
                }
            }
        } catch (error) {
            this.logTokenManager('error', 'Failed to load stored token', { error: error.message });
        }
        return null;
    }

    /**
     * Setup enhanced event listeners for all buttons
     */
    setupEventListeners() {
        // Enhanced event listeners with comprehensive error handling
        const buttonEnhancements = {
            // 1. Refresh Status Button
            'refresh-token-status': {
                name: 'Refresh Status',
                handler: () => this.refreshTokenStatus()
            },
            
            // 2. Get Current Token Button
            'get-current-token': {
                name: 'Get Current Token',
                handler: () => this.getCurrentToken()
            },
            
            // 3. Decode JWT Button
            'decode-token': {
                name: 'Decode JWT',
                handler: () => this.decodeJWT()
            },
            
            // 4. Copy Token Button
            'copy-token': {
                name: 'Copy Token',
                handler: () => this.copyToken()
            },
            
            // 5. Refresh Access Token Button
            'refresh-access-token': {
                name: 'Refresh Access Token',
                handler: () => this.refreshAccessToken()
            },
            
            // 6. Clear Token Button
            'clear-token': {
                name: 'Clear Token',
                handler: () => this.clearToken()
            },
            
            // 7. Test Token Button
            'test-token': {
                name: 'Test Token',
                handler: () => this.testToken()
            },
            
            // 8. Clear History Button
            'clear-token-history': {
                name: 'Clear History',
                handler: () => this.clearTokenHistory()
            }
        };

        // Apply enhanced event listeners to buttons
        Object.keys(buttonEnhancements).forEach(buttonId => {
            const button = document.getElementById(buttonId);
            const enhancement = buttonEnhancements[buttonId];
            
            if (button) {
                // Remove existing listeners by cloning
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add enhanced event listener
                newButton.addEventListener('click', enhancement.handler);
                
                this.logTokenManager('success', `Enhanced event listener added for ${enhancement.name}`, { buttonId });
            } else {
                this.logTokenManager('warning', `Button not found: ${buttonId}`);
            }
        });

        this.logTokenManager('success', 'All enhanced event listeners setup complete');
    }

    /**
     * Enhanced status update function with fail-safe DOM checking
     */
    updateTokenStatusDisplay(statusData) {
        this.logTokenManager('info', 'Updating token status display', statusData);
        
        try {
            // Status indicator
            const statusElement = document.getElementById('token-status-indicator');
            if (statusElement) {
                const status = statusData.valid ? 'VALID' : statusData.error ? 'ERROR' : 'UNKNOWN';
                const color = statusData.valid ? 'green' : statusData.error ? 'red' : 'orange';
                statusElement.innerHTML = `<span style="color: ${color}; font-weight: bold;">${status}</span>`;
                statusElement.setAttribute('data-status', status.toLowerCase());
            } else {
                this.logTokenManager('warning', 'Status indicator element not found');
            }
            
            // Expires in
            const expiresElement = document.getElementById('token-expires-in');
            if (expiresElement) {
                if (statusData.expiresIn) {
                    expiresElement.textContent = statusData.expiresIn;
                    expiresElement.style.color = statusData.expiresIn.includes('expired') ? 'red' : 'black';
                } else {
                    expiresElement.textContent = 'Unknown';
                }
            }
            
            // Environment ID
            const envElement = document.getElementById('token-environment-id');
            if (envElement) {
                envElement.textContent = statusData.environmentId || 'Unknown';
            }
            
            // Region
            const regionElement = document.getElementById('token-region');
            if (regionElement) {
                regionElement.textContent = statusData.region || 'Unknown';
            }
            
            this.logTokenManager('success', 'Token status updated successfully');
        } catch (error) {
            this.logTokenManager('error', 'Failed to update token status', { error: error.message });
        }
    }

    /**
     * Refresh token status with enhanced error handling
     */
    async refreshTokenStatus() {
        this.logTokenManager('info', 'Refresh Status button clicked');
        
        try {
            // Show loading state
            this.updateTokenStatusDisplay({ 
                valid: false, 
                expiresIn: 'Checking...', 
                environmentId: 'Loading...', 
                region: 'Loading...' 
            });
            
            const response = await this.retryFetch('/api/health');
            const healthData = await response.json();
            
            this.logTokenManager('success', 'Health check completed', healthData);
            
            // Update status based on health data
            this.updateTokenStatusDisplay({
                valid: healthData.status === 'healthy',
                expiresIn: healthData.tokenExpiry || 'Unknown',
                environmentId: healthData.environmentId || 'Unknown',
                region: healthData.region || 'Unknown'
            });
            
        } catch (error) {
            this.logTokenManager('error', 'Refresh Status failed', { error: error.message });
            this.updateTokenStatusDisplay({ 
                valid: false, 
                error: true,
                expiresIn: 'Error', 
                environmentId: 'Error', 
                region: 'Error' 
            });
        }
    }

    /**
     * Get current token with enhanced error handling
     */
    async getCurrentToken() {
        this.logTokenManager('info', 'Get Current Token button clicked');
        
        try {
            const response = await this.retryFetch('/api/v1/auth/token');
            const data = await response.json();
            
            if (data.success && data.token) {
                const tokenTextarea = document.getElementById('raw-token-display');
                if (tokenTextarea) {
                    tokenTextarea.value = data.token;
                    this.logTokenManager('success', 'Token fetched and displayed');
                    
                    // Store token with expiry info
                    const tokenInfo = this.storeToken({
                        token: data.token,
                        expiresAt: data.tokenInfo?.expiresAt,
                        environmentId: data.tokenInfo?.environmentId,
                        region: data.tokenInfo?.region
                    });
                    
                    // Update status
                    this.updateTokenStatusDisplay({
                        valid: true,
                        expiresIn: tokenInfo?.expiresAt ? `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}` : 'Unknown',
                        environmentId: tokenInfo?.environmentId || 'Unknown',
                        region: tokenInfo?.region || 'Unknown'
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to fetch token');
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Get Current Token failed', { error: error.message });
            const tokenTextarea = document.getElementById('raw-token-display');
            if (tokenTextarea) {
                tokenTextarea.value = `Error: ${error.message}`;
            }
            this.updateTokenStatusDisplay({ valid: false, error: true });
        }
    }

    /**
     * Decode JWT with enhanced error handling
     */
    decodeJWT() {
        this.logTokenManager('info', 'Decode JWT button clicked');
        
        const tokenTextarea = document.getElementById('raw-token-display');
        if (!tokenTextarea || !tokenTextarea.value.trim()) {
            this.logTokenManager('warning', 'No token available to decode');
            alert('Please get a token first before decoding');
            return;
        }
        
        try {
            const token = tokenTextarea.value.trim();
            const parts = token.split('.');
            
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format - must have 3 parts separated by dots');
            }
            
            // Decode header and payload
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            const decoded = {
                header: header,
                payload: payload,
                signature: parts[2] + ' (signature - not decoded for security)',
                decoded_at: new Date().toISOString()
            };
            
            tokenTextarea.value = JSON.stringify(decoded, null, 2);
            this.logTokenManager('success', 'JWT decoded successfully', { 
                algorithm: header.alg, 
                issuer: payload.iss,
                expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Unknown'
            });
            
            // Update status with decoded info
            this.updateTokenStatusDisplay({
                valid: true,
                expiresIn: payload.exp ? `Expires ${new Date(payload.exp * 1000).toLocaleString()}` : 'Unknown',
                environmentId: payload.env || payload.environment_id || 'Unknown',
                region: payload.region || 'Unknown'
            });
            
        } catch (error) {
            this.logTokenManager('error', 'JWT decode failed', { error: error.message });
            tokenTextarea.value = `Decode Error: ${error.message}`;
            this.updateTokenStatusDisplay({ valid: false, error: true });
        }
    }

    /**
     * Copy token to clipboard with visual feedback
     */
    async copyToken() {
        this.logTokenManager('info', 'Copy Token button clicked');
        
        const tokenTextarea = document.getElementById('raw-token-display');
        if (!tokenTextarea || !tokenTextarea.value.trim()) {
            this.logTokenManager('warning', 'No token available to copy');
            alert('No token available to copy');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(tokenTextarea.value);
            this.logTokenManager('success', 'Token copied to clipboard');
            
            // Visual feedback
            const button = document.getElementById('copy-token');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Copy to clipboard failed', { error: error.message });
            alert('Failed to copy token to clipboard');
        }
    }

    /**
     * Refresh access token with enhanced error handling
     */
    async refreshAccessToken() {
        this.logTokenManager('info', 'Refresh Access Token button clicked');
        
        try {
            // Show loading state
            const button = document.getElementById('refresh-access-token');
            if (button) {
                button.disabled = true;
                button.textContent = 'Refreshing...';
            }
            
            const response = await this.retryFetch('/api/v1/auth/refresh', { method: 'POST' });
            const data = await response.json();
            
            if (data.success && data.token) {
                const tokenTextarea = document.getElementById('raw-token-display');
                if (tokenTextarea) {
                    tokenTextarea.value = data.token;
                }
                
                // Store refreshed token
                const tokenInfo = this.storeToken({
                    token: data.token,
                    expiresAt: data.tokenInfo?.expiresAt,
                    environmentId: data.tokenInfo?.environmentId,
                    region: data.tokenInfo?.region
                });
                
                this.logTokenManager('success', 'Token refreshed successfully');
                
                // Update status
                this.updateTokenStatusDisplay({
                    valid: true,
                    expiresIn: tokenInfo?.expiresAt ? `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}` : 'Unknown',
                    environmentId: tokenInfo?.environmentId || 'Unknown',
                    region: tokenInfo?.region || 'Unknown'
                });
                
            } else {
                throw new Error(data.message || 'Failed to refresh token');
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Token refresh failed', { error: error.message });
            this.updateTokenStatusDisplay({ valid: false, error: true });
            alert(`Token refresh failed: ${error.message}`);
        } finally {
            // Restore button state
            const button = document.getElementById('refresh-access-token');
            if (button) {
                button.disabled = false;
                button.textContent = 'Refresh Token';
            }
        }
    }

    /**
     * Clear token with enhanced feedback
     */
    clearToken() {
        this.logTokenManager('info', 'Clear Token button clicked');
        
        try {
            // Clear textarea
            const tokenTextarea = document.getElementById('raw-token-display');
            if (tokenTextarea) {
                tokenTextarea.value = '';
            }
            
            // Clear localStorage
            localStorage.removeItem('pingone_token_cache');
            
            // Reset status
            this.updateTokenStatusDisplay({
                valid: false,
                expiresIn: 'No token',
                environmentId: 'No token',
                region: 'No token'
            });
            
            this.logTokenManager('success', 'Token cleared from memory and storage');
            
            // Visual feedback
            const button = document.getElementById('clear-token');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Cleared!';
                button.style.backgroundColor = '#ffc107';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Clear token failed', { error: error.message });
        }
    }

    /**
     * Test token with enhanced error handling
     */
    async testToken() {
        this.logTokenManager('info', 'Test Token button clicked');
        
        const tokenTextarea = document.getElementById('raw-token-display');
        if (!tokenTextarea || !tokenTextarea.value.trim()) {
            this.logTokenManager('warning', 'No token available to test');
            alert('Please get a token first before testing');
            return;
        }
        
        try {
            // Show loading state
            const button = document.getElementById('test-token');
            if (button) {
                button.disabled = true;
                button.textContent = 'Testing...';
            }
            
            // Test token by making a test API call
            const response = await fetch('/api/pingone/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: tokenTextarea.value.trim()
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.logTokenManager('success', 'Token test passed', result);
                
                this.updateTokenStatusDisplay({
                    valid: true,
                    expiresIn: result.tokenInfo?.expiresIn || 'Valid',
                    environmentId: result.environmentId || 'Valid',
                    region: result.region || 'Valid'
                });
                
                alert('✅ Token is valid and working!');
            } else {
                throw new Error(result.message || 'Token test failed');
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Token test failed', { error: error.message });
            this.updateTokenStatusDisplay({ valid: false, error: true });
            alert(`❌ Token test failed: ${error.message}`);
        } finally {
            // Restore button state
            const button = document.getElementById('test-token');
            if (button) {
                button.disabled = false;
                button.textContent = 'Test Token';
            }
        }
    }

    /**
     * Clear token history with enhanced feedback
     */
    clearTokenHistory() {
        this.logTokenManager('info', 'Clear History button clicked');
        
        try {
            // Clear history from localStorage
            localStorage.removeItem('tokenManagerHistory');
            
            // Update history display
            const historyContainer = document.getElementById('token-history-container');
            if (historyContainer) {
                historyContainer.innerHTML = `
                    <div class="no-history-message">
                        <i class="fas fa-info-circle"></i>
                        <p>No token history available. Token operations will appear here.</p>
                    </div>
                `;
            }
            
            this.logTokenManager('success', 'Token history cleared');
            
            // Visual feedback
            const button = document.getElementById('clear-token-history');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Cleared!';
                button.style.backgroundColor = '#6c757d';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            }
            
        } catch (error) {
            this.logTokenManager('error', 'Clear history failed', { error: error.message });
        }
    }

    /**
     * Setup auto-refresh mechanism for expired tokens
     */
    setupAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            const stored = localStorage.getItem('pingone_token_cache');
            if (stored) {
                try {
                    const tokenInfo = JSON.parse(stored);
                    if (tokenInfo.expiresAt) {
                        const expiryTime = new Date(tokenInfo.expiresAt);
                        const now = new Date();
                        const timeUntilExpiry = expiryTime - now;
                        
                        // If token expires in less than 5 minutes, show warning
                        if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
                            this.logTokenManager('warning', 'Token expires soon', { 
                                expiresAt: tokenInfo.expiresAt,
                                minutesRemaining: Math.floor(timeUntilExpiry / 60000)
                            });
                            
                            this.updateTokenStatusDisplay({
                                valid: true,
                                expiresIn: `⚠️ Expires in ${Math.floor(timeUntilExpiry / 60000)} minutes`,
                                environmentId: tokenInfo.environmentId || 'Unknown',
                                region: tokenInfo.region || 'Unknown'
                            });
                        }
                        
                        // If token is expired, clear it
                        if (timeUntilExpiry <= 0) {
                            this.logTokenManager('warning', 'Token has expired, clearing cache');
                            localStorage.removeItem('pingone_token_cache');
                            this.updateTokenStatusDisplay({
                                valid: false,
                                expiresIn: '❌ Expired',
                                environmentId: 'Token expired',
                                region: 'Token expired'
                            });
                        }
                    }
                } catch (error) {
                    this.logTokenManager('error', 'Error checking token expiry', { error: error.message });
                }
            }
        }, 60000); // Check every minute
        
        this.logTokenManager('success', 'Auto-refresh mechanism enabled (checks every minute)');
    }

    /**
     * Validate status elements
     */
    validateTokenStatus() {
        const statusElement = document.getElementById('token-status-indicator');
        const expiresElement = document.getElementById('token-expires-in');
        const envElement = document.getElementById('token-environment-id');
        const regionElement = document.getElementById('token-region');
        
        const validation = {
            statusElement: !!statusElement,
            expiresElement: !!expiresElement,
            envElement: !!envElement,
            regionElement: !!regionElement,
            allValid: !!(statusElement && expiresElement && envElement && regionElement)
        };
        
        this.logTokenManager('info', 'Status element validation', validation);
        return validation;
    }

    /**
     * Cleanup method
     */
    cleanup() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        this.logTokenManager('info', 'Token Manager cleanup completed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenManagerSubsystem;
} else if (typeof window !== 'undefined') {
    window.TokenManagerSubsystem = TokenManagerSubsystem;
}
