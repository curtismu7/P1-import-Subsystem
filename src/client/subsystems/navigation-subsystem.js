/**
 * Navigation Subsystem
 * 
 * Manages all navigation, routing, and view switching functionality.
 * Extracted from app.js to provide centralized navigation control.
 * 
 * Features:
 * - View switching and routing
 * - Navigation state management
 * - URL handling and deep linking
 * - View-specific initialization
 * - Navigation history tracking
 */

import { createLogger } from '../utils/browser-logging-service.js';
import { APP_VERSION, getFormattedVersion, getVersionedAppName } from '../../version.js';

export class NavigationSubsystem {
    constructor(logger, uiManager, settingsManager, app) {
        this.logger = logger || createLogger({
            serviceName: 'navigation-subsystem',
            environment: 'development'
        });
        
        this.uiManager = uiManager;
        this.settingsManager = settingsManager;
        this.app = app; // Reference to main app for version access
        
        // Navigation state
        this.currentView = 'home'; // Default view
        this.previousView = null;
        this.navigationHistory = [];
        this.viewInitializers = new Map();
        this.viewCleanupHandlers = new Map();
        
        // Navigation elements
        this.navItems = null;
        this.viewContainers = null;
        
        this.logger.info('Navigation subsystem initialized');
    }
    
    /**
     * Initialize the navigation subsystem
     */
    async init() {
        try {
            this.logger.info('Initializing navigation subsystem...');
            
            // Find navigation elements
            this.navItems = document.querySelectorAll('[data-view]');
            this.viewContainers = document.querySelectorAll('.view-container, [id$="-view"]');
            
            this.logger.info('Navigation elements found', {
                navItems: this.navItems.length,
                viewContainers: this.viewContainers.length
            });
            
            // Set up navigation event listeners
            this.setupNavigationListeners();
            
            // Register default view initializers
            this.registerDefaultViewInitializers();
            
            // Initialize current view
            await this.showView(this.currentView);
            
            this.logger.info('Navigation subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize navigation subsystem', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Set up navigation event listeners
     */
    setupNavigationListeners() {
        this.navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                
                this.logger.debug('Navigation item clicked', { view });
                
                if (view && view !== this.currentView) {
                    await this.navigateToView(view);
                }
            });
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.showView(e.state.view, false); // Don't push to history
            }
        });
        
        this.logger.debug('Navigation listeners set up');
    }
    
    /**
     * Navigate to a specific view
     * @param {string} view - The view to navigate to
     * @param {Object} options - Navigation options
     */
    async navigateToView(view, options = {}) {
        try {
            this.logger.info('Navigating to view', { from: this.currentView, to: view });
            
            // Validate view exists
            if (!this.isValidView(view)) {
                this.logger.warn('Invalid view requested', { view });
                return false;
            }
            
            // Check if navigation is allowed
            if (options.force !== true && !await this.canNavigateFrom(this.currentView)) {
                this.logger.info('Navigation blocked by current view', { currentView: this.currentView });
                return false;
            }
            
            // Skip if already on this view
            if (this.currentView === view) {
                this.logger.debug('Already on requested view', { view });
                return true;
            }
            
            // Store previous view
            this.previousView = this.currentView;
            
            // Emit view changing event
            if (window.EventBus) {
                window.EventBus.publish('view:changing', { 
                    from: this.previousView, 
                    to: view 
                });
            }
            
            // Show loading spinner
            try {
                // Create a more descriptive loading message based on the view
                let loadingMessage = 'Loading...';
                switch(view) {
                    case 'token-manager':
                        loadingMessage = 'Loading Token Manager...';
                        break;
                    case 'import':
                        loadingMessage = 'Loading Import Tool...';
                        break;
                    case 'export':
                        loadingMessage = 'Loading Export Tool...';
                        break;
                    case 'settings':
                        loadingMessage = 'Loading Settings...';
                        break;
                    default:
                        loadingMessage = `Loading ${view.charAt(0).toUpperCase() + view.slice(1)}...`;
                }
                
                // Show spinner if available
                if (window.app?.loadingSpinner?.show) {
                    window.app.loadingSpinner.show(loadingMessage);
                }
            } catch (error) {
                this.logger.warn('Failed to show loading spinner', { error: error.message });
            }
            
            // Show the view
            const success = await this.showView(view, options.pushToHistory !== false);
            
            // Hide spinner after view is fully loaded
            try {
                if (window.app?.loadingSpinner?.hide) {
                    window.app.loadingSpinner.hide();
                }
            } catch (error) {
                this.logger.warn('Failed to hide loading spinner', { error: error.message });
            }
            
            // Emit view changed event
            if (window.EventBus) {
                window.EventBus.publish('view:changed', { 
                    from: this.previousView, 
                    to: view 
                });
            }
            
            if (success) {
                this.logger.info('Navigation completed successfully', { view });
            }
            
            return success;
        } catch (error) {
            this.logger.error('Navigation failed', { view, error: error.message });
            
            // Hide spinner on error
            try {
                if (window.app?.loadingSpinner?.hide) {
                    window.app.loadingSpinner.hide(true); // Force hide immediately
                }
            } catch (spinnerError) {
                this.logger.warn('Failed to hide spinner on error', { error: spinnerError.message });
            }
            
            return false;
        }
        
        // The code below is unreachable due to the try-catch block above
        if (this.currentView === view) {
            this.logger.debug('Already on requested view', { view });
            return true;
        }
        
        this.logger.debug('Navigating to view', { view, from: this.currentView });
        
        // Store previous view
        this.previousView = this.currentView;
        
        // Emit view changing event
        if (window.EventBus) {
            window.EventBus.publish('view:changing', { 
                from: this.previousView, 
                to: view 
            });
        }
        
        // Show loading spinner
        try {
            // Create a more descriptive loading message based on the view
            let loadingMessage = 'Loading...';
            switch(view) {
                case 'token-manager':
                    loadingMessage = 'Loading Token Manager...';
                    break;
                case 'import':
                    loadingMessage = 'Loading Import Tool...';
                    break;
                case 'export':
                    loadingMessage = 'Loading Export Tool...';
                    break;
                case 'settings':
                    loadingMessage = 'Loading Settings...';
                    break;
                default:
                    loadingMessage = `Loading ${view.charAt(0).toUpperCase() + view.slice(1)}...`;
            }
            
            // Show spinner if available
            if (window.app?.loadingSpinner?.show) {
                window.app.loadingSpinner.show(loadingMessage);
            }
        } catch (error) {
            this.logger.warn('Failed to show loading spinner', { error: error.message });
        }
        
        // Run cleanup handler for previous view if exists
        if (this.previousView && this.viewCleanupHandlers.has(this.previousView)) {
            try {
                await this.viewCleanupHandlers.get(this.previousView)();
                this.logger.debug('View cleanup completed', { view: this.previousView });
            } catch (error) {
                this.logger.warn('View cleanup failed', { view: this.previousView, error: error.message });
            }
        }
        
        // Hide all views
        this.hideAllViews();
        
        // Show target view
        const viewElement = document.getElementById(`${view}-view`);
        if (viewElement) {
            viewElement.style.display = 'block';
            viewElement.classList.add('active');
        } else {
            this.logger.warn('View element not found', { view });
            // Hide spinner on error
            if (window.app?.loadingSpinner?.hide) {
                window.app.loadingSpinner.hide();
            }
            return false;
        }
        
        // Update navigation state
        this.updateNavigationState(view);
        
        // Run view initializer
        if (this.viewInitializers.has(view)) {
            try {
                await this.viewInitializers.get(view)();
                this.logger.debug('View initializer completed', { view });
            } catch (error) {
                this.logger.warn('View initializer failed', { view, error: error.message });
            }
        }
        
        // Update browser history
        if (options.pushToHistory !== false && window.history) {
            const url = new URL(window.location);
            url.searchParams.set('view', view);
            window.history.pushState({ view }, '', url);
        }
        
        // Update current view
        this.currentView = view;
        
        // Add to navigation history
        this.navigationHistory.push({
            view,
            timestamp: Date.now(),
            from: this.previousView
        });
        
        // Hide spinner after view is fully loaded
        try {
            if (window.app?.loadingSpinner?.hide) {
                window.app.loadingSpinner.hide();
            }
        } catch (error) {
            this.logger.warn('Failed to hide loading spinner', { error: error.message });
        }
        
        // Emit view changed event
        if (window.EventBus) {
            window.EventBus.publish('view:changed', { 
                from: this.previousView, 
                to: view 
            });
        }
        
        return true;
    }
    
    /**
     * Show a specific view
     * @param {string} view - The view to show
     * @param {boolean} pushToHistory - Whether to push to browser history
     */
    async showView(view, pushToHistory = true) {
        try {
            this.logger.debug('Showing view', { view, pushToHistory });
            
            // Store previous view
            this.previousView = this.currentView;
            
            // Run cleanup for previous view
            if (this.previousView && this.viewCleanupHandlers.has(this.previousView)) {
                try {
                    await this.viewCleanupHandlers.get(this.previousView)();
                    this.logger.debug('View cleanup completed', { view: this.previousView });
                } catch (error) {
                    this.logger.warn('View cleanup failed', { view: this.previousView, error: error.message });
                }
            }
            
            // Hide all views
            this.hideAllViews();
            
            // Show target view
            const viewElement = document.getElementById(`${view}-view`);
            if (viewElement) {
                viewElement.style.display = 'block';
                viewElement.classList.add('active');
            } else {
                this.logger.warn('View element not found', { view });
                return false;
            }
            
            // Update navigation state
            this.updateNavigationState(view);
            
            // Run view initializer
            if (this.viewInitializers.has(view)) {
                try {
                    await this.viewInitializers.get(view)();
                    this.logger.debug('View initializer completed', { view });
                } catch (error) {
                    this.logger.warn('View initializer failed', { view, error: error.message });
                }
            }
            
            // Update browser history
            if (pushToHistory && window.history) {
                const url = new URL(window.location);
                url.searchParams.set('view', view);
                window.history.pushState({ view }, '', url);
            }
            
            // Update current view
            this.currentView = view;
            
            // Add to navigation history
            this.navigationHistory.push({
                view,
                timestamp: Date.now(),
                from: this.previousView
            });
            
            // Limit history size
            if (this.navigationHistory.length > 50) {
                this.navigationHistory = this.navigationHistory.slice(-50);
            }
            
            this.logger.info('View shown successfully', { view });
            return true;
            
        } catch (error) {
            this.logger.error('Failed to show view', { view, error: error.message });
            return false;
        }
    }
    
    /**
     * Hide all views
     */
    hideAllViews() {
        this.viewContainers.forEach(container => {
            container.style.display = 'none';
            container.classList.remove('active');
        });
        
        this.logger.debug('All views hidden');
    }
    
    /**
     * Update navigation state (active nav items, etc.)
     * @param {string} view - The active view
     */
    updateNavigationState(view) {
        // Update navigation items
        this.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            }
        });
        
        // Update page title if needed
        this.updatePageTitle(view);
        
        this.logger.debug('Navigation state updated', { view });
    }
    
    /**
     * Update page title based on current view
     * @param {string} view - The current view
     */
    updatePageTitle(view) {
        const titles = {
            'import': 'Import Users',
            'export': 'Export Users', 
            'modify': 'Modify Users',
            'delete-csv': 'Delete Users',
            'settings': 'Settings',
            'logs': 'Logs',
            'history': 'History'
        };
        
        // Use centralized version source
        const baseTitle = getVersionedAppName('PingOne User Import');
        const viewTitle = titles[view];
        
        if (viewTitle) {
            document.title = `${viewTitle} - ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }
    
    /**
     * Register a view initializer
     * @param {string} view - The view name
     * @param {Function} initializer - The initializer function
     */
    registerViewInitializer(view, initializer) {
        this.viewInitializers.set(view, initializer);
        this.logger.debug('View initializer registered', { view });
    }
    
    /**
     * Register a view cleanup handler
     * @param {string} view - The view name
     * @param {Function} cleanup - The cleanup function
     */
    registerViewCleanup(view, cleanup) {
        this.viewCleanupHandlers.set(view, cleanup);
        this.logger.debug('View cleanup handler registered', { view });
    }
    
    /**
     * Register default view initializers
     */
    registerDefaultViewInitializers() {
        // Import view initializer
        this.registerViewInitializer('import', async () => {
            if (typeof window.app?.loadPopulations === 'function') {
                await window.app.loadPopulations('import-population-select');
            }
        });
        
        // Export view initializer
        this.registerViewInitializer('export', async () => {
            if (window.exportManager && typeof window.exportManager.loadPopulations === 'function') {
                await window.exportManager.loadPopulations();
            }
        });
        
        // Delete view initializer
        this.registerViewInitializer('delete-csv', async () => {
            if (window.deleteManager && typeof window.deleteManager.loadPopulations === 'function') {
                await window.deleteManager.loadPopulations();
            }
        });
        
        // Modify view initializer
        this.registerViewInitializer('modify', async () => {
            if (typeof window.app?.loadPopulations === 'function') {
                await window.app.loadPopulations('modify-population-select');
            }
        });
        
        // Logs/History view initializer
        this.registerViewInitializer('logs', async () => {
            if (window.logManager && typeof window.logManager.loadLogs === 'function') {
                window.logManager.loadLogs();
            }
        });
        
        this.registerViewInitializer('history', async () => {
            if (window.logManager && typeof window.logManager.loadLogs === 'function') {
                window.logManager.loadLogs();
            }
        });
        
        // Token Manager view initializer
        this.registerViewInitializer('token-manager', async () => {
            if (this.app?.subsystems?.tokenManager && typeof this.app.subsystems.tokenManager.initialize === 'function') {
                await this.app.subsystems.tokenManager.initialize();
            }
        });
        
        this.logger.debug('Default view initializers registered');
    }
    
    /**
     * Check if a view is valid
     * @param {string} view - The view to validate
     * @returns {boolean} - Whether the view is valid
     */
    isValidView(view) {
        const validViews = ['home', 'import', 'export', 'modify', 'delete-csv', 'settings', 'logs', 'history', 'analytics', 'token-manager'];
        return validViews.includes(view);
    }
    
    /**
     * Check if navigation is allowed from current view
     * @param {string} fromView - The view to navigate from
     * @returns {Promise<boolean>} - Whether navigation is allowed
     */
    async canNavigateFrom(fromView) {
        // Check for unsaved changes, running operations, etc.
        
        // Check if import is running
        if (fromView === 'import' && window.app?.isImportRunning) {
            const confirmed = confirm('Import is currently running. Are you sure you want to leave this page?');
            return confirmed;
        }
        
        // Check if export is running
        if (fromView === 'export' && window.exportManager?.isExportRunning) {
            const confirmed = confirm('Export is currently running. Are you sure you want to leave this page?');
            return confirmed;
        }
        
        // Check if delete is running
        if (fromView === 'delete-csv' && window.deleteManager?.isDeleteRunning) {
            const confirmed = confirm('Delete operation is currently running. Are you sure you want to leave this page?');
            return confirmed;
        }
        
        // Check for unsaved settings
        if (fromView === 'settings' && this.settingsManager?.hasUnsavedChanges?.()) {
            const confirmed = confirm('You have unsaved settings. Are you sure you want to leave without saving?');
            return confirmed;
        }
        
        return true;
    }
    
    /**
     * Get current view
     * @returns {string} - The current view
     */
    getCurrentView() {
        return this.currentView;
    }
    
    /**
     * Get previous view
     * @returns {string|null} - The previous view
     */
    getPreviousView() {
        return this.previousView;
    }
    
    /**
     * Get navigation history
     * @returns {Array} - The navigation history
     */
    getNavigationHistory() {
        return [...this.navigationHistory];
    }
    
    /**
     * Go back to previous view
     */
    async goBack() {
        if (this.previousView) {
            await this.navigateToView(this.previousView);
        } else if (this.navigationHistory.length > 1) {
            const previousEntry = this.navigationHistory[this.navigationHistory.length - 2];
            await this.navigateToView(previousEntry.view);
        }
    }
    
    /**
     * Refresh current view
     */
    async refreshCurrentView() {
        await this.showView(this.currentView, false);
    }
    
    /**
     * Get view statistics
     * @returns {Object} - View usage statistics
     */
    getViewStats() {
        const stats = {};
        
        this.navigationHistory.forEach(entry => {
            if (!stats[entry.view]) {
                stats[entry.view] = {
                    count: 0,
                    lastVisited: null
                };
            }
            stats[entry.view].count++;
            stats[entry.view].lastVisited = entry.timestamp;
        });
        
        return stats;
    }
    
    /**
     * Clean up the navigation subsystem
     */
    cleanup() {
        // Remove event listeners
        this.navItems.forEach(item => {
            item.removeEventListener('click', this.handleNavClick);
        });
        
        window.removeEventListener('popstate', this.handlePopState);
        
        // Clear state
        this.viewInitializers.clear();
        this.viewCleanupHandlers.clear();
        this.navigationHistory = [];
        
        this.logger.info('Navigation subsystem cleaned up');
    }
}