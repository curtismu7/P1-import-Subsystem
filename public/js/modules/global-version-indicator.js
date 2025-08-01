
/**
 * Global Version Indicator Manager
 * Shows version info on every page and updates automatically
 */
class GlobalVersionIndicatorManager {
    constructor() {
        this.currentBuild = 'bundle-1754046267';
        this.currentVersion = '6.5.2.4';
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.createGlobalIndicator();
        this.addVersionToAllViews();
        this.startAutoUpdate();
        this.setupViewSwitchListener();
        console.log('🌐 Global Version Indicator Manager initialized');
    }

    createGlobalIndicator() {
        // Remove existing global indicator if present
        const existing = document.getElementById('global-version-indicator');
        if (existing) {
            existing.remove();
        }

        // Create global floating version indicator
        const indicator = document.createElement('div');
        indicator.id = 'global-version-indicator';
        indicator.className = 'global-version-indicator';
        indicator.innerHTML = `
            <span class="version-badge">v${this.currentVersion}</span>
            <span class="build-badge">${this.currentBuild}</span>
            <span class="status-badge">✅ ACTIVE</span>
        `;

        // Add click handler for additional info
        indicator.addEventListener('click', () => {
            this.showVersionDetails();
        });

        // Add to body
        document.body.appendChild(indicator);
    }

    addVersionToAllViews() {
        // Find all view headers and add version indicators
        const viewHeaders = [
            { selector: '.import-header h1', viewName: 'Import' },
            { selector: '.history-header h1', viewName: 'History' },
            { selector: '.delete-header h1', viewName: 'Delete' },
            { selector: '.modify-header h1', viewName: 'Modify' },
            { selector: '.export-header h1', viewName: 'Export' },
            { selector: '.settings-header h1', viewName: 'Settings' },
            { selector: '.logs-header h1', viewName: 'Logs' },
            { selector: '.testing-header h1', viewName: 'Testing' }
        ];

        viewHeaders.forEach(header => {
            const headerElement = document.querySelector(header.selector);
            if (headerElement) {
                const parentHeader = headerElement.parentElement;
                
                // Check if version indicator already exists
                let versionIndicator = parentHeader.querySelector('.version-indicator');
                if (!versionIndicator) {
                    versionIndicator = document.createElement('div');
                    versionIndicator.className = 'version-indicator';
                    parentHeader.appendChild(versionIndicator);
                }
                
                // Update version indicator content
                versionIndicator.innerHTML = `
                    <span class="version-badge">v${this.currentVersion}</span>
                    <span class="build-badge">${this.currentBuild}</span>
                    <span class="status-badge">✅ ${header.viewName}</span>
                `;
            }
        });
    }

    startAutoUpdate() {
        // Check for version updates every 30 seconds
        this.updateInterval = setInterval(() => {
            this.checkForUpdates();
        }, 30000);
    }

    setupViewSwitchListener() {
        // Listen for view changes and update indicators
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('view') && target.classList.contains('active')) {
                        this.onViewSwitch(target);
                    }
                }
            });
        });

        // Observe all view elements
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            observer.observe(view, { attributes: true });
        });
    }

    onViewSwitch(activeView) {
        // Update global indicator when view switches
        const globalIndicator = document.getElementById('global-version-indicator');
        if (globalIndicator) {
            globalIndicator.classList.add('updating');
            setTimeout(() => {
                globalIndicator.classList.remove('updating');
            }, 500);
        }

        // Ensure version indicator exists in the new view
        setTimeout(() => {
            this.addVersionToAllViews();
        }, 100);
    }

    async checkForUpdates() {
        try {
            // Check if bundle manifest has changed
            const response = await fetch('/js/bundle-manifest.json?t=' + Date.now());
            const manifest = await response.json();
            const newBuild = manifest.bundleFile.replace('.js', '');
            
            if (newBuild !== this.currentBuild) {
                this.currentBuild = newBuild;
                this.updateAllIndicators();
                this.showUpdateNotification();
            }
        } catch (error) {
            console.warn('Could not check for version updates:', error);
        }
    }

    updateAllIndicators() {
        // Update global indicator
        const globalIndicator = document.getElementById('global-version-indicator');
        if (globalIndicator) {
            globalIndicator.innerHTML = `
                <span class="version-badge">v${this.currentVersion}</span>
                <span class="build-badge">${this.currentBuild}</span>
                <span class="status-badge">✅ UPDATED</span>
            `;
        }

        // Update all view indicators
        this.addVersionToAllViews();
    }

    showUpdateNotification() {
        // Show a brief notification about the update
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; opacity: 0.7;
            top: 60px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = `Updated to ${this.currentBuild}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showVersionDetails() {
        // Show detailed version information
        const details = `
            Version: ${this.currentVersion}
            Build: ${this.currentBuild}
            Updated: ${new Date().toLocaleString()}
            Status: Active
        `;
        
        alert('PingOne Import Tool\n\n' + details);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        const globalIndicator = document.getElementById('global-version-indicator');
        if (globalIndicator) {
            globalIndicator.remove();
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.globalVersionIndicatorManager = new GlobalVersionIndicatorManager();
    });
} else {
    window.globalVersionIndicatorManager = new GlobalVersionIndicatorManager();
}
