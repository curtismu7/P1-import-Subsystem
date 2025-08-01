/**
 * Fallback UI Mode Tests
 * 
 * Tests for the fallback UI mode to ensure it properly handles scenarios
 * when real-time features are unavailable.
 * 
 * @version 6.5.2.4
 */

import { FallbackUI } from '../../public/js/modules/fallback-ui.js';

// Mock DOM elements and functions
document.body = document.createElement('body');
document.head = document.createElement('head');
document.createElement = jest.fn().mockImplementation((tagName) => {
    const element = {
        tagName,
        className: '',
        style: {},
        id: '',
        innerHTML: '',
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        removeAttribute: jest.fn(),
        setAttribute: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([]),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn().mockReturnValue(false)
        }
    };
    return element;
});

// Mock window event handling
window.dispatchEvent = jest.fn();
window.addEventListener = jest.fn();

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
    // Silence console output during tests
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    // Restore console functions
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
});

describe('FallbackUI', () => {
    let fallbackUI;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Create new instance for each test
        fallbackUI = new FallbackUI();
    });
    
    test('should initialize with default values', () => {
        expect(fallbackUI.isRealTimeAvailable).toBe(true);
        expect(fallbackUI.pollingEnabled).toBe(false);
        expect(fallbackUI.pollingInterval).toBeNull();
        expect(fallbackUI.fallbackModeActive).toBe(false);
        expect(fallbackUI.connectionAttempts).toBe(0);
        expect(console.log).toHaveBeenCalledWith('Fallback UI module initialized');
    });
    
    test('should create status indicator on initialization', () => {
        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.createElement).toHaveBeenCalledWith('style');
    });
    
    test('should handle connection failure', () => {
        fallbackUI.handleConnectionFailure();
        
        expect(fallbackUI.isRealTimeAvailable).toBe(false);
        expect(fallbackUI.connectionAttempts).toBe(1);
        expect(fallbackUI.fallbackModeActive).toBe(true);
        expect(fallbackUI.pollingEnabled).toBe(true);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Real-time connection failure'));
    });
    
    test('should handle connection success', () => {
        // Set up initial state as if there was a failure
        fallbackUI.isRealTimeAvailable = false;
        fallbackUI.connectionAttempts = 3;
        fallbackUI.fallbackModeActive = true;
        
        fallbackUI.handleConnectionSuccess();
        
        expect(fallbackUI.isRealTimeAvailable).toBe(true);
        expect(fallbackUI.connectionAttempts).toBe(0);
        expect(fallbackUI.fallbackModeActive).toBe(false);
        expect(console.log).toHaveBeenCalledWith('Real-time connection established');
    });
    
    test('should enable fallback mode', () => {
        // Mock document.body.classList
        document.body.classList = {
            add: jest.fn(),
            remove: jest.fn()
        };
        
        fallbackUI.enableFallbackMode();
        
        expect(fallbackUI.fallbackModeActive).toBe(true);
        expect(document.body.classList.add).toHaveBeenCalledWith('fallback-mode');
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(console.log).toHaveBeenCalledWith('Enabling fallback mode');
    });
    
    test('should disable fallback mode', () => {
        // Set up initial state
        fallbackUI.fallbackModeActive = true;
        fallbackUI.pollingEnabled = true;
        fallbackUI.pollingInterval = setInterval(() => {}, 1000);
        
        // Mock document.body.classList
        document.body.classList = {
            add: jest.fn(),
            remove: jest.fn()
        };
        
        fallbackUI.disableFallbackMode();
        
        expect(fallbackUI.fallbackModeActive).toBe(false);
        expect(fallbackUI.pollingEnabled).toBe(false);
        expect(fallbackUI.pollingInterval).toBeNull();
        expect(document.body.classList.remove).toHaveBeenCalledWith('fallback-mode');
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(console.log).toHaveBeenCalledWith('Disabling fallback mode');
    });
    
    test('should enable polling', () => {
        jest.useFakeTimers();
        
        fallbackUI.enablePolling();
        
        expect(fallbackUI.pollingEnabled).toBe(true);
        expect(fallbackUI.pollingInterval).not.toBeNull();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Enabling polling'));
        
        // Advance timer to trigger polling
        jest.advanceTimersByTime(fallbackUI.pollingDelay + 100);
        
        // Should have dispatched polling event
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'polling:update'
        }));
        
        jest.useRealTimers();
    });
    
    test('should disable polling', () => {
        // Set up initial state
        fallbackUI.pollingEnabled = true;
        fallbackUI.pollingInterval = setInterval(() => {}, 1000);
        
        fallbackUI.disablePolling();
        
        expect(fallbackUI.pollingEnabled).toBe(false);
        expect(fallbackUI.pollingInterval).toBeNull();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(console.log).toHaveBeenCalledWith('Disabling polling');
    });
    
    test('should toggle polling', () => {
        // Start with polling disabled
        fallbackUI.pollingEnabled = false;
        fallbackUI.pollingInterval = null;
        
        // Toggle on
        fallbackUI.togglePolling();
        expect(fallbackUI.pollingEnabled).toBe(true);
        expect(fallbackUI.pollingInterval).not.toBeNull();
        
        // Toggle off
        fallbackUI.togglePolling();
        expect(fallbackUI.pollingEnabled).toBe(false);
        expect(fallbackUI.pollingInterval).toBeNull();
    });
    
    test('should update UI for fallback mode', () => {
        // Mock DOM elements
        const realtimeDependentElements = [
            { setAttribute: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() }, removeAttribute: jest.fn() },
            { setAttribute: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() }, removeAttribute: jest.fn() }
        ];
        
        const fallbackElements = [
            { style: { display: 'none' } },
            { style: { display: 'none' } }
        ];
        
        const realtimeElements = [
            { style: { display: 'block' } },
            { style: { display: 'block' } }
        ];
        
        // Mock querySelectorAll
        document.querySelectorAll = jest.fn().mockImplementation((selector) => {
            if (selector === '.realtime-dependent') return realtimeDependentElements;
            if (selector === '.fallback-only') return fallbackElements;
            if (selector === '.realtime-only') return realtimeElements;
            return [];
        });
        
        // Test enabling fallback mode
        fallbackUI._updateUIForFallbackMode(true);
        
        // Should disable realtime-dependent elements
        realtimeDependentElements.forEach(element => {
            expect(element.setAttribute).toHaveBeenCalledWith('disabled', 'disabled');
            expect(element.classList.add).toHaveBeenCalledWith('disabled-in-fallback');
            expect(element.setAttribute).toHaveBeenCalledWith('title', 'This feature requires real-time connection');
        });
        
        // Should show fallback elements
        fallbackElements.forEach(element => {
            expect(element.style.display).toBe('block');
        });
        
        // Should hide realtime elements
        realtimeElements.forEach(element => {
            expect(element.style.display).toBe('none');
        });
        
        // Test disabling fallback mode
        fallbackUI._updateUIForFallbackMode(false);
        
        // Should enable realtime-dependent elements
        realtimeDependentElements.forEach(element => {
            expect(element.removeAttribute).toHaveBeenCalledWith('disabled');
            expect(element.classList.remove).toHaveBeenCalledWith('disabled-in-fallback');
            expect(element.removeAttribute).toHaveBeenCalledWith('title');
        });
        
        // Should hide fallback elements
        fallbackElements.forEach(element => {
            expect(element.style.display).toBe('none');
        });
        
        // Should show realtime elements
        realtimeElements.forEach(element => {
            expect(element.style.display).toBe('block');
        });
    });
    
    test('should show notification', () => {
        // Test with notification system
        window.notificationSystem = {
            show: jest.fn()
        };
        
        fallbackUI._showNotification('Test Title', 'Test Message', 'warning');
        
        expect(window.notificationSystem.show).toHaveBeenCalledWith(
            'Test Title', 'Test Message', 'warning'
        );
        
        // Test without notification system
        delete window.notificationSystem;
        
        fallbackUI._showNotification('Test Title', 'Test Message', 'warning');
        
        // Should create a simple notification
        expect(document.createElement).toHaveBeenCalledWith('div');
        expect(document.body.appendChild).toHaveBeenCalled();
    });
    
    test('should retry connection', () => {
        // Mock socket manager
        window.socketManager = {
            reconnect: jest.fn()
        };
        
        fallbackUI.retryConnection();
        
        expect(console.log).toHaveBeenCalledWith('Retrying real-time connection...');
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'connection:retry'
        }));
        expect(window.socketManager.reconnect).toHaveBeenCalled();
    });
    
    test('should check if real-time features are available', () => {
        // When everything is working
        fallbackUI.isRealTimeAvailable = true;
        fallbackUI.fallbackModeActive = false;
        expect(fallbackUI.isRealTimeFeatureAvailable()).toBe(true);
        
        // When real-time is not available
        fallbackUI.isRealTimeAvailable = false;
        fallbackUI.fallbackModeActive = false;
        expect(fallbackUI.isRealTimeFeatureAvailable()).toBe(false);
        
        // When fallback mode is active
        fallbackUI.isRealTimeAvailable = true;
        fallbackUI.fallbackModeActive = true;
        expect(fallbackUI.isRealTimeFeatureAvailable()).toBe(false);
    });
});

