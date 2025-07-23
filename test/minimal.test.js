import { test, expect, jest as jestMock } from '@jest/globals';

/**
 * Minimal test to verify Jest setup and basic functionality
 */

test('Basic Jest functionality', () => {
  expect(true).toBe(true);
  expect(1 + 1).toBe(2);
  expect('hello').toBe('hello');
});

test('Array operations', () => {
  const arr = [1, 2, 3];
  expect(arr).toHaveLength(3);
  expect(arr).toContain(2);
  expect(arr[0]).toBe(1);
});

test('Object operations', () => {
  const obj = { name: 'test', value: 42 };
  expect(obj).toHaveProperty('name');
  expect(obj.name).toBe('test');
  expect(obj.value).toBe(42);
});

test('Mock functionality', () => {
  const mockFn = jestMock.fn();
  mockFn('arg1', 'arg2');
  
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  expect(mockFn).toHaveBeenCalledTimes(1);
});

test('Promise handling', async () => {
  const promise = Promise.resolve('resolved');
  await expect(promise).resolves.toBe('resolved');
});

test('Error handling', () => {
  const throwError = () => {
    throw new Error('Test error');
  };
  
  expect(throwError).toThrow('Test error');
  expect(throwError).toThrow(Error);
});
