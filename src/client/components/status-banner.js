/**
 * Dynamic Status Banner Component
 * 
 * Real-time status banner that replaces static build information with live
 * system status, token information, and health metrics. Updates automatically
 * to provide users with current system state.
 * 
 * ## Features
 * - Real-time system health status
 * - Token authentication status
 * - Version and build information
 * - Server uptime display
 * - Automatic refresh every 10 seconds
 * - Error handling and fallback display
 * - User-friendly status indicators
 * 
 * ## Status Indicators
 * - ✅ System healthy, token valid
 * - ⚠️ System degraded or token issues
 * - ❌ System error or token expired
 * - 🔄 System initializing
 */

class StatusBanner {
    constructor() {
        this.banner = document.getElementById('fix-banner');
        this.updateInterval = null;
        this.isVisible = true;
        this.lastUpdate = null;
        this.errorCount = 0;
        this.maxErrors = 3;
        
        // Status cache to avoid unnecessary updates
        this.lastStatus = null;
        
        this.logger = console; // Use console for now, can be replaced with app logger
        
        if (!this.banner) {
            this.logger.warn('Status banner element not found');
            return;
        }
        
        this.logger.info('StatusBanner initialized');
    }
    
    /**
     * Start the status banner with automatic updates
     */
    async start() {
        if (!this.banner) return;
        
        this.logger.info('Starting status banner updates');
        
        // Initial update
        await this.updateStatus();
        
        // Set up periodic updates every 10 seconds
        this.updateInterval = setInterval(() => {
            this.updateStatus().catch(error => {
                this.logger.error('Status update failed:', error);
            });
        }, 10000);
        
        // Set up click handler for hide button
        this.setupEventHandlers();
    }
    
    /**
     * Stop automatic updates
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.logger.info('Status banner updates stopped');
    }
    
    /**
     * Update status information from server
     */
    async updateStatus() {
        try {
            this.logger.debug('Updating status...');
            
            // Fetch status from multiple endpoints
            const [health, bundle, auth] = await Promise.all([
                this.fetchWithTimeout('/api/health', 5000),
                this.fetchWithTimeout('/api/bundle-info', 3000),
                this.fetchWithTimeout('/api/v1/auth/status', 3000)
            ]);
            
            const statusData = {
                health: health.status || 'unknown',
                version: this.extractVersion(bundle),
                build: this.extractBuild(bundle),
                tokenStatus: auth.status || 'Unknown',
                uptime: health.uptime || 0,
                timestamp: new Date().toISOString(),
                breadcrumbs: this.getBreadcrumbs()
            };
            
            // Only update if status has changed
            if (this.hasStatusChanged(statusData)) {
                this.renderStatus(statusData);
                this.lastStatus = statusData;
            }
            
            this.lastUpdate = Date.now();
            this.errorCount = 0; // Reset error count on success
            
            this.logger.debug('Status updated successfully', statusData);
            
        } catch (error) {
            this.errorCount++;
            this.logger.error('Status update failed:', error);
            
            if (this.errorCount <= this.maxErrors) {
                this.renderError(error);
            } else {
                // Stop updates after too many errors
                this.stop();
                this.renderFatalError();
            }
        }
    }
    
    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * Check if status has changed significantly
     */
    hasStatusChanged(newStatus) {
        if (!this.lastStatus) return true;
        
        // Also check if breadcrumbs have changed
        const currentBreadcrumbs = this.getBreadcrumbs();
        const lastBreadcrumbs = this.lastStatus.breadcrumbs || '';
        
        return (
            this.lastStatus.health !== newStatus.health ||
            this.lastStatus.tokenStatus !== newStatus.tokenStatus ||
            this.lastStatus.version !== newStatus.version ||
            this.lastStatus.build !== newStatus.build ||
            lastBreadcrumbs !== currentBreadcrumbs
        );
    }
    
    /**
     * Extract version from bundle info
     */
    extractVersion(bundle) {
        if (bundle && bundle.version) {
            return bundle.version;
        }
        
        // Try to extract from bundleFile name
        if (bundle && bundle.bundleFile) {
            const match = bundle.bundleFile.match(/v([\d.]+)/);
            if (match) return match[1];
        }
        
        return 'Unknown';
    }
    
