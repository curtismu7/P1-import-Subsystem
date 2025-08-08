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
    }

    async load() {
        console.log('📄 Loading Token Management page...');
        
        const tokenPage = document.getElementById('token-management-page');
        if (!tokenPage) {
            console.error('❌ Token management page div not found');
            return;
        }

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
                            <div class="status-indicator" id="token-status-indicator">
                                <i class="fas fa-circle"></i>
                                <span id="token-status-text">Checking...</span>
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
                                <textarea id="token-string" class="token-string" readonly placeholder="No token available"></textarea>
                                <div class="token-actions">
                                    <button id="copy-token-btn" class="btn btn-secondary">
                                        <i class="fas fa-copy"></i> Copy Token
                                    </button>
                                    <button id="decode-token-btn" class="btn btn-info">
                                        <i class="fas fa-code"></i> Decode JWT
                                    </button>
                                    <button id="encode-token-btn" class="btn btn-warning">
                                        <i class="fas fa-edit"></i> Encode JWT
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
                                <button id="validate-token-btn" class="btn btn-info">
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
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.updateTokenDisplay();
        this.loadTokenHistory();
        this.startTokenMonitoring();
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
        
        document.getElementById('encode-token-btn')?.addEventListener('click', () => {
            this.encodeJWT();
        });
    }

    updateTokenDisplay() {
        console.log('🔄 Updating token display...');
        
        // Load token from localStorage
        const storedToken = this.loadStoredToken();
        const tokenString = document.getElementById('token-string');
        const statusIndicator = document.getElementById('token-status-indicator');
        const statusText = document.getElementById('token-status-text');
        const tokenType = document.getElementById('token-type');
        const tokenExpires = document.getElementById('token-expires');
        const tokenRemaining = document.getElementById('token-remaining');
        const tokenScope = document.getElementById('token-scope');

        // Check if DOM elements exist (page might not be loaded yet)
        if (!statusIndicator || !statusText || !tokenType || !tokenExpires || !tokenRemaining || !tokenScope || !tokenString) {
            console.log('⚠️ DOM elements not found, skipping update');
            return; // Page not loaded yet, skip update
        }

        if (storedToken && storedToken.token) {
            console.log('✅ Found stored token, updating display');
            
            // Display the token
            tokenString.value = storedToken.token;
            
            // Check if token is valid
            const isTokenValid = this.isTokenValid(storedToken);
            
            if (isTokenValid) {
                statusIndicator.className = 'status-indicator status-valid';
                statusText.textContent = 'Valid';
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
                statusText.textContent = 'Expired';
                tokenType.textContent = 'Bearer';
                tokenExpires.textContent = storedToken.expiresAt ? 
                    new Date(storedToken.expiresAt).toLocaleString() : 'Unknown';
                tokenRemaining.textContent = 'Expired';
                tokenScope.textContent = 'Default';
                
                // Clear decoded sections
                document.getElementById('jwt-header').textContent = 'Token expired';
                document.getElementById('jwt-payload').textContent = 'Token expired';
            }
        } else {
            console.log('❌ No stored token found');
            statusIndicator.className = 'status-indicator status-invalid';
            statusText.textContent = 'No Token';
            tokenType.textContent = '-';
            tokenExpires.textContent = '-';
            tokenRemaining.textContent = '-';
            tokenScope.textContent = '-';
            tokenString.value = '';
            
            // Clear decoded sections
            document.getElementById('jwt-header').textContent = 'No token data';
            document.getElementById('jwt-payload').textContent = 'No token data';
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
    loadStoredToken() {
        try {
            const stored = localStorage.getItem('pingone_token_cache');
            if (stored) {
                const tokenInfo = JSON.parse(stored);
                console.log('📋 Found stored token', { timestamp: tokenInfo.timestamp });
                return tokenInfo;
            }
        } catch (error) {
            console.error('❌ Failed to load stored token', error);
        }
        return null;
    }
    
    /**
     * Check if a token is valid (not expired)
     */
    isTokenValid(tokenInfo) {
        if (!tokenInfo || !tokenInfo.token) {
            return false;
        }
        
        // Check if token has expiration
        if (tokenInfo.expiresAt) {
            const now = new Date();
            const expiresAt = new Date(tokenInfo.expiresAt);
            return expiresAt > now;
        }
        
        // If no expiration info, assume valid for now
        return true;
    }
    
    /**
     * Decode JWT token
     */
    decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }
            
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            document.getElementById('jwt-header').textContent = JSON.stringify(header, null, 2);
            document.getElementById('jwt-payload').textContent = JSON.stringify(payload, null, 2);
            
            console.log('✅ JWT decoded successfully');
        } catch (error) {
            console.error('❌ Failed to decode JWT', error);
            document.getElementById('jwt-header').textContent = 'Failed to decode header';
            document.getElementById('jwt-payload').textContent = 'Failed to decode payload';
        }
    }
    
    /**
     * Decode current token from textarea
     */
    decodeCurrentToken() {
        const tokenString = document.getElementById('token-string');
        if (tokenString && tokenString.value) {
            this.decodeJWT(tokenString.value);
        } else {
            alert('No token available to decode');
        }
    }
    
    /**
     * Copy token to clipboard
     */
    async copyToken() {
        const tokenString = document.getElementById('token-string');
        if (tokenString && tokenString.value) {
            try {
                await navigator.clipboard.writeText(tokenString.value);
                console.log('✅ Token copied to clipboard');
                alert('Token copied to clipboard!');
            } catch (error) {
                console.error('❌ Failed to copy token', error);
                alert('Failed to copy token to clipboard');
            }
        } else {
            alert('No token available to copy');
        }
    }
    
    /**
     * Encode JWT (placeholder for future functionality)
     */
    encodeJWT() {
        alert('JWT encoding functionality will be implemented in a future update');
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
                        
                        // Update app token status
                        if (this.app.updateTokenStatus) {
                            this.app.updateTokenStatus(tokenData);
                        }
                        
                        // Also trigger stored token check for additional validation
                        if (this.app.checkStoredToken) {
                            await this.app.checkStoredToken();
                        }
                        
                        // Refresh populations on all pages that have population lists
                        this.refreshPopulationsOnAllPages();
                        
                        this.updateTokenDisplay();
                        alert('Token refreshed successfully! Populations are being updated...');
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
            alert('Failed to refresh token. Please check your settings.');
        } finally {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    async validateToken() {
        const validateBtn = document.getElementById('validate-token-btn');
        const originalText = validateBtn.innerHTML;
        
        try {
            validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
            validateBtn.disabled = true;

            const response = await fetch('/api/token/status');
            
            if (response.ok) {
                const result = await response.json();
                this.addToTokenHistory('Token validation successful', 'success');
                alert('Token is valid and active');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error validating token:', error);
            this.addToTokenHistory(`Token validation failed: ${error.message}`, 'error');
            alert('Token validation failed. Token may be expired or invalid.');
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
        const confirmed = confirm('Are you sure you want to revoke the current token? This will invalidate all active sessions.');
        if (!confirmed) return;

        const revokeBtn = document.getElementById('revoke-token-btn');
        const originalText = revokeBtn.innerHTML;
        
        try {
            revokeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Revoking...';
            revokeBtn.disabled = true;

            const response = await fetch('/api/pingone/token/revoke', {
                method: 'POST'
            });

            if (response.ok) {
                this.addToTokenHistory('Token revoked successfully', 'warning');
                
                // Clear local token
                localStorage.removeItem('pingone_token');
                
                // Update app token status
                if (this.app.checkStoredToken) {
                    await this.app.checkStoredToken();
                }
                
                this.updateTokenDisplay();
                alert('Token revoked successfully');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error revoking token:', error);
            this.addToTokenHistory(`Token revocation failed: ${error.message}`, 'error');
            alert('Failed to revoke token. Please try again.');
        } finally {
            revokeBtn.innerHTML = originalText;
            revokeBtn.disabled = false;
        }
    }

    clearToken() {
        const confirmed = confirm('Are you sure you want to clear the local token? You will need to obtain a new token.');
        if (!confirmed) return;

        // Clear local token
        localStorage.removeItem('pingone_token');
        
        // Update app token status
        if (this.app.checkStoredToken) {
            this.app.checkStoredToken();
        }
        
        this.updateTokenDisplay();
        this.addToTokenHistory('Local token cleared', 'info');
        alert('Local token cleared successfully');
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
        const confirmed = confirm('Are you sure you want to clear the token history?');
        if (!confirmed) return;

        this.tokenHistory = [];
        localStorage.removeItem('token_history');
        this.displayTokenHistory();
        alert('Token history cleared successfully');
    }

    startTokenMonitoring() {
        // Update token display every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.updateTokenDisplay();
        }, 30000);
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
