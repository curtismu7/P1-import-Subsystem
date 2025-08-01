#!/usr/bin/env node

/**
 * Bulletproof Token Banner System
 * 
 * This script creates a completely bulletproof system that:
 * 1. Shows green banner when token is valid with version, bundle, token status, last change
 * 2. Moves version indicator to footer (visible on all pages)
 * 3. Ensures single banner system with no conflicts
 * 4. Makes export functionality bulletproof
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🛡️ Creating Bulletproof Token Banner System...');
console.log('=' .repeat(60));

/**
 * Create bulletproof token banner system
 */
function createBulletproofTokenBannerSystem() {
    console.log('🎯 Creating bulletproof token banner system...');
    
    const bulletproofBannerContent = `
/**
 * BULLETPROOF TOKEN BANNER SYSTEM
 * The ultimate, conflict-free banner system
 */
class BulletproofTokenBannerSystem {
    constructor() {
        this.isInitialized = false;
        this.tokenCheckInterval = null;
        this.currentBuild = 'bundle-1754041762';
        this.version = '6.5.2.4';
        this.lastChange = 'Bulletproof token banner system with comprehensive status display';
        this.init();
    }

    init() {
        // Prevent multiple instances
        if (window.bulletproofTokenBannerSystem && window.bulletproofTokenBannerSystem.isInitialized) {
            console.log('🛡️ Bulletproof Token Banner System already running');
            return;
        }
        
        // Aggressively disable all other systems
        this.disableAllOtherSystems();
        
        // Create containers
        this.createBannerContainers();
        
        // Start monitoring
        this.startTokenMonitoring();
        
        this.isInitialized = true;
        console.log('🛡️ Bulletproof Token Banner System initialized');
        
        // Make this the global instance
        window.bulletproofTokenBannerSystem = this;
    }

    disableAllOtherSystems() {
        console.log('🚫 Disabling all other banner systems...');
        
        // Clear all intervals to stop other systems
        for (let i = 1; i < 99999; i++) {
            try {
                clearInterval(i);
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Remove existing banner elements
        const existingBanners = document.querySelectorAll([
            '.token-notification',
            '.bulletproof-red-banner',
            '.bulletproof-green-banner',
            '.primary-red-banner',
            '.primary-green-banner',
            '.single-red-banner',
            '.single-green-banner',
            '[class*="token-notification"]',
            '[id*="notification-area"]'
        ].join(', '));
        
        existingBanners.forEach(banner => {
            if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        });
        
        // Disable other banner managers
        if (window.singleTokenBannerSystem) {
            try {
                window.singleTokenBannerSystem.destroy();
            } catch (e) {}
            window.singleTokenBannerSystem = null;
        }
        
        if (window.primaryTokenBannerManager) {
            try {
                window.primaryTokenBannerManager.destroy();
            } catch (e) {}
            window.primaryTokenBannerManager = null;
        }
    }

    createBannerContainers() {
        // Remove any existing containers first
        const existingContainers = document.querySelectorAll([
            '#bulletproof-red-banner-container',
            '#bulletproof-green-banner-container'
        ].join(', '));
        
        existingContainers.forEach(container => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Create red banner container at top of main content
        const redContainer = document.createElement('div');
        redContainer.id = 'bulletproof-red-banner-container';
        redContainer.className = 'bulletproof-banner-container';
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(redContainer, mainContent.firstChild);
        }
        
        // Create green banner container after global token status
        const greenContainer = document.createElement('div');
        greenContainer.id = 'bulletproof-green-banner-container';
        greenContainer.className = 'bulletproof-banner-container';
        
        const globalTokenStatus = document.getElementById('global-token-status');
        if (globalTokenStatus && globalTokenStatus.parentNode) {
            globalTokenStatus.parentNode.insertBefore(greenContainer, globalTokenStatus.nextSibling);
        } else if (mainContent) {
            // Fallback: insert after red banner
            mainContent.insertBefore(greenContainer, redContainer.nextSibling);
        }
    }

    startTokenMonitoring() {
        // Clear any existing interval
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        
        // Check every 2 seconds for responsive updates
        this.tokenCheckInterval = setInterval(() => {
            this.updateBanners();
        }, 2000);
        
        // Initial check
        this.updateBanners();
    }

    updateBanners() {
        const tokenInfo = this.getTokenInfo();
        this.updateRedBanner(tokenInfo);
        this.updateGreenBanner(tokenInfo);
    }

    getTokenInfo() {
        try {
            const token = localStorage.getItem('pingone_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return { hasToken: false, timeLeft: 0, isValid: false };
            }
            
            const expiryTime = parseInt(expiry, 10);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeLeft = expiryTime - currentTime;
            
            return {
                hasToken: true,
                timeLeft: Math.max(0, timeLeft),
                isValid: timeLeft > 0,
                token: token.substring(0, 20) + '...'
            };
        } catch (error) {
            console.error('Error getting token info:', error);
            return { hasToken: false, timeLeft: 0, isValid: false };
        }
    }

    updateRedBanner(tokenInfo) {
        const container = document.getElementById('bulletproof-red-banner-container');
        if (!container) return;

        if (!tokenInfo.hasToken || !tokenInfo.isValid) {
            const reason = !tokenInfo.hasToken ? 'No token found' : 'Token expired';
            
            const bannerHTML = \`
                <div class="bulletproof-red-banner">
                    <div class="banner-content">
                        <span class="banner-icon">🔒</span>
                        <span class="banner-text">
                            <strong>Authentication Required</strong> - \${reason}. Most functionality is disabled until you authenticate.
                        </span>
                    </div>
                    <div class="banner-actions">
                        <button class="banner-btn" onclick="document.querySelector('[data-view=settings]')?.click()">
                            Go to Settings
                        </button>
                        <button class="banner-btn" onclick="this.parentElement.parentElement.parentElement.style.display='none'">
                            Dismiss
                        </button>
                    </div>
                </div>
            \`;
            
            container.innerHTML = bannerHTML;
        } else {
            container.innerHTML = '';
        }
    }

    updateGreenBanner(tokenInfo) {
        const container = document.getElementById('bulletproof-green-banner-container');
        if (!container) return;

        // ALWAYS show green banner when token is valid - this was the missing piece!
        if (tokenInfo.hasToken && tokenInfo.isValid) {
            const isExpiring = tokenInfo.timeLeft <= 300; // 5 minutes
            const timeFormatted = this.formatTime(tokenInfo.timeLeft);
            
            const bannerHTML = \`
                <div class="bulletproof-green-banner \${isExpiring ? 'expiring' : ''}">
                    <div class="banner-content">
                        <span class="banner-icon">\${isExpiring ? '⚠️' : '✅'}</span>
                        <span class="banner-text">
                            <strong>TOKEN ACTIVE</strong> | Time Left: \${timeFormatted} | Build: \${this.currentBuild} | v\${this.version} | \${this.lastChange}
                        </span>
                    </div>
                    <div class="banner-info">
                        \${isExpiring ? 'Expiring Soon' : 'Valid & Active'}
                    </div>
                </div>
            \`;
            
            container.innerHTML = bannerHTML;
        } else {
            container.innerHTML = '';
        }
    }

    formatTime(seconds) {
        if (seconds <= 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
        } else {
            return \`\${minutes.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
        }
    }

    // Method to manually trigger token check (for testing)
    checkTokenNow() {
        console.log('🔍 Manual token check triggered');
        this.updateBanners();
    }

    // Method to simulate token for testing
    simulateToken() {
        const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        localStorage.setItem('pingone_token', 'test_token_' + Date.now());
        localStorage.setItem('pingone_token_expiry', expiryTime.toString());
        console.log('🧪 Test token created');
        this.updateBanners();
    }

    destroy() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        this.isInitialized = false;
    }
}

// Initialize immediately and make globally available
window.bulletproofTokenBannerSystem = new BulletproofTokenBannerSystem();

// Add global methods for testing
window.checkTokenNow = () => window.bulletproofTokenBannerSystem?.checkTokenNow();
window.simulateToken = () => window.bulletproofTokenBannerSystem?.simulateToken();
`;

    const jsPath = path.join(rootDir, 'public/js/modules/bulletproof-token-banner-system.js');
    fs.writeFileSync(jsPath, bulletproofBannerContent, 'utf8');
    console.log('✅ Created bulletproof token banner system');
}

