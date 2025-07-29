/**
 * Version Display Component
 * 
 * Displays the application version in the UI footer with additional
 * build information and health status indicators.
 * 
 * Features:
 * - Semantic version display (e.g., v6.5.1.4)
 * - Build timestamp and hash information
 * - Health status indicator
 * - Click to show detailed build info
 * - Automatic updates when version changes
 */

class VersionDisplay {
    constructor(options = {}) {
        this.options = {
            containerId: options.containerId || 'version-display',
            position: options.position || 'footer-right',
            showBuildInfo: options.showBuildInfo !== false,
            showHealthStatus: options.showHealthStatus !== false,
            autoUpdate: options.autoUpdate !== false,
            ...options
        };
        
        this.version = null;
        this.buildInfo = null;
        this.healthStatus = null;
        this.updateInterval = null;
        
        this.init();
    }
    
    /**
     * Initialize version display
     */
    async init() {
        try {
            // Load version information
            await this.loadVersionInfo();
            
            // Create display element
            this.createElement();
            
            // Start auto-update if enabled
            if (this.options.autoUpdate) {
                this.startAutoUpdate();
            }
            
            console.log('✅ Version display initialized', {
                version: this.version,
                position: this.options.position
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize version display:', error);
        }
    }
    
    /**
     * Load version information from various sources
     */
    async loadVersionInfo() {
        try {
            // Try to load from bundle manifest first
            const manifestResponse = await fetch('/js/bundle-manifest.json');
            if (manifestResponse.ok) {
                this.buildInfo = await manifestResponse.json();
                this.version = this.buildInfo.version;
            }
            
            // Fallback to package info if manifest not available
            if (!this.version) {
                const packageResponse = await fetch('/api/version');
                if (packageResponse.ok) {
                    const packageInfo = await packageResponse.json();
                    this.version = packageInfo.version;
                }
            }
            
            // Load health status if enabled
            if (this.options.showHealthStatus) {
                await this.loadHealthStatus();
            }
            
            // Fallback version if all else fails
            if (!this.version) {
                this.version = '6.5.1.4'; // Current version as fallback
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load version info:', error.message);
            this.version = '6.5.1.4'; // Fallback version
        }
    }
    
    /**
     * Load health status from server
     */
    async loadHealthStatus() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const health = await response.json();
                this.healthStatus = {
                    status: health.status,
                    optimization: health.optimization,
                    checks: health.checks
                };
            }
        } catch (error) {
            console.warn('⚠️ Could not load health status:', error.message);
        }
    }
    
    /**
     * Create version display element
     */
    createElement() {
        // Remove existing element if present
        const existing = document.getElementById(this.options.containerId);
        if (existing) {
            existing.remove();
        }
        
        // Create container element
        const container = document.createElement('div');
        container.id = this.options.containerId;
        container.className = `version-display ${this.options.position}`;
        
        // Create version text
        const versionText = document.createElement('span');
        versionText.className = 'version-text';
        versionText.textContent = `v${this.version}`;
        
        // Add health status indicator if enabled
        if (this.options.showHealthStatus && this.healthStatus) {
            const statusIndicator = this.createStatusIndicator();
            container.appendChild(statusIndicator);
        }
        
        container.appendChild(versionText);
        
        // Add click handler for detailed info
        if (this.options.showBuildInfo) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', () => this.showDetailedInfo());
            container.title = 'Click for build information';
        }
        
        // Add to page
        this.appendToPage(container);
        
