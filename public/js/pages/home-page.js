// Home Page Module
// PingOne User Management Tool v7.2.0

export class HomePage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.lastTokenValidity = null; // Track token validity changes
    }
    
    async load() {
        if (this.isLoaded) return;
        
        console.log('📄 Loading Home page...');
        
        const pageContent = `
            <div class="page-header">
                <p class="page-subtitle">Manage users across your PingOne environment</p>
            </div>
            
            <div class="home-content">
                <!-- Quick Status Overview -->
                <div class="status-overview">
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="mdi mdi-shield" id="connection-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Connection Status</div>
                            <div class="status-value" id="connection-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="connection-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="icon-key" id="token-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Token Status</div>
                            <div class="status-value" id="token-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="token-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="mdi mdi-account-group" id="population-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Population</div>
                            <div class="status-value" id="population-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="population-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="mdi mdi-earth" id="environment-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Environment</div>
                            <div class="status-value" id="environment-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="environment-indicator"></div>
                    </div>
                </div>
                
                <!-- Configuration Section -->
                <div class="home-section">
                    <div class="section-header">
                        <h2><i class="icon-settings"></i> Configuration</h2>
                        <p class="section-description">Configure your PingOne environment and application settings</p>
                    </div>
                    <div class="action-cards-row">
                        <div class="action-card" data-action="settings">
                            <div class="card-icon">
                                <i class="icon-settings"></i>
                            </div>
                            <div class="card-content">
                                <h3>Settings</h3>
                                <p>Configure PingOne credentials and preferences</p>
                                <div class="card-status" id="settings-status">Ready</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- User Operations Section -->
                <div class="home-section">
                    <div class="section-header">
                        <h2><i class="icon-users"></i> User Operations</h2>
                        <p class="section-description">Import, export, modify, and delete users in your PingOne environment</p>
                    </div>
                    <div class="action-cards-row">
                        <div class="action-card" data-action="export">
                            <div class="card-icon">
                                <i class="icon-download"></i>
                            </div>
                            <div class="card-content">
                                <h3>Export Users</h3>
                                <p>Export users to CSV file</p>
                                <div class="card-status" id="export-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="import">
                            <div class="card-icon">
                                <i class="icon-upload"></i>
                            </div>
                            <div class="card-content">
                                <h3>Import Users</h3>
                                <p>Import users from CSV file</p>
                                <div class="card-status" id="import-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="delete">
                            <div class="card-icon">
                                <i class="icon-trash"></i>
                            </div>
                            <div class="card-content">
                                <h3>Delete Users</h3>
                                <p>Delete users from CSV file</p>
                                <div class="card-status" id="delete-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="modify">
                            <div class="card-icon">
                                <i class="icon-edit"></i>
                            </div>
                            <div class="card-content">
                                <h3>Modify Users</h3>
                                <p>Update user attributes from CSV</p>
                                <div class="card-status" id="modify-status">Ready</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Management & Monitoring Section -->
                <div class="home-section">
                    <div class="section-header">
                        <h2><i class="icon-activity"></i> Management & Monitoring</h2>
                        <p class="section-description">Monitor system health, view logs, and manage application operations</p>
                    </div>
                    <div class="action-cards-row">
                        <div class="action-card" data-action="logs">
                            <div class="card-icon">
                                <i class="icon-file-text"></i>
                            </div>
                            <div class="card-content">
                                <h3>Logs</h3>
                                <p>View application logs and errors</p>
                                <div class="card-status" id="logs-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="token-management">
                            <div class="card-icon">
                                <i class="icon-key"></i>
                            </div>
                            <div class="card-content">
                                <h3>Token Management</h3>
                                <p>Manage API tokens and authentication</p>
                                <div class="card-status" id="token-management-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="history">
                            <div class="card-icon">
                                <i class="icon-clock"></i>
                            </div>
                            <div class="card-content">
                                <h3>History</h3>
                                <p>View past operations and activities</p>
                                <div class="card-status" id="history-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="health-dashboard">
                            <div class="card-icon">
                                <i class="icon-activity"></i>
                            </div>
                            <div class="card-content">
                                <h3>Health Dashboard</h3>
                                <p>Monitor system health and performance</p>
                                <div class="card-status" id="health-dashboard-status">Ready</div>
                            </div>
                        </div>
                        
                        <div class="action-card" id="swagger-card" data-action="swagger" style="display: none;">
                            <div class="card-icon">
                                <i class="icon-code"></i>
                            </div>
                            <div class="card-content">
                                <h3>Swagger</h3>
                                <p>API documentation and testing</p>
                                <div class="card-status" id="swagger-status">Ready</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Activity -->
                <div class="recent-activity" style="max-width: 640px; margin: 0 auto;">
                    <h2 style="text-align:center;">Recent Activity</h2>
                    <div class="activity-list" id="activity-list" style="margin:0 auto;">
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="mdi mdi-check-circle" style="color:#16a34a;"></i>
                            </div>
                            <div class="activity-content">
                                <p>Application started successfully</p>
                                <span class="activity-time">${new Date().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="system-health" style="max-width: 960px; margin: 16px auto 0;">
                    <h2 style="text-align:center;">Server Health</h2>
                    <div id="health-panel" class="card" style="padding:16px; border:1px solid rgba(0,0,0,0.08); border-radius:12px; background:#f9fafb;">
                        <div id="health-summary" style="font-weight:600; margin-bottom:8px;">Checking...</div>
                        <div id="health-details" style="font-size: 13px; color:#111827;"></div>
                    </div>
                </div>
                
                <!-- System Information -->
                <div class="system-info">
                    <h2>System Information</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Application Version:</label>
                            <span>v${this.app.version}</span>
                        </div>
                        <div class="info-item">
                            <label>Environment:</label>
                            <span id="environment-info">Loading...</span>
                        </div>
                        <div class="info-item">
                            <label>Region:</label>
                            <span id="region-info">Loading...</span>
                        </div>
                        <div class="info-item">
                            <label>Last Updated:</label>
                            <span>${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const homePage = document.getElementById('home-page');
        if (homePage) {
            homePage.innerHTML = pageContent;
            this.setupEventListeners();
            this.loadDashboardData();
            this.isLoaded = true;
        }
    }
    
    setupEventListeners() {
        // Action cards are handled by the main app navigation handler
        // No additional event listeners needed for this page
    }
    
    async loadDashboardData() {
        // Load connection status
        this.updateConnectionStatus();
        
        // Load token status
        this.updateTokenStatus();
        
        // Load population count
        this.loadPopulationCount();
        
        // Load environment info
        this.loadEnvironmentInfo();
        
        // Show/hide Swagger card based on settings
        this.updateSwaggerVisibility();

        // Load server health info
        this.loadServerHealth();
    }
    
    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const connectionIndicator = document.getElementById('connection-indicator');
        const connectionIcon = document.getElementById('connection-icon');
        
        // Check if we have valid settings (client secret not required as it's not returned for security)
        const envId = this.app.settings.pingone_environment_id;
        const clientId = this.app.settings.pingone_client_id;
        const hasSettings = envId && clientId;
        
        // Check if we have a valid token (indicates successful connection)
        const hasValidToken = this.app.tokenStatus && this.app.tokenStatus.isValid;
        
        // Connection status check completed
        
        if (hasSettings && hasValidToken) {
            if (connectionStatus) connectionStatus.textContent = 'Connected';
            if (connectionIndicator) connectionIndicator.className = 'status-indicator valid';
            // Use a green check shield to convey positive state
            if (connectionIcon) {
                connectionIcon.className = 'mdi mdi-shield-check';
                connectionIcon.style.color = '#2ea043'; // green
            }
            // Connection status set to Connected
        } else if (hasSettings) {
            if (connectionStatus) connectionStatus.textContent = 'Configured';
            if (connectionIndicator) connectionIndicator.className = 'status-indicator warning';
            if (connectionIcon) {
                connectionIcon.className = 'mdi mdi-shield-alert';
                connectionIcon.style.color = '#d4a72c'; // amber
            }
            // Connection status set to Configured
        } else {
            if (connectionStatus) connectionStatus.textContent = 'Not Configured';
            if (connectionIndicator) connectionIndicator.className = 'status-indicator invalid';
            if (connectionIcon) {
                connectionIcon.className = 'mdi mdi-shield-off';
                connectionIcon.style.color = '#dc3545'; // red
            }
            // Connection status set to Not Configured
        }
    }
    
    updateTokenStatus() {
        const tokenStatus = document.getElementById('token-status');
        const tokenIndicator = document.getElementById('token-indicator');
        const tokenIcon = document.getElementById('token-icon');
        
        if (this.app.tokenStatus.isValid) {
            const timeLeft = this.app.formatTimeLeft(this.app.tokenStatus.timeLeft);
            if (tokenStatus) tokenStatus.textContent = `Valid (${timeLeft})`;
            if (tokenIndicator) tokenIndicator.className = 'status-indicator valid';
            if (tokenIcon) tokenIcon.className = 'icon-key';
        } else {
            if (tokenStatus) tokenStatus.textContent = 'Invalid or Expired';
            if (tokenIndicator) tokenIndicator.className = 'status-indicator invalid';
            if (tokenIcon) tokenIcon.className = 'icon-key-off';
        }
    }
    
    async loadPopulationCount() {
        const populationStatus = document.getElementById('population-status');
        const populationIndicator = document.getElementById('population-indicator');
        const populationIcon = document.getElementById('population-icon');
        
        console.log('📈 Loading population count for Home page...');
        
        try {
            // Check if we have the required settings
            if (!this.app.settings.pingone_environment_id) {
                console.log('⚠️ No environment ID configured');
                if (populationStatus) populationStatus.textContent = 'Not configured';
                if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
                if (populationIcon) populationIcon.className = 'mdi mdi-account-group-x';
                return;
            }
            
            // Check if we have a valid token
            if (!this.app.tokenStatus || !this.app.tokenStatus.isValid) {
                console.log('⚠️ No valid token available');
                if (populationStatus) populationStatus.textContent = 'No valid token';
                if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
                if (populationIcon) populationIcon.className = 'mdi mdi-account-group-x';
                return;
            }
            
            console.log('⚡ Fetching populations from server API (cache-enabled)...');
            
            // Use server-side API that now uses cache for fast loading
            const startTime = performance.now();
            const response = await fetch('/api/populations');
            const result = await response.json();
            const loadTime = Math.round(performance.now() - startTime);
            
            console.log('📦 Population API response received:', result);
            
            if (response.ok && result.success) {
                // Try different locations for populations data based on actual API response structure
                const populations = result.data?.message?.populations || result.data?.populations || result.message?.populations || [];
                const count = populations.length;
                const source = result.data?.message?.fromCache || result.data?.fromCache || result.message?.fromCache ? 'cache' : 'API';
                const cacheInfo = result.data?.message?.fromCache || result.data?.fromCache || result.message?.fromCache ? 
                    ` (cached at ${new Date(result.data?.message?.fetchedAt || result.data?.cachedAt || result.message?.cachedAt).toLocaleTimeString()})` : '';
                
                console.log(`✅ Populations loaded successfully: ${count} populations from ${source} in ${loadTime}ms${cacheInfo}`);
                
                if (populationStatus) populationStatus.textContent = `${count} population${count !== 1 ? 's' : ''}`;
                if (populationIndicator) populationIndicator.className = 'status-indicator valid';
                if (populationIcon) populationIcon.className = 'mdi mdi-account-group';
                
                // Add cache indicator to the UI if loaded from cache
                if (result.data?.message?.fromCache || result.data?.fromCache || result.message?.fromCache) {
                    if (populationStatus) {
                        populationStatus.title = `Loaded from cache in ${loadTime}ms\nCached at: ${new Date(result.data?.message?.fetchedAt || result.data?.cachedAt || result.message?.cachedAt).toLocaleString()}`;
                    }
                }
            } else {
                throw new Error(result.error || 'Failed to load populations');
            }
        } catch (error) {
            console.error('❌ Error loading population count:', error);
            if (populationStatus) populationStatus.textContent = 'Unable to load';
            if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
            if (populationIcon) populationIcon.className = 'mdi mdi-account-group-x';
        }
    }
    
    loadEnvironmentInfo() {
        const environmentInfo = document.getElementById('environment-info');
        const regionInfo = document.getElementById('region-info');
        const environmentStatus = document.getElementById('environment-status');
        const environmentIndicator = document.getElementById('environment-indicator');
        const environmentIcon = document.getElementById('environment-icon');
        
        // Update the Environment Status card
        if (environmentStatus) {
            const envId = this.app.settings.pingone_environment_id;
            if (envId) {
                environmentStatus.textContent = envId;
                if (environmentIndicator) environmentIndicator.className = 'status-indicator valid';
                if (environmentIcon) environmentIcon.className = 'mdi mdi-earth';
            } else {
                environmentStatus.textContent = 'Not configured';
                if (environmentIndicator) environmentIndicator.className = 'status-indicator invalid';
                if (environmentIcon) environmentIcon.className = 'mdi mdi-earth-x';
            }
        }
        
        // Legacy environment info (if still used elsewhere)
        if (environmentInfo) {
            const envId = this.app.settings.pingone_environment_id;
            environmentInfo.textContent = envId || 'Not configured';
        }
        
        if (regionInfo) {
            const regionCode = this.app.settings.pingone_region;
            const regionName = this.getRegionFullName(regionCode);
            regionInfo.textContent = regionName || 'Not configured';
        }
    }
    
    /**
     * Convert region code to full region name
     * @param {string} regionCode - The region code (NA, CA, EU, AU, SG, AP)
     * @returns {string} - The full region name
     */
    getRegionFullName(regionCode) {
        const regionMap = {
            'NA': 'North America region (excluding Canada)',
            'CA': 'Canada region',
            'EU': 'European Union region',
            'AU': 'Australia region',
            'SG': 'Singapore region',
            'AP': 'Asia-Pacific region',
            // Alternative codes that might be used
            'NorthAmerica': 'North America region (excluding Canada)',
            'Canada': 'Canada region',
            'Europe': 'European Union region',
            'Australia': 'Australia region',
            'Singapore': 'Singapore region',
            'Asia': 'Asia-Pacific region'
        };
        
        return regionMap[regionCode] || regionCode;
    }
    
    updateSwaggerVisibility() {
        const swaggerCard = document.getElementById('swagger-card');
        if (swaggerCard) {
            swaggerCard.style.display = this.app.settings.showSwaggerPage ? 'block' : 'none';
        }
    }

    async loadServerHealth() {
        const summaryEl = document.getElementById('health-summary');
        const detailsEl = document.getElementById('health-details');
        if (!summaryEl || !detailsEl) return;
        try {
            const [healthResp, cacheResp, swaggerResp, debugResp, logsResp] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/populations/cache-status'),
                fetch('/swagger.json'),
                fetch('/api/debug/modules'),
                fetch('/api/logs?limit=5')
            ].map(p => p.catch(() => null)));

            const data = healthResp ? await healthResp.json().catch(() => ({})) : {};
            const payload = data && (data.data || data.message) ? (data.data || data.message) : {};
            const status = payload.status || 'unknown';
            const checks = payload.checks || {};
            const rt = payload.responseTime || '';

            summaryEl.textContent = `Status: ${status} ${rt ? `(${rt})` : ''}`;
            summaryEl.style.color = status === 'healthy' ? '#16a34a' : '#dc2626';

            // Extra probes
            let cacheData = {};
            if (cacheResp && cacheResp.ok) {
                const cacheJson = await cacheResp.json().catch(() => ({}));
                const cacheMsg = cacheJson && (cacheJson.data || cacheJson.message) ? (cacheJson.data || cacheJson.message) : cacheJson;
                cacheData = {
                    hasCachedData: !!(cacheMsg && (cacheMsg.hasCachedData === true || cacheMsg.isExpired === false)),
                    cachedCount: cacheMsg?.count ?? cacheMsg?.data?.count ?? undefined,
                    cachedAt: cacheMsg?.cachedAt || null,
                };
            }

            const swaggerOk = !!(swaggerResp && swaggerResp.ok);
            const debugOk = !!(debugResp && debugResp.ok);
            let logsCount;
            if (logsResp && logsResp.ok) {
                const logsJson = await logsResp.json().catch(() => []);
                const list = Array.isArray(logsJson) ? logsJson : (logsJson.data || logsJson.logs || []);
                logsCount = Array.isArray(list) ? list.length : 0;
            }

            // Build pretty health/details + settings flags
            const settingsFlags = {
                showDisclaimerModal: this.app.settings?.showDisclaimerModal === true,
                showCredentialsModal: this.app.settings?.showCredentialsModal === true,
                showSwaggerPage: this.app.settings?.showSwaggerPage === true,
                autoRefreshToken: this.app.settings?.autoRefreshToken === true,
                pingone_population_id: this.app.settings?.pingone_population_id || ''
            };

            const pretty = {
                server: checks.server,
                environment: checks.environment,
                uptimeSec: Math.floor((checks.uptime || 0)),
                tokenManager: checks.tokenManager,
                tokenStatus: checks.tokenStatus,
                settingsAccessible: checks.settings,
                timestamp: checks.timestamp,
                populationCache: cacheData,
                swaggerAvailable: swaggerOk,
                debugModules: debugOk,
                recentLogs: logsCount,
                settings: settingsFlags
            };

            // Render pretty details as key/value blocks with colors
            const kv = [];
            const colorize = (val) => {
                if (val === true) return '<span style="color:#16a34a;font-weight:600;">Yes</span>';
                if (val === false) return '<span style="color:#dc2626;font-weight:600;">No</span>';
                if (typeof val === 'number') return `<span style="color:#1e40af;font-weight:600;">${val}</span>`;
                if (val == null) return '<span style="color:#6b7280;">—</span>';
                return `<span style="color:#111827;">${String(val)}</span>`;
            };

            const addRow = (label, valueHtml) => {
                kv.push(`<div style=\"display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:start;padding:6px 8px;border-top:1px solid rgba(0,0,0,0.06);\"><div style=\"color:#374151;font-weight:600;\">${label}</div><div>${valueHtml}</div></div>`);
            };

            addRow('Server', colorize(pretty.server?.ok ?? pretty.server));
            addRow('Environment', colorize(pretty.environment?.ok ?? pretty.environment));
            addRow('Uptime (sec)', colorize(pretty.uptimeSec));
            addRow('Token Manager', colorize(pretty.tokenManager?.ok ?? pretty.tokenManager));
            addRow('Token Status', colorize(pretty.tokenStatus?.valid ?? pretty.tokenStatus));
            addRow('Settings Accessible', colorize(pretty.settingsAccessible?.ok ?? pretty.settingsAccessible));
            addRow('Timestamp', colorize(pretty.timestamp));

            // Population cache block
            const pc = pretty.populationCache || {};
            const pcHtml = `
                <div style=\"display:flex;flex-wrap:wrap;gap:12px;\">
                    <div>Has Cache: ${colorize(pc.hasCachedData === true)}</div>
                    ${pc.cachedCount !== undefined ? `<div>Count: ${colorize(pc.cachedCount)}</div>` : ''}
                    <div>Cached At: ${colorize(pc.cachedAt || null)}</div>
                </div>`;
            addRow('Population Cache', pcHtml);

            addRow('Swagger Available', colorize(pretty.swaggerAvailable));
            addRow('Debug Modules', colorize(pretty.debugModules));
            addRow('Recent Logs (count)', colorize(pretty.recentLogs ?? 0));

            // Settings flags
            const s = pretty.settings || {};
            const sHtml = `
                <div style=\"display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;\">
                    <div><span style=\"color:#374151;font-weight:600;\">Disclaimer Modal:</span> ${colorize(s.showDisclaimerModal)}</div>
                    <div><span style=\"color:#374151;font-weight:600;\">Credentials Modal:</span> ${colorize(s.showCredentialsModal)}</div>
                    <div><span style=\"color:#374151;font-weight:600;\">Swagger Page:</span> ${colorize(s.showSwaggerPage)}</div>
                    <div><span style=\"color:#374151;font-weight:600;\">Auto Refresh Token:</span> ${colorize(s.autoRefreshToken)}</div>
                    <div style=\"grid-column:1/-1;\"><span style=\"color:#374151;font-weight:600;\">Default Population ID:</span> ${colorize(s.pingone_population_id || 'Not set')}</div>
                </div>`;
            addRow('Settings', sHtml);

            detailsEl.innerHTML = `<div style=\"border:1px solid rgba(0,0,0,0.06);border-radius:10px;background:#ffffff;overflow:hidden\">${kv.join('')}</div>`;

        } catch (e) {
                summaryEl.textContent = 'Status: unknown';
                summaryEl.style.color = '#9ca3af';
            detailsEl.textContent = `Error: ${e.message}`;
        }
    }
    
    addActivityItem(icon, message, type = 'info') {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        activityItem.innerHTML = `
            <div class="activity-icon ${type}">
                <i class="icon-${icon}"></i>
            </div>
            <div class="activity-content">
                <p>${message}</p>
                <span class="activity-time">${new Date().toLocaleString()}</span>
            </div>
        `;
        
        // Insert at the beginning
        activityList.insertBefore(activityItem, activityList.firstChild);
        
        // Keep only the last 10 items
        while (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }
    
    // Method to refresh dashboard data
    refresh() {
        if (this.isLoaded) {
            this.loadDashboardData();
            this.updateConnectionStatus();
            this.loadEnvironmentInfo();
            this.updateSwaggerVisibility();
        }
    }
    
    // Method called when token status changes
    onTokenStatusChange(tokenStatus) {
        if (this.isLoaded) {
            this.updateTokenStatus();
            this.updateConnectionStatus();
            
            // Only reload population count if token validity actually changed
            // (not just the countdown timer)
            const currentValidity = tokenStatus?.isValid;
            if (this.lastTokenValidity !== currentValidity) {
                console.log(`🔄 Token validity changed: ${this.lastTokenValidity} -> ${currentValidity}`);
                this.lastTokenValidity = currentValidity;
                this.loadPopulationCount();
            }
        }
    }
    
    // Method called when settings change
    onSettingsChange() {
        if (this.isLoaded) {
            this.updateConnectionStatus();
            this.loadEnvironmentInfo();
            this.loadPopulationCount();
            this.updateSwaggerVisibility();
        }
    }
}
