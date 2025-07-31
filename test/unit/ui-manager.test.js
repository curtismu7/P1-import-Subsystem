import { jest } from '@jest/globals';
import { setupBrowserEnv, setupFetchMock, waitFor, isVisible } from '../helpers/test-helper.js';

// Mock the safe-logger
jest.unstable_mockModule('../../src/client/utils/safe-logger.js', () => ({
  createSafeLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn()
  }))
}));

// Import UIManager after setting up mocks
const { UIManager } = await import('../../public/js/modules/ui-manager-fixed.js');

describe('UIManager', () => {
  let uiManager;
  let mockLogger;
  
  beforeEach(() => {
    // Setup browser environment
    setupBrowserEnv();
    setupFetchMock();
    
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn(() => mockLogger)
    };
    
    // Initialize UIManager with mock logger
    uiManager = new UIManager({
      logManager: {
        getLogger: () => mockLogger
      }
    });
    
    // Initialize UI elements
    document.body.innerHTML = `
      <div id="status-bar"></div>
      <div id="notification-container"></div>
      <div id="progress-container"></div>
    `;
    
    uiManager.initialize();
  });
  
  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(uiManager.statusBarElement).toBeDefined();
      expect(uiManager.notificationContainer).toBeDefined();
      expect(uiManager.progressContainer).toBeDefined();
    });
    
    test('should create status bar if it does not exist', () => {
      document.body.innerHTML = '';
      uiManager.initialize();
      
      const statusBar = document.getElementById('status-bar');
      expect(statusBar).toBeNull();
      
      uiManager.createStatusBar();
      const createdStatusBar = document.getElementById('status-bar');
      expect(createdStatusBar).not.toBeNull();
    });
  });
  
  describe('Status Bar', () => {
    test('should show status message', () => {
      const testMessage = 'Test status message';
      uiManager.showStatusBar(testMessage, 'info');
      
      const statusBar = document.getElementById('status-bar');
      expect(statusBar.textContent).toContain(testMessage);
      expect(isVisible(statusBar)).toBe(true);
    });
    
    test('should show different message types with appropriate styling', () => {
      const types = [
        { type: 'info', className: 'info' },
        { type: 'success', className: 'success' },
        { type: 'warning', className: 'warning' },
        { type: 'error', className: 'error' }
      ];
      
      types.forEach(({ type, className }) => {
        uiManager.showStatusBar(`${type} message`, type);
        const content = document.querySelector('.status-content');
        expect(content.classList.contains(className)).toBe(true);
      });
    });
    
    test('should clear status bar after delay', async () => {
      jest.useFakeTimers();
      
      uiManager.showStatusBar('Test message', 'info', { duration: 1000 });
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Wait for any pending promises
      await Promise.resolve();
      
      const statusBar = document.getElementById('status-bar');
      expect(statusBar.style.display).toBe('none');
      
      jest.useRealTimers();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle errors and show them in status bar', () => {
      const error = new Error('Test error');
      uiManager.handleError(error, { source: 'test' });
      
      // Check if error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          source: 'test',
          showInUI: true
        })
      );
      
      // Check if status bar shows error
      const statusBar = document.getElementById('status-bar');
      expect(statusBar.textContent).toContain('Test error');
      expect(statusBar.classList.contains('error')).toBe(true);
    });
  });
  
  describe('Cleanup', () => {
    test('should clean up resources', async () => {
      // Show something that needs cleanup
      uiManager.showStatusBar('Test message');
      
      // Add a timeout that would be cleared during cleanup
      uiManager.scheduleStatusBarClear(10000);
      
      // Run cleanup
      await uiManager.cleanup();
      
      // Verify cleanup
      expect(uiManager.statusBarTimeout).toBeNull();
      expect(document.getElementById('status-bar').style.display).toBe('none');
    });
  });
});
