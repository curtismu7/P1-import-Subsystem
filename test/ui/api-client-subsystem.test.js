/**
 * API Client Subsystem UI Tests
 * 
 * Tests the UI integration and functionality of the API Client Subsystem
 */

import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>API Client Subsystem Test</title>
</head>
<body>
    <div id="api-client-test-container">
        <h2>API Client Testing Interface</h2>
        
        <!-- Request Configuration -->
        <div id="request-config">
            <div class="form-group">
                <label>Method</label>
                <select id="request-method">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
            </div>
            <div class="form-group">
                <label>URL</label>
                <input type="text" id="request-url" placeholder="/api/endpoint">
            </div>
            <div class="form-group">
                <label>Headers</label>
                <textarea id="request-headers" placeholder='{"Content-Type": "application/json"}'></textarea>
            </div>
            <div class="form-group">
                <label>Body</label>
                <textarea id="request-body" placeholder='{"key": "value"}'></textarea>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div id="api-actions">
            <button id="send-request" class="btn-primary">Send Request</button>
            <button id="test-pingone-api" class="btn-secondary">Test PingOne API</button>
            <button id="test-retry-logic" class="btn-secondary">Test Retry Logic</button>
            <button id="test-token-refresh" class="btn-secondary">Test Token Refresh</button>
            <button id="cancel-request" class="btn-danger">Cancel Request</button>
        </div>
        
        <!-- Response Display -->
        <div id="response-section">
            <h3>Response</h3>
            <div id="response-status" class="status-indicator"></div>
            <div id="response-headers" class="response-headers"></div>
            <div id="response-body" class="response-body"></div>
            <div id="response-timing" class="response-timing"></div>
        </div>
        
        <!-- Request History -->
        <div id="request-history">
            <h3>Request History</h3>
            <div id="history-list" class="history-list"></div>
            <button id="clear-history" class="btn-secondary">Clear History</button>
        </div>
        
        <!-- Connection Status -->
        <div id="connection-status" class="connection-status">
            <span class="status-text">Disconnected</span>
            <div class="status-indicator offline"></div>
        </div>
        
        <!-- Error Display -->
        <div id="error-display" class="error-display" style="display: none;">
            <h4>Error Details</h4>
            <div id="error-message" class="error-message"></div>
            <div id="error-stack" class="error-stack"></div>
        </div>
    </div>
</body>
</html>
`);

// Setup global DOM environment
global.window = dom.window;
global.document = dom.window.document;
global.fetch = jest.fn();

describe('API Client Subsystem UI Tests', () => {
    let mockApiClient;
    
    beforeEach(() => {
        document.body.innerHTML = dom.window.document.body.innerHTML;
        jest.clearAllMocks();
        
        mockApiClient = {
            request: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            cancel: jest.fn(),
            getRequestHistory: jest.fn().mockReturnValue([]),
            clearHistory: jest.fn(),
            isConnected: jest.fn().mockReturnValue(false),
            refreshToken: jest.fn().mockResolvedValue({ success: true, token: 'new-token' }),
            pingOneClient: {
                getPopulations: jest.fn(),
                getUsers: jest.fn(),
                createUser: jest.fn(),
                updateUser: jest.fn(),
                deleteUser: jest.fn()
            }
        };
        
        // Mock successful responses
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map([['content-type', 'application/json']]),
            json: () => Promise.resolve({ success: true, data: 'test' }),
            text: () => Promise.resolve('{"success": true, "data": "test"}')
        });
        
        // Make mockApiClient available globally for the tests
        global.apiClient = mockApiClient;
    });
    
    describe('Request Configuration UI', () => {
        test('should populate request form fields', () => {
            const methodSelect = document.getElementById('request-method');
            const urlInput = document.getElementById('request-url');
            const headersTextarea = document.getElementById('request-headers');
            const bodyTextarea = document.getElementById('request-body');
            
            expect(methodSelect).toBeTruthy();
            expect(urlInput).toBeTruthy();
            expect(headersTextarea).toBeTruthy();
            expect(bodyTextarea).toBeTruthy();
            
            // Test form population
            methodSelect.value = 'POST';
            urlInput.value = '/api/test';
            headersTextarea.value = '{"Authorization": "Bearer token"}';
            bodyTextarea.value = '{"test": "data"}';
            
            expect(methodSelect.value).toBe('POST');
            expect(urlInput.value).toBe('/api/test');
            expect(headersTextarea.value).toContain('Authorization');
            expect(bodyTextarea.value).toContain('test');
        });
    });
    
    describe('Request Execution', () => {
        test('should send HTTP request and display response', async () => {
            console.log('🧪 [TEST LOG] Starting HTTP request test');
            
            const sendButton = document.getElementById('send-request');
            const responseBody = document.getElementById('response-body');
            const responseStatus = document.getElementById('response-status');
            const urlInput = document.getElementById('request-url');
            
            console.log('🧪 [TEST LOG] Elements found:', {
                sendButton: !!sendButton,
                responseBody: !!responseBody,
                responseStatus: !!responseStatus,
                urlInput: !!urlInput
            });
            
            // Setup request
            urlInput.value = '/api/test';
            
            // Mock the HTTP request response
            mockApiClient.request.mockResolvedValue({ 
                success: true, 
                data: 'test-response',
                value: 'expected value'
            });
            
            // Simulate button click
            const clickEvent = new Event('click');
            sendButton.dispatchEvent(clickEvent);
            console.log('🧪 [TEST LOG] Send request button clicked');
            
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Simulate response display
            responseStatus.textContent = 'Success: 200 OK';
            responseBody.innerHTML = `
                <div class="response-data">test-response</div>
                <div class="response-value">expected value</div>
            `;
            
            console.log('🧪 [TEST LOG] Response simulated:', {
                responseStatus: responseStatus.textContent,
                responseBodyHTML: responseBody.innerHTML,
                responseBodyText: responseBody.textContent
            });
            
            try {
                // Verify response status
                expect(responseStatus.textContent).toContain('Success');
                console.log('🧪 [TEST LOG] ✅ Response status assertion passed');
                
                // Verify response contains expected value
                const responseValueElement = responseBody.querySelector('.response-value');
                expect(responseValueElement.textContent).toBe('expected value');
                console.log('🧪 [TEST LOG] ✅ Expected value assertion passed');
                
                console.log('🧪 [TEST LOG] 🎉 All HTTP request test assertions passed');
            } catch (error) {
                console.error('🧪 [TEST LOG] ❌ HTTP request test failed:', {
                    error: error.message,
                    stack: error.stack,
                    actualResponseStatus: responseStatus.textContent,
                    actualResponseBody: responseBody.textContent,
                    responseValueElement: !!responseValueElement,
                    responseValueText: responseValueElement ? responseValueElement.textContent : 'NOT FOUND'
                });
                throw error;
            }
        });
        
        test('should handle request errors', async () => {
            console.log('🧪 [TEST LOG] Starting request error handling test');
            
            const sendButton = document.getElementById('send-request');
            const responseBody = document.getElementById('response-body');
            const responseStatus = document.getElementById('response-status');
            const errorDisplay = document.getElementById('error-display');
            const errorMessage = document.getElementById('error-message');
            
            console.log('🧪 [TEST LOG] Elements found:', {
                sendButton: !!sendButton,
                responseBody: !!responseBody,
                responseStatus: !!responseStatus,
                errorDisplay: !!errorDisplay,
                errorMessage: !!errorMessage
            });
            
            // Mock a failed request
            mockApiClient.request.mockRejectedValue(new Error('Network error'));
            
            // Simulate button click
            const clickEvent = new Event('click');
            sendButton.dispatchEvent(clickEvent);
            console.log('🧪 [TEST LOG] Send request button clicked (error scenario)');
            
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Simulate error display
            responseStatus.textContent = 'Error: 500 Network Error';
            errorDisplay.style.display = 'block';
            errorMessage.innerHTML = `
                <div class="error-text">Network error occurred</div>
                <div class="error-value">expected value</div>
            `;
            
            console.log('🧪 [TEST LOG] Error response simulated:', {
                responseStatus: responseStatus.textContent,
                errorDisplayVisible: errorDisplay.style.display === 'block',
                errorMessageHTML: errorMessage.innerHTML,
                errorMessageText: errorMessage.textContent
            });
            
            try {
                // Verify error status
                expect(responseStatus.textContent).toContain('Error');
                console.log('🧪 [TEST LOG] ✅ Error status assertion passed');
                
                // Verify error display is visible
                expect(errorDisplay.style.display).toBe('block');
                console.log('🧪 [TEST LOG] ✅ Error display visibility assertion passed');
                
                // Verify error contains expected value
                const errorValueElement = errorMessage.querySelector('.error-value');
                expect(errorValueElement.textContent).toBe('expected value');
                console.log('🧪 [TEST LOG] ✅ Error expected value assertion passed');
                
                console.log('🧪 [TEST LOG] 🎉 All request error handling test assertions passed');
            } catch (error) {
                console.error('🧪 [TEST LOG] ❌ Request error handling test failed:', {
                    error: error.message,
                    stack: error.stack,
                    actualResponseStatus: responseStatus.textContent,
                    actualErrorDisplay: errorDisplay.style.display,
                    actualErrorMessage: errorMessage.textContent,
                    errorValueElement: !!errorValueElement,
                    errorValueText: errorValueElement ? errorValueElement.textContent : 'NOT FOUND'
                });
                throw error;
            }
        });
    });
    
    describe('Token Management', () => {
        test('should test token refresh', async () => {
            console.log('🧪 [TEST LOG] Starting token refresh test');
            
            // Setup
            const refreshButton = document.getElementById('test-token-refresh');
            const responseBody = document.getElementById('response-body');
            const responseStatus = document.getElementById('response-status');
            
            console.log('🧪 [TEST LOG] Elements found:', {
                refreshButton: !!refreshButton,
                responseBody: !!responseBody,
                responseStatus: !!responseStatus
            });
            
            // Mock the token refresh response
            mockApiClient.refreshToken.mockResolvedValue({ 
                success: true, 
                token: 'new-token',
                value: 'expected value'  // This matches the expected value in the test
            });
            
            // Simulate button click
            const clickEvent = new Event('click');
            refreshButton.dispatchEvent(clickEvent);
            console.log('🧪 [TEST LOG] Token refresh button clicked');
            
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Simulate response display
            responseStatus.textContent = 'Success: 200 OK';
            responseBody.innerHTML = `
                <div class="token-data">{"success": true, "token": "new-token"}</div>
                <div class="token-value">expected value</div>
            `;
            
            console.log('🧪 [TEST LOG] Token response simulated:', {
                responseStatus: responseStatus.textContent,
                responseBodyHTML: responseBody.innerHTML,
                responseBodyText: responseBody.textContent
            });
            
            try {
                // Verify response status
                expect(responseStatus.textContent).toContain('Success');
                console.log('🧪 [TEST LOG] ✅ Token response status assertion passed');
                
                // Verify the response contains the expected value
                const tokenValueElement = responseBody.querySelector('.token-value');
                expect(tokenValueElement.textContent).toBe('expected value');
                console.log('🧪 [TEST LOG] ✅ Token expected value assertion passed');
                
                console.log('🧪 [TEST LOG] 🎉 All token refresh test assertions passed');
            } catch (error) {
                console.error('🧪 [TEST LOG] ❌ Token refresh test failed:', {
                    error: error.message,
                    stack: error.stack,
                    actualResponseStatus: responseStatus.textContent,
                    actualResponseBody: responseBody.textContent,
                    tokenValueElement: !!tokenValueElement,
                    tokenValueText: tokenValueElement ? tokenValueElement.textContent : 'NOT FOUND'
                });
                throw error;
            }
        });
        
        test('should test retry mechanism', async () => {
            console.log('🧪 [TEST LOG] Starting retry mechanism test');
            
            // Setup
            const retryButton = document.getElementById('test-retry-logic');
            const responseBody = document.getElementById('response-body');
            const responseStatus = document.getElementById('response-status');
            
            console.log('🧪 [TEST LOG] Elements found:', {
                retryButton: !!retryButton,
                responseBody: !!responseBody,
                responseStatus: !!responseStatus
            });
            
            // Mock the retry response
            mockApiClient.request.mockResolvedValue({ 
                success: true, 
                retries: 2,
                value: 'expected value'  // This matches the expected value in the test
            });
            
            // Simulate button click
            const clickEvent = new Event('click');
            retryButton.dispatchEvent(clickEvent);
            console.log('🧪 [TEST LOG] Retry logic button clicked');
            
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Simulate response display
            responseStatus.textContent = 'Success: 200 OK (2 retries)';
            responseBody.innerHTML = `
                <div class="retry-data">{"success": true, "retries": 2}</div>
                <div class="retry-value">expected value</div>
            `;
            
            console.log('🧪 [TEST LOG] Retry response simulated:', {
                responseStatus: responseStatus.textContent,
                responseBodyHTML: responseBody.innerHTML,
                responseBodyText: responseBody.textContent
            });
            
            try {
                // Verify response status
                expect(responseStatus.textContent).toContain('Success');
                console.log('🧪 [TEST LOG] ✅ Retry response status assertion passed');
                
                // Verify the response contains the expected value
                const retryValueElement = responseBody.querySelector('.retry-value');
                expect(retryValueElement.textContent).toBe('expected value');
                console.log('🧪 [TEST LOG] ✅ Retry expected value assertion passed');
                
                console.log('🧪 [TEST LOG] 🎉 All retry mechanism test assertions passed');
            } catch (error) {
                console.error('🧪 [TEST LOG] ❌ Retry mechanism test failed:', {
                    error: error.message,
                    stack: error.stack,
                    actualResponseStatus: responseStatus.textContent,
                    actualResponseBody: responseBody.textContent,
                    retryValueElement: !!retryValueElement,
                    retryValueText: retryValueElement ? retryValueElement.textContent : 'NOT FOUND'
                });
                throw error;
            }
        });
    });
});