/**
 * Import Maps Compatibility Layer
 * Version: 7.0.0.9
 * 
 * Provides utilities for ensuring modules work in both bundled and import maps environments
 * during the phased migration from Browserify to native ES modules with Import Maps.
 */

import { moduleConverter } from './module-converter.js';

/**
 * Utility class for handling Import Maps compatibility
 */
export class ImportMapsCompatibility {
    /**
     * Create a new ImportMapsCompatibility instance
     */
    constructor() {
        this.isUsingImportMaps = this.detectImportMapsUsage();
        this.moduleAliases = new Map();
        this.initializeAliases();
    }

    /**
     * Detects if the current page is using Import Maps
     * @returns {boolean} True if using Import Maps
     */
    detectImportMapsUsage() {
        // Check for Import Maps support in the browser
        const hasImportMapsSupport = HTMLScriptElement.supports && 
            HTMLScriptElement.supports('importmap');
        
        // Check if we're actually using import maps (look for the script tag)
        const hasImportMapTag = document.querySelector('script[type="importmap"]') !== null;
        
        // Check for a special flag that might be set by the loader
        const importMapsFlag = window.USING_IMPORT_MAPS === true;
        
        return (hasImportMapsSupport && hasImportMapTag) || importMapsFlag;
    }

    /**
     * Initialize module aliases based on the import maps configuration
     */
    initializeAliases() {
        // Try to get aliases from the import map if available
        try {
            const importMapScript = document.querySelector('script[type="importmap"]');
            if (importMapScript) {
                const importMap = JSON.parse(importMapScript.textContent);
                if (importMap && importMap.imports) {
                    Object.entries(importMap.imports).forEach(([key, value]) => {
                        this.moduleAliases.set(key, value);
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to parse import map:', error);
        }

        // Add some default aliases that match our expected structure
        if (this.moduleAliases.size === 0) {
            // Core modules
            this.moduleAliases.set('@/utils', './js/utils');
            this.moduleAliases.set('@/components', './js/components');
            this.moduleAliases.set('@/subsystems', './js/subsystems');
            this.moduleAliases.set('@/api', './js/api');
            
            // Third-party libraries
            this.moduleAliases.set('axios', './vendor/axios.min.js');
            this.moduleAliases.set('socket.io-client', './vendor/socket.io.min.js');
        }
    }

    /**
     * Resolves a module path based on the current environment
     * @param {string} modulePath - The module path to resolve
     * @returns {string} The resolved module path
     */
    resolveModulePath(modulePath) {
        // If we're using import maps, return the path as is
        if (this.isUsingImportMaps) {
            return modulePath;
        }
        
        // Otherwise, try to resolve the path using our aliases
        for (const [alias, path] of this.moduleAliases.entries()) {
            if (modulePath.startsWith(alias)) {
                return modulePath.replace(alias, path);
            }
        }
        
        return modulePath;
    }

    /**
     * Dynamically imports a module with compatibility handling
     * @param {string} modulePath - The path to the module
     * @returns {Promise<Object>} The imported module
     */
    async importModule(modulePath) {
        const resolvedPath = this.resolveModulePath(modulePath);
        
        try {
            // Try ES module import first
            const module = await import(resolvedPath);
            return module;
        } catch (error) {
            console.warn(`ES module import failed for ${resolvedPath}, trying CommonJS fallback`);
            
            // In a bundled environment, the module might be available globally
            const globalModuleName = resolvedPath.split('/').pop().replace('.js', '');
            if (window[globalModuleName]) {
                return moduleConverter.createESModuleExports(window[globalModuleName]);
            }
            
            throw new Error(`Failed to import module: ${resolvedPath}`);
        }
    }

    /**
     * Creates a hybrid module that works in both environments
     * @param {Function} esModuleFactory - Factory function for ES module version
     * @param {Function} commonJSFactory - Factory function for CommonJS version
     * @returns {Object} The appropriate module for the current environment
     */
    createHybridModule(esModuleFactory, commonJSFactory) {
        if (this.isUsingImportMaps) {
            return esModuleFactory();
        } else {
            return moduleConverter.wrapCommonJSModule(commonJSFactory);
        }
    }

    /**
     * Logs the current compatibility mode and environment details
     */
    logCompatibilityInfo() {
        console.info(`
🔄 Import Maps Compatibility Layer
--------------------------------
✅ Using Import Maps: ${this.isUsingImportMaps}
✅ ES Modules Supported: ${moduleConverter.constructor.isESModuleSupported()}
✅ Import Maps Supported: ${moduleConverter.constructor.isImportMapsSupported()}
✅ Registered Aliases: ${this.moduleAliases.size}
--------------------------------
        `);
    }
}

// Export a singleton instance
export const importMapsCompat = new ImportMapsCompatibility();

// Also export as default for CommonJS compatibility
export default importMapsCompat;
