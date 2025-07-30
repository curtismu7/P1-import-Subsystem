import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Set up the DOM environment with necessary elements
const { window } = new JSDOM(`
  <!doctype html>
  <html>
    <head>
      <title>Test</title>
    </head>
    <body>
      <div id="app">
        <div id="status-bar"></div>
        <div id="progress-container">
          <div class="progress-bar"></div>
        </div>
      </div>
    </body>
  </html>
`, {
  url: 'http://localhost:4000',
  runScripts: 'dangerously'
});

global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock the ElementRegistry
class MockElementRegistry {
  constructor() {
    this.elements = new Map();
  }
  
  get(id) {
    if (!this.elements.has(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }
}

// Mock the safe logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  child: jest.fn().mockReturnThis()
};

// Mock the error manager
const mockErrorManager = {
  handleError: jest.fn()
};

// Mock the log manager
const mockLogManager = {
  getLogger: jest.fn().mockReturnValue(mockLogger)
};

// Mock the ElementRegistry import
jest.unstable_mockModule('../../public/js/modules/element-registry.js', () => ({
  ElementRegistry: MockElementRegistry
}));

// Mock the safe-logger import
jest.unstable_mockModule('../../../src/client/utils/safe-logger.js', () => ({
  createSafeLogger: jest.fn().mockImplementation(() => mockLogger)
}));

// Import the UIManager class after setting up the mocks
let UIManager;

beforeAll(async () => {
  // Import the module with mocks in place
  const UIManagerModule = await import('../../public/js/modules/ui-manager.js');
  UIManager = UIManagerModule.UIManager;
});

describe('UIManager', () => {
  let uiManager;
  let testElement;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a test element for the UI manager
    testElement = document.createElement('div');
    testElement.id = 'test-container';
    document.body.appendChild(testElement);
    
    // Create a new UIManager instance
    uiManager = new UIManager({
      errorManager: mockErrorManager,
      logManager: mockLogManager,
      instanceId: 'test-instance'
    });
  });

  afterEach(() => {
    // Clean up DOM after each test
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(uiManager).toBeDefined();
      expect(mockLogManager.getLogger).toHaveBeenCalledWith('UIManager');
      expect(uiManager.logger).toBeDefined();
      expect(uiManager.errorManager).toBe(mockErrorManager);
    });
  });

  describe('showStatus', () => {
    it('should show status message', () => {
      const message = 'Test status message';
      uiManager.showStatus(message);
      
      // Verify the status message was logged
      expect(mockLogger.info).toHaveBeenCalledWith('Status update', {
        message,
        type: 'info',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'development'
      });
      
      // Verify the status bar was updated if it exists
      const statusBar = document.getElementById('status-bar');
      if (statusBar) {
        expect(statusBar.textContent).toContain(message);
      }
    });

    it('should show error status with custom type', () => {
      const message = 'Error status';
      uiManager.showStatus(message, 'error');
      
      // Verify the error status was logged
      expect(mockLogger.error).toHaveBeenCalledWith('Status update', {
        message,
        type: 'error',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'development'
      });
    });
  });

  describe('updateProgress', () => {
    it('should update progress bar', () => {
      const progress = 50;
      const message = 'Processing...';
      
      uiManager.updateProgress(progress, message);
      
      // Verify progress was logged
      expect(mockLogger.debug).toHaveBeenCalledWith('Progress update', {
        progress,
        message,
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'development'
      });
      
      // Verify progress bar was updated if it exists
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) {
        expect(progressBar.style.width).toBe(`${progress}%`);
      }
    });
  });

  describe('showError', () => {
    it('should handle error with error object', () => {
      const error = new Error('Test error');
      const context = { operation: 'test' };
      
      uiManager.showError('Operation failed', { error, ...context });
      
      // Verify error was passed to error manager
      expect(mockErrorManager.handleError).toHaveBeenCalledWith(error, {
        message: 'Operation failed',
        ...context
      });
    });
    
    it('should handle error with string message', () => {
      const errorMessage = 'Test error message';
      
      uiManager.showError(errorMessage);
      
      // Verify error was passed to error manager
      expect(mockErrorManager.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        { message: errorMessage }
      );
    });
  });
  
  describe('showNotification', () => {
    it('should show notification with default type', () => {
      const message = 'Test notification';
      uiManager.showNotification(message);
      
      // Verify notification was logged
      expect(mockLogger.info).toHaveBeenCalledWith('Notification', {
        message,
        type: 'info',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'development'
      });
    });
    
    it('should show error notification', () => {
      const message = 'Error notification';
      uiManager.showNotification(message, 'error');
      
      // Verify error notification was logged
      expect(mockLogger.error).toHaveBeenCalledWith('Notification', {
        message,
        type: 'error',
        component: 'UIManager',
        instanceId: 'test-instance',
        env: 'development'
      });
    });
  });
});
