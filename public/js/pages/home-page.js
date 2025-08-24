// Home Page Module
// PingOne User Management Tool v7.3.0

export class HomePage {
  constructor(app) {
    this.app = app;
    this.isLoaded = false;
    this.lastTokenValidity = null; // Track token validity changes
  }

  async load() {
    if (this.isLoaded) { return; }

    console.log('📄 Loading Home page...');

    const pageContent = `
            <!-- Dashboard Header -->
            <div class="dashboard-header">
                <div class="header-content">
                    <div class="header-left">
                        <h1 class="dashboard-title">SSO Import Dashboard</h1>
                        <p class="dashboard-subtitle">Monitor and manage your PingOne SSO data imports</p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary new-import-btn" id="new-import-btn">
                            <i class="mdi mdi-arrow-up"></i>
                            New Import
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Original Working Status Overview -->
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
                            <div class="status-label">Populations</div>
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
                            <div class="status-value" id="environment-status">b9817c16-9910-4415-b67e-4ac687da74d9</div>
                        </div>
                        <button type="button" class="copy-btn" id="copy-environment-btn" title="Copy Environment ID">
                            <i class="mdi mdi-content-copy"></i>
                        </button>
                        <div class="status-indicator valid" id="environment-indicator"></div>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="mdi mdi-map-marker" id="environment-name-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Environment Name</div>
                            <div class="status-value" id="environment-name-status">NorthAmerica</div>
                        </div>
                        <div class="status-indicator valid" id="environment-name-indicator"></div>
                    </div>

                    <div class="status-card">
                        <div class="status-icon">
                            <i class="mdi mdi-map" id="region-name-icon"></i>
                        </div>
                        <div>
                            <div class="status-label">Region</div>
                            <div class="status-value" id="region-name-status">Not configured</div>
                        </div>
                        <div class="status-indicator invalid" id="region-name-indicator"></div>
                    </div>
                </div>
                

            </div>
            
            <!-- Main Content Area - Left Side Layout -->
            <div class="main-content-left">
                <!-- Recent Imports Panel -->
                <div class="content-panel recent-imports-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <i class="mdi mdi-file-document"></i>
                            Recent Imports
                        </div>
                        <button class="btn btn-outline-secondary refresh-btn" id="refresh-imports-btn">
                            <i class="mdi mdi-refresh"></i>
                            Refresh
                        </button>
                    </div>
                    
                    <div class="imports-table">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Job Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Records</th>
                                    <th>Started</th>
                                </tr>
                            </thead>
                            <tbody id="imports-table-body">
                                <tr class="no-imports-row">
                                    <td colspan="5" class="text-center text-muted">
                                        No imports found. Start your first import to see data here.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Quick Actions Panel -->
                <div class="content-panel quick-actions-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <i class="mdi mdi-lightning-bolt"></i>
                            Quick Actions
                        </div>
                    </div>
                    
                    <div class="quick-actions-grid">
                        <button class="action-btn compact" onclick="window.location.hash='#import'">
                            <i class="mdi mdi-account-multiple"></i>
                            <span>Import Users</span>
                        </button>
                        
                        <button class="action-btn compact" onclick="window.location.hash='#import'">
                            <i class="mdi mdi-shield"></i>
                            <span>Import Apps</span>
                        </button>
                        
                        <button class="action-btn compact" onclick="window.location.hash='#import'">
                            <i class="mdi mdi-database"></i>
                            <span>Import Groups</span>
                        </button>
                        
                        <button class="action-btn compact" onclick="window.location.hash='#history'">
                            <i class="mdi mdi-history"></i>
                            <span>View History</span>
                        </button>
                        
                        <button class="action-btn compact" onclick="window.location.hash='#settings'">
                            <i class="mdi mdi-cog"></i>
                            <span>Settings</span>
                        </button>
                        
                        <button class="action-btn compact" onclick="window.location.hash='#export'">
                            <i class="mdi mdi-download"></i>
                            <span>Export Data</span>
                        </button>
                    </div>
                </div>
                
                <!-- Server Status & Activity Panel -->
                <div class="content-panel server-status-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <i class="mdi mdi-server"></i>
                            Server Status & Activity
                        </div>
                    </div>
                    
                    <!-- Prominent Time Display -->
                    <div class="time-display">
                        <div class="current-time">
                            <i class="mdi mdi-clock-outline"></i>
                            <span id="current-time">${new Date().toLocaleString()}</span>
                        </div>
                        <div class="server-uptime">
                            <i class="mdi mdi-timer-sand"></i>
                            <span id="server-uptime">Loading...</span>
                        </div>
                    </div>
                    
                    <!-- Server Information Grid -->
                    <div class="server-info-grid">
                        <div class="server-info-item">
                            <i class="mdi mdi-server"></i>
                            <div class="info-content">
                                <label>Server Status</label>
                                <span id="server-status" class="status-online">Online</span>
                            </div>
                        </div>
                        
                        <div class="server-info-item">
                            <i class="mdi mdi-memory"></i>
                            <div class="info-content">
                                <label>Memory Usage</label>
                                <span id="memory-usage">Loading...</span>
                            </div>
                        </div>
                        
                        <div class="server-info-item">
                            <i class="mdi mdi-cpu-64-bit"></i>
                            <div class="info-content">
                                <label>CPU Load</label>
                                <span id="cpu-load">Loading...</span>
                            </div>
                        </div>
                        
                        <div class="server-info-item">
                            <i class="mdi mdi-database"></i>
                            <div class="info-content">
                                <label>Database</label>
                                <span id="server-database-status" class="status-online">Connected</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activity List -->
                    <div class="activity-section">
                        <h3>Recent Activity</h3>
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
                </div>
            </div>
            
            <div class="page-header">
                <p>Welcome to the PingOne User Management Tool v${this.app.version}</p>
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
    const refreshBtn = document.getElementById('token-refresh-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const icon = document.getElementById('token-refresh-icon');

        try {
          refreshBtn.disabled = true;
          if (icon) { icon.classList.add('spinning'); }
          await this.app.attemptAutoRefresh('manual-home');
        } finally {
          refreshBtn.disabled = false;
          if (icon) { icon.classList.remove('spinning'); }
        }
      });
    }

    // Copy environment ID button
    const copyEnvironmentBtn = document.getElementById('copy-environment-btn');

    if (copyEnvironmentBtn) {
      copyEnvironmentBtn.addEventListener('click', () => this.copyEnvironmentId());
    }
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

    // Load new dashboard data (statistics and recent imports)
    await this.loadDashboardStatsAndImports();

    // Set up new import button
    this.setupNewImportButton();

    // Load server status information
    this.loadServerStatus();

    // Set up time updates
    this.setupTimeUpdates();
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
      if (connectionStatus) { connectionStatus.textContent = 'Connected'; }
      if (connectionIndicator) { connectionIndicator.className = 'status-indicator valid'; }
      // Use a green check shield to convey positive state
      if (connectionIcon) {
        connectionIcon.className = 'mdi mdi-shield-check';
        connectionIcon.style.color = '#2ea043'; // green
      }
      // Connection status set to Connected
    } else if (hasSettings) {
      if (connectionStatus) { connectionStatus.textContent = 'Configured'; }
      if (connectionIndicator) { connectionIndicator.className = 'status-indicator warning'; }
      if (connectionIcon) {
        connectionIcon.className = 'mdi mdi-shield-alert';
        connectionIcon.style.color = '#d4a72c'; // amber
      }
      // Connection status set to Configured
    } else {
      if (connectionStatus) { connectionStatus.textContent = 'Not Configured'; }
      if (connectionIndicator) { connectionIndicator.className = 'status-indicator invalid'; }
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
    const refreshBtn = document.getElementById('token-refresh-btn');
    const refreshIcon = document.getElementById('token-refresh-icon');

    if (this.app.tokenStatus.isRefreshing) {
      if (tokenStatus) { tokenStatus.textContent = 'Refreshing...'; }
      if (tokenIndicator) { tokenIndicator.className = 'status-indicator refreshing'; }
      if (tokenIcon) { tokenIcon.className = 'icon-sync'; }
      if (refreshBtn) { refreshBtn.disabled = true; }
      if (refreshIcon) { refreshIcon.classList.add('spinning'); }
    } else if (this.app.tokenStatus.isValid) {
      const timeLeft = this.app.formatTimeLeft(this.app.tokenStatus.timeLeft);

      if (tokenStatus) { tokenStatus.textContent = `Valid (${timeLeft})`; }
      if (tokenIndicator) { tokenIndicator.className = 'status-indicator valid'; }
      if (tokenIcon) { tokenIcon.className = 'icon-key'; }
      if (refreshBtn) { refreshBtn.disabled = false; }
      if (refreshIcon) { refreshIcon.classList.remove('spinning'); }
    } else {
      if (tokenStatus) { tokenStatus.textContent = 'Invalid or Expired'; }
      if (tokenIndicator) { tokenIndicator.className = 'status-indicator invalid'; }
      if (tokenIcon) { tokenIcon.className = 'icon-key-off'; }
      if (refreshBtn) { refreshBtn.disabled = false; }
      if (refreshIcon) { refreshIcon.classList.remove('spinning'); }
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
        if (populationStatus) { populationStatus.textContent = 'Not configured'; }
        if (populationIndicator) { populationIndicator.className = 'status-indicator invalid'; }
        if (populationIcon) { populationIcon.className = 'mdi mdi-account-group-x'; }

        return;
      }

      // Check if we have a valid token
      if (!this.app.tokenStatus || !this.app.tokenStatus.isValid) {
        console.log('⚠️ No valid token available');
        if (populationStatus) { populationStatus.textContent = 'No valid token'; }
        if (populationIndicator) { populationIndicator.className = 'status-indicator invalid'; }
        if (populationIcon) { populationIcon.className = 'mdi mdi-account-group-x'; }

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
        const cacheInfo = result.data?.message?.fromCache || result.data?.fromCache || result.message?.fromCache
          ? ` (cached at ${new Date(result.data?.message?.fetchedAt || result.data?.cachedAt || result.message?.cachedAt).toLocaleTimeString()})`
          : '';

        console.log(`✅ Populations loaded successfully: ${count} populations from ${source} in ${loadTime}ms${cacheInfo}`);

        if (populationStatus) { populationStatus.textContent = `${count}`; }
        if (populationIndicator) { populationIndicator.className = 'status-indicator valid'; }
        if (populationIcon) { populationIcon.className = 'mdi mdi-account-group'; }

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
      if (populationStatus) { populationStatus.textContent = 'Unable to load'; }
      if (populationIndicator) { populationIndicator.className = 'status-indicator invalid'; }
      if (populationIcon) { populationIcon.className = 'mdi mdi-account-group-x'; }
    }
  }

  loadEnvironmentInfo() {
    const environmentInfo = document.getElementById('environment-info');
    const regionInfo = document.getElementById('region-info');
    const environmentStatus = document.getElementById('environment-status');
    const environmentIndicator = document.getElementById('environment-indicator');
    const environmentIcon = document.getElementById('environment-icon');
    const environmentNameStatus = document.getElementById('environment-name-status');
    const environmentNameIndicator = document.getElementById('environment-name-indicator');

    // Update the Environment Status card
    if (environmentStatus) {
      const envId = this.app.settings.pingone_environment_id;

      if (envId) {
        environmentStatus.textContent = envId;
        if (environmentIndicator) { environmentIndicator.className = 'status-indicator valid'; }
        if (environmentIcon) { environmentIcon.className = 'mdi mdi-earth'; }
      } else {
        environmentStatus.textContent = 'Not configured';
        if (environmentIndicator) { environmentIndicator.className = 'status-indicator invalid'; }
        if (environmentIcon) { environmentIcon.className = 'mdi mdi-earth-x'; }
      }
    }

    // Legacy environment info (if still used elsewhere)
    if (environmentInfo) {
      const envId = this.app.settings.pingone_environment_id;

      environmentInfo.textContent = envId || 'Not configured';
    }

    if (environmentNameStatus) {
      const envName = this.app.settings.pingone_environment_name;

      if (envName) {
        environmentNameStatus.textContent = envName;
        if (environmentNameIndicator) { environmentNameIndicator.className = 'status-indicator valid'; }
      } else {
        // Fallback: fetch from server if not present in settings
        environmentNameStatus.textContent = 'Resolving...';
        if (environmentNameIndicator) { environmentNameIndicator.className = 'status-indicator warning'; }
        this.fetchAndSetEnvironmentName(environmentNameStatus, environmentNameIndicator)
          .catch(() => {
            environmentNameStatus.textContent = 'Not configured';
            if (environmentNameIndicator) { environmentNameIndicator.className = 'status-indicator invalid'; }
          });
      }
    }

    if (regionInfo) {
      const rawRegion = this.app.settings.pingone_region;
      const code = this.getRegionCode(rawRegion);
      const name = this.getRegionFullName(rawRegion);

      regionInfo.textContent = (code && name) ? `${code} — ${name}` : (name || code || 'Not configured');
    }

    // Update the Region Status card
    const regionNameStatus = document.getElementById('region-name-status');
    const regionNameIndicator = document.getElementById('region-name-indicator');

    if (regionNameStatus) {
      const rawRegion = this.app.settings.pingone_region;
      const code = this.getRegionCode(rawRegion);
      const name = this.getRegionFullName(rawRegion);

      if (code || name) {
        regionNameStatus.textContent = name && code ? `${name} (${code})` : (name || code);
        if (regionNameIndicator) { regionNameIndicator.className = 'status-indicator valid'; }
      } else {
        regionNameStatus.textContent = 'Resolving...';
        if (regionNameIndicator) { regionNameIndicator.className = 'status-indicator warning'; }
        this.fetchAndSetEnvironmentName(
          document.getElementById('environment-name-status'),
          document.getElementById('environment-name-indicator'),
        );
      }
    }
  }

  /**
   * Convert region code to full region name
   * @param {string} regionCode - The region code (NA, CA, EU, AU, SG, AP)
   * @returns {string} - The full region name
   */
  getRegionFullName(regionCode) {
    const regionMap = {
      NA: 'North America',
      CA: 'Canada',
      EU: 'Europe',
      AP: 'Asia Pacific',
      // Alternative legacy names
      NorthAmerica: 'North America',
      Canada: 'Canada',
      Europe: 'Europe',
      AsiaPacific: 'Asia Pacific',
    };

    return regionMap[regionCode] || regionCode;
  }

  /**
   * Normalize to short region code from either legacy or code
   * @param {string} region - e.g. 'NorthAmerica' or 'NA'
   * @returns {string} - 'NA' | 'EU' | 'AP' | 'CA' or empty string
   */
  getRegionCode(region) {
    const legacyToCode = {
      NorthAmerica: 'NA',
      Europe: 'EU',
      AsiaPacific: 'AP',
      Canada: 'CA',
    };

    if (!region) { return ''; }
    if (['NA', 'EU', 'AP', 'CA'].includes(region)) { return region; }

    return legacyToCode[region] || '';
  }

  // Duplicate loadDashboardData method removed - using the comprehensive version above

  /**
   * Load and populate dashboard statistics
   */
  async loadDashboardStats() {
    try {
      // Get import history data
      const historyResponse = await fetch('/api/history');
      const historyData = await historyResponse.json();

      if (historyData.success && historyData.data) {
        const imports = historyData.data.imports || [];
        const totalImports = imports.length;
        const completedImports = imports.filter((imp) => imp.status === 'completed').length;
        const processingImports = imports.filter((imp) => imp.status === 'processing').length;
        const failedImports = imports.filter((imp) => imp.status === 'failed').length;
        const successRate = totalImports > 0 ? Math.round((completedImports / totalImports) * 100) : 0;

        // Calculate total records
        const totalRecords = imports.reduce((sum, imp) => sum + (imp.records_processed || 0), 0);

        // Update statistics display
        this.updateStatValue('total-imports', totalImports);
        this.updateStatValue('completed-imports', completedImports);
        this.updateStatValue('processing-imports', processingImports);
        this.updateStatValue('failed-imports', failedImports);
        this.updateStatValue('success-rate', `${successRate}%`);
        this.updateStatValue('total-records', totalRecords);
      } else {
        // Set default values if no data
        this.updateStatValue('total-imports', 0);
        this.updateStatValue('completed-imports', 0);
        this.updateStatValue('processing-imports', 0);
        this.updateStatValue('failed-imports', 0);
        this.updateStatValue('success-rate', '0%');
        this.updateStatValue('total-records', 0);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard stats:', error);
      // Set default values on error
      this.updateStatValue('total-imports', 0);
      this.updateStatValue('completed-imports', 0);
      this.updateStatValue('processing-imports', 0);
      this.updateStatValue('failed-imports', 0);
      this.updateStatValue('success-rate', '0%');
      this.updateStatValue('total-records', 0);
    }
  }

  /**
   * Update a statistic value in the dashboard
   * @param elementId
   * @param value
   */
  updateStatValue(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Load and populate recent imports table
   */
  async loadRecentImports() {
    try {
      const historyResponse = await fetch('/api/history');
      const historyData = await historyResponse.json();

      const tableBody = document.getElementById('imports-table-body');

      if (!tableBody) { return; }

      if (historyData.success && historyData.data && historyData.data.imports) {
        const imports = historyData.data.imports.slice(0, 5); // Show last 5 imports

        if (imports.length === 0) {
          tableBody.innerHTML = `
                        <tr class="no-imports-row">
                            <td colspan="5" class="text-center text-muted">
                                No imports found. Start your first import to see data here.
                            </td>
                        </tr>
                    `;

          return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Add import rows
        imports.forEach((importItem) => {
          const row = this.createImportTableRow(importItem);

          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = `
                    <tr class="no-imports-row">
                        <td colspan="5" class="text-center text-muted">
                            No imports found. Start your first import to see data here.
                        </td>
                    </tr>
                `;
      }
    } catch (error) {
      console.error('❌ Error loading recent imports:', error);
      const tableBody = document.getElementById('imports-table-body');

      if (tableBody) {
        tableBody.innerHTML = `
                    <tr class="no-imports-row">
                        <td colspan="5" class="text-center text-muted">
                            Error loading imports. Please try refreshing.
                        </td>
                    </tr>
                `;
      }
    }
  }

  /**
   * Create a table row for an import item
   * @param importItem
   */
  createImportTableRow(importItem) {
    const row = document.createElement('tr');

    // Determine import type and icon
    const importType = this.getImportType(importItem);
    const typeIcon = this.getImportTypeIcon(importType);

    // Format status with appropriate styling
    const statusBadge = this.createStatusBadge(importItem.status);

    // Format records count
    const recordsText = importItem.records_processed && importItem.total_records
      ? `${importItem.records_processed}/${importItem.total_records}`
      : importItem.records_processed || '0';

    // Format start time
    const startTime = importItem.start_time
      ? new Date(importItem.start_time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      : 'Unknown';

    row.innerHTML = `
            <td>
                <div class="import-job-name">
                    <i class="mdi ${typeIcon}"></i>
                    <div>
                        <div class="job-name">${importItem.job_name || 'Unnamed Job'}</div>
                        <div class="job-file">${importItem.filename || 'No file'}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="import-type-badge">${importType}</span>
            </td>
            <td>${statusBadge}</td>
            <td>${recordsText}</td>
            <td>${startTime}</td>
        `;

    return row;
  }

  /**
   * Get import type from import data
   * @param importItem
   */
  getImportType(importItem) {
    if (importItem.job_type) { return importItem.job_type; }
    if (importItem.filename) {
      if (importItem.filename.includes('user') || importItem.filename.includes('csv')) { return 'Users'; }
      if (importItem.filename.includes('app') || importItem.filename.includes('json')) { return 'Applications'; }
      if (importItem.filename.includes('group') || importItem.filename.includes('xml')) { return 'Groups'; }
    }

    return 'Import';
  }

  /**
   * Get icon for import type
   * @param importType
   */
  getImportTypeIcon(importType) {
    const iconMap = {
      Users: 'mdi-account-multiple',
      Applications: 'mdi-shield',
      Groups: 'mdi-database',
      Import: 'mdi-file-upload',
    };

    return iconMap[importType] || 'mdi-file-upload';
  }

  /**
   * Create a status badge with appropriate styling
   * @param status
   */
  createStatusBadge(status) {
    const statusMap = {
      completed: { text: 'Completed', class: 'badge-success' },
      processing: { text: 'Processing', class: 'badge-warning' },
      failed: { text: 'Failed', class: 'badge-danger' },
      pending: { text: 'Pending', class: 'badge-info' },
      cancelled: { text: 'Cancelled', class: 'badge-secondary' },
    };

    const statusInfo = statusMap[status] || { text: status, class: 'badge-secondary' };

    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
  }

  /**
   * Set up refresh button functionality
   */
  setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-imports-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="mdi mdi-loading mdi-spin"></i> Refreshing...';

        try {
          await this.loadDashboardData();
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = '<i class="mdi mdi-refresh"></i> Refresh';
        }
      });
    }
  }

  /**
   * Set up new import button functionality
   */
  setupNewImportButton() {
    const newImportBtn = document.getElementById('new-import-btn');

    if (newImportBtn) {
      newImportBtn.addEventListener('click', () => {
        // Navigate to import page
        this.app.navigateToPage('import');
      });
    }
  }

  updateSwaggerVisibility() {
    const swaggerCard = document.getElementById('swagger-card');

    if (swaggerCard) {
      swaggerCard.style.display = this.app.settings.showSwaggerPage ? 'block' : 'none';
    }
  }

  /**
   * Fetch environment name from server and update UI and settings
   * @param environmentNameStatus
   * @param environmentNameIndicator
   */
  async fetchAndSetEnvironmentName(environmentNameStatus, environmentNameIndicator) {
    try {
      const resp = await fetch('/api/environment/info');
      const result = await resp.json();
      const name = result?.name || result?.data?.name || result?.message?.name || '';
      const region = result?.region || result?.data?.region || result?.message?.region || '';

      if (resp.ok && (result.success === true || result.success === undefined) && name) {
        environmentNameStatus.textContent = name;
        if (environmentNameIndicator) { environmentNameIndicator.className = 'status-indicator valid'; }
        // Cache into app settings for later reads
        this.app.settings.pingone_environment_name = name;
        if (region) {
          this.app.settings.pingone_region = region;
          const regionNameStatus = document.getElementById('region-name-status');
          const regionNameIndicator = document.getElementById('region-name-indicator');

          if (regionNameStatus) {
            const code = this.getRegionCode(region);
            const fullname = this.getRegionFullName(region);

            regionNameStatus.textContent = fullname && code ? `${fullname} (${code})` : (fullname || code || 'Not configured');
            if (regionNameIndicator) { regionNameIndicator.className = 'status-indicator valid'; }
          }
        }
      } else {
        throw new Error(result.error || 'No name');
      }
    } catch (_) {
      environmentNameStatus.textContent = 'Not configured';
      if (environmentNameIndicator) { environmentNameIndicator.className = 'status-indicator invalid'; }
      // Also mark region card invalid if present
      const regionNameStatus = document.getElementById('region-name-status');
      const regionNameIndicator = document.getElementById('region-name-indicator');

      if (regionNameStatus) {
        regionNameStatus.textContent = 'Not configured';
        if (regionNameIndicator) { regionNameIndicator.className = 'status-indicator invalid'; }
      }
    }
  }

  addActivityItem(icon, message, type = 'info') {
    const activityList = document.getElementById('activity-list');

    if (!activityList) { return; }

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

  /**
   * Update home page status boxes with real-time data
   */
  async updateHomeStatusBoxes() {
    try {
      // Token Status
      const tokenStatusEl = document.getElementById('home-token-status');

      if (tokenStatusEl && this.app.tokenStatus) {
        if (this.app.tokenStatus.isValid) {
          tokenStatusEl.textContent = 'Valid';
          tokenStatusEl.className = 'status-value status-success';
        } else if (this.app.tokenStatus.isRefreshing) {
          tokenStatusEl.textContent = 'Refreshing...';
          tokenStatusEl.className = 'status-value';
        } else {
          tokenStatusEl.textContent = 'Invalid/Expired';
          tokenStatusEl.className = 'status-value';
        }
      }

      // Token Time
      const tokenTimeEl = document.getElementById('home-token-time');

      if (tokenTimeEl && this.app.tokenStatus && this.app.tokenStatus.timeLeft && this.app.tokenStatus.timeLeft > 0) {
        tokenTimeEl.textContent = this.app.formatTimeLeft(this.app.tokenStatus.timeLeft);
      } else if (tokenTimeEl) {
        tokenTimeEl.textContent = '--';
      }

      // Server Status
      const serverStatusEl = document.getElementById('home-server-status');

      if (serverStatusEl) {
        serverStatusEl.textContent = 'Online';
        serverStatusEl.className = 'status-value status-success';
      }

      // Server Health
      const serverHealthEl = document.getElementById('home-server-health');

      if (serverHealthEl) {
        try {
          const healthResponse = await fetch('/api/health');

          if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            const status = healthData.status || 'unknown';

            serverHealthEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);

            if (status === 'ok') {
              serverHealthEl.className = 'status-value status-success';
            } else if (status === 'degraded') {
              serverHealthEl.className = 'status-value status-warning';
            } else {
              serverHealthEl.className = 'status-value status-danger';
            }
          }
        } catch (error) {
          serverHealthEl.textContent = 'Unknown';
          serverHealthEl.className = 'status-value';
        }
      }

      // Memory Usage
      const memoryUsageEl = document.getElementById('home-memory-usage');

      if (memoryUsageEl) {
        try {
          const healthResponse = await fetch('/api/health');

          if (healthResponse.ok) {
            const healthData = await healthResponse.json();

            if (healthData.system && healthData.system.memoryUsage) {
              memoryUsageEl.textContent = healthData.system.memoryUsage;

              const memoryPercent = parseInt(healthData.system.memoryUsage);

              if (memoryPercent < 70) {
                memoryUsageEl.className = 'status-value status-success';
              } else if (memoryPercent < 90) {
                memoryUsageEl.className = 'status-value status-warning';
              } else {
                memoryUsageEl.className = 'status-value status-danger';
              }
            } else {
              memoryUsageEl.textContent = '--';
            }
          }
        } catch (error) {
          memoryUsageEl.textContent = '--';
        }
      }

      // Uptime
      const uptimeEl = document.getElementById('home-uptime');

      if (uptimeEl) {
        try {
          const healthResponse = await fetch('/api/health');

          if (healthResponse.ok) {
            const healthData = await healthResponse.json();

            if (healthData.uptime) {
              uptimeEl.textContent = this.formatUptime(healthData.uptime);
            } else {
              uptimeEl.textContent = '--';
            }
          }
        } catch (error) {
          uptimeEl.textContent = '--';
        }
      }

      // Server Start
      const serverStartEl = document.getElementById('home-server-start');

      if (serverStartEl) {
        const statusText = document.getElementById('status-text');

        if (statusText && statusText.textContent.includes('Server started at:')) {
          const startTimeMatch = statusText.textContent.match(/Server started at: (.+)/);

          if (startTimeMatch) {
            const startDate = new Date(startTimeMatch[1]);

            serverStartEl.textContent = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          }
        } else {
          serverStartEl.textContent = '--';
        }
      }

      // Version
      const versionEl = document.getElementById('home-version');

      if (versionEl) {
        versionEl.textContent = this.app.version || 'v...';
      }
    } catch (error) {
      console.warn('Failed to update home status boxes:', error);
    }
  }

  /**
   * Format uptime in a human-readable format
   * @param seconds
   */
  formatUptime(seconds) {
    if (!seconds || seconds < 0) { return '--'; }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  /**
   * Copy environment ID to clipboard
   */
  copyEnvironmentId() {
    const envId = this.app.settings.pingone_environment_id;

    if (envId) {
      navigator.clipboard.writeText(envId).then(() => {
        // Show success state and checkmark
        const copyBtn = document.getElementById('copy-environment-btn');

        if (copyBtn) {
          const icon = copyBtn.querySelector('i');

          if (icon) {
            // Change to checkmark icon
            icon.className = 'mdi mdi-check';
          }

          // Add success classes
          icon.className = 'mdi mdi-check';
        }

        // Add success classes
        copyBtn.classList.add('success', 'copied');

        // Show notification
        this.app?.showNotification?.('Environment ID copied to clipboard!', 'success');

        // Reset after animation completes
        setTimeout(() => {
          copyBtn.classList.remove('success', 'copied');
          if (icon) {
            icon.className = 'mdi mdi-content-copy';
          }
        }, 2000);
      })
        .catch(() => {
          this.app?.showNotification?.('Failed to copy Environment ID', 'error');
        });
    } else {
      this.app?.showNotification?.('No Environment ID available to copy', 'warning');
    }
  }

  /**
   * Load server status information
   */
  async loadServerStatus() {
    try {
      // Update current time
      this.updateCurrentTime();

      // Load server health data
      await this.loadServerHealthData();

      // Update server information
      this.updateServerInfo();
    } catch (error) {
      console.warn('Failed to load server status:', error);
    }
  }

  /**
   * Update current time display
   */
  updateCurrentTime() {
    const currentTimeEl = document.getElementById('current-time');
    if (currentTimeEl) {
      currentTimeEl.textContent = new Date().toLocaleString();
    }
  }

    /**
   * Load server health data from API
   */
  async loadServerHealthData() {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const healthData = await response.json();
        
        // Update uptime
        const uptimeEl = document.getElementById('server-uptime');
        if (uptimeEl && healthData.uptime) {
          uptimeEl.textContent = this.formatUptime(healthData.uptime);
        }

        // Update memory usage
        const memoryEl = document.getElementById('memory-usage');
        if (memoryEl && healthData.memory) {
          const memoryMB = Math.round(healthData.memory.used / 1024 / 1024);
          const totalMB = Math.round(healthData.memory.total / 1024 / 1024);
          memoryEl.textContent = `${memoryMB}MB / ${totalMB}MB`;
        }

        // Update CPU load
        const cpuEl = document.getElementById('cpu-load');
        if (cpuEl && healthData.cpu) {
          const cpuPercent = Math.round(healthData.cpu.load * 100);
          cpuEl.textContent = `${cpuPercent}%`;
        }

        // Update server status
        const serverStatusEl = document.getElementById('server-status');
        if (serverStatusEl) {
          serverStatusEl.textContent = 'Online';
          serverStatusEl.className = 'status-online';
        }

        // Update database status
        const dbStatusEl = document.getElementById('server-database-status');
        if (dbStatusEl) {
          dbStatusEl.textContent = 'Connected';
          dbStatusEl.className = 'status-online';
        }

        // Update header color to green (server online)
        this.updateHeaderColor(true);
        
        // Add health check to activity list
        this.addActivityItem('Server health check completed', 'success');
      }
    } catch (error) {
      console.warn('Failed to load server health data:', error);
      
      // Set fallback values
      const serverStatusEl = document.getElementById('server-status');
      if (serverStatusEl) {
        serverStatusEl.textContent = 'Offline';
        serverStatusEl.className = 'status-offline';
      }

      const dbStatusEl = document.getElementById('server-database-status');
      if (dbStatusEl) {
        dbStatusEl.textContent = 'Disconnected';
        dbStatusEl.className = 'status-offline';
      }

      // Update header color to red (server offline)
      this.updateHeaderColor(false);
      
      // Add error to activity list
      this.addActivityItem('Server health check failed', 'error');
    }
  }

  /**
   * Update header color based on server status
   */
  updateHeaderColor(isOnline) {
    const timeDisplay = document.querySelector('.time-display');
    if (timeDisplay) {
      if (isOnline) {
        timeDisplay.classList.remove('server-offline');
      } else {
        timeDisplay.classList.add('server-offline');
      }
    }
  }

  /**
   * Update server information display
   */
  updateServerInfo() {
    // Update memory usage if not already set
    const memoryEl = document.getElementById('memory-usage');
    if (memoryEl && memoryEl.textContent === 'Loading...') {
      memoryEl.textContent = '--';
    }

    // Update CPU load if not already set
    const cpuEl = document.getElementById('cpu-load');
    if (cpuEl && cpuEl.textContent === 'Loading...') {
      cpuEl.textContent = '--';
    }

    // Update uptime if not already set
    const uptimeEl = document.getElementById('server-uptime');
    if (uptimeEl && uptimeEl.textContent === 'Loading...') {
      uptimeEl.textContent = '--';
    }

    // Set initial header color (will be updated when health data loads)
    this.updateHeaderColor(true); // Assume online initially
  }

  /**
   * Format uptime from seconds to human readable format
   */
  formatUptime(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Add activity item to the activity list
   */
  addActivityItem(message, type = 'info') {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    let iconClass = 'mdi mdi-information';
    if (type === 'success') iconClass = 'mdi mdi-check-circle';
    if (type === 'error') iconClass = 'mdi mdi-alert-circle';
    if (type === 'warning') iconClass = 'mdi mdi-alert';
    
    activityItem.innerHTML = `
      <div class="activity-icon">
        <i class="${iconClass}"></i>
      </div>
      <div class="activity-content">
        <p>${message}</p>
        <span class="activity-time">${new Date().toLocaleString()}</span>
      </div>
    `;
    
    // Add to the top of the list
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Keep only last 10 items
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 10) {
      items[items.length - 1].remove();
    }
  }

  /**
   * Set up time updates
   */
  setupTimeUpdates() {
    // Update time every second
    setInterval(() => {
      this.updateCurrentTime();
    }, 1000);

    // Update server status every 30 seconds
    setInterval(() => {
      this.loadServerHealthData();
    }, 30000);
    
    // Add initial activity items
    this.addActivityItem('Application started successfully', 'success');
    this.addActivityItem('Server status monitoring initialized', 'info');
  }
}
