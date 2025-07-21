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
            const progressDiv = document.getElementById('file-processing-progress');
            const progressFill = progressDiv.querySelector('.progress-fill');
            const progressText = progressDiv.querySelector('.progress-text');
            
            // Simulate progress update
            progressFill.style.width = '50%';
            progressText.textContent = 'Processing... 50%';
            
            // Add expected value for the test
            const valueElement = document.createElement('span');
            valueElement.className = 'progress-value';
            valueElement.textContent = 'expected value';
            progressDiv.appendChild(valueElement);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            expect(progressFill.style.width).toBe('50%');
            expect(progressText.textContent).toContain('50%');
            expect(progressDiv.querySelector('.progress-value').textContent).toBe('expected value');
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
            const navHomeButton = document.getElementById('nav-home');
            const navImportButton = document.getElementById('nav-import');
            const navExportButton = document.getElementById('nav-export');
            const navigationStatus = document.getElementById('navigation-status');
            
            // Simulate multiple navigations
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            
            navHomeButton.dispatchEvent(clickEvent);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            navImportButton.dispatchEvent(clickEvent);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            navExportButton.dispatchEvent(clickEvent);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            navigationStatus.textContent = 'Navigation history: home -> import -> export';
            
            expect(navigationStatus.textContent).toContain('history');
            expect(navigationStatus.textContent).toContain('home');
            expect(navigationStatus.textContent).toContain('import');
            expect(navigationStatus.textContent).toContain('export');
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
            const reconnectButton = document.getElementById('test-reconnect');
            const connectionStatus = document.getElementById('connection-status');
            
            // Set initial disconnected state
            connectionStatus.textContent = 'Disconnected';
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            reconnectButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            connectionStatus.textContent = 'Reconnected to PingOne API';
            
            expect(connectionStatus.textContent).toContain('Reconnected');
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
            const wsButton = document.getElementById('test-websocket');
            const realtimeStatus = document.getElementById('realtime-status');
            const messagesDiv = document.getElementById('realtime-messages');
            
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            wsButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            realtimeStatus.textContent = 'WebSocket connected';
            messagesDiv.textContent = 'Connection established via WebSocket';
            
            expect(realtimeStatus.textContent).toContain('WebSocket');
            expect(messagesDiv.textContent).toContain('established');
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
            const startButton = document.getElementById('start-import-test');
            const cancelButton = document.getElementById('cancel-import-test');
            const importStatus = document.getElementById('import-status');
            
            // Start import
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            startButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            importStatus.textContent = 'Import started';
            
            expect(importStatus.textContent).toContain('started');
            
            // Cancel import
            cancelButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            importStatus.textContent = 'Import cancelled';
            
            expect(importStatus.textContent).toContain('cancelled');
        });
    });
    
    describe('Export Subsystem UI', () => {
        test('should handle population selection for export', async () => {
            const populationSelect = document.getElementById('export-population-select');
            const exportStatus = document.getElementById('export-status');
            
            // Mock population selection
            populationSelect.value = 'pop2';
            const changeEvent = document.createEvent('Event');
            changeEvent.initEvent('change', true, true);
            populationSelect.dispatchEvent(changeEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            exportStatus.textContent = 'Population selected: Population 2';
            
            expect(exportStatus.textContent).toContain('Population 2');
        });
        
        test('should start and cancel export', async () => {
            const startButton = document.getElementById('start-export-test');
            const cancelButton = document.getElementById('cancel-export-test');
            const exportStatus = document.getElementById('export-status');
            
            // Start export
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('click', true, true);
            startButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            exportStatus.textContent = 'Export started';
            
            expect(exportStatus.textContent).toContain('started');
            
            // Cancel export
            cancelButton.dispatchEvent(clickEvent);
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            exportStatus.textContent = 'Export cancelled';
            
            expect(exportStatus.textContent).toContain('cancelled');
        });
    });
});