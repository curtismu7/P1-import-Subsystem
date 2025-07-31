
/**
 * Bug Fix Loader - Initializes all critical bug fixes before main app
 * 
 * This script must load BEFORE the main application to ensure proper
 * error handling, security, and resource management are in place.
 */

(function() {
    'use strict';
    
    console.log('🔧 Initializing Critical Bug Fixes...');
    
    // Load order is critical - security and error handling first
    // Only load files that don't contain ES module exports to avoid syntax errors
    const modules = [
        'error-fix.js',
        'modules/security-utils.js',
        'modules/global-error-handler.js',
        'modules/resource-manager.js',
        'modules/safe-api.js'
    ];
    
    let loadedCount = 0;
    const totalModules = modules.length;
    
    function loadModule(modulePath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `/js/${modulePath}`;
            script.async = false; // Maintain load order
            
            script.onload = () => {
                loadedCount++;
                console.log(`✅ Loaded: ${modulePath} (${loadedCount}/${totalModules})`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`❌ Failed to load: ${modulePath}`);
                reject(new Error(`Failed to load ${modulePath}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    // Load all modules sequentially
    async function loadAllModules() {
        try {
            for (const module of modules) {
                await loadModule(module);
            }
            
            console.log('✅ All bug fix modules loaded successfully');
            
            // Dispatch event to signal bug fixes are ready
            window.dispatchEvent(new CustomEvent('bugFixesReady', {
                detail: { 
                    modulesLoaded: loadedCount,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('❌ Bug fix loading failed:', error);
            
            // Still dispatch event but with error flag
            window.dispatchEvent(new CustomEvent('bugFixesReady', {
                detail: { 
                    error: true,
                    message: error.message,
                    timestamp: Date.now()
                }
            }));
        }
    }
    
    // Start loading when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllModules);
    } else {
        loadAllModules();
    }
    
})();
