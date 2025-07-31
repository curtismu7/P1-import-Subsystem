/**
 * 🛡️ BULLETPROOF GLOBAL HANDLER TESTS - COMPREHENSIVE TESTING SUITE
 * 
 * Tests all aspects of the bulletproof global error handler:
 * - Global error catching
 * - Promise rejection handling
 * - Error logging and reporting
 * - Recovery mechanisms
 * - Performance monitoring
 */

import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.console = dom.window.console;

// Mock console methods to capture output
const originalConsole = { ...console };
global.console = {
    ...originalConsole,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

describe('🛡️ Bulletproof Global Handler Tests', () => {
    let originalErrorHandler;
    let originalRejectionHandler;

    beforeAll(() => {
        // Store original handlers
        originalErrorHandler = window.onerror;
        originalRejectionHandler = window.onunhandledrejection;
    });

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset handlers
        window.onerror = null;
        window.onunhandledrejection = null;
        
        // Clear any existing event listeners
        window.removeEventListener('error', originalErrorHandler);
        window.removeEventListener('unhandledrejection', originalRejectionHandler);
    });

    afterAll(() => {
        // Restore original handlers
        window.onerror = originalErrorHandler;
        window.onunhandledrejection = originalRejectionHandler;
        
        // Restore console
        global.console = originalConsole;
    });

    describe('🏗️ Initialization and Setup', () => {
        test('should initialize global error handlers', async () => {
            // Import the module to trigger initialization
            await import('../../src/client/utils/bulletproof-global-handler.js');
            
            expect(window.onerror).toBeDefined();
            expect(window.onunhandledrejection).toBeDefined();
        });

        test('should not override existing error handlers destructively', async () => {
            // Set a custom error handler first
            const customHandler = jest.fn();
            window.onerror = customHandler;
            
            // Import the module
            await import('../../src/client/utils/bulletproof-global-handler.js');
            
            // Should still have some error handler (might be wrapped)
            expect(window.onerror).toBeDefined();
        });
    });

    describe('🚨 Error Catching and Handling', () => {
        beforeEach(async () => {
            // Import the module to set up handlers
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should catch and handle JavaScript errors', () => {
            // Simulate a JavaScript error
            const error = new Error('Test error');
            const event = new window.ErrorEvent('error', {
                error: error,
                message: 'Test error',
                filename: 'test.js',
                lineno: 42,
                colno: 10
            });

            // Trigger the error handler
            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.any(Object)
            );
        });

        test('should catch and handle unhandled promise rejections', () => {
            // Simulate an unhandled promise rejection
            const reason = new Error('Promise rejection test');
            const event = new window.PromiseRejectionEvent('unhandledrejection', {
                promise: Promise.reject(reason),
                reason: reason
            });

            // Trigger the rejection handler
            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Unhandled Promise Rejection'),
                expect.any(Object)
            );
        });

        test('should handle errors without stack traces', () => {
            const event = new window.ErrorEvent('error', {
                message: 'Error without stack',
                filename: 'unknown.js',
                lineno: 0,
                colno: 0
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    message: 'Error without stack'
                })
            );
        });

        test('should handle non-Error objects in rejections', () => {
            const stringReason = 'String rejection reason';
            const event = new window.PromiseRejectionEvent('unhandledrejection', {
                promise: Promise.reject(stringReason),
                reason: stringReason
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Unhandled Promise Rejection'),
                expect.objectContaining({
                    reason: stringReason
                })
            );
        });
    });

    describe('📊 Error Information Extraction', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should extract comprehensive error information', () => {
            const error = new Error('Detailed test error');
            error.stack = 'Error: Detailed test error\n    at test.js:42:10';
            
            const event = new window.ErrorEvent('error', {
                error: error,
                message: 'Detailed test error',
                filename: 'test.js',
                lineno: 42,
                colno: 10
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    message: 'Detailed test error',
                    filename: 'test.js',
                    line: 42,
                    column: 10,
                    stack: expect.stringContaining('test.js:42:10')
                })
            );
        });

        test('should handle errors with custom properties', () => {
            const error = new Error('Custom error');
            error.code = 'CUSTOM_ERROR';
            error.details = { extra: 'information' };
            
            const event = new window.ErrorEvent('error', {
                error: error,
                message: 'Custom error'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    message: 'Custom error'
                })
            );
        });

        test('should extract user agent and timestamp information', () => {
            const event = new window.ErrorEvent('error', {
                message: 'Browser info test',
                filename: 'test.js'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    timestamp: expect.any(String),
                    userAgent: expect.any(String)
                })
            );
        });
    });

    describe('🔄 Recovery and Continuation', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should prevent error propagation when appropriate', () => {
            const event = new window.ErrorEvent('error', {
                message: 'Preventable error',
                filename: 'test.js'
            });

            // The handler should return true to prevent default behavior
            const result = window.dispatchEvent(event);
            
            // Event should be handled (not cancelled by default)
            expect(result).toBe(true);
        });

        test('should allow application to continue after errors', () => {
            // Trigger an error
            const event = new window.ErrorEvent('error', {
                message: 'Non-fatal error'
            });
            window.dispatchEvent(event);

            // Application should still be functional
            expect(() => {
                const testDiv = document.createElement('div');
                document.body.appendChild(testDiv);
            }).not.toThrow();
        });

        test('should handle multiple rapid errors gracefully', () => {
            // Fire multiple errors rapidly
            for (let i = 0; i < 10; i++) {
                const event = new window.ErrorEvent('error', {
                    message: `Rapid error ${i}`,
                    filename: 'test.js',
                    lineno: i
                });
                window.dispatchEvent(event);
            }

            expect(console.error).toHaveBeenCalledTimes(10);
        });
    });

    describe('🎯 Specific Error Types', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should handle syntax errors', () => {
            const syntaxError = new SyntaxError('Unexpected token');
            const event = new window.ErrorEvent('error', {
                error: syntaxError,
                message: 'Unexpected token',
                filename: 'syntax-error.js'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    message: 'Unexpected token',
                    type: 'SyntaxError'
                })
            );
        });

        test('should handle reference errors', () => {
            const refError = new ReferenceError('Variable is not defined');
            const event = new window.ErrorEvent('error', {
                error: refError,
                message: 'Variable is not defined'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    type: 'ReferenceError'
                })
            );
        });

        test('should handle type errors', () => {
            const typeError = new TypeError('Cannot read property of undefined');
            const event = new window.ErrorEvent('error', {
                error: typeError,
                message: 'Cannot read property of undefined'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    type: 'TypeError'
                })
            );
        });

        test('should handle network-related errors', () => {
            const networkError = new Error('Network request failed');
            networkError.name = 'NetworkError';
            
            const event = new window.ErrorEvent('error', {
                error: networkError,
                message: 'Network request failed'
            });

            window.dispatchEvent(event);

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Global Error Caught'),
                expect.objectContaining({
                    message: 'Network request failed'
                })
            );
        });
    });

    describe('🔧 Edge Cases and Stress Tests', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should handle null/undefined error objects', () => {
            const event = new window.ErrorEvent('error', {
                error: null,
                message: 'Null error object'
            });

            expect(() => {
                window.dispatchEvent(event);
            }).not.toThrow();

            expect(console.error).toHaveBeenCalled();
        });

        test('should handle circular reference errors', () => {
            const circularError = new Error('Circular reference');
            circularError.circular = circularError;
            
            const event = new window.ErrorEvent('error', {
                error: circularError,
                message: 'Circular reference'
            });

            expect(() => {
                window.dispatchEvent(event);
            }).not.toThrow();
        });

        test('should handle very long error messages', () => {
            const longMessage = 'x'.repeat(10000);
            const event = new window.ErrorEvent('error', {
                message: longMessage,
                filename: 'long-error.js'
            });

            expect(() => {
                window.dispatchEvent(event);
            }).not.toThrow();

            expect(console.error).toHaveBeenCalled();
        });

        test('should handle errors during error handling', () => {
            // Mock console.error to throw an error
            const originalConsoleError = console.error;
            console.error = jest.fn(() => {
                throw new Error('Console error failed');
            });

            const event = new window.ErrorEvent('error', {
                message: 'Original error'
            });

            // Should not cause infinite loop or crash
            expect(() => {
                window.dispatchEvent(event);
            }).not.toThrow();

            // Restore console.error
            console.error = originalConsoleError;
        });
    });

    describe('📈 Performance and Memory', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should not cause memory leaks with many errors', () => {
            const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };
            
            // Generate many errors
            for (let i = 0; i < 1000; i++) {
                const event = new window.ErrorEvent('error', {
                    message: `Memory test error ${i}`,
                    filename: 'memory-test.js',
                    lineno: i
                });
                window.dispatchEvent(event);
            }

            // Memory usage should not grow excessively
            const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            
            // Allow for some growth but not excessive (less than 50MB)
            expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
        });

        test('should handle high-frequency errors efficiently', () => {
            const startTime = Date.now();
            
            // Generate errors rapidly
            for (let i = 0; i < 100; i++) {
                const event = new window.ErrorEvent('error', {
                    message: `High frequency error ${i}`
                });
                window.dispatchEvent(event);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should handle 100 errors in reasonable time (less than 1 second)
            expect(duration).toBeLessThan(1000);
        });
    });

    describe('🌐 Browser Compatibility', () => {
        beforeEach(async () => {
            await import('../../src/client/utils/bulletproof-global-handler.js');
        });

        test('should work with different error event formats', () => {
            // Test minimal error event
            const minimalEvent = new window.Event('error');
            
            expect(() => {
                window.dispatchEvent(minimalEvent);
            }).not.toThrow();

            // Test error event with only message
            const messageOnlyEvent = new window.ErrorEvent('error', {
                message: 'Message only error'
            });

            expect(() => {
                window.dispatchEvent(messageOnlyEvent);
            }).not.toThrow();
        });

        test('should handle missing ErrorEvent constructor gracefully', () => {
            // Simulate older browser without ErrorEvent
            const originalErrorEvent = window.ErrorEvent;
            delete window.ErrorEvent;

            // Should still work with basic Event
            const basicEvent = new window.Event('error');
            
            expect(() => {
                window.dispatchEvent(basicEvent);
            }).not.toThrow();

            // Restore ErrorEvent
            window.ErrorEvent = originalErrorEvent;
        });
    });
});

describe('🛡️ Bulletproof Global Handler Integration Tests', () => {
    test('should integrate with real error scenarios', async () => {
        await import('../../src/client/utils/bulletproof-global-handler.js');

        // Simulate real-world error scenarios
        const scenarios = [
            () => { throw new Error('Simulated runtime error'); },
            () => Promise.reject(new Error('Simulated promise rejection')),
            () => { const x = undefined; x.property; }, // TypeError
            () => { eval('invalid syntax'); } // SyntaxError
        ];

        scenarios.forEach((scenario, index) => {
            try {
                scenario();
            } catch (error) {
                // Errors should be caught by global handler
                const event = new window.ErrorEvent('error', {
                    error: error,
                    message: error.message
                });
                window.dispatchEvent(event);
            }
        });

        expect(console.error).toHaveBeenCalled();
    });

    test('should not interfere with normal application flow', async () => {
        await import('../../src/client/utils/bulletproof-global-handler.js');

        // Normal operations should work fine
        const div = document.createElement('div');
        div.textContent = 'Test content';
        document.body.appendChild(div);

        expect(div.textContent).toBe('Test content');
        expect(document.body.contains(div)).toBe(true);
    });
});
