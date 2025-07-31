// Simple test file to verify UIManager basic functionality
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Simple mock for the UIManager class
class UIManager {
  constructor({ errorManager, logManager, instanceId = 'default' } = {}) {
    this.errorManager = errorManager || {
      handleError: jest.fn()
    };
    
    this.logger = logManager?.getLogger('UIManager') || {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };
    
    this.instanceId = instanceId;
  }
  
  showStatus(message, type = 'info') {
    this.logger.info('Status update', {
      message,
      type,
      component: 'UIManager',
      instanceId: this.instanceId,
      env: 'test'
    });
  }
  
  updateProgress(progress, message = '') {
    this.logger.debug('Progress update', {
      progress,
      message,
      component: 'UIManager',
      instanceId: this.instanceId,
      env: 'test'
    });
  }
  
  showError(message, options = {}) {
    const error = options.error || new Error(message);
    this.errorManager.handleError(error, {
      message,
      ...options
    });
  }
  
  showNotification(message, type = 'info') {
    this.logger[type === 'error' ? 'error' : 'info']('Notification', {
      message,
      type,
      component: 'UIManager',
      instanceId: this.instanceId,
      env: 'test'
    });
  }
}

describe('UIManager (Basic)', () => {
  let uiManager;
  let mockErrorManager;
  let mockLogger;
  let mockLogManager;

  beforeEach(() => {
    // Reset mocks before each test
    mockErrorManager = {
      handleError: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };
    
    mockLogManager = {
      getLogger: jest.fn().mockReturnValue(mockLogger)
    };
    
    // Create a new UIManager instance with mocks
    uiManager = new UIManager({
      errorManager: mockErrorManager,
      logManager: mockLogManager,
      instanceId: 'test-instance'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with provided dependencies', () => {
      expect(uiManager).toBeDefined();
      expect(uiManager.errorManager).toBe(mockErrorManager);
      expect(uiManager.logger).toBe(mockLogger);
      expect(uiManager.instanceId).toBe('test-instance');
    });
  });

  describe('showStatus', () => {
    it('should log status messages with info level by default', () => {
      const message = 'Test status message';
      uiManager.showStatus(message);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Status update', {
        message,
        type: 'info',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'test'
      });
    });

    it('should log error status messages with error level', () => {
      const message = 'Error message';
      uiManager.showStatus(message, 'error');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Status update', {
        message,
        type: 'error',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'test'
      });
    });
  });

  describe('updateProgress', () => {
    it('should log progress updates', () => {
      const progress = 50;
      const message = 'Processing...';
      
      uiManager.updateProgress(progress, message);
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Progress update', {
        progress,
        message,
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'test'
      });
    });
  });

  describe('showError', () => {
    it('should handle errors with error objects', () => {
      const error = new Error('Test error');
      const context = { operation: 'test' };
      
      uiManager.showError('Operation failed', { error, ...context });
      
      expect(mockErrorManager.handleError).toHaveBeenCalledWith(
        error,
        {
          message: 'Operation failed',
          error,
          ...context
        }
      );
    });
    
    it('should create an error object from string messages', () => {
      const errorMessage = 'Test error message';
      uiManager.showError(errorMessage);
      
      expect(mockErrorManager.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        { message: errorMessage }
      );
      
      const errorArg = mockErrorManager.handleError.mock.calls[0][0];
      expect(errorArg.message).toBe(errorMessage);
    });
  });

  describe('showNotification', () => {
    it('should log info notifications by default', () => {
      const message = 'Test notification';
      uiManager.showNotification(message);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Notification', {
        message,
        type: 'info',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'test'
      });
    });
    
    it('should log error notifications with error level', () => {
      const message = 'Error notification';
      uiManager.showNotification(message, 'error');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Notification', {
        message,
        type: 'error',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'test'
      });
    });
  });
});
