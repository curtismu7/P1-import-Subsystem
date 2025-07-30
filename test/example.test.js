import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Example Test Suite', () => {
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
    jest.clearAllMocks();
  });

  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should mock a function', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});
