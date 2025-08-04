/**
 * Module Converter Utility
 * Version: 7.0.0.9
 * 
 * Provides utilities for converting between CommonJS and ES Module formats
 * and handling hybrid module loading during the Import Maps migration.
 */

/**
 * Utility for handling module format conversion and compatibility
 */
export class ModuleConverter {
    /**
     * Create a new ModuleConverter instance
     */
    constructor() {
        this.isESModule = true;
        this.conversionCache = new Map();
    }

    /**
     * Converts a CommonJS module exports object to ES module exports
     * @param {Object} moduleExports - The CommonJS module.exports object
     * @returns {Object} The same object, but tagged for ES module usage
     */
    convertToESModule(moduleExports) {
        // If already processed or null, return as is
        if (!moduleExports || moduleExports.__esModule) {
            return moduleExports;
        }

        // Tag the object as an ES module
        Object.defineProperty(moduleExports, '__esModule', {
            value: true,
            enumerable: false,
            configurable: false
        });

        // Cache the conversion
        this.conversionCache.set(moduleExports, moduleExports);
        
        return moduleExports;
    }

    /**
     * Handles a CommonJS require call in an ES module context
     * @param {Object} module - The module object
     * @returns {Object} The default export or the full module
     */
    handleRequire(module) {
        // If the module is null or undefined, return it as is
        if (!module) {
            return module;
        }

        // If it's already an ES module, return its default export if available
        if (module.__esModule) {
            return module.default || module;
        }

        // Otherwise, return the module as is
        return module;
    }

    /**
     * Creates an ES module compatible export from a CommonJS module
     * @param {Object} exports - The exports object to convert
     * @returns {Object} ES module compatible exports
     */
    createESModuleExports(exports) {
        const esExports = { ...exports };
        
        // Add default export if not present
        if (!esExports.default) {
            Object.defineProperty(esExports, 'default', {
                value: exports,
                enumerable: false,
                configurable: true
            });
        }
        
        // Mark as ES module
        Object.defineProperty(esExports, '__esModule', {
            value: true,
            enumerable: false,
            configurable: false
        });
        
        return esExports;
    }

    /**
     * Wraps a CommonJS module for ES module compatibility
     * @param {Function} factory - The CommonJS module factory function
     * @returns {Object} ES module compatible exports
     */
    wrapCommonJSModule(factory) {
        // Create a mock CommonJS environment
        const module = { exports: {} };
        const exports = module.exports;
        
        // Execute the factory with CommonJS context
        factory(module, exports);
        
        // Convert to ES module exports
        return this.createESModuleExports(module.exports);
    }

    /**
     * Dynamically imports a module with fallback to CommonJS if needed
     * @param {string} modulePath - The path to the module
     * @returns {Promise<Object>} The imported module
     */
    async importModule(modulePath) {
        try {
            // Try ES module import first
            return await import(modulePath);
        } catch (error) {
            console.warn(`ES module import failed for ${modulePath}, trying CommonJS fallback`);
            
            // Fallback to CommonJS-style loading
            // In a real implementation, this would use a dynamic loader
            // This is just a placeholder for the concept
            throw new Error(`CommonJS fallback not implemented for ${modulePath}`);
        }
    }

    /**
     * Checks if the current environment supports ES modules
     * @returns {boolean} True if ES modules are supported
     */
    static isESModuleSupported() {
        try {
            new Function('import("")');
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Checks if the current environment supports Import Maps
     * @returns {boolean} True if Import Maps are supported
     */
    static isImportMapsSupported() {
        return HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
    }
}

// Export a singleton instance
export const moduleConverter = new ModuleConverter();

// Also export as default for CommonJS compatibility
export default moduleConverter;