// Integration tests
describe('FallbackUI Integration', () => {
    let fallbackUI;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Create new instance for each test
        fallbackUI = new FallbackUI();
    });
    
    test('should handle complete connection lifecycle', () => {
        // Initial state
        expect(fallbackUI.isRealTimeAvailable).toBe(true);
        expect(fallbackUI.fallbackModeActive).toBe(false);
        
        // Simulate connection failure
        fallbackUI.handleConnectionFailure();
        
        // Should be in fallback mode
        expect(fallbackUI.isRealTimeAvailable).toBe(false);
        expect(fallbackUI.fallbackModeActive).toBe(true);
        expect(fallbackUI.pollingEnabled).toBe(true);
        
        // Simulate connection recovery
        fallbackUI.handleConnectionSuccess();
        
        // Should be back to normal mode
        expect(fallbackUI.isRealTimeAvailable).toBe(true);
        expect(fallbackUI.fallbackModeActive).toBe(false);
        expect(fallbackUI.pollingEnabled).toBe(false);
    });
    
    test('should handle multiple connection failures', () => {
        // Simulate multiple failures
        fallbackUI.handleConnectionFailure();
        fallbackUI.handleConnectionFailure();
        fallbackUI.handleConnectionFailure();
        
        // Should increment connection attempts
        expect(fallbackUI.connectionAttempts).toBe(3);
        expect(fallbackUI.isRealTimeAvailable).toBe(false);
        expect(fallbackUI.fallbackModeActive).toBe(true);
    });
    
    test('should integrate with import/export managers', () => {
        // Mock import/export managers
        window.importManager = {
            checkStatus: jest.fn()
        };
        
        window.exportManager = {
            checkStatus: jest.fn()
        };
        
        // Enable polling and trigger update
        fallbackUI.enablePolling();
        fallbackUI._pollForUpdates();
        
        // Should call checkStatus on both managers
        expect(window.importManager.checkStatus).toHaveBeenCalled();
        expect(window.exportManager.checkStatus).toHaveBeenCalled();
    });
});
