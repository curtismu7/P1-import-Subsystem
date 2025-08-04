
/**
 * Bug Fix Status Checker
 * 
 * Provides runtime status and debugging information about loaded bug fixes
 */

class BugFixStatus {
    constructor() {
        this.status = {
            loaded: false,
            modules: {},
            errors: [],
            startTime: Date.now()
        };
        
        this.setupStatusTracking();
    }
    
    setupStatusTracking() {
        window.addEventListener('bugFixesReady', (event) => {
            this.status.loaded = true;
            this.status.loadTime = Date.now() - this.status.startTime;
            
            if (event.detail.error) {
                this.status.errors.push(event.detail.message);
                console.warn('⚠️ Bug fixes loaded with errors:', event.detail.message);
            } else {
                console.log(`✅ Bug fixes ready in ${this.status.loadTime}ms`);
            }
            
            this.updateModuleStatus();
        });
    }
    
    updateModuleStatus() {
        this.status.modules = {
            globalErrorHandler: typeof window.globalErrorHandler !== 'undefined',
            resourceManager: typeof window.resourceManager !== 'undefined',
            safeAPI: typeof window.SafeAPI !== 'undefined',
            securityUtils: typeof window.SecurityUtils !== 'undefined'
        };
    }
    
    getStatus() {
        this.updateModuleStatus();
        return {
            ...this.status,
            timestamp: new Date().toISOString()
        };
    }
    
    printStatus() {
        const status = this.getStatus();
        console.group('🔧 Bug Fix Status');
        console.log('Loaded:', status.loaded);
        console.log('Load Time:', status.loadTime + 'ms');
        console.log('Modules:', status.modules);
        if (status.errors.length > 0) {
            console.log('Errors:', status.errors);
        }
        console.groupEnd();
        return status;
    }
}

// Make available globally for debugging
window.bugFixStatus = new BugFixStatus();

// Add to window for easy access in console
window.checkBugFixes = () => window.bugFixStatus.printStatus();
