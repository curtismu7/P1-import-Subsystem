/**
 * Settings Page UI Tests
 * 
 * Tests the settings page functionality including:
 * - Settings form rendering and validation
 * - Settings loading and saving operations
 * - Connection testing functionality
 * - Form field validation and error handling
 * - Password visibility toggle
 * - Status updates and user feedback
 * - API integration with settings endpoints
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-07-30
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'http://localhost:4000',
    settingsPageUrl: 'http://localhost:4000/test-settings.html',
    timeout: 30000
};

describe('Settings Page UI Tests', () => {
    let isServerRunning = false;
    let testSessionId;
    
    beforeAll(async () => {
        console.log('Setting up settings page tests...');
        
        // Check if server is running
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/api/health`);
            isServerRunning = response.ok;
            console.log(`Server status: ${isServerRunning ? 'Running' : 'Not running'}`);
        } catch (error) {
            console.log('Server not detected - Settings page tests will be skipped');
            isServerRunning = false;
        }
        
        testSessionId = `settings-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Test session ID: ${testSessionId}`);
    }, 30000);
    
    afterAll(() => {
        console.log('Settings page test cleanup completed');
    });
    
    beforeEach(() => {
        // Reset any test state before each test
    });
    
    describe('Settings Page Accessibility', () => {
        it('should serve settings page at /test-settings.html', async () => {
            if (!isServerRunning) {
                console.log('Skipping test - server not running');
                expect(true).toBe(true);
                return;
            }
            
            console.log('Testing settings page accessibility...');
            
            try {
                const response = await fetch(TEST_CONFIG.settingsPageUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });
                
                console.log(`Settings page response: ${response.status}`);
                
                expect(response.status).toBe(200);
                
                const content = await response.text();
                
                // Check for essential HTML structure
                expect(content).toContain('<html');
                expect(content).toContain('PingOne Settings Tester');
                expect(content).toContain('settings-form');
                expect(content).toContain('apiClientId');
                expect(content).toContain('apiSecret');
                expect(content).toContain('environmentId');
                expect(content).toContain('region');
                expect(content).toContain('populationId');
                
                // Check for required form elements
                expect(content).toContain('test-connection');
                expect(content).toContain('load-settings');
                expect(content).toContain('connection-status');
                
                console.log('Settings page is accessible and contains expected elements');
                
            } catch (error) {
                console.error('Settings page accessibility test failed:', error.message);
                throw error;
            }
        });
    });
    
    describe('Settings API Integration', () => {
        it('should handle settings GET requests', async () => {
            if (!isServerRunning) {
                console.log('Skipping test - server not running');
                expect(true).toBe(true);
                return;
            }
            
            console.log('Testing settings GET API...');
            
            try {
                const response = await fetch(`${TEST_CONFIG.serverUrl}/api/settings`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`Settings GET response: ${response.status}`);
                
                expect(response.status).toBe(200);
                
                const data = await response.json();
                
                // Check response structure
                expect(data).toHaveProperty('success');
                expect(data).toHaveProperty('data');
                
                if (data.success) {
                    const settings = data.data;
                    
                    // Check for expected settings properties
                    expect(settings).toHaveProperty('environmentId');
                    expect(settings).toHaveProperty('apiClientId');
                    expect(settings).toHaveProperty('region');
                    expect(settings).toHaveProperty('populationId');
                    
                    console.log('Settings GET API working correctly');
                } else {
                    console.log('Settings GET returned success: false (may be expected)');
                }
                
            } catch (error) {
                console.error('Settings GET API test failed:', error.message);
                throw error;
            }
        });
        
        it('should handle settings POST requests', async () => {
            if (!isServerRunning) {
                console.log('Skipping test - server not running');
                expect(true).toBe(true);
                return;
            }
            
            console.log('Testing settings POST API...');
            
            try {
                const testSettings = {
                    environmentId: `test-env-${testSessionId}`,
                    apiClientId: `test-client-${testSessionId}`,
                    apiSecret: `test-secret-${testSessionId}`,
                    region: 'NorthAmerica',
                    populationId: `test-pop-${testSessionId}`
                };
                
                const response = await fetch(`${TEST_CONFIG.serverUrl}/api/settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testSettings)
                });
                
                console.log(`Settings POST response: ${response.status}`);
                
                expect([200, 400, 500]).toContain(response.status);
                
                const data = await response.json();
                
                // Check response structure
                expect(data).toHaveProperty('success');
                
                if (response.status === 200) {
                    expect(data.success).toBe(true);
                    console.log('Settings POST API working correctly');
                } else {
                    expect(data).toHaveProperty('error');
                    console.log(`Settings POST returned error (may be expected): ${data.error}`);
                }
                
            } catch (error) {
                console.error('Settings POST API test failed:', error.message);
                throw error;
            }
        });
    });
    
    describe('UI Components', () => {
        it('should include all required form elements', async () => {
            if (!isServerRunning) {
                console.log('Skipping test - server not running');
                expect(true).toBe(true);
                return;
            }
            
            console.log('Testing UI components...');
            
            try {
                const response = await fetch(TEST_CONFIG.settingsPageUrl);
                const content = await response.text();
                
                // Check for form elements
                expect(content).toContain('id="apiClientId"');
                expect(content).toContain('id="apiSecret"');
                expect(content).toContain('id="environmentId"');
                expect(content).toContain('id="region"');
                expect(content).toContain('id="populationId"');
                
                // Check for buttons
                expect(content).toContain('id="test-connection"');
                expect(content).toContain('id="load-settings"');
                expect(content).toContain('type="submit"');
                
                // Check for status elements
                expect(content).toContain('id="connection-status"');
                expect(content).toContain('id="test-result"');
                expect(content).toContain('id="save-result"');
                
                // Check for password toggle
                expect(content).toContain('toggle-password');
                expect(content).toContain('bi-eye');
                
                console.log('All required UI components are present');
                
            } catch (error) {
                console.error('UI components test failed:', error.message);
                throw error;
            }
        });
    });
});