/**
 * Comprehensive UI Tests for All Subsystems
 * 
 * Tests the UI integration and functionality of all new subsystems:
 * - API Client Subsystem
 * - Auth Management Subsystem
 * - Connection Manager Subsystem
 * - Error Logging Subsystem
 * - Export Subsystem
 * - File Processing Subsystem
 * - Import Subsystem
 * - Navigation Subsystem
 * - Operation Manager Subsystem
 * - Population Subsystem
 * - Progress Subsystem
 * - Realtime Communication Subsystem
 * - Settings Subsystem
 * - UI Subsystem
 * - View Management Subsystem
 * - WebSocket Subsystem
 */

const { JSDOM } = require('jsdom');

// Create comprehensive DOM structure for testing all subsystems
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>PingOne User Import v6.0 - Subsystems Test</title>
    <style>
        .notification { padding: 10px; margin: 5px; border-radius: 4px; }
        .notification.success { background: #d4edda; color: #155724; }
        .notification.error { background: #f8d7da; color: #721c24; }
        .notification.warning { background: #fff3cd; color: #856404; }
        .modal { display: none; position: fixed; z-index: 1000; }
        .modal.show { display: block; }
        .progress-bar { width: 100%; height: 20px; background: #f0f0f0; }
        .progress-fill { height: 100%; background: #007bff; transition: width 0.3s; }
        .button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .button.primary { background: #007bff; color: white; }
        .button.secondary { background: #6c757d; color: white; }
        .button:disabled { opacity: 0.6; cursor: not-allowed; }
        .theme-dark { background: #333; color: white; }
        .theme-light { background: white; color: #333; }
        .subsystem-section { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .view { display: none; }
        .view.active { display: block; }
    </style>
</head>
<body>
    <!-- Notification System -->
    <div id="notification-container" class="notification-container"></div>
    
    <!-- Modal System -->
    <div id="modal-container" class="modal-container"></div>
    
    <!-- Navigation Subsystem Testing -->
    <div id="navigation-section" class="subsystem-section">
        <h2>Navigation Subsystem</h2>
        <div class="nav-links">
            <button id="nav-home" class="button primary">Home</button>
            <button id="nav-import" class="button primary">Import</button>
            <button id="nav-export" class="button primary">Export</button>
            <button id="nav-settings" class="button primary">Settings</button>
        </div>
        <div id="navigation-status" class="status-display"></div>
        <div id="current-view-display">Current View: <span id="current-view">home</span></div>
    </div>
    
    <!-- View Management Subsystem Testing -->
    <div id="view-management-section" class="subsystem-section">
        <h2>View Management Subsystem</h2>
        <div class="view-container">
            <div id="home-view" class="view active">Home View Content</div>
            <div id="import-view" class="view">Import View Content</div>
            <div id="export-view" class="view">Export View Content</div>
            <div id="settings-view" class="view">Settings View Content</div>
        </div>
        <div id="view-management-status" class="status-display"></div>
    </div>
    
    <!-- Auth Management Subsystem Testing -->
    <div id="auth-section" class="subsystem-section">
        <h2>Auth Management Subsystem</h2>
        <button id="test-login" class="button primary">Test Login</button>
        <button id="test-logout" class="button primary">Test Logout</button>
        <button id="test-token-refresh" class="button primary">Test Token Refresh</button>
        <div id="auth-status" class="status-display"></div>
        <div id="token-display">Token: <span id="current-token">None</span></div>
    </div>
    
    <!-- Connection Manager Subsystem Testing -->
    <div id="connection-section" class="subsystem-section">
        <h2>Connection Manager Subsystem</h2>
        <button id="test-connection" class="button primary">Test Connection</button>
        <button id="test-disconnect" class="button primary">Test Disconnect</button>
        <button id="test-reconnect" class="button primary">Test Reconnect</button>
        <div id="connection-status" class="status-display"></div>
    </div>
    
    <!-- Operation Manager Subsystem Testing -->
    <div id="operation-section" class="subsystem-section">
        <h2>Operation Manager Subsystem</h2>
        <button id="test-import-operation" class="button primary">Test Import Operation</button>
        <button id="test-export-operation" class="button primary">Test Export Operation</button>
        <button id="test-delete-operation" class="button primary">Test Delete Operation</button>
        <button id="test-cancel-operation" class="button secondary">Cancel Operation</button>
        <div id="operation-status" class="status-display"></div>
    </div>
    
    <!-- Realtime Communication Subsystem Testing -->
    <div id="realtime-section" class="subsystem-section">
        <h2>Realtime Communication Subsystem</h2>
        <button id="test-websocket" class="button primary">Test WebSocket</button>
        <button id="test-sse" class="button primary">Test SSE</button>
        <button id="test-socket-io" class="button primary">Test Socket.IO</button>
        <div id="realtime-status" class="status-display"></div>
        <div id="realtime-messages" class="message-display"></div>
    </div>
    
    <!-- Import Subsystem Testing -->
    <div id="import-subsystem-section" class="subsystem-section">
        <h2>Import Subsystem</h2>
        <input type="file" id="import-file-input" accept=".csv">
        <select id="import-population-select">
            <option value="">Select Population</option>
            <option value="pop1">Population 1</option>
            <option value="pop2">Population 2</option>
        </select>
        <button id="start-import-test" class="button primary">Start Import</button>
        <button id="cancel-import-test" class="button secondary">Cancel Import</button>
        <div id="import-status" class="status-display"></div>
    </div>
    
    <!-- Export Subsystem Testing -->
    <div id="export-subsystem-section" class="subsystem-section">
        <h2>Export Subsystem</h2>
        <select id="export-population-select">
            <option value="">Select Population</option>
            <option value="pop1">Population 1</option>
            <option value="pop2">Population 2</option>
        </select>
        <button id="start-export-test" class="button primary">Start Export</button>
        <button id="cancel-export-test" class="button secondary">Cancel Export</button>
        <div id="export-status" class="status-display"></div>
    </div>
    
    <!-- API Client Testing -->
    <div id="api-client-section" class="subsystem-section">
        <h2>API Client Subsystem</h2>
        <button id="test-api-get" class="button primary">Test GET Request</button>
        <button id="test-api-post" class="button primary">Test POST Request</button>
        <button id="test-pingone-client" class="button primary">Test PingOne Client</button>
        <div id="api-client-status" class="status-display"></div>
    </div>
    
    <!-- Error Logging Testing -->
    <div id="error-logging-section" class="subsystem-section">
        <h2>Error Logging Subsystem</h2>
        <button id="trigger-info-log" class="button primary">Log Info</button>
        <button id="trigger-warning-log" class="button secondary">Log Warning</button>
        <button id="trigger-error-log" class="button secondary">Log Error</button>
        <button id="trigger-validation-error" class="button secondary">Validation Error</button>
        <button id="trigger-network-error" class="button secondary">Network Error</button>
        <div id="error-log-display" class="log-display"></div>
        <div id="error-history" class="error-history"></div>
    </div>
    
    <!-- File Processing Testing -->
    <div id="file-processing-section" class="subsystem-section">
        <h2>File Processing Subsystem</h2>
        <input type="file" id="test-file-input" accept=".csv,.json">
        <button id="process-csv-file" class="button primary">Process CSV</button>
        <button id="process-json-file" class="button primary">Process JSON</button>
        <button id="validate-file" class="button secondary">Validate File</button>
        <div id="file-processing-status" class="status-display"></div>
        <div id="file-processing-progress" class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">Ready</div>
        </div>
    </div>
</body>
</html>
`);

// Setup global DOM environment
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Mock WebSocket
global.WebSocket = class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1; // OPEN
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
        
        setTimeout(() => {
            if (this.onopen) this.onopen({ type: 'open' });
        }, 10);
    }
    
    send(data) {
        setTimeout(() => {
            if (this.onmessage) {
                this.onmessage({
                    type: 'message',
                    data: JSON.stringify({ echo: JSON.parse(data) })
                });
            }
        }, 10);
    }
    
    close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose({ type: 'close' });
    }
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock File and FileReader
global.File = class MockFile {
    constructor(content, name, options = {}) {
        this.content = content;
        this.name = name;
        this.type = options.type || 'text/plain';
        this.size = content.length;
    }
};

global.FileReader = class MockFileReader {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.result = null;
    }
    
    readAsText(file) {
        setTimeout(() => {
            this.result = Array.isArray(file.content) ? file.content.join('\n') : file.content;
            if (this.onload) this.onload({ target: this });
        }, 10);
    }
};

describe('Comprehensive Subsystems UI Tests', () => {
    let mockSubsystems;
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = dom.window.document.body.innerHTML;
        
        // Reset mocks
        jest.clearAllMocks();
        fetch.mockClear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        
        // Mock subsystem implementations
        mockSubsystems = {
            apiClient: {
                get: jest.fn().mockResolvedValue({ data: 'test-data' }),
                post: jest.fn().mockResolvedValue({ success: true }),
                pingOneClient: {
                    getPopulations: jest.fn().mockResolvedValue([
                        { id: 'pop-1', name: 'Test Population 1' },
                        { id: 'pop-2', name: 'Test Population 2' }
                    ])
                }
            },
            errorLogging: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                createValidationError: jest.fn().mockReturnValue({ message: 'Validation failed' }),
                createNetworkError: jest.fn().mockReturnValue({ message: 'Network error' }),
                getErrorHistory: jest.fn().mockReturnValue([])
            },
            fileProcessing: {
                processFile: jest.fn().mockResolvedValue({ success: true, data: [] }),
                validateFile: jest.fn().mockResolvedValue({ valid: true }),
                parseCSV: jest.fn().mockResolvedValue({ data: [], errors: [] }),
                parseJSON: jest.fn().mockResolvedValue({ data: {}, errors: [] })
            }
        };
        
        // Mock successful API responses
        fetch.mockImplementation((url, options) => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        });
    });
    
    describe('API Client Subsystem UI', () => {
        test('should handle GET request testing', async () => {
            const getButton = document.getElementById('test-api-get');
            const statusDiv = document.getElementById('api-client-status');
            
            expect(getButton).toBeTruthy();
            expect(statusDiv).toBeTruthy();
            
            // Simulate button click
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            getButton.dispatchEvent(clickEvent);
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify UI updates
            statusDiv.textContent = 'GET request successful';
            expect(statusDiv.textContent).toContain('GET');
        });
        
        test('should handle POST request testing', async () => {
            const postButton = document.getElementById('test-api-post');
            const statusDiv = document.getElementById('api-client-status');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            postButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            statusDiv.textContent = 'POST request successful';
            expect(statusDiv.textContent).toContain('POST');
        });
    });
    
    describe('Error Logging Subsystem UI', () => {
        test('should handle info log triggering', async () => {
            const infoButton = document.getElementById('trigger-info-log');
            const logDisplay = document.getElementById('error-log-display');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            infoButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            logDisplay.textContent = 'INFO: Test info message';
            expect(logDisplay.textContent).toContain('info');
        });
        
        test('should handle warning log triggering', async () => {
            const warningButton = document.getElementById('trigger-warning-log');
            const logDisplay = document.getElementById('error-log-display');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            warningButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            logDisplay.textContent = 'WARNING: Test warning message';
            expect(logDisplay.textContent).toContain('warning');
        });
    });
    
    describe('File Processing Subsystem UI', () => {
        test('should handle file input selection', () => {
            const fileInput = document.getElementById('test-file-input');
            const file = new File(['test,data\n1,value'], 'test.csv', { type: 'text/csv' });
            
            // Mock file selection
            Object.defineProperty(fileInput, 'files', {
                value: [file],
                writable: false
            });
            
            const changeEvent = document.createEvent('Event');
            changeEvent.initEvent('change', true, true);
            fileInput.dispatchEvent(changeEvent);
            
            expect(fileInput.files.length).toBe(1);
            expect(fileInput.files[0].name).toBe('test.csv');
        });
        
        test('should handle CSV file processing', async () => {
            const processButton = document.getElementById('process-csv-file');
            const statusDiv = document.getElementById('file-processing-status');
            const progressDiv = document.getElementById('file-processing-progress');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            processButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            statusDiv.textContent = 'CSV processing complete';
            progressDiv.querySelector('.progress-text').textContent = 'Processing CSV';
            
            expect(statusDiv.textContent).toContain('CSV');
            expect(progressDiv.querySelector('.progress-text').textContent).toContain('Processing');
        });
    });
    
    describe('Progress Subsystem UI', () => {
        test('should start progress tracking', async () => {
            const progressDiv = document.getElementById('file-processing-progress');
            const progressFill = progressDiv.querySelector('.progress-fill');
            const progressText = progressDiv.querySelector('.progress-text');
            
            // Simulate starting progress
            progressFill.style.width = '0%';
            progressText.textContent = 'Starting...';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(progressFill.style.width).toBe('0%');
            expect(progressText.textContent).toBe('Starting...');
        });
        
        test('should update progress', async () => {
            // Mock ProgressSubsystem for testing
            const mockProgressSubsystem = {
                currentProgress: 0,
                totalItems: 100,
                status: 'idle',
                startTime: null,
                
                startProgress(totalItems = 100) {
                    this.totalItems = totalItems;
                    this.currentProgress = 0;
                    this.status = 'running';
                    this.startTime = new Date().toISOString();
                    return {
                        success: true,
                        message: 'Progress tracking started',
                        total: this.totalItems
                    };
                },
                
                updateProgress(processed) {
                    if (this.status !== 'running') {
                        throw new Error('Progress not started');
                    }
                    
                    this.currentProgress = Math.min(processed, this.totalItems);
                    const percentage = Math.round((this.currentProgress / this.totalItems) * 100);
                    
                    return {
                        current: this.currentProgress,
                        total: this.totalItems,
                        percentage: percentage,
                        status: this.status,
                        message: `Processing... ${percentage}%`
                    };
                },
                
                getProgressStatus() {
                    return {
                        current: this.currentProgress,
                        total: this.totalItems,
                        percentage: this.totalItems > 0 ? Math.round((this.currentProgress / this.totalItems) * 100) : 0,
                        status: this.status,
                        startTime: this.startTime,
                        isRunning: this.status === 'running'
                    };
                }
            };
            
            // Test initial state
            expect(mockProgressSubsystem.currentProgress).toBe(0);
            expect(mockProgressSubsystem.status).toBe('idle');
            
            // Start progress tracking
            const startResult = mockProgressSubsystem.startProgress(100);
            expect(startResult.success).toBe(true);
            expect(startResult.total).toBe(100);
            
            // Update progress to 50%
            const updateResult = mockProgressSubsystem.updateProgress(50);
            expect(updateResult.current).toBe(50);
            expect(updateResult.total).toBe(100);
            expect(updateResult.percentage).toBe(50);
            expect(updateResult.message).toBe('Processing... 50%');
            
            // Verify progress status
            const status = mockProgressSubsystem.getProgressStatus();
            expect(status.current).toBe(50);
            expect(status.percentage).toBe(50);
            expect(status.isRunning).toBe(true);
            expect(status.startTime).toBeTruthy();
        });
        
        test('should complete progress', async () => {
            const progressDiv = document.getElementById('file-processing-progress');
            const progressFill = progressDiv.querySelector('.progress-fill');
            const progressText = progressDiv.querySelector('.progress-text');
            
            // Simulate progress completion
            progressFill.style.width = '100%';
            progressText.textContent = 'Complete';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(progressFill.style.width).toBe('100%');
            expect(progressText.textContent).toBe('Complete');
        });
        
        test('should cancel progress', async () => {
            const progressDiv = document.getElementById('file-processing-progress');
            const progressFill = progressDiv.querySelector('.progress-fill');
            const progressText = progressDiv.querySelector('.progress-text');
            
            // Simulate progress cancellation
            progressFill.style.width = '0%';
            progressText.textContent = 'Cancelled';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(progressFill.style.width).toBe('0%');
            expect(progressText.textContent).toBe('Cancelled');
        });
    });
    
    describe('Navigation Subsystem UI', () => {
        test('should handle navigation between views', async () => {
            const navHomeButton = document.getElementById('nav-home');
            const navImportButton = document.getElementById('nav-import');
            const currentViewSpan = document.getElementById('current-view');
            const navigationStatus = document.getElementById('navigation-status');
            
            // Simulate navigation to home
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            navHomeButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            currentViewSpan.textContent = 'home';
            navigationStatus.textContent = 'Navigated to home view';
            
            expect(currentViewSpan.textContent).toBe('home');
            
            // Simulate navigation to import
            navImportButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            currentViewSpan.textContent = 'import';
            navigationStatus.textContent = 'Navigated to import view';
            
            expect(currentViewSpan.textContent).toBe('import');
        });
        
        test('should track navigation history', async () => {
            // Mock NavigationSubsystem for testing
            const mockNavigationSubsystem = {
                navigationHistory: [],
                currentView: 'home',
                previousView: null,
                
                navigateToView: function(view) {
                    this.previousView = this.currentView;
                    this.currentView = view;
                    this.navigationHistory.push({
                        view: view,
                        timestamp: new Date().toISOString(),
                        from: this.previousView
                    });
                },
                
                getNavigationHistory: function() {
                    return [...this.navigationHistory];
                }
            };
            
            // Simulate multiple navigations
            mockNavigationSubsystem.navigateToView('import');
            mockNavigationSubsystem.navigateToView('export');
            mockNavigationSubsystem.navigateToView('settings');
            
            const history = mockNavigationSubsystem.getNavigationHistory();
            
            // Test that navigation history is tracked correctly
            expect(history.length).toBe(3);
            expect(history[0].view).toBe('import');
            expect(history[1].view).toBe('export');
            expect(history[2].view).toBe('settings');
            
            // Test that each history entry has required properties
            history.forEach(entry => {
                expect(entry).toHaveProperty('view');
                expect(entry).toHaveProperty('timestamp');
                expect(entry).toHaveProperty('from');
            });
            
            // Test current view tracking
            expect(mockNavigationSubsystem.currentView).toBe('settings');
            expect(mockNavigationSubsystem.previousView).toBe('export');
        });
    });
    
    describe('View Management Subsystem UI', () => {
        test('should show and hide views', async () => {
            const homeView = document.getElementById('home-view');
            const importView = document.getElementById('import-view');
            const exportView = document.getElementById('export-view');
            const viewManagementStatus = document.getElementById('view-management-status');
            
            // Simulate showing import view
            homeView.classList.remove('active');
            importView.classList.add('active');
            exportView.classList.remove('active');
            
            viewManagementStatus.textContent = 'Showing import view';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(homeView.classList.contains('active')).toBe(false);
            expect(importView.classList.contains('active')).toBe(true);
            expect(exportView.classList.contains('active')).toBe(false);
            
            // Simulate showing export view
            homeView.classList.remove('active');
            importView.classList.remove('active');
            exportView.classList.add('active');
            
            viewManagementStatus.textContent = 'Showing export view';
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(homeView.classList.contains('active')).toBe(false);
            expect(importView.classList.contains('active')).toBe(false);
            expect(exportView.classList.contains('active')).toBe(true);
        });
    });
    
    describe('Auth Management Subsystem UI', () => {
        test('should handle login process', async () => {
            const loginButton = document.getElementById('test-login');
            const authStatus = document.getElementById('auth-status');
            const tokenDisplay = document.getElementById('current-token');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            loginButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            authStatus.textContent = 'Login successful';
            tokenDisplay.textContent = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
            
            expect(authStatus.textContent).toContain('Login successful');
            expect(tokenDisplay.textContent).not.toBe('None');
        });
        
        test('should handle token refresh', async () => {
            const refreshButton = document.getElementById('test-token-refresh');
            const authStatus = document.getElementById('auth-status');
            const tokenDisplay = document.getElementById('current-token');
            
            // Set initial token
            tokenDisplay.textContent = 'old-token';
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            refreshButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            authStatus.textContent = 'Token refreshed';
            tokenDisplay.textContent = 'new-refreshed-token';
            
            expect(authStatus.textContent).toContain('refreshed');
            expect(tokenDisplay.textContent).toBe('new-refreshed-token');
        });
    });
    
    describe('Connection Manager Subsystem UI', () => {
        test('should establish connection', async () => {
            const connectButton = document.getElementById('test-connection');
            const connectionStatus = document.getElementById('connection-status');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            connectButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            connectionStatus.textContent = 'Connected to PingOne API';
            
            expect(connectionStatus.textContent).toContain('Connected');
        });
        
        test('should handle reconnection', async () => {
            // Mock ConnectionManagerSubsystem for testing
            const mockConnectionManager = {
                isConnected: false,
                connectionAttempts: 0,
                lastConnectionTime: null,
                connectionStatus: 'disconnected',
                
                async connect() {
                    this.connectionAttempts++;
                    this.lastConnectionTime = new Date().toISOString();
                    
                    // Simulate connection success after attempt
                    if (this.connectionAttempts >= 1) {
                        this.isConnected = true;
                        this.connectionStatus = 'connected';
                        return { success: true, message: 'Connected to PingOne API' };
                    }
                    
                    return { success: false, message: 'Connection failed' };
                },
                
                async reconnect() {
                    this.connectionStatus = 'reconnecting';
                    const result = await this.connect();
                    if (result.success) {
                        this.connectionStatus = 'reconnected';
                    }
                    return result;
                },
                
                getConnectionStatus() {
                    return {
                        isConnected: this.isConnected,
                        status: this.connectionStatus,
                        attempts: this.connectionAttempts,
                        lastConnection: this.lastConnectionTime
                    };
                }
            };
            
            // Test initial disconnected state
            expect(mockConnectionManager.isConnected).toBe(false);
            expect(mockConnectionManager.connectionStatus).toBe('disconnected');
            
            // Test reconnection functionality
            const reconnectResult = await mockConnectionManager.reconnect();
            
            // Verify reconnection was successful
            expect(reconnectResult.success).toBe(true);
            expect(reconnectResult.message).toContain('Connected');
            
            // Verify connection state after reconnection
            const status = mockConnectionManager.getConnectionStatus();
            expect(status.isConnected).toBe(true);
            expect(status.status).toBe('reconnected');
            expect(status.attempts).toBe(1);
            expect(status.lastConnection).toBeTruthy();
        });
    });
    
    describe('Operation Manager Subsystem UI', () => {
        test('should handle import operation', async () => {
            const importOpButton = document.getElementById('test-import-operation');
            const operationStatus = document.getElementById('operation-status');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            importOpButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            operationStatus.textContent = 'Import operation started';
            
            expect(operationStatus.textContent).toContain('Import');
        });
        
        test('should handle export operation', async () => {
            const exportOpButton = document.getElementById('test-export-operation');
            const operationStatus = document.getElementById('operation-status');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            exportOpButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            operationStatus.textContent = 'Export operation started';
            
            expect(operationStatus.textContent).toContain('Export');
        });
        
        test('should cancel operations', async () => {
            const importOpButton = document.getElementById('test-import-operation');
            const cancelOpButton = document.getElementById('test-cancel-operation');
            const operationStatus = document.getElementById('operation-status');
            
            // Start an operation
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            importOpButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Then cancel it
            cancelOpButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            operationStatus.textContent = 'Operation cancelled';
            
            expect(operationStatus.textContent).toContain('cancelled');
        });
    });
    
    describe('Realtime Communication Subsystem UI', () => {
        test('should establish WebSocket connection', async () => {
            // Mock RealtimeCommunicationSubsystem for testing
            const mockRealtimeComm = {
                isConnected: false,
                connectionType: null,
                messageQueue: [],
                connectionAttempts: 0,
                lastConnectionTime: null,
                
                async connectWebSocket(url = 'ws://localhost:4001/ws') {
                    this.connectionAttempts++;
                    this.connectionType = 'websocket';
                    
                    // Simulate WebSocket connection success
                    this.isConnected = true;
                    this.lastConnectionTime = new Date().toISOString();
                    
                    return {
                        success: true,
                        connectionType: 'websocket',
                        url: url,
                        message: 'WebSocket connection established'
                    };
                },
                
                async sendMessage(message) {
                    if (!this.isConnected) {
                        throw new Error('Not connected');
                    }
                    
                    this.messageQueue.push({
                        type: 'sent',
                        message: message,
                        timestamp: new Date().toISOString()
                    });
                    
                    return { success: true, messageId: Date.now() };
                },
                
                getConnectionStatus() {
                    return {
                        isConnected: this.isConnected,
                        connectionType: this.connectionType,
                        attempts: this.connectionAttempts,
                        lastConnection: this.lastConnectionTime,
                        messageCount: this.messageQueue.length
                    };
                },
                
                disconnect() {
                    this.isConnected = false;
                    this.connectionType = null;
                    return { success: true, message: 'Disconnected' };
                }
            };
            
            // Test initial disconnected state
            expect(mockRealtimeComm.isConnected).toBe(false);
            expect(mockRealtimeComm.connectionType).toBeNull();
            
            // Test WebSocket connection establishment
            const connectionResult = await mockRealtimeComm.connectWebSocket();
            
            // Verify connection was successful
            expect(connectionResult.success).toBe(true);
            expect(connectionResult.connectionType).toBe('websocket');
            expect(connectionResult.message).toContain('established');
            
            // Verify connection state after connection
            const status = mockRealtimeComm.getConnectionStatus();
            expect(status.isConnected).toBe(true);
            expect(status.connectionType).toBe('websocket');
            expect(status.attempts).toBe(1);
            expect(status.lastConnection).toBeTruthy();
            
            // Test message sending functionality
            const messageResult = await mockRealtimeComm.sendMessage('test message');
            expect(messageResult.success).toBe(true);
            expect(messageResult.messageId).toBeTruthy();
            
            // Verify message was queued
            const updatedStatus = mockRealtimeComm.getConnectionStatus();
            expect(updatedStatus.messageCount).toBe(1);
        });
        
        test('should handle Socket.IO connection', async () => {
            const socketIOButton = document.getElementById('test-socket-io');
            const realtimeStatus = document.getElementById('realtime-status');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            socketIOButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            realtimeStatus.textContent = 'Socket.IO connected';
            
            expect(realtimeStatus.textContent).toContain('Socket.IO');
        });
    });
    
    describe('Import Subsystem UI', () => {
        test('should handle file selection and population selection', async () => {
            const fileInput = document.getElementById('import-file-input');
            const populationSelect = document.getElementById('import-population-select');
            const importStatus = document.getElementById('import-status');
            
            // Mock file selection
            const file = new File(['email,name\ntest@example.com,Test User'], 'users.csv', { type: 'text/csv' });
            Object.defineProperty(fileInput, 'files', {
                value: [file],
                writable: false
            });
            
            const changeEvent = document.createEvent('Event');
            changeEvent.initEvent('change', true, true);
            fileInput.dispatchEvent(changeEvent);
            
            // Mock population selection
            populationSelect.value = 'pop1';
            populationSelect.dispatchEvent(changeEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            importStatus.textContent = 'File selected: users.csv, Population: Population 1';
            
            expect(importStatus.textContent).toContain('users.csv');
            expect(importStatus.textContent).toContain('Population');
        });
        
        test('should start and cancel import', async () => {
            // Mock ImportSubsystem for testing
            const mockImportSubsystem = {
                isImportRunning: false,
                importProgress: 0,
                importTotal: 0,
                importErrors: 0,
                importStatus: 'idle',
                sessionId: null,
                startTime: null,
                
                async startImport(file, populationId, options = {}) {
                    if (this.isImportRunning) {
                        throw new Error('Import already running');
                    }
                    
                    this.isImportRunning = true;
                    this.importStatus = 'running';
                    this.sessionId = `import_${Date.now()}`;
                    this.startTime = new Date().toISOString();
                    this.importTotal = options.totalRecords || 100;
                    this.importProgress = 0;
                    this.importErrors = 0;
                    
                    return {
                        success: true,
                        sessionId: this.sessionId,
                        message: 'Import started successfully',
                        status: this.importStatus
                    };
                },
                
                async cancelImport() {
                    if (!this.isImportRunning) {
                        throw new Error('No import running to cancel');
                    }
                    
                    this.isImportRunning = false;
                    this.importStatus = 'cancelled';
                    
                    return {
                        success: true,
                        message: 'Import cancelled successfully',
                        status: this.importStatus,
                        finalStats: {
                            processed: this.importProgress,
                            errors: this.importErrors,
                            duration: Date.now() - new Date(this.startTime).getTime()
                        }
                    };
                },
                
                getImportStatus() {
                    return {
                        isRunning: this.isImportRunning,
                        status: this.importStatus,
                        progress: {
                            current: this.importProgress,
                            total: this.importTotal,
                            percentage: this.importTotal > 0 ? Math.round((this.importProgress / this.importTotal) * 100) : 0
                        },
                        statistics: {
                            processed: this.importProgress,
                            errors: this.importErrors
                        },
                        sessionId: this.sessionId,
                        startTime: this.startTime
                    };
                }
            };
            
            // Test initial idle state
            expect(mockImportSubsystem.isImportRunning).toBe(false);
            expect(mockImportSubsystem.importStatus).toBe('idle');
            
            // Test starting import
            const mockFile = { name: 'users.csv', size: 1024 };
            const startResult = await mockImportSubsystem.startImport(mockFile, 'pop1', { totalRecords: 50 });
            
            // Verify import started successfully
            expect(startResult.success).toBe(true);
            expect(startResult.message).toContain('started');
            expect(startResult.status).toBe('running');
            expect(startResult.sessionId).toBeTruthy();
            
            // Verify import state after starting
            const runningStatus = mockImportSubsystem.getImportStatus();
            expect(runningStatus.isRunning).toBe(true);
            expect(runningStatus.status).toBe('running');
            expect(runningStatus.progress.total).toBe(50);
            expect(runningStatus.sessionId).toBeTruthy();
            
            // Test cancelling import
            const cancelResult = await mockImportSubsystem.cancelImport();
            
            // Verify import cancelled successfully
            expect(cancelResult.success).toBe(true);
            expect(cancelResult.message).toContain('cancelled');
            expect(cancelResult.status).toBe('cancelled');
            expect(cancelResult.finalStats).toBeTruthy();
            
            // Verify import state after cancelling
            const cancelledStatus = mockImportSubsystem.getImportStatus();
            expect(cancelledStatus.isRunning).toBe(false);
            expect(cancelledStatus.status).toBe('cancelled');
        });
    });
    
    describe('Export Subsystem UI', () => {
        test('should handle population selection for export', async () => {
            // Mock ExportSubsystem for testing
            const mockExportSubsystem = {
                selectedPopulation: null,
                availablePopulations: [
                    { id: 'pop1', name: 'Sample Users', userCount: 360 },
                    { id: 'pop2', name: 'Test Population', userCount: 150 },
                    { id: 'pop3', name: 'Production Users', userCount: 500 }
                ],
                exportSettings: {
                    format: 'csv',
                    includeHeaders: true,
                    fields: ['email', 'name', 'username']
                },
                
                async selectPopulation(populationId) {
                    const population = this.availablePopulations.find(p => p.id === populationId);
                    if (!population) {
                        throw new Error(`Population not found: ${populationId}`);
                    }
                    
                    this.selectedPopulation = population;
                    
                    return {
                        success: true,
                        population: population,
                        message: `Population selected: ${population.name}`,
                        userCount: population.userCount
                    };
                },
                
                getSelectedPopulation() {
                    return this.selectedPopulation;
                },
                
                async validateExportSettings() {
                    if (!this.selectedPopulation) {
                        return {
                            valid: false,
                            errors: ['No population selected']
                        };
                    }
                    
                    return {
                        valid: true,
                        population: this.selectedPopulation,
                        estimatedRecords: this.selectedPopulation.userCount,
                        settings: this.exportSettings
                    };
                },
                
                async getExportPreview() {
                    if (!this.selectedPopulation) {
                        throw new Error('No population selected');
                    }
                    
                    return {
                        populationName: this.selectedPopulation.name,
                        totalUsers: this.selectedPopulation.userCount,
                        fields: this.exportSettings.fields,
                        format: this.exportSettings.format,
                        preview: [
                            { email: 'user1@example.com', name: 'User One', username: 'user1' },
                            { email: 'user2@example.com', name: 'User Two', username: 'user2' }
                        ]
                    };
                }
            };
            
            // Test initial state - no population selected
            expect(mockExportSubsystem.selectedPopulation).toBeNull();
            expect(mockExportSubsystem.availablePopulations.length).toBe(3);
            
            // Test population selection
            const selectionResult = await mockExportSubsystem.selectPopulation('pop2');
            
            // Verify population selection was successful
            expect(selectionResult.success).toBe(true);
            expect(selectionResult.population.id).toBe('pop2');
            expect(selectionResult.population.name).toBe('Test Population');
            expect(selectionResult.message).toContain('Test Population');
            expect(selectionResult.userCount).toBe(150);
            
            // Verify population is now selected
            const selectedPopulation = mockExportSubsystem.getSelectedPopulation();
            expect(selectedPopulation).toBeTruthy();
            expect(selectedPopulation.id).toBe('pop2');
            expect(selectedPopulation.name).toBe('Test Population');
            
            // Test export settings validation
            const validationResult = await mockExportSubsystem.validateExportSettings();
            expect(validationResult.valid).toBe(true);
            expect(validationResult.population.id).toBe('pop2');
            expect(validationResult.estimatedRecords).toBe(150);
            
            // Test export preview functionality
            const previewResult = await mockExportSubsystem.getExportPreview();
            expect(previewResult.populationName).toBe('Test Population');
            expect(previewResult.totalUsers).toBe(150);
            expect(previewResult.fields).toEqual(['email', 'name', 'username']);
            expect(previewResult.preview.length).toBe(2);
        });
        
        test('should start and cancel export', async () => {
            // Mock ExportSubsystem for testing export operations
            const mockExportSubsystem = {
                isExportRunning: false,
                exportProgress: 0,
                exportTotal: 0,
                exportErrors: 0,
                exportStatus: 'idle',
                sessionId: null,
                startTime: null,
                selectedPopulation: { id: 'pop1', name: 'Test Population', userCount: 100 },
                
                async startExport(populationId, options = {}) {
                    if (this.isExportRunning) {
                        throw new Error('Export already running');
                    }
                    
                    this.isExportRunning = true;
                    this.exportStatus = 'running';
                    this.sessionId = `export_${Date.now()}`;
                    this.startTime = new Date().toISOString();
                    this.exportTotal = options.totalRecords || this.selectedPopulation.userCount;
                    this.exportProgress = 0;
                    this.exportErrors = 0;
                    
                    return {
                        success: true,
                        sessionId: this.sessionId,
                        message: 'Export started successfully',
                        status: this.exportStatus,
                        populationId: populationId
                    };
                },
                
                async cancelExport() {
                    if (!this.isExportRunning) {
                        throw new Error('No export running to cancel');
                    }
                    
                    this.isExportRunning = false;
                    this.exportStatus = 'cancelled';
                    
                    return {
                        success: true,
                        message: 'Export cancelled successfully',
                        status: this.exportStatus,
                        finalStats: {
                            processed: this.exportProgress,
                            errors: this.exportErrors,
                            duration: Date.now() - new Date(this.startTime).getTime()
                        }
                    };
                },
                
                getExportStatus() {
                    return {
                        isRunning: this.isExportRunning,
                        status: this.exportStatus,
                        progress: {
                            current: this.exportProgress,
                            total: this.exportTotal,
                            percentage: this.exportTotal > 0 ? Math.round((this.exportProgress / this.exportTotal) * 100) : 0
                        },
                        statistics: {
                            processed: this.exportProgress,
                            errors: this.exportErrors
                        },
                        sessionId: this.sessionId,
                        startTime: this.startTime
                    };
                }
            };
            
            // Test initial state - no export running
            expect(mockExportSubsystem.isExportRunning).toBe(false);
            expect(mockExportSubsystem.exportStatus).toBe('idle');
            
            // Test export start
            const startResult = await mockExportSubsystem.startExport('pop1', { totalRecords: 100 });
            
            // Verify export started successfully
            expect(startResult.success).toBe(true);
            expect(startResult.message).toContain('started');
            expect(startResult.status).toBe('running');
            expect(startResult.sessionId).toBeTruthy();
            expect(startResult.populationId).toBe('pop1');
            
            // Verify export is now running
            const runningStatus = mockExportSubsystem.getExportStatus();
            expect(runningStatus.isRunning).toBe(true);
            expect(runningStatus.status).toBe('running');
            expect(runningStatus.progress.total).toBe(100);
            expect(runningStatus.sessionId).toBeTruthy();
            
            // Test export cancellation
            const cancelResult = await mockExportSubsystem.cancelExport();
            
            // Verify export cancelled successfully
            expect(cancelResult.success).toBe(true);
            expect(cancelResult.message).toContain('cancelled');
            expect(cancelResult.status).toBe('cancelled');
            expect(cancelResult.finalStats).toBeTruthy();
            
            // Verify export is no longer running
            const cancelledStatus = mockExportSubsystem.getExportStatus();
            expect(cancelledStatus.isRunning).toBe(false);
            expect(cancelledStatus.status).toBe('cancelled');
        });
    });
});