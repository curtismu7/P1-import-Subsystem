import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Set up the DOM environment
const { window } = new JSDOM('<!doctype html><html><body><div id="log-container"></div></body></html>', {
  url: 'http://localhost:4000'
});

global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock the winston logger
const mockWinstonLogger = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the winston-logger module
jest.unstable_mockModule('../../src/client/utils/winston-logger.js', () => ({
  createWinstonLogger: jest.fn().mockImplementation(() => mockWinstonLogger)
}));

// Mock the UI manager
const mockUIManager = {
  logToUI: jest.fn(),
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn()
};

// Set up the window.app object for UI manager
global.window.app = { uiManager: mockUIManager };

// Import the Logger class after setting up mocks
let Logger;

beforeAll(async () => {
  // Import the module with mocks in place
  const LoggerModule = await import('../../src/client/utils/logger.js');
  Logger = LoggerModule.Logger;
});

describe('Logger', () => {
  let logger;
  let logElement;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a new log element for each test
    logElement = document.createElement('div');
    logElement.id = 'test-log';
    document.body.appendChild(logElement);
    
    // Create a new logger instance
    logger = new Logger(logElement);
  });

  afterEach(() => {
    // Clean up DOM after each test
    if (logElement && logElement.parentNode) {
      logElement.parentNode.removeChild(logElement);
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(logger.logs).toEqual([]);
      expect(logger.validCount).toBe(0);
      expect(logger.errorCount).toBe(0);
      expect(logger.initialized).toBe(true);
      expect(logger.serverLoggingEnabled).toBe(true);
    });

    it('should create a winston logger instance', () => {
      const { createWinstonLogger } = await import('../../src/client/utils/winston-logger.js');
      expect(createWinstonLogger).toHaveBeenCalledWith({
        service: 'pingone-import-frontend',
        environment: 'test',
        enableServerLogging: true,
        enableConsoleLogging: true
      });
    });
  });

  describe('log methods', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      logger.info(message);
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, undefined);
      expect(mockUIManager.logToUI).toHaveBeenCalledWith(message, 'info');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Test error', error);
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Test error', error);
      expect(mockUIManager.showError).toHaveBeenCalledWith('Test error', {
        error: error,
        autoDismiss: false
      });
    });

    it('should log warning messages', () => {
      const message = 'Test warning';
      logger.warn(message);
      
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, undefined);
      expect(mockUIManager.showWarning).toHaveBeenCalledWith(message);
    });

    it('should log debug messages in development', () => {
      const message = 'Debug message';
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      logger.debug(message);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, undefined);
      
      // Clean up
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('log counting', () => {
    it('should count valid logs', () => {
      logger.info('Test message 1');
      logger.info('Test message 2');
      
      expect(logger.validCount).toBe(2);
      expect(logger.errorCount).toBe(0);
    });

    it('should count error logs', () => {
      logger.error('Error 1');
      logger.error('Error 2');
      
      expect(logger.errorCount).toBe(2);
    });
  });

  describe('log clearing', () => {
    it('should clear logs', () => {
      logger.info('Test message');
      logger.clearLogs();
      
      expect(logger.logs).toEqual([]);
      expect(logElement.innerHTML).toBe('');
    });
  });
});
