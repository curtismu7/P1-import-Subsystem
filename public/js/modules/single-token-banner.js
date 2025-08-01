
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
            
            const bannerHTML = `
                <div class="single-red-banner">
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
        const container = document.getElementById('single-green-banner-container');
        if (!container) return;

        if (tokenInfo.hasToken && tokenInfo.isValid) {
            const isExpiring = tokenInfo.timeLeft <= 300;
            const timeFormatted = this.formatTime(tokenInfo.timeLeft);
            
            const bannerHTML = `
                <div class="single-green-banner ${isExpiring ? 'expiring' : ''}">
                    <div class="banner-content">
                        <span class="banner-icon">${isExpiring ? '⚠️' : '✅'}</span>
                        <span class="banner-text">
                            <strong>TOKEN ACTIVE</strong> | Time Left: ${timeFormatted} | Build: bundle-1754041167 | v6.5.2.4
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
