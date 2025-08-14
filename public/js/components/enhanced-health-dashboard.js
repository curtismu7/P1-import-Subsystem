// Enhanced Health Dashboard Frontend Component
// Version 7.3.0 - Phase 1 Improvements
//
// This component provides real-time health monitoring with:
// - Token status and expiry countdown
// - Memory usage visualization with alerts
// - API response time monitoring
// - System performance metrics
// - Interactive health actions

class EnhancedHealthDashboard {
    constructor() {
        this.updateInterval = 30000; // 30 seconds
        this.updateTimer = null;
        this.isVisible = false;
        this.lastUpdate = null;
        
        // Chart instances
        this.memoryChart = null;
        this.responseTimeChart = null;
        
        this.init();
    }

    /**
     * Initialize the health dashboard
     */
    init() {
        this.createDashboardHTML();
        this.bindEvents();
        this.startAutoUpdate();
        console.log('Enhanced Health Dashboard initialized');
    }

    /**
     * Create dashboard HTML structure
     */
    createDashboardHTML() {
        const dashboardHTML = `
            <div id="enhanced-health-dashboard" class="health-dashboard" style="display: none;">
                <div class="dashboard-header">
                    <h2>🏥 System Health Dashboard</h2>
                    <div class="dashboard-controls">
                        <button id="refresh-health" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button id="close-health-dashboard" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
                
                <div class="dashboard-content">
                    <!-- System Overview -->
                    <div class="health-section">
                        <h3>📊 System Overview</h3>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-label">Uptime</div>
                                <div class="metric-value" id="system-uptime">--</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Requests</div>
                                <div class="metric-value" id="total-requests">--</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Error Rate</div>
                                <div class="metric-value" id="error-rate">--</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Avg Response</div>
                                <div class="metric-value" id="avg-response-time">--</div>
                            </div>
                        </div>
                    </div>

                    <!-- Token Status -->
                    <div class="health-section">
                        <h3>🔐 Authentication Token</h3>
                        <div class="token-status" id="token-status">
                            <div class="status-indicator" id="token-indicator">
                                <span class="status-dot"></span>
                                <span class="status-text">Loading...</span>
                            </div>
                            <div class="token-details">
                                <div class="token-detail">
                                    <span class="label">Expires:</span>
                                    <span class="value" id="token-expiry">--</span>
                                </div>
                                <div class="token-detail">
                                    <span class="label">Time Remaining:</span>
                                    <span class="value" id="token-remaining">--</span>
                                </div>
                                <div class="token-detail">
                                    <span class="label">Refresh Count:</span>
                                    <span class="value" id="token-refresh-count">--</span>
                                </div>
                            </div>
                            <div class="token-actions">
                                <button id="force-token-refresh" class="btn btn-sm btn-warning">
                                    <i class="fas fa-redo"></i> Force Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Memory Status -->
                    <div class="health-section">
                        <h3>🧠 Memory Usage</h3>
                        <div class="memory-status" id="memory-status">
                            <div class="memory-overview">
                                <div class="memory-gauge">
                                    <div class="gauge-container">
                                        <div class="gauge-fill" id="memory-gauge-fill"></div>
                                        <div class="gauge-text" id="memory-percentage">--</div>
                                    </div>
                                </div>
                                <div class="memory-details">
                                    <div class="memory-detail">
                                        <span class="label">Heap Used:</span>
                                        <span class="value" id="heap-used">--</span>
                                    </div>
                                    <div class="memory-detail">
                                        <span class="label">Heap Total:</span>
                                        <span class="value" id="heap-total">--</span>
                                    </div>
                                    <div class="memory-detail">
                                        <span class="label">RSS:</span>
                                        <span class="value" id="memory-rss">--</span>
                                    </div>
                                    <div class="memory-detail">
                                        <span class="label">Trend:</span>
                                        <span class="value" id="memory-trend">--</span>
                                    </div>
                                </div>
                            </div>
                            <div class="memory-actions">
                                <button id="force-gc" class="btn btn-sm btn-info">
                                    <i class="fas fa-broom"></i> Force GC
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Health Recommendations -->
                    <div class="health-section">
                        <h3>💡 Recommendations</h3>
                        <div id="health-recommendations" class="recommendations-list">
                            <div class="loading-message">Loading recommendations...</div>
                        </div>
                    </div>

                    <!-- Performance Charts -->
                    <div class="health-section">
                        <h3>📈 Performance Trends</h3>
                        <div class="charts-container">
                            <div class="chart-wrapper">
                                <h4>Memory Usage Over Time</h4>
                                <canvas id="memory-chart" width="400" height="200"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <h4>API Response Times</h4>
                                <canvas id="response-time-chart" width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-footer">
                    <div class="last-update">
                        Last updated: <span id="last-update-time">Never</span>
                    </div>
                    <div class="auto-refresh">
                        <label>
                            <input type="checkbox" id="auto-refresh-toggle" checked>
                            Auto-refresh (30s)
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
        
        // Add CSS styles
        this.addDashboardStyles();
    }

    /**
     * Add dashboard CSS styles
     */
    addDashboardStyles() {
        const styles = `
            <style id="health-dashboard-styles">
                .health-dashboard {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 10000;
                    overflow-y: auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 30px;
                    background: #1a1a1a;
                    border-bottom: 1px solid #333;
                }

                .dashboard-header h2 {
                    color: #fff;
                    margin: 0;
                    font-size: 24px;
                }

                .dashboard-controls {
                    display: flex;
                    gap: 10px;
                }

                .dashboard-content {
                    padding: 30px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .health-section {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #333;
                }

                .health-section h3 {
                    color: #fff;
                    margin: 0 0 20px 0;
                    font-size: 18px;
                    border-bottom: 1px solid #444;
                    padding-bottom: 10px;
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }

                .metric-card {
                    background: #1a1a1a;
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid #444;
                    text-align: center;
                }

                .metric-label {
                    color: #aaa;
                    font-size: 12px;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }

                .metric-value {
                    color: #fff;
                    font-size: 24px;
                    font-weight: bold;
                }

                .token-status, .memory-status {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .status-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #666;
                }

                .status-dot.green { background: #28a745; }
                .status-dot.yellow { background: #ffc107; }
                .status-dot.red { background: #dc3545; }

                .status-text {
                    color: #fff;
                    font-weight: bold;
                }

                .token-details, .memory-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 10px;
                }

                .token-detail, .memory-detail {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: #1a1a1a;
                    border-radius: 4px;
                    border: 1px solid #444;
                }

                .token-detail .label, .memory-detail .label {
                    color: #aaa;
                    font-size: 12px;
                }

                .token-detail .value, .memory-detail .value {
                    color: #fff;
                    font-weight: bold;
                }

                .memory-overview {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .gauge-container {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: #1a1a1a;
                    border: 3px solid #444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gauge-fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, #28a745 0%, #28a745 50%, transparent 50%);
                    transition: all 0.3s ease;
                }

                .gauge-text {
                    position: relative;
                    color: #fff;
                    font-weight: bold;
                    font-size: 16px;
                    z-index: 1;
                }

                .recommendations-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .recommendation {
                    padding: 12px 15px;
                    border-radius: 6px;
                    border-left: 4px solid #666;
                    background: #1a1a1a;
                }

                .recommendation.high { border-left-color: #dc3545; }
                .recommendation.medium { border-left-color: #ffc107; }
                .recommendation.low { border-left-color: #28a745; }

                .recommendation-message {
                    color: #fff;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .recommendation-action {
                    color: #aaa;
                    font-size: 12px;
                }

                .charts-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                }

                .chart-wrapper {
                    background: #1a1a1a;
                    padding: 15px;
                    border-radius: 6px;
                    border: 1px solid #444;
                }

                .chart-wrapper h4 {
                    color: #fff;
                    margin: 0 0 15px 0;
                    font-size: 14px;
                    text-align: center;
                }

                .dashboard-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 30px;
                    background: #1a1a1a;
                    border-top: 1px solid #333;
                    color: #aaa;
                    font-size: 12px;
                }

                .auto-refresh label {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    cursor: pointer;
                }

                .loading-message {
                    color: #aaa;
                    text-align: center;
                    padding: 20px;
                }

                .btn {
                    padding: 6px 12px;
                    border: 1px solid #444;
                    border-radius: 4px;
                    background: #333;
                    color: #fff;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                }

                .btn:hover {
                    background: #444;
                    border-color: #555;
                }

                .btn-primary { background: #007bff; border-color: #007bff; }
                .btn-warning { background: #ffc107; border-color: #ffc107; color: #000; }
                .btn-info { background: #17a2b8; border-color: #17a2b8; }
                .btn-outline-primary { background: transparent; color: #007bff; }
                .btn-outline-secondary { background: transparent; color: #6c757d; }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close dashboard
        document.getElementById('close-health-dashboard').addEventListener('click', () => {
            this.hide();
        });

        // Refresh dashboard
        document.getElementById('refresh-health').addEventListener('click', () => {
            this.updateDashboard();
        });

        // Force token refresh
        document.getElementById('force-token-refresh').addEventListener('click', () => {
            this.forceTokenRefresh();
        });

        // Force garbage collection
        document.getElementById('force-gc').addEventListener('click', () => {
            this.forceGarbageCollection();
        });

        // Auto-refresh toggle
        document.getElementById('auto-refresh-toggle').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoUpdate();
            } else {
                this.stopAutoUpdate();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show the dashboard
     */
    show() {
        document.getElementById('enhanced-health-dashboard').style.display = 'block';
        this.isVisible = true;
        this.updateDashboard();
        console.log('Health dashboard shown');
    }

    /**
     * Hide the dashboard
     */
    hide() {
        document.getElementById('enhanced-health-dashboard').style.display = 'none';
        this.isVisible = false;
        this.stopAutoUpdate();
        console.log('Health dashboard hidden');
    }

    /**
     * Start auto-update timer
     */
    startAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        this.updateTimer = setInterval(() => {
            if (this.isVisible) {
                this.updateDashboard();
            }
        }, this.updateInterval);
    }

    /**
     * Stop auto-update timer
     */
    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Update dashboard data
     */
    async updateDashboard() {
        try {
            console.log('Updating health dashboard...');
            
            // Fetch comprehensive health data
            const response = await fetch('/api/health/dashboard');
            const result = await response.json();
            
            if (result.success) {
                this.updateSystemOverview(result.data.system, result.data.requests, result.data.performance);
                this.updateTokenStatus(result.data.token);
                this.updateMemoryStatus(result.data.memory);
                this.updateRecommendations(result.data.recommendations);
                
                this.lastUpdate = new Date();
                document.getElementById('last-update-time').textContent = this.lastUpdate.toLocaleTimeString();
            } else {
                console.error('Failed to fetch health data:', result.error);
            }
            
        } catch (error) {
            console.error('Error updating health dashboard:', error);
        }
    }

    /**
     * Update system overview section
     */
    updateSystemOverview(system, requests, performance) {
        if (system) {
            document.getElementById('system-uptime').textContent = this.formatUptime(system.uptime);
        }
        
        if (requests) {
            document.getElementById('total-requests').textContent = requests.total.toLocaleString();
            document.getElementById('error-rate').textContent = requests.errorRate + '%';
        }
        
        if (performance && performance.responseTime) {
            document.getElementById('avg-response-time').textContent = performance.responseTime.average + 'ms';
        }
    }

    /**
     * Update token status section
     */
    updateTokenStatus(tokenData) {
        if (!tokenData) return;
        
        const indicator = document.getElementById('token-indicator');
        const statusDot = indicator.querySelector('.status-dot');
        const statusText = indicator.querySelector('.status-text');
        
        // Update status indicator
        statusDot.className = `status-dot ${tokenData.statusColor}`;
        statusText.textContent = tokenData.statusText;
        
        // Update token details
        if (tokenData.expiresAt) {
            document.getElementById('token-expiry').textContent = new Date(tokenData.expiresAt).toLocaleString();
            document.getElementById('token-remaining').textContent = this.formatTimeRemaining(tokenData.timeToExpiry);
        }
        
        document.getElementById('token-refresh-count').textContent = tokenData.refreshCount || 0;
    }

    /**
     * Update memory status section
     */
    updateMemoryStatus(memoryData) {
        if (!memoryData || !memoryData.current) return;
        
        const current = memoryData.current;
        const status = memoryData.status;
        
        // Update memory gauge
        const gaugeFill = document.getElementById('memory-gauge-fill');
        const percentage = current.heapUsagePercent;
        
        let color = '#28a745'; // Green
        if (percentage > 85) color = '#dc3545'; // Red
        else if (percentage > 75) color = '#ffc107'; // Yellow
        
        gaugeFill.style.background = `conic-gradient(from 0deg, ${color} 0%, ${color} ${percentage}%, transparent ${percentage}%)`;
        document.getElementById('memory-percentage').textContent = percentage + '%';
        
        // Update memory details
        document.getElementById('heap-used').textContent = current.heapUsedMB + ' MB';
        document.getElementById('heap-total').textContent = current.heapTotalMB + ' MB';
        document.getElementById('memory-rss').textContent = current.rss + ' MB';
        
        if (memoryData.trend) {
            const trendElement = document.getElementById('memory-trend');
            trendElement.textContent = memoryData.trend.direction + ' (' + memoryData.trend.value + ')';
            trendElement.style.color = memoryData.trend.direction === 'increasing' ? '#dc3545' : 
                                     memoryData.trend.direction === 'decreasing' ? '#28a745' : '#aaa';
        }
    }

    /**
     * Update recommendations section
     */
    updateRecommendations(recommendations) {
        const container = document.getElementById('health-recommendations');
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<div class="loading-message">✅ No recommendations - system is healthy!</div>';
            return;
        }
        
        const recommendationsHTML = recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <div class="recommendation-message">${rec.message}</div>
                <div class="recommendation-action">${rec.action}</div>
            </div>
        `).join('');
        
        container.innerHTML = recommendationsHTML;
    }

    /**
     * Force token refresh
     */
    async forceTokenRefresh() {
        try {
            const button = document.getElementById('force-token-refresh');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            const response = await fetch('/api/health/token/refresh', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                console.log('Token refreshed successfully');
                this.updateDashboard();
            } else {
                console.error('Token refresh failed:', result.error);
            }
            
        } catch (error) {
            console.error('Error refreshing token:', error);
        } finally {
            const button = document.getElementById('force-token-refresh');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-redo"></i> Force Refresh';
        }
    }

    /**
     * Force garbage collection
     */
    async forceGarbageCollection() {
        try {
            const button = document.getElementById('force-gc');
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running GC...';
            
            const response = await fetch('/api/health/memory/gc', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                console.log('Garbage collection completed:', result.data);
                this.updateDashboard();
            } else {
                console.error('GC failed:', result.error);
            }
            
        } catch (error) {
            console.error('Error running GC:', error);
        } finally {
            const button = document.getElementById('force-gc');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-broom"></i> Force GC';
        }
    }

    /**
     * Format uptime in human readable format
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    /**
     * Format time remaining
     */
    formatTimeRemaining(ms) {
        if (ms <= 0) return 'Expired';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoUpdate();
        
        // Remove dashboard from DOM
        const dashboard = document.getElementById('enhanced-health-dashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        // Remove styles
        const styles = document.getElementById('health-dashboard-styles');
        if (styles) {
            styles.remove();
        }
        
        console.log('Enhanced Health Dashboard destroyed');
    }
}

// Export for use in other modules
window.EnhancedHealthDashboard = EnhancedHealthDashboard;
