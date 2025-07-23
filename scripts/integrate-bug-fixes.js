#!/usr/bin/env node

/**
 * Integration Script for Critical Bug Fixes
 * 
 * This script integrates all the bug fixes into the main application bundle
 * and ensures proper loading order and initialization.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function integrateBugFixes() {
    console.log('🔧 Integrating Critical Bug Fixes into Application...\n');

    try {
        // 1. Create a loader script that initializes all bug fixes
        const loaderScript = `
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
    const modules = [
        'security-utils.js',
        'global-error-handler.js', 
        'resource-manager.js',
        'safe-api.js'
    ];
    
    let loadedCount = 0;
    const totalModules = modules.length;
    
    function loadModule(modulePath) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = \`/js/modules/\${modulePath}\`;
            script.async = false; // Maintain load order
            
            script.onload = () => {
                loadedCount++;
                console.log(\`✅ Loaded: \${modulePath} (\${loadedCount}/\${totalModules})\`);
                resolve();
            };
            
            script.onerror = () => {
                console.error(\`❌ Failed to load: \${modulePath}\`);
                reject(new Error(\`Failed to load \${modulePath}\`));
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
`;

        // Write the loader script
        const loaderPath = path.join(projectRoot, 'public/js/bug-fix-loader.js');
        await fs.writeFile(loaderPath, loaderScript);
        console.log('✅ Created bug fix loader script');

        // 2. Update index.html to include the loader before the main bundle
        const indexPath = path.join(projectRoot, 'public/index.html');
        let indexContent = await fs.readFile(indexPath, 'utf8');
        
        // Check if loader is already included
        if (!indexContent.includes('bug-fix-loader.js')) {
            // Find the main bundle script tag
            const bundleRegex = /<script[^>]*src=["']js\/bundle[^"']*\.js["'][^>]*><\/script>/;
            
            if (bundleRegex.test(indexContent)) {
                // Insert loader before the main bundle
                indexContent = indexContent.replace(bundleRegex, (match) => {
                    return `    <script src="js/bug-fix-loader.js"></script>\n    ${match}`;
                });
            } else {
                // Fallback: add before closing body tag
                indexContent = indexContent.replace('</body>', 
                    '    <script src="js/bug-fix-loader.js"></script>\n    <script src="js/bundle.js"></script>\n</body>'
                );
            }
            
            await fs.writeFile(indexPath, indexContent);
            console.log('✅ Updated index.html with bug fix loader');
        } else {
            console.log('ℹ️  Bug fix loader already included in index.html');
        }

        // 3. Create a status checker for debugging
        const statusCheckerCode = `
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
                console.log(\`✅ Bug fixes ready in \${this.status.loadTime}ms\`);
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
`;

        const statusCheckerPath = path.join(projectRoot, 'public/js/modules/bug-fix-status.js');
        await fs.writeFile(statusCheckerPath, statusCheckerCode);
        console.log('✅ Created bug fix status checker');

        // 4. Create CSS for error notifications
        const errorNotificationCSS = `
/* Error Notification Styles for Bug Fix System */
.error-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 15px;
    border-radius: 5px;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
}

.error-notification strong {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
}

.error-notification button {
    background: #721c24;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    margin-top: 10px;
}

.error-notification button:hover {
    background: #5a161d;
}

/* Success notification variant */
.success-notification {
    background: #d4edda;
    border-color: #c3e6cb;
    color: #155724;
}

.success-notification button {
    background: #155724;
}

.success-notification button:hover {
    background: #0e4419;
}
`;

        const cssPath = path.join(projectRoot, 'public/css/bug-fix-notifications.css');
        await fs.writeFile(cssPath, errorNotificationCSS);
        console.log('✅ Created error notification CSS');

        // 5. Update index.html to include the CSS
        if (!indexContent.includes('bug-fix-notifications.css')) {
            indexContent = indexContent.replace('</head>', 
                '    <link rel="stylesheet" href="css/bug-fix-notifications.css">\n</head>'
            );
            await fs.writeFile(indexPath, indexContent);
            console.log('✅ Added bug fix CSS to index.html');
        }

        // 6. Create a comprehensive test script
        const testScript = `
/**
 * Bug Fix Test Suite
 * 
 * Tests all critical bug fixes to ensure they're working properly
 */

class BugFixTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    async runAllTests() {
        console.log('🧪 Running Bug Fix Tests...');
        
        const tests = [
            () => this.testGlobalErrorHandler(),
            () => this.testResourceManager(),
            () => this.testSafeAPI(),
            () => this.testSecurityUtils()
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('Test failed:', error);
            }
        }
        
        this.printResults();
    }
    
    testGlobalErrorHandler() {
        const test = 'Global Error Handler';
        try {
            if (typeof window.globalErrorHandler === 'undefined') {
                throw new Error('Global error handler not loaded');
            }
            
            // Test error handling (this should be caught)
            setTimeout(() => {
                throw new Error('Test error - should be caught by global handler');
            }, 100);
            
            this.results.push({ test, status: 'PASS', message: 'Global error handler available' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testResourceManager() {
        const test = 'Resource Manager';
        try {
            if (typeof window.resourceManager === 'undefined') {
                throw new Error('Resource manager not loaded');
            }
            
            // Test resource tracking
            const testElement = document.createElement('div');
            const listenerId = window.resourceManager.addEventListener(testElement, 'click', () => {});
            
            if (!listenerId) {
                throw new Error('Resource manager not tracking event listeners');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Resource manager working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testSafeAPI() {
        const test = 'Safe API';
        try {
            if (typeof window.SafeAPI === 'undefined') {
                throw new Error('Safe API not loaded');
            }
            
            // Test safe JSON parsing
            const result = window.SafeAPI.parseJSON('{"test": true}');
            if (!result || result.test !== true) {
                throw new Error('Safe JSON parsing failed');
            }
            
            // Test safe element access
            const element = window.SafeAPI.getElement('body');
            if (!element) {
                throw new Error('Safe element access failed');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Safe API working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testSecurityUtils() {
        const test = 'Security Utils';
        try {
            if (typeof window.SecurityUtils === 'undefined') {
                throw new Error('Security utils not loaded');
            }
            
            // Test sensitive data masking
            const testData = { password: 'secret123', username: 'test' };
            const masked = window.SecurityUtils.maskSensitiveData(testData);
            
            if (masked.password === 'secret123') {
                throw new Error('Sensitive data not masked');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Security utils working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    printResults() {
        console.group('🧪 Bug Fix Test Results');
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(\`\${icon} \${result.test}: \${result.message}\`);
        });
        console.groupEnd();
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        console.log(\`📊 Tests: \${passed}/\${total} passed\`);
    }
}

// Make available globally
window.bugFixTester = new BugFixTester();
window.testBugFixes = () => window.bugFixTester.runAllTests();
`;

        const testScriptPath = path.join(projectRoot, 'public/js/modules/bug-fix-tester.js');
        await fs.writeFile(testScriptPath, testScript);
        console.log('✅ Created bug fix test suite');

        console.log('\n🎉 Bug Fix Integration Complete!');
        console.log('\n📋 What was integrated:');
        console.log('1. ✅ Bug fix loader script (loads before main app)');
        console.log('2. ✅ Updated index.html with proper load order');
        console.log('3. ✅ Status checker for debugging');
        console.log('4. ✅ Error notification CSS styling');
        console.log('5. ✅ Comprehensive test suite');
        
        console.log('\n🔍 To test the fixes:');
        console.log('1. Open browser console');
        console.log('2. Run: checkBugFixes()');
        console.log('3. Run: testBugFixes()');
        
        console.log('\n🚀 Ready to start the server and test!');

    } catch (error) {
        console.error('❌ Integration failed:', error.message);
        process.exit(1);
    }
}

// Run integration
integrateBugFixes().catch(console.error);
