/**
 * Bulletproof Components Test Suite
 * 
 * Tests for all bulletproofed components to ensure they work correctly with the
 * latest updates to the application.
 * 
 * @version 6.5.2.4
 */

// Import test framework
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import components to test
import CircuitBreakerRegistry from '../server/circuit-breaker.js';
import { safeGet, safeCall, validateObject, retry } from '../server/defensive.js';

describe('Bulletproof Components', () => {
  describe('Circuit Breaker Pattern', () => {
    beforeEach(() => {
      // Reset circuit breakers before each test
      CircuitBreakerRegistry.reset();
    });
    
    test('should create and retrieve circuit breaker', () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-circuit');
      expect(cb).toBeDefined();
      expect(typeof cb.execute).toBe('function');
      
      const sameCb = CircuitBreakerRegistry.getOrCreate('test-circuit');
      expect(sameCb).toBe(cb); // Should return the same instance
    });
    
    test('should execute function when circuit is closed', async () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-success');
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await cb.execute(mockFn);
      
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('success');
    });
    
    test('should open circuit after failures exceed threshold', async () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-failure', {
        failureThreshold: 2,
        resetTimeout: 1000
      });
      
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      try {
        // First failure
        await cb.execute(mockFn);
      } catch (e) {
        // Expected error
      }
      
      expect(cb._state.state).toBe('CLOSED');
      
      try {
        // Second failure - should trip the circuit
        await cb.execute(mockFn);
      } catch (e) {
        // Expected error
      }
      
      expect(cb._state.state).toBe('OPEN');
      
      try {
        // Third attempt - should fail fast without calling the function
        await cb.execute(mockFn);
      } catch (e) {
        expect(e.message).toContain('Circuit breaker is open');
      }
      
      expect(mockFn).toHaveBeenCalledTimes(2); // Function not called on third attempt
    });
    
    test('should use fallback function when circuit is open', async () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-fallback', {
        failureThreshold: 1,
        resetTimeout: 1000,
        fallbackFn: () => 'fallback result'
      });
      
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      try {
        // First failure - trips the circuit
        await cb.execute(mockFn);
      } catch (e) {
        // Expected error
      }
      
      // Second attempt - should use fallback
      const result = await cb.execute(mockFn, true); // true to use fallback
      expect(result).toBe('fallback result');
      expect(mockFn).toHaveBeenCalledTimes(1); // Function not called on second attempt
    });
  });
  
  describe('Defensive Programming Utilities', () => {
    test('safeGet should safely access object properties', () => {
      const obj = { user: { profile: { name: 'John' } } };
      
      expect(safeGet(obj, 'user.profile.name')).toBe('John');
      expect(safeGet(obj, 'user.settings')).toBeNull();
      expect(safeGet(obj, 'user.settings.theme', 'default')).toBe('default');
      expect(safeGet(null, 'user.profile')).toBeNull();
    });
    
    test('safeCall should safely call functions', () => {
      const successFn = () => 'success';
      const failureFn = () => { throw new Error('failure'); };
      
      expect(safeCall(successFn)).toBe('success');
      expect(safeCall(failureFn)).toBeNull();
      expect(safeCall(failureFn, [], 'default')).toBe('default');
      expect(safeCall(null)).toBeNull();
    });
    
    test('validateObject should validate objects against schemas', () => {
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', min: 0, max: 120 }
      };
      
      const validObj = { name: 'John', age: 30 };
      const invalidObj = { name: 'John', age: -10 };
      const missingRequired = { age: 30 };
      
      const validResult = validateObject(validObj, schema);
      const invalidResult = validateObject(invalidObj, schema);
      const missingResult = validateObject(missingRequired, schema);
      
      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(missingResult.valid).toBe(false);
      
      expect(invalidResult.errors).toContain('Value for age is below minimum: -10 < 0');
      expect(missingResult.errors).toContain('Missing required property: name');
    });
    
    test('retry should retry failed operations', async () => {
      // Mock function that fails twice then succeeds
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');
      
      const result = await retry(mockFn, {
        maxRetries: 3,
        initialDelay: 10 // Small delay for tests
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Bulletproof API Integration', () => {
    test('Circuit breaker should protect API calls', async () => {
      // Create a circuit breaker for API calls
      const apiCircuitBreaker = CircuitBreakerRegistry.getOrCreate('api-test', {
        failureThreshold: 2,
        resetTimeout: 1000,
        fallbackFn: () => ({ success: false, error: 'Service unavailable' })
      });
      
      // Mock API function that always fails
      const failingApiCall = jest.fn().mockRejectedValue(new Error('API error'));
      
      // First call - should fail but circuit remains closed
      try {
        await apiCircuitBreaker.execute(failingApiCall);
      } catch (e) {
        // Expected error
      }
      
      expect(failingApiCall).toHaveBeenCalledTimes(1);
      
      // Second call - should fail and open the circuit
      try {
        await apiCircuitBreaker.execute(failingApiCall);
      } catch (e) {
        // Expected error
      }
      
      expect(failingApiCall).toHaveBeenCalledTimes(2);
      
      // Third call - should use fallback without calling the API
      const result = await apiCircuitBreaker.execute(failingApiCall, true);
      
      expect(result).toEqual({ success: false, error: 'Service unavailable' });
      expect(failingApiCall).toHaveBeenCalledTimes(2); // No additional call
    });
    
    test('Defensive programming should protect against bad input', () => {
      // Create a function that uses defensive programming
      const processUserData = (userData) => {
        // Validate input
        const schema = {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          email: { type: 'string', pattern: '^.+@.+\\..+$' }
        };
        
        const validation = validateObject(userData, schema);
        if (!validation.valid) {
          return { success: false, errors: validation.errors };
        }
        
        // Safe access potentially missing properties
        const role = safeGet(userData, 'role', 'user');
        
        // Safe function call
        const formatName = (name) => name.toUpperCase();
        const formattedName = safeCall(formatName, [userData.name], userData.name);
        
        return {
          success: true,
          user: {
            id: userData.id,
            name: formattedName,
            email: userData.email,
            role: role
          }
        };
      };
      
      // Test with valid data
      const validResult = processUserData({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      });
      
      expect(validResult.success).toBe(true);
      expect(validResult.user.name).toBe('JOHN DOE');
      expect(validResult.user.role).toBe('user');
      
      // Test with invalid data
      const invalidResult = processUserData({
        name: 'John Doe'
        // Missing required id
      });
      
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors).toContain('Missing required property: id');
      
      // Test with null input
      const nullResult = processUserData(null);
      
      expect(nullResult.success).toBe(false);
    });
  });
});
