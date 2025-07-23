/**
 * Utility Loader
 * 
 * Initializes and exposes debug-friendly utilities globally
 * Must be loaded before main application code
 */

// Import utilities
import { CentralizedLogger } from './centralized-logger.js';
import { SafeDOM } from './safe-dom.js';
import { ErrorHandler } from './error-handler.js';
import { API_CONFIG, UI_CONFIG, MESSAGES, BUSINESS_CONFIG } from './config-constants.js';

// Initialize utilities
const logger = new CentralizedLogger();
const safeDOM = new SafeDOM(logger);
const errorHandler = new ErrorHandler(logger);

// Expose utilities globally
if (typeof window !== 'undefined') {
    window.logger = logger;
    window.safeDOM = safeDOM;
    window.errorHandler = errorHandler;
    
    // Expose configuration constants
    window.API_CONFIG = API_CONFIG;
    window.UI_CONFIG = UI_CONFIG;
    window.MESSAGES = MESSAGES;
    window.BUSINESS_CONFIG = BUSINESS_CONFIG;
    
    // Initialize logger
    logger.info('Debug utilities loaded', {
        utilities: ['CentralizedLogger', 'SafeDOM', 'ErrorHandler', 'ConfigConstants'],
        timestamp: new Date().toISOString()
    });
}

// Export for module systems
export {
    logger,
    safeDOM,
    errorHandler,
    API_CONFIG,
    UI_CONFIG,
    MESSAGES,
    BUSINESS_CONFIG
};
