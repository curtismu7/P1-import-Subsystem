// Health Dashboard Page v7.3.0
// Integrates with the Enhanced Health Dashboard component for comprehensive monitoring

import { EnhancedHealthDashboard } from '../components/enhanced-health-dashboard.js?v=7.3.0';

class HealthDashboardPage {
    constructor(app) {
        this.app = app;
        this.pageId = 'health-dashboard';
        this.isLoaded = false;
        this.healthDashboard = null;
    }

    async load() {
        if (this.isLoaded) {
            return;
        }

        try {
            const pageElement = document.getElementById('health-dashboard-page');
            if (!pageElement) {
                console.error('Health dashboard page element not found');
                return;
            }

            // Create the page content
            pageElement.innerHTML = `
                <div class="page-header">
                    <h1>Health Dashboard</h1>
                    <p class="page-subtitle">Monitor system health, performance, and operational metrics</p>
                </div>
                
                <div class="health-dashboard-container">
                    <!-- Enhanced Health Dashboard will be mounted here -->
                    <div id="enhanced-health-dashboard-mount"></div>
                </div>
            `;

            // Initialize the enhanced health dashboard component
            const mountElement = pageElement.querySelector('#enhanced-health-dashboard-mount');
            if (mountElement) {
                this.healthDashboard = new EnhancedHealthDashboard(mountElement, {
                    autoRefresh: true,
                    refreshInterval: 30000, // 30 seconds
                    showControls: true,
                    showRecommendations: true,
                    uiManager: this.app.uiManager
                });

                // The EnhancedHealthDashboard calls init() automatically in constructor
                // await this.healthDashboard.initialize();
                console.log('✅ Health Dashboard initialized successfully');
            }

            this.isLoaded = true;
            
            // Update status
            this.app.uiManager.showSuccess('Health Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load Health Dashboard page:', error);
            this.app.uiManager.showError('Failed to load Health Dashboard: ' + error.message);
            
            // Show error state
            const pageElement = document.getElementById('health-dashboard-page');
            if (pageElement) {
                pageElement.innerHTML = `
                    <div class="page-header">
                        <h1>Health Dashboard</h1>
                        <p class="page-subtitle">Monitor system health, performance, and operational metrics</p>
                    </div>
                    
                    <div class="error-container">
                        <div class="error-card">
                            <div class="error-icon">
                                <i class="icon-alert-triangle"></i>
                            </div>
                            <div class="error-content">
                                <h3>Failed to Load Health Dashboard</h3>
                                <p>There was an error loading the health monitoring components.</p>
                                <p class="error-details">${error.message}</p>
                                <button class="btn btn-primary" onclick="window.pingOneApp.navigateToPage('health-dashboard', true)">
                                    <i class="icon-refresh-cw"></i>
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    async render() {
        // Page rendering is handled in load()
        if (this.healthDashboard) {
            await this.healthDashboard.render();
        }
    }

    async onShow() {
        // Called when the page becomes visible
        if (this.healthDashboard) {
            this.healthDashboard.startAutoRefresh();
        }
    }

    async onHide() {
        // Called when the page is hidden
        if (this.healthDashboard) {
            this.healthDashboard.stopAutoRefresh();
        }
    }

    async refresh() {
        // Force refresh the health dashboard
        if (this.healthDashboard) {
            await this.healthDashboard.refresh();
        }
    }

    destroy() {
        // Clean up resources
        if (this.healthDashboard) {
            this.healthDashboard.destroy();
            this.healthDashboard = null;
        }
        this.isLoaded = false;
    }
}

export { HealthDashboardPage };
