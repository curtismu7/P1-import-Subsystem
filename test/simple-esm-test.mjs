// Simple test file to verify Jest with ES modules
import { describe, it, expect } from '@jest/globals';

describe('Simple ESM Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle async/await', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should handle object spread', () => {
    const obj1 = { a: 1 };
    const obj2 = { ...obj1, b: 2 };
    expect(obj2).toEqual({ a: 1, b: 2 });
  });

  it('should handle optional chaining', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(obj?.a?.b?.c).toBe(1);
    expect(obj?.x?.y?.z).toBeUndefined();
  });
});