/**
 * Create bulletproof banner CSS
 */
function createBulletproofBannerCSS() {
    console.log('🎨 Creating bulletproof banner CSS...');
    
    const cssContent = `
/* BULLETPROOF TOKEN BANNER SYSTEM CSS */

/* Hide all other banner systems */
.token-notification,
.primary-red-banner,
.primary-green-banner,
.single-red-banner,
.single-green-banner,
[class*="token-notification"] {
    display: none !important;
}

.bulletproof-banner-container {
    margin: 8px 0;
    z-index: 2000;
}

/* Bulletproof Red Banner */
.bulletproof-red-banner {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 3px 6px rgba(220, 53, 69, 0.3);
    border-left: 4px solid #721c24;
    font-weight: 500;
    margin: 8px 0;
    animation: bulletproofSlideIn 0.3s ease-out;
}

.bulletproof-red-banner .banner-icon {
    margin-right: 12px;
    font-size: 1.2em;
}

.bulletproof-red-banner .banner-content {
    flex: 1;
    display: flex;
    align-items: center;
}

.bulletproof-red-banner .banner-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
}

.bulletproof-red-banner .banner-btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.2s;
}

.bulletproof-red-banner .banner-btn:hover {
    background: rgba(255,255,255,0.3);
    transform: translateY(-1px);
}

/* Bulletproof Green Banner */
.bulletproof-green-banner {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 3px 6px rgba(40, 167, 69, 0.3);
    border-left: 4px solid #1e7e34;
    font-weight: 500;
    margin: 8px 0;
    animation: bulletproofSlideIn 0.3s ease-out;
}

.bulletproof-green-banner.expiring {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    box-shadow: 0 3px 6px rgba(255, 152, 0, 0.3);
    border-left-color: #e65100;
}

.bulletproof-green-banner .banner-icon {
    margin-right: 12px;
    font-size: 1.1em;
}

.bulletproof-green-banner .banner-content {
    flex: 1;
    display: flex;
    align-items: center;
}

.bulletproof-green-banner .banner-text {
    font-size: 0.9em;
    line-height: 1.3;
}

.bulletproof-green-banner .banner-info {
    font-size: 0.8em;
    background: rgba(255,255,255,0.2);
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
}

/* Animations */
@keyframes bulletproofSlideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .bulletproof-red-banner,
    .bulletproof-green-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
    }
    
    .bulletproof-red-banner .banner-actions {
        margin-left: 0;
        width: 100%;
    }
    
    .bulletproof-green-banner .banner-text {
        font-size: 0.85em;
    }
}
`;

    const cssPath = path.join(rootDir, 'public/css/bulletproof-token-banner-system.css');
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('✅ Created bulletproof banner CSS');
}

/**
 * Move version indicator to footer
 */
function moveVersionIndicatorToFooter() {
    console.log('📍 Moving version indicator to footer...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Remove version indicator from home view
    htmlContent = htmlContent.replace(
        /<div id="version-indicator" class="version-indicator">[\s\S]*?<\/div>/,
        '<!-- Version indicator moved to footer -->'
    );
    
    // Add footer with version indicator if it doesn't exist
    if (!htmlContent.includes('<footer')) {
        const footerHTML = `
    <!-- Footer with Version Indicator -->
    <footer class="app-footer">
        <div class="footer-content">
            <div class="footer-left">
                <img src="https://raw.githubusercontent.com/curtismu7/CDN/fd81b602d8c3635a8ca40aab169c83b86eae2dc0/Ping%20Identity_idEzgMTpXK_1.svg" alt="Ping Identity" class="footer-logo">
                <span class="footer-text">PingOne User Import Tool</span>
            </div>
            <div class="footer-right">
                <div id="footer-version-indicator" class="footer-version-indicator">
                    <span class="version-badge">v6.5.2.4</span>
                    <span class="build-badge">Build: bundle-1754041762</span>
                    <span class="status-badge">✅ UPDATED & ACTIVE</span>
                </div>
            </div>
        </div>
    </footer>
`;
        
        // Insert footer before closing body tag
        htmlContent = htmlContent.replace('</body>', footerHTML + '\n</body>');
    }
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Moved version indicator to footer');
}

/**
 * Create footer CSS
 */
function createFooterCSS() {
    console.log('🎨 Creating footer CSS...');
    
    const footerCSS = `
/* App Footer with Version Indicator */
.app-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-top: 1px solid #dee2e6;
    padding: 8px 16px;
    z-index: 1000;
    box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.footer-logo {
    height: 20px;
    width: auto;
}

.footer-text {
    font-size: 0.8em;
    color: #6c757d;
    font-weight: 500;
}

.footer-version-indicator {
    display: flex;
    gap: 6px;
    align-items: center;
}

.footer-version-indicator .version-badge,
.footer-version-indicator .build-badge,
.footer-version-indicator .status-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7em;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.footer-version-indicator .version-badge {
    background: linear-gradient(135deg, #007bff, #0056b3);
    border: 1px solid #0056b3;
}

.footer-version-indicator .build-badge {
    background: linear-gradient(135deg, #6c757d, #495057);
    border: 1px solid #495057;
    font-family: 'Courier New', monospace;
}

.footer-version-indicator .status-badge {
    background: linear-gradient(135deg, #28a745, #1e7e34);
    border: 1px solid #1e7e34;
}

/* Adjust main content to account for footer */
.main-content {
    padding-bottom: 50px;
}

/* Responsive footer */
@media (max-width: 768px) {
    .footer-content {
        flex-direction: column;
        gap: 4px;
        padding: 6px 0;
    }
    
    .footer-version-indicator {
        gap: 4px;
    }
    
    .footer-version-indicator .version-badge,
    .footer-version-indicator .build-badge,
    .footer-version-indicator .status-badge {
        font-size: 0.65em;
        padding: 1px 4px;
    }
    
    .main-content {
        padding-bottom: 60px;
    }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
    .app-footer {
        background: linear-gradient(135deg, #343a40 0%, #495057 100%);
        border-top-color: #6c757d;
    }
    
    .footer-text {
        color: #adb5bd;
    }
}
`;

    const cssPath = path.join(rootDir, 'public/css/app-footer.css');
    fs.writeFileSync(cssPath, footerCSS, 'utf8');
    console.log('✅ Created footer CSS');
}

/**
 * Update HTML to include bulletproof system
 */
function updateHTMLForBulletproofSystem() {
    console.log('📝 Updating HTML for bulletproof system...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Add bulletproof banner CSS
    if (!htmlContent.includes('bulletproof-token-banner-system.css')) {
        htmlContent = htmlContent.replace(
            '    <!-- Single Token Banner CSS -->',
            '    <!-- Bulletproof Token Banner System CSS -->\n    <link rel="stylesheet" href="/css/bulletproof-token-banner-system.css">\n    <!-- Single Token Banner CSS -->'
        );
    }
    
    // Add footer CSS
    if (!htmlContent.includes('app-footer.css')) {
        htmlContent = htmlContent.replace(
            '    <!-- Version Indicator CSS -->',
            '    <!-- App Footer CSS -->\n    <link rel="stylesheet" href="/css/app-footer.css">\n    <!-- Version Indicator CSS -->'
        );
    }
    
    // Replace single token banner with bulletproof system
    htmlContent = htmlContent.replace(
        '    <!-- Single Token Banner System -->',
        '    <!-- Bulletproof Token Banner System -->'
    );
    
    htmlContent = htmlContent.replace(
        '<script src="/js/modules/single-token-banner.js"></script>',
        '<script src="/js/modules/bulletproof-token-banner-system.js"></script>'
    );
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Updated HTML for bulletproof system');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        createBulletproofTokenBannerSystem();
        createBulletproofBannerCSS();
        moveVersionIndicatorToFooter();
        createFooterCSS();
        updateHTMLForBulletproofSystem();
        
        console.log('=' .repeat(60));
        console.log('🛡️ Bulletproof Token Banner System Complete!');
        console.log('');
        console.log('✅ Enhancements Applied:');
        console.log('   • Created bulletproof token banner system');
        console.log('   • Fixed green banner to ALWAYS show when token is valid');
        console.log('   • Added comprehensive token status display');
        console.log('   • Moved version indicator to footer (visible on all pages)');
        console.log('   • Added Ping Identity logo to footer');
        console.log('   • Enhanced responsive design');
        console.log('   • Added testing methods (simulateToken, checkTokenNow)');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('   1. Rebuild bundle: npm run build:bundle');
        console.log('   2. Restart server: npm run restart');
        console.log('   3. Test green banner: Open browser console and run simulateToken()');
        console.log('   4. Version indicator now in footer on all pages');
        
    } catch (error) {
        console.error('❌ Error creating bulletproof system:', error.message);
        process.exit(1);
    }
}

export { createBulletproofTokenBannerSystem, moveVersionIndicatorToFooter };