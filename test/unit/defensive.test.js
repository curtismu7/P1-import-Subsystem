/**
 * Defensive Programming Utilities Tests
 * 
 * Tests for the defensive programming utilities to ensure they properly
 * handle edge cases, errors, and provide robust fallbacks.
 * 
 * @version 6.5.2.4
 */

import {
    safeGet,
    safeCall,
    safeCallAsync,
    validateObject,
    safeMiddleware,
    safeHandler,
    retry
} from '../../server/defensive.js';

// Mock console.log and other logging functions
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
    // Silence console output during tests
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    // Restore console functions
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
});

describe('safeGet', () => {
    test('should return property value for valid path', () => {
        const obj = { user: { profile: { name: 'John' } } };
        expect(safeGet(obj, 'user.profile.name')).toBe('John');
    });
    
    test('should return default value for invalid path', () => {
        const obj = { user: { profile: { name: 'John' } } };
        expect(safeGet(obj, 'user.settings.theme')).toBeNull();
    });
    
    test('should return custom default value', () => {
        const obj = { user: { profile: { name: 'John' } } };
        expect(safeGet(obj, 'user.settings.theme', 'default')).toBe('default');
    });
    
    test('should handle null or undefined objects', () => {
        expect(safeGet(null, 'user.profile.name')).toBeNull();
        expect(safeGet(undefined, 'user.profile.name')).toBeNull();
    });
    
    test('should handle empty path', () => {
        const obj = { user: { profile: { name: 'John' } } };
        expect(safeGet(obj, '')).toBeNull();
    });
    
    test('should handle array access', () => {
        const obj = { users: [{ name: 'John' }, { name: 'Jane' }] };
        expect(safeGet(obj, 'users.1.name')).toBe('Jane');
    });
});

describe('safeCall', () => {
    test('should call function and return result', () => {
        const fn = jest.fn().mockReturnValue('result');
        expect(safeCall(fn, ['arg1', 'arg2'])).toBe('result');
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
    
    test('should return default value if function throws', () => {
        const fn = jest.fn().mockImplementation(() => {
            throw new Error('test error');
        });
        expect(safeCall(fn, ['arg1'], 'default')).toBe('default');
    });
    
    test('should return null if function throws and no default provided', () => {
        const fn = jest.fn().mockImplementation(() => {
            throw new Error('test error');
        });
        expect(safeCall(fn)).toBeNull();
    });
    
    test('should handle non-function input', () => {
        expect(safeCall('not a function')).toBeNull();
    });
    
    test('should not log error if logError is false', () => {
        const fn = jest.fn().mockImplementation(() => {
            throw new Error('test error');
        });
        safeCall(fn, [], null, false);
        expect(console.warn).not.toHaveBeenCalled();
    });
});

describe('safeCallAsync', () => {
    test('should call async function and return result', async () => {
        const fn = jest.fn().mockResolvedValue('result');
        await expect(safeCallAsync(fn, ['arg1', 'arg2'])).resolves.toBe('result');
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
    
    test('should return default value if async function rejects', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('test error'));
        await expect(safeCallAsync(fn, ['arg1'], 'default')).resolves.toBe('default');
    });
    
    test('should return null if async function rejects and no default provided', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('test error'));
        await expect(safeCallAsync(fn)).resolves.toBeNull();
    });
    
    test('should handle non-function input', async () => {
        await expect(safeCallAsync('not a function')).resolves.toBeNull();
    });
});

