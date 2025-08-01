/**
 * Banner System Initialization
 * 
 * This file initializes the Bulletproof Token Banner System and makes it globally available.
 * It's designed to be included in the main bundle.
 */

// Import the banner system
import { BulletproofTokenBannerSystem } from '../../public/js/modules/bulletproof-token-banner-system.js';

/**
 * Initialize the banner system after a short delay to ensure other UI elements are loaded
 */
const initBannerSystem = () => {
    try {
        // Initialize the banner system
        window.bulletproofTokenBannerSystem = new BulletproofTokenBannerSystem();
        
        // Log successful initialization
        if (window.console && window.console.log) {
            console.log('✅ Bulletproof Token Banner System initialized successfully');
        }
    } catch (error) {
        // Log any initialization errors
        console.error('❌ Failed to initialize Bulletproof Token Banner System:', error);
        
        // Show a fallback error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background-color: #ffebee;
            color: #c62828;
            padding: 10px;
            border-left: 4px solid #c62828;
            margin: 10px 0;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        errorDiv.innerHTML = `
            <strong>Warning:</strong> Failed to initialize banner system. Some features may not work correctly.
            <div style="font-size: 12px; margin-top: 5px;">${error.message || 'Unknown error'}</div>
        `;
        
        // Try to insert at the top of the body
        if (document.body) {
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
    }
};

// Wait for the page to be fully loaded before initializing the banner system
if (document.readyState === 'loading') {
    // Document is still loading, wait for the DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', () => {
        // Add a small delay to ensure other UI elements are fully loaded
        setTimeout(initBannerSystem, 500);
    });
} else {
    // DOM is already loaded, but add a small delay to be safe
    setTimeout(initBannerSystem, 500);
}
