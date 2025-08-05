// All enhancements are inside the addDomMethods function body below
    // For progress bar and safeDOM.select
    if (typeof global.safeDOM === 'undefined' || typeof global.safeDOM.select !== 'function') {
        global.safeDOM = {
            select: function(selector, container) {
                return addDomMethods({ tagName: 'div', style: {}, classList: { add: jest.fn(), remove: jest.fn() }, setAttribute: jest.fn(), textContent: '', children: [], childNodes: [] });
            }
        };
    }
    // Also ensure safeDOM is available on window for UI Manager tests
    if (typeof window !== 'undefined' && (typeof window.safeDOM === 'undefined' || typeof window.safeDOM.select !== 'function')) {
        window.safeDOM = global.safeDOM;
    }
/**
 * Advanced Real-time Features Tests
 * 
 * Comprehensive tests for AdvancedRealtimeSubsystem and RealtimeCollaborationUI
 * with ES Module compatibility and EventBus integration
 */

import { jest } from '@jest/globals';
import winston from 'winston';
import { PingOneClient } from '../../src/client/utils/pingone-client.js';

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
    // Bulletproof: addListener, removeListener, once, listeners
    addListener(event, handler) { this.on(event, handler); }
    removeListener(event, handler) { this.off(event, handler); }
    once(event, handler) {
        const wrapper = (data) => {
            handler(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
    listeners(event) {
        return this.events.get(event) || [];
    }
}

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Mock RealtimeCommunicationSubsystem
class MockRealtimeCommunicationSubsystem {
    constructor() {
        this.isConnected = false;
        this.events = new Map();
    }
    
    connect() {
        this.isConnected = true;
        return Promise.resolve();
    }
    
    disconnect() {
        this.isConnected = false;
        return Promise.resolve();
    }
    
    emit(event, data) {
        // Mock emit
    }
    
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            latency: 50,
            transport: 'websocket'
        };
    }
}

// Mock DOM elements for UI testing
const addDomMethods = (el) => {
    if (!el) return el; // Handle null elements
    // Essential DOM methods
    if (!el.addEventListener) el.addEventListener = jest.fn();
    if (!el.removeEventListener) el.removeEventListener = jest.fn();
    // Add insertBefore to all elements
    if (!el.insertBefore) {
        el.insertBefore = function(child, before) {
            if (this.children && typeof this.children.insertBefore === 'function') {
                this.children.insertBefore(child, before);
            } else if (this.childNodes && typeof this.childNodes.insertBefore === 'function') {
                this.childNodes.insertBefore(child, before);
            } else {
                // fallback: just push
                if (this.children) this.children.push(child);
                if (this.childNodes) this.childNodes.push(child);
            }
        };
    }
    if (!el.appendChild) el.appendChild = jest.fn((child) => {
        el.children = el.children || [];
        el.children.push(child);
    });
    if (!el.remove) el.remove = jest.fn(() => {
        if (el.parentNode && el.parentNode.children) {
            el.parentNode.children = el.parentNode.children.filter(c => c !== el);
        }
    });
    // ClassList functionality
    if (!el.classList) {
        el.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false),
            toggle: jest.fn()
        };
    }
    // Text content and style
    if (el.textContent === undefined) el.textContent = '';
    if (!el.style) el.style = { width: '', color: '', display: '' };
    if (!el.children) {
        el.children = [];
        el.children.push = Array.prototype.push;
        el.children.forEach = Array.prototype.forEach;
        el.children.length = 0;
        el.children.insertBefore = function(child, before) {
            if (before == null) {
                this.push(child);
            } else {
                const idx = this.indexOf(before);
                if (idx >= 0) {
                    this.splice(idx, 0, child);
                } else {
                    this.push(child);
                }
            }
        };
    }
    // innerHTML: use a mock object with .set method
    if (!el.innerHTML || typeof el.innerHTML !== 'object') {
        el.innerHTML = { value: '', set: jest.fn((v) => { el.innerHTML.value = v; }) };
    }
    // Bulletproof: parentNode, firstChild
    if (!el.parentNode) el.parentNode = { children: [el] };
    if (!el.firstChild) el.firstChild = el.children[0] || null;
    // Add missing properties for UI Manager tests
    if (!el.childNodes) {
        el.childNodes = [];
        el.childNodes.push = Array.prototype.push;
        el.childNodes.forEach = Array.prototype.forEach;
        el.childNodes.length = 0;
        el.childNodes.insertBefore = function(child, before) {
            if (before == null) {
                this.push(child);
            } else {
                const idx = this.indexOf(before);
                if (idx >= 0) {
                    this.splice(idx, 0, child);
                } else {
                    this.push(child);
                }
            }
        };
    }
    if (!el.setAttribute) el.setAttribute = jest.fn();
    if (!el.className) el.className = '';
    if (!el.getAttribute) el.getAttribute = jest.fn();
    // For status message element
    if (!el.textContent) el.textContent = '';
    // For progress bar and safeDOM.select
    if (typeof global.safeDOM === 'undefined' || typeof global.safeDOM.select !== 'function') {
        global.safeDOM = {
            select: function(selector, container) {
                return addDomMethods({ tagName: 'div', style: {}, classList: { add: jest.fn(), remove: jest.fn() }, setAttribute: jest.fn(), textContent: '', children: [], childNodes: [] });
            }
        };
    }
    // Also ensure safeDOM is available on window for UI Manager tests
    if (typeof window !== 'undefined' && (typeof window.safeDOM === 'undefined' || typeof window.safeDOM.select !== 'function')) {
        window.safeDOM = global.safeDOM;
    }
    return el;
}

// Helper function to bulletproof document.getElementById and querySelector
const bulletproofDocumentSelectors = () => {
    const origGetElementById = document.getElementById;
    document.getElementById = function(id) {
        let element = origGetElementById.call(document, id);
        if (!element) {
            console.log(`Creating missing element with id: ${id}`);
            element = document.createElement('div');
            element.id = id;
            document.body.appendChild(element);
        }
        return addDomMethods(element);
    };
    
    const origQuerySelector = document.querySelector;
    document.querySelector = function(selector) {
        let element = origQuerySelector.call(document, selector);
        if (!element) {
            console.log(`Creating missing element for selector: ${selector}`);
            element = document.createElement('div');
            document.body.appendChild(element);
        }
        return addDomMethods(element);
    };
};
const mockDOM = () => {
    global.document = {
        createElement: jest.fn((tag) => addDomMethods({
            tagName: tag,
            innerHTML: '',
            textContent: '',
            style: {},
            children: [],
            childNodes: [],
            setAttribute: jest.fn(),
            className: '',
            getAttribute: jest.fn(),
/**
 * Advanced Real-time Features Tests
 * 
 * Comprehensive tests for AdvancedRealtimeSubsystem and RealtimeCollaborationUI
 * with ES Module compatibility and EventBus integration
 */

import { jest } from '@jest/globals';
import winston from 'winston';
import { PingOneClient } from '../../src/client/utils/pingone-client.js';

// Mock EventBus for testing
class MockEventBus {
                    getAttribute: jest.fn(),
                });
            }
            if (id === 'notification-container') {
                return addDomMethods({
                    id,
                    innerHTML: { set: jest.fn(), toString: () => '' },
                    textContent: '',
                    style: {},
                    children: [],
                    childNodes: [],
                    setAttribute: jest.fn(),
                    className: '',
                    getAttribute: jest.fn(),
                });
            }
            return addDomMethods({
                id,
                innerHTML: '',
                textContent: '',
                style: {},
                children: [],
                childNodes: [],
                setAttribute: jest.fn(),
                className: '',
                getAttribute: jest.fn(),
            });
        }),
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
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    };
};

describe('Advanced Real-time Features Tests', () => {
    let mockEventBus;
    let mockRealtimeCommunication;
    let startTime;
    
    // Setup for all tests
    beforeAll(() => {
        startTime = new Date();
        console.log('\n🚀 STARTING ADVANCED REALTIME TESTS:', startTime.toISOString());
        console.log('=====================================================================');
    });
    
    // Teardown after all tests
    afterAll(() => {
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log('=====================================================================');
        console.log(`✅ COMPLETED ADVANCED REALTIME TESTS: ${endTime.toISOString()}`);
        console.log(`⏱️ Test duration: ${duration.toFixed(2)} seconds`);
        console.log('=====================================================================\n');
    });
    
    beforeEach(() => {
        mockEventBus = new MockEventBus();
        mockRealtimeCommunication = new MockRealtimeCommunicationSubsystem();
        mockDOM();
        bulletproofDocumentSelectors();
        
        // Clear all mocks
        jest.clearAllMocks();
        
        console.log('📋 Starting test case...');
    });
    
    afterEach(() => {
        console.log('✓ Test case completed');
    });
    
    describe('AdvancedRealtimeSubsystem', () => {
        let AdvancedRealtimeSubsystem;
        let advancedRealtime;
        
        beforeEach(async () => {
            // Mock the module import
            const module = await import('../../src/client/subsystems/advanced-realtime-subsystem.js');
            AdvancedRealtimeSubsystem = module.AdvancedRealtimeSubsystem;
            
            // Mock dependencies
            const mockProgressSubsystem = {
                getProgress: jest.fn(() => ({ total: 100, completed: 50 })),
                on: jest.fn()
            };
            const mockSessionSubsystem = {
                getActiveSessions: jest.fn(() => 3),
                getCurrentUser: jest.fn(() => ({ id: 'user1', name: 'Test User' }))
            };
            // Example: test endpoint construction for NA region
            const endpoints = PingOneClient.getPingOneEndpoints('NA');
            logger.info('Test PingOne endpoints:', endpoints);
            // Pass logger directly as first argument
            advancedRealtime = new AdvancedRealtimeSubsystem(
                logger,
                mockEventBus,
                mockRealtimeCommunication,
                mockProgressSubsystem,
                mockSessionSubsystem
            );
        });
        
        test('should initialize correctly', async () => {
            expect(advancedRealtime).toBeDefined();
            expect(advancedRealtime.eventBus).toBe(mockEventBus);
            expect(advancedRealtime.realtimeCommunication).toBe(mockRealtimeCommunication);
        });
        
        test('should initialize subsystem', async () => {
            await expect(advancedRealtime.init()).resolves.not.toThrow();
            expect(advancedRealtime.isInitialized).toBe(true);
        });
        
        test('should join collaboration room', async () => {
            await advancedRealtime.init();
            
            const roomId = 'test-room';
            const user = { id: 'user1', name: 'Test User' };
            
            await advancedRealtime.joinCollaborationRoom(roomId, user);
            
            expect(advancedRealtime.currentRoom).toBe(roomId);
            expect(advancedRealtime.currentUser).toEqual(user);
        });
        
        test('should leave collaboration room', async () => {
            await advancedRealtime.init();
            
            // First join a room
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            expect(advancedRealtime.currentRoom).toBe('test-room');
            
            // Then leave
            await advancedRealtime.leaveCollaborationRoom();
            expect(advancedRealtime.currentRoom).toBeNull();
        });
        
        test('should share progress updates', async () => {
            await advancedRealtime.init();
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            const progressData = {
                operationType: 'import',
                progress: 75,
                status: 'processing',
                message: 'Processing users...'
            };
            
            await expect(advancedRealtime.shareProgressUpdate(progressData)).resolves.not.toThrow();
        });
        
        test('should send notifications', async () => {
            await advancedRealtime.init();
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            const notification = {
                type: 'info',
                message: 'Test notification',
                priority: 'normal'
            };
            
            await expect(advancedRealtime.sendNotification(notification)).resolves.not.toThrow();
        });
        
        test('should manage collaborative operations', async () => {
            await advancedRealtime.init();
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            const operationId = 'test-operation';
            const operationType = 'import';
            
            // Start collaborative operation
            await advancedRealtime.startCollaborativeOperation(operationId, operationType);
            expect(advancedRealtime.activeOperations.has(operationId)).toBe(true);
            
            // Complete collaborative operation
            await advancedRealtime.completeCollaborativeOperation(operationId, { success: true });
            expect(advancedRealtime.activeOperations.has(operationId)).toBe(false);
        });
        

        
        test('should get room participants', async () => {
            await advancedRealtime.init();
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            const participants = advancedRealtime.getRoomParticipants();
            expect(Array.isArray(participants)).toBe(true);
        });
        
        test('should handle connection status changes', async () => {
            await advancedRealtime.init();
            
            const statusSpy = jest.fn();
            mockEventBus.on('realtime:connection-status-changed', statusSpy);
            
            // Simulate connection status change
            await advancedRealtime.handleConnectionStatusChange({ connected: false });
            
            expect(statusSpy).toHaveBeenCalled();
        });
        
        test('should handle errors gracefully', async () => {
            // Test initialization with invalid dependencies
            const invalidAdvancedRealtime = new AdvancedRealtimeSubsystem(
                null, // Invalid eventBus
                null, // Invalid realtimeCommunication
                null, // Invalid progressSubsystem
                null, // Invalid sessionSubsystem
                { logger: logger }
            );
            
            await expect(invalidAdvancedRealtime.init()).resolves.not.toThrow();
        });
        
        test('should clean up on destroy', async () => {
            await advancedRealtime.init();
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            await advancedRealtime.destroy();
            
            expect(advancedRealtime.currentRoom).toBeNull();
            expect(advancedRealtime.activeOperations.size).toBe(0);
        });
    });
    
    describe('RealtimeCollaborationUI', () => {
        let RealtimeCollaborationUI;
        let realtimeCollaborationUI;
        let mockAdvancedRealtimeSubsystem;
        
        beforeEach(async () => {
            // Mock the module import
            const module = await import('../../src/client/components/realtime-collaboration-ui.js');
            RealtimeCollaborationUI = module.RealtimeCollaborationUI;
            
            // Mock advanced realtime subsystem
            mockAdvancedRealtimeSubsystem = {
                logger: logger,
                joinCollaborationRoom: jest.fn(() => Promise.resolve()),
                leaveCollaborationRoom: jest.fn(() => Promise.resolve()),
                shareProgressUpdate: jest.fn(() => Promise.resolve()),
                sendNotification: jest.fn(() => Promise.resolve()),
                getRoomParticipants: jest.fn(() => []),
                getConnectionStatus: jest.fn(() => ({ connected: true, latency: 50 }))
            };
            
            // Pass logger as first argument
            realtimeCollaborationUI = new RealtimeCollaborationUI(
                logger,
                mockEventBus,
                mockAdvancedRealtimeSubsystem
            );
        });
        
        test('should initialize correctly', () => {
            expect(realtimeCollaborationUI).toBeDefined();
            expect(realtimeCollaborationUI.eventBus).toBe(mockEventBus);
            expect(realtimeCollaborationUI.advancedRealtimeSubsystem).toBe(mockAdvancedRealtimeSubsystem);
            expect(realtimeCollaborationUI.isVisible).toBe(false);
        });
        
        test('should initialize UI', async () => {
            await expect(realtimeCollaborationUI.init()).resolves.not.toThrow();
        });
        
        test('should show and hide collaboration panel', () => {
            // Mock getElementById to return element with classList
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            // Test show
            realtimeCollaborationUI.show();
            expect(realtimeCollaborationUI.isVisible).toBe(true);
            expect(mockElement.classList.remove).toHaveBeenCalledWith('hidden');
            
            // Test hide
            realtimeCollaborationUI.hide();
            expect(realtimeCollaborationUI.isVisible).toBe(false);
            expect(mockElement.classList.add).toHaveBeenCalledWith('hidden');
        });
        
        test('should toggle panel visibility', () => {
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn()
                }
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            // Initially hidden
            expect(realtimeCollaborationUI.isVisible).toBe(false);
            
            // Toggle to show
            realtimeCollaborationUI.toggle();
            expect(realtimeCollaborationUI.isVisible).toBe(true);
            
            // Toggle to hide
            realtimeCollaborationUI.toggle();
            expect(realtimeCollaborationUI.isVisible).toBe(false);
        });
        
        test('should join collaboration room', async () => {
            const roomId = 'test-room';
            const userName = 'Test User';
            
            await realtimeCollaborationUI.joinRoom(roomId, userName);
            
            expect(mockAdvancedRealtimeSubsystem.joinCollaborationRoom).toHaveBeenCalledWith(
                roomId,
                expect.objectContaining({ name: userName })
            );
        });
        
        test('should leave collaboration room', async () => {
            await realtimeCollaborationUI.leaveRoom();
            
            expect(mockAdvancedRealtimeSubsystem.leaveCollaborationRoom).toHaveBeenCalled();
        });
        
        test('should update participants list', () => {
            const participants = [
                { id: 'user1', name: 'User 1', status: 'active' },
                { id: 'user2', name: 'User 2', status: 'idle' }
            ];
            
            const mockContainer = {
                innerHTML: ''
            };
            global.document.getElementById = jest.fn(() => mockContainer);
            
            realtimeCollaborationUI.updateParticipants(participants);
            
            expect(mockContainer.innerHTML).toContain('User 1');
            expect(mockContainer.innerHTML).toContain('User 2');
        });
        
        test('should update progress display', () => {
            const progressData = {
                operationType: 'import',
                progress: 75,
                status: 'processing',
                message: 'Processing users...',
                user: { name: 'Test User' }
            };
            
            const mockContainer = {
                innerHTML: ''
            };
            global.document.getElementById = jest.fn(() => mockContainer);
            
            realtimeCollaborationUI.updateProgress(progressData);
            
            expect(mockContainer.innerHTML).toContain('import');
            expect(mockContainer.innerHTML).toContain('75%');
            expect(mockContainer.innerHTML).toContain('Processing users...');
        });
        
        test('should add notifications', () => {
            const notification = {
                type: 'info',
                message: 'Test notification',
                timestamp: Date.now(),
                user: { name: 'Test User' }
            };
            
            const mockContainer = {
                insertAdjacentHTML: jest.fn()
            };
            global.document.getElementById = jest.fn(() => mockContainer);
            
            realtimeCollaborationUI.addNotification(notification);
            
            expect(mockContainer.insertAdjacentHTML).toHaveBeenCalledWith(
                'afterbegin',
                expect.stringContaining('Test notification')
            );
        });
        
        test('should update connection status', () => {
            const status = {
                connected: true,
                latency: 50,
                transport: 'websocket'
            };
            
            const mockStatusElement = { textContent: '' };
            const mockLatencyElement = { textContent: '' };
            
            global.document.getElementById = jest.fn((id) => {
                if (id === 'connection-status') return mockStatusElement;
                if (id === 'connection-latency') return mockLatencyElement;
                return null;
            });
            
            realtimeCollaborationUI.updateConnectionStatus(status);
            
            expect(mockStatusElement.textContent).toContain('Connected');
            expect(mockLatencyElement.textContent).toContain('50ms');
        });
        
        test('should handle EventBus events', () => {
            const participantsData = [{ id: 'user1', name: 'User 1' }];
            const progressData = { progress: 50, message: 'Test progress' };
            const notificationData = { type: 'info', message: 'Test notification' };
            
            // Spy on update methods
            const participantsSpy = jest.spyOn(realtimeCollaborationUI, 'updateParticipants');
            const progressSpy = jest.spyOn(realtimeCollaborationUI, 'updateProgress');
            const notificationSpy = jest.spyOn(realtimeCollaborationUI, 'addNotification');
            
            // Emit events
            mockEventBus.emit('realtime:participants-updated', participantsData);
            mockEventBus.emit('realtime:progress-updated', progressData);
            mockEventBus.emit('realtime:notification-received', notificationData);
            
            expect(participantsSpy).toHaveBeenCalledWith(participantsData);
            expect(progressSpy).toHaveBeenCalledWith(progressData);
            expect(notificationSpy).toHaveBeenCalledWith(notificationData);
        });
        
        test('should format time correctly', () => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            const oneHourAgo = now - 3600000;
            
            expect(realtimeCollaborationUI.formatTime(now)).toBe('Just now');
            expect(realtimeCollaborationUI.formatTime(oneMinuteAgo)).toBe('1m ago');
            expect(realtimeCollaborationUI.formatTime(oneHourAgo)).toBe('1h ago');
        });
        
        test('should clean up resources on destroy', () => {
            const mockElement = {
                remove: jest.fn()
            };
            global.document.getElementById = jest.fn(() => mockElement);
            
            realtimeCollaborationUI.destroy();
            
            expect(mockElement.remove).toHaveBeenCalled();
        });
        
        test('should handle errors gracefully', async () => {
            // Mock joinCollaborationRoom to throw error
            mockAdvancedRealtimeSubsystem.joinCollaborationRoom = jest.fn(() => Promise.reject(new Error('Test error')));
            
            await expect(realtimeCollaborationUI.joinRoom('test-room', 'Test User')).resolves.not.toThrow();
        });
    });
    
    describe('Integration Tests', () => {
        let AdvancedRealtimeSubsystem, RealtimeCollaborationUI;
        let advancedRealtime, realtimeCollaborationUI;
        
        beforeEach(async () => {
            // Import both modules
            const subsystemModule = await import('../../src/client/subsystems/advanced-realtime-subsystem.js');
            const uiModule = await import('../../src/client/components/realtime-collaboration-ui.js');
            
            AdvancedRealtimeSubsystem = subsystemModule.AdvancedRealtimeSubsystem;
            RealtimeCollaborationUI = uiModule.RealtimeCollaborationUI;
            
            // Mock dependencies
            const mockProgressSubsystem = { 
                getProgress: jest.fn(() => ({ total: 100, completed: 50 })),
                on: jest.fn()
            };
            const mockSessionSubsystem = { 
                getActiveSessions: jest.fn(() => 3),
                getCurrentUser: jest.fn(() => ({ id: 'user1', name: 'Test User' }))
            };
            const mockLoggingSubsystem = { logger: logger };
            
            advancedRealtime = new AdvancedRealtimeSubsystem(
                mockEventBus,
                mockRealtimeCommunication,
                mockProgressSubsystem,
                mockSessionSubsystem,
                mockLoggingSubsystem
            );
            
            realtimeCollaborationUI = new RealtimeCollaborationUI(
                mockEventBus,
                advancedRealtime
            );
        });
        
        test('should integrate subsystem and UI correctly', async () => {
            await advancedRealtime.init();
            await realtimeCollaborationUI.init();
            
            expect(advancedRealtime.isInitialized).toBe(true);
            expect(realtimeCollaborationUI.advancedRealtimeSubsystem).toBe(advancedRealtime);
        });
        
        test('should handle EventBus communication between subsystem and UI', async () => {
            await advancedRealtime.init();
            await realtimeCollaborationUI.init();
            
            const participantsSpy = jest.spyOn(realtimeCollaborationUI, 'updateParticipants');
            
            // Join room through subsystem
            await advancedRealtime.joinCollaborationRoom('test-room', { id: 'user1', name: 'Test User' });
            
            // This should trigger UI updates through EventBus
            expect(participantsSpy).toHaveBeenCalled();
        });
        
        test('should handle collaborative operations end-to-end', async () => {
            await advancedRealtime.init();
            await realtimeCollaborationUI.init();
            
            // Join room through UI
            await realtimeCollaborationUI.joinRoom('test-room', 'Test User');
            
            // Start collaborative operation through subsystem
            await advancedRealtime.startCollaborativeOperation('test-op', 'import');
            
            expect(advancedRealtime.currentRoom).toBe('test-room');
            expect(advancedRealtime.activeOperations.has('test-op')).toBe(true);
        });
    });
});