describe('validateObject', () => {
    const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', min: 0, max: 120 },
        email: { type: 'string', pattern: '^.+@.+\\..+$' },
        role: { enum: ['admin', 'user', 'guest'] },
        tags: { type: 'array', minLength: 1, maxLength: 5 }
    };
    
    test('should validate valid object', () => {
        const obj = {
            name: 'John',
            age: 30,
            email: 'john@example.com',
            role: 'user',
            tags: ['tag1', 'tag2']
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.sanitized).toEqual(obj);
    });
    
    test('should detect missing required property', () => {
        const obj = {
            age: 30,
            email: 'john@example.com'
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required property: name');
    });
    
    test('should validate type', () => {
        const obj = {
            name: 'John',
            age: 'thirty'
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid type for age: expected number, got string');
    });
    
    test('should validate min/max for numbers', () => {
        const obj = {
            name: 'John',
            age: 150
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Value for age exceeds maximum: 150 > 120');
    });
    
    test('should validate pattern for strings', () => {
        const obj = {
            name: 'John',
            email: 'not-an-email'
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Value for email does not match pattern: ^.+@.+\\..+$');
    });
    
    test('should validate enum values', () => {
        const obj = {
            name: 'John',
            role: 'superuser'
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Value for role is not one of allowed values: admin, user, guest');
    });
    
    test('should validate array length', () => {
        const obj = {
            name: 'John',
            tags: []
        };
        const result = validateObject(obj, schema);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Length of tags is below minimum: 0 < 1');
    });
    
    test('should detect unknown properties in strict mode', () => {
        const obj = {
            name: 'John',
            unknown: 'value'
        };
        const result = validateObject(obj, schema, true);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Unknown property: unknown');
    });
    
    test('should allow unknown properties in non-strict mode', () => {
        const obj = {
            name: 'John',
            unknown: 'value'
        };
        const result = validateObject(obj, schema, false);
        expect(result.valid).toBe(true);
    });
});

describe('safeMiddleware', () => {
    test('should pass through to next middleware if no error', async () => {
        const middleware = jest.fn((req, res, next) => next());
        const wrappedMiddleware = safeMiddleware(middleware);
        
        const req = {};
        const res = { headersSent: false };
        const next = jest.fn();
        
        await wrappedMiddleware(req, res, next);
        
        expect(middleware).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalled();
    });
    
    test('should handle errors and send 500 response', async () => {
        const error = new Error('middleware error');
        const middleware = jest.fn((req, res, next) => {
            throw error;
        });
        const wrappedMiddleware = safeMiddleware(middleware);
        
        const req = { url: '/test', method: 'GET' };
        const res = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();
        
        await wrappedMiddleware(req, res, next);
        
        expect(middleware).toHaveBeenCalledWith(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'error',
            message: 'Internal server error'
        }));
        expect(next).not.toHaveBeenCalled();
    });
    
    test('should call next with error if headers already sent', async () => {
        const error = new Error('middleware error');
        const middleware = jest.fn((req, res, next) => {
            throw error;
        });
        const wrappedMiddleware = safeMiddleware(middleware);
        
        const req = {};
        const res = { headersSent: true };
        const next = jest.fn();
        
        await wrappedMiddleware(req, res, next);
        
        expect(middleware).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('safeHandler', () => {
    test('should pass through if no error', async () => {
        const handler = jest.fn((req, res) => {
            res.status(200).json({ success: true });
        });
        const wrappedHandler = safeHandler(handler);
        
        const req = {};
        const res = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        await wrappedHandler(req, res);
        
        expect(handler).toHaveBeenCalledWith(req, res, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });
    
    test('should handle errors and send 500 response', async () => {
        const error = new Error('handler error');
        const handler = jest.fn((req, res) => {
            throw error;
        });
        const wrappedHandler = safeHandler(handler);
        
        const req = { url: '/test', method: 'GET' };
        const res = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        await wrappedHandler(req, res);
        
        expect(handler).toHaveBeenCalledWith(req, res, expect.any(Function));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: 'error',
            message: 'Internal server error'
        }));
    });
});

describe('retry', () => {
    test('should return result on first success', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const result = await retry(fn);
        
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });
    
    test('should retry on failure', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('attempt 1'))
            .mockResolvedValueOnce('success');
        
        const result = await retry(fn, { maxRetries: 3, initialDelay: 10 });
        
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
    });
    
    test('should fail after max retries', async () => {
        const error = new Error('test error');
        const fn = jest.fn().mockRejectedValue(error);
        
        await expect(retry(fn, { maxRetries: 2, initialDelay: 10 }))
            .rejects.toThrow('test error');
        
        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
    
    test('should respect shouldRetry function', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('retry'))
            .mockRejectedValueOnce(new Error('do not retry'));
        
        const shouldRetry = jest.fn(error => error.message === 'retry');
        
        await expect(retry(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
            .rejects.toThrow('do not retry');
        
        expect(fn).toHaveBeenCalledTimes(2);
        expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
});

// Integration tests
describe('Defensive Programming Integration', () => {
    test('should provide robust error handling for complex operations', async () => {
        // Create a complex operation with multiple potential failure points
        const complexOperation = async (input) => {
            // Step 1: Validate input
            const schema = {
                id: { type: 'string', required: true },
                data: { type: 'object', required: true }
            };
            
            const validation = validateObject(input, schema);
            if (!validation.valid) {
                throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
            }
            
            // Step 2: Process data (could fail)
            const processData = async (data) => {
                if (!data.value) {
                    throw new Error('Missing value in data');
                }
                return data.value.toUpperCase();
            };
            
            // Step 3: Use safe call for processing
            const processedData = await safeCallAsync(
                processData,
                [input.data],
                'DEFAULT_VALUE'
            );
            
            return {
                id: input.id,
                result: processedData
            };
        };
        
        // Test with valid input
        const validResult = await complexOperation({
            id: '123',
            data: { value: 'test' }
        });
        
        expect(validResult).toEqual({
            id: '123',
            result: 'TEST'
        });
        
        // Test with invalid data (missing value)
        const invalidDataResult = await complexOperation({
            id: '123',
            data: {}
        });
        
        expect(invalidDataResult).toEqual({
            id: '123',
            result: 'DEFAULT_VALUE'
        });
        
        // Test with completely invalid input
        await expect(complexOperation({
            data: { value: 'test' }
            // Missing required id
        })).rejects.toThrow('Invalid input: Missing required property: id');
    });
});
