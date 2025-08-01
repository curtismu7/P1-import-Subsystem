/**
 * Circuit Breaker Pattern Tests
 * 
 * Tests for the circuit breaker pattern implementation to ensure it properly
 * handles failures and prevents cascading failures.
 * 
 * @version 6.5.2.4
 */

import { CircuitBreaker, CircuitBreakerRegistry } from '../../server/circuit-breaker.js';

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

describe('CircuitBreaker', () => {
    let circuitBreaker;
    
    beforeEach(() => {
        // Create a new circuit breaker for each test
        circuitBreaker = new CircuitBreaker({
            name: 'test-breaker',
            failureThreshold: 3,
            resetTimeout: 1000,
            timeout: 500
        });
    });
    
    test('should initialize in closed state', () => {
        expect(circuitBreaker.state).toBe('CLOSED');
        expect(circuitBreaker.failureCount).toBe(0);
        expect(circuitBreaker.name).toBe('test-breaker');
    });
    
    test('should execute function successfully in closed state', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        const result = await circuitBreaker.execute(mockFn, 'arg1', 'arg2');
        
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        expect(circuitBreaker.state).toBe('CLOSED');
        expect(circuitBreaker.failureCount).toBe(0);
    });
    
    test('should increment failure count on error', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
        
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
        expect(circuitBreaker.failureCount).toBe(1);
        expect(circuitBreaker.state).toBe('CLOSED');
    });
    
    test('should open circuit after reaching failure threshold', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
        
        // Fail 3 times (threshold)
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        
        // Circuit should now be open
        expect(circuitBreaker.state).toBe('OPEN');
        expect(circuitBreaker.failureCount).toBe(3);
        
        // Additional calls should fail fast
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker "test-breaker" is open');
        
        // Function should not have been called again
        expect(mockFn).toHaveBeenCalledTimes(3);
    });
    
    test('should use fallback function when provided', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
        const fallbackFn = jest.fn().mockReturnValue('fallback result');
        
        circuitBreaker = new CircuitBreaker({
            name: 'test-breaker',
            failureThreshold: 3,
            resetTimeout: 1000,
            timeout: 500,
            fallbackFn
        });
        
        // Fail 3 times to open circuit
        await circuitBreaker.execute(mockFn);
        await circuitBreaker.execute(mockFn);
        await circuitBreaker.execute(mockFn);
        
        // Next call should use fallback
        const result = await circuitBreaker.execute(mockFn, 'arg1', 'arg2');
        
        expect(result).toBe('fallback result');
        expect(fallbackFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
    
    test('should transition to half-open state after reset timeout', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
        
        // Fail enough times to open circuit
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
        
        expect(circuitBreaker.state).toBe('OPEN');
        
        // Mock the lastFailureTime to simulate timeout expiration
        circuitBreaker.lastFailureTime = Date.now() - 2000; // 2 seconds ago
        
        // Next call should transition to half-open
        const successFn = jest.fn().mockResolvedValue('success');
        await circuitBreaker.execute(successFn);
        
        expect(circuitBreaker.state).toBe('HALF_OPEN');
    });
    
    test('should close circuit after successful calls in half-open state', async () => {
        // Start in half-open state
        circuitBreaker.state = 'HALF_OPEN';
        circuitBreaker.failureCount = 3;
        
        const successFn = jest.fn().mockResolvedValue('success');
        
        // First successful call
        await circuitBreaker.execute(successFn);
        expect(circuitBreaker.state).toBe('HALF_OPEN');
        expect(circuitBreaker.successCount).toBe(1);
        
        // Second successful call should close the circuit
        await circuitBreaker.execute(successFn);
        expect(circuitBreaker.state).toBe('CLOSED');
        expect(circuitBreaker.failureCount).toBe(0);
    });
    
    test('should reopen circuit on failure in half-open state', async () => {
        // Start in half-open state
        circuitBreaker.state = 'HALF_OPEN';
        circuitBreaker.failureCount = 3;
        
        const failFn = jest.fn().mockRejectedValue(new Error('test error'));
        
        // Failure in half-open should reopen circuit
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow();
        expect(circuitBreaker.state).toBe('OPEN');
    });
    
    test('should timeout long-running functions', async () => {
        // Create a function that takes longer than the timeout
        const slowFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('slow'), 1000)));
        
        // Should timeout after 500ms
        await expect(circuitBreaker.execute(slowFn)).rejects.toThrow('timeout');
    });
    
    test('should reset circuit breaker state', () => {
        // Set up a non-default state
        circuitBreaker.state = 'OPEN';
        circuitBreaker.failureCount = 5;
        circuitBreaker.lastFailureTime = Date.now();
        
        // Reset
        circuitBreaker.reset();
        
        // Should be back to initial state
        expect(circuitBreaker.state).toBe('CLOSED');
        expect(circuitBreaker.failureCount).toBe(0);
        expect(circuitBreaker.lastFailureTime).toBeNull();
    });
    
    test('should force circuit breaker to specific state', () => {
        // Force to open
        circuitBreaker.forceState('OPEN');
        expect(circuitBreaker.state).toBe('OPEN');
        
        // Force to half-open
        circuitBreaker.forceState('HALF_OPEN');
        expect(circuitBreaker.state).toBe('HALF_OPEN');
        
        // Force to closed
        circuitBreaker.forceState('CLOSED');
        expect(circuitBreaker.state).toBe('CLOSED');
        
        // Invalid state should throw
        expect(() => circuitBreaker.forceState('INVALID')).toThrow();
    });
});

describe('CircuitBreakerRegistry', () => {
    let registry;
    
    beforeEach(() => {
        registry = new CircuitBreakerRegistry();
    });
    
    test('should create and retrieve circuit breakers', () => {
        const breaker1 = registry.getOrCreate('service1');
        const breaker2 = registry.getOrCreate('service2');
        
        expect(breaker1).toBeInstanceOf(CircuitBreaker);
        expect(breaker2).toBeInstanceOf(CircuitBreaker);
        expect(breaker1).not.toBe(breaker2);
        
        // Should return the same instance when called again
        const breaker1Again = registry.getOrCreate('service1');
        expect(breaker1Again).toBe(breaker1);
    });
    
    test('should get all circuit breakers', () => {
        registry.getOrCreate('service1');
        registry.getOrCreate('service2');
        
        const all = registry.getAll();
        expect(all.length).toBe(2);
        expect(all[0]).toBeInstanceOf(CircuitBreaker);
        expect(all[1]).toBeInstanceOf(CircuitBreaker);
    });
    
    test('should get all circuit breaker states', () => {
        registry.getOrCreate('service1');
        registry.getOrCreate('service2');
        
        const states = registry.getAllStates();
        expect(Object.keys(states).length).toBe(2);
        expect(states.service1.name).toBe('service1');
        expect(states.service2.name).toBe('service2');
    });
    
    test('should reset all circuit breakers', () => {
        const breaker1 = registry.getOrCreate('service1');
        const breaker2 = registry.getOrCreate('service2');
        
        // Set up non-default states
        breaker1.state = 'OPEN';
        breaker2.state = 'HALF_OPEN';
        
        // Reset all
        registry.resetAll();
        
        // All should be back to closed
        expect(breaker1.state).toBe('CLOSED');
        expect(breaker2.state).toBe('CLOSED');
    });
});

// Integration tests
describe('CircuitBreaker Integration', () => {
    test('should protect against cascading failures', async () => {
        const registry = new CircuitBreakerRegistry();
        const breaker = registry.getOrCreate('api', {
            failureThreshold: 2,
            resetTimeout: 500,
            timeout: 100
        });
        
        // Mock an API service that fails
        const apiService = {
            callCount: 0,
            call: function() {
                this.callCount++;
                return new Promise((resolve, reject) => {
                    // Always fail
                    reject(new Error('API error'));
                });
            }
        };
        
        // Try to call the API multiple times through the circuit breaker
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        
        // The API should only have been called twice (failureThreshold)
        // The rest should have failed fast
        expect(apiService.callCount).toBe(2);
        expect(breaker.state).toBe('OPEN');
        
        // Wait for reset timeout
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Next call should go through (half-open state)
        try { await breaker.execute(() => apiService.call()); } catch (e) {}
        
        // Should have made one more call
        expect(apiService.callCount).toBe(3);
    });
});
