// Simple test to verify Jest setup with ES modules
import { describe, it, expect } from '@jest/globals';

describe('Simple Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
  
  it('should work with ES modules', () => {
    const obj = { a: 1 };
    const { a } = obj;
    expect(a).toBe(1);
  });
});
