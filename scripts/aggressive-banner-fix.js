#!/usr/bin/env node

/**
 * Aggressive Banner Fix
 * 
 * This script completely removes conflicting banner systems and ensures
 * only one banner system runs at a time.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔥 Aggressive Banner System Fix...');
console.log('=' .repeat(60));

/**
 * Completely disable old token notification system
 */
function disableOldTokenNotificationSystem() {
    console.log('🚫 Disabling old token notification system...');
    
    // Find and disable the old token notification subsystem
    const tokenNotificationPath = path.join(rootDir, 'src/client/subsystems/token-notification-subsystem.js');
    
    if (fs.existsSync(tokenNotificationPath)) {
        let content = fs.readFileSync(tokenNotificationPath, 'utf8');
        
        // Wrap the entire class in a disabled check
        content = `
// DISABLED - Replaced by Primary Token Banner System
console.log('⚠️ Old token notification system disabled - using Primary Token Banner System');

// Original content commented out to prevent conflicts
/*
${content}
*/

// Stub class to prevent errors
export class TokenNotificationSubsystem {
    constructor() {
        console.log('🚫 TokenNotificationSubsystem disabled - using Primary Token Banner System');
    }
    
    init() {
        // Do nothing - disabled
    }
    
    checkTokenStatus() {
        // Do nothing - disabled
    }
    
    destroy() {
        // Do nothing - disabled
    }
}
`;
        
        fs.writeFileSync(tokenNotificationPath, content, 'utf8');
        console.log('✅ Disabled old token notification subsystem');
    }
}

/**
 * Remove duplicate banner containers from HTML
 */
function removeDuplicateBannerContainers() {
    console.log('🗑️ Removing duplicate banner containers from HTML...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Remove old notification area that might be causing duplicates
    htmlContent = htmlContent.replace(
        /<div id="notification-area"[^>]*><\/div>/g,
        '<!-- notification-area removed to prevent banner conflicts -->'
    );
    
    // Remove any existing token notification elements
    htmlContent = htmlContent.replace(
        /<div[^>]*class="[^"]*token-notification[^"]*"[^>]*>.*?<\/div>/gs,
        '<!-- token-notification removed to prevent conflicts -->'
    );
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Removed duplicate banner containers from HTML');
}

/**
 * Create a single, authoritative banner system
 */
function createSingleBannerSystem() {
    console.log('🎯 Creating single authoritative banner system...');
    
    const singleBannerContent = `
/**
 * SINGLE AUTHORITATIVE TOKEN BANNER SYSTEM
 * This is the ONLY banner system that should run
 */
class SingleTokenBannerSystem {
    constructor() {
        this.isInitialized = false;
        this.tokenCheckInterval = null;
        this.init();
    }

    init() {
        // Prevent multiple instances
        if (window.singleTokenBannerSystem && window.singleTokenBannerSystem.isInitialized) {
            console.log('🛡️ Single Token Banner System already running');
            return;
        }
        
        // Aggressively disable all other banner systems
        this.disableAllOtherSystems();
        
        // Create our containers
        this.createBannerContainers();
        
        // Start monitoring
        this.startTokenMonitoring();
        
        this.isInitialized = true;
        console.log('🎯 Single Token Banner System initialized');
    }

    disableAllOtherSystems() {
        console.log('🚫 Disabling all other banner systems...');
        
        // Disable any existing intervals
        for (let i = 1; i < 99999; i++) {
            clearInterval(i);
        }
        
        // Remove existing banner elements
        const existingBanners = document.querySelectorAll([
            '.token-notification',
            '.bulletproof-red-banner',
            '.bulletproof-green-banner',
            '[class*="token-notification"]',
            '[id*="notification-area"]'
        ].join(', '));
        
        existingBanners.forEach(banner => {
            if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        });
        
        // Disable other banner managers
        if (window.bulletproofTokenBannerManager) {
            window.bulletproofTokenBannerManager.destroy();
            window.bulletproofTokenBannerManager = null;
        }
        
        if (window.primaryTokenBannerManager) {
            window.primaryTokenBannerManager.destroy();
            window.primaryTokenBannerManager = null;
        }
    }

    createBannerContainers() {
        // Remove any existing containers first
        const existingContainers = document.querySelectorAll([
            '#single-red-banner-container',
            '#single-green-banner-container'
        ].join(', '));
        
        existingContainers.forEach(container => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Create single red banner container
        const redContainer = document.createElement('div');
        redContainer.id = 'single-red-banner-container';
        redContainer.className = 'single-banner-container';
        
        // Insert at top of main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(redContainer, mainContent.firstChild);
        }
        
        // Create single green banner container
        const greenContainer = document.createElement('div');
        greenContainer.id = 'single-green-banner-container';
        greenContainer.className = 'single-banner-container';
        
        // Insert after global token status
        const globalTokenStatus = document.getElementById('global-token-status');
        if (globalTokenStatus && globalTokenStatus.parentNode) {
            globalTokenStatus.parentNode.insertBefore(greenContainer, globalTokenStatus.nextSibling);
        }
    }

    startTokenMonitoring() {
        // Clear any existing interval
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        
        // Check every 2 seconds
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
        const container = document.getElementById('single-red-banner-container');
        if (!container) return;

        if (!tokenInfo.hasToken || !tokenInfo.isValid) {
            const reason = !tokenInfo.hasToken ? 'No token found' : 'Token expired';
            
            const bannerHTML = \`
                <div class="single-red-banner">
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
        const container = document.getElementById('single-green-banner-container');
        if (!container) return;

        if (tokenInfo.hasToken && tokenInfo.isValid) {
            const isExpiring = tokenInfo.timeLeft <= 300;
            const timeFormatted = this.formatTime(tokenInfo.timeLeft);
            
            const bannerHTML = \`
                <div class="single-green-banner \${isExpiring ? 'expiring' : ''}">
                    <div class="banner-content">
                        <span class="banner-icon">\${isExpiring ? '⚠️' : '✅'}</span>
                        <span class="banner-text">
                            <strong>TOKEN ACTIVE</strong> | Time Left: \${timeFormatted} | Build: bundle-1754040333 | v6.5.2.4
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

    destroy() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        this.isInitialized = false;
    }
}

// Initialize immediately and prevent other systems
window.singleTokenBannerSystem = new SingleTokenBannerSystem();

// Override any attempts to create other banner systems
window.bulletproofTokenBannerManager = null;
window.primaryTokenBannerManager = null;
`;

    const singleBannerPath = path.join(rootDir, 'public/js/modules/single-token-banner.js');
    fs.writeFileSync(singleBannerPath, singleBannerContent, 'utf8');
    console.log('✅ Created single authoritative banner system');
}

/**
 * Create CSS for single banner system
 */
function createSingleBannerCSS() {
    const cssContent = `
/* SINGLE TOKEN BANNER SYSTEM - ONLY BANNER STYLES */

/* Hide all other banner systems */
.token-notification,
.bulletproof-red-banner,
.bulletproof-green-banner,
.primary-red-banner,
.primary-green-banner,
[class*="token-notification"] {
    display: none !important;
}

.single-banner-container {
    margin: 8px 0;
    z-index: 2000;
}

/* Single Red Banner */
.single-red-banner {
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
}

.single-red-banner .banner-icon {
    margin-right: 12px;
    font-size: 1.2em;
}

.single-red-banner .banner-content {
    flex: 1;
    display: flex;
    align-items: center;
}

.single-red-banner .banner-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
}

.single-red-banner .banner-btn {
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.2s;
}

.single-red-banner .banner-btn:hover {
    background: rgba(255,255,255,0.3);
}

/* Single Green Banner */
.single-green-banner {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    padding: 10px 16px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 3px 6px rgba(40, 167, 69, 0.3);
    border-left: 4px solid #1e7e34;
    font-weight: 500;
    margin: 8px 0;
}

.single-green-banner.expiring {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    box-shadow: 0 3px 6px rgba(255, 152, 0, 0.3);
    border-left-color: #e65100;
}

.single-green-banner .banner-icon {
    margin-right: 12px;
    font-size: 1.1em;
}

.single-green-banner .banner-content {
    flex: 1;
    display: flex;
    align-items: center;
}

.single-green-banner .banner-info {
    font-size: 0.8em;
    background: rgba(255,255,255,0.2);
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
}

/* Responsive design */
@media (max-width: 768px) {
    .single-red-banner,
    .single-green-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
    }
    
    .single-red-banner .banner-actions {
        margin-left: 0;
        width: 100%;
    }
}
`;

    const cssPath = path.join(rootDir, 'public/css/single-token-banner.css');
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('✅ Created single banner CSS');
}

/**
 * Update HTML to use only the single banner system
 */
function updateHTMLForSingleBanner() {
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Remove all other banner system includes
    htmlContent = htmlContent.replace(
        /<!-- Bulletproof Token Banners -->\s*<script src="\/js\/modules\/bulletproof-token-banners\.js"><\/script>/g,
        '<!-- Bulletproof Token Banners - DISABLED -->'
    );
    
    htmlContent = htmlContent.replace(
        /<!-- Primary Token Banners CSS -->\s*<link rel="stylesheet" href="\/css\/primary-token-banners\.css">/g,
        '<!-- Primary Token Banners CSS - DISABLED -->'
    );
    
    htmlContent = htmlContent.replace(
        /<!-- Bulletproof Token Banners CSS -->\s*<link rel="stylesheet" href="\/css\/bulletproof-token-banners\.css">/g,
        '<!-- Bulletproof Token Banners CSS - DISABLED -->'
    );
    
    // Add single banner system
    if (!htmlContent.includes('single-token-banner.css')) {
        htmlContent = htmlContent.replace(
            '    <!-- Version Indicator CSS -->',
            '    <!-- Single Token Banner CSS -->\n    <link rel="stylesheet" href="/css/single-token-banner.css">\n    <!-- Version Indicator CSS -->'
        );
    }
    
    if (!htmlContent.includes('single-token-banner.js')) {
        htmlContent = htmlContent.replace(
            '    <!-- Global Version Indicator -->',
            '    <!-- Single Token Banner System -->\n    <script src="/js/modules/single-token-banner.js"></script>\n    <!-- Global Version Indicator -->'
        );
    }
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Updated HTML to use single banner system');
}

/**
 * Fix version indicator duplication
 */
function fixVersionIndicatorDuplication() {
    console.log('🔢 Fixing version indicator duplication...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Make global version indicator much smaller and less prominent
    htmlContent = htmlContent.replace(
        '    <!-- Global Version Indicator -->',
        '    <!-- Global Version Indicator - MINIMIZED -->'
    );
    
    // Disable global version indicator temporarily
    htmlContent = htmlContent.replace(
        '<script src="/js/modules/global-version-indicator.js"></script>',
        '<!-- <script src="/js/modules/global-version-indicator.js"></script> DISABLED TO PREVENT DUPLICATION -->'
    );
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('✅ Disabled duplicate version indicators');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        disableOldTokenNotificationSystem();
        removeDuplicateBannerContainers();
        createSingleBannerSystem();
        createSingleBannerCSS();
        updateHTMLForSingleBanner();
        fixVersionIndicatorDuplication();
        
        console.log('=' .repeat(60));
        console.log('🔥 Aggressive Banner Fix Complete!');
        console.log('');
        console.log('✅ Actions Taken:');
        console.log('   • Completely disabled old token notification system');
        console.log('   • Removed duplicate banner containers from HTML');
        console.log('   • Created single authoritative banner system');
        console.log('   • Disabled all competing banner systems');
        console.log('   • Fixed version indicator duplication');
        console.log('   • Updated HTML to use only single banner system');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('   1. Rebuild bundle: npm run build:bundle');
        console.log('   2. Restart server: npm run restart');
        console.log('   3. Test - should see only ONE red banner and ONE green banner');
        
    } catch (error) {
        console.error('❌ Error in aggressive banner fix:', error.message);
        process.exit(1);
    }
}

export { disableOldTokenNotificationSystem, createSingleBannerSystem };