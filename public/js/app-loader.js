/**
 * PingOne Import Tool - Application Loader
 * Version: 7.0.0.9
 * 
 * This script handles the detection of browser compatibility and loads
 * either the Import Maps version or the Bundle version of the application.
 */

(function() {
    // Performance tracking
    const startTime = performance.now();
    
    // Configuration
    const config = {
        // URLs for different versions
        importMapsUrl: '/index-import-maps.html',
        bundleUrl: '/index.html',
        
        // Version information
        version: '7.0.0.9',
        buildTimestamp: Date.now(),
        
        // Feature detection settings
        forceBundle: false, // Set to true to always use bundle version
        forceImportMaps: false, // Set to true to always use import maps version
        
        // Debug mode
        debug: true
    };
    
    /**
     * Logs a message to the console with timestamp
     * @param {string} message - Message to log
     * @param {string} type - Log type (log, warn, error, info)
     */
    function log(message, type = 'log') {
        if (!config.debug) return;
        
        const timestamp = new Date().toISOString();
        const emoji = type === 'log' ? '📝' : 
                     type === 'warn' ? '⚠️' : 
                     type === 'error' ? '❌' : '🔍';
                     
        console[type](`${emoji} [${timestamp}] AppLoader: ${message}`);
    }
    
    /**
     * Detects if the browser supports Import Maps
     * @returns {boolean} True if Import Maps are supported
     */
    function supportsImportMaps() {
        return HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
    }
    
    /**
     * Detects if the browser supports ES Modules
     * @returns {boolean} True if ES Modules are supported
     */
    function supportsESModules() {
        try {
            new Function('import("")');
            return true;
        } catch (err) {
            return false;
        }
    }
    
    /**
     * Determines if the browser should use Import Maps based on support and user preferences
     * @returns {boolean} True if Import Maps should be used
     */
    function shouldUseImportMaps() {
        // Check for explicit configuration
        if (config.forceBundle) return false;
        if (config.forceImportMaps) return true;
        
        // Check for explicit user preference
        const userPreference = localStorage.getItem('useImportMaps');
        if (userPreference !== null) {
            return userPreference === 'true';
        }
        
        // Otherwise, base it on browser support
        return supportsImportMaps() && supportsESModules();
    }
    
    /**
     * Logs browser compatibility information
     */
    function logCompatibilityInfo() {
        log('Browser Compatibility:');
        log(`- Import Maps: ${supportsImportMaps() ? 'Supported ✅' : 'Not Supported ❌'}`);
        log(`- ES Modules: ${supportsESModules() ? 'Supported ✅' : 'Not Supported ❌'}`);
        log(`- Using: ${shouldUseImportMaps() ? 'Import Maps' : 'Bundle'}`);
    }
    
    /**
     * Sets the user preference for using Import Maps
     * @param {boolean} useImportMaps Whether to use Import Maps
     */
    function setImportMapsPreference(useImportMaps) {
        localStorage.setItem('useImportMaps', useImportMaps.toString());
        log(`Import Maps preference set to: ${useImportMaps}`);
    }
    
    /**
     * Redirects to the appropriate version of the application
     */
    function redirectToAppropriateVersion() {
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        const isImportMapsVersion = currentPath.includes('index-import-maps.html');
        const isBundleVersion = currentPath === '/' || currentPath.includes('index.html');
        const shouldUseImportMapsVersion = shouldUseImportMaps();
        
        // Only redirect if we're on the wrong version or at the root
        if (shouldUseImportMapsVersion && !isImportMapsVersion) {
            log('Redirecting to Import Maps version');
            window.location.href = config.importMapsUrl;
            return true;
        } else if (!shouldUseImportMapsVersion && !isBundleVersion) {
            log('Redirecting to Bundle version');
            window.location.href = config.bundleUrl;
            return true;
        }
        
        return false;
    }
    
    /**
     * Initializes the application loader
     */
    function initialize() {
        log(`Application Loader v${config.version} initializing...`, 'info');
        logCompatibilityInfo();
        
        // Check if we need to redirect
        const redirected = redirectToAppropriateVersion();
        
        if (!redirected) {
            log('Already on correct version, no redirect needed');
        }
        
        log(`Initialization completed in ${(performance.now() - startTime).toFixed(2)}ms`);
    }
    
    // Make functions available globally
    window.AppLoader = {
        setImportMapsPreference,
        supportsImportMaps,
        supportsESModules,
        shouldUseImportMaps,
        logCompatibilityInfo,
        config
    };
    
    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
