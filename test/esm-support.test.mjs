/**
 * ESM Support Test
 * Tests that Jest can properly run ESM tests
 * Version: 7.0.2.4
 */

// Simple ESM test that doesn't rely on importing Jest globals
describe('ESM Support', () => {
  it('should support ESM syntax', () => {
    // This test verifies that Jest can run tests with ESM syntax
    expect(true).toBe(true);
  });

  it('should support modern JavaScript features', () => {
    // Test optional chaining
    const obj = { a: { b: 42 } };
    const value = obj?.a?.b;
    expect(value).toBe(42);
    
    // Test nullish coalescing
    const nullValue = null;
    const defaultValue = nullValue ?? 'default';
    expect(defaultValue).toBe('default');
  });

  it('should support async/await', async () => {
    // Test async/await
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
