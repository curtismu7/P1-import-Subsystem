import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Set up the DOM environment
const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:4000'
});

global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock the safe logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the UIManager dependencies
const mockDependencies = {
  errorManager: {
    handleError: jest.fn()
  },
  logManager: {
    getLogger: () => mockLogger
  },
  instanceId: 'test-instance'
};

// Import the UIManager after setting up the mocks
import { UIManager } from '../../public/js/modules/ui-manager.js';

describe('UIManager', () => {
  let uiManager;
  
  beforeEach(() => {
    // Reset the DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="view-container"></div>
        <div id="notification-area"></div>
        <div id="status-bar"></div>
        <div id="progress-container">
          <div class="progress">
            <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
      </div>
    `;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance of UIManager for each test
    uiManager = new UIManager(mockDependencies);
  });
  
  describe('initialize', () => {
    it('should initialize with the provided elements', () => {
      const options = {
        viewContainer: document.getElementById('view-container'),
        notificationArea: document.getElementById('notification-area'),
        statusBar: document.getElementById('status-bar'),
        progressContainer: document.getElementById('progress-container')
      };
      
      uiManager.initialize(options);
      
      expect(uiManager.viewContainer).toBe(options.viewContainer);
      expect(uiManager.notificationArea).toBe(options.notificationArea);
      expect(uiManager.statusBar).toBe(options.statusBar);
      expect(uiManager.progressContainer).toBe(options.progressContainer);
    });
  });
  
  describe('showStatus', () => {
    beforeEach(() => {
      // Initialize with required elements
      uiManager.initialize({
        statusBar: document.getElementById('status-bar')
      });
    });
    
    it('should update the status bar with the provided message and type', () => {
      const message = 'Test message';
      const type = 'info';
      
      uiManager.showStatus(message, type);
      
      const statusBar = document.getElementById('status-bar');
      expect(statusBar.textContent).toContain(message);
      expect(statusBar.className).toContain(`status-${type}`);
    });
    
    it('should default to info type if no type is provided', () => {
      const message = 'Test message';
      
      uiManager.showStatus(message);
      
      const statusBar = document.getElementById('status-bar');
      expect(statusBar.className).toContain('status-info');
    });
  });
  
  describe('updateProgress', () => {
    beforeEach(() => {
      // Initialize with required elements
      uiManager.initialize({
        progressContainer: document.getElementById('progress-container')
      });
    });
    
    it('should update the progress bar with the specified percentage', () => {
      const percentage = 50;
      
      uiManager.updateProgress(percentage);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar.style.width).toBe(`${percentage}%`);
      expect(progressBar.getAttribute('aria-valuenow')).toBe(percentage.toString());
    });
    
    it('should handle values below 0 by setting to 0', () => {
      uiManager.updateProgress(-10);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar.style.width).toBe('0%');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0');
    });
    
    it('should handle values above 100 by setting to 100', () => {
      uiManager.updateProgress(150);
      
      const progressBar = document.querySelector('.progress-bar');
      expect(progressBar.style.width).toBe('100%');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
    });
  });
});
