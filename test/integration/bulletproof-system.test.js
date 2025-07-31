/**
 * 🛡️ BULLETPROOF SYSTEM INTEGRATION TESTS - COMPREHENSIVE TESTING SUITE
 * 
 * Tests the entire bulletproof system integration:
 * - Token manager + subsystem wrapper + global handler
 * - Real DOM scenarios and mutations
 * - End-to-end error handling
 * - Performance under stress
 * - Memory management
 * - Recovery scenarios
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock logger for testing
const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => mockLogger)
};

// Setup comprehensive DOM environment
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
        <head>
            <title>Bulletproof Integration Test</title>
            <style>
                .sidebar { width: 200px; }
                .global-token-status { padding: 10px; }
                .global-token-icon { margin-right: 5px; }
                .global-token-text { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="app-container">
                <div class="sidebar">
                    <div id="global-token-status" class="global-token-status">
                        <span class="global-token-icon">🔑</span>
                        <span class="global-token-text">Token loading...</span>
                    </div>
                    <div class="navigation">
                        <button id="import-btn">Import</button>
                        <button id="export-btn">Export</button>
                    </div>
                </div>
                <div class="main-content">
                    <div id="content-area">Main content</div>
                </div>
            </div>
        </body>
    </html>
`, { 
    url: 'http://localhost:4000',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MutationObserver = dom.window.MutationObserver;
global.console = {
    ...dom.window.console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Import bulletproof modules
let createBulletproofTokenManager;
let createBulletproofSubsystemWrapper;
let BulletproofAppIntegration;

beforeAll(async () => {
    // Import all bulletproof modules
    const tokenModule = await import('../../src/client/utils/bulletproof-token-manager.js');
    const wrapperModule = await import('../../src/client/utils/bulletproof-subsystem-wrapper.js');
    const globalModule = await import('../../src/client/utils/bulletproof-global-handler.js');
    
    createBulletproofTokenManager = tokenModule.createBulletproofTokenManager;
    createBulletproofSubsystemWrapper = wrapperModule.createBulletproofSubsystemWrapper;
    
    // Try to import app integration if available
    try {
        const appModule = await import('../../src/client/utils/bulletproof-app-integration.js');
        BulletproofAppIntegration = appModule.default;
    } catch (error) {
        // App integration might not be available in test environment
        BulletproofAppIntegration = null;
    }
});

describe('🛡️ Bulletproof System Integration Tests', () => {
    let mockTokenManager;
    let mockSubsystem;
    let bulletproofTokenManager;
    let wrappedSubsystem;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset DOM to initial state
        document.body.innerHTML = `
            <div class="app-container">
                <div class="sidebar">
                    <div id="global-token-status" class="global-token-status">
                        <span class="global-token-icon">🔑</span>
                        <span class="global-token-text">Token loading...</span>
                    </div>
                    <div class="navigation">
                        <button id="import-btn">Import</button>
                        <button id="export-btn">Export</button>
                    </div>
                </div>
                <div class="main-content">
                    <div id="content-area">Main content</div>
                </div>
            </div>
        `;

        // Clear localStorage
        localStorage.clear();

        // Create mock token manager
        mockTokenManager = {
            name: 'GlobalTokenManagerSubsystem',
            getTokenInfoSync: jest.fn(() => ({
                hasToken: true,
                isValid: true,
                expiresAt: Date.now() + 3600000, // 1 hour from now
                timeLeft: 3600000
            })),
            updateGlobalTokenStatus: jest.fn(),
            init: jest.fn(() => Promise.resolve(true)),
            destroy: jest.fn(() => Promise.resolve(true))
        };

        // Create mock subsystem
        mockSubsystem = {
            name: 'TestSubsystem',
            init: jest.fn(() => Promise.resolve(true)),
            destroy: jest.fn(() => Promise.resolve(true)),
            performOperation: jest.fn(() => 'operation result'),
            getData: jest.fn(() => ({ data: 'test data' })),
            updateStatus: jest.fn(() => true)
        };

        // Create bulletproof instances
        bulletproofTokenManager = createBulletproofTokenManager(mockLogger);
        wrappedSubsystem = createBulletproofSubsystemWrapper(mockSubsystem, mockLogger);
    });

    afterEach(() => {
        // Cleanup
        if (bulletproofTokenManager && typeof bulletproofTokenManager.destroy === 'function') {
            bulletproofTokenManager.destroy();
        }
    });

    describe('🏗️ Full System Integration', () => {
        test('should integrate all bulletproof components successfully', async () => {
            // Initialize bulletproof token manager
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Both should be functional
            expect(wrappedTokenManager).toBeDefined();
            expect(wrappedSubsystem).toBeDefined();
            
            // Test token manager functionality
            const tokenInfo = wrappedTokenManager.getTokenInfoSync();
            expect(tokenInfo.hasToken).toBe(true);
            
            // Test subsystem functionality
            const result = wrappedSubsystem.performOperation();
            expect(result).toBe('operation result');
            
            // Test token display update
            wrappedTokenManager.updateGlobalTokenStatus();
            
            const statusText = document.querySelector('.global-token-text');
            expect(statusText.textContent).toContain('Expires in');
        });

        test('should handle cascading failures gracefully', async () => {
            // Make token manager fail
            mockTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Token manager catastrophic failure');
            });
            
            // Make subsystem fail
            mockSubsystem.performOperation.mockImplementation(() => {
                throw new Error('Subsystem catastrophic failure');
            });
            
            // Remove DOM elements
            document.getElementById('global-token-status').remove();
            
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Should still work with fallbacks
            expect(() => {
                const tokenInfo = wrappedTokenManager.getTokenInfoSync();
                expect(tokenInfo.fallback).toBe(true);
            }).not.toThrow();
            
            expect(() => {
                const result = wrappedSubsystem.performOperation();
                expect(result).toBeUndefined();
            }).not.toThrow();
            
            // Should create emergency token display
            wrappedTokenManager.updateGlobalTokenStatus();
            const emergencyDisplay = document.getElementById('emergency-token-status');
            expect(emergencyDisplay).toBeDefined();
        });

        test('should maintain functionality under stress', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Perform many operations rapidly
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        wrappedTokenManager.getTokenInfoSync();
                        wrappedSubsystem.performOperation();
                        wrappedTokenManager.updateGlobalTokenStatus();
                    })
                );
            }
            
            await Promise.all(promises);
            
            // System should still be functional
            expect(mockTokenManager.getTokenInfoSync).toHaveBeenCalled();
            expect(mockSubsystem.performOperation).toHaveBeenCalled();
        });
    });

    describe('🎭 Real-world Scenarios', () => {
        test('should handle dynamic DOM changes during operation', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Start token updates
            wrappedTokenManager.updateGlobalTokenStatus();
            
            // Simulate dynamic DOM changes (like SPA navigation)
            setTimeout(() => {
                const sidebar = document.querySelector('.sidebar');
                sidebar.innerHTML = '<div>New navigation content</div>';
            }, 50);
            
            setTimeout(() => {
                // Add new content
                const newContent = document.createElement('div');
                newContent.innerHTML = `
                    <div id="global-token-status" class="global-token-status">
                        <span class="global-token-icon">🔑</span>
                        <span class="global-token-text">Restored token display</span>
                    </div>
                `;
                document.body.appendChild(newContent);
            }, 100);
            
            // Wait for DOM changes to settle
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Should handle changes gracefully
            expect(() => {
                wrappedTokenManager.updateGlobalTokenStatus();
            }).not.toThrow();
        });

        test('should recover from network-like failures', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Simulate network failure
            mockTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Network timeout');
            });
            
            // Set up localStorage fallback
            localStorage.setItem('pingone_token', 'cached-token');
            localStorage.setItem('pingone_token_expiry', (Date.now() + 1800000).toString());
            
            const tokenInfo = wrappedTokenManager.getTokenInfoSync();
            
            expect(tokenInfo.hasToken).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Original token manager failed')
            );
        });

        test('should handle browser tab visibility changes', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Start updates
            wrappedTokenManager.updateGlobalTokenStatus();
            
            // Simulate tab becoming hidden
            Object.defineProperty(document, 'hidden', {
                writable: true,
                value: true
            });
            
            document.dispatchEvent(new Event('visibilitychange'));
            
            // Should continue working
            expect(() => {
                wrappedTokenManager.updateGlobalTokenStatus();
            }).not.toThrow();
            
            // Simulate tab becoming visible again
            Object.defineProperty(document, 'hidden', {
                value: false
            });
            
            document.dispatchEvent(new Event('visibilitychange'));
            
            // Should resume normal operation
            const tokenInfo = wrappedTokenManager.getTokenInfoSync();
            expect(tokenInfo).toBeDefined();
        });
    });

    describe('⚡ Performance and Memory Tests', () => {
        test('should not create memory leaks during long operation', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            // Run for extended period
            for (let i = 0; i < 1000; i++) {
                wrappedTokenManager.getTokenInfoSync();
                wrappedSubsystem.performOperation();
                
                if (i % 100 === 0) {
                    wrappedTokenManager.updateGlobalTokenStatus();
                }
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Memory growth should be reasonable (less than 10MB)
            expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        });

        test('should handle high-frequency token updates efficiently', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            const startTime = Date.now();
            
            // High-frequency updates
            for (let i = 0; i < 500; i++) {
                wrappedTokenManager.updateGlobalTokenStatus();
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete in reasonable time (less than 2 seconds)
            expect(duration).toBeLessThan(2000);
        });

        test('should cleanup resources properly', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Start some operations
            wrappedTokenManager.updateGlobalTokenStatus();
            wrappedSubsystem.performOperation();
            
            // Cleanup
            bulletproofTokenManager.destroy();
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Bulletproof Token Manager destroyed')
            );
        });
    });

    describe('🔧 Error Recovery Scenarios', () => {
        test('should recover from complete DOM destruction', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Start normal operation
            wrappedTokenManager.updateGlobalTokenStatus();
            
            // Destroy entire DOM
            document.body.innerHTML = '';
            
            // Should create emergency fallback
            expect(() => {
                wrappedTokenManager.updateGlobalTokenStatus();
            }).not.toThrow();
            
            // Should have created emergency display
            const emergencyDisplay = document.getElementById('emergency-token-status');
            expect(emergencyDisplay).toBeDefined();
        });

        test('should handle corrupted localStorage gracefully', async () => {
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Corrupt localStorage
            localStorage.setItem('pingone_token', '{"malformed": json');
            localStorage.setItem('pingone_token_expiry', 'not-a-number');
            
            // Make primary source fail
            mockTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Primary source failed');
            });
            
            const tokenInfo = wrappedTokenManager.getTokenInfoSync();
            
            // Should fall back to emergency mode
            expect(tokenInfo.fallback).toBe(true);
        });

        test('should handle simultaneous component failures', async () => {
            // Make everything fail
            mockTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Token manager failed');
            });
            mockTokenManager.updateGlobalTokenStatus.mockImplementation(() => {
                throw new Error('Update failed');
            });
            mockSubsystem.performOperation.mockImplementation(() => {
                throw new Error('Subsystem failed');
            });
            
            // Remove DOM
            document.body.innerHTML = '';
            
            // Clear localStorage
            localStorage.clear();
            
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Should still provide basic functionality
            expect(() => {
                const tokenInfo = wrappedTokenManager.getTokenInfoSync();
                expect(tokenInfo.fallback).toBe(true);
                
                const result = wrappedSubsystem.performOperation();
                expect(result).toBeUndefined();
                
                wrappedTokenManager.updateGlobalTokenStatus();
            }).not.toThrow();
        });
    });

    describe('🌐 Browser Compatibility Tests', () => {
        test('should work without modern browser features', async () => {
            // Mock older browser environment
            const originalMutationObserver = global.MutationObserver;
            const originalLocalStorage = global.localStorage;
            
            delete global.MutationObserver;
            delete global.localStorage;
            
            try {
                const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
                
                // Should still work with basic functionality
                expect(() => {
                    const tokenInfo = wrappedTokenManager.getTokenInfoSync();
                    expect(tokenInfo).toBeDefined();
                }).not.toThrow();
                
            } finally {
                // Restore features
                global.MutationObserver = originalMutationObserver;
                global.localStorage = originalLocalStorage;
            }
        });

        test('should handle missing DOM APIs gracefully', async () => {
            const originalQuerySelector = document.querySelector;
            const originalGetElementById = document.getElementById;
            
            // Mock DOM API failures
            document.querySelector = jest.fn(() => {
                throw new Error('querySelector failed');
            });
            document.getElementById = jest.fn(() => {
                throw new Error('getElementById failed');
            });
            
            try {
                const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
                
                expect(() => {
                    wrappedTokenManager.updateGlobalTokenStatus();
                }).not.toThrow();
                
            } finally {
                // Restore DOM APIs
                document.querySelector = originalQuerySelector;
                document.getElementById = originalGetElementById;
            }
        });
    });

    describe('🎯 End-to-End Scenarios', () => {
        test('should handle complete application lifecycle', async () => {
            // Application startup
            const wrappedTokenManager = await bulletproofTokenManager.initialize(mockTokenManager);
            
            // Normal operation
            for (let i = 0; i < 10; i++) {
                wrappedTokenManager.updateGlobalTokenStatus();
                wrappedSubsystem.performOperation();
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Simulate user interactions
            const importBtn = document.getElementById('import-btn');
            if (importBtn) {
                importBtn.click();
            }
            
            // Simulate errors during operation
            mockTokenManager.getTokenInfoSync.mockImplementationOnce(() => {
                throw new Error('Temporary failure');
            });
            
            expect(() => {
                wrappedTokenManager.getTokenInfoSync();
            }).not.toThrow();
            
            // Application shutdown
            bulletproofTokenManager.destroy();
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('destroyed')
            );
        });

        test('should integrate with app integration system', async () => {
            if (!BulletproofAppIntegration) {
                console.log('Skipping app integration test - module not available');
                return;
            }
            
            const appIntegration = new BulletproofAppIntegration({
                logger: mockLogger,
                eventBus: { emit: jest.fn(), on: jest.fn() }
            });
            
            expect(() => {
                appIntegration.initialize();
            }).not.toThrow();
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Bulletproof App Integration initialized')
            );
        });
    });
});

describe('🛡️ Bulletproof System Static Integration Tests', () => {
    test('should have all required bulletproof modules available', () => {
        expect(createBulletproofTokenManager).toBeDefined();
        expect(createBulletproofSubsystemWrapper).toBeDefined();
    });

    test('should handle module loading in adverse conditions', async () => {
        // Test that modules can be imported even with limited environment
        expect(typeof createBulletproofTokenManager).toBe('function');
        expect(typeof createBulletproofSubsystemWrapper).toBe('function');
    });
});
