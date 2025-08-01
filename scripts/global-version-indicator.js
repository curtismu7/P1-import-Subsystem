#!/usr/bin/env node

/**
 * Global Version Indicator System
 * 
 * This script creates a bulletproof version indicator that appears on every page/view
 * and automatically updates when switching between views.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🌐 Creating Global Version Indicator System...');
console.log('=' .repeat(60));

/**
 * Get current build number from bundle manifest
 */
function getCurrentBuildNumber() {
    try {
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.bundleFile.replace('.js', '');
    } catch (error) {
        console.error('Error reading bundle manifest:', error.message);
        return 'bundle-unknown';
    }
}

/**
 * Create global version indicator CSS
 */
function createGlobalVersionCSS() {
    const cssContent = `
/* Global Version Indicator System */
.global-version-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    display: flex;
    gap: 8px;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 6px 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 0.8em;
    font-weight: 500;
    transition: all 0.3s ease;
}

.global-version-indicator:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
}

.global-version-indicator .version-badge,
.global-version-indicator .build-badge,
.global-version-indicator .status-badge {
    display: inline-block;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.global-version-indicator .version-badge {
    background: linear-gradient(135deg, #007bff, #0056b3);
    border: 1px solid #0056b3;
}

.global-version-indicator .build-badge {
    background: linear-gradient(135deg, #6c757d, #495057);
    border: 1px solid #495057;
    font-family: 'Courier New', monospace;
    font-size: 0.75em;
}

.global-version-indicator .status-badge {
    background: linear-gradient(135deg, #28a745, #1e7e34);
    border: 1px solid #1e7e34;
}

/* Page-specific version indicators (keep existing ones but make them complementary) */
.view .version-indicator {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    opacity: 0.8;
}

.view .version-indicator .version-badge,
.view .version-indicator .build-badge,
.view .version-indicator .status-badge {
    display: inline-block;
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 0.75em;
    font-weight: 500;
    color: white;
    text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.view .version-indicator .version-badge {
    background: linear-gradient(135deg, #007bff, #0056b3);
}

.view .version-indicator .build-badge {
    background: linear-gradient(135deg, #6c757d, #495057);
    font-family: 'Courier New', monospace;
}

.view .version-indicator .status-badge {
    background: linear-gradient(135deg, #28a745, #1e7e34);
}

/* Responsive design */
@media (max-width: 768px) {
    .global-version-indicator {
        position: relative;
        top: auto;
        right: auto;
        margin: 8px 0;
        justify-content: center;
    }
    
    .global-version-indicator .version-badge,
    .global-version-indicator .build-badge,
    .global-version-indicator .status-badge {
        font-size: 0.7em;
        padding: 2px 4px;
    }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
    .global-version-indicator {
        background: rgba(33, 37, 41, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
        color: white;
    }
    
    .global-version-indicator:hover {
        background: rgba(33, 37, 41, 1);
    }
}

/* Animation for version updates */
.global-version-indicator.updating {
    animation: versionPulse 0.5s ease-in-out;
}

@keyframes versionPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
`;

    const cssPath = path.join(rootDir, 'public/css/global-version-indicator.css');
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('✅ Created global version indicator CSS');
    return cssPath;
}

/**
 * Create global version indicator JavaScript
 */
