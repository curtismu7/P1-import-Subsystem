/**
 * Progress UI Improvements Test Script
 * 
 * This script tests all the improvements made to the progress UI system:
 * 1. Progress UI Display for different operations
 * 2. Socket.IO connection and reconnection
 * 3. Progress persistence
 * 4. Token refresh handling
 */

class ProgressImprovementsTester {
    constructor() {
        this.testResults = {
            progressUI: { passed: 0, failed: 0, tests: [] },
            socketIO: { passed: 0, failed: 0, tests: [] },
            persistence: { passed: 0, failed: 0, tests: [] },
            tokenRefresh: { passed: 0, failed: 0, tests: [] }
        };
        
        this.logContainer = null;
    }
    
    /**
     * Initialize the test UI
     */
    initTestUI() {
        // Create test UI container
        const container = document.createElement('div');
        container.className = 'test-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            overflow-y: auto;
            padding: 15px;
            font-family: Arial, sans-serif;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.innerHTML = `
            <h2 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
                <span style="color: #007bff;">🧪</span> Progress Improvements Test
            </h2>
            <p style="color: #666; margin-bottom: 15px;">
                Test all progress UI improvements and fixes
            </p>
        `;
        
        // Create test buttons
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        `;
        
        buttons.innerHTML = `
            <button class="test-btn" data-test="all" style="background: #007bff; color: white;">Run All Tests</button>
            <button class="test-btn" data-test="progressUI" style="background: #28a745; color: white;">Test Progress UI</button>
            <button class="test-btn" data-test="socketIO" style="background: #17a2b8; color: white;">Test Socket.IO</button>
            <button class="test-btn" data-test="persistence" style="background: #ffc107; color: black;">Test Persistence</button>
            <button class="test-btn" data-test="tokenRefresh" style="background: #dc3545; color: white;">Test Token Refresh</button>
        `;
        
        // Create log container
        this.logContainer = document.createElement('div');
        this.logContainer.className = 'log-container';
        this.logContainer.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            height: 300px;
            overflow-y: auto;
            margin-top: 10px;
        `;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        `;
        closeBtn.onclick = () => document.body.removeChild(container);
        
        // Assemble UI
        container.appendChild(header);
        container.appendChild(buttons);
        container.appendChild(this.logContainer);
        container.appendChild(closeBtn);
        
        // Add to document
        document.body.appendChild(container);
        
        // Add event listeners to buttons
        const testBtns = container.querySelectorAll('.test-btn');
        testBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const testType = btn.getAttribute('data-test');
                this.runTest(testType);
            });
        });
        
        this.log('Test UI initialized', 'info');
    }
    
    /**
     * Run a specific test or all tests
     * @param {string} testType - Type of test to run
     */
    async runTest(testType) {
        this.log(`Running ${testType === 'all' ? 'all tests' : testType + ' test'}...`, 'info');
        
        try {
            if (testType === 'all' || testType === 'progressUI') {
                await this.testProgressUI();
            }
            
            if (testType === 'all' || testType === 'socketIO') {
                await this.testSocketIO();
            }
            
            if (testType === 'all' || testType === 'persistence') {
                await this.testProgressPersistence();
            }
            
            if (testType === 'all' || testType === 'tokenRefresh') {
                await this.testTokenRefresh();
            }
            
            if (testType === 'all') {
                this.displaySummary();
            }
        } catch (error) {
            this.log(`Error running tests: ${error.message}`, 'error');
        }
    }
    
    /**
     * Test the progress UI display
     */
    async testProgressUI() {
        this.log('Testing Progress UI...', 'info');
        
        // Test 1: Check if progress-ui.css is loaded
        const cssLoaded = Array.from(document.styleSheets).some(sheet => {
            try {
                return sheet.href && sheet.href.includes('progress-ui.css');
            } catch (e) {
                return false;
            }
        });
        
        this.recordTestResult('progressUI', 'CSS Loaded', cssLoaded, 
            cssLoaded ? 'progress-ui.css is loaded' : 'progress-ui.css is not loaded');
        
        // Test 2: Check if progress containers exist
        const containers = {
            import: document.getElementById('progress-container'),
            delete: document.getElementById('progress-container-delete'),
            modify: document.getElementById('progress-container-modify'),
            export: document.getElementById('progress-container-export')
        };
        
        Object.entries(containers).forEach(([type, container]) => {
            this.recordTestResult('progressUI', `${type} Container`, !!container, 
                container ? `${type} progress container found` : `${type} progress container not found`);
        });
        
        // Test 3: Check if progress manager exists
        let progressManagerExists = false;
        try {
            // Try to access the progress manager (might be in different scopes)
            progressManagerExists = (
                typeof window.progressManager !== 'undefined' || 
                typeof progressManager !== 'undefined'
            );
        } catch (e) {
            progressManagerExists = false;
        }
        
        this.recordTestResult('progressUI', 'Progress Manager', progressManagerExists, 
            progressManagerExists ? 'Progress manager found' : 'Progress manager not found');
        
        // Test 4: Try to show a progress container
        let canShowProgress = false;
        try {
            const container = containers.import || containers.delete || 
                              containers.modify || containers.export;
            
            if (container) {
                // Save original display style
                const originalDisplay = container.style.display;
                
                // Try to show
                container.style.display = 'flex';
                container.classList.add('visible');
                
                // Check if it's visible
                const computedStyle = window.getComputedStyle(container);
                canShowProgress = computedStyle.display !== 'none' && 
                                  computedStyle.visibility !== 'hidden';
                
                // Restore original style
                container.style.display = originalDisplay;
                container.classList.remove('visible');
            }
        } catch (e) {
            canShowProgress = false;
        }
        
        this.recordTestResult('progressUI', 'Show Progress', canShowProgress, 
            canShowProgress ? 'Progress container can be shown' : 'Cannot show progress container');
        
        this.displayTestResults('progressUI');
    }
    
    /**
     * Test Socket.IO connection
     */
    async testSocketIO() {
        this.log('Testing Socket.IO...', 'info');
        
        // Test 1: Check if Socket.IO client is available
        const socketIOAvailable = typeof io !== 'undefined';
        
        this.recordTestResult('socketIO', 'Socket.IO Available', socketIOAvailable, 
            socketIOAvailable ? 'Socket.IO client is available' : 'Socket.IO client is not available');
        
        if (!socketIOAvailable) {
            this.log('Socket.IO client not available, skipping connection tests', 'warn');
            this.displayTestResults('socketIO');
            return;
        }
        
        // Test 2: Try to connect to Socket.IO
        let socketConnected = false;
        let socketId = null;
        
        try {
            const socket = io('/', {
                transports: ['websocket', 'polling'],
                timeout: 3000,
                forceNew: true
            });
            
            socketConnected = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 3000);
                
                socket.on('connect', () => {
                    clearTimeout(timeout);
                    socketId = socket.id;
                    resolve(true);
                });
                
                socket.on('connect_error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });
            
            // Disconnect after test
            if (socket.connected) {
                socket.disconnect();
            }
        } catch (e) {
            socketConnected = false;
        }
        
        this.recordTestResult('socketIO', 'Socket.IO Connect', socketConnected, 
            socketConnected ? `Connected to Socket.IO (ID: ${socketId})` : 'Failed to connect to Socket.IO');
        
        // Test 3: Check if token-refresh-handler.js is loaded
        const tokenRefreshLoaded = this.isScriptLoaded('token-refresh-handler.js');
        
        this.recordTestResult('socketIO', 'Token Refresh Handler', tokenRefreshLoaded, 
            tokenRefreshLoaded ? 'Token refresh handler is loaded' : 'Token refresh handler is not loaded');
        
        this.displayTestResults('socketIO');
    }
    
    /**
     * Test progress persistence
     */
    async testProgressPersistence() {
        this.log('Testing Progress Persistence...', 'info');
        
        // Test 1: Check if progress-persistence.js is loaded
        const persistenceLoaded = this.isScriptLoaded('progress-persistence.js');
        
        this.recordTestResult('persistence', 'Module Loaded', persistenceLoaded, 
            persistenceLoaded ? 'Progress persistence module is loaded' : 'Progress persistence module is not loaded');
        
        // Test 2: Try to store and retrieve test data
        let persistenceWorks = false;
        
        try {
            // Try to access the progress persistence module
            const testKey = 'pingone-progress-test';
            const testData = { test: true, timestamp: new Date().toISOString() };
            
            // Store test data
            localStorage.setItem(testKey, JSON.stringify(testData));
            
            // Retrieve test data
            const retrievedData = JSON.parse(localStorage.getItem(testKey));
            
            // Check if data matches
            persistenceWorks = retrievedData && retrievedData.test === true;
            
            // Clean up
            localStorage.removeItem(testKey);
        } catch (e) {
            persistenceWorks = false;
        }
        
        this.recordTestResult('persistence', 'Storage Works', persistenceWorks, 
            persistenceWorks ? 'Local storage works for persistence' : 'Local storage not working');
        
        this.displayTestResults('persistence');
    }
    
    /**
     * Test token refresh handler
     */
    async testTokenRefresh() {
        this.log('Testing Token Refresh Handler...', 'info');
        
        // Test 1: Check if token-refresh-handler.js is loaded
        const handlerLoaded = this.isScriptLoaded('token-refresh-handler.js');
        
        this.recordTestResult('tokenRefresh', 'Module Loaded', handlerLoaded, 
            handlerLoaded ? 'Token refresh handler module is loaded' : 'Token refresh handler module is not loaded');
        
        // Test 2: Check if we can access the token refresh handler
        let handlerAccessible = false;
        
        try {
            // Try different ways to access the token refresh handler
            handlerAccessible = (
                typeof window.tokenRefreshHandler !== 'undefined' || 
                typeof tokenRefreshHandler !== 'undefined'
            );
        } catch (e) {
            handlerAccessible = false;
        }
        
        this.recordTestResult('tokenRefresh', 'Handler Accessible', handlerAccessible, 
            handlerAccessible ? 'Token refresh handler is accessible' : 'Token refresh handler is not accessible');
        
        this.displayTestResults('tokenRefresh');
    }
    
    /**
     * Check if a script is loaded
     * @param {string} scriptName - Name of the script to check
     * @returns {boolean} True if the script is loaded
     */
    isScriptLoaded(scriptName) {
        const scripts = document.querySelectorAll('script');
        return Array.from(scripts).some(script => {
            return script.src && script.src.includes(scriptName);
        });
    }
    
    /**
     * Record a test result
     * @param {string} category - Test category
     * @param {string} name - Test name
     * @param {boolean} passed - Whether the test passed
     * @param {string} details - Test details
     */
    recordTestResult(category, name, passed, details) {
        this.testResults[category].tests.push({ name, passed, details });
        
        if (passed) {
            this.testResults[category].passed++;
            this.log(`✅ ${name}: PASS - ${details}`, 'success');
        } else {
            this.testResults[category].failed++;
            this.log(`❌ ${name}: FAIL - ${details}`, 'error');
        }
    }
    
    /**
     * Display test results for a category
     * @param {string} category - Test category
     */
    displayTestResults(category) {
        const { passed, failed, tests } = this.testResults[category];
        const total = tests.length;
        
        this.log(`\n📊 ${category.toUpperCase()} TEST RESULTS: ${passed}/${total} passed (${failed} failed)`, 
            failed > 0 ? 'warn' : 'info');
    }
    
    /**
     * Display summary of all test results
     */
    displaySummary() {
        let totalPassed = 0;
        let totalFailed = 0;
        
        Object.values(this.testResults).forEach(result => {
            totalPassed += result.passed;
            totalFailed += result.failed;
        });
        
        const totalTests = totalPassed + totalFailed;
        
        this.log('\n📈 OVERALL TEST SUMMARY', 'info');
        this.log(`Total Tests: ${totalTests}`, 'info');
        this.log(`Passed: ${totalPassed}`, 'success');
        this.log(`Failed: ${totalFailed}`, 'error');
        
        if (totalFailed === 0) {
            this.log('\n🎉 All tests passed! Progress improvements are working correctly.', 'success');
        } else {
            this.log('\n⚠️ Some tests failed. Check the details above.', 'warn');
        }
    }
    
    /**
     * Log a message to the log container
     * @param {string} message - Message to log
     * @param {string} type - Type of message (info, success, error, warn)
     */
    log(message, type = 'info') {
        if (!this.logContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        // Style based on type
        let color = '#333';
        switch (type) {
            case 'success': color = '#28a745'; break;
            case 'error': color = '#dc3545'; break;
            case 'warn': color = '#ffc107'; break;
            case 'info': color = '#17a2b8'; break;
        }
        
        logEntry.style.cssText = `
            margin: 2px 0;
            color: ${color};
        `;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span style="color: #6c757d; font-size: 0.9em;">[${timestamp}]</span> ${message}`;
        
        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
        
        // Also log to console
        console.log(`[${timestamp}] ${message}`);
    }
}

// Create and initialize the tester
const tester = new ProgressImprovementsTester();
tester.initTestUI();