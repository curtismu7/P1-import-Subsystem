// Import Maps Application Entry Point
// This demonstrates native ES module loading without bundling

import { createLogger } from './modules/logger.js';
import UIManager from './modules/ui-manager.js';
import SettingsManager from './modules/settings-manager.js';
import PerformanceComparison from './performance-comparison.js';

class ImportMapsApp {
    constructor() {
        this.logger = createLogger('ImportMapsApp');
        this.uiManager = null;
        this.settingsManager = null;
        this.performanceComparison = null;
        this.startTime = performance.now();
        this.moduleLoadTimes = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.logger.info('Starting Import Maps application initialization...');
            
            // Track module loading performance
            await this.measureModuleLoading();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup application
            await this.setupApplication();
            
            // Calculate total initialization time
            const totalTime = performance.now() - this.startTime;
            this.logger.info(`Application initialized in ${totalTime.toFixed(2)}ms`);
            
            // Update UI with performance metrics
            this.updatePerformanceDisplay(totalTime);
            
            this.initialized = true;
            
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            this.showError(error);
        }
    }

    async measureModuleLoading() {
        const modules = [
            { name: 'UIManager', path: './modules/ui-manager.js' },
            { name: 'SettingsManager', path: './modules/settings-manager.js' }
        ];

        for (const module of modules) {
            const start = performance.now();
            try {
                await import(module.path);
                const loadTime = performance.now() - start;
                this.moduleLoadTimes.set(module.name, loadTime);
                this.logger.info(`Module ${module.name} loaded in ${loadTime.toFixed(2)}ms`);
            } catch (error) {
                this.logger.error(`Failed to load module ${module.name}:`, error);
                throw error;
            }
        }
    }

    async initializeComponents() {
        this.logger.info('Initializing core components...');
        
        // Initialize UI Manager
        const uiStart = performance.now();
        this.uiManager = new UIManager();
        await this.uiManager.initialize();
        const uiTime = performance.now() - uiStart;
        this.logger.info(`UIManager initialized in ${uiTime.toFixed(2)}ms`);
        
        // Initialize Settings Manager
        const settingsStart = performance.now();
        this.settingsManager = new SettingsManager();
        await this.settingsManager.initialize();
        const settingsTime = performance.now() - settingsStart;
        this.logger.info(`SettingsManager initialized in ${settingsTime.toFixed(2)}ms`);
        
        // Initialize Performance Comparison
        this.performanceComparison = new PerformanceComparison();
        this.logger.info('PerformanceComparison initialized');
    }

    async setupApplication() {
        this.logger.info('Setting up application...');
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup view management
        this.setupViewManagement();
        
        // Setup error handling
        this.setupErrorHandling();
        
        // Show the application
        this.showApplication();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.navigateToView(view);
                
                // Update active nav
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    setupViewManagement() {
        // Setup view-specific functionality
        this.setupSettingsView();
        this.setupImportView();
        this.setupExportView();
        this.setupTokenManagerView();
    }

    setupSettingsView() {
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSettingsSave(e);
            });
        }
    }

    setupImportView() {
        // Placeholder for import functionality
        this.logger.info('Import view setup complete');
    }

    setupExportView() {
        // Placeholder for export functionality
        this.logger.info('Export view setup complete');
    }

    setupTokenManagerView() {
        // Placeholder for token manager functionality
        this.logger.info('Token Manager view setup complete');
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.logger.error('Global error:', event.error);
            this.uiManager?.showNotification('An error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection:', event.reason);
            this.uiManager?.showNotification('Promise rejection occurred', 'error');
        });
    }

    navigateToView(viewName) {
        this.logger.info(`Navigating to view: ${viewName}`);
        this.uiManager?.showView(viewName);
        
        // Load view-specific data if needed
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'settings':
                await this.loadSettingsData();
                break;
            case 'import':
                await this.loadImportData();
                break;
            case 'export':
                await this.loadExportData();
                break;
            case 'token-manager':
                await this.loadTokenManagerData();
                break;
        }
    }

    async loadSettingsData() {
        this.logger.info('Loading settings data...');
        // Populate settings form with current values
        const settings = this.settingsManager?.getAll();
        if (settings) {
            Object.entries(settings).forEach(([key, value]) => {
                const input = document.getElementById(key);
                if (input) {
                    input.value = value;
                }
            });
        }
    }

    async loadImportData() {
        this.logger.info('Loading import data...');
        // Load populations, etc.
    }

    async loadExportData() {
        this.logger.info('Loading export data...');
        // Load populations, etc.
    }

    async loadTokenManagerData() {
        this.logger.info('Loading token manager data...');
        // Load token status, etc.
    }

    async handleSettingsSave(event) {
        this.logger.info('Saving settings...');
        
        const formData = new FormData(event.target);
        const settings = Object.fromEntries(formData);
        
        // Update settings manager
        Object.entries(settings).forEach(([key, value]) => {
            this.settingsManager?.set(key, value);
        });
        
        // Save to server
        const success = await this.settingsManager?.save();
        
        if (success) {
            this.uiManager?.showNotification('Settings saved successfully', 'success');
        } else {
            this.uiManager?.showNotification('Failed to save settings', 'error');
        }
    }

    updatePerformanceDisplay(totalTime) {
        const performanceStatus = document.getElementById('performance-status');
        if (performanceStatus) {
            performanceStatus.textContent = `${totalTime.toFixed(2)}ms`;
            performanceStatus.className = 'status-success';
        }

        const moduleStatus = document.getElementById('module-status');
        if (moduleStatus) {
            const moduleCount = this.moduleLoadTimes.size;
            moduleStatus.textContent = `${moduleCount} modules loaded`;
            moduleStatus.className = 'status-success';
        }

        // Show detailed performance metrics
        this.showPerformanceMetrics();
    }

    showPerformanceMetrics() {
        const metricsContainer = document.getElementById('performance-metrics');
        if (metricsContainer) {
            const metrics = Array.from(this.moduleLoadTimes.entries())
                .map(([name, time]) => `${name}: ${time.toFixed(2)}ms`)
                .join('<br>');
            
            metricsContainer.innerHTML = `
                <h5>Module Load Times:</h5>
                <div class="metrics-detail">${metrics}</div>
            `;
        }
    }

    showApplication() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        this.logger.info('Application UI displayed');
    }

    showError(error) {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('error-display').style.display = 'block';
        document.getElementById('error-message').textContent = error.message;
    }

    // Public API for debugging
    getPerformanceMetrics() {
        return {
            totalInitTime: performance.now() - this.startTime,
            moduleLoadTimes: Object.fromEntries(this.moduleLoadTimes),
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : 'Not available'
        };
    }

    getModuleInfo() {
        return {
            loadedModules: Array.from(this.moduleLoadTimes.keys()),
            totalModules: this.moduleLoadTimes.size,
            averageLoadTime: Array.from(this.moduleLoadTimes.values())
                .reduce((sum, time) => sum + time, 0) / this.moduleLoadTimes.size
        };
    }
}

// Global app instance for debugging
window.importMapsApp = new ImportMapsApp();

// Initialize the application
window.importMapsApp.initialize().catch(error => {
    console.error('Failed to initialize Import Maps application:', error);
});

export default ImportMapsApp;
