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
            <!-- Monaco Editor for JSON editing -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
            
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
                            <div class="status-container">
                                <span id="token-status-text">Checking...</span>
                                <div class="status-indicator" id="token-status-indicator">
                                    <i class="fas fa-question-circle"></i>
                                </div>
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
                                <div id="token-display" class="token-display" style="display: none;"></div>
                                <textarea id="token-string" class="token-string" placeholder="Paste your JWT token here or get a token using the 'Get Token' button"></textarea>
                                <div class="token-actions">
                                    <button id="get-token-btn" class="btn btn-danger">
                                        <i class="fas fa-key"></i> Get Token
                                    </button>
                                    <button id="copy-token-btn" class="btn btn-danger">
                                        <i class="fas fa-copy"></i> Copy Token
                                    </button>
                                    <button id="decode-token-btn" class="btn btn-danger">
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
                                    <h4>
                                        Header
                                        <button id="edit-header-btn" class="edit-json-btn">Edit JSON</button>
                                    </h4>
                                    <div id="header-editor-container" style="display: none;">
                                        <div id="header-monaco-editor" style="height: 250px; border: 1px solid #e5e7eb; border-radius: 4px;"></div>
                                        <div class="editor-actions" style="margin-top: 10px; text-align: right;">
                                            <button id="save-header-btn" class="edit-json-btn" style="background: #059669;">Save Changes</button>
                                            <button id="cancel-header-edit-btn" class="edit-json-btn" style="background: #6b7280; margin-left: 8px;">Cancel</button>
                                        </div>
                                    </div>
                                    <pre id="jwt-header" class="jwt-content" contenteditable="true">No token data</pre>
                                </div>
                                <div class="jwt-section">
                                    <h4>
                                        Payload
                                        <button id="edit-payload-btn" class="edit-json-btn">Edit JSON</button>
                                    </h4>
                                    <div id="payload-editor-container" style="display: none;">
                                        <div id="monaco-editor" style="height: 300px; border: 1px solid #e5e7eb; border-radius: 4px;"></div>
                                        <div class="editor-actions" style="margin-top: 10px; text-align: right;">
                                            <button id="save-payload-btn" class="edit-json-btn" style="background: #059669;">Save Changes</button>
                                            <button id="cancel-edit-btn" class="edit-json-btn" style="background: #6b7280; margin-left: 8px;">Cancel</button>
                                        </div>
                                    </div>
                                    <pre id="jwt-payload" class="jwt-content" contenteditable="true">No token data</pre>
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
                                <button id="refresh-token-btn" class="btn btn-danger">
                                    <i class="fas fa-sync"></i> Refresh Token
                                </button>
                                <button id="validate-token-btn" class="btn btn-danger">
                                    <i class="fas fa-check-circle"></i> Validate Token
                                </button>
                                <button id="test-connection-btn" class="btn btn-danger">
                                    <i class="fas fa-plug"></i> Test Connection
                                </button>
                                <button id="revoke-token-btn" class="btn btn-danger">
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
        
        // Initialize Monaco Editor for JSON editing
        this.initializeMonacoEditor();

        // Safety: ensure no lingering interaction blockers after render
        setTimeout(() => {
            try {
                if (this.app && typeof this.app.isModalVisible === 'function' && !this.app.isModalVisible()) {
                    if (typeof this.app.ensureInteractionIntegrity === 'function') {
                        this.app.ensureInteractionIntegrity();
                    } else {
                        // Fallback: explicitly re-enable interactions
                        if (typeof this.app.setScreenInteraction === 'function') {
                            this.app.setScreenInteraction(true);
                        }
                        try { document.body.style.overflow = ''; } catch (_) {}
                    }
                }
            } catch (_) {}
        }, 0);
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
        
        // Monaco Editor buttons
        document.getElementById('edit-payload-btn')?.addEventListener('click', () => {
            this.showPayloadEditor();
        });
        
        document.getElementById('save-payload-btn')?.addEventListener('click', () => {
            this.savePayloadChanges();
        });
        
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            this.hidePayloadEditor();
        });

        // Header Editor buttons
        document.getElementById('edit-header-btn')?.addEventListener('click', () => {
            this.showHeaderEditor();
        });
        
        document.getElementById('save-header-btn')?.addEventListener('click', () => {
            this.saveHeaderChanges();
        });
        
        document.getElementById('cancel-header-edit-btn')?.addEventListener('click', () => {
            this.hideHeaderEditor();
        });
    }

    /**
     * Apply JWT token color coding (Green until first period, Blue until second period, Red after)
     */
    applyTokenColorCoding(tokenString) {
        if (!tokenString || typeof tokenString !== 'string') return null;
        
        const periods = tokenString.split('.');
        if (periods.length !== 3) return null; // Not a valid JWT format
        
        const header = periods[0];
        const payload = periods[1];
        const signature = periods[2];
        
        // Create colored spans for each part
        const coloredToken = `
            <span style="color: #10b981;">${header}</span>
            <span style="color: #10b981;">.</span>
            <span style="color: #3b82f6;">${payload}</span>
            <span style="color: #3b82f6;">.</span>
            <span style="color: #ef4444;">${signature}</span>
        `;
        
        return coloredToken;
    }

    async updateTokenDisplay() {
        // Guard: if page is not visible, skip any DOM work or logs
        const pageEl = document.getElementById('token-management-page');
        if (!pageEl || pageEl.style.display === 'none') {
            return;
        }
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
            
            // Display the token (or placeholder if it's a server-stored token)
            const tokenDisplay = document.getElementById('token-display');
            
            if (storedToken.token === '[Token stored on server]') {
                tokenString.value = '';
                tokenString.placeholder = 'Token is stored securely on the server - Use "Get Token" to retrieve';
                if (tokenDisplay) {
                    tokenDisplay.style.display = 'none';
                    tokenString.style.display = 'block';
                }
            } else if (storedToken.token === '[Expired token]') {
                tokenString.value = '';
                tokenString.placeholder = 'Token has expired - Use "Get Token" to get a new one';
                if (tokenDisplay) {
                    tokenDisplay.style.display = 'none';
                    tokenString.style.display = 'block';
                }
            } else {
                // Show colored token in display div
                if (tokenDisplay) {
                    const coloredToken = this.applyTokenColorCoding(storedToken.token);
                    if (coloredToken) {
                        tokenDisplay.innerHTML = coloredToken;
                        tokenDisplay.style.display = 'block';
                        tokenString.style.display = 'none';
                    } else {
                        // Fallback to textarea if color coding fails
                        tokenString.value = storedToken.token;
                        tokenDisplay.style.display = 'none';
                        tokenString.style.display = 'block';
                    }
                } else {
                    tokenString.value = storedToken.token;
                }
            }
            
            // Show/hide buttons based on token availability
            const getTokenBtn = document.getElementById('get-token-btn');
            const copyTokenBtn = document.getElementById('copy-token-btn');
            const decodeTokenBtn = document.getElementById('decode-token-btn');
            
            if (getTokenBtn) getTokenBtn.style.display = 'none';
            if (copyTokenBtn) copyTokenBtn.style.display = (storedToken.token !== '[Token stored on server]' && storedToken.token !== '[Expired token]') ? 'inline-block' : 'none';
            if (decodeTokenBtn) decodeTokenBtn.style.display = (storedToken.token !== '[Token stored on server]' && storedToken.token !== '[Expired token]') ? 'inline-block' : 'none';
            
            // Check if token is valid
            const isTokenValid = this.isTokenValid(storedToken);
            
            if (isTokenValid) {
                statusIndicator.className = 'status-indicator status-valid';
                statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                statusText.textContent = 'Valid';
                tokenType.textContent = 'Bearer';
                
                // Show expiration time
                if (storedToken.expiresAt) {
                    tokenExpires.textContent = ' ' + new Date(storedToken.expiresAt).toLocaleString();
                    tokenRemaining.textContent = this.formatTimeRemaining(Math.floor((new Date(storedToken.expiresAt) - new Date()) / 1000));
                } else if (storedToken.expiresIn) {
                    const expiresAt = new Date(Date.now() + (storedToken.expiresIn * 1000));
                    tokenExpires.textContent = ' ' + expiresAt.toLocaleString();
                    tokenRemaining.textContent = this.formatTimeRemaining(storedToken.expiresIn);
                } else {
                    tokenExpires.textContent = ' Unknown';
                    tokenRemaining.textContent = 'Unknown';
                }
                
                tokenScope.textContent = 'Default';
                
                // Auto-decode the token if it's not a placeholder
                if (storedToken.token !== '[Token stored on server]' && storedToken.token !== '[Expired token]') {
                    this.decodeJWT(storedToken.token);
                }
            } else {
                statusIndicator.className = 'status-indicator status-invalid';
                statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i>';
                statusText.textContent = 'Expired';
                tokenType.textContent = 'Bearer';
                
                if (storedToken.expiresAt) {
                    tokenExpires.textContent = ' ' + new Date(storedToken.expiresAt).toLocaleString();
                } else {
                    tokenExpires.textContent = ' Unknown';
                }
                
                tokenRemaining.textContent = 'Expired';
                tokenScope.textContent = 'Default';
                
                // Auto-decode the expired token if it's not a placeholder
                if (storedToken.token !== '[Token stored on server]' && storedToken.token !== '[Expired token]') {
                    this.decodeJWT(storedToken.token);
                }
            }
        } else {
            console.log('❌ No stored token found');
            statusIndicator.className = 'status-indicator status-invalid';
            statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i>';
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
            console.log('🔍 Loading current token from server...');
            
            // Get current token status from server using CSRF protection
            const response = await fetch('/api/token/status', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('🔍 Server token status response:', result);
                
                if (result.success && result.data?.data) {
                    const tokenData = result.data.data;
                    
                    if (tokenData.hasToken && tokenData.isValid) {
                        // Get the actual token from startup data
                        let actualToken = null;
                        try {
                            const startupResponse = await fetch('/api/settings/startup-data', {
                                method: 'GET',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            if (startupResponse.ok) {
                                const startupResult = await startupResponse.json();
                                if (startupResult.success && startupResult.data?.startupData?.token?.token) {
                                    actualToken = startupResult.data.startupData.token.token;
                                }
                            }
                        } catch (error) {
                            console.log('⚠️ Could not get actual token from startup data:', error.message);
                        }
                        
                        // Create token info from server response
                        const tokenInfo = {
                            token: actualToken || '[Token stored on server]',
                            expiresAt: tokenData.expiresIn ? 
                                new Date(Date.now() + (tokenData.expiresIn * 1000)) : null,
                            expiresIn: tokenData.expiresIn,
                            environmentId: tokenData.environmentId,
                            region: tokenData.region,
                            lastUpdated: tokenData.lastUpdated
                        };
                        
                        console.log('✅ Token loaded from server:', tokenInfo);
                        return tokenInfo;
                    } else {
                        console.log('⚠️ Token exists but is invalid or expired');
                        return {
                            token: '[Expired token]',
                            expiresAt: null,
                            expiresIn: 0,
                            isValid: false
                        };
                    }
                } else {
                    console.log('❌ No valid token data in server response');
                }
            } else {
                console.log('❌ Failed to get token status from server:', response.status);
            }
            
            console.log('🔍 No valid token found on server');
            return null;
            
        } catch (error) {
            console.error('❌ Failed to load token from server', error);
            return null;
        }
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
            console.log('🔍 Attempting to decode JWT token...');
            console.log('🔍 Token length:', token.length);
            console.log('🔍 Token first 50 chars:', token.substring(0, 50));
            console.log('🔍 Token last 50 chars:', token.substring(Math.max(0, token.length - 50)));
            
            // Clean the token
            const cleanToken = token.trim();
            const parts = cleanToken.split('.');
            console.log('🔍 JWT parts count:', parts.length);
            
            if (parts.length !== 3) {
                throw new Error(`Invalid JWT format - expected 3 parts separated by dots, got ${parts.length}`);
            }
            
            // Log each part for debugging
            console.log('🔍 Part 0 (header) length:', parts[0].length);
            console.log('🔍 Part 1 (payload) length:', parts[1].length);
            console.log('🔍 Part 2 (signature) length:', parts[2].length);
            
            // Handle base64 decoding with proper padding and URL-safe characters
            const decodeBase64 = (str) => {
                try {
                    // Clean the string and handle different formats
                    let cleanStr = str.trim();
                    
                    // Replace URL-safe characters with standard base64
                    cleanStr = cleanStr.replace(/-/g, '+').replace(/_/g, '/');
                    
                    // Add padding if needed
                    while (cleanStr.length % 4) {
                        cleanStr += '=';
                    }
                    
                    // Try to decode
                    const decoded = atob(cleanStr);
                    return decoded;
                } catch (e) {
                    console.error('❌ Base64 decode error for string:', str.substring(0, 20) + '...');
                    console.error('❌ Error details:', e);
                    throw new Error(`Invalid base64 encoding: ${e.message}`);
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
            
            // Update the UI elements with formatted JSON
            const headerElement = document.getElementById('jwt-header');
            const payloadElement = document.getElementById('jwt-payload');
            
            if (headerElement) {
                headerElement.textContent = this.formatJSON(header);
                console.log('✅ Header updated in UI');
            }
            
            if (payloadElement) {
                payloadElement.textContent = this.formatJSON(payload);
                console.log('✅ Payload updated in UI');
            }
            
            // Apply Prism.js syntax highlighting
            if (window.Prism) {
                setTimeout(() => {
                    if (headerElement) window.Prism.highlightElement(headerElement);
                    if (payloadElement) window.Prism.highlightElement(payloadElement);
                    console.log('✅ Prism.js syntax highlighting applied');
                }, 100);
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
                headerElement.className = 'jwt-content language-json error';
            }
            if (payloadElement) {
                payloadElement.textContent = `Error: ${error.message}`;
                payloadElement.className = 'jwt-content language-json error';
            }
            
            throw error; // Re-throw the error so calling code can handle it
        }
    }
    
    /**
     * Format JSON for display
     */
    formatJSON(obj) {
        const jsonString = JSON.stringify(obj, null, 2);
        return jsonString;
    }
    
    /**
     * Initialize Monaco Editor for JSON editing
     */
    async initializeMonacoEditor() {
        try {
            // Check if Monaco Editor is already loaded
            if (typeof monaco !== 'undefined') {
                this.createMonacoEditor();
                return;
            }

            // Wait for Monaco Editor to be available
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkMonaco = () => {
                if (typeof monaco !== 'undefined') {
                    console.log('✅ Monaco Editor detected, creating editor...');
                    this.createMonacoEditor();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    console.log(`⏳ Waiting for Monaco Editor... (attempt ${attempts}/${maxAttempts})`);
                    setTimeout(checkMonaco, 500);
                } else {
                    console.error('❌ Monaco Editor failed to load after multiple attempts');
                }
            };
            
            checkMonaco();
        } catch (error) {
            console.error('❌ Failed to initialize Monaco Editor:', error);
        }
    }

    /**
     * Create Monaco Editor instance
     */
    createMonacoEditor() {
        try {
            const container = document.getElementById('monaco-editor');
            if (!container) {
                console.error('❌ Monaco Editor container not found');
                return;
            }

            this.monacoEditor = monaco.editor.create(container, {
                value: '{}',
                language: 'json',
                theme: 'vs',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                wordWrap: 'on'
            });
            
            console.log('✅ Monaco Editor created successfully');
        } catch (error) {
            console.error('❌ Failed to create Monaco Editor:', error);
        }
    }
    
    /* Editor event handlers now set up in setupEventListeners() */
    
    /**
     * Show the payload editor
     */
    showPayloadEditor() {
        const editorContainer = document.getElementById('payload-editor-container');
        const payloadDisplay = document.getElementById('jwt-payload');
        const editButton = document.getElementById('edit-payload-btn');
        
        if (editorContainer && payloadDisplay && editButton) {
            // Get current payload content
            const currentContent = payloadDisplay.textContent;
            console.log('🔍 Payload content to load:', currentContent);
            
            // Show editor, hide display
            editorContainer.style.display = 'block';
            payloadDisplay.style.display = 'none';
            editButton.textContent = 'View JSON';
            editButton.className = 'edit-json-btn';
            editButton.style.background = '#6b7280';
            
            // Set editor content - ensure Monaco Editor is ready
            if (this.monacoEditor) {
                console.log('✅ Monaco Editor ready, updating content');
                this.updatePayloadEditorContent(currentContent);
            } else {
                console.log('⚠️ Monaco Editor not ready, initializing...');
                this.initializeMonacoEditor().then(() => {
                    if (this.monacoEditor) {
                        this.updatePayloadEditorContent(currentContent);
                    }
                });
            }
        }
    }
    
    /**
     * Hide the payload editor
     */
    hidePayloadEditor() {
        const editorContainer = document.getElementById('payload-editor-container');
        const payloadDisplay = document.getElementById('jwt-payload');
        const editButton = document.getElementById('edit-payload-btn');
        
        if (editorContainer && payloadDisplay && editButton) {
            // Hide editor, show display
            editorContainer.style.display = 'none';
            payloadDisplay.style.display = 'block';
            editButton.textContent = 'Edit JSON';
            editButton.className = 'btn btn-sm btn-outline-primary';
        }
    }
    
    /**
     * Save payload changes
     */
    savePayloadChanges() {
        if (!this.monacoEditor) return;
        
        try {
            const newContent = this.monacoEditor.getValue();
            
            // Validate JSON
            const parsed = JSON.parse(newContent);
            
            // Update the display
            const payloadDisplay = document.getElementById('jwt-payload');
            if (payloadDisplay) {
                payloadDisplay.textContent = JSON.stringify(parsed, null, 2);
            }
            
            // Hide editor
            this.hidePayloadEditor();
            
            // Show success message
            if (this.app && this.app.showSuccess) {
                this.app.showSuccess('Payload updated successfully!');
            }
            
            console.log('✅ Payload changes saved');
            
        } catch (error) {
            // Show error message
            if (this.app && this.app.showError) {
                this.app.showError('Invalid JSON format. Please fix the syntax errors.');
            }
            console.error('❌ Invalid JSON:', error);
        }
    }

    /**
     * Show header editor
     */
    showHeaderEditor() {
        const headerContainer = document.getElementById('header-editor-container');
        const headerContent = document.getElementById('jwt-header');
        
        if (headerContainer && headerContent) {
            // Get current header content before hiding it
            const currentContent = headerContent.textContent;
            console.log('🔍 Header content to load:', currentContent);
            
            // Show editor, hide display
            headerContainer.style.display = 'block';
            headerContent.style.display = 'none';
            
            // Initialize Monaco Editor for header if not already done
            if (!this.headerMonacoEditor) {
                console.log('⚠️ Header Monaco Editor not ready, initializing...');
                this.initializeHeaderMonacoEditor();
            } else {
                // Update existing editor with current content
                console.log('✅ Header Monaco Editor ready, updating content');
                this.updateHeaderEditorContent(currentContent);
            }
        }
    }

    /**
     * Hide header editor
     */
    hideHeaderEditor() {
        const headerContainer = document.getElementById('header-editor-container');
        const headerContent = document.getElementById('jwt-header');
        
        if (headerContainer && headerContent) {
            headerContainer.style.display = 'none';
            headerContent.style.display = 'block';
        }
    }

    /**
     * Initialize Monaco Editor for header
     */
    initializeHeaderMonacoEditor() {
        try {
            const container = document.getElementById('header-monaco-editor');
            if (!container) {
                console.error('❌ Header Monaco Editor container not found');
                return;
            }

            // Check if Monaco Editor is available
            if (typeof monaco === 'undefined') {
                console.error('❌ Monaco Editor not available for header');
                return;
            }

            // Get current header content
            const headerContent = document.getElementById('jwt-header');
            const currentValue = headerContent.textContent || '{}';

            this.headerMonacoEditor = monaco.editor.create(container, {
                value: currentValue,
                language: 'json',
                theme: 'vs',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                wordWrap: 'on'
            });

            console.log('✅ Header Monaco Editor created successfully');
        } catch (error) {
            console.error('❌ Failed to create Header Monaco Editor:', error);
        }
    }

    /**
     * Update header editor content
     */
    updateHeaderEditorContent(content) {
        if (this.headerMonacoEditor) {
            try {
                // Try to format the JSON if it's valid
                const parsed = JSON.parse(content);
                this.headerMonacoEditor.setValue(JSON.stringify(parsed, null, 2));
            } catch (e) {
                // If not valid JSON, just set the raw content
                this.headerMonacoEditor.setValue(content || '{}');
            }
        }
    }

    /**
     * Update payload editor content
     */
    updatePayloadEditorContent(content) {
        if (this.monacoEditor) {
            try {
                // Try to format the JSON if it's valid
                const parsed = JSON.parse(content);
                this.monacoEditor.setValue(JSON.stringify(parsed, null, 2));
            } catch (e) {
                // If not valid JSON, just set the raw content
                this.monacoEditor.setValue(content || '{}');
            }
        }
    }

    /**
     * Save header changes
     */
    saveHeaderChanges() {
        if (!this.headerMonacoEditor) {
            console.error('❌ Header Monaco Editor not initialized');
            return;
        }

        try {
            const newValue = this.headerMonacoEditor.getValue();
            const parsed = JSON.parse(newValue);
            
            // Update the display
            document.getElementById('jwt-header').textContent = JSON.stringify(parsed, null, 2);
            
            // Hide the editor
            this.hideHeaderEditor();
            
            console.log('✅ Header changes saved');
        } catch (error) {
            console.error('❌ Invalid JSON:', error);
            alert('Invalid JSON format. Please fix the syntax errors.');
        }
    }
    
    /**
     * Decode current token from textarea or display
     */
    decodeCurrentToken() {
        console.log('🔍 decodeCurrentToken called');
        const tokenString = document.getElementById('token-string');
        const tokenDisplay = document.getElementById('token-display');
        const jwtHeader = document.getElementById('jwt-header');
        const jwtPayload = document.getElementById('jwt-payload');
        
        console.log('🔍 tokenString element:', tokenString);
        console.log('🔍 tokenDisplay element:', tokenDisplay);
        
        if (!jwtHeader || !jwtPayload) {
            console.error('❌ Required JWT display elements not found');
            return;
        }
        
        // Try to get token from display first, then fallback to textarea
        let token = '';
        if (tokenDisplay && tokenDisplay.style.display !== 'none') {
            // Get token from the colored display
            const tokenText = tokenDisplay.textContent || tokenDisplay.innerText;
            if (tokenText && tokenText !== 'No token data') {
                token = tokenText.trim();
            }
        }
        
        // Fallback to textarea if no token in display
        if (!token && tokenString) {
            token = tokenString.value.trim();
        }
        
        if (!token || token === 'No token data') {
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

            // Use CSRF-protected token refresh endpoint
            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🔁 Token refresh response:', result);
                
                if (result.success) {
                    console.log('✅ Token refreshed successfully');
                    this.addToTokenHistory('Token refreshed successfully', 'success');
                    
                    // Track successful token refresh
                    if (this.tokenAnalytics) {
                        this.tokenAnalytics.trackTokenRefresh(true);
                    }
                    
                    // Update the token display with new data
                    await this.updateTokenDisplay();
                    
                    if (this.app && this.app.showSuccess) {
                        this.app.showSuccess('Token refreshed successfully!');
                    }
                } else {
                    throw new Error(result.error || 'Token refresh failed');
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
        
        try {
            validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
            validateBtn.disabled = true;

            const response = await fetch('/api/token/status', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Track successful token validation
                if (this.tokenAnalytics) {
                    this.tokenAnalytics.trackTokenRequest(true);
                }
                
                this.addToTokenHistory('Token validation successful', 'success');
                if (this.app && this.app.showSuccess) {
                    this.app.showSuccess('Token is valid and active');
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
        // Guard: only run when the Token Management page is visible
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(async () => {
            const pageEl = document.getElementById('token-management-page');
            if (!pageEl || pageEl.style.display === 'none') {
                // Page not visible; skip work to avoid noisy logs
                return;
            }
            await this.updateTokenDisplay();
        }, 30000);
    }
    
    // Stop periodic monitoring when navigating away
    stopTokenMonitoring() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    // Lifecycle hooks used by app.js if available
    onHide() {
        this.stopTokenMonitoring();
    }
    
    onShow() {
        if (!this.refreshInterval) {
            this.startTokenMonitoring();
        }
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
