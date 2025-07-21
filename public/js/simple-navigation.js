/**
 * Simple Navigation Handler
 * 
 * A lightweight navigation system to handle view switching
 * when the subsystems are not working properly.
 */

console.log('🔧 Simple Navigation: Script loaded!');

class SimpleNavigation {
    constructor() {
        console.log('🔧 Simple Navigation: Constructor called');
        this.currentView = 'home';
        this.init();
    }
    
    init() {
        console.log('🔧 Simple Navigation: Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupNavigation());
        } else {
            this.setupNavigation();
        }
    }
    
    setupNavigation() {
        console.log('🔧 Simple Navigation: Setting up navigation listeners...');
        
        // Find all navigation elements
        const navElements = document.querySelectorAll('[data-view]');
        console.log(`🔧 Simple Navigation: Found ${navElements.length} navigation elements`);
        
        // Add click listeners
        navElements.forEach((element, index) => {
            const view = element.getAttribute('data-view');
            console.log(`🔧 Simple Navigation: Setting up listener for ${view} (element ${index})`);
            
            element.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`🔧 Simple Navigation: Clicked ${view}`);
                this.showView(view);
            });
        });
        
        console.log('🔧 Simple Navigation: Navigation setup complete');
    }
    
    showView(view) {
        console.log(`🔧 Simple Navigation: Switching from ${this.currentView} to ${view}`);
        
        // Hide all views
        const allViews = document.querySelectorAll('.view, .view-container');
        allViews.forEach(viewElement => {
            viewElement.style.display = 'none';
            viewElement.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
            console.log(`🔧 Simple Navigation: Successfully showed ${view}-view`);
        } else {
            console.error(`🔧 Simple Navigation: View element not found: ${view}-view`);
            return;
        }
        
        // Update navigation state
        this.updateNavigationState(view);
        
        // Update current view
        this.currentView = view;
        
        console.log(`🔧 Simple Navigation: Navigation to ${view} completed`);
    }
    
    // Test function to manually trigger navigation
    testNavigation() {
        console.log('🔧 Simple Navigation: Testing navigation...');
        const views = ['settings', 'import', 'export', 'home'];
        let index = 0;
        
        const testNext = () => {
            if (index < views.length) {
                console.log(`🔧 Simple Navigation: Testing view ${views[index]}`);
                this.showView(views[index]);
                index++;
                setTimeout(testNext, 2000);
            } else {
                console.log('🔧 Simple Navigation: Test completed');
            }
        };
        
        testNext();
    }
    
    updateNavigationState(view) {
        // Update active navigation items
        const navElements = document.querySelectorAll('[data-view]');
        navElements.forEach(element => {
            const elementView = element.getAttribute('data-view');
            if (elementView === view) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        });
        
        // Update page title
        const titles = {
            'home': 'Home',
            'import': 'Import Users',
            'export': 'Export Users',
            'modify': 'Modify Users',
            'delete-csv': 'Delete Users',
            'settings': 'Settings',
            'logs': 'Logs',
            'history': 'History'
        };
        
        const title = titles[view] || 'PingOne Import Tool';
        document.title = `${title} - PingOne Import Tool v6.1`;
    }
}

// Initialize simple navigation immediately
console.log('🔧 Simple Navigation: About to initialize...');

if (typeof window !== 'undefined') {
    // Try to initialize immediately
    try {
        window.simpleNavigation = new SimpleNavigation();
        console.log('🔧 Simple Navigation: Initialized and available as window.simpleNavigation');
    } catch (error) {
        console.error('🔧 Simple Navigation: Failed to initialize:', error);
    }
    
    // Also try after a delay in case DOM isn't ready
    setTimeout(() => {
        console.log('🔧 Simple Navigation: Delayed initialization attempt...');
        if (!window.simpleNavigation) {
            try {
                window.simpleNavigation = new SimpleNavigation();
                console.log('🔧 Simple Navigation: Delayed initialization successful');
            } catch (error) {
                console.error('🔧 Simple Navigation: Delayed initialization failed:', error);
            }
        } else {
            console.log('🔧 Simple Navigation: Already initialized, setting up navigation again...');
            window.simpleNavigation.setupNavigation();
        }
    }, 2000);
    
    // Add global test functions
    window.testNavigation = function(view) {
        console.log(`🔧 Global Test: Attempting to navigate to ${view}`);
        if (window.simpleNavigation) {
            window.simpleNavigation.showView(view);
        } else {
            console.error('🔧 Global Test: Simple navigation not available');
        }
    };
    
    window.testNavigationAuto = function() {
        console.log('🔧 Global Test: Starting automatic navigation test');
        if (window.simpleNavigation) {
            window.simpleNavigation.testNavigation();
        } else {
            console.error('🔧 Global Test: Simple navigation not available');
        }
    };
}