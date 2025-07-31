// Comprehensive tests for UIManager implementation
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock the DOM environment
const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:4000',
  runScripts: 'dangerously'
});

global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock the circular progress module
const mockCircularProgress = {
  createCircularProgress: jest.fn().mockReturnValue({
    update: jest.fn(),
    destroy: jest.fn()
  })
};

// Mock the element registry
class MockElementRegistry {
  constructor() {
    this.elements = new Map();
  }
  
  register(id, element) {
    this.elements.set(id, element);
    return element;
  }
  
  get(id) {
    return this.elements.get(id);
  }
  
  remove(id) {
    this.elements.delete(id);
  }
}

// Mock the progress manager
const mockProgressManager = {
  createProgressTracker: jest.fn().mockReturnValue({
    update: jest.fn(),
    complete: jest.fn(),
    error: jest.fn(),
    reset: jest.fn()
  })
};

// Mock error types
const mockErrorTypes = {
  VALIDATION: 'VALIDATION',
  NETWORK: 'NETWORK',
  API: 'API',
  UNKNOWN: 'UNKNOWN'
};

// Import the UIManager class with our mocks
const { UIManager } = await import('../../src/client/components/ui-manager.js');

// Mock the dependencies
const mockDependencies = {
  errorManager: {
    handleError: jest.fn()
  },
  logManager: {
    getLogger: () => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  },
  instanceId: 'test-instance',
  // Add other dependencies as needed
};

describe('UIManager (Comprehensive)', () => {
  let uiManager;
  let mockLogger;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up the document body with some test elements
    document.body.innerHTML = `
      <div id="app">
        <div id="status-message"></div>
        <div id="progress-container"></div>
        <div id="notification-area"></div>
      </div>
    `;
    
    // Create a fresh logger for each test
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    // Create a new UIManager instance with mocks
    uiManager = new UIManager({
      ...mockDependencies,
      logManager: { getLogger: () => mockLogger }
    });
  });
  
  afterEach(() => {
    // Clean up any event listeners or timers
    jest.clearAllTimers();
  });
  
  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(uiManager).toBeDefined();
      expect(uiManager.instanceId).toBe('test-instance');
    });
    
    it('should initialize with custom options', () => {
      const customManager = new UIManager({
        ...mockDependencies,
        instanceId: 'custom-instance',
        debug: true
      });
      
      expect(customManager.instanceId).toBe('custom-instance');
      expect(customManager.debug).toBe(true);
    });
  });
  
  describe('Status Management', () => {
    it('should show status messages', () => {
      const testMessage = 'Test status message';
      uiManager.showStatus(testMessage);
      
      // Check if the status message was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Status update',
        expect.objectContaining({
          message: testMessage,
          component: 'UIManager',
          instanceId: 'test-instance'
        })
      );
    });
    
    it('should show error status messages', () => {
      const errorMessage = 'Test error message';
      uiManager.showStatus(errorMessage, 'error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Status update',
        expect.objectContaining({
          message: errorMessage,
          type: 'error',
          component: 'UIManager',
          instanceId: 'test-instance'
        })
      );
    });
  });
  
  describe('Progress Tracking', () => {
    it('should update progress', () => {
      const progress = 50;
      const message = 'Halfway there';
      
      uiManager.updateProgress(progress, message);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Progress update',
        expect.objectContaining({
          progress,
          message,
          component: 'UIManager',
          instanceId: 'test-instance'
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors with error objects', () => {
      const error = new Error('Test error');
      const context = { operation: 'test' };
      
      uiManager.showError('Operation failed', { error, ...context });
      
      expect(mockDependencies.errorManager.handleError).toHaveBeenCalledWith(
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
      
      // The first argument to handleError should be an Error object
      const errorArg = mockDependencies.errorManager.handleError.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe(errorMessage);
    });
  });
  
  describe('Notifications', () => {
    it('should show info notifications', () => {
      const message = 'Test info notification';
      uiManager.showNotification(message);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notification',
        expect.objectContaining({
          message,
          type: 'info',
          component: 'UIManager',
          instanceId: 'test-instance'
        })
      );
    });
    
    it('should show error notifications', () => {
      const message = 'Test error notification';
      uiManager.showNotification(message, 'error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notification',
        expect.objectContaining({
          message,
          type: 'error',
          component: 'UIManager',
          instanceId: 'test-instance'
        })
      );
    });
  });
});