    /**
     * Extract build info from bundle
     */
    extractBuild(bundle) {
        if (bundle && bundle.build) {
            return bundle.build;
        }
        
        // Try to extract timestamp from bundleFile
        if (bundle && bundle.bundleFile) {
            const match = bundle.bundleFile.match(/(\d{10,})/);
            if (match) return match[1];
        }
        
        return Date.now().toString();
    }
    
    /**
     * Render current status
     */
    renderStatus(status) {
        const statusIcon = this.getStatusIcon(status.health, status.tokenStatus);
        const tokenIcon = this.getTokenIcon(status.tokenStatus);
        const uptime = this.formatUptime(status.uptime);
        const breadcrumbs = this.getBreadcrumbs();
        
        // Create status message with breadcrumbs
        const statusMessage = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span>${breadcrumbs}</span>
                    <span style="border-left: 2px solid rgba(255,255,255,0.3); padding-left: 15px;">
                        ${statusIcon} SYSTEM: ${status.health.toUpperCase()}
                    </span>
                    <span>${tokenIcon} TOKEN: ${status.tokenStatus}</span>
                    <span>📦 v${status.version} (${status.build})</span>
                    <span>⏱️ ${uptime}</span>
                </div>
                <button onclick="this.parentElement.style.display='none'" 
                        style="background: white; color: green; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                    Hide
                </button>
            </div>
        `;
        
        this.banner.innerHTML = statusMessage.trim();
        
        // Update banner color based on status
        this.updateBannerStyle(status.health, status.tokenStatus);
    }
    
    /**
     * Get status icon based on system health and token status
     */
    getStatusIcon(health, tokenStatus) {
        if (health === 'ok' && tokenStatus === 'Valid') {
            return '✅';
        } else if (health === 'ok' || tokenStatus === 'Valid') {
            return '⚠️';
        } else {
            return '❌';
        }
    }
    
    /**
     * Get token icon based on token status
     */
    getTokenIcon(tokenStatus) {
        switch (tokenStatus) {
            case 'Valid':
                return '🔑';
            case 'Expired':
                return '⏰';
            case 'No token available':
                return '❌';
            default:
                return '❓';
        }
    }
    
    /**
     * Format uptime in human-readable format
     */
    formatUptime(seconds) {
        if (!seconds || seconds < 0) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    /**
     * Get current page breadcrumbs
     */
    getBreadcrumbs() {
        // Get current active view
        const activeView = document.querySelector('.view.active');
        const activeNavItem = document.querySelector('.nav-item.active');
        
        let currentPage = 'Home';
        let icon = '🏠';
        
        if (activeView) {
            const viewId = activeView.id;
            switch (viewId) {
                case 'import-view':
                    currentPage = 'Import Users';
                    icon = '📤';
                    break;
                case 'export-view':
                    currentPage = 'Export Users';
                    icon = '📥';
                    break;
                case 'delete-csv-view':
                    currentPage = 'Delete Users';
                    icon = '🗑️';
                    break;
                case 'modify-view':
                    currentPage = 'Modify Users';
                    icon = '✏️';
                    break;
                case 'settings-view':
                    currentPage = 'Settings';
                    icon = '⚙️';
                    break;
                case 'history-view':
                    currentPage = 'History';
                    icon = '📋';
                    break;
                case 'analytics-view':
                    currentPage = 'Analytics';
                    icon = '📊';
                    break;
                case 'logs-view':
                    currentPage = 'Logs';
                    icon = '📄';
                    break;
                case 'testing-view':
                    currentPage = 'Testing';
                    icon = '🧪';
                    break;
                default:
                    currentPage = 'Home';
                    icon = '🏠';
            }
        } else if (activeNavItem) {
            // Fallback to nav item if view detection fails
            const navText = activeNavItem.querySelector('span')?.textContent || 'Home';
            currentPage = navText;
            
            // Map nav text to icons
            const iconMap = {
                'Home': '🏠',
                'Import': '📤',
                'Export': '📥',
                'Delete': '🗑️',
                'Modify': '✏️',
                'Settings': '⚙️',
                'History': '📋',
                'Analytics': '📊',
                'Logs': '📄',
                'Testing': '🧪'
            };
            icon = iconMap[currentPage] || '🏠';
        }
        
        return `${icon} ${currentPage}`;
    }
    
    /**
     * Update banner background color based on status
     */
    updateBannerStyle(health, tokenStatus) {
        let backgroundColor = '#4CAF50'; // Default green
        
        if (health !== 'ok' || tokenStatus !== 'Valid') {
            if (health === 'error' || tokenStatus === 'Expired') {
                backgroundColor = '#f44336'; // Red for errors
            } else {
                backgroundColor = '#ff9800'; // Orange for warnings
            }
        }
        
        this.banner.style.backgroundColor = backgroundColor;
    }
    
    /**
     * Render error state
     */
    renderError(error) {
        const errorMessage = error.message || 'Status update failed';
        const timestamp = new Date().toLocaleTimeString();
        
        this.banner.innerHTML = `
            ⚠️ STATUS UPDATE FAILED: ${errorMessage} (${timestamp}) | 
            🔄 Retrying... (${this.errorCount}/${this.maxErrors})
            <button onclick="this.parentElement.style.display='none'" 
                    style="margin-left: 20px; background: white; color: orange; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Hide
            </button>
        `;
        
        this.banner.style.backgroundColor = '#ff9800'; // Orange for errors
    }
    
    /**
     * Render fatal error state (too many failures)
     */
    renderFatalError() {
        this.banner.innerHTML = `
            ❌ STATUS UPDATES DISABLED: Too many failures | 
            🔄 Refresh page to retry
            <button onclick="this.parentElement.style.display='none'" 
                    style="margin-left: 20px; background: white; color: red; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                Hide
            </button>
        `;
        
        this.banner.style.backgroundColor = '#f44336'; // Red for fatal errors
    }
    
    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Handle visibility changes to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logger.debug('Page hidden, pausing status updates');
                this.stop();
            } else {
                this.logger.debug('Page visible, resuming status updates');
                this.start();
            }
        });
        
        // Handle manual refresh on click
        this.banner.addEventListener('click', (event) => {
            // Don't refresh if clicking the hide button
            if (event.target.tagName === 'BUTTON') return;
            
            this.logger.info('Manual status refresh requested');
            this.updateStatus();
        });
        
        // Listen for navigation changes to update breadcrumbs
        this.setupNavigationListener();
    }
    
    /**
     * Set up navigation listener for breadcrumb updates
     */
    setupNavigationListener() {
        // Listen for nav item clicks
        document.addEventListener('click', (event) => {
            const navItem = event.target.closest('.nav-item');
            if (navItem && navItem.dataset.view) {
                // Small delay to allow view change to complete
                setTimeout(() => {
                    this.refreshBreadcrumbs();
                }, 100);
            }
        });
        
        // Listen for view changes (MutationObserver for class changes)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('view') && target.classList.contains('active')) {
                        this.refreshBreadcrumbs();
                    }
                }
            });
        });
        
        // Observe all view elements for class changes
        document.querySelectorAll('.view').forEach(view => {
            observer.observe(view, { attributes: true, attributeFilter: ['class'] });
        });
        
        // Also observe nav items for active state changes
        document.querySelectorAll('.nav-item').forEach(navItem => {
            observer.observe(navItem, { attributes: true, attributeFilter: ['class'] });
        });
    }
    
    /**
     * Refresh breadcrumbs without full status update
     */
    refreshBreadcrumbs() {
        if (this.lastStatus) {
            // Re-render with current status but updated breadcrumbs
            this.renderStatus(this.lastStatus);
        }
    }
    
    /**
     * Get current status information
     */
    getStatus() {
        return {
            isRunning: !!this.updateInterval,
            lastUpdate: this.lastUpdate,
            errorCount: this.errorCount,
            lastStatus: this.lastStatus
        };
    }
}

// Export for use in other modules
export default StatusBanner;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const statusBanner = new StatusBanner();
        statusBanner.start();
        
        // Make available globally for debugging
        window.statusBanner = statusBanner;
    });
} else {
    // DOM is already ready
    const statusBanner = new StatusBanner();
    statusBanner.start();
    
    // Make available globally for debugging
    window.statusBanner = statusBanner;
}