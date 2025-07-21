/**
 * Analytics Dashboard Tests
 * 
 * Comprehensive tests for AnalyticsDashboardSubsystem and AnalyticsDashboardUI
 * with ES Module compatibility and EventBus integration
 */

import { jest } from '@jest/globals';

// Mock EventBus for testing
class MockEventBus {
    constructor() {
        this.events = new Map();
    }
    
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
    }
    
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(handler => handler(data));
        }
    }
    
    off(event, handler) {
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
}

// Mock Logger
class MockLogger {
    debug() {}
    info() {}
    warn() {}
    error() {}
    child() { return this; }
}

// Mock DOM elements for UI testing
const mockDOM = () => {
    global.document = {
        createElement: jest.fn(() => ({
            src: '',
            onload: null,
            onerror: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false)
            },
            style: {},
            innerHTML: '',
            textContent: '',
            insertAdjacentHTML: jest.fn(),
            remove: jest.fn()
        })),
        getElementById: jest.fn(() => ({
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            querySelector: jest.fn(),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false)
            },
            style: {},
            innerHTML: '',
            textContent: '',
            insertAdjacentHTML: jest.fn(),
            remove: jest.fn()
        })),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        body: {
            insertAdjacentHTML: jest.fn(),
            appendChild: jest.fn()
        },
        head: {
            appendChild: jest.fn()
        }
    };
    
    global.window = {
        Chart: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };
};

describe('Analytics Dashboard Tests', () => {
    let mockEventBus;
    let mockLogger;
    
    beforeEach(() => {
        mockEventBus = new MockEventBus();
        mockLogger = new MockLogger();
        mockDOM();
        
        // Clear all mocks
        jest.clearAllMocks();
    });
    
    describe('AnalyticsDashboardSubsystem', () => {
        let AnalyticsDashboardSubsystem;
        let analyticsDashboard;
        
        beforeEach(async () => {
            // Mock the module import
            const module = await import('../../src/client/subsystems/analytics-dashboard-subsystem.js');
            AnalyticsDashboardSubsystem = module.AnalyticsDashboardSubsystem;
            
            // Mock dependencies
            const mockLoggingSubsystem = { logger: mockLogger };
            const mockProgressSubsystem = { getProgress: jest.fn(() => ({ total: 100, completed: 50 })) };
            const mockSessionSubsystem = { getActiveSessions: jest.fn(() => 3) };
            const mockAdvancedRealtimeSubsystem = { getMetrics: jest.fn(() => ({})) };
            
            analyticsDashboard = new AnalyticsDashboardSubsystem(
                mockEventBus,
                mockLoggingSubsystem,
                mockProgressSubsystem,
                mockSessionSubsystem,
                mockAdvancedRealtimeSubsystem
            );
        });
        
        test('should initialize correctly', async () => {
            expect(analyticsDashboard).toBeDefined();
            expect(analyticsDashboard.eventBus).toBe(mockEventBus);
            expect(analyticsDashboard.logger).toBe(mockLogger);
        });
        
        test('should initialize subsystem', async () => {
            await expect(analyticsDashboard.init()).resolves.not.toThrow();
            expect(analyticsDashboard.isInitialized).toBe(true);
        });
        
        test('should collect system metrics', async () => {
            await analyticsDashboard.init();
            const metrics = await analyticsDashboard.collectSystemMetrics();
            
            expect(metrics).toBeDefined();
            expect(typeof metrics.cpuUsage).toBe('number');
            expect(typeof metrics.memoryUsage).toBe('number');
            expect(typeof metrics.activeSessions).toBe('number');
        });
        
        test('should collect operation metrics', async () => {
            await analyticsDashboard.init();
            const metrics = await analyticsDashboard.collectOperationMetrics();
            
            expect(metrics).toBeDefined();
            expect(typeof metrics.totalOperations).toBe('number');
            expect(typeof metrics.successRate).toBe('number');
            expect(typeof metrics.avgResponseTime).toBe('string');
        });
        
        test('should get analytics data', async () => {
            await analyticsDashboard.init();
            const data = await analyticsDashboard.getAnalyticsData();
            
            expect(data).toBeDefined();
            expect(data.summary).toBeDefined();
            expect(data.system).toBeDefined();
            expect(data.operations).toBeDefined();
            expect(data.alerts).toBeDefined();
            expect(data.activity).toBeDefined();
        });
        
        test('should create alerts', async () => {
            await analyticsDashboard.init();
            
            const alert = {
                id: 'test-alert',
                severity: 'warning',
                message: 'Test alert message',
                timestamp: Date.now()
            };
            
            analyticsDashboard.createAlert(alert.severity, alert.message);
            
            const alerts = analyticsDashboard.getActiveAlerts();
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].severity).toBe(alert.severity);
            expect(alerts[0].message).toBe(alert.message);
        });
        
        test('should clear alerts', async () => {
            await analyticsDashboard.init();
            
            // Create some alerts
            analyticsDashboard.createAlert('error', 'Test error');
            analyticsDashboard.createAlert('warning', 'Test warning');
            
            let alerts = analyticsDashboard.getActiveAlerts();
            expect(alerts.length).toBe(2);
            
            // Clear alerts
            analyticsDashboard.clearAlerts();
            alerts = analyticsDashboard.getActiveAlerts();
            expect(alerts.length).toBe(0);
        });
        
        test('should handle EventBus events', async () => {
            await analyticsDashboard.init();
            
            const eventSpy = jest.fn();
            mockEventBus.on('analytics:data-updated', eventSpy);
            
            // Trigger data collection
            await analyticsDashboard.collectAndEmitData();
            
            expect(eventSpy).toHaveBeenCalled();
        });
        
        test('should start and stop data collection', async () => {
            await analyticsDashboard.init();
            
            // Start collection
            analyticsDashboard.startDataCollection();
            expect(analyticsDashboard.collectionInterval).toBeDefined();
            
            // Stop collection
            analyticsDashboard.stopDataCollection();
            expect(analyticsDashboard.collectionInterval).toBeNull();
        });
        
        test('should handle errors gracefully', async () => {
            // Test initialization with invalid dependencies
            const invalidAnalyticsDashboard = new AnalyticsDashboardSubsystem(
                null, // Invalid eventBus
                mockLogger,
                null, // Invalid progressSubsystem
                null, // Invalid sessionSubsystem
                null  // Invalid advancedRealtimeSubsystem
            );
            
            await expect(invalidAnalyticsDashboard.init()).resolves.not.toThrow();
        });
    });
    
    describe('AnalyticsDashboardUI', () => {
        let AnalyticsDashboardUI;
        let analyticsDashboardUI;
        let mockAnalyticsDashboardSubsystem;
        
        beforeEach(async () => {
            // Mock the module import
            const module = await import('../../src/client/components/analytics-dashboard-ui.js');
            AnalyticsDashboardUI = module.AnalyticsDashboardUI;
            
            // Mock analytics dashboard subsystem
            mockAnalyticsDashboardSubsystem = {
                logger: mockLogger,
                getAnalyticsData: jest.fn(() => Promise.resolve({
                    summary: {
                        totalOperations: 100,
                        successRate: '95%',
                        avgResponseTime: '250ms',
                        activeAlerts: 2
                    },
                    system: {
                        cpuUsage: 45,
                        memoryUsage: 60,
                        activeSessions: 3
                    },
                    operations: {
                        totalOperations: 100,
                        successRate: 95,
                        avgResponseTime: '250ms'
                    },
                    alerts: [],
                    activity: []
                }))
            };
            
            analyticsDashboardUI = new AnalyticsDashboardUI(
                mockEventBus,
                mockAnalyticsDashboardSubsystem
            );
        });
        
        test('should initialize correctly', () => {
            expect(analyticsDashboardUI).toBeDefined();
            expect(analyticsDashboardUI.eventBus).toBe(mockEventBus);
            expect(analyticsDashboardUI.analyticsDashboardSubsystem).toBe(mockAnalyticsDashboardSubsystem);
            expect(analyticsDashboardUI.isVisible).toBe(false);
        });
        
        test('should initialize UI', async () => {
            await expect(analyticsDashboardUI.init()).resolves.not.toThrow();
        });
        
        test('should show and hide dashboard', () => {
            // Mock getElementById to return element with classList
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            // Test show
            analyticsDashboardUI.show();
            expect(analyticsDashboardUI.isVisible).toBe(true);
            expect(mockElement.classList.remove).toHaveBeenCalledWith('hidden');
            
            // Test hide
            analyticsDashboardUI.hide();
            expect(analyticsDashboardUI.isVisible).toBe(false);
            expect(mockElement.classList.add).toHaveBeenCalledWith('hidden');
        });
        
        test('should toggle dashboard visibility', () => {
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            // Initially hidden
            expect(analyticsDashboardUI.isVisible).toBe(false);
            
            // Toggle to show
            analyticsDashboardUI.toggle();
            expect(analyticsDashboardUI.isVisible).toBe(true);
            
            // Toggle to hide
            analyticsDashboardUI.toggle();
            expect(analyticsDashboardUI.isVisible).toBe(false);
        });
        
        test('should refresh dashboard', async () => {
            const mockElement = {
                querySelector: jest.fn(() => ({
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn()
                    }
                }))
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            await analyticsDashboardUI.refreshDashboard();
            
            expect(mockAnalyticsDashboardSubsystem.getAnalyticsData).toHaveBeenCalled();
        });
        
        test('should handle EventBus events', () => {
            const testData = { summary: {}, system: {}, operations: {}, alerts: [], activity: [] };
            
            // Spy on updateDashboard method
            const updateSpy = jest.spyOn(analyticsDashboardUI, 'updateDashboard');
            
            // Emit analytics data update event
            mockEventBus.emit('analytics:data-updated', testData);
            
            expect(updateSpy).toHaveBeenCalledWith(testData);
        });
        
        test('should format time correctly', () => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            const oneHourAgo = now - 3600000;
            const oneDayAgo = now - 86400000;
            
            expect(analyticsDashboardUI.formatTime(now)).toBe('Just now');
            expect(analyticsDashboardUI.formatTime(oneMinuteAgo)).toBe('1m ago');
            expect(analyticsDashboardUI.formatTime(oneHourAgo)).toBe('1h ago');
            expect(analyticsDashboardUI.formatTime(oneDayAgo)).toContain('/');
        });
        
        test('should get correct alert icons', () => {
            expect(analyticsDashboardUI.getAlertIcon('error')).toBe('exclamation-circle');
            expect(analyticsDashboardUI.getAlertIcon('warning')).toBe('exclamation-triangle');
            expect(analyticsDashboardUI.getAlertIcon('info')).toBe('info-circle');
            expect(analyticsDashboardUI.getAlertIcon('unknown')).toBe('info-circle');
        });
        
        test('should get correct activity icons', () => {
            expect(analyticsDashboardUI.getActivityIcon('import')).toBe('upload');
            expect(analyticsDashboardUI.getActivityIcon('export')).toBe('download');
            expect(analyticsDashboardUI.getActivityIcon('delete')).toBe('trash');
            expect(analyticsDashboardUI.getActivityIcon('modify')).toBe('edit');
            expect(analyticsDashboardUI.getActivityIcon('unknown')).toBe('info-circle');
        });
        
        test('should start and stop real-time updates', () => {
            // Mock setInterval and clearInterval
            global.setInterval = jest.fn(() => 'interval-id');
            global.clearInterval = jest.fn();
            
            // Start updates
            analyticsDashboardUI.startRealTimeUpdates();
            expect(global.setInterval).toHaveBeenCalled();
            expect(analyticsDashboardUI.updateInterval).toBe('interval-id');
            
            // Stop updates
            analyticsDashboardUI.stopRealTimeUpdates();
            expect(global.clearInterval).toHaveBeenCalledWith('interval-id');
            expect(analyticsDashboardUI.updateInterval).toBeNull();
        });
        
        test('should clean up resources on destroy', () => {
            const mockElement = {
                remove: jest.fn()
            };
            global.document.getElementById = jest.fn(() => mockElement);
            global.clearInterval = jest.fn();
            
            analyticsDashboardUI.updateInterval = 'test-interval';
            
            analyticsDashboardUI.destroy();
            
            expect(global.clearInterval).toHaveBeenCalledWith('test-interval');
            expect(mockElement.remove).toHaveBeenCalled();
        });
        
        test('should handle errors gracefully', async () => {
            // Mock getAnalyticsData to throw error
            mockAnalyticsDashboardSubsystem.getAnalyticsData = jest.fn(() => Promise.reject(new Error('Test error')));
            
            await expect(analyticsDashboardUI.refreshDashboard()).resolves.not.toThrow();
        });
    });
    
    describe('Integration Tests', () => {
        let AnalyticsDashboardSubsystem, AnalyticsDashboardUI;
        let analyticsDashboard, analyticsDashboardUI;
        
        beforeEach(async () => {
            // Import both modules
            const subsystemModule = await import('../../src/client/subsystems/analytics-dashboard-subsystem.js');
            const uiModule = await import('../../src/client/components/analytics-dashboard-ui.js');
            
            AnalyticsDashboardSubsystem = subsystemModule.AnalyticsDashboardSubsystem;
            AnalyticsDashboardUI = uiModule.AnalyticsDashboardUI;
            
            // Mock dependencies
            const mockLoggingSubsystem = { logger: mockLogger };
            const mockProgressSubsystem = { getProgress: jest.fn(() => ({ total: 100, completed: 50 })) };
            const mockSessionSubsystem = { getActiveSessions: jest.fn(() => 3) };
            const mockAdvancedRealtimeSubsystem = { getMetrics: jest.fn(() => ({})) };
            
            analyticsDashboard = new AnalyticsDashboardSubsystem(
                mockEventBus,
                mockLoggingSubsystem,
                mockProgressSubsystem,
                mockSessionSubsystem,
                mockAdvancedRealtimeSubsystem
            );
            
            analyticsDashboardUI = new AnalyticsDashboardUI(
                mockEventBus,
                analyticsDashboard
            );
        });
        
        test('should integrate subsystem and UI correctly', async () => {
            await analyticsDashboard.init();
            await analyticsDashboardUI.init();
            
            expect(analyticsDashboard.isInitialized).toBe(true);
            expect(analyticsDashboardUI.analyticsDashboardSubsystem).toBe(analyticsDashboard);
        });
        
        test('should handle EventBus communication between subsystem and UI', async () => {
            await analyticsDashboard.init();
            await analyticsDashboardUI.init();
            
            const updateSpy = jest.spyOn(analyticsDashboardUI, 'updateDashboard');
            
            // Trigger data collection from subsystem
            await analyticsDashboard.collectAndEmitData();
            
            expect(updateSpy).toHaveBeenCalled();
        });
        
        test('should handle alert creation and display', async () => {
            await analyticsDashboard.init();
            await analyticsDashboardUI.init();
            
            const addAlertSpy = jest.spyOn(analyticsDashboardUI, 'addAlert');
            
            // Create alert in subsystem
            analyticsDashboard.createAlert('warning', 'Test integration alert');
            
            expect(addAlertSpy).toHaveBeenCalled();
        });
    });
});
