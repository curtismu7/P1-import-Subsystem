/**
 * Browser Compatibility Detector for Import Maps
 * Version: 1.0.0
 * 
 * Provides utilities to detect browser support for modern JavaScript features,
 * particularly Import Maps, and provides fallback mechanisms.
 */

const BrowserCompatibility = {
    /**
     * Detects if the browser supports Import Maps
     * @returns {boolean} True if Import Maps are supported
     */
    supportsImportMaps() {
        return HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
    },

    /**
     * Detects if the browser supports ES Modules
     * @returns {boolean} True if ES Modules are supported
     */
    supportsESModules() {
        try {
            new Function('import("")');
            return true;
        } catch (err) {
            return false;
        }
    },

    /**
     * Detects if the browser supports HTTP/2
     * @returns {boolean} True if HTTP/2 is likely supported
     */
    supportsHTTP2() {
        // Most modern browsers supporting import maps also support HTTP/2
        // This is a simplification - actual detection would require server-side checks
        return this.supportsImportMaps();
    },

    /**
     * Determines if the browser should use Import Maps based on support and user preferences
     * @returns {boolean} True if Import Maps should be used
     */
    shouldUseImportMaps() {
        // Check for explicit user preference
        const userPreference = localStorage.getItem('useImportMaps');
        
        // If user has explicitly set a preference, respect it
        if (userPreference !== null) {
            return userPreference === 'true';
        }
        
        // Otherwise, base it on browser support
        return this.supportsImportMaps() && this.supportsESModules();
    },

    /**
     * Logs browser compatibility information
     */
    logCompatibilityInfo() {
        console.log('Browser Compatibility:');
        console.log(`- Import Maps: ${this.supportsImportMaps() ? 'Supported ✅' : 'Not Supported ❌'}`);
        console.log(`- ES Modules: ${this.supportsESModules() ? 'Supported ✅' : 'Not Supported ❌'}`);
        console.log(`- Using: ${this.shouldUseImportMaps() ? 'Import Maps' : 'Bundle'}`);
    },

    /**
     * Sets the user preference for using Import Maps
     * @param {boolean} useImportMaps Whether to use Import Maps
     */
    setImportMapsPreference(useImportMaps) {
        localStorage.setItem('useImportMaps', useImportMaps.toString());
        console.log(`Import Maps preference set to: ${useImportMaps}`);
    },

    /**
     * Redirects to the appropriate version of the application
     * @param {string} importMapsUrl URL for the Import Maps version
     * @param {string} bundleUrl URL for the Bundle version
     */
    redirectToAppropriateVersion(importMapsUrl, bundleUrl) {
        const currentUrl = window.location.href;
        const isImportMapsVersion = currentUrl.includes('import-maps');
        const shouldUseImportMaps = this.shouldUseImportMaps();
        
        // Only redirect if we're on the wrong version
        if (shouldUseImportMaps && !isImportMapsVersion) {
            window.location.href = importMapsUrl;
        } else if (!shouldUseImportMaps && isImportMapsVersion) {
            window.location.href = bundleUrl;
        }
    }
};

// Auto-initialize and log compatibility info
document.addEventListener('DOMContentLoaded', () => {
    BrowserCompatibility.logCompatibilityInfo();
});

// Export for both ES modules and global usage
if (typeof window !== 'undefined') {
    window.BrowserCompatibility = BrowserCompatibility;
}

// CommonJS export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserCompatibility;
}
