/**
 * View Management Subsystem
 * 
 * Handles all view transitions, navigation, and view-specific initialization.
 * Manages the single-page application navigation and view state.
 */

export class ViewManagementSubsystem {
    constructor(logger, uiManager) {
        this.logger = logger;
        this.uiManager = uiManager;
        
        // View state management
        this.currentView = 'home';
        this.previousView = null;
        this.viewHistory = [];
        this.viewInitializers = new Map();
        
        this.logger.info('View Management Subsystem initialized with default home view');
    }
    
    /**
     * Initialize the view management subsystem
     */
    async init() {
        try {
            this.setupNavigationListeners();
            this.registerViewInitializers();
            await this.showInitialView();
            this.logger.info('View Management Subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize View Management Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up navigation event listeners
     */
    setupNavigationListeners() {
        // Navigation items
        const navItems = document.querySelectorAll('[data-view]');
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                await this.showView(view);
            });
        });
        
        // Browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.showView(e.state.view, false);
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.handleKeyboardNavigation(e);
            }
        });
    }
    
    /**
     * Register view initializers
     */
    registerViewInitializers() {
        // Import view initializer
        this.viewInitializers.set('import', async () => {
            await this.initializeImportView();
        });
        
        // Export view initializer
        this.viewInitializers.set('export', async () => {
            await this.initializeExportView();
        });
        
        // Modify view initializer
        this.viewInitializers.set('modify', async () => {
            await this.initializeModifyView();
        });
        
        // Delete view initializer
        this.viewInitializers.set('delete-csv', async () => {
            await this.initializeDeleteView();
        });
        
        // Settings view initializer
        this.viewInitializers.set('settings', async () => {
            await this.initializeSettingsView();
        });
        
        // Logs view initializer
        this.viewInitializers.set('logs', async () => {
            await this.initializeLogsView();
        });
        
        // History view initializer
        this.viewInitializers.set('history', async () => {
            await this.initializeHistoryView();
        });
    }
    
    /**
     * Show a specific view
     */
    async showView(view, updateHistory = true) {
        if (!view || view === this.currentView) {
            return;
        }
        
        try {
            this.logger.info('Switching to view', { from: this.currentView, to: view });
            
            // Validate view exists
            if (!this.isValidView(view)) {
                if (this.uiManager && typeof this.uiManager.showError === 'function') {
                    this.uiManager.showError('Navigation Error', `Invalid view: ${view}`);
                }
                return;
            }
            
            // Store previous view
            this.previousView = this.currentView;
            
            // Hide current view
            this.hideCurrentView();
            
            // Show new view
            await this.displayView(view);
            
            // Update navigation state
            this.updateNavigationState(view);
            
            // Update browser history
            if (updateHistory) {
                this.updateBrowserHistory(view);
            }
            
            // Initialize view-specific logic
            await this.initializeView(view);
            
            // Update view state
            this.currentView = view;
            this.viewHistory.push(view);
            
            // Update page title
            this.updatePageTitle(view);
            
            // Trigger view change event
            this.triggerViewChangeEvent(view, this.previousView);
        } catch (error) {
            this.logger.error('Failed to switch view', { view, error: error.message });
            if (this.uiManager && typeof this.uiManager.showError === 'function') {
                this.uiManager.showError('Navigation Error', `Failed to switch to ${view} view: ${error.message}`);
            }
        }
    }
    
    /**
     * Hide the current view
     */
    hideCurrentView() {
        const currentViewElement = document.getElementById(`${this.currentView}-view`);
        if (currentViewElement) {
            currentViewElement.style.display = 'none';
            currentViewElement.classList.remove('active');
        }
    }
    
    /**
     * Display the specified view
     */
    async displayView(view) {
        const viewElement = document.getElementById(`${view}-view`);
        if (!viewElement) {
            throw new Error(`View element not found: ${view}-view`);
        }
        
        // Show view with animation
        viewElement.style.display = 'block';
        viewElement.classList.add('active');
        
        // Add fade-in animation
        viewElement.style.opacity = '0';
        viewElement.style.transition = 'opacity 0.3s ease-in-out';
        
        // Trigger reflow and fade in
        requestAnimationFrame(() => {
            viewElement.style.opacity = '1';
        });
    }
    
    /**
     * Update navigation state
     */
    updateNavigationState(view) {
        // Update navigation items
        const navItems = document.querySelectorAll('[data-view]');
        navItems.forEach(item => {
            const itemView = item.getAttribute('data-view');
            if (itemView === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update page title
        this.updatePageTitle(view);
    }
    
    /**
     * Update browser history
     */
    updateBrowserHistory(view) {
        const state = { view, timestamp: Date.now() };
        const title = this.getViewTitle(view);
        const url = `#${view}`;
        
        history.pushState(state, title, url);
    }
    
    /**
     * Initialize view-specific functionality
     */
    async initializeView(view) {
        const initializer = this.viewInitializers.get(view);
        if (initializer) {
            try {
                await initializer();
            } catch (error) {
                this.logger.error('View initialization failed', { view, error: error.message });
            }
        }
    }
    
    /**
     * Initialize import view
     */
    async initializeImportView() {
        // Load populations for import dropdown
        if (window.app && typeof window.app.loadPopulations === 'function') {
            await window.app.loadPopulations('import-population-select');
        }
        
        // Reset file input
        const fileInput = document.getElementById('csv-file');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Reset progress display
        this.resetProgressDisplay();
    }
    
    /**
     * Initialize export view
     */
    async initializeExportView() {
        // Load populations for export dropdown
        if (window.exportManager && typeof window.exportManager.loadPopulations === 'function') {
            await window.exportManager.loadPopulations();
        }
    }
    
    /**
     * Initialize modify view
     */
    async initializeModifyView() {
        // Load populations for modify dropdown
        if (window.app && typeof window.app.loadPopulations === 'function') {
            await window.app.loadPopulations('modify-population-select');
        }
        
        // Reset file input
        const fileInput = document.getElementById('modify-csv-file');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    /**
     * Initialize delete view
     */
    async initializeDeleteView() {
        // Load populations for delete dropdown
        if (window.deleteManager && typeof window.deleteManager.loadPopulations === 'function') {
            await window.deleteManager.loadPopulations();
        }
    }
    
    /**
     * Initialize settings view
     */
    async initializeSettingsView() {
        // Load current settings
        if (window.app && typeof window.app.loadSettings === 'function') {
            await window.app.loadSettings();
        }
    }
    
    /**
     * Initialize logs view
     */
    async initializeLogsView() {
        // Load logs
        if (window.logManager && typeof window.logManager.loadLogs === 'function') {
            await window.logManager.loadLogs();
        }
    }
    
    /**
     * Initialize history view
     */
    async initializeHistoryView() {
        try {
            // Initialize history UI component if available
            if (this.app && this.app.subsystems && this.app.subsystems.history) {
                this.logger.debug('Initializing history view with HistorySubsystem');
                
                // The history UI component will be initialized by the main app
                // Just ensure the view container exists
                const historyView = document.getElementById('history-view');
                if (!historyView) {
                    this.logger.warn('History view container not found');
                }
            } else {
                this.logger.warn('HistorySubsystem not available for history view initialization');
            }
        } catch (error) {
            this.logger.error('Failed to initialize history view:', error);
        }
    }
    
    /**
     * Show initial view based on URL hash or default
     */
    async showInitialView() {
        let initialView = 'home';
        
        // Check URL hash for the initial view
        const hash = window.location.hash.substring(1);
        if (hash && this.isValidView(hash)) {
            initialView = hash;
        }  
        
        await this.showView(initialView, false);
    }
    
    /**
     * Check if view is valid
     */
    isValidView(view) {
        const validViews = [
            'home', 'import', 'export', 'modify', 'delete-csv', 
            'settings', 'logs', 'history'
        ];
        return validViews.includes(view);
    }
    
    /**
     * Get view title
     */
    getViewTitle(view) {
        const titles = {
            'import': 'Import Users',
            'export': 'Export Users',
            'modify': 'Modify Users',
            'delete-csv': 'Delete Users',
            'settings': 'Settings',
            'logs': 'Logs',
            'history': 'History'
        };
        
        return titles[view] || 'PingOne Import Tool';
    }
    
    /**
     * Update page title
     */
    updatePageTitle(view) {
        const title = this.getViewTitle(view);
        document.title = `${title} - PingOne Import Tool`;
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(e) {
        const keyMap = {
            '1': 'import',
            '2': 'export',
            '3': 'modify',
            '4': 'delete-csv',
            '5': 'settings',
            '6': 'logs',
            '7': 'history'
        };
        
        const view = keyMap[e.key];
        if (view) {
            e.preventDefault();
            this.showView(view);
        }
    }
    
    /**
     * Reset progress display
     */
    resetProgressDisplay() {
        // Use uiManager to hide progress and reset bar
        if (this.uiManager && typeof this.uiManager.hideProgress === 'function') {
            this.uiManager.hideProgress();
        }
        if (this.uiManager && typeof this.uiManager.updateProgress === 'function') {
            this.uiManager.updateProgress(0, 1, ''); // Reset bar
        }
    }
    
    /**
     * Trigger view change event
     */
    triggerViewChangeEvent(newView, oldView) {
        const event = new CustomEvent('viewChanged', {
            detail: {
                newView,
                oldView,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Go back to previous view
     */
    async goBack() {
        if (this.previousView) {
            await this.showView(this.previousView);
        }
    }
    
    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }
    
    /**
     * Get view history
     */
    getViewHistory() {
        return [...this.viewHistory];
    }
    
    /**
     * Clear view history
     */
    clearViewHistory() {
        this.viewHistory = [];
    }
}