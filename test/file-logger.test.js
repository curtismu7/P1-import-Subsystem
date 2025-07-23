import { test, expect, beforeEach, afterEach, jest as jestMock } from '@jest/globals';
import FileLogger from '../public/js/modules/file-logger.js';

describe('FileLogger', () => {
  let fileLogger;
  let mockFs;

  beforeEach(() => {
    // Mock the fs module
    mockFs = {
      appendFileSync: jestMock.fn(),
      existsSync: jestMock.fn(() => true),
      mkdirSync: jestMock.fn()
    };
    
    fileLogger = new FileLogger('test.log');
    fileLogger.fs = mockFs; // Inject mock
  });

  afterEach(() => {
    jestMock.clearAllMocks();
  });

  test('should create FileLogger instance', () => {
    expect(fileLogger).toBeInstanceOf(FileLogger);
    expect(fileLogger.filename).toBe('test.log');
  });

  test('should log message to file', () => {
    const message = 'Test message';
    fileLogger.log(message);

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      'test.log',
      expect.stringContaining(message)
    );
  });

  test('should format log message with timestamp', () => {
    const message = 'Test message';
    fileLogger.log(message);

    const logCall = mockFs.appendFileSync.mock.calls[0];
    const logMessage = logCall[1];

    expect(logMessage).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    expect(logMessage).toContain(message);
  });

  test('should log with different levels', () => {
    fileLogger.error('Error message');
    fileLogger.warn('Warning message');
    fileLogger.info('Info message');

    expect(mockFs.appendFileSync).toHaveBeenCalledTimes(3);
  });
});
