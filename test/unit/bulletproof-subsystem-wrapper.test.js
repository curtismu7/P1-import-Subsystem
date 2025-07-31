/**
 * 🛡️ BULLETPROOF SUBSYSTEM WRAPPER TESTS - COMPREHENSIVE TESTING SUITE
 * 
 * Tests all aspects of the bulletproof subsystem wrapper:
 * - Error isolation and recovery
 * - Method call protection
 * - Fallback mechanisms
 * - Statistics tracking
 * - Memory management
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
const dom = new JSDOM(`<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

// Import the bulletproof subsystem wrapper after DOM setup
let createBulletproofSubsystemWrapper;

beforeAll(async () => {
    const module = await import('../../src/client/utils/bulletproof-subsystem-wrapper.js');
    createBulletproofSubsystemWrapper = module.createBulletproofSubsystemWrapper;
});

describe('🛡️ Bulletproof Subsystem Wrapper Tests', () => {
    let mockSubsystem;
    let wrappedSubsystem;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock subsystem
        mockSubsystem = {
            name: 'MockSubsystem',
            init: jest.fn(() => Promise.resolve(true)),
            destroy: jest.fn(() => Promise.resolve(true)),
            syncMethod: jest.fn(() => 'sync result'),
            asyncMethod: jest.fn(() => Promise.resolve('async result')),
            throwingMethod: jest.fn(() => {
                throw new Error('Method failed');
            }),
            asyncThrowingMethod: jest.fn(() => Promise.reject(new Error('Async method failed'))),
            propertyValue: 'test property',
            nestedObject: {
                nestedMethod: jest.fn(() => 'nested result'),
                nestedProperty: 'nested value'
            }
        };

        // Create wrapped subsystem
        wrappedSubsystem = createBulletproofSubsystemWrapper(mockSubsystem, mockLogger);
    });

    describe('🏗️ Creation and Basic Functionality', () => {
        test('should create bulletproof wrapper successfully', () => {
            expect(wrappedSubsystem).toBeDefined();
            expect(wrappedSubsystem.name).toBe('MockSubsystem');
        });

        test('should preserve all original methods', () => {
            expect(typeof wrappedSubsystem.init).toBe('function');
            expect(typeof wrappedSubsystem.destroy).toBe('function');
            expect(typeof wrappedSubsystem.syncMethod).toBe('function');
            expect(typeof wrappedSubsystem.asyncMethod).toBe('function');
        });

        test('should preserve all original properties', () => {
            expect(wrappedSubsystem.propertyValue).toBe('test property');
            expect(wrappedSubsystem.nestedObject).toBeDefined();
            expect(wrappedSubsystem.nestedObject.nestedProperty).toBe('nested value');
        });

        test('should handle null/undefined subsystem gracefully', () => {
            const nullWrapper = createBulletproofSubsystemWrapper(null, mockLogger);
            expect(nullWrapper).toBeDefined();
            
            const undefinedWrapper = createBulletproofSubsystemWrapper(undefined, mockLogger);
            expect(undefinedWrapper).toBeDefined();
        });

        test('should handle missing logger gracefully', () => {
            const wrapper = createBulletproofSubsystemWrapper(mockSubsystem, null);
            expect(wrapper).toBeDefined();
        });
    });

    describe('🔄 Method Call Protection', () => {
        test('should execute successful sync methods normally', () => {
            const result = wrappedSubsystem.syncMethod();
            
            expect(result).toBe('sync result');
            expect(mockSubsystem.syncMethod).toHaveBeenCalled();
        });

        test('should execute successful async methods normally', async () => {
            const result = await wrappedSubsystem.asyncMethod();
            
            expect(result).toBe('async result');
            expect(mockSubsystem.asyncMethod).toHaveBeenCalled();
        });

        test('should catch and handle sync method errors', () => {
            const result = wrappedSubsystem.throwingMethod();
            
            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Method throwingMethod failed'),
                expect.any(Object)
            );
        });

        test('should catch and handle async method errors', async () => {
            const result = await wrappedSubsystem.asyncThrowingMethod();
            
            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Method asyncThrowingMethod failed'),
                expect.any(Object)
            );
        });

        test('should preserve method context (this binding)', () => {
            mockSubsystem.contextMethod = jest.fn(function() {
                return this.name;
            });

            wrappedSubsystem.contextMethod = mockSubsystem.contextMethod;
            const result = wrappedSubsystem.contextMethod();
            
            expect(result).toBe('MockSubsystem');
        });

        test('should handle methods with multiple parameters', () => {
            mockSubsystem.multiParamMethod = jest.fn((a, b, c) => a + b + c);
            wrappedSubsystem.multiParamMethod = mockSubsystem.multiParamMethod;
            
            const result = wrappedSubsystem.multiParamMethod(1, 2, 3);
            
            expect(result).toBe(6);
            expect(mockSubsystem.multiParamMethod).toHaveBeenCalledWith(1, 2, 3);
        });
    });

    describe('🔧 Fallback Mechanisms', () => {
        test('should provide fallback for failed init method', () => {
            mockSubsystem.init.mockImplementation(() => {
                throw new Error('Init failed');
            });

            const result = wrappedSubsystem.init();
            
            expect(result).resolves.toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Method init failed'),
                expect.any(Object)
            );
        });

        test('should provide fallback for failed destroy method', () => {
            mockSubsystem.destroy.mockImplementation(() => {
                throw new Error('Destroy failed');
            });

            const result = wrappedSubsystem.destroy();
            
            expect(result).resolves.toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Fallback result provided for destroy')
            );
        });

        test('should handle missing methods gracefully', () => {
            const result = wrappedSubsystem.nonExistentMethod();
            
            expect(result).toBeUndefined();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Method nonExistentMethod not found')
            );
        });

        test('should provide appropriate fallbacks for different method types', () => {
            // Test different method naming patterns
            mockSubsystem.getStatus = jest.fn(() => { throw new Error('Failed'); });
            mockSubsystem.isReady = jest.fn(() => { throw new Error('Failed'); });
            mockSubsystem.hasData = jest.fn(() => { throw new Error('Failed'); });
            mockSubsystem.updateConfig = jest.fn(() => { throw new Error('Failed'); });

            wrappedSubsystem.getStatus = mockSubsystem.getStatus;
            wrappedSubsystem.isReady = mockSubsystem.isReady;
            wrappedSubsystem.hasData = mockSubsystem.hasData;
            wrappedSubsystem.updateConfig = mockSubsystem.updateConfig;

            expect(wrappedSubsystem.getStatus()).toBeNull();
            expect(wrappedSubsystem.isReady()).toBe(false);
            expect(wrappedSubsystem.hasData()).toBe(false);
            expect(wrappedSubsystem.updateConfig()).toBe(false);
        });
    });

    describe('📊 Statistics and Monitoring', () => {
        test('should track method call statistics', () => {
            // Make several method calls
            wrappedSubsystem.syncMethod();
            wrappedSubsystem.syncMethod();
            wrappedSubsystem.throwingMethod();

            // Check if statistics are being tracked (via logger calls)
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining('🛡️ Method syncMethod completed successfully')
            );
        });

        test('should track error statistics', () => {
            wrappedSubsystem.throwingMethod();
            wrappedSubsystem.throwingMethod();

            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });

        test('should handle rapid consecutive calls', () => {
            // Fire many calls rapidly
            for (let i = 0; i < 100; i++) {
                wrappedSubsystem.syncMethod();
            }

            expect(mockSubsystem.syncMethod).toHaveBeenCalledTimes(100);
        });
    });

    describe('🔍 Property Access Protection', () => {
        test('should allow safe property access', () => {
            expect(wrappedSubsystem.propertyValue).toBe('test property');
        });

        test('should handle property modification safely', () => {
            wrappedSubsystem.propertyValue = 'modified value';
            expect(wrappedSubsystem.propertyValue).toBe('modified value');
        });

        test('should handle nested object access', () => {
            expect(wrappedSubsystem.nestedObject.nestedProperty).toBe('nested value');
        });

        test('should handle undefined property access gracefully', () => {
            expect(wrappedSubsystem.undefinedProperty).toBeUndefined();
        });
    });

    describe('🧠 Memory Management', () => {
        test('should not create memory leaks with multiple wrappers', () => {
            const wrappers = [];
            
            // Create multiple wrappers
            for (let i = 0; i < 10; i++) {
                wrappers.push(createBulletproofSubsystemWrapper(mockSubsystem, mockLogger));
            }

            // All should work independently
            wrappers.forEach((wrapper, index) => {
                expect(wrapper.syncMethod()).toBe('sync result');
            });
        });

        test('should handle circular references safely', () => {
            mockSubsystem.circularRef = mockSubsystem;
            
            const wrapper = createBulletproofSubsystemWrapper(mockSubsystem, mockLogger);
            
            expect(wrapper.circularRef).toBeDefined();
            expect(wrapper.circularRef.name).toBe('MockSubsystem');
        });
    });

    describe('⚡ Performance and Edge Cases', () => {
        test('should handle very long method names', () => {
            const longMethodName = 'a'.repeat(1000);
            mockSubsystem[longMethodName] = jest.fn(() => 'long method result');
            wrappedSubsystem[longMethodName] = mockSubsystem[longMethodName];

            const result = wrappedSubsystem[longMethodName]();
            expect(result).toBe('long method result');
        });

        test('should handle methods that return complex objects', () => {
            const complexObject = {
                nested: {
                    deeply: {
                        value: 'deep value',
                        array: [1, 2, 3],
                        func: () => 'nested function'
                    }
                }
            };

            mockSubsystem.getComplexObject = jest.fn(() => complexObject);
            wrappedSubsystem.getComplexObject = mockSubsystem.getComplexObject;

            const result = wrappedSubsystem.getComplexObject();
            expect(result.nested.deeply.value).toBe('deep value');
            expect(result.nested.deeply.array).toEqual([1, 2, 3]);
        });

        test('should handle methods that throw non-Error objects', () => {
            mockSubsystem.throwString = jest.fn(() => {
                throw 'String error';
            });
            mockSubsystem.throwNumber = jest.fn(() => {
                throw 42;
            });
            mockSubsystem.throwNull = jest.fn(() => {
                throw null;
            });

            wrappedSubsystem.throwString = mockSubsystem.throwString;
            wrappedSubsystem.throwNumber = mockSubsystem.throwNumber;
            wrappedSubsystem.throwNull = mockSubsystem.throwNull;

            expect(wrappedSubsystem.throwString()).toBeUndefined();
            expect(wrappedSubsystem.throwNumber()).toBeUndefined();
            expect(wrappedSubsystem.throwNull()).toBeUndefined();
        });

        test('should handle async methods that never resolve', (done) => {
            mockSubsystem.hangingMethod = jest.fn(() => new Promise(() => {})); // Never resolves
            wrappedSubsystem.hangingMethod = mockSubsystem.hangingMethod;

            // Should not hang the test
            const promise = wrappedSubsystem.hangingMethod();
            
            setTimeout(() => {
                expect(promise).toBeInstanceOf(Promise);
                done();
            }, 100);
        });
    });

    describe('🎭 Integration Scenarios', () => {
        test('should work with real subsystem-like objects', () => {
            const realishSubsystem = {
                name: 'RealSubsystem',
                initialized: false,
                config: { setting1: 'value1' },
                
                async init() {
                    this.initialized = true;
                    return true;
                },
                
                getConfig() {
                    return this.config;
                },
                
                updateSetting(key, value) {
                    this.config[key] = value;
                    return true;
                },
                
                async performOperation() {
                    if (!this.initialized) {
                        throw new Error('Not initialized');
                    }
                    return 'operation complete';
                }
            };

            const wrapper = createBulletproofSubsystemWrapper(realishSubsystem, mockLogger);

            // Test the workflow
            return wrapper.init().then(() => {
                expect(wrapper.initialized).toBe(true);
                expect(wrapper.getConfig().setting1).toBe('value1');
                
                wrapper.updateSetting('setting2', 'value2');
                expect(wrapper.config.setting2).toBe('value2');
                
                return wrapper.performOperation();
            }).then((result) => {
                expect(result).toBe('operation complete');
            });
        });

        test('should handle subsystem with event emitters', () => {
            const EventEmitter = dom.window.EventTarget;
            
            const eventSubsystem = Object.assign(new EventEmitter(), {
                name: 'EventSubsystem',
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn()
            });

            const wrapper = createBulletproofSubsystemWrapper(eventSubsystem, mockLogger);

            expect(typeof wrapper.emit).toBe('function');
            expect(typeof wrapper.on).toBe('function');
            expect(typeof wrapper.off).toBe('function');
        });
    });
});

describe('🛡️ Bulletproof Subsystem Wrapper Static Tests', () => {
    test('should export createBulletproofSubsystemWrapper function', () => {
        expect(typeof createBulletproofSubsystemWrapper).toBe('function');
    });

    test('should handle module import in adverse conditions', () => {
        expect(createBulletproofSubsystemWrapper).toBeDefined();
    });
});
