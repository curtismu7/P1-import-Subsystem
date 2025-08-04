/**
 * @module
 * @description ES Module (converted from CommonJS)
 */

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
     * Initialize the Token Manager subsystem (alias for compatibility)
     */
    async init() {
        return await this.initialize();
    }

    /**
     * Initialize the Token Manager subsystem
     */
    async initialize() {
        try {
            this.logTokenManager('info', '🚀 Initializing Token Manager UI...');
            
            this.setupEventListeners();
            await this.autoLoadCurrentToken();
            this.setupAutoRefresh();
            this.isInitialized = true;
            
            // Run startup test
            await this.runStartupTest();
            
            this.logTokenManager('success', '✅ Token Manager initialized successfully');
            return { success: true };
        } catch (error) {
            this.logTokenManager('error', '❌ Failed to initialize Token Manager', { error: error.message });
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
     * Auto-load current token on page load with comprehensive fallback
     */
    async autoLoadCurrentToken() {
        this.logTokenManager('info', '🔄 Auto-loading current token...');
        
        try {
            // Step 1: Try to load from localStorage first
            const storedToken = this.loadStoredToken();
            if (storedToken) {
                this.logTokenManager('success', '✅ Token loaded from localStorage');
                return storedToken;
            }
            
            // Step 2: Try to fetch current token from server
            this.logTokenManager('info', '🌐 Attempting to fetch current token from server...');
            try {
                const response = await this.retryFetch('/api/v1/auth/token');
                const data = await response.json();
                
                if (data.success && data.token) {
                    this.logTokenManager('success', '✅ Current token fetched from server');
                    
                    // Store and display the token
                    const tokenTextarea = document.getElementById('raw-token-display');
                    if (tokenTextarea) {
                        tokenTextarea.value = data.token;
                    }
                    
                    // Store token with metadata
                    const tokenInfo = this.storeToken({
                        token: data.token,
                        expiresAt: data.tokenInfo?.expiresAt,
                        environmentId: data.tokenInfo?.environmentId,
                        environmentName: data.tokenInfo?.environmentName,
                        region: data.tokenInfo?.region
                    });
                    
                    // Update status display
                    this.updateTokenStatusDisplay({
                        valid: true,
                        date: new Date().toLocaleString(),
                        expiresIn: tokenInfo?.expiresAt ? `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}` : 'Not Available',
                        environmentId: tokenInfo?.environmentId || 'Not Available',
                        environmentName: tokenInfo?.environmentName || 'Not Available',
                        region: tokenInfo?.region || 'Not Available'
                    });
                    
                    return tokenInfo;
                }
            } catch (serverError) {
                this.logTokenManager('warning', '⚠️ Server token fetch failed', { error: serverError.message });
            }
            
            // Step 3: No token available - show "No token found" state
            this.logTokenManager('info', '📭 No token found - showing empty state');
            this.showNoTokenState();
            return null;
            
        } catch (error) {
            this.logTokenManager('error', '❌ Auto-load token failed', { error: error.message });
            this.showNoTokenState();
            return null;
        }
    }
    
    /**
     * Show "No token found" state
     */
    showNoTokenState() {
        this.logTokenManager('info', '📭 Displaying no token state');
        
        // Clear token display
        const tokenTextarea = document.getElementById('raw-token-display');
        if (tokenTextarea) {
            tokenTextarea.value = 'No token found. Click "Get Current Token" to retrieve a token.';
        }
        
        // Update status display
        this.updateTokenStatusDisplay({
            valid: false,
            date: new Date().toLocaleString(),
            expiresIn: 'No token found',
            environmentId: 'No token found',
            environmentName: 'No token found',
            region: 'No token found'
        });
        
        // Show user-friendly message in UI
        this.showTemporaryFeedback('No token found. Please retrieve a token to continue.', 'info');
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
                        date: new Date().toLocaleString(),
                        expiresIn: `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}`,
                        environmentId: tokenInfo.environmentId,
                        environmentName: tokenInfo.environmentName || 'Not Available',
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
        this.logTokenManager('info', '🔄 Updating token status display', statusData);
        
        try {
            // Validate data before rendering
            const validatedData = this.validateStatusData(statusData);
            
            // Date
            const dateElement = document.getElementById('token-date');
            if (dateElement) {
                const currentDate = new Date().toLocaleString();
                dateElement.textContent = validatedData.date || currentDate;
                dateElement.title = `Last updated: ${currentDate}`;
            } else {
                this.logTokenManager('warning', '⚠️ Date element not found');
            }
            
            // Status indicator
            const statusElement = document.getElementById('token-status-indicator');
            if (statusElement) {
                const status = validatedData.valid ? 'VALID' : validatedData.error ? 'ERROR' : 'UNKNOWN';
                const color = validatedData.valid ? '#28a745' : validatedData.error ? '#dc3545' : '#ffc107';
                const bgColor = validatedData.valid ? '#d4edda' : validatedData.error ? '#f8d7da' : '#fff3cd';
                
                statusElement.innerHTML = `<span style="color: ${color}; background: ${bgColor}; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: bold; font-size: 0.8rem;">${status}</span>`;
                statusElement.setAttribute('data-status', status.toLowerCase());
            } else {
                this.logTokenManager('warning', '⚠️ Status indicator element not found');
            }
            
            // Environment ID
            const envElement = document.getElementById('token-environment-id');
            if (envElement) {
                const envId = validatedData.environmentId || 'Not Available';
                envElement.textContent = envId;
                envElement.title = envId.length > 20 ? envId : 'Click to copy Environment ID';
                
                // Add click to copy functionality
                envElement.onclick = () => this.copyToClipboard(envId, 'Environment ID');
            }
            
            // Environment Name
            const envNameElement = document.getElementById('token-environment-name');
            if (envNameElement) {
                const envName = validatedData.environmentName || 'Not Available';
                envNameElement.textContent = envName;
                envNameElement.title = envName.length > 20 ? envName : 'Click to copy Environment Name';
                
                // Add click to copy functionality
                envNameElement.onclick = () => this.copyToClipboard(envName, 'Environment Name');
            }
            
            this.logTokenManager('success', '✅ Token status updated successfully', {
                date: validatedData.date,
                status: validatedData.valid ? 'VALID' : validatedData.error ? 'ERROR' : 'UNKNOWN',
                environmentId: validatedData.environmentId,
                environmentName: validatedData.environmentName
            });
        } catch (error) {
            this.logTokenManager('error', '❌ Failed to update token status', { error: error.message });
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
                date: new Date().toLocaleString(),
                expiresIn: 'Checking...', 
                environmentId: 'Loading...', 
                environmentName: 'Loading...',
                region: 'Loading...' 
            });
            
            const response = await this.retryFetch('/api/health');
            const healthData = await response.json();
            
            this.logTokenManager('success', 'Health check completed', healthData);
            
            // Update status based on health data
            this.updateTokenStatusDisplay({
                valid: healthData.status === 'healthy',
                date: new Date().toLocaleString(),
                expiresIn: healthData.tokenExpiry || 'Not Available',
                environmentId: healthData.environmentId || 'Not Available',
                environmentName: healthData.environmentName || 'Not Available',
                region: healthData.region || 'Not Available'
            });
            
        } catch (error) {
            this.logTokenManager('error', 'Refresh Status failed', { error: error.message });
            this.updateTokenStatusDisplay({ 
                valid: false, 
                error: true,
                date: new Date().toLocaleString(),
                expiresIn: 'Error', 
                environmentId: 'Error',
                environmentName: 'Error', 
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
                        date: new Date().toLocaleString(),
                        expiresIn: tokenInfo?.expiresAt ? `Expires ${new Date(tokenInfo.expiresAt).toLocaleString()}` : 'Unknown',
                        environmentId: tokenInfo?.environmentId || 'Not Available',
                        environmentName: tokenInfo?.environmentName || 'Not Available',
                        region: tokenInfo?.region || 'Not Available'
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
        this.logTokenManager('info', '🔍 Decode JWT button clicked');
        
        // Step 1: Validate token exists
        const tokenTextarea = document.getElementById('raw-token-display');
        if (!tokenTextarea || !tokenTextarea.value.trim()) {
            this.logTokenManager('warning', '⚠️ No token available to decode');
            this.showTemporaryFeedback('Please get a token first before decoding', 'warning');
            return;
        }
        
        try {
            const token = tokenTextarea.value.trim();
            
            // Step 2: Validate JWT format
            if (!this.validateJWTFormat(token)) {
                throw new Error('Invalid JWT format');
            }
            
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
                date: new Date().toLocaleString(),
                expiresIn: payload.exp ? `Expires ${new Date(payload.exp * 1000).toLocaleString()}` : 'Unknown',
                environmentId: payload.env || payload.environment_id || payload.aud || 'Not Available',
                environmentName: payload.environment_name || payload.env_name || this.extractEnvironmentName(payload) || 'Not Available',
                region: payload.region || 'Not Available'
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
                date: new Date().toLocaleString(),
                expiresIn: 'No token',
                environmentId: 'No token',
                environmentName: 'No token',
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
     * Validate status data before rendering
     */
    validateStatusData(statusData) {
        const validated = {
            valid: Boolean(statusData?.valid),
            error: Boolean(statusData?.error),
            date: statusData?.date || new Date().toLocaleString(),
            environmentId: this.sanitizeValue(statusData?.environmentId),
            environmentName: this.sanitizeValue(statusData?.environmentName),
            expiresIn: this.sanitizeValue(statusData?.expiresIn),
            region: this.sanitizeValue(statusData?.region)
        };
        
        this.logTokenManager('info', '🔍 Data validation completed', validated);
        return validated;
    }
    
    /**
     * Sanitize values to prevent XSS and handle empty values
     */
    sanitizeValue(value) {
        if (!value || value === 'undefined' || value === 'null') {
            return 'Not Available';
        }
        
        // Basic XSS prevention
        if (typeof value === 'string') {
            return value.replace(/[<>"'&]/g, (match) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                    '&': '&amp;'
                };
                return entities[match];
            });
        }
        
        return String(value);
    }
    
    /**
     * Copy text to clipboard with user feedback
     */
    async copyToClipboard(text, label) {
        if (!text || text === 'Not Available') {
            this.logTokenManager('warning', `⚠️ Cannot copy ${label}: No data available`);
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.logTokenManager('success', `📋 ${label} copied to clipboard`, { text: text.substring(0, 50) + '...' });
            
            // Show temporary feedback
            this.showTemporaryFeedback(`${label} copied!`, 'success');
            
        } catch (error) {
            this.logTokenManager('error', `❌ Failed to copy ${label}`, { error: error.message });
            
            // Fallback: select text for manual copy
            this.selectText(text);
            this.showTemporaryFeedback(`Select and copy ${label} manually`, 'warning');
        }
    }
    
    /**
     * Select text for manual copying
     */
    selectText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
    
    /**
     * Validate JWT format before decoding
     */
    validateJWTFormat(token) {
        try {
            // Basic format check
            if (!token || typeof token !== 'string') {
                this.logTokenManager('error', '❌ Token validation failed: Not a string');
                return false;
            }
            
            // Check for JWT pattern (3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                this.logTokenManager('error', '❌ Token validation failed: Invalid JWT structure', { parts: parts.length });
                return false;
            }
            
            // Validate each part is base64 encoded
            for (let i = 0; i < 2; i++) { // Only validate header and payload, not signature
                try {
                    atob(parts[i]);
                } catch (e) {
                    this.logTokenManager('error', `❌ Token validation failed: Part ${i + 1} not valid base64`);
                    return false;
                }
            }
            
            // Try to parse header and payload
            try {
                const header = JSON.parse(atob(parts[0]));
                const payload = JSON.parse(atob(parts[1]));
                
                // Basic JWT structure validation
                if (!header.alg || !header.typ) {
                    this.logTokenManager('error', '❌ Token validation failed: Invalid header structure');
                    return false;
                }
                
                if (!payload.iss && !payload.sub && !payload.aud) {
                    this.logTokenManager('warning', '⚠️ Token validation warning: Missing standard JWT claims');
                }
                
                this.logTokenManager('success', '✅ JWT format validation passed');
                return true;
                
            } catch (parseError) {
                this.logTokenManager('error', '❌ Token validation failed: JSON parse error', { error: parseError.message });
                return false;
            }
            
        } catch (error) {
            this.logTokenManager('error', '❌ Token validation failed: Unexpected error', { error: error.message });
            return false;
        }
    }
    
    /**
     * Extract environment name from JWT payload
     */
    extractEnvironmentName(payload) {
        // Try various common fields that might contain environment name
        const possibleFields = [
            'environment_name',
            'env_name', 
            'environmentName',
            'envName',
            'name',
            'environment'
        ];
        
        for (const field of possibleFields) {
            if (payload[field] && typeof payload[field] === 'string') {
                return payload[field];
            }
        }
        
        // Try to extract from issuer URL
        if (payload.iss && typeof payload.iss === 'string') {
            const match = payload.iss.match(/\/([a-f0-9-]{36})\//i);
            if (match) {
                return `Environment (${match[1].substring(0, 8)}...)`;
            }
        }
        
        return null;
    }
    
    /**
     * Run startup test to verify token loading and UI state
     */
    async runStartupTest() {
        this.logTokenManager('info', '🧪 Running startup test...');
        
        try {
            const testResults = {
                tokenLoaded: false,
                statusBoxesFilled: false,
                uiResponsive: false,
                noErrors: true
            };
            
            // Test 1: Check if token was loaded
            const tokenTextarea = document.getElementById('raw-token-display');
            if (tokenTextarea && tokenTextarea.value && tokenTextarea.value.trim() !== '') {
                testResults.tokenLoaded = true;
                this.logTokenManager('success', '✅ Startup test: Token loaded successfully');
            } else {
                this.logTokenManager('info', '📭 Startup test: No token loaded (expected if no token available)');
            }
            
            // Test 2: Check if status boxes are filled
            const statusElements = [
                'token-date',
                'token-status', 
                'token-environment-id',
                'token-environment-name'
            ];
            
            let filledBoxes = 0;
            statusElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element && element.textContent && element.textContent.trim() !== '') {
                    filledBoxes++;
                }
            });
            
            if (filledBoxes === statusElements.length) {
                testResults.statusBoxesFilled = true;
                this.logTokenManager('success', '✅ Startup test: All status boxes filled');
            } else {
                this.logTokenManager('info', `📊 Startup test: ${filledBoxes}/${statusElements.length} status boxes filled`);
            }
            
            // Test 3: Check UI responsiveness
            const criticalElements = [
                'get-current-token',
                'decode-token',
                'clear-token',
                'raw-token-display'
            ];
            
            let responsiveElements = 0;
            criticalElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                if (element) {
                    responsiveElements++;
                }
            });
            
            if (responsiveElements === criticalElements.length) {
                testResults.uiResponsive = true;
                this.logTokenManager('success', '✅ Startup test: UI elements responsive');
            } else {
                this.logTokenManager('warning', `⚠️ Startup test: ${responsiveElements}/${criticalElements.length} UI elements found`);
                testResults.noErrors = false;
            }
            
            // Test 4: Validate no stale data
            const currentTime = new Date().toLocaleString();
            const dateElement = document.getElementById('token-date');
            if (dateElement && dateElement.textContent) {
                const displayedTime = dateElement.textContent;
                // Check if time is recent (within last 5 minutes)
                const timeDiff = Math.abs(new Date() - new Date(displayedTime));
                if (timeDiff < 5 * 60 * 1000) { // 5 minutes
                    this.logTokenManager('success', '✅ Startup test: No stale data detected');
                } else {
                    this.logTokenManager('warning', '⚠️ Startup test: Potentially stale timestamp detected');
                }
            }
            
            // Summary
            const passedTests = Object.values(testResults).filter(result => result === true).length;
            const totalTests = Object.keys(testResults).length;
            
            this.logTokenManager('info', `📊 Startup test completed: ${passedTests}/${totalTests} tests passed`, testResults);
            
            if (testResults.noErrors) {
                this.logTokenManager('success', '✅ Startup test: All critical tests passed');
            } else {
                this.logTokenManager('warning', '⚠️ Startup test: Some issues detected but not critical');
            }
            
            return testResults;
            
        } catch (error) {
            this.logTokenManager('error', '❌ Startup test failed', { error: error.message });
            return { error: error.message };
        }
    }
    
    /**
     * Show temporary feedback message
     */
    showTemporaryFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
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
if (typeof window !== 'undefined') {
    window.TokenManagerSubsystem = TokenManagerSubsystem;
}

// ES Module export
export default TokenManagerSubsystem;
