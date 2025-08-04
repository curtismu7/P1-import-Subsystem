/**
 * Version Display Component
 * 
 * Displays the application version in the UI footer with additional
 * build information and health status indicators.
 * 
 * Features:
 * - Semantic version display (e.g., v6.5.1.1)
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
                this.version = '6.5.1.1'; // Current version as fallback
            }
            
        } catch (error) {
            console.warn('⚠️ Could not load version info:', error.message);
            this.version = '6.5.1.1'; // Fallback version
        }
    }
    
    /**
     * Load health status from server
     */
    async loadHealthStatus() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {\n                const health = await response.json();\n                this.healthStatus = {\n                    status: health.status,\n                    optimization: health.optimization,\n                    checks: health.checks\n                };\n            }\n        } catch (error) {\n            console.warn('⚠️ Could not load health status:', error.message);\n        }\n    }\n    \n    /**\n     * Create version display element\n     */\n    createElement() {\n        // Remove existing element if present\n        const existing = document.getElementById(this.options.containerId);\n        if (existing) {\n            existing.remove();\n        }\n        \n        // Create container element\n        const container = document.createElement('div');\n        container.id = this.options.containerId;\n        container.className = `version-display ${this.options.position}`;\n        \n        // Create version text\n        const versionText = document.createElement('span');\n        versionText.className = 'version-text';\n        versionText.textContent = `v${this.version}`;\n        \n        // Add health status indicator if enabled\n        if (this.options.showHealthStatus && this.healthStatus) {\n            const statusIndicator = this.createStatusIndicator();\n            container.appendChild(statusIndicator);\n        }\n        \n        container.appendChild(versionText);\n        \n        // Add click handler for detailed info\n        if (this.options.showBuildInfo) {\n            container.style.cursor = 'pointer';\n            container.addEventListener('click', () => this.showDetailedInfo());\n            container.title = 'Click for build information';\n        }\n        \n        // Add to page\n        this.appendToPage(container);\n        \n        // Apply styles\n        this.applyStyles();\n    }\n    \n    /**\n     * Create health status indicator\n     */\n    createStatusIndicator() {\n        const indicator = document.createElement('span');\n        indicator.className = 'health-indicator';\n        \n        const status = this.healthStatus.status;\n        let color = '#28a745'; // green\n        let title = 'System healthy';\n        \n        if (status === 'degraded') {\n            color = '#ffc107'; // yellow\n            title = 'System degraded';\n        } else if (status === 'error') {\n            color = '#dc3545'; // red\n            title = 'System error';\n        }\n        \n        indicator.style.cssText = `\n            display: inline-block;\n            width: 8px;\n            height: 8px;\n            border-radius: 50%;\n            background-color: ${color};\n            margin-right: 6px;\n            animation: pulse 2s infinite;\n        `;\n        \n        indicator.title = title;\n        \n        return indicator;\n    }\n    \n    /**\n     * Append version display to appropriate location on page\n     */\n    appendToPage(element) {\n        let targetContainer;\n        \n        // Try to find appropriate container based on position\n        if (this.options.position.includes('footer')) {\n            targetContainer = document.querySelector('footer') || \n                            document.querySelector('.footer') ||\n                            document.querySelector('#footer');\n        }\n        \n        // Fallback to body if no specific container found\n        if (!targetContainer) {\n            targetContainer = document.body;\n        }\n        \n        targetContainer.appendChild(element);\n    }\n    \n    /**\n     * Apply CSS styles to version display\n     */\n    applyStyles() {\n        // Check if styles already exist\n        if (document.getElementById('version-display-styles')) {\n            return;\n        }\n        \n        const styles = document.createElement('style');\n        styles.id = 'version-display-styles';\n        styles.textContent = `\n            .version-display {\n                position: fixed;\n                z-index: 1000;\n                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n                font-size: 11px;\n                color: #6c757d;\n                background: rgba(255, 255, 255, 0.9);\n                padding: 4px 8px;\n                border-radius: 4px;\n                border: 1px solid #e9ecef;\n                backdrop-filter: blur(4px);\n                transition: all 0.2s ease;\n            }\n            \n            .version-display:hover {\n                background: rgba(255, 255, 255, 0.95);\n                color: #495057;\n                transform: translateY(-1px);\n                box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n            }\n            \n            .version-display.footer-right {\n                bottom: 10px;\n                right: 10px;\n            }\n            \n            .version-display.footer-left {\n                bottom: 10px;\n                left: 10px;\n            }\n            \n            .version-display.header-right {\n                top: 10px;\n                right: 10px;\n            }\n            \n            .version-display.header-left {\n                top: 10px;\n                left: 10px;\n            }\n            \n            .version-text {\n                font-weight: 500;\n            }\n            \n            .health-indicator {\n                display: inline-block;\n            }\n            \n            @keyframes pulse {\n                0% { opacity: 1; }\n                50% { opacity: 0.5; }\n                100% { opacity: 1; }\n            }\n            \n            .version-modal {\n                position: fixed;\n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n                background: rgba(0, 0, 0, 0.5);\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                z-index: 10000;\n            }\n            \n            .version-modal-content {\n                background: white;\n                padding: 20px;\n                border-radius: 8px;\n                max-width: 500px;\n                width: 90%;\n                max-height: 80vh;\n                overflow-y: auto;\n            }\n            \n            .version-modal h3 {\n                margin-top: 0;\n                color: #333;\n            }\n            \n            .version-info-grid {\n                display: grid;\n                grid-template-columns: 1fr 2fr;\n                gap: 8px;\n                margin: 15px 0;\n            }\n            \n            .version-info-label {\n                font-weight: 600;\n                color: #666;\n            }\n            \n            .version-info-value {\n                font-family: monospace;\n                color: #333;\n                word-break: break-all;\n            }\n            \n            .close-button {\n                background: #007bff;\n                color: white;\n                border: none;\n                padding: 8px 16px;\n                border-radius: 4px;\n                cursor: pointer;\n                float: right;\n                margin-top: 15px;\n            }\n            \n            .close-button:hover {\n                background: #0056b3;\n            }\n        `;\n        \n        document.head.appendChild(styles);\n    }\n    \n    /**\n     * Show detailed build information modal\n     */\n    showDetailedInfo() {\n        const modal = document.createElement('div');\n        modal.className = 'version-modal';\n        \n        const content = document.createElement('div');\n        content.className = 'version-modal-content';\n        \n        let infoHTML = `\n            <h3>🚀 PingOne Import Tool - Build Information</h3>\n            <div class=\"version-info-grid\">\n                <div class=\"version-info-label\">Version:</div>\n                <div class=\"version-info-value\">v${this.version}</div>\n        `;\n        \n        if (this.buildInfo) {\n            infoHTML += `\n                <div class=\"version-info-label\">Bundle:</div>\n                <div class=\"version-info-value\">${this.buildInfo.bundleFile}</div>\n                \n                <div class=\"version-info-label\">Build Time:</div>\n                <div class=\"version-info-value\">${new Date(this.buildInfo.timestamp).toLocaleString()}</div>\n                \n                <div class=\"version-info-label\">Bundle Size:</div>\n                <div class=\"version-info-value\">${this.formatBytes(this.buildInfo.size)}</div>\n                \n                <div class=\"version-info-label\">Hash:</div>\n                <div class=\"version-info-value\">${this.buildInfo.hash?.substring(0, 16)}...</div>\n            `;\n        }\n        \n        if (this.healthStatus) {\n            infoHTML += `\n                <div class=\"version-info-label\">System Status:</div>\n                <div class=\"version-info-value\">${this.healthStatus.status}</div>\n                \n                <div class=\"version-info-label\">Token Cached:</div>\n                <div class=\"version-info-value\">${this.healthStatus.optimization?.tokenCached ? '✅ Yes' : '❌ No'}</div>\n                \n                <div class=\"version-info-label\">Populations Cached:</div>\n                <div class=\"version-info-value\">${this.healthStatus.optimization?.populationsCached ? '✅ Yes' : '❌ No'}</div>\n            `;\n        }\n        \n        infoHTML += `\n            </div>\n            <button class=\"close-button\" onclick=\"this.closest('.version-modal').remove()\">Close</button>\n        `;\n        \n        content.innerHTML = infoHTML;\n        modal.appendChild(content);\n        \n        // Close on background click\n        modal.addEventListener('click', (e) => {\n            if (e.target === modal) {\n                modal.remove();\n            }\n        });\n        \n        document.body.appendChild(modal);\n    }\n    \n    /**\n     * Start auto-update interval\n     */\n    startAutoUpdate() {\n        this.updateInterval = setInterval(async () => {\n            try {\n                await this.loadVersionInfo();\n                this.createElement(); // Recreate element with updated info\n            } catch (error) {\n                console.warn('⚠️ Version auto-update failed:', error.message);\n            }\n        }, 60000); // Update every minute\n    }\n    \n    /**\n     * Stop auto-update interval\n     */\n    stopAutoUpdate() {\n        if (this.updateInterval) {\n            clearInterval(this.updateInterval);\n            this.updateInterval = null;\n        }\n    }\n    \n    /**\n     * Format bytes to human readable format\n     */\n    formatBytes(bytes) {\n        if (!bytes || bytes === 0) return '0 Bytes';\n        \n        const k = 1024;\n        const sizes = ['Bytes', 'KB', 'MB', 'GB'];\n        const i = Math.floor(Math.log(bytes) / Math.log(k));\n        \n        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];\n    }\n    \n    /**\n     * Update version manually\n     */\n    async updateVersion() {\n        await this.loadVersionInfo();\n        this.createElement();\n    }\n    \n    /**\n     * Destroy version display\n     */\n    destroy() {\n        this.stopAutoUpdate();\n        \n        const element = document.getElementById(this.options.containerId);\n        if (element) {\n            element.remove();\n        }\n        \n        const styles = document.getElementById('version-display-styles');\n        if (styles) {\n            styles.remove();\n        }\n    }\n}\n\n// Auto-initialize when DOM is ready\nif (typeof document !== 'undefined') {\n    if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', () => {\n            window.versionDisplay = new VersionDisplay();\n        });\n    } else {\n        window.versionDisplay = new VersionDisplay();\n    }\n}\n\nexport default VersionDisplay;