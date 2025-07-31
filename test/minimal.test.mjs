// Simple test to verify Jest setup
import { describe, it, expect } from '@jest/globals';

describe('Minimal Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });
});
