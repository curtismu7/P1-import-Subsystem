
/**
 * BULLETPROOF TOKEN BANNER SYSTEM
 * The ultimate, conflict-free banner system
 */
class BulletproofTokenBannerSystem {
    constructor() {
        this.isInitialized = false;
        this.tokenCheckInterval = null;
        this.currentBuild = 'bundle-1754042411';
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
            
            const bannerHTML = `
                <div class="bulletproof-red-banner">
                    <div class="banner-content">
                        <span class="banner-icon">🔒</span>
                        <span class="banner-text">
                            <strong>Authentication Required</strong> - ${reason}. Most functionality is disabled until you authenticate.
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
            `;
            
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
            
            const bannerHTML = `
                <div class="bulletproof-green-banner ${isExpiring ? 'expiring' : ''}">
                    <div class="banner-content">
                        <span class="banner-icon">${isExpiring ? '⚠️' : '✅'}</span>
                        <span class="banner-text">
                            <strong>TOKEN ACTIVE</strong> | Time Left: ${timeFormatted} | Build: ${this.currentBuild} | v${this.version} | ${this.lastChange}
                        </span>
                    </div>
                    <div class="banner-info">
                        ${isExpiring ? 'Expiring Soon' : 'Valid & Active'}
                    </div>
                </div>
            `;
            
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
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

// Export the class for ES modules
export { BulletproofTokenBannerSystem };

// Add global methods for testing
window.checkTokenNow = () => window.bulletproofTokenBannerSystem?.checkTokenNow();
window.simulateToken = () => window.bulletproofTokenBannerSystem?.simulateToken();
