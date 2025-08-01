
/**
 * Primary Token Banner Manager
 * Handles both green (status) and red (auth required) banners
 * This is the ONLY banner system that should run
 */
class PrimaryTokenBannerManager {
    constructor() {
        this.banners = {
            green: null,
            red: null
        };
        this.tokenCheckInterval = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Prevent multiple instances
        if (window.primaryTokenBannerManager && window.primaryTokenBannerManager.isInitialized) {
            console.log('🛡️ Primary Token Banner Manager already initialized');
            return;
        }
        
        this.disableOtherBannerSystems();
        this.createBannerContainers();
        this.startTokenMonitoring();
        this.isInitialized = true;
        console.log('🛡️ Primary Token Banner Manager initialized');
    }

    disableOtherBannerSystems() {
        // Disable any existing token notification systems
        const existingNotifications = document.querySelectorAll('[class*="token-notification"], [id*="notification-area"]');
        existingNotifications.forEach(element => {
            if (element.style) {
                element.style.display = 'none';
            }
        });
        
        // Clear any existing banner intervals
        if (window.tokenNotificationInterval) {
            clearInterval(window.tokenNotificationInterval);
        }
    }

    createBannerContainers() {
        // Create single red banner container at the top
        let redContainer = document.getElementById('primary-red-banner-container');
        if (!redContainer) {
            redContainer = document.createElement('div');
            redContainer.id = 'primary-red-banner-container';
            redContainer.className = 'primary-banner-container';
            
            // Insert at very top of main content
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertBefore(redContainer, mainContent.firstChild);
            }
        }

        // Create single green banner container after global token status
        let greenContainer = document.getElementById('primary-green-banner-container');
        if (!greenContainer) {
            greenContainer = document.createElement('div');
            greenContainer.id = 'primary-green-banner-container';
            greenContainer.className = 'primary-banner-container';
            
            // Insert after global token status
            const globalTokenStatus = document.getElementById('global-token-status');
            if (globalTokenStatus && globalTokenStatus.parentNode) {
                globalTokenStatus.parentNode.insertBefore(greenContainer, globalTokenStatus.nextSibling);
            }
        }
    }

    startTokenMonitoring() {
        // Clear any existing interval
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        
        // Check token status every 3 seconds
        this.tokenCheckInterval = setInterval(() => {
            this.updateBanners();
        }, 3000);

        // Initial check
        this.updateBanners();
    }

    updateBanners() {
        const tokenInfo = this.getTokenInfo();
        
        // Update banners based on token status
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
        const container = document.getElementById('primary-red-banner-container');
        if (!container) return;

        if (!tokenInfo.hasToken || !tokenInfo.isValid) {
            // Show single red banner for authentication required
            const reason = !tokenInfo.hasToken ? 'No token found' : 'Token expired';
            
            const bannerHTML = `
                <div class="primary-red-banner">
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
            
            if (container.innerHTML !== bannerHTML) {
                container.innerHTML = bannerHTML;
            }
        } else {
            // Hide red banner when token is valid
            container.innerHTML = '';
        }
    }

    updateGreenBanner(tokenInfo) {
        const container = document.getElementById('primary-green-banner-container');
        if (!container) return;

        if (tokenInfo.hasToken && tokenInfo.isValid) {
            // Show green banner with token info
            const isExpiring = tokenInfo.timeLeft <= 300; // 5 minutes
            const timeFormatted = this.formatTime(tokenInfo.timeLeft);
            const buildNumber = this.getCurrentBuildNumber();
            
            const bannerHTML = `
                <div class="primary-green-banner ${isExpiring ? 'expiring' : ''}">
                    <div class="banner-content">
                        <span class="banner-icon">${isExpiring ? '⚠️' : '✅'}</span>
                        <span class="banner-text">
                            <strong>TOKEN ACTIVE</strong> | Time Left: ${timeFormatted} | Build: ${buildNumber} | v6.5.2.4
                        </span>
                    </div>
                    <div class="banner-info">
                        ${isExpiring ? 'Expiring Soon' : 'Valid & Active'}
                    </div>
                </div>
            `;
            
            if (container.innerHTML !== bannerHTML) {
                container.innerHTML = bannerHTML;
            }
        } else {
            // Hide green banner when no valid token
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

    getCurrentBuildNumber() {
        try {
            // Try to get from version indicator
            const versionElement = document.getElementById('build-badge');
            if (versionElement) {
                const buildText = versionElement.textContent;
                const match = buildText.match(/bundle-\d+/);
                if (match) return match[0];
            }
            return 'bundle-1754040333'; // Current build
        } catch (error) {
            return 'unknown';
        }
    }

    destroy() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
        }
        this.isInitialized = false;
    }
}

// Initialize as the primary and only banner system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.primaryTokenBannerManager = new PrimaryTokenBannerManager();
    });
} else {
    window.primaryTokenBannerManager = new PrimaryTokenBannerManager();
}