function createGlobalVersionJS() {
    const currentBuild = getCurrentBuildNumber();
    
    const jsContent = `
/**
 * Global Version Indicator Manager
 * Shows version info on every page and updates automatically
 */
class GlobalVersionIndicatorManager {
    constructor() {
        this.currentBuild = '${currentBuild}';
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
        indicator.innerHTML = \`
            <span class="version-badge">v\${this.currentVersion}</span>
            <span class="build-badge">\${this.currentBuild}</span>
            <span class="status-badge">✅ ACTIVE</span>
        \`;

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
                versionIndicator.innerHTML = \`
                    <span class="version-badge">v\${this.currentVersion}</span>
                    <span class="build-badge">\${this.currentBuild}</span>
                    <span class="status-badge">✅ \${header.viewName}</span>
                \`;
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
            globalIndicator.innerHTML = \`
                <span class="version-badge">v\${this.currentVersion}</span>
                <span class="build-badge">\${this.currentBuild}</span>
                <span class="status-badge">✅ UPDATED</span>
            \`;
        }

        // Update all view indicators
        this.addVersionToAllViews();
    }

    showUpdateNotification() {
        // Show a brief notification about the update
        const notification = document.createElement('div');
        notification.style.cssText = \`
            position: fixed;
            top: 60px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        \`;
        notification.textContent = \`Updated to \${this.currentBuild}\`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showVersionDetails() {
        // Show detailed version information
        const details = \`
            Version: \${this.currentVersion}
            Build: \${this.currentBuild}
            Updated: \${new Date().toLocaleString()}
            Status: Active
        \`;
        
        alert('PingOne Import Tool\\n\\n' + details);
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
`;

    const jsPath = path.join(rootDir, 'public/js/modules/global-version-indicator.js');
    fs.writeFileSync(jsPath, jsContent, 'utf8');
    console.log('✅ Created global version indicator JavaScript');
    return jsPath;
}

/**
 * Update HTML to include global version indicator
 */
function updateHTMLWithGlobalVersion() {
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Add CSS link if not present
    if (!htmlContent.includes('global-version-indicator.css')) {
        const cssLink = '    <link rel="stylesheet" href="/css/global-version-indicator.css">';
        htmlContent = htmlContent.replace(
            '    <!-- Bulletproof Token Banners CSS -->',
            `    <!-- Global Version Indicator CSS -->\n${cssLink}\n    <!-- Bulletproof Token Banners CSS -->`
        );
    }
    
    // Add JS script if not present
    if (!htmlContent.includes('global-version-indicator.js')) {
        const jsScript = '    <script src="/js/modules/global-version-indicator.js"></script>';
        htmlContent = htmlContent.replace(
            '    <!-- Bulletproof Token Banners -->',
            `    <!-- Global Version Indicator -->\n${jsScript}\n    <!-- Bulletproof Token Banners -->`
        );
    }
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Updated HTML with global version indicator includes');
}

/**
 * Update sync script to include global version indicator
 */
function updateSyncScript() {
    const syncScriptPath = path.join(rootDir, 'scripts/sync-bundle-numbers.js');
    let syncContent = fs.readFileSync(syncScriptPath, 'utf8');
    
    // Add global version indicator files to sync list if not present
    if (!syncContent.includes('public/js/modules/global-version-indicator.js')) {
        syncContent = syncContent.replace(
            'const FILES_TO_SYNC = [',
            `const FILES_TO_SYNC = [
    'public/js/modules/global-version-indicator.js',`
        );
        
        fs.writeFileSync(syncScriptPath, syncContent, 'utf8');
        console.log('✅ Updated sync script to include global version indicator');
    }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const currentBuild = getCurrentBuildNumber();
        console.log(`📦 Current build: ${currentBuild}`);
        
        createGlobalVersionCSS();
        createGlobalVersionJS();
        updateHTMLWithGlobalVersion();
        updateSyncScript();
        
        console.log('=' .repeat(60));
        console.log('🌐 Global Version Indicator System created successfully!');
        console.log('');
        console.log('Features:');
        console.log('✅ Fixed floating version indicator on every page');
        console.log('✅ Individual version indicators in each view header');
        console.log('✅ Automatic updates when switching views');
        console.log('✅ Real-time version checking');
        console.log('✅ Click for detailed version info');
        console.log('✅ Responsive design for mobile');
        console.log('✅ Dark theme support');
        console.log('✅ Integrated with bulletproof sync system');
        
    } catch (error) {
        console.error('❌ Error creating global version indicator:', error.message);
        process.exit(1);
    }
}

export { createGlobalVersionCSS, createGlobalVersionJS };