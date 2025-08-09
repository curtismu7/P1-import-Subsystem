/**
 * Token Management Page Module
 * 
 * Handles the Token Management page functionality including:
 * - Token status monitoring
 * - Manual token refresh
 * - Token history and analytics
 * - Connection testing
 */

export class TokenManagementPage {
    constructor(app) {
        this.app = app;
        this.tokenHistory = [];
        this.refreshInterval = null;
        this.tokenAnalytics = null;
    }

    async load() {
        console.log('📄 Loading Token Management page...');
        
        const tokenPage = document.getElementById('token-management-page');
        if (!tokenPage) {
            console.error('❌ Token management page div not found');
            return;
        }
        
        // Debug: Check what tokens are available in localStorage
        console.log('🔍 Checking localStorage for tokens...');
        const keys = ['pingone_token_cache', 'pingone_token', 'pingone_worker_token', 'accessToken'];
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`🔍 ${key}:`, value ? 'Found' : 'Not found');
            if (value) {
                console.log(`🔍 ${key} value:`, value.substring(0, 100) + '...');
            }
        });

        tokenPage.innerHTML = `
            <div class="page-header">
                <h1>Token Management</h1>
                <p>Monitor and manage PingOne authentication tokens</p>
            </div>

            <div class="token-management-container">
                <!-- Token Status Section -->
                <section class="token-section">
                    <h2 class="section-title">Token Status</h2>
                    <div class="token-box">
                        <div class="token-status-display">
                            <div class="status-inline">
                                <div class="status-indicator status-unknown" id="token-status-indicator">
                                    <span class="status-dot" aria-hidden="true"></span>
                                </div>
                                <div class="status-text" id="token-status-text">Checking...</div>
                            </div>
                            
                            <div class="token-details">
                                <div class="detail-row">
                                    <strong>Token Type:</strong>
                                    <span id="token-type">-</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Expires At:</strong>
                                    <span id="token-expires">-</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Time Remaining:</strong>
                                    <span id="token-remaining">-</span>
                                </div>
                                <div class="detail-row">
                                    <strong>Scope:</strong>
                                    <span id="token-scope">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Raw Token Section -->
                <section class="token-section">
                    <h2 class="section-title">Raw Token</h2>
                    <div class="token-box">
                        <div class="raw-token-display">
                            <div class="token-string-container">
                                <label for="token-string">Raw Token:</label>
                                <textarea id="token-string" class="token-string" placeholder="Paste your JWT token here or get a token using the 'Get Token' button"></textarea>
                                <div class="token-actions">
                                    <button id="get-token-btn" class="btn btn-primary">
                                        <i class="fas fa-key"></i> Get Token
                                    </button>
                                    <button id="copy-token-btn" class="btn btn-secondary">
                                        <i class="fas fa-copy"></i> Copy Token
                                    </button>
                                    <button id="decode-token-btn" class="btn btn-info">
                                        <i class="fas fa-code"></i> Decode JWT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Decoded Token Section -->
                <section class="token-section">
                    <h2 class="section-title">Decoded Token</h2>
                    <div class="token-box">
                        <div class="decoded-token-display">
                            <div class="jwt-details">
                                <div class="jwt-section">
                                    <h4>Header</h4>
                                    <pre id="jwt-header" class="jwt-content">No token data</pre>
                                </div>
                                <div class="jwt-section">
                                    <h4>Payload</h4>
                                    <pre id="jwt-payload" class="jwt-content">No token data</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Token Controls Section -->
                <section class="token-section">
                    <h2 class="section-title">Token Actions</h2>
                    <div class="token-box">
                        <div class="token-actions">
                            <div class="action-group">
                                <button id="refresh-token-btn" class="btn btn-primary">
                                    <i class="fas fa-sync"></i> Refresh Token
                                </button>
                                <button id="validate-token-btn" class="btn btn-danger">
                                    <i class="fas fa-check-circle"></i> Validate Token
                                </button>
                                <button id="test-connection-btn" class="btn btn-success">
                                    <i class="fas fa-plug"></i> Test Connection
                                </button>
                                <button id="revoke-token-btn" class="btn btn-warning">
                                    <i class="fas fa-ban"></i> Revoke Token
                                </button>
                                <button id="clear-token-btn" class="btn btn-danger">
                                    <i class="fas fa-trash"></i> Clear Token
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Connection Test Results Section -->
                <section id="connection-test-section" class="token-section" style="display: none;">
                    <h2 class="section-title">Connection Test Results</h2>
                    <div class="token-box">
                        <div id="connection-test-results">
                            <!-- Test results will be populated here -->
                        </div>
                    </div>
                </section>

                <!-- Token History Section -->
                <section class="token-section">
                    <div class="section-header">
                        <h2 class="section-title">Token History</h2>
                        <button id="clear-history-btn" class="btn btn-outline-secondary btn-sm">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                    </div>
                    <div class="token-box">
                        <div id="token-history-list" class="token-history">
                            <p class="text-muted">No token history available</p>
                        </div>
                    </div>
                </section>

                <!-- Token Analytics Section -->
                <section class="token-section">
                    <h2 class="section-title">Token Analytics</h2>
                    <div class="token-box">
                        <div class="analytics-grid">
                            <div class="stat-card">
                                <div class="stat-number" id="total-requests">0</div>
                                <div class="stat-label">Total Requests</div>
                            </div>
                            <div class="stat-card success">
                                <div class="stat-number" id="successful-requests">0</div>
                                <div class="stat-label">Successful</div>
                            </div>
                            <div class="stat-card error">
                                <div class="stat-number" id="failed-requests">0</div>
                                <div class="stat-label">Failed</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="token-refreshes">0</div>
                                <div class="stat-label">Token Refreshes</div>
                            </div>
                        </div>
                        <div class="analytics-actions">
                            <button id="reset-analytics-btn" class="btn btn-outline-secondary btn-sm">
                                <i class="fas fa-trash"></i> Reset Analytics
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        await this.updateTokenDisplay();
        this.loadTokenHistory();
        this.startTokenMonitoring();
        this.initializeTokenAnalytics();
    }

    setupEventListeners() {
        // Token actions
        document.getElementById('refresh-token-btn')?.addEventListener('click', () => {
            this.refreshToken();
        });

        document.getElementById('validate-token-btn')?.addEventListener('click', () => {
            this.validateToken();
        });

        document.getElementById('test-connection-btn')?.addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('revoke-token-btn')?.addEventListener('click', () => {
            this.revokeToken();
        });

        document.getElementById('clear-token-btn')?.addEventListener('click', () => {
            this.clearToken();
        });

        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            this.clearTokenHistory();
        });
        
        // New token action buttons
        document.getElementById('copy-token-btn')?.addEventListener('click', () => {
            this.copyToken();
        });
        
        document.getElementById('decode-token-btn')?.addEventListener('click', () => {
            this.decodeCurrentToken();
        });
        
        document.getElementById('get-token-btn')?.addEventListener('click', () => {
            this.getToken();
        });
        
        document.getElementById('reset-analytics-btn')?.addEventListener('click', () => {
            this.resetAnalytics();
        });
    }

    async updateTokenDisplay() {
        console.log('🔄 Updating token display...');
        
        // Load token from localStorage and server
        const storedToken = await this.loadStoredToken();
        console.log('🔄 Stored token:', storedToken ? 'Found' : 'Not found');
        
        const tokenString = document.getElementById('token-string');
        const statusIndicator = document.getElementById('token-status-indicator');
        const statusText = document.getElementById('token-status-text');
        const tokenType = document.getElementById('token-type');
        const tokenExpires = document.getElementById('token-expires');
        const tokenRemaining = document.getElementById('token-remaining');
        const tokenScope = document.getElementById('token-scope');

        console.log('🔄 DOM elements found:');
        console.log('  - tokenString:', !!tokenString);
        console.log('  - statusIndicator:', !!statusIndicator);
        console.log('  - statusText:', !!statusText);
        console.log('  - tokenType:', !!tokenType);
        console.log('  - tokenExpires:', !!tokenExpires);
        console.log('  - tokenRemaining:', !!tokenRemaining);
        console.log('  - tokenScope:', !!tokenScope);

        // Check if DOM elements exist (page might not be loaded yet)
        if (!statusIndicator || !statusText || !tokenType || !tokenExpires || !tokenRemaining || !tokenScope || !tokenString) {
            console.log('⚠️ DOM elements not found, skipping update');
            return; // Page not loaded yet, skip update
        }

        if (storedToken && storedToken.token) {
            console.log('✅ Found stored token, updating display');
            
            // Display the token
            tokenString.value = storedToken.token;
            
            // Show/hide buttons based on token availability
            const getTokenBtn = document.getElementById('get-token-btn');
            const copyTokenBtn = document.getElementById('copy-token-btn');
            const decodeTokenBtn = document.getElementById('decode-token-btn');
            
            if (getTokenBtn) getTokenBtn.style.display = 'none';
            if (copyTokenBtn) copyTokenBtn.style.display = 'inline-block';
            if (decodeTokenBtn) decodeTokenBtn.style.display = 'inline-block';
            
            // Check if token is valid
            const isTokenValid = this.isTokenValid(storedToken);
            
            if (isTokenValid) {
                statusIndicator.className = 'status-indicator status-valid';
                const exp = this.normalizeExpiry(storedToken);
                const timeLeft = exp ? Math.max(0, Math.floor((exp - new Date()) / 1000)) : null;
                statusText.textContent = timeLeft ? `Valid (${this.formatTimeRemaining(timeLeft)})` : 'Valid';
                tokenType.textContent = 'Bearer';
                tokenExpires.textContent = storedToken.expiresAt ? 
                    new Date(storedToken.expiresAt).toLocaleString() : 'Unknown';
                tokenRemaining.textContent = storedToken.expiresAt ? 
                    this.formatTimeRemaining(Math.floor((new Date(storedToken.expiresAt) - new Date()) / 1000)) : 'Unknown';
                tokenScope.textContent = 'Default';
                
                // Auto-decode the token
                this.decodeJWT(storedToken.token);
            } else {
                statusIndicator.className = 'status-indicator status-invalid';
                const exp = this.normalizeExpiry(storedToken);
                if (exp && exp > new Date()) {
                    // Edge case: normalization says still in future, treat as valid-with-remaining
                    const timeLeft = Math.floor((exp - new Date()) / 1000);
                    statusIndicator.className = 'status-indicator status-valid';
                    statusText.textContent = `Valid (${this.formatTimeRemaining(timeLeft)})`;
                } else {
                    statusText.textContent = 'Expired';
                }
                tokenType.textContent = 'Bearer';
                tokenExpires.textContent = storedToken.expiresAt ? 
                    new Date(storedToken.expiresAt).toLocaleString() : 'Unknown';
                tokenRemaining.textContent = 'Expired';
                tokenScope.textContent = 'Default';
                
                // Show/hide buttons based on token availability (expired token still exists)
                const getTokenBtn = document.getElementById('get-token-btn');
                const copyTokenBtn = document.getElementById('copy-token-btn');
                const decodeTokenBtn = document.getElementById('decode-token-btn');
                
                if (getTokenBtn) getTokenBtn.style.display = 'none';
                if (copyTokenBtn) copyTokenBtn.style.display = 'inline-block';
                if (decodeTokenBtn) decodeTokenBtn.style.display = 'inline-block';
                
                // Auto-decode the expired token (for read-only display)
                this.decodeJWT(storedToken.token);
            }
        } else {
            console.log('❌ No stored token found');
            statusIndicator.className = 'status-indicator status-unknown';
            statusText.textContent = 'No Token';
            tokenType.textContent = '-';
            tokenExpires.textContent = '-';
            tokenRemaining.textContent = '-';
            tokenScope.textContent = '-';
            tokenString.value = '';
            tokenString.placeholder = 'No token available - Get a token first';
            
            // Show/hide buttons based on token availability
            const getTokenBtn = document.getElementById('get-token-btn');
            const copyTokenBtn = document.getElementById('copy-token-btn');
            const decodeTokenBtn = document.getElementById('decode-token-btn');
            
            if (getTokenBtn) getTokenBtn.style.display = 'inline-block';
            if (copyTokenBtn) copyTokenBtn.style.display = 'none';
            if (decodeTokenBtn) decodeTokenBtn.style.display = 'none';
            
            // Clear decoded sections with helpful message
            const headerElement = document.getElementById('jwt-header');
            const payloadElement = document.getElementById('jwt-payload');
            
            if (headerElement) {
                headerElement.textContent = 'No token available';
            }
            if (payloadElement) {
                payloadElement.textContent = 'Please get a valid token first using the "Get Token" button';
            }
        }
    }

    formatTimeRemaining(seconds) {
        if (seconds <= 0) return 'Expired';
        
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
     * Load token from localStorage
     */
    async loadStoredToken() {
        try {
            console.log('🔍 Loading stored token from localStorage...');
            
            // Try pingone_token_cache first (preferred format)
            let stored = localStorage.getItem('pingone_token_cache');
            console.log('🔍 Raw stored data from cache:', stored ? 'Found' : 'Not found');
            
            if (stored) {
                const tokenInfo = JSON.parse(stored);
                console.log('🔍 Parsed token info from cache:', tokenInfo);
                console.log('🔍 Token has token property:', !!tokenInfo.token);
                console.log('🔍 Token length:', tokenInfo.token ? tokenInfo.token.length : 0);
                return tokenInfo;
            }
            
            // Try pingone_token as fallback
            stored = localStorage.getItem('pingone_token');
            console.log('🔍 Raw stored data from token:', stored ? 'Found' : 'Not found');
            
            if (stored) {
                const tokenData = JSON.parse(stored);
                console.log('🔍 Parsed token data:', tokenData);
                
                // Convert to cache format
                const tokenInfo = {
                    token: tokenData.access_token,
                    expiresAt: Date.now() + (tokenData.expires_in * 1000)
                };
                console.log('🔍 Converted to cache format:', tokenInfo);
                return tokenInfo;
            }
            
            // Try pingone_worker_token as another fallback
            stored = localStorage.getItem('pingone_worker_token');
            console.log('🔍 Raw stored data from worker token:', stored ? 'Found' : 'Not found');
            
            if (stored) {
                const tokenInfo = {
                    token: stored,
                    expiresAt: null // No expiry info for worker token
                };
                console.log('🔍 Converted worker token to cache format:', tokenInfo);
                return tokenInfo;
            }
            
            // Try accessToken as final fallback
            stored = localStorage.getItem('accessToken');
            console.log('🔍 Raw stored data from accessToken:', stored ? 'Found' : 'Not found');
            
            if (stored) {
                const tokenInfo = {
                    token: stored,
                    expiresAt: null // No expiry info for accessToken
                };
                console.log('🔍 Converted accessToken to cache format:', tokenInfo);
                return tokenInfo;
            }
            
            // If no token in localStorage, try to get from server
            console.log('🔍 No token found in localStorage, checking server...');
            try {
                const response = await fetch('/api/token/status');
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 Server token status:', result);
                    
                    if (result.success && result.data && result.data.access_token) {
                        const tokenInfo = {
                            token: result.data.access_token,
                            expiresAt: result.data.expiresAt || null
                        };
                        console.log('🔍 Got token from server:', tokenInfo);
                        return tokenInfo;
                    }
                }
            } catch (error) {
                console.log('🔍 Server token check failed:', error.message);
            }
            
            console.log('🔍 No token found anywhere');
        } catch (error) {
            console.error('❌ Failed to load stored token', error);
        }
        return null;
    }
    
    /**
     * Check if a token is valid (not expired)
     */
    isTokenValid(tokenInfo) {
        if (!tokenInfo || !tokenInfo.token) return false;
        const expiresAt = this.normalizeExpiry(tokenInfo);
        if (expiresAt) return expiresAt > new Date();
        // If no expiration info, fall back to expiresIn/timeLeft if present
        const secondsLeft = Number(tokenInfo.expiresIn || tokenInfo.timeLeft || 0);
        if (!Number.isNaN(secondsLeft) && secondsLeft > 0) return true;
        // No info; consider invalid to avoid false positives
        return false;
    }

    /**
     * Normalize various expiry representations into a Date
     */
    normalizeExpiry(tokenLike) {
        try {
            const raw = tokenLike?.expiresAt ?? tokenLike?.expires_at ?? null;
            if (raw) {
                // ISO string
                if (typeof raw === 'string' && isNaN(raw)) return new Date(raw);
                // numeric (ms or seconds)
                const n = typeof raw === 'string' ? Number(raw) : raw;
                if (Number.isFinite(n)) {
                    // if seconds (10 digits) convert to ms
                    const ms = n < 1e12 ? n * 1000 : n;
                    return new Date(ms);
                }
            }
            // Fallback from expiresIn/timeLeft seconds
            const secs = Number(tokenLike?.expiresIn || tokenLike?.timeLeft || 0);
            if (Number.isFinite(secs) && secs > 0) return new Date(Date.now() + secs * 1000);
        } catch (_) {}
        return null;
    }
    
    /**
     * Decode JWT token
     */
    decodeJWT(token) {
        try {
            console.log('🔍 Attempting to decode JWT token...');
            console.log('🔍 Token length:', token.length);
            console.log('🔍 Token first 50 chars:', token.substring(0, 50));
            
            const parts = token.split('.');
            console.log('🔍 JWT parts count:', parts.length);
            
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format - expected 3 parts separated by dots');
            }
            
            // Handle base64 decoding with proper padding and URL-safe characters
            const decodeBase64 = (str) => {
                try {
                    // Replace URL-safe characters with standard base64
                    str = str.replace(/-/g, '+').replace(/_/g, '/');
                    
                    // Add padding if needed
                    while (str.length % 4) {
                        str += '=';
                    }
                    
                    return atob(str);
                } catch (e) {
                    throw new Error('Invalid base64 encoding');
                }
            };
            
            const headerStr = decodeBase64(parts[0]);
            const payloadStr = decodeBase64(parts[1]);
            
            console.log('📋 Decoded header string:', headerStr);
            console.log('📋 Decoded payload string:', payloadStr);
            
            const header = JSON.parse(headerStr);
            const payload = JSON.parse(payloadStr);
            
            console.log('✅ JWT decoded successfully');
            console.log('📋 Header:', header);
            console.log('📋 Payload:', payload);
            
            // Update the UI elements directly
            const headerElement = document.getElementById('jwt-header');
            const payloadElement = document.getElementById('jwt-payload');
            
            if (headerElement) {
                headerElement.textContent = JSON.stringify(header, null, 2);
                console.log('✅ Header updated in UI');
            }
            
            if (payloadElement) {
                payloadElement.textContent = JSON.stringify(payload, null, 2);
                console.log('✅ Payload updated in UI');
            }
            
            // Return the decoded data
            return { header, payload };
            
        } catch (error) {
            console.error('❌ Failed to decode JWT', error);
            
            // Update UI with error message
            const headerElement = document.getElementById('jwt-header');
            const payloadElement = document.getElementById('jwt-payload');
            
            if (headerElement) {
                headerElement.textContent = `Error: ${error.message}`;
            }
            if (payloadElement) {
                payloadElement.textContent = `Error: ${error.message}`;
            }
            
            throw error; // Re-throw the error so calling code can handle it
        }
    }
    
    /**
     * Decode current token from textarea
     */
    decodeCurrentToken() {
        console.log('🔍 decodeCurrentToken called');
        const tokenString = document.getElementById('token-string');
        const jwtHeader = document.getElementById('jwt-header');
        const jwtPayload = document.getElementById('jwt-payload');
        
        console.log('🔍 tokenString element:', tokenString);
        
        if (!tokenString || !jwtHeader || !jwtPayload) {
            console.error('❌ Required elements not found for JWT decoding');
            return;
        }
        
        const token = tokenString.value.trim();
        
        if (!token) {
            console.log('🔍 No token available to decode');
            jwtHeader.textContent = 'No token available to decode';
            jwtPayload.textContent = 'Please enter a JWT token to decode';
            
            if (this.app && this.app.showError) {
                this.app.showError('Please enter a JWT token to decode');
            }
            return;
        }
        
        try {
            console.log('🔍 Calling decodeJWT with token');
            const decoded = this.decodeJWT(token);
            
            if (decoded) {
                // UI is already updated by decodeJWT method
                if (this.app && this.app.showSuccess) {
                    this.app.showSuccess('JWT token decoded successfully');
                }
            } else {
                throw new Error('Failed to decode JWT token');
            }
        } catch (error) {
            console.error('❌ Error decoding JWT:', error);
            
            // UI is already updated by decodeJWT method with error message
            
            if (this.app && this.app.showError) {
                this.app.showError('Failed to decode JWT token', error.message);
            }
        }
    }
    
    /**
     * Copy token to clipboard
     */
    async copyToken() {
        const tokenString = document.getElementById('token-string');
        const token = tokenString?.value?.trim();
        
        if (token) {
            try {
                await navigator.clipboard.writeText(token);
                console.log('✅ Token copied to clipboard');
                if (this.app && this.app.showSuccess) {
                    this.app.showSuccess('Token copied to clipboard!');
                }
            } catch (error) {
                console.error('❌ Failed to copy token', error);
                if (this.app && this.app.showError) {
                    this.app.showError('Failed to copy token to clipboard');
                }
            }
        } else {
            if (this.app && this.app.showError) {
                this.app.showError('No token available to copy');
            }
        }
    }
    
    /**
     * Get a new token
     */
    async getToken() {
        try {
            console.log('🔍 Get Token button clicked');
            
            // Check if we already have a token
            const storedToken = await this.loadStoredToken();
            
            if (storedToken && storedToken.token) {
                // We have a token, check if it's valid
                const isTokenValid = this.isTokenValid(storedToken);
                
                if (isTokenValid) {
                    // Token is valid, refresh it to get a fresh 60 minutes
                    console.log('🔄 Token exists and is valid, refreshing for fresh 60 minutes...');
                    if (this.app && this.app.showInfo) {
                        this.app.showInfo('Refreshing existing token for fresh 60 minutes...');
                    }
                    await this.refreshToken();
                } else {
                    // Token is expired or invalid, get a new one
                    console.log('🔄 Token exists but is expired/invalid, getting new token...');
                    if (this.app && this.app.showInfo) {
                        this.app.showInfo('Token is expired, getting new token...');
                    }
                    await this.refreshToken();
                }
            } else {
                // No token exists, get a new one
                console.log('🔄 No token exists, getting new token...');
                if (this.app && this.app.showInfo) {
                    this.app.showInfo('Getting new token...');
                }
                await this.refreshToken();
            }
        } catch (error) {
            console.error('❌ Failed to get token:', error);
            if (this.app && this.app.showError) {
                this.app.showError('Failed to get token. Please try again.');
            }
        }
    }
    


    async refreshToken() {
        const refreshBtn = document.getElementById('refresh-token-btn');
        const originalText = refreshBtn.innerHTML;
        
        try {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;

            const response = await fetch('/api/pingone/token', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    // Token data is in result.message based on API response structure
                    const tokenData = result.message;
                    
                    if (tokenData && tokenData.access_token) {
                        // Store the token in localStorage
                        localStorage.setItem('pingone_token', JSON.stringify(tokenData));
                        
                        // Also store in cache format for compatibility
                        const cacheData = {
                            token: tokenData.access_token,
                            expiresAt: Date.now() + (tokenData.expires_in * 1000)
                        };
                        localStorage.setItem('pingone_token_cache', JSON.stringify(cacheData));
                        
                        console.log('✅ Token stored successfully');
                        this.addToTokenHistory('Token refreshed and stored successfully', 'success');
                        
                        // Track successful token refresh
                        if (this.tokenAnalytics) {
                            this.tokenAnalytics.trackTokenRefresh(true);
                        }
                        
                        // Update app token status (single source of truth)
                        if (this.app.updateTokenStatus) {
                            this.app.updateTokenStatus(tokenData);
                        }
                        
                        // Refresh populations on all pages that have population lists
                        this.refreshPopulationsOnAllPages();
                        
                        this.updateTokenDisplay();
                        if (this.app && this.app.showSuccess) {
                            this.app.showSuccess('Token refreshed successfully! Populations are being updated...');
                        }
                    } else {
                        throw new Error('Invalid token data received from server');
                    }
                } else {
                    throw new Error(result.message || 'Token refresh failed');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error refreshing token:', error);
            this.addToTokenHistory(`Token refresh failed: ${error.message}`, 'error');
            
            // Track failed token refresh
            if (this.tokenAnalytics) {
                this.tokenAnalytics.trackTokenRefresh(false);
            }
            
            if (this.app && this.app.showError) {
                this.app.showError('Failed to refresh token. Please check your settings.');
            }
        } finally {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    async validateToken() {
        const validateBtn = document.getElementById('validate-token-btn');
        const originalText = validateBtn.innerHTML;
        const statusIndicator = document.getElementById('token-status-indicator');
        const statusText = document.getElementById('token-status-text');
        
        try {
            validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
            validateBtn.disabled = true;

            const response = await fetch('/api/token/status');
            
            if (response.ok) {
                const result = await response.json();
                
                // Track successful token validation
                if (this.tokenAnalytics) {
                    this.tokenAnalytics.trackTokenRequest(true);
                }
                
                // Prefer authoritative server result when available
                const tokenInfo = result?.data?.data || result?.data || result?.message || {};
                const exp = this.normalizeExpiry(tokenInfo);
                const nowValid = tokenInfo?.hasToken ? (tokenInfo.isValid ?? (exp ? exp > new Date() : true)) : false;

                this.addToTokenHistory('Token validation successful', nowValid ? 'success' : 'warning');
                if (this.app && this.app.showSuccess) this.app.showSuccess(nowValid ? 'Token is valid and active' : 'Token present, nearing expiry');

                // Button goes green on success
                validateBtn.classList.remove('btn-danger', 'btn-info');
                validateBtn.classList.add(nowValid ? 'btn-success' : 'btn-warning');
                // Update status indicator to green and show remaining when known
                if (statusIndicator) statusIndicator.className = `status-indicator ${nowValid ? 'status-valid' : 'status-unknown'}`;
                if (statusText) {
                    if (nowValid && exp) {
                        const secs = Math.max(0, Math.floor((exp - new Date()) / 1000));
                        statusText.textContent = `Valid (${this.formatTimeRemaining(secs)})`;
                    } else if (nowValid) {
                        statusText.textContent = 'Valid';
                    } else {
                        statusText.textContent = 'Unknown';
                    }
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error validating token:', error);
            this.addToTokenHistory(`Token validation failed: ${error.message}`, 'error');
            
            // Track failed token validation
            if (this.tokenAnalytics) {
                this.tokenAnalytics.trackTokenRequest(false);
            }
            
            if (this.app && this.app.showError) {
                this.app.showError('Token validation failed. Token may be expired or invalid.');
            }

            // Ensure button is red on failure
            validateBtn.classList.remove('btn-success', 'btn-info');
            validateBtn.classList.add('btn-danger');
            if (statusIndicator) statusIndicator.className = 'status-indicator status-invalid';
            if (statusText) statusText.textContent = 'Invalid';
        } finally {
            validateBtn.innerHTML = originalText;
            validateBtn.disabled = false;
        }
    }

    async testConnection() {
        const testBtn = document.getElementById('test-connection-btn');
        const originalText = testBtn.innerHTML;
        const testSection = document.getElementById('connection-test-section');
        const testResults = document.getElementById('connection-test-results');
        
        try {
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            testBtn.disabled = true;
            
            testSection.style.display = 'block';
            testResults.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Running connection tests...</p></div>';

            const response = await fetch('/api/pingone/test-connection');
            
            if (response.ok) {
                const results = await response.json();
                this.displayConnectionTestResults(results);
                this.addToTokenHistory('Connection test completed', 'info');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error testing connection:', error);
            testResults.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Connection Test Failed:</strong> ${error.message}
                </div>
            `;
            this.addToTokenHistory(`Connection test failed: ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    displayConnectionTestResults(results) {
        const testResults = document.getElementById('connection-test-results');
        
        const testsHtml = results.tests.map(test => `
            <div class="test-result ${test.status}">
                <div class="test-header">
                    <i class="fas ${test.status === 'passed' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    <strong>${test.name}</strong>
                    <span class="test-duration">${test.duration}ms</span>
                </div>
                <div class="test-details">${test.message}</div>
            </div>
        `).join('');

        testResults.innerHTML = `
            <div class="connection-test-summary">
                <h4>Test Results Summary</h4>
                <p><strong>Total Tests:</strong> ${results.total}</p>
                <p><strong>Passed:</strong> ${results.passed}</p>
                <p><strong>Failed:</strong> ${results.failed}</p>
                <p><strong>Duration:</strong> ${results.totalDuration}ms</p>
            </div>
            <div class="test-results-list">
                ${testsHtml}
            </div>
        `;
    }

    async revokeToken() {
        // Use in-page confirmation instead of browser modal
        const revokeBtn = document.getElementById('revoke-token-btn');
        const originalText = revokeBtn.innerHTML;
        
        // Show confirmation status
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Preparing to revoke token...');
        }
        
        // Proceed without browser modal; use green status bar only
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Revoking token...');
        }
        
        try {
            revokeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Revoking...';
            revokeBtn.disabled = true;

            // For now, just clear the local token since PingOne doesn't have a client-side revoke endpoint
            // In a real implementation, this would call PingOne's revoke endpoint
            console.log('🔄 Clearing local token (revoke endpoint not implemented)');
            
            // Clear local token
            localStorage.removeItem('pingone_token');
            localStorage.removeItem('pingone_token_cache');
            
            // Update app token status
            if (this.app.checkStoredToken) {
                await this.app.checkStoredToken();
            }
            
            this.updateTokenDisplay();
            this.addToTokenHistory('Local token cleared (revoke simulated)', 'warning');
            if (this.app && this.app.showSuccess) {
                this.app.showSuccess('Token revoked locally');
            }
        } catch (error) {
            console.error('❌ Error clearing token:', error);
            this.addToTokenHistory(`Token clearing failed: ${error.message}`, 'error');
            if (this.app && this.app.showError) {
                this.app.showError('Failed to clear token. Please try again.');
            }
        } finally {
            revokeBtn.innerHTML = originalText;
            revokeBtn.disabled = false;
        }
    }

    clearToken() {
        // No browser modal; use green status bar only
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Clearing local token...');
        }
        
        // Clear local token
        localStorage.removeItem('pingone_token');
        localStorage.removeItem('pingone_token_cache');
        
        // Update app token status
        if (this.app.checkStoredToken) {
            this.app.checkStoredToken();
        }
        
        this.updateTokenDisplay();
        this.addToTokenHistory('Local token cleared', 'info');
        if (this.app && this.app.showSuccess) {
            this.app.showSuccess('Local token cleared successfully');
        }
    }
    

    loadTokenHistory() {
        const storedHistory = localStorage.getItem('token_history');
        if (storedHistory) {
            this.tokenHistory = JSON.parse(storedHistory);
        }
        this.displayTokenHistory();
    }

    addToTokenHistory(message, type = 'info') {
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            message,
            type
        };

        this.tokenHistory.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (this.tokenHistory.length > 50) {
            this.tokenHistory = this.tokenHistory.slice(0, 50);
        }

        // Save to localStorage
        localStorage.setItem('token_history', JSON.stringify(this.tokenHistory));
        
        this.displayTokenHistory();
    }

    displayTokenHistory() {
        const historyList = document.getElementById('token-history-list');
        
        if (this.tokenHistory.length === 0) {
            historyList.innerHTML = '<p class="text-muted">No token history available</p>';
            return;
        }

        historyList.innerHTML = this.tokenHistory.map(entry => `
            <div class="history-entry history-${entry.type}">
                <div class="history-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="history-message">${entry.message}</div>
            </div>
        `).join('');
    }

    clearTokenHistory() {
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Clearing token history...');
        }

        this.tokenHistory = [];
        localStorage.removeItem('token_history');
        this.displayTokenHistory();
        if (this.app && this.app.showSuccess) {
            this.app.showSuccess('Token history cleared successfully');
        }
    }

    startTokenMonitoring() {
        // Update token display every 30 seconds
        this.refreshInterval = setInterval(async () => {
            await this.updateTokenDisplay();
        }, 30000);
    }
    
    /**
     * Initialize token analytics subsystem
     */
    initializeTokenAnalytics() {
        try {
            // Import the TokenAnalyticsSubsystem dynamically
            import('../../src/client/subsystems/token-analytics-subsystem.js')
                .then(module => {
                    const { TokenAnalyticsSubsystem } = module;
                    
                    // Get event bus from app if available
                    const eventBus = this.app?.eventBus || this.app?.getEventBus?.();
                    
                    // Initialize analytics subsystem
                    this.tokenAnalytics = new TokenAnalyticsSubsystem(eventBus, console);
                    
                    // Update UI with current analytics data
                    this.tokenAnalytics.updateUI();
                    
                    console.log('✅ Token Analytics initialized successfully');
                })
                .catch(error => {
                    console.warn('⚠️ Failed to initialize Token Analytics:', error);
                });
        } catch (error) {
            console.warn('⚠️ Token Analytics initialization error:', error);
        }
    }
    
    /**
     * Reset token analytics data
     */
    resetAnalytics() {
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Resetting token analytics...');
        }
        
        if (this.tokenAnalytics) {
            this.tokenAnalytics.resetAnalytics();
            console.log('✅ Token analytics data reset successfully');
            
            if (this.app && this.app.showSuccess) {
                this.app.showSuccess('Token analytics data reset successfully');
            }
        } else {
            console.warn('⚠️ Token analytics not initialized');
            if (this.app && this.app.showError) {
                this.app.showError('Token analytics not available');
            }
        }
    }

    // Refresh populations on all pages that have population dropdowns
    refreshPopulationsOnAllPages() {
        console.log('🔄 Refreshing populations on all pages after token refresh...');
        
        // List of pages that have population loading functionality
        const pagesWithPopulations = ['export', 'import', 'delete', 'modify'];
        
        pagesWithPopulations.forEach(pageName => {
            const page = this.app.pages[pageName];
            if (page && typeof page.loadPopulations === 'function') {
                console.log(`🔄 Refreshing populations on ${pageName} page...`);
                try {
                    page.loadPopulations();
                } catch (error) {
                    console.error(`❌ Error refreshing populations on ${pageName} page:`, error);
                }
            }
        });
        
        // Also update the home page status if it has a population status indicator
        const homePage = this.app.pages['home'];
        if (homePage && typeof homePage.updateStatus === 'function') {
            console.log('🔄 Updating home page status...');
            try {
                homePage.updateStatus();
            } catch (error) {
                console.error('❌ Error updating home page status:', error);
            }
        }
        
        console.log('✅ Population refresh completed on all pages');
    }

    // Called when token status changes
    onTokenStatusChange(tokenStatus) {
        this.updateTokenDisplay();
    }

    // Called when settings change
    onSettingsChange(settings) {
        // Token management doesn't need to react to settings changes
    }

    // Cleanup when page is unloaded
    unload() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
