// Home Page Module
// PingOne User Management Tool v7.0.1.0

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
                            <i class="icon-shield" id="connection-icon"></i>
                        </div>
                        <div class="status-info">
                            <div class="status-label">Connection Status</div>
                            <div class="status-value" id="connection-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="connection-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="icon-key" id="token-icon"></i>
                        </div>
                        <div class="status-info">
                            <div class="status-label">Token Status</div>
                            <div class="status-value" id="token-status">Checking...</div>
                        </div>
                        <div class="status-indicator" id="token-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="icon-users" id="population-icon"></i>
                        </div>
                        <div class="status-info">
                            <div class="status-label">Populations</div>
                            <div class="status-value" id="population-count">Loading...</div>
                        </div>
                        <div class="status-indicator" id="population-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="icon-globe" id="environment-icon"></i>
                        </div>
                        <div class="status-info">
                            <div class="status-label">Environment ID</div>
                            <div class="status-value" id="environment-id">Loading...</div>
                        </div>
                        <div class="status-indicator" id="environment-indicator"></div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="quick-actions">
                    <h2>Quick Actions</h2>
                    <div class="action-grid">
                        <div class="action-card" data-action="settings">
                            <div class="action-icon">
                                <i class="icon-settings"></i>
                            </div>
                            <div class="action-content">
                                <h3>Settings</h3>
                                <p>Configure PingOne connection and preferences</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="import">
                            <div class="action-icon">
                                <i class="icon-upload"></i>
                            </div>
                            <div class="action-content">
                                <h3>Import Users</h3>
                                <p>Upload a CSV file to import users into PingOne</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="export">
                            <div class="action-icon">
                                <i class="icon-download"></i>
                            </div>
                            <div class="action-content">
                                <h3>Export Users</h3>
                                <p>Download user data from a population</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="modify">
                            <div class="action-icon">
                                <i class="icon-edit"></i>
                            </div>
                            <div class="action-content">
                                <h3>Modify Users</h3>
                                <p>Update user attributes in bulk</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="delete">
                            <div class="action-icon">
                                <i class="icon-trash"></i>
                            </div>
                            <div class="action-content">
                                <h3>Delete Users</h3>
                                <p>Remove users from a population</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="action-card" data-action="logs" id="swagger-card" style="display: none;">
                            <div class="action-icon">
                                <i class="icon-book"></i>
                            </div>
                            <div class="action-content">
                                <h3>API Documentation</h3>
                                <p>View interactive API documentation</p>
                            </div>
                            <div class="action-arrow">
                                <i class="icon-chevron-right"></i>
                            </div>
                        </div>
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
            if (connectionIcon) connectionIcon.className = 'icon-shield';
            // Connection status set to Connected
        } else if (hasSettings) {
            if (connectionStatus) connectionStatus.textContent = 'Configured';
            if (connectionIndicator) connectionIndicator.className = 'status-indicator warning';
            if (connectionIcon) connectionIcon.className = 'icon-shield';
            // Connection status set to Configured
        } else {
            if (connectionStatus) connectionStatus.textContent = 'Not Configured';
            if (connectionIndicator) connectionIndicator.className = 'status-indicator invalid';
            if (connectionIcon) connectionIcon.className = 'icon-shield-off';
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
        const populationCount = document.getElementById('population-count');
        const populationIndicator = document.getElementById('population-indicator');
        const populationIcon = document.getElementById('population-icon');
        
        console.log('📈 Loading population count for Home page...');
        
        try {
            // Check if we have the required settings
            if (!this.app.settings.pingone_environment_id) {
                console.log('⚠️ No environment ID configured');
                if (populationCount) populationCount.textContent = 'Not configured';
                if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
                if (populationIcon) populationIcon.className = 'icon-users-x';
                return;
            }
            
            // Check if we have a valid token
            if (!this.app.tokenStatus || !this.app.tokenStatus.isValid) {
                console.log('⚠️ No valid token available');
                if (populationCount) populationCount.textContent = 'No valid token';
                if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
                if (populationIcon) populationIcon.className = 'icon-users-x';
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
                // Try different locations for populations data
                const populations = result.data?.populations || result.message?.populations || [];
                const count = populations.length;
                const source = result.data?.fromCache || result.message?.fromCache ? 'cache' : 'API';
                const cacheInfo = result.data?.fromCache || result.message?.fromCache ? 
                    ` (cached at ${new Date(result.data?.cachedAt || result.message?.cachedAt).toLocaleTimeString()})` : '';
                
                console.log(`✅ Populations loaded successfully: ${count} populations from ${source} in ${loadTime}ms${cacheInfo}`);
                
                if (populationCount) populationCount.textContent = `${count} population${count !== 1 ? 's' : ''}`;
                if (populationIndicator) populationIndicator.className = 'status-indicator valid';
                if (populationIcon) populationIcon.className = 'icon-users';
                
                // Add cache indicator to the UI if loaded from cache
                if (result.data?.fromCache || result.message?.fromCache) {
                    if (populationCount) {
                        populationCount.title = `Loaded from cache in ${loadTime}ms\nCached at: ${new Date(result.data?.cachedAt || result.message?.cachedAt).toLocaleString()}`;
                    }
                }
            } else {
                throw new Error(result.error || 'Failed to load populations');
            }
        } catch (error) {
            console.error('❌ Error loading population count:', error);
            if (populationCount) populationCount.textContent = 'Unable to load';
            if (populationIndicator) populationIndicator.className = 'status-indicator invalid';
            if (populationIcon) populationIcon.className = 'icon-users-x';
        }
    }
    
    loadEnvironmentInfo() {
        const environmentInfo = document.getElementById('environment-info');
        const regionInfo = document.getElementById('region-info');
        const environmentId = document.getElementById('environment-id');
        const environmentIndicator = document.getElementById('environment-indicator');
        const environmentIcon = document.getElementById('environment-icon');
        
        // Update the new Environment ID card
        if (environmentId) {
            const envId = this.app.settings.pingone_environment_id;
            if (envId) {
                environmentId.textContent = envId;
                if (environmentIndicator) environmentIndicator.className = 'status-indicator valid';
                if (environmentIcon) environmentIcon.className = 'icon-globe';
            } else {
                environmentId.textContent = 'Not configured';
                if (environmentIndicator) environmentIndicator.className = 'status-indicator invalid';
                if (environmentIcon) environmentIcon.className = 'icon-globe-x';
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
