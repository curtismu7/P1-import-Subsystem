/**
 * Import Maps Loader
 * 
 * This script provides progressive enhancement for module loading:
 * - Uses import maps for modern browsers (preferred)
 * - Falls back to bundle for older browsers only when necessary
 * - Provides configuration options for forcing a specific mode
 * - Uses centralized version from window.APP_VERSION
 */

(function() {
    'use strict';
    
    // Configuration options (can be overridden via localStorage)
    const config = {
        // Set to 'import-maps', 'bundle', or 'auto'
        // Default is now 'import-maps' to prioritize modules over bundle
        preferredMode: localStorage.getItem('preferredLoadingMode') || 'import-maps',
        // Debug mode for additional console output
        debug: localStorage.getItem('debugModuleLoading') === 'true',
        // Bundle path (will be replaced with latest during build)
        bundlePath: '/js/bundle-latest.js',
        // Import maps path
        importMapsPath: '/import-maps.json',
        // Main module entry point
        moduleEntryPoint: '/src/client/app-module.js',
        // Version from centralized source
        version: window.APP_VERSION || '7.0.0.21'
    };
    
    /**
     * Detect if browser supports import maps
     * @returns {boolean} True if import maps are supported
     */
    function supportsImportMaps() {
        return typeof HTMLScriptElement !== 'undefined' && 
               HTMLScriptElement.supports && 
               HTMLScriptElement.supports('importmap');
    }
    
    /**
     * Get the bundle path from the manifest
     * @returns {Promise<string>} Path to the latest bundle
     */
    async function getLatestBundlePath() {
        try {
            const response = await fetch('/js/bundle-manifest.json');
            if (!response.ok) throw new Error('Failed to fetch bundle manifest');
            
            const manifest = await response.json();
            return `/js/${manifest.bundleFile}`;
        } catch (error) {
            console.error('Error fetching bundle manifest:', error);
            return config.bundlePath;
        }
    }
    
    /**
     * Log debug information if debug mode is enabled
     * @param {string} message - Debug message
     * @param {any} data - Optional data to log
     */
    function debugLog(message, data) {
        if (config.debug) {
            console.log(`🔍 [Import Maps Loader] ${message}`, data || '');
        }
    }
    
    /**
     * Determine which loading mode to use
     * @returns {string} 'import-maps' or 'bundle'
     */
    function determineLoadingMode() {
        // Check URL parameters first (highest priority)
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        
        if (modeParam === 'import-maps') {
            debugLog('Using import maps (URL parameter)');
            return 'import-maps';
        }
        
        if (modeParam === 'bundle') {
            debugLog('Using bundle (URL parameter)');
            return 'bundle';
        }
        
        // If user has explicitly set a mode via localStorage, respect that choice
        if (config.preferredMode === 'import-maps') {
            debugLog('Using import maps (user preference)');
            return 'import-maps';
        }
        
        if (config.preferredMode === 'bundle') {
            debugLog('Using bundle (user preference)');
            return 'bundle';
        }
        
        // Auto-detect based on browser support
        if (supportsImportMaps()) {
            debugLog('Using import maps (auto-detected support)');
            return 'import-maps';
        } else {
            debugLog('Using bundle (import maps not supported)');
            return 'bundle';
        }
    }
    
    /**
     * Load the application using import maps
     */
    function loadWithImportMaps() {
        debugLog('Loading with import maps');
        
        // Add import maps script
        const importMapScript = document.createElement('script');
        importMapScript.type = 'importmap';
        importMapScript.src = config.importMapsPath;
        document.head.appendChild(importMapScript);
        
        // Add module entry point
        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.src = config.moduleEntryPoint;
        document.head.appendChild(moduleScript);
        
        // Set a flag that we're using import maps
        window.PINGONE_IMPORT_USING_IMPORT_MAPS = true;
    }
    
    /**
     * Load the application using the bundle
     */
    async function loadWithBundle() {
        debugLog('Loading with bundle');
        
        // Get the latest bundle path from manifest
        const bundlePath = await getLatestBundlePath();
        debugLog('Using bundle:', bundlePath);
        
        // Add bundle script
        const bundleScript = document.createElement('script');
        bundleScript.src = bundlePath;
        document.head.appendChild(bundleScript);
        
        // Set a flag that we're using bundle
        window.PINGONE_IMPORT_USING_IMPORT_MAPS = false;
    }
    
    /**
     * Initialize the loader
     */
    function init() {
        debugLog('Initializing module loader', {
            preferredMode: config.preferredMode,
            supportsImportMaps: supportsImportMaps()
        });
        
        const loadingMode = determineLoadingMode();
        
        if (loadingMode === 'import-maps') {
            loadWithImportMaps();
        } else {
            loadWithBundle();
        }
        
        // Expose API for manual control
        window.PingOneImportLoader = {
            setPreferredMode: function(mode) {
                if (['import-maps', 'bundle', 'auto'].includes(mode)) {
                    localStorage.setItem('preferredLoadingMode', mode);
                    debugLog('Preferred mode set to:', mode);
                    return true;
                }
                return false;
            },
            toggleDebug: function() {
                const newValue = !config.debug;
                localStorage.setItem('debugModuleLoading', newValue);
                config.debug = newValue;
                console.log(`🔍 [Import Maps Loader] Debug mode ${newValue ? 'enabled' : 'disabled'}`);
                return newValue;
            },
            getStatus: function() {
                return {
                    currentMode: window.PINGONE_IMPORT_USING_IMPORT_MAPS ? 'import-maps' : 'bundle',
                    preferredMode: config.preferredMode,
                    supportsImportMaps: supportsImportMaps(),
                    debug: config.debug
                };
            }
        };
    }
    
    // Start the loader
    init();
})();
