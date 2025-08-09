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
                <p>Welcome to the PingOne User Management Tool v${this.app.version}</p>
            </div>
            
            <div class="home-container">
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
                
                <div class="quick-actions">
                    <h2>Quick Actions</h2>
                    <div class="action-grid">
                        <a href="#settings" class="action-card" data-page="settings">
                            <div class="card-icon">
                                <i class="mdi mdi-cog" data-icon="⚙️"></i>
                            </div>
                            <div class="card-content">
                                <h3>Settings</h3>
                                <p>Configure your PingOne environment</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                        
                        <a href="#import" class="action-card" data-page="import">
                            <div class="card-icon">
                                <i class="mdi mdi-upload" data-icon="📤"></i>
                            </div>
                            <div class="card-content">
                                <h3>Import Users</h3>
                                <p>Upload CSV files to import users</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                        
                        <a href="#export" class="action-card" data-page="export">
                            <div class="card-icon">
                                <i class="mdi mdi-download" data-icon="📥"></i>
                            </div>
                            <div class="card-content">
                                <h3>Export Users</h3>
                                <p>Download user data from populations</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                        
                        <a href="#modify" class="action-card" data-page="modify">
                            <div class="card-icon">
                                <i class="mdi mdi-pencil" data-icon="✏️"></i>
                            </div>
                            <div class="card-content">
                                <h3>Modify Users</h3>
                                <p>Update user information in bulk</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                        
                        <a href="#delete" class="action-card" data-page="delete">
                            <div class="card-icon">
                                <i class="mdi mdi-delete" data-icon="🗑️"></i>
                            </div>
                            <div class="card-content">
                                <h3>Delete Users</h3>
                                <p>Remove users from populations</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                        
                        <a href="#logs" class="action-card" data-page="logs">
                            <div class="card-icon">
                                <i class="mdi mdi-book-open" data-icon="📖"></i>
                            </div>
                            <div class="card-content">
                                <h3>Logs</h3>
                                <p>View operation history and logs</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>

                        <a href="#history" class="action-card" data-page="history">
                            <div class="card-icon">
                                <i class="mdi mdi-history" data-icon="🕓"></i>
                            </div>
                            <div class="card-content">
                                <h3>History</h3>
                                <p>Browse recent operations</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>

                        <a href="#token" class="action-card" data-page="token">
                            <div class="card-icon">
                                <i class="mdi mdi-key-variant" data-icon="🔑"></i>
                            </div>
                            <div class="card-content">
                                <h3>Token Management</h3>
                                <p>View and manage API token</p>
                                <i class="mdi mdi-chevron-right"></i>
                            </div>
                        </a>
                    </div>
                </div>
                
                <!-- Recent Activity -->
                <div class="recent-activity">
                    <h2>Recent Activity</h2>
                    <div class="activity-list" id="activity-list">
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="mdi mdi-check-circle"></i>
                            </div>
                            <div class="activity-content">
                                <p>Application started successfully</p>
                                <span class="activity-time">${new Date().toLocaleString()}</span>
                            </div>
                        </div>
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
