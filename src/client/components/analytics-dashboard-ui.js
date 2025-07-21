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
            <div id="analytics-dashboard-container" class="analytics-dashboard-container">
                <div class="dashboard-content">
                    <!-- Header -->
                    <div class="dashboard-header">
                        <div class="dashboard-title">
                            <h2><i class="fas fa-chart-line"></i> Analytics Dashboard</h2>
                            <div class="dashboard-subtitle">System metrics and performance overview</div>
                        </div>
                        <div class="dashboard-controls">
                            <div class="refresh-controls">
                                <button id="refresh-dashboard" class="btn btn-outline-primary btn-sm">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
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
        document.getElementById('close-dashboard')?.addEventListener('click', () => {
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
        this.updateSummaryCards(data.summary || {});
        this.updateSystemMetrics(data.system || {});
        this.updateOperationMetrics(data.operations || {});
        this.updateAlerts(data.alerts || []);
        this.updateActivity(data.activity || []);
    }
    
    /**
     * Update summary cards
     */
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