        // Apply styles
        this.applyStyles();
    }
    
    /**
     * Create health status indicator
     */
    createStatusIndicator() {
        const indicator = document.createElement('span');
        indicator.className = 'health-indicator';
        
        const status = this.healthStatus.status;
        let color = '#28a745'; // green
        let title = 'System healthy';
        
        if (status === 'degraded') {
            color = '#ffc107'; // yellow
            title = 'System degraded';
        } else if (status === 'error') {
            color = '#dc3545'; // red
            title = 'System error';
        }
        
        indicator.style.cssText = `
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${color};
            margin-right: 6px;
            animation: pulse 2s infinite;
        `;
        
        indicator.title = title;
        
        return indicator;
    }
    
    /**
     * Append version display to appropriate location on page
     */
    appendToPage(element) {
        let targetContainer;
        
        // Try to find appropriate container based on position
        if (this.options.position.includes('footer')) {
            targetContainer = document.querySelector('footer') || 
                            document.querySelector('.footer') ||
                            document.querySelector('#footer');
        }
        
        // Fallback to body if no specific container found
        if (!targetContainer) {
            targetContainer = document.body;
        }
        
        targetContainer.appendChild(element);
    }
    
    /**
     * Apply CSS styles to version display
     */
    applyStyles() {
        // Check if styles already exist
        if (document.getElementById('version-display-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'version-display-styles';
        styles.textContent = `
            .version-display {
                position: fixed;
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 11px;
                color: #6c757d;
                background: rgba(255, 255, 255, 0.9);
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #e9ecef;
                backdrop-filter: blur(4px);
                transition: all 0.2s ease;
            }
            
            .version-display:hover {
                background: rgba(255, 255, 255, 0.95);
                color: #495057;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .version-display.footer-right {
                bottom: 10px;
                right: 10px;
            }
            
            .version-display.footer-left {
                bottom: 10px;
                left: 10px;
            }
            
            .version-display.header-right {
                top: 10px;
                right: 10px;
            }
            
            .version-display.header-left {
                top: 10px;
                left: 10px;
            }
            
            .version-text {
                font-weight: 500;
            }
            
            .health-indicator {
                display: inline-block;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .version-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .version-modal-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .version-modal h3 {
                margin-top: 0;
                color: #333;
            }
            
            .version-info-grid {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 8px;
                margin: 15px 0;
            }
            
            .version-info-label {
                font-weight: 600;
                color: #666;
            }
            
            .version-info-value {
                font-family: monospace;
                color: #333;
                word-break: break-all;
            }
            
            .close-button {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                float: right;
                margin-top: 15px;
            }
            
            .close-button:hover {
                background: #0056b3;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Show detailed build information modal
     */
    showDetailedInfo() {
        const modal = document.createElement('div');
        modal.className = 'version-modal';
        
        const content = document.createElement('div');
        content.className = 'version-modal-content';
        
        let infoHTML = `
            <h3>🚀 PingOne Import Tool - Build Information</h3>
            <div class="version-info-grid">
                <div class="version-info-label">Version:</div>
                <div class="version-info-value">v${this.version}</div>
        `;
        
        if (this.buildInfo) {
            infoHTML += `
                <div class="version-info-label">Bundle:</div>
                <div class="version-info-value">${this.buildInfo.bundleFile}</div>
                
                <div class="version-info-label">Build Time:</div>
                <div class="version-info-value">${new Date(this.buildInfo.timestamp).toLocaleString()}</div>
                
                <div class="version-info-label">Bundle Size:</div>
                <div class="version-info-value">${this.formatBytes(this.buildInfo.size)}</div>
                
                <div class="version-info-label">Hash:</div>
                <div class="version-info-value">${this.buildInfo.hash?.substring(0, 16)}...</div>
            `;
        }
        
        if (this.healthStatus) {
            infoHTML += `
                <div class="version-info-label">System Status:</div>
                <div class="version-info-value">${this.healthStatus.status}</div>
                
                <div class="version-info-label">Token Cached:</div>
                <div class="version-info-value">${this.healthStatus.optimization?.tokenCached ? '✅ Yes' : '❌ No'}</div>
                
                <div class="version-info-label">Populations Cached:</div>
                <div class="version-info-value">${this.healthStatus.optimization?.populationsCached ? '✅ Yes' : '❌ No'}</div>
            `;
        }
        
        infoHTML += `
            </div>
            <button class="close-button" onclick="this.closest('.version-modal').remove()">Close</button>
        `;
        
        content.innerHTML = infoHTML;
        modal.appendChild(content);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
    
    /**
     * Start auto-update interval
     */
    startAutoUpdate() {
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadVersionInfo();
                this.createElement(); // Recreate element with updated info
            } catch (error) {
                console.warn('⚠️ Version auto-update failed:', error.message);
            }
        }, 60000); // Update every minute
    }
    
    /**
     * Stop auto-update interval
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Update version manually
     */
    async updateVersion() {
        await this.loadVersionInfo();
        this.createElement();
    }
    
    /**
     * Destroy version display
     */
    destroy() {
        this.stopAutoUpdate();
        
        const element = document.getElementById(this.options.containerId);
        if (element) {
            element.remove();
        }
        
        const styles = document.getElementById('version-display-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.versionDisplay = new VersionDisplay();
        });
    } else {
        window.versionDisplay = new VersionDisplay();
    }
}

export default VersionDisplay;