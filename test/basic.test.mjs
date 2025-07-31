// Simple test to verify Jest setup with ES modules
import { describe, it, expect } from '@jest/globals';

// A simple utility function to test
function sum(a, b) {
  return a + b;
}

describe('Basic Test Suite', () => {
  it('should add two numbers correctly', () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(-1, 5)).toBe(4);
    expect(sum(0, 0)).toBe(0);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should work with ES modules', () => {
    const obj = { a: 1, b: 2 };
    const { a, b } = obj;
    expect(a).toBe(1);
    expect(b).toBe(2);
  });
});
