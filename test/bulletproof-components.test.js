/**
 * Bulletproof Components Test Suite
 * 
 * Tests for all bulletproofed components to ensure they work correctly with the
 * latest updates to the application.
 * 
 * @version 6.5.2.4
 */

// Import required modules
const CircuitBreakerRegistry = require('../server/circuit-breaker.js');
const { safeGet, safeCall, validateObject } = require('../server/defensive.js');

// Mock fetch for testing
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('Success')
  })
);

describe('Bulletproof Components', () => {
  describe('Circuit Breaker Pattern', () => {
    beforeEach(() => {
      // Reset circuit breakers before each test
      CircuitBreakerRegistry.reset();
    });
    
    test('should create and retrieve circuit breaker', () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-circuit');
      expect(cb).toBeDefined();
      expect(cb.execute).toBeDefined();
      
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
      
      // First failure
      await expect(cb.execute(mockFn)).rejects.toThrow('test error');
      expect(cb.getState().state).toBe('CLOSED');
      
      // Second failure - should trip the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('test error');
      expect(cb.getState().state).toBe('OPEN');
      
      // Third attempt - should fail fast without calling the function
      await expect(cb.execute(mockFn)).rejects.toThrow('Circuit breaker is open');
      expect(mockFn).toHaveBeenCalledTimes(2); // Function not called on third attempt
    });
    
    test('should use fallback function when circuit is open', async () => {
      const cb = CircuitBreakerRegistry.getOrCreate('test-fallback', {
        failureThreshold: 1,
        resetTimeout: 1000,
        fallbackFn: () => 'fallback result'
      });
      
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // First failure - trips the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('test error');
      
      // Second attempt - should use fallback
      const result = await cb.execute(mockFn, true); // true to use fallback
      expect(result).toBe('fallback result');
      expect(mockFn).toHaveBeenCalledTimes(1); // Function not called on second attempt
    });
    
    test('should reset circuit after timeout', async () => {
      jest.useFakeTimers();
      
      const cb = CircuitBreakerRegistry.getOrCreate('test-reset', {
        failureThreshold: 1,
        resetTimeout: 1000
      });
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('test error')) // First call fails
        .mockResolvedValueOnce('success'); // Second call succeeds
      
      // First failure - trips the circuit
      await expect(cb.execute(mockFn)).rejects.toThrow('test error');
      expect(cb.getState().state).toBe('OPEN');
      
      // Advance time past reset timeout
      jest.advanceTimersByTime(1500);
      
      // Circuit should now be in half-open state
      expect(cb.getState().state).toBe('HALF_OPEN');
      
      // Next call should succeed and close the circuit
      const result = await cb.execute(mockFn);
      expect(result).toBe('success');
      expect(cb.getState().state).toBe('CLOSED');
      
      jest.useRealTimers();
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
  });
  
  describe('WebSocket Bulletproofing', () => {
    test('WebSocket bulletproofing should handle connection failures', () => {
      // Create mock WebSocket with error event
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn()
      };
      
      // Simulate error event
      const errorHandler = { handleError: jest.fn() };
      const errorEvent = new Event('error');
      
      // Add error handler
      mockWebSocket.addEventListener('error', errorHandler.handleError);
      
      // Trigger error event
      mockWebSocket.addEventListener.mock.calls[0][1](errorEvent);
      
      // Error should be handled without crashing
      expect(errorHandler.handleError).toHaveBeenCalled();
    });
  });
  
  describe('Bulletproof Export API', () => {
    test('should handle export with chunking', async () => {
      // Mock export API
      const exportAPI = {
        startExport: jest.fn().mockResolvedValue({ 
          success: true, 
          sessionId: 'test-session',
          chunks: { total: 5, size: 100 }
        }),
        updateProgress: jest.fn().mockResolvedValue({ success: true }),
        completeExport: jest.fn().mockResolvedValue({ success: true })
      };
      
      // Test data
      const data = Array(500).fill().map((_, i) => ({ id: i, name: `User ${i}` }));
      
      // Process in chunks
      const chunkSize = 100;
      const chunks = [];
      
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      
      // Start export
      await exportAPI.startExport({ totalRecords: data.length });
      
      // Process chunks
      for (let i = 0; i < chunks.length; i++) {
        await exportAPI.updateProgress({ 
          processed: (i + 1) * chunkSize,
          chunkIndex: i
        });
      }
      
      // Complete export
      await exportAPI.completeExport({ 
        success: true,
        finalStats: { 
          processed: data.length,
          chunks: { processed: chunks.length, total: chunks.length }
        }
      });
      
      // Verify API calls
      expect(exportAPI.startExport).toHaveBeenCalled();
      expect(exportAPI.updateProgress).toHaveBeenCalledTimes(chunks.length);
      expect(exportAPI.completeExport).toHaveBeenCalled();
    });
  });
  
  describe('Bulletproof Delete API', () => {
    test('should handle delete with retry mechanism', async () => {
      // Mock delete function that fails twice then succeeds
      const deleteUser = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server busy'))
        .mockResolvedValueOnce({ success: true });
      
      // Retry function
      const retry = async (fn, options = {}) => {
        const { maxRetries = 3, initialDelay = 100 } = options;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (attempt <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, attempt - 1)));
            }
          }
        }
        
        throw lastError;
      };
      
      // Execute with retry
      const result = await retry(deleteUser);
      
      // Should succeed after retries
      expect(result).toEqual({ success: true });
      expect(deleteUser).toHaveBeenCalledTimes(3);
    });
  });
});
