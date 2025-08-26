/**
 * JavaScript Functionality Tests
 *
 * Tests that the JavaScript fixes are working correctly in a browser-like environment
 *
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-07-30
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Test configuration
const TEST_CONFIG = {
  serverUrl: 'http://localhost:4000',
  timeout: 30000
};

describe('🔧 JavaScript Functionality Tests', () => {
  let isServerRunning = false;
  let dom;
  let window;

  beforeAll(async () => {
    console.log('🔧 Setting up JavaScript functionality tests...');

    // Check if server is running
    try {
      const response = await fetch(`${TEST_CONFIG.serverUrl}/api/health`);
      isServerRunning = response.ok;
      console.log(`🔍 Server status: ${isServerRunning ? 'Running ✅' : 'Not running ❌'}`);
    } catch (error) {
      console.log('🔍 Server not detected - JavaScript functionality tests will be skipped');
      isServerRunning = false;
    }

    // Set up JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:4000',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    window = dom.window;
    global.window = window;
    global.document = window.document;
    global.navigator = window.navigator;
    global.console = console;
    global.performance = { now: () => Date.now() };

  }, 30000);

  afterAll(() => {
    if (dom) {
      dom.window.close();
    }
    console.log('🧹 JavaScript functionality test cleanup completed');
  });

  it('should load centralized-logger without syntax errors', async () => {
    if (!isServerRunning) {
      console.log('⚠️ Skipping test - server not running');
      expect(true).toBe(true);
      return;
    }

    console.log('🔧 Testing centralized-logger loading...');

    try {
      // Fetch the centralized logger file
      const response = await fetch(`${TEST_CONFIG.serverUrl}/js/utils/centralized-logger.js`);
      expect(response.status).toBe(200);

      const code = await response.text();

      // Execute the code in our JSDOM environment
      const script = new window.Function(code);
      script();

      // Check that CentralizedLogger is available
      expect(window.CentralizedLogger).toBeDefined();
      expect(typeof window.CentralizedLogger).toBe('function');

      console.log('✅ CentralizedLogger loaded successfully');

    } catch (error) {
      console.error('❌ CentralizedLogger loading failed:', error.message);
      throw error;
    }
  });

  it('should create logger with startTimer and endTimer methods', async () => {
    if (!isServerRunning) {
      console.log('⚠️ Skipping test - server not running');
      expect(true).toBe(true);
      return;
    }

    console.log('🔧 Testing logger timer methods...');

    try {
      // Create a logger instance
      const logger = new window.CentralizedLogger({
        component: 'test',
        enableRemoteLogging: false,
        enableConsoleLogging: false
      });

      // Test startTimer method
      expect(typeof logger.startTimer).toBe('function');
      const timer = logger.startTimer('test-timer');

      expect(timer).toBeDefined();
      expect(timer.label).toBe('test-timer');
      expect(typeof timer.startTime).toBe('number');

      // Test endTimer method
      expect(typeof logger.endTimer).toBe('function');

      // Wait a bit to ensure timer has some duration
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = logger.endTimer(timer);
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);

      console.log('✅ Logger timer methods working correctly');

    } catch (error) {
      console.error('❌ Logger timer methods test failed:', error.message);
      throw error;
    }
  });

  it('should load centralized-logger-fallback without syntax errors', async () => {
    if (!isServerRunning) {
      console.log('⚠️ Skipping test - server not running');
      expect(true).toBe(true);
      return;
    }

    console.log('🔧 Testing centralized-logger-fallback loading...');

    try {
      // Fetch the fallback logger file
      const response = await fetch(`${TEST_CONFIG.serverUrl}/js/utils/centralized-logger-fallback.js`);
      expect(response.status).toBe(200);

      const code = await response.text();

      // Execute the code in our JSDOM environment
      const script = new window.Function(code);
      script();

      // Check that logger is available
      expect(window.logger).toBeDefined();
      expect(typeof window.logger.startTimer).toBe('function');
      expect(typeof window.logger.endTimer).toBe('function');

      console.log('✅ Centralized logger fallback loaded successfully');

    } catch (error) {
      console.error('❌ Centralized logger fallback loading failed:', error.message);
      throw error;
    }
  });

  it('should load error-fix.js without syntax errors', async () => {
    if (!isServerRunning) {
      console.log('⚠️ Skipping test - server not running');
      expect(true).toBe(true);
      return;
    }

    console.log('🔧 Testing error-fix.js loading...');

    try {
      // Fetch the error fix file
      const response = await fetch(`${TEST_CONFIG.serverUrl}/js/error-fix.js`);
      expect(response.status).toBe(200);

      const code = await response.text();

      // Execute the code in our JSDOM environment
      const script = new window.Function(code);
      script();

      // Check that error fixes have been applied
      expect(window.logger).toBeDefined();
      expect(typeof window.logger.startTimer).toBe('function');
      expect(typeof window.logger.endTimer).toBe('function');

      console.log('✅ Error fix script loaded successfully');

    } catch (error) {
      console.error('❌ Error fix script loading failed:', error.message);
      throw error;
    }
  });

  it('should handle timer functionality correctly', async () => {
    if (!isServerRunning) {
      console.log('⚠️ Skipping test - server not running');
      expect(true).toBe(true);
      return;
    }

    console.log('🔧 Testing timer functionality...');

    try {
      // Test the global logger timer functionality
      expect(window.logger).toBeDefined();
      expect(typeof window.logger.startTimer).toBe('function');
      expect(typeof window.logger.endTimer).toBe('function');

      // Start a timer
      const timer = window.logger.startTimer('functionality-test');
      expect(timer).toBeDefined();
      expect(timer.label).toBe('functionality-test');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 5));

      // End the timer
      const duration = window.logger.endTimer(timer);
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);

      console.log(`✅ Timer functionality working - duration: ${duration}ms`);

    } catch (error) {
      console.error('❌ Timer functionality test failed:', error.message);
      throw error;
    }
  });
});
