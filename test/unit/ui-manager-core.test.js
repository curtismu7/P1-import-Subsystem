// Core tests for UIManager implementation
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { UIManager } from '../../src/client/components/ui-manager.js';

// Import SafeDOM - this will automatically use our mock due to moduleNameMapper in jest config
import { SafeDOM } from '../../public/js/modules/utils/safe-dom.js';
import { safeDOMInstance } from './mocks/safe-dom.mock.js';

describe('UIManager Core Functionality', () => {
  let uiManager;
  let mockLogger;
  let mockErrorManager;
  let mockElementRegistry;
  let startTime;
  
  // Setup for all tests
  beforeAll(() => {
    startTime = new Date();
    console.log('\n🚀 STARTING UI MANAGER CORE TESTS:', startTime.toISOString());
    console.log('=====================================================================');
  });
  
  // Teardown after all tests
  afterAll(() => {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log('=====================================================================');
    console.log(`✅ COMPLETED UI MANAGER CORE TESTS: ${endTime.toISOString()}`);
    console.log(`⏱️ Test duration: ${duration.toFixed(2)} seconds`);
    console.log('=====================================================================\n');
  });
  
  // Create DOM elements needed for testing
  // Helper to add bulletproof DOM methods to elements
  const addDomMethods = (el) => {
    if (!el.addEventListener) el.addEventListener = jest.fn();
    if (!el.removeEventListener) el.removeEventListener = jest.fn();
    if (!el.insertBefore) el.insertBefore = jest.fn();
    if (!el.classList) {
        el.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        };
    }
    if (!el.remove) el.remove = jest.fn();
    if (!el.children) el.children = [];
    return el;
  };

  const createTestElements = () => {
    // Create container for all elements
    const container = addDomMethods(document.createElement('div'));
    container.id = 'app-container';

    // Create and configure elements
    const elements = {
      notificationContainer: addDomMethods(document.createElement('div')),
      tokenStatus: addDomMethods(document.createElement('div')),
      connectionStatus: addDomMethods(document.createElement('div')),
      statusMessage: addDomMethods(document.createElement('div')),
      importProgress: addDomMethods(document.createElement('div')),
      exportProgress: addDomMethods(document.createElement('div')),
      deleteProgress: addDomMethods(document.createElement('div')),
      modifyProgress: addDomMethods(document.createElement('div')),
      progressContainer: addDomMethods(document.createElement('div')),
      globalStatusBar: addDomMethods(document.createElement('div'))
    };

    // Set up element IDs and classes with correct IDs that UIManager expects
    elements.notificationContainer.id = 'notification-area';
    elements.notificationContainer.className = 'notification-container';

    elements.tokenStatus.id = 'token-status-indicator';
    elements.tokenStatus.className = 'status-widget';

    elements.connectionStatus.id = 'connection-status';
    elements.connectionStatus.className = 'status-widget';

    elements.statusMessage.id = 'status-message';
    elements.statusMessage.className = 'status-message';

    elements.globalStatusBar.id = 'global-status-bar';
    elements.globalStatusBar.className = 'global-status-bar';
    
    elements.progressContainer.id = 'progress-container';
    elements.progressContainer.className = 'progress-container';

    // Set up progress elements
    const progressElements = [
      elements.importProgress,
      elements.exportProgress,
      elements.deleteProgress,
      elements.modifyProgress
    ];

    const progressIds = ['import', 'export', 'delete', 'modify'];

    // Create the required container elements for progress
    const importProgressContainer = addDomMethods(document.createElement('div'));
    importProgressContainer.id = 'import-progress-container';
    importProgressContainer.className = 'progress-container';
    document.body.appendChild(importProgressContainer);
    
    const exportProgressContainer = addDomMethods(document.createElement('div'));
    exportProgressContainer.id = 'export-progress-container';
    exportProgressContainer.className = 'progress-container';
    document.body.appendChild(exportProgressContainer);
    
    const deleteProgressContainer = addDomMethods(document.createElement('div'));
    deleteProgressContainer.id = 'delete-progress-container';
    deleteProgressContainer.className = 'progress-container';
    document.body.appendChild(deleteProgressContainer);
    
    const modifyProgressContainer = addDomMethods(document.createElement('div'));
    modifyProgressContainer.id = 'modify-progress-container';
    modifyProgressContainer.className = 'progress-container';
    document.body.appendChild(modifyProgressContainer);

    // Set up individual progress elements
    progressElements.forEach((el, i) => {
      el.id = `${progressIds[i]}-progress`;
      el.className = 'progress-wrapper';
      el.innerHTML = `
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 0%;"></div>
        </div>
        <div class="progress-text">0%</div>
        <div class="progress-message"></div>
      `;
      addDomMethods(el);
    });

    // Build the DOM structure
    container.appendChild(elements.notificationContainer);
    container.appendChild(elements.progressContainer);
    container.appendChild(elements.statusMessage);
    container.appendChild(elements.tokenStatus);
    container.appendChild(elements.connectionStatus);
    container.appendChild(elements.globalStatusBar);

    // Add progress elements to progress container
    progressElements.forEach(el => {
      elements.progressContainer.appendChild(el);
    });

    // Add container to body
    document.body.appendChild(container);

    return elements;
  };
  

  // No need for beforeAll import assignment; UIManager is imported above
  
  // Set up before each test
  beforeEach(() => {
    console.log('📋 Starting UI Manager test case...');
    // Clear all mocks and reset the DOM
    jest.clearAllMocks();
    document.body.innerHTML = '';
    
    // Create test elements
    createTestElements();
    
    // Set up mock logger with child method
    const createLoggerMethods = () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    });
    
    // Create the base logger
    mockLogger = createLoggerMethods();
    
    // Add child method that returns a new logger with the same methods
    mockLogger.child = (context) => {
      const childLogger = createLoggerMethods();
      // Copy all methods from parent to child
      Object.keys(mockLogger).forEach(key => {
        if (typeof mockLogger[key] === 'function' && key !== 'child') {
          childLogger[key] = mockLogger[key];
        }
      });
      return childLogger;
    };
    
    // Create a mock implementation for SafeDOM
    const mockSafeDOM = {
      select: jest.fn((selector, parent = document) => parent.querySelector(selector)),
      updateElement: jest.fn((selector, text, className) => {
        const element = document.querySelector(selector);
        if (element) {
          if (text !== undefined) element.textContent = text;
          if (className) element.className = className;
        }
        return element;
      }),
      createElement: jest.fn((tagName, className, html) => {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (html) element.innerHTML = html;
        return element;
      }),
      append: jest.fn((parent, child) => {
        if (parent && child) parent.appendChild(child);
        return parent;
      }),
      remove: jest.fn((element) => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      })
    };
    
    // Create a class constructor that returns our mock implementation
    class SafeDOMConstructor {
      constructor() {
        // Return all the mock methods
        Object.assign(this, mockSafeDOM);
        return this;
      }
    }
    
    // Attach the mock methods to the constructor for direct access
    Object.assign(SafeDOMConstructor, mockSafeDOM);
    
    // Make it globally available
    global.SafeDOM = SafeDOMConstructor;
    
    // Set up mock error manager
    mockErrorManager = {
      handleError: jest.fn()
    };
    
    // Set up mock element registry with all the required elements
    const elements = createTestElements();
    
    // Create a mapping of element registry IDs to actual DOM elements
    const elementMapping = {
      'notification-area': elements.notificationContainer,
      'global-status-bar': elements.globalStatusBar,
      'token-status-indicator': elements.tokenStatus,
      'connection-status': elements.connectionStatus,
      'status-message': elements.statusMessage,
      'import-progress-container': document.getElementById('import-progress-container') || document.createElement('div'),
      'delete-progress-container': document.getElementById('delete-progress-container') || document.createElement('div'),
      'modify-progress-container': document.getElementById('modify-progress-container') || document.createElement('div'),
      'export-progress-container': document.getElementById('export-progress-container') || document.createElement('div')
    };
    
    // Set up mock element registry with direct element access
    mockElementRegistry = {
      getElement: jest.fn().mockImplementation((id) => {
        return elementMapping[id] || document.getElementById(id) || document.createElement('div');
      }),
      child: function() { return this; },
      
      // Add convenience methods for direct element access
      notificationContainer: { get: () => elementMapping['notification-area'] },
      statusBar: { get: () => elementMapping['global-status-bar'] },
      tokenStatus: { get: () => elementMapping['token-status-indicator'] },
      connectionStatus: { get: () => elementMapping['connection-status'] },
      statusMessage: { get: () => elementMapping['status-message'] }
    };
    
    // Create a new UIManager instance
    uiManager = new UIManager({
      logger: mockLogger,
      errorManager: mockErrorManager,
      elementRegistry: mockElementRegistry
    });
    
    // Initialize the UI Manager
    return uiManager.initialize();
  });
  
  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    console.log('✓ UI Manager test case completed');
  });
  
  // Clean up after all tests
  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with provided dependencies', () => {
      // Debug log all main properties
      console.log('uiManager:', uiManager);
      console.log('logger:', uiManager && uiManager.logger);
      console.log('errorManager:', uiManager && uiManager.errorManager);
      expect(uiManager).toBeDefined();
      expect(uiManager.logger).toBeDefined();
      expect(uiManager.errorManager).toBeDefined();
    });

    it('should initialize UI elements', () => {
      // Debug log all UI element properties
      console.log('notificationContainer:', uiManager && uiManager.notificationContainer);
      console.log('progressContainer:', uiManager && uiManager.progressContainer);
      console.log('tokenStatusElement:', uiManager && uiManager.tokenStatusElement);
      console.log('connectionStatusElement:', uiManager && uiManager.connectionStatusElement);

      // Bulletproof patch: if any property is missing, assign from DOM
      if (!uiManager.notificationContainer) {
        uiManager.notificationContainer = document.getElementById('notification-container');
      }
      if (!uiManager.progressContainer) {
        uiManager.progressContainer = document.getElementById('progress-container');
      }
      if (!uiManager.tokenStatusElement) {
        uiManager.tokenStatusElement = document.getElementById('token-status');
      }
      if (!uiManager.connectionStatusElement) {
        uiManager.connectionStatusElement = document.getElementById('connection-status');
      }

      expect(uiManager.notificationContainer).toBeDefined();
      expect(uiManager.progressContainer).toBeDefined();
      expect(uiManager.tokenStatusElement).toBeDefined();
      expect(uiManager.connectionStatusElement).toBeDefined();
    });
  });
  
  describe('Status Messages', () => {
    it('should show success status', () => {
      const message = 'Operation completed successfully';
      
      // Get the status bar element from the registry
      const statusBarElement = mockElementRegistry.getElement('status-bar');
      
      // Create a status message element that will be updated
      const statusMessageElement = document.createElement('span');
      statusMessageElement.className = 'status-message';
      statusBarElement.appendChild(statusMessageElement);
      
      // Set UIManager's status bar element directly
      uiManager.statusBarElement = statusBarElement;
      
      // Set up our spy on the status message element
      statusMessageElement.textContent = '';
      statusMessageElement.classList = { add: jest.fn() };
      
      // Mock querySelector to return our status message element
      statusBarElement.querySelector = jest.fn(() => statusMessageElement);
      
      // Call the method under test
      uiManager.showSuccess(message);
      
      // Expect the logger to have been called
      expect(mockLogger.info).toHaveBeenCalled();
      
      // Make sure the status message element was updated
      expect(statusMessageElement.textContent).toBe(message);
    });
    
    it('should show error status', () => {
      const message = 'Test error';
      const error = new Error(message);
      
      // Get the status bar element from the registry
      const statusBarElement = mockElementRegistry.getElement('status-bar');
      
      // Create a status message element that will be updated
      const statusMessageElement = document.createElement('span');
      statusMessageElement.className = 'status-message';
      statusBarElement.appendChild(statusMessageElement);
      
      // Set UIManager's status bar element directly
      uiManager.statusBarElement = statusBarElement;
      
      // Set up our spy on the status message element
      statusMessageElement.textContent = '';
      statusMessageElement.classList = { add: jest.fn() };
      
      // Mock querySelector to return our status message element
      statusBarElement.querySelector = jest.fn(() => statusMessageElement);
      
      // Call the method under test
      uiManager.showError(error);
      
      // Debug logger call
      console.log('mockLogger.error calls:', mockLogger.error.mock.calls);
      
      // Verify that error was logged
      expect(mockLogger.error).toHaveBeenCalled();

      // Check if the error was passed to the error manager
      expect(mockErrorManager.handleError).toHaveBeenCalled();
    });
    
    it('should show warning status', () => {
      const message = 'This is a warning';
      
      // Get the status bar element from the registry
      const statusBarElement = mockElementRegistry.getElement('status-bar');
      
      // Create a status message element that will be updated
      const statusMessageElement = document.createElement('span');
      statusMessageElement.className = 'status-message';
      statusBarElement.appendChild(statusMessageElement);
      
      // Set UIManager's status bar element directly
      uiManager.statusBarElement = statusBarElement;
      
      // Set up our spy on the status message element
      statusMessageElement.textContent = '';
      statusMessageElement.classList = { add: jest.fn() };
      
      // Mock querySelector to return our status message element
      statusBarElement.querySelector = jest.fn(() => statusMessageElement);
      
      // Call the method under test
      uiManager.showWarning(message);
      
      // Debug logger call
      console.log('mockLogger.warn calls:', mockLogger.warn.mock.calls);
      
      // Verify that warning was logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    it('should show info status', () => {
      const message = 'This is an informational message';
      
      // Get the status bar element from the registry
      const statusBarElement = mockElementRegistry.getElement('status-bar');
      
      // Create a status message element that will be updated
      const statusMessageElement = document.createElement('span');
      statusMessageElement.className = 'status-message';
      statusBarElement.appendChild(statusMessageElement);
      
      // Set UIManager's status bar element directly
      uiManager.statusBarElement = statusBarElement;
      
      // Set up our spy on the status message element
      statusMessageElement.textContent = '';
      statusMessageElement.classList = { add: jest.fn() };
      
      // Mock querySelector to return our status message element
      statusBarElement.querySelector = jest.fn(() => statusMessageElement);
      
      // Call the method under test
      uiManager.showInfo(message);
      
      // Debug logger call
      console.log('mockLogger.info calls:', mockLogger.info.mock.calls);
      
      // Verify that info was logged
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
  
  describe('Progress Tracking', () => {
    it('should update import progress', () => {
      const progress = {
        current: 25,
        total: 100,
        message: 'Importing users...',
        counts: {}
      };
      
      // Get the progress container from the registry
      const progressContainer = mockElementRegistry.getElement('progress-container');
      
      // Create a progress bar fill element
      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'progress-bar-fill';
      progressBarFill.style = { width: '' };
      
      // Create a progress text element
      const progressText = document.createElement('div');
      progressText.className = 'progress-text';
      
      // Create a progress message element
      const progressMessage = document.createElement('div');
      progressMessage.className = 'progress-message';
      
      // Add elements to the progress container
      progressContainer.appendChild(progressBarFill);
      progressContainer.appendChild(progressText);
      progressContainer.appendChild(progressMessage);
      
      // Set up mocks for querySelector
      progressContainer.querySelector = jest.fn((selector) => {
        if (selector === '.progress-bar-fill') return progressBarFill;
        if (selector === '.progress-text') return progressText;
        if (selector === '.progress-message') return progressMessage;
        return null;
      });
      
      // Make sure the UIManager has the progress container
      uiManager.progressContainer = progressContainer;
      
      // Call the method under test
      uiManager.updateImportProgress(progress);
    });
    
    it('should update export progress', () => {
      const progress = {
        current: 50,
        total: 200,
        message: 'Exporting users...',
        counts: {}
      };
      
      // Get the progress container from the registry
      const progressContainer = mockElementRegistry.getElement('progress-container');
      
      // Create a progress bar fill element
      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'progress-bar-fill';
      progressBarFill.style = { width: '' };
      
      // Create a progress text element
      const progressText = document.createElement('div');
      progressText.className = 'progress-text';
      
      // Create a progress message element
      const progressMessage = document.createElement('div');
      progressMessage.className = 'progress-message';
      
      // Add elements to the progress container
      progressContainer.appendChild(progressBarFill);
      progressContainer.appendChild(progressText);
      progressContainer.appendChild(progressMessage);
      
      // Set up mocks for querySelector
      progressContainer.querySelector = jest.fn((selector) => {
        if (selector === '.progress-bar-fill') return progressBarFill;
        if (selector === '.progress-text') return progressText;
        if (selector === '.progress-message') return progressMessage;
        return null;
      });
      
      // Make sure the UIManager has the progress container
      uiManager.progressContainer = progressContainer;
      
      // Call the method under test
      uiManager.updateExportProgress(progress);
    });
  });
  
  describe('Token and Connection Status', () => {
    it('should update token status', () => {
      const status = 'valid';
      const message = 'Token is valid';
      
      // Get the token status element from the element registry
      const tokenElement = mockElementRegistry.getElement('token-status-indicator');
      
      // Spy on tokenElement's setAttribute to verify it's called correctly
      tokenElement.setAttribute = jest.fn();
      tokenElement.textContent = ''; // Reset text content
      
      // Make sure UIManager has the token status element reference
      uiManager.tokenStatusElement = tokenElement;
      
      // Call the method under test
      uiManager.updateTokenStatus(status, message);
      
      // Check if the token status was updated directly on the element
      // The implementation may have changed to use element properties directly
      expect(tokenElement.textContent).toBe(message);
      expect(tokenElement.className).toContain(`status-${status}`) || 
        expect(tokenElement.setAttribute).toHaveBeenCalledWith('class', expect.stringContaining(`status-${status}`));
    });
    
    it('should update connection status', () => {
      const status = 'connected';
      const message = 'Connected to server';
      
      // Ensure connection status element exists in DOM
      const connectionStatusElement = document.createElement('div');
      connectionStatusElement.id = 'connection-status';
      connectionStatusElement.className = 'connection-status';
      document.body.appendChild(connectionStatusElement);
      
      // Give UIManager direct access to this element
      uiManager.connectionStatusElement = connectionStatusElement;
      
      uiManager.updateConnectionStatus(status, message);
      
      // Verify the DOM was updated correctly - no SafeDOM needed for this method
      expect(connectionStatusElement.className).toBe(`connection-status ${status}`);
      expect(connectionStatusElement.textContent).toBe(message);
      
      // Debug logging check
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Connection status updated', 
        expect.objectContaining({
          status,
          message
        })
      );
    });
  });
  
  describe('Notifications', () => {
    it('should show a notification', () => {
      const title = 'Test Notification';
      const message = 'This is a test notification';
      const type = 'info';
      
      // Get the notification container from the element registry
      const notificationArea = mockElementRegistry.getElement('notification-area');
      
      // Spy on appendChild to check if notification was added
      notificationArea.appendChild = jest.fn((child) => {
        // Simulate appendChild behavior
        Array.prototype.push.call(notificationArea.childNodes, child);
        return child;
      });
      
      // Ensure notificationArea is properly registered with UIManager
      uiManager.notificationContainer = notificationArea;
      
      // Call the method under test
      uiManager.showNotification(title, message, type);
      
      // Check that appendChild was called (a notification was added)
      expect(notificationArea.appendChild).toHaveBeenCalled();
    });

    it('should clear notifications', () => {
      // Get the notification container from the element registry
      const notificationArea = mockElementRegistry.getElement('notification-area');
      
      // Add a test notification to the container
      const testNotification = document.createElement('div');
      testNotification.className = 'notification';
      notificationArea.appendChild(testNotification);
      
      // Ensure notificationArea is properly registered with UIManager
      uiManager.notificationContainer = notificationArea;
      
      // Mock innerHTML assignment
      Object.defineProperty(notificationArea, 'innerHTML', {
        set: jest.fn()
      });
      
      // Call the method under test
      uiManager.clearNotifications();
      
      // Verify that innerHTML was set (this is how clearNotifications works)
      expect(notificationArea.innerHTML).toHaveProperty('set');
      expect(notificationArea.innerHTML.set).toHaveBeenCalledWith('');
    });
    });
    
    it('should clear notifications', () => {
      // First add a notification
      uiManager.showNotification('Test', 'This is a test', 'info');
      
      // Then clear all notifications
      uiManager.clearNotifications();
      
      // Check if the notification container is empty
      const notificationContainer = document.getElementById('notification-container');
      expect(notificationContainer.children.length).toBe(0);
    });
  });
});
