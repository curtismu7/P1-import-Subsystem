/**
 * Token Manager Subsystem
 * 
 * Provides comprehensive token management functionality including:
 * - Token status monitoring
 * - JWT decoding and display
 * - Token refresh and management
 * - Token history tracking
 * - Token validation and testing
 */

import { createLogger } from '../utils/logger.js';

class TokenManagerSubsystem {
    constructor(logger, uiManager, localClient) {
        this.logger = logger || createLogger('TokenManagerSubsystem');
        this.uiManager = uiManager;
        this.localClient = localClient;
        this.tokenHistory = [];
        this.currentToken = null;
        this.refreshInterval = null;
        
        this.logger.info('🔑 Token Manager Subsystem initialized');
    }

    /**
     * Initialize the Token Manager UI and event listeners
     */
    initialize() {
        try {
            this.logger.info('🚀 Initializing Token Manager UI...');
            
            this.setupEventListeners();
            this.loadTokenHistory();
            this.startAutoRefresh();
            
            this.logger.info('✅ Token Manager initialized successfully');
            return { success: true };
        } catch (error) {
            this.logger.error('❌ Failed to initialize Token Manager', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Setup all event listeners for Token Manager UI
     */
    setupEventListeners() {
        // Token status refresh
        const refreshStatusBtn = document.getElementById('refresh-token-status');
        if (refreshStatusBtn) {
            refreshStatusBtn.addEventListener('click', () => this.refreshTokenStatus());
        }

        // Get current token
        const getCurrentTokenBtn = document.getElementById('get-current-token');
        if (getCurrentTokenBtn) {
            getCurrentTokenBtn.addEventListener('click', () => this.getCurrentToken());
        }

        // Decode token
        const decodeTokenBtn = document.getElementById('decode-token');
        if (decodeTokenBtn) {
            decodeTokenBtn.addEventListener('click', () => this.decodeToken());
        }

        // Copy token
        const copyTokenBtn = document.getElementById('copy-token');
        if (copyTokenBtn) {
            copyTokenBtn.addEventListener('click', () => this.copyToken());
        }

        // Refresh access token
        const refreshTokenBtn = document.getElementById('refresh-access-token');
        if (refreshTokenBtn) {
            refreshTokenBtn.addEventListener('click', () => this.refreshAccessToken());
        }

        // Clear token
        const clearTokenBtn = document.getElementById('clear-token');
        if (clearTokenBtn) {
            clearTokenBtn.addEventListener('click', () => this.clearToken());
        }

        // Test token
        const testTokenBtn = document.getElementById('test-token');
        if (testTokenBtn) {
            testTokenBtn.addEventListener('click', () => this.testToken());
        }

        // Clear token history
        const clearHistoryBtn = document.getElementById('clear-token-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearTokenHistory());
        }

        this.logger.info('✅ Event listeners setup complete');
    }

    /**
     * Refresh token status display
     */
    async refreshTokenStatus() {
        try {
            this.logger.info('🔄 Refreshing token status...');
            
            const statusIndicator = document.getElementById('token-status-indicator');
            const expiresIn = document.getElementById('token-expires-in');
            const environmentId = document.getElementById('token-environment-id');
            const region = document.getElementById('token-region');

            // Show loading state
            if (statusIndicator) statusIndicator.innerHTML = '<span class="loading-spinner"></span> Loading...';

            // Get current token status from API
            const response = await fetch('/api/health');
            const healthData = await response.json();

            if (healthData.token) {
                const token = healthData.token;
                
                // Update status indicator
                if (statusIndicator) {
                    const isValid = token.isValid;
                    const statusClass = isValid ? 'valid' : 'expired';
                    const statusText = isValid ? '✅ Valid' : '❌ Expired';
                    statusIndicator.innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
                }

                // Update expires in
                if (expiresIn) {
                    const minutes = Math.floor(token.expiresIn / 60);
                    const seconds = token.expiresIn % 60;
                    expiresIn.textContent = `${minutes}m ${seconds}s`;
                }

                // Update environment ID
                if (environmentId) {
                    environmentId.textContent = token.environmentId || 'N/A';
                }

                // Update region
                if (region) {
                    region.textContent = token.region || 'N/A';
                }

                this.addToHistory('Status Refresh', 'Token status refreshed successfully', { 
                    isValid: token.isValid,
                    expiresIn: token.expiresIn 
                });

            } else {
                // No token available
                if (statusIndicator) {
                    statusIndicator.innerHTML = '<span class="status-badge loading">❌ No Token</span>';
                }
                if (expiresIn) expiresIn.textContent = 'N/A';
                if (environmentId) environmentId.textContent = 'N/A';
                if (region) region.textContent = 'N/A';
            }

            this.logger.info('✅ Token status refreshed successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to refresh token status', { error: error.message });
            
            const statusIndicator = document.getElementById('token-status-indicator');
            if (statusIndicator) {
                statusIndicator.innerHTML = '<span class="status-badge error">❌ Error</span>';
            }
            
            this.uiManager.showNotification('Error', 'Failed to refresh token status: ' + error.message, 'error');
        }
    }

    /**
     * Get and display the current access token
     */
    async getCurrentToken() {
        try {
            this.logger.info('🔄 Getting current token...');
            
            const tokenDisplay = document.getElementById('raw-token-display');
            const copyBtn = document.getElementById('copy-token');

            // Show loading state
            if (tokenDisplay) {
                tokenDisplay.value = 'Loading token...';
            }

            // Get settings for token request
            const settingsResponse = await fetch('/api/settings');
            const settings = await settingsResponse.json();

            if (!settings.pingone_environment_id || !settings.pingone_client_id || !settings.pingone_client_secret) {
                throw new Error('Missing PingOne credentials in settings');
            }

            // Request new token
            const tokenResponse = await fetch('/api/pingone/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    environmentId: settings.pingone_environment_id,
                    clientId: settings.pingone_client_id,
                    clientSecret: settings.pingone_client_secret,
                    region: settings.pingone_region || 'NA'
                })
            });

            const tokenData = await tokenResponse.json();

            if (tokenData.success && tokenData.data.access_token) {
                this.currentToken = tokenData.data.access_token;
                
                if (tokenDisplay) {
                    tokenDisplay.value = this.currentToken;
                }
                
                if (copyBtn) {
                    copyBtn.style.display = 'inline-block';
                }

                this.addToHistory('Token Retrieved', 'Access token retrieved successfully', {
                    tokenType: tokenData.data.token_type,
                    expiresIn: tokenData.data.expires_in
                });

                this.uiManager.showNotification('Success', 'Token retrieved successfully', 'success');
                this.logger.info('✅ Token retrieved successfully');
                
            } else {
                throw new Error(tokenData.error || 'Failed to get token');
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to get current token', { error: error.message });
            
            const tokenDisplay = document.getElementById('raw-token-display');
            if (tokenDisplay) {
                tokenDisplay.value = 'Error: ' + error.message;
            }
            
            this.uiManager.showNotification('Error', 'Failed to get token: ' + error.message, 'error');
        }
    }

    /**
     * Decode the current JWT token
     */
    decodeToken() {
        try {
            this.logger.info('🔓 Decoding JWT token...');
            
            const tokenDisplay = document.getElementById('raw-token-display');
            const decodedContainer = document.getElementById('decoded-token-container');
            const headerEl = document.getElementById('jwt-header');
            const payloadEl = document.getElementById('jwt-payload');
            const signatureEl = document.getElementById('jwt-signature');

            let token = this.currentToken;
            if (!token && tokenDisplay) {
                token = tokenDisplay.value.trim();
            }

            if (!token || token === '' || token.startsWith('Error:') || token.startsWith('Loading')) {
                this.uiManager.showNotification('Warning', 'Please get a token first before decoding', 'warning');
                return;
            }

            // Split JWT token
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            // Decode header
            const header = JSON.parse(this.base64UrlDecode(parts[0]));
            
            // Decode payload
            const payload = JSON.parse(this.base64UrlDecode(parts[1]));
            
            // Signature (can't decode, just display)
            const signature = parts[2];

            // Display decoded parts
            if (headerEl) {
                headerEl.textContent = JSON.stringify(header, null, 2);
            }
            
            if (payloadEl) {
                payloadEl.textContent = JSON.stringify(payload, null, 2);
            }
            
            if (signatureEl) {
                signatureEl.textContent = signature;
            }

            // Show decoded container
            if (decodedContainer) {
                decodedContainer.style.display = 'block';
            }

            this.addToHistory('Token Decoded', 'JWT token decoded successfully', {
                algorithm: header.alg,
                issuer: payload.iss,
                audience: payload.aud,
                expiry: new Date(payload.exp * 1000).toISOString()
            });

            this.uiManager.showNotification('Success', 'Token decoded successfully', 'success');
            this.logger.info('✅ Token decoded successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to decode token', { error: error.message });
            this.uiManager.showNotification('Error', 'Failed to decode token: ' + error.message, 'error');
        }
    }

    /**
     * Copy token to clipboard
     */
    async copyToken() {
        try {
            const tokenDisplay = document.getElementById('raw-token-display');
            const token = tokenDisplay ? tokenDisplay.value : this.currentToken;

            if (!token || token === '' || token.startsWith('Error:') || token.startsWith('Loading')) {
                this.uiManager.showNotification('Warning', 'No token available to copy', 'warning');
                return;
            }

            await navigator.clipboard.writeText(token);
            this.uiManager.showNotification('Success', 'Token copied to clipboard', 'success');
            
            this.addToHistory('Token Copied', 'Token copied to clipboard', {});
            this.logger.info('✅ Token copied to clipboard');
            
        } catch (error) {
            this.logger.error('❌ Failed to copy token', { error: error.message });
            this.uiManager.showNotification('Error', 'Failed to copy token: ' + error.message, 'error');
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            this.logger.info('🔄 Refreshing access token...');
            
            // Clear current token display
            const tokenDisplay = document.getElementById('raw-token-display');
            if (tokenDisplay) {
                tokenDisplay.value = 'Refreshing token...';
            }

            // Get new token
            await this.getCurrentToken();
            
            // Refresh status
            await this.refreshTokenStatus();
            
            this.addToHistory('Token Refreshed', 'Access token refreshed successfully', {});
            this.uiManager.showNotification('Success', 'Token refreshed successfully', 'success');
            
        } catch (error) {
            this.logger.error('❌ Failed to refresh token', { error: error.message });
            this.uiManager.showNotification('Error', 'Failed to refresh token: ' + error.message, 'error');
        }
    }

    /**
     * Clear current token from memory
     */
    clearToken() {
        try {
            this.logger.info('🗑️ Clearing token...');
            
            this.currentToken = null;
            
            const tokenDisplay = document.getElementById('raw-token-display');
            if (tokenDisplay) {
                tokenDisplay.value = '';
            }

            const copyBtn = document.getElementById('copy-token');
            if (copyBtn) {
                copyBtn.style.display = 'none';
            }

            const decodedContainer = document.getElementById('decoded-token-container');
            if (decodedContainer) {
                decodedContainer.style.display = 'none';
            }

            this.addToHistory('Token Cleared', 'Token cleared from memory', {});
            this.uiManager.showNotification('Info', 'Token cleared from memory', 'info');
            this.logger.info('✅ Token cleared successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to clear token', { error: error.message });
            this.uiManager.showNotification('Error', 'Failed to clear token: ' + error.message, 'error');
        }
    }

    /**
     * Test token validity by making an API call
     */
    async testToken() {
        try {
            this.logger.info('🧪 Testing token...');
            
            const tokenDisplay = document.getElementById('raw-token-display');
            let token = this.currentToken;
            if (!token && tokenDisplay) {
                token = tokenDisplay.value.trim();
            }

            if (!token || token === '' || token.startsWith('Error:') || token.startsWith('Loading')) {
                this.uiManager.showNotification('Warning', 'Please get a token first before testing', 'warning');
                return;
            }

            // Get settings for test API call
            const settingsResponse = await fetch('/api/settings');
            const settings = await settingsResponse.json();

            // Test token by getting populations
            const testResponse = await fetch(`/api/pingone/populations?environmentId=${settings.pingone_environment_id}&region=${settings.pingone_region || 'NA'}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const testData = await testResponse.json();

            if (testData.success) {
                const populationCount = testData.count || 0;
                this.addToHistory('Token Tested', `Token test successful - ${populationCount} populations found`, {
                    populationCount,
                    responseStatus: testResponse.status
                });
                this.uiManager.showNotification('Success', `Token is valid! Found ${populationCount} populations.`, 'success');
                this.logger.info('✅ Token test successful', { populationCount });
            } else {
                throw new Error(testData.error || 'Token test failed');
            }
            
        } catch (error) {
            this.logger.error('❌ Token test failed', { error: error.message });
            this.addToHistory('Token Test Failed', 'Token validation failed', { error: error.message });
            this.uiManager.showNotification('Error', 'Token test failed: ' + error.message, 'error');
        }
    }

    /**
     * Add entry to token history
     */
    addToHistory(action, description, details = {}) {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            action,
            description,
            details
        };

        this.tokenHistory.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (this.tokenHistory.length > 50) {
            this.tokenHistory = this.tokenHistory.slice(0, 50);
        }

        this.updateHistoryDisplay();
        this.saveTokenHistory();
    }

    /**
     * Update the history display in the UI
     */
    updateHistoryDisplay() {
        const historyContainer = document.getElementById('token-history-container');
        if (!historyContainer) return;

        if (this.tokenHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-history-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No token history available. Token operations will appear here.</p>
                </div>
            `;
            return;
        }

        const historyHTML = this.tokenHistory.map(entry => `
            <div class="history-item">
                <div class="history-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="history-action">${entry.action}</div>
                <div class="history-details">${entry.description}</div>
                ${Object.keys(entry.details).length > 0 ? `
                    <div class="history-details">
                        <small>${JSON.stringify(entry.details, null, 2)}</small>
                    </div>
                ` : ''}
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    /**
     * Clear token history
     */
    clearTokenHistory() {
        this.tokenHistory = [];
        this.updateHistoryDisplay();
        this.saveTokenHistory();
        this.uiManager.showNotification('Info', 'Token history cleared', 'info');
        this.logger.info('🗑️ Token history cleared');
    }

    /**
     * Save token history to localStorage
     */
    saveTokenHistory() {
        try {
            localStorage.setItem('tokenManagerHistory', JSON.stringify(this.tokenHistory));
        } catch (error) {
            this.logger.warn('Failed to save token history', { error: error.message });
        }
    }

    /**
     * Load token history from localStorage
     */
    loadTokenHistory() {
        try {
            const saved = localStorage.getItem('tokenManagerHistory');
            if (saved) {
                this.tokenHistory = JSON.parse(saved);
                this.updateHistoryDisplay();
            }
        } catch (error) {
            this.logger.warn('Failed to load token history', { error: error.message });
            this.tokenHistory = [];
        }
    }

    /**
     * Start auto-refresh of token status
     */
    startAutoRefresh() {
        // Refresh every 30 seconds when token manager is active
        this.refreshInterval = setInterval(() => {
            const tokenManagerView = document.getElementById('token-manager-view');
            if (tokenManagerView && tokenManagerView.classList.contains('active')) {
                this.refreshTokenStatus();
            }
        }, 30000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Base64 URL decode helper
     */
    base64UrlDecode(str) {
        // Add padding if needed
        str += '='.repeat((4 - str.length % 4) % 4);
        // Replace URL-safe characters
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode
        return atob(str);
    }

    /**
     * Cleanup when view is deactivated
     */
    cleanup() {
        this.stopAutoRefresh();
        this.logger.info('🧹 Token Manager cleanup completed');
    }
}

// Create singleton instance
const tokenManagerSubsystem = new TokenManagerSubsystem();

export default tokenManagerSubsystem;
export { TokenManagerSubsystem };
