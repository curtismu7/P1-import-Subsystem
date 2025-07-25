/**
 * Simple Analytics Dashboard UI Component
 * 
 * Provides basic analytics dashboard interface with metrics, alerts, and status
 * without complex chart dependencies for better maintainability
 */

export class AnalyticsDashboardUI {
    constructor(eventBus, analyticsDashboardSubsystem) {
        this.eventBus = eventBus;
        this.analyticsDashboardSubsystem = analyticsDashboardSubsystem;
        this.isVisible = false;
        this.updateInterval = null;
        this.logger = this.analyticsDashboardSubsystem.logger;
        
        this.setupEventListeners();
    }
    
    /**
     * Initialize the analytics dashboard UI
     */
    async init() {
        this.logger.debug('Initializing Simple Analytics Dashboard UI');
        
        try {
            this.createDashboardHTML();
            this.setupUIEventListeners();
            
            this.logger.info('Simple Analytics Dashboard UI initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Simple Analytics Dashboard UI', error);
            throw error;
        }
    }
    
    /**
     * Show the analytics dashboard
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        const container = document.getElementById('analytics-dashboard-container');
        if (container) {
            container.classList.remove('hidden');
            this.startRealTimeUpdates();
            this.refreshDashboard();
            
            this.eventBus.emit('analytics-dashboard:shown');
            this.logger.debug('Analytics dashboard shown');
        }
    }
    
    /**
     * Hide the analytics dashboard
     */
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        const container = document.getElementById('analytics-dashboard-container');
        if (container) {
            container.classList.add('hidden');
            this.stopRealTimeUpdates();
            
            this.eventBus.emit('analytics-dashboard:hidden');
            this.logger.debug('Analytics dashboard hidden');
        }
    }
    
    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Create the dashboard HTML structure
     */
    createDashboardHTML() {
        const container = document.getElementById('analytics-view');
        if (!container) {
            this.logger.error('Analytics view container (#analytics-view) not found.');
            return;
        }

        const dashboardHTML = `
            <div id="analytics-dashboard-container" class="analytics-dashboard-container hidden">
                <div class="dashboard-content">
                    <!-- Header -->
                    <div class="dashboard-header">
                        <div class="dashboard-title">
                            <h2><i class="fas fa-chart-line"></i> Analytics Dashboard</h2>
                            <div class="dashboard-subtitle">Comprehensive real-time system metrics and performance overview</div>
                        </div>
                        <div class="dashboard-controls">
                            <div class="refresh-controls">
                                <span class="last-updated" id="last-updated">Last updated: Loading...</span>
                                <button id="refresh-dashboard" class="btn btn-outline-primary btn-sm ms-2">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                                <button id="close-analytics-dashboard" class="btn btn-outline-secondary btn-sm ms-2">
                                    <i class="fas fa-times"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- System Overview Cards -->
                    <div class="overview-section">
                        <div class="overview-cards">
                            <div class="overview-card">
                                <div class="card-icon"><i class="fas fa-clock"></i></div>
                                <div class="card-content">
                                    <div class="card-title">Current Time</div>
                                    <div class="card-value" id="current-time">Loading...</div>
                                    <div class="card-subtitle" id="timezone">Loading...</div>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="card-icon"><i class="fas fa-stopwatch"></i></div>
                                <div class="card-content">
                                    <div class="card-title">Session Duration</div>
                                    <div class="card-value" id="session-duration">Loading...</div>
                                    <div class="card-subtitle" id="session-start">Loading...</div>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="card-icon"><i class="fas fa-memory"></i></div>
                                <div class="card-content">
                                    <div class="card-title">Memory Usage</div>
                                    <div class="card-value" id="memory-usage">Loading...</div>
                                    <div class="card-subtitle" id="memory-details">Loading...</div>
                                </div>
                            </div>
                            <div class="overview-card">
                                <div class="card-icon"><i class="fas fa-microchip"></i></div>
                                <div class="card-content">
                                    <div class="card-title">CPU Usage</div>
                                    <div class="card-value" id="cpu-usage">Loading...</div>
                                    <div class="card-subtitle" id="cpu-details">Loading...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Detailed Metrics Section -->
                    <div class="metrics-section">
                        <div class="metrics-grid">
                            <!-- System Metrics -->
                            <div class="metrics-card">
                                <div class="metrics-header">
                                    <h3><i class="fas fa-desktop"></i> System Metrics</h3>
                                </div>
                                <div class="metrics-content">
                                    <div class="metric-row">
                                        <span class="metric-label">Browser:</span>
                                        <span class="metric-value" id="browser-info">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Platform:</span>
                                        <span class="metric-value" id="platform-info">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Screen Resolution:</span>
                                        <span class="metric-value" id="screen-resolution">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Viewport Size:</span>
                                        <span class="metric-value" id="viewport-size">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Hardware Concurrency:</span>
                                        <span class="metric-value" id="hardware-concurrency">Loading...</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Performance Metrics -->
                            <div class="metrics-card">
                                <div class="metrics-header">
                                    <h3><i class="fas fa-tachometer-alt"></i> Performance Metrics</h3>
                                </div>
                                <div class="metrics-content">
                                    <div class="metric-row">
                                        <span class="metric-label">Page Load Time:</span>
                                        <span class="metric-value" id="page-load-time">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">DOM Content Loaded:</span>
                                        <span class="metric-value" id="dom-content-loaded">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">First Paint:</span>
                                        <span class="metric-value" id="first-paint">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Resources Loaded:</span>
                                        <span class="metric-value" id="resources-loaded">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">DOM Elements:</span>
                                        <span class="metric-value" id="dom-elements">Loading...</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Network & Connection -->
                            <div class="metrics-card">
                                <div class="metrics-header">
                                    <h3><i class="fas fa-wifi"></i> Network & Connection</h3>
                                </div>
                                <div class="metrics-content">
                                    <div class="metric-row">
                                        <span class="metric-label">Connection Type:</span>
                                        <span class="metric-value" id="connection-type">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Downlink Speed:</span>
                                        <span class="metric-value" id="downlink-speed">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">RTT:</span>
                                        <span class="metric-value" id="rtt">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Online Status:</span>
                                        <span class="metric-value" id="online-status">Loading...</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Storage & Resources -->
                            <div class="metrics-card">
                                <div class="metrics-header">
                                    <h3><i class="fas fa-database"></i> Storage & Resources</h3>
                                </div>
                                <div class="metrics-content">
                                    <div class="metric-row">
                                        <span class="metric-label">Local Storage:</span>
                                        <span class="metric-value" id="local-storage">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Session Storage:</span>
                                        <span class="metric-value" id="session-storage">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Color Depth:</span>
                                        <span class="metric-value" id="color-depth">Loading...</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Pixel Ratio:</span>
                                        <span class="metric-value" id="pixel-ratio">Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Activity and Alerts Section -->
                    <div class="activity-section">
                        <div class="activity-grid">
                            <!-- Recent Activity -->
                            <div class="activity-card">
                                <div class="activity-header">
                                    <h3><i class="fas fa-history"></i> Recent Activity</h3>
                                    <button id="refresh-activity" class="btn btn-outline-primary btn-sm">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                                <div class="activity-content" id="activity-list">
                                    <div class="loading-placeholder">Loading recent activity...</div>
                                </div>
                            </div>
                            
                            <!-- System Alerts -->
                            <div class="alerts-card">
                                <div class="alerts-header">
                                    <h3><i class="fas fa-exclamation-triangle"></i> System Alerts</h3>
                                    <button id="clear-alerts" class="btn btn-outline-secondary btn-sm">
                                        <i class="fas fa-trash"></i> Clear
                                    </button>
                                </div>
                                <div class="alerts-content" id="alerts-container">
                                    <div class="no-alerts">
                                        <i class="fas fa-check-circle"></i>
                                        <span>No active alerts - All systems operational</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Summary Cards -->
                    <div class="summary-section">
                        <div class="summary-cards" id="summary-cards">
                            <!-- Dynamic summary cards will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- Simple Metrics Display -->
                    <div class="charts-section">
                        <div class="charts-grid">
                            <div class="chart-container">
                                <div class="chart-header">
                                    <h3>System Status</h3>
                                </div>
                                <div class="chart-wrapper">
                                    <div id="system-status-display" class="simple-metrics-display">
                                        <div class="metric-row">
                                            <span class="metric-label">CPU Usage:</span>
                                            <div class="metric-bar">
                                                <div class="metric-fill" id="cpu-fill" style="width: 0%"></div>
                                                <span class="metric-value" id="cpu-value">0%</span>
                                            </div>
                                        </div>
                                        <div class="metric-row">
                                            <span class="metric-label">Memory Usage:</span>
                                            <div class="metric-bar">
                                                <div class="metric-fill" id="memory-fill" style="width: 0%"></div>
                                                <span class="metric-value" id="memory-value">0%</span>
                                            </div>
                                        </div>
                                        <div class="metric-row">
                                            <span class="metric-label">Active Sessions:</span>
                                            <div class="metric-display">
                                                <span class="metric-value" id="sessions-value">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="chart-container">
                                <div class="chart-header">
                                    <h3>Operation Summary</h3>
                                </div>
                                <div class="chart-wrapper">
                                    <div id="operation-summary-display" class="simple-metrics-display">
                                        <div class="metric-row">
                                            <span class="metric-label">Total Operations:</span>
                                            <div class="metric-display">
                                                <span class="metric-value" id="total-ops-value">0</span>
                                            </div>
                                        </div>
                                        <div class="metric-row">
                                            <span class="metric-label">Success Rate:</span>
                                            <div class="metric-bar success-bar">
                                                <div class="metric-fill" id="success-fill" style="width: 0%"></div>
                                                <span class="metric-value" id="success-value">0%</span>
                                            </div>
                                        </div>
                                        <div class="metric-row">
                                            <span class="metric-label">Avg Response Time:</span>
                                            <div class="metric-display">
                                                <span class="metric-value" id="response-time-value">0ms</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Alerts -->
                    <div class="alerts-section">
                        <div class="section-header">
                            <h3><i class="fas fa-exclamation-triangle"></i> Active Alerts</h3>
                            <button id="clear-all-alerts" class="btn btn-outline-danger btn-sm">
                                <i class="fas fa-trash"></i> Clear All
                            </button>
                        </div>
                        <div class="alerts-container" id="alerts-container">
                            <div class="no-alerts">
                                <i class="fas fa-check-circle"></i>
                                <span>No active alerts - All systems operational</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activity -->
                    <div class="metrics-section">
                        <div class="section-header">
                            <h3><i class="fas fa-list"></i> Recent Activity</h3>
                            <button id="refresh-activity" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        <div class="activity-list" id="activity-list">
                            <div class="no-data">No recent activity</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert dashboard HTML into the page
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
        this.logger.debug('Simple analytics dashboard HTML created');
    }
    
    /**
     * Set up UI event listeners
     */
    setupUIEventListeners() {
        // Close dashboard
        document.getElementById('close-analytics-dashboard')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Refresh dashboard
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.refreshDashboard();
        });
        
        // Clear all alerts
        document.getElementById('clear-all-alerts')?.addEventListener('click', () => {
            this.clearAllAlerts();
        });
        
        // Refresh activity
        document.getElementById('refresh-activity')?.addEventListener('click', () => {
            this.refreshActivity();
        });
        
        // Close on background click
        document.getElementById('analytics-dashboard-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'analytics-dashboard-container') {
                this.hide();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
        
        this.logger.debug('Simple analytics dashboard UI event listeners set up');
    }
    
    /**
     * Set up EventBus listeners
     */
    setupEventListeners() {
        // Listen for analytics data updates
        this.eventBus.on('analytics:data-updated', (data) => {
            this.updateDashboard(data);
        });
        
        // Listen for new alerts
        this.eventBus.on('analytics:alert-created', (alert) => {
            this.addAlert(alert);
        });
        
        // Listen for activity updates
        this.eventBus.on('analytics:activity-updated', (activity) => {
            this.updateActivity(activity);
        });
        
        this.logger.debug('Simple analytics dashboard event listeners set up');
    }
    
    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.refreshDashboard();
        }, 5000); // Update every 5 seconds
        
        this.logger.debug('Real-time updates started');
    }
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.logger.debug('Real-time updates stopped');
    }
    
    /**
     * Refresh the entire dashboard
     */
    async refreshDashboard() {
        try {
            const data = await this.analyticsDashboardSubsystem.getAnalyticsData();
            this.updateDashboard(data);
            
            // Update refresh button state
            const refreshBtn = document.getElementById('refresh-dashboard');
            if (refreshBtn) {
                const icon = refreshBtn.querySelector('i');
                icon.classList.add('fa-spin');
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            }
        } catch (error) {
            this.logger.error('Failed to refresh dashboard', error);
        }
    }
    
    /**
     * Update dashboard with new data
     */
    updateDashboard(data) {
        if (!data) return;
        
        try {
            // Update last updated timestamp
            const lastUpdatedEl = document.getElementById('last-updated');
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            }
            
            // Update overview cards with time and system data
            this.updateOverviewCards(data);
            
            // Update detailed metrics sections
            this.updateSystemMetricsDetailed(data.system);
            this.updatePerformanceMetrics(data.performance);
            this.updateNetworkMetrics(data.network);
            this.updateStorageMetrics(data.browser);
            
            // Update activity and alerts
            this.updateActivity(data.activity);
            this.updateAlerts(data.alerts);
            
            // Update legacy summary cards if present
            if (data.summary) {
                this.updateSummaryCards(data.summary);
            }
            
            this.logger.debug('Dashboard updated successfully with comprehensive data');
        } catch (error) {
            this.logger.error('Failed to update dashboard', error);
        }
    }
    
    /**
     * Update overview cards with time, session, memory, and CPU data
     */
    updateOverviewCards(data) {
        // Current time and timezone
        const currentTimeEl = document.getElementById('current-time');
        const timezoneEl = document.getElementById('timezone');
        if (currentTimeEl && data.time) {
            currentTimeEl.textContent = data.time.currentTime || 'Unknown';
        }
        if (timezoneEl && data.time) {
            timezoneEl.textContent = data.time.timezone || 'Unknown timezone';
        }
        
        // Session duration
        const sessionDurationEl = document.getElementById('session-duration');
        const sessionStartEl = document.getElementById('session-start');
        if (sessionDurationEl && data.session) {
            sessionDurationEl.textContent = data.session.duration || 'Unknown';
        }
        if (sessionStartEl && data.session) {
            sessionStartEl.textContent = `Started: ${data.session.startTime || 'Unknown'}`;
        }
        
        // Memory usage
        const memoryUsageEl = document.getElementById('memory-usage');
        const memoryDetailsEl = document.getElementById('memory-details');
        if (memoryUsageEl && data.system && data.system.memory) {
            const memory = data.system.memory;
            memoryUsageEl.textContent = `${memory.usedPercent || 0}%`;
        }
        if (memoryDetailsEl && data.system && data.system.memory) {
            const memory = data.system.memory;
            memoryDetailsEl.textContent = `${memory.usedFormatted || '0 MB'} / ${memory.totalFormatted || '0 MB'}`;
        }
        
        // CPU usage
        const cpuUsageEl = document.getElementById('cpu-usage');
        const cpuDetailsEl = document.getElementById('cpu-details');
        if (cpuUsageEl && data.system && data.system.cpu) {
            cpuUsageEl.textContent = `${data.system.cpu.usage || 0}%`;
        }
        if (cpuDetailsEl && data.system && data.system.cpu) {
            cpuDetailsEl.textContent = data.system.cpu.details || 'Performance-based estimation';
        }
    }
    
    /**
     * Update detailed system metrics
     */
    updateSystemMetricsDetailed(system) {
        if (!system || !system.browser) return;
        
        const browser = system.browser;
        
        // Browser info
        const browserInfoEl = document.getElementById('browser-info');
        if (browserInfoEl) {
            browserInfoEl.textContent = browser.name || 'Unknown';
        }
        
        // Platform info
        const platformInfoEl = document.getElementById('platform-info');
        if (platformInfoEl) {
            platformInfoEl.textContent = browser.platform || 'Unknown';
        }
        
        // Screen resolution
        const screenResolutionEl = document.getElementById('screen-resolution');
        if (screenResolutionEl) {
            screenResolutionEl.textContent = browser.screenResolution || 'Unknown';
        }
        
        // Viewport size
        const viewportSizeEl = document.getElementById('viewport-size');
        if (viewportSizeEl) {
            viewportSizeEl.textContent = browser.viewportSize || 'Unknown';
        }
        
        // Hardware concurrency
        const hardwareConcurrencyEl = document.getElementById('hardware-concurrency');
        if (hardwareConcurrencyEl) {
            hardwareConcurrencyEl.textContent = browser.hardwareConcurrency || 'Unknown';
        }
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(performance) {
        if (!performance) return;
        
        // Page load time
        const pageLoadTimeEl = document.getElementById('page-load-time');
        if (pageLoadTimeEl) {
            pageLoadTimeEl.textContent = performance.pageLoadTime || 'Unknown';
        }
        
        // DOM content loaded
        const domContentLoadedEl = document.getElementById('dom-content-loaded');
        if (domContentLoadedEl) {
            domContentLoadedEl.textContent = performance.domContentLoaded || 'Unknown';
        }
        
        // First paint
        const firstPaintEl = document.getElementById('first-paint');
        if (firstPaintEl) {
            firstPaintEl.textContent = performance.firstPaint || 'Unknown';
        }
        
        // Resources loaded
        const resourcesLoadedEl = document.getElementById('resources-loaded');
        if (resourcesLoadedEl) {
            resourcesLoadedEl.textContent = performance.resourceCount || 'Unknown';
        }
        
        // DOM elements
        const domElementsEl = document.getElementById('dom-elements');
        if (domElementsEl) {
            domElementsEl.textContent = performance.domElements || 'Unknown';
        }
    }
    
    /**
     * Update network metrics
     */
    updateNetworkMetrics(network) {
        if (!network) return;
        
        // Connection type
        const connectionTypeEl = document.getElementById('connection-type');
        if (connectionTypeEl) {
            connectionTypeEl.textContent = network.effectiveType || 'Unknown';
        }
        
        // Downlink speed
        const downlinkSpeedEl = document.getElementById('downlink-speed');
        if (downlinkSpeedEl) {
            downlinkSpeedEl.textContent = network.downlink ? `${network.downlink} Mbps` : 'Unknown';
        }
        
        // RTT
        const rttEl = document.getElementById('rtt');
        if (rttEl) {
            rttEl.textContent = network.rtt ? `${network.rtt} ms` : 'Unknown';
        }
        
        // Online status
        const onlineStatusEl = document.getElementById('online-status');
        if (onlineStatusEl) {
            onlineStatusEl.textContent = network.online ? 'Online' : 'Offline';
            onlineStatusEl.className = `metric-value ${network.online ? 'status-online' : 'status-offline'}`;
        }
    }
    
    /**
     * Update storage and browser metrics
     */
    updateStorageMetrics(browser) {
        if (!browser) return;
        
        // Local storage
        const localStorageEl = document.getElementById('local-storage');
        if (localStorageEl) {
            localStorageEl.textContent = browser.localStorage || 'Unknown';
        }
        
        // Session storage
        const sessionStorageEl = document.getElementById('session-storage');
        if (sessionStorageEl) {
            sessionStorageEl.textContent = browser.sessionStorage || 'Unknown';
        }
        
        // Color depth
        const colorDepthEl = document.getElementById('color-depth');
        if (colorDepthEl) {
            colorDepthEl.textContent = browser.colorDepth || 'Unknown';
        }
        
        // Pixel ratio
        const pixelRatioEl = document.getElementById('pixel-ratio');
        if (pixelRatioEl) {
            pixelRatioEl.textContent = browser.pixelRatio || 'Unknown';
        }
    }
    
    updateSummaryCards(summary) {
        const container = document.getElementById('summary-cards');
        if (!container) return;
        
        const cards = [
            {
                icon: 'fas fa-users',
                iconClass: 'info',
                value: summary.totalOperations || 0,
                label: 'Total Operations',
                change: summary.operationsChange || '+0%'
            },
            {
                icon: 'fas fa-check-circle',
                iconClass: 'success',
                value: summary.successRate || '0%',
                label: 'Success Rate',
                change: summary.successRateChange || '+0%'
            },
            {
                icon: 'fas fa-clock',
                iconClass: 'warning',
                value: summary.avgResponseTime || '0ms',
                label: 'Avg Response Time',
                change: summary.responseTimeChange || '+0%'
            },
            {
                icon: 'fas fa-exclamation-triangle',
                iconClass: 'warning',
                value: summary.activeAlerts || 0,
                label: 'Active Alerts',
                change: summary.alertsChange || '+0'
            }
        ];
        
        container.innerHTML = cards.map(card => `
            <div class="summary-card">
                <div class="card-icon ${card.iconClass}">
                    <i class="${card.icon}"></i>
                </div>
                <div class="card-content">
                    <div class="card-value">${card.value}</div>
                    <div class="card-label">${card.label}</div>
                    <div class="card-change ${card.change.startsWith('-') ? 'negative' : ''}">${card.change}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Update system metrics display
     */
    updateSystemMetrics(system) {
        // Update CPU usage
        const cpuFill = document.getElementById('cpu-fill');
        const cpuValue = document.getElementById('cpu-value');
        if (cpuFill && cpuValue) {
            const cpu = system.cpuUsage || 0;
            cpuFill.style.width = `${cpu}%`;
            cpuValue.textContent = `${cpu}%`;
            cpuFill.className = `metric-fill ${cpu > 80 ? 'danger' : cpu > 60 ? 'warning' : 'success'}`;
        }
        
        // Update Memory usage
        const memoryFill = document.getElementById('memory-fill');
        const memoryValue = document.getElementById('memory-value');
        if (memoryFill && memoryValue) {
            const memory = system.memoryUsage || 0;
            memoryFill.style.width = `${memory}%`;
            memoryValue.textContent = `${memory}%`;
            memoryFill.className = `metric-fill ${memory > 80 ? 'danger' : memory > 60 ? 'warning' : 'success'}`;
        }
        
        // Update Active sessions
        const sessionsValue = document.getElementById('sessions-value');
        if (sessionsValue) {
            sessionsValue.textContent = system.activeSessions || 0;
        }
    }
    
    /**
     * Update operation metrics display
     */
    updateOperationMetrics(operations) {
        // Update total operations
        const totalOpsValue = document.getElementById('total-ops-value');
        if (totalOpsValue) {
            totalOpsValue.textContent = operations.totalOperations || 0;
        }
        
        // Update success rate
        const successFill = document.getElementById('success-fill');
        const successValue = document.getElementById('success-value');
        if (successFill && successValue) {
            const successRate = operations.successRate || 0;
            successFill.style.width = `${successRate}%`;
            successValue.textContent = `${successRate}%`;
        }
        
        // Update response time
        const responseTimeValue = document.getElementById('response-time-value');
        if (responseTimeValue) {
            responseTimeValue.textContent = operations.avgResponseTime || '0ms';
        }
    }
    
    /**
     * Update alerts
     */
    updateAlerts(alerts) {
        const container = document.getElementById('alerts-container');
        if (!container) return;
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <span>No active alerts - All systems operational</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.severity || 'info'}" data-alert-id="${alert.id}">
                <div class="alert-icon">
                    <i class="fas fa-${this.getAlertIcon(alert.severity)}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
                </div>
                <button class="alert-dismiss" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    /**
     * Add a new alert
     */
    addAlert(alert) {
        const container = document.getElementById('alerts-container');
        if (!container) return;
        
        // Remove "no alerts" message if present
        const noAlerts = container.querySelector('.no-alerts');
        if (noAlerts) {
            noAlerts.remove();
        }
        
        const alertHTML = `
            <div class="alert-item ${alert.severity || 'info'}" data-alert-id="${alert.id}">
                <div class="alert-icon">
                    <i class="fas fa-${this.getAlertIcon(alert.severity)}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
                </div>
                <button class="alert-dismiss" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('afterbegin', alertHTML);
    }
    
    /**
     * Update activity list
     */
    updateActivity(activities) {
        const container = document.getElementById('activity-list');
        if (!container) return;
        
        if (!activities || activities.length === 0) {
            container.innerHTML = '<div class="no-data">No recent activity</div>';
            return;
        }
        
        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type || 'info'}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Clear all alerts
     */
    clearAllAlerts() {
        const container = document.getElementById('alerts-container');
        if (container) {
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <span>No active alerts - All systems operational</span>
                </div>
            `;
        }
        
        this.eventBus.emit('analytics:alerts-cleared');
        this.logger.debug('All alerts cleared');
    }
    
    /**
     * Refresh activity
     */
    refreshActivity() {
        this.logger.debug('Refreshing activity');
        this.eventBus.emit('analytics:activity-refresh-requested');
        
        // Show refresh in progress
        const refreshBtn = document.getElementById('refresh-activity');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            icon.classList.add('fa-spin');
            setTimeout(() => icon.classList.remove('fa-spin'), 1000);
        }
    }
    
    /**
     * Get appropriate icon for alert severity
     */
    getAlertIcon(severity) {
        switch (severity) {
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }
    
    /**
     * Get appropriate icon for activity type
     */
    getActivityIcon(type) {
        switch (type) {
            case 'import': return 'upload';
            case 'export': return 'download';
            case 'delete': return 'trash';
            case 'modify': return 'edit';
            case 'error': return 'exclamation-circle';
            case 'success': return 'check-circle';
            default: return 'info-circle';
        }
    }
    
    /**
     * Format timestamp for display
     */
    formatTime(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopRealTimeUpdates();
        
        // Remove dashboard HTML
        const container = document.getElementById('analytics-dashboard-container');
        if (container) {
            container.remove();
        }
        
        this.logger.debug('Simple Analytics Dashboard UI destroyed');
    }
}
