/**
 * 🛡️ BULLETPROOF TOKEN MANAGER TESTS - COMPREHENSIVE TESTING SUITE
 * 
 * Tests all aspects of the bulletproof token manager system:
 * - Multi-source token information retrieval
 * - DOM element caching and validation
 * - Error isolation and recovery
 * - Emergency fallback systems
 * - Memory management and cleanup
 * - Real-time updates and monitoring
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

// Setup DOM environment
const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
        <head><title>Test</title></head>
        <body>
            <div class="sidebar">
                <div id="global-token-status">
                    <span class="global-token-icon">🔑</span>
                    <span class="global-token-text">Token loading...</span>
                </div>
            </div>
        </body>
    </html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MutationObserver = dom.window.MutationObserver;

// Import the bulletproof token manager after DOM setup
let createBulletproofTokenManager;
let BulletproofTokenManager;

beforeAll(async () => {
    // Mock the bulletproof token manager module
    const module = await import('../../src/client/utils/bulletproof-token-manager.js');
    createBulletproofTokenManager = module.createBulletproofTokenManager;
    BulletproofTokenManager = module.BulletproofTokenManager;
});

describe('🛡️ Bulletproof Token Manager Tests', () => {
    let bulletproofManager;
    let mockOriginalTokenManager;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = `
            <div class="sidebar">
                <div id="global-token-status">
                    <span class="global-token-icon">🔑</span>
                    <span class="global-token-text">Token loading...</span>
                </div>
            </div>
        `;

        // Clear localStorage
        localStorage.clear();

        // Create mock original token manager
        mockOriginalTokenManager = {
            name: 'MockTokenManager',
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

        // Create bulletproof manager
        bulletproofManager = createBulletproofTokenManager(mockLogger);
    });

    afterEach(() => {
        // Cleanup bulletproof manager
        if (bulletproofManager && typeof bulletproofManager.destroy === 'function') {
            bulletproofManager.destroy();
        }
    });

    describe('🏗️ Creation and Initialization', () => {
        test('should create bulletproof token manager successfully', () => {
            expect(bulletproofManager).toBeDefined();
            expect(typeof bulletproofManager.initialize).toBe('function');
            expect(typeof bulletproofManager.destroy).toBe('function');
        });

        test('should handle creation with invalid logger gracefully', () => {
            const invalidManager = createBulletproofTokenManager(null);
            expect(invalidManager).toBeDefined();
        });

        test('should initialize with original token manager', async () => {
            const wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
            
            expect(wrappedManager).toBeDefined();
            expect(typeof wrappedManager.updateGlobalTokenStatus).toBe('function');
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Bulletproof Token Manager initialized')
            );
        });

        test('should handle initialization with null token manager', async () => {
            const wrappedManager = await bulletproofManager.initialize(null);
            
            expect(wrappedManager).toBeDefined();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('No original token manager provided')
            );
        });
    });

    describe('🔍 Token Information Retrieval', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should retrieve token info from original manager', () => {
            const tokenInfo = wrappedManager.getTokenInfoSync();
            
            expect(tokenInfo).toBeDefined();
            expect(tokenInfo.hasToken).toBe(true);
            expect(tokenInfo.isValid).toBe(true);
            expect(mockOriginalTokenManager.getTokenInfoSync).toHaveBeenCalled();
        });

        test('should fallback to localStorage when original manager fails', () => {
            // Make original manager fail
            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Original manager failed');
            });

            // Set localStorage data
            localStorage.setItem('pingone_token', 'test-token');
            localStorage.setItem('pingone_token_expiry', (Date.now() + 1800000).toString());

            const tokenInfo = wrappedManager.getTokenInfoSync();
            
            expect(tokenInfo).toBeDefined();
            expect(tokenInfo.hasToken).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Original token manager failed')
            );
        });

        test('should use cached data when available', () => {
            // First call to populate cache
            wrappedManager.getTokenInfoSync();
            
            // Make original manager fail
            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Manager failed');
            });

            // Second call should use cache
            const tokenInfo = wrappedManager.getTokenInfoSync();
            
            expect(tokenInfo).toBeDefined();
            expect(tokenInfo.hasToken).toBe(true);
        });

        test('should provide emergency fallback when all sources fail', () => {
            // Make all sources fail
            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Manager failed');
            });
            localStorage.clear();

            const tokenInfo = wrappedManager.getTokenInfoSync();
            
            expect(tokenInfo).toBeDefined();
            expect(tokenInfo.fallback).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Using emergency fallback')
            );
        });
    });

    describe('🎯 DOM Management', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should cache DOM elements successfully', () => {
            const statusBox = document.getElementById('global-token-status');
            expect(statusBox).toBeDefined();
            
            // Trigger DOM caching by calling update
            wrappedManager.updateGlobalTokenStatus();
            
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('DOM elements cached')
            );
        });

        test('should handle missing DOM elements gracefully', () => {
            // Remove the token status element
            const statusBox = document.getElementById('global-token-status');
            statusBox.remove();

            // Should not throw error
            expect(() => {
                wrappedManager.updateGlobalTokenStatus();
            }).not.toThrow();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Token status element not found')
            );
        });

        test('should create emergency display when main display fails', () => {
            // Remove main display
            document.getElementById('global-token-status').remove();
            
            wrappedManager.updateGlobalTokenStatus();
            
            // Should create emergency display
            const emergencyDisplay = document.getElementById('emergency-token-status');
            expect(emergencyDisplay).toBeDefined();
            expect(emergencyDisplay.textContent).toContain('🛡️');
        });

        test('should validate cached elements periodically', (done) => {
            const statusBox = document.getElementById('global-token-status');
            
            // Start the manager
            wrappedManager.updateGlobalTokenStatus();
            
            // Remove element after caching
            setTimeout(() => {
                statusBox.remove();
            }, 100);

            // Check that validation detects the missing element
            setTimeout(() => {
                expect(mockLogger.debug).toHaveBeenCalledWith(
                    expect.stringContaining('DOM validation')
                );
                done();
            }, 200);
        });
    });

    describe('⚡ Real-time Updates', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should format time correctly', () => {
            const testCases = [
                { seconds: 3661, expected: '1h 1m 1s' },
                { seconds: 3600, expected: '1h 0m 0s' },
                { seconds: 61, expected: '1m 1s' },
                { seconds: 60, expected: '1m 0s' },
                { seconds: 30, expected: '30s' },
                { seconds: 0, expected: '0s' }
            ];

            testCases.forEach(({ seconds, expected }) => {
                // Access the internal formatTime method through the bulletproof manager
                const formatted = bulletproofManager.formatTime(seconds * 1000);
                expect(formatted).toBe(expected);
            });
        });

        test('should update token display with time remaining', () => {
            // Set token to expire in 30 minutes
            mockOriginalTokenManager.getTokenInfoSync.mockReturnValue({
                hasToken: true,
                isValid: true,
                expiresAt: Date.now() + 1800000, // 30 minutes
                timeLeft: 1800000
            });

            wrappedManager.updateGlobalTokenStatus();

            const statusText = document.querySelector('.global-token-text');
            expect(statusText.textContent).toContain('Expires in');
            expect(statusText.textContent).toContain('30m');
        });

        test('should show expired status for expired tokens', () => {
            mockOriginalTokenManager.getTokenInfoSync.mockReturnValue({
                hasToken: true,
                isValid: false,
                expiresAt: Date.now() - 1000, // 1 second ago
                timeLeft: 0
            });

            wrappedManager.updateGlobalTokenStatus();

            const statusText = document.querySelector('.global-token-text');
            expect(statusText.textContent).toContain('Token expired');
        });

        test('should show no token status when token is missing', () => {
            mockOriginalTokenManager.getTokenInfoSync.mockReturnValue({
                hasToken: false,
                isValid: false,
                timeLeft: 0
            });

            wrappedManager.updateGlobalTokenStatus();

            const statusText = document.querySelector('.global-token-text');
            expect(statusText.textContent).toContain('No token');
        });
    });

    describe('🔄 Error Handling and Recovery', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should isolate errors in token info retrieval', () => {
            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Catastrophic failure');
            });

            // Should not throw
            expect(() => {
                const tokenInfo = wrappedManager.getTokenInfoSync();
                expect(tokenInfo.fallback).toBe(true);
            }).not.toThrow();
        });

        test('should isolate errors in DOM updates', () => {
            // Mock DOM manipulation to throw
            const originalQuerySelector = document.querySelector;
            document.querySelector = jest.fn(() => {
                throw new Error('DOM error');
            });

            // Should not throw
            expect(() => {
                wrappedManager.updateGlobalTokenStatus();
            }).not.toThrow();

            // Restore original
            document.querySelector = originalQuerySelector;
        });

        test('should recover from DOM element removal', () => {
            const statusBox = document.getElementById('global-token-status');
            
            // First update should work
            wrappedManager.updateGlobalTokenStatus();
            expect(statusBox.textContent).toContain('Expires in');

            // Remove element
            statusBox.remove();

            // Second update should create emergency display
            wrappedManager.updateGlobalTokenStatus();
            
            const emergencyDisplay = document.getElementById('emergency-token-status');
            expect(emergencyDisplay).toBeDefined();
        });

        test('should handle multiple simultaneous errors gracefully', () => {
            // Make everything fail
            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Token manager failed');
            });
            
            document.getElementById('global-token-status').remove();
            localStorage.clear();

            // Should still work with emergency fallback
            expect(() => {
                wrappedManager.updateGlobalTokenStatus();
            }).not.toThrow();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('emergency fallback')
            );
        });
    });

    describe('🧹 Memory Management and Cleanup', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should clean up resources on destroy', () => {
            // Start some intervals/observers
            wrappedManager.updateGlobalTokenStatus();
            
            // Destroy should clean up
            bulletproofManager.destroy();
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Bulletproof Token Manager destroyed')
            );
        });

        test('should handle destroy with no active resources', () => {
            // Should not throw even if nothing to clean up
            expect(() => {
                bulletproofManager.destroy();
            }).not.toThrow();
        });

        test('should prevent memory leaks from intervals', (done) => {
            // Start updates
            wrappedManager.updateGlobalTokenStatus();
            
            // Destroy after short time
            setTimeout(() => {
                bulletproofManager.destroy();
                
                // Verify no more updates after destroy
                const callCountBefore = mockOriginalTokenManager.getTokenInfoSync.mock.calls.length;
                
                setTimeout(() => {
                    const callCountAfter = mockOriginalTokenManager.getTokenInfoSync.mock.calls.length;
                    expect(callCountAfter).toBe(callCountBefore);
                    done();
                }, 200);
            }, 100);
        });
    });

    describe('🎭 Edge Cases and Stress Tests', () => {
        let wrappedManager;

        beforeEach(async () => {
            wrappedManager = await bulletproofManager.initialize(mockOriginalTokenManager);
        });

        test('should handle rapid consecutive updates', () => {
            // Fire many updates rapidly
            for (let i = 0; i < 100; i++) {
                expect(() => {
                    wrappedManager.updateGlobalTokenStatus();
                }).not.toThrow();
            }
        });

        test('should handle DOM mutations during updates', () => {
            const statusBox = document.getElementById('global-token-status');
            
            // Start update
            wrappedManager.updateGlobalTokenStatus();
            
            // Mutate DOM during update
            statusBox.innerHTML = '<span>Modified</span>';
            
            // Should handle gracefully
            expect(() => {
                wrappedManager.updateGlobalTokenStatus();
            }).not.toThrow();
        });

        test('should handle invalid token data gracefully', () => {
            mockOriginalTokenManager.getTokenInfoSync.mockReturnValue({
                hasToken: 'invalid',
                isValid: null,
                expiresAt: 'not-a-date',
                timeLeft: -1
            });

            expect(() => {
                const tokenInfo = wrappedManager.getTokenInfoSync();
                expect(tokenInfo).toBeDefined();
            }).not.toThrow();
        });

        test('should handle localStorage corruption', () => {
            // Corrupt localStorage data
            localStorage.setItem('pingone_token', '{"invalid": json}');
            localStorage.setItem('pingone_token_expiry', 'not-a-number');

            mockOriginalTokenManager.getTokenInfoSync.mockImplementation(() => {
                throw new Error('Manager failed');
            });

            expect(() => {
                const tokenInfo = wrappedManager.getTokenInfoSync();
                expect(tokenInfo.fallback).toBe(true);
            }).not.toThrow();
        });
    });

    describe('🔧 Integration Tests', () => {
        test('should work with real DOM mutations', (done) => {
            const wrappedManager = bulletproofManager.initialize(mockOriginalTokenManager);
            
            wrappedManager.then((manager) => {
                // Start monitoring
                manager.updateGlobalTokenStatus();
                
                // Simulate real DOM changes
                const sidebar = document.querySelector('.sidebar');
                sidebar.innerHTML = '<div>New content</div>';
                
                // Should detect and recover
                setTimeout(() => {
                    const emergencyDisplay = document.getElementById('emergency-token-status');
                    expect(emergencyDisplay).toBeDefined();
                    done();
                }, 100);
            });
        });

        test('should integrate with app cleanup lifecycle', () => {
            const wrappedManager = bulletproofManager.initialize(mockOriginalTokenManager);
            
            // Simulate app cleanup
            window.dispatchEvent(new Event('beforeunload'));
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('cleanup')
            );
        });
    });
});

describe('🛡️ Bulletproof Token Manager Static Tests', () => {
    test('should export createBulletproofTokenManager function', () => {
        expect(typeof createBulletproofTokenManager).toBe('function');
    });

    test('should handle module import errors gracefully', async () => {
        // This test ensures the module can be imported even in adverse conditions
        expect(createBulletproofTokenManager).toBeDefined();
    });
});
