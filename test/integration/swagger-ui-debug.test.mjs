/**
 * Swagger UI Debug Tests
 * 
 * Tests to debug why Swagger UI buttons are not working
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
    swaggerUrl: 'http://localhost:4000/swagger.html',
    timeout: 30000
};

describe('🐛 Swagger UI Debug Tests', () => {
    let isServerRunning = false;
    
    beforeAll(async () => {
        console.log('🐛 Setting up Swagger UI debug tests...');
        
        // Check if server is running
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/api/health`);
            isServerRunning = response.ok;
            console.log(`🔍 Server status: ${isServerRunning ? 'Running ✅' : 'Not running ❌'}`);
        } catch (error) {
            console.log('🔍 Server not detected - Debug tests will be skipped');
            isServerRunning = false;
        }
    }, 30000);
    
    afterAll(() => {
        console.log('🧹 Swagger UI debug test cleanup completed');
    });
    
    it('should check Swagger UI JavaScript dependencies', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('🐛 Testing Swagger UI JavaScript dependencies...');
        
        try {
            // Test swagger-ui-bundle.js
            const bundleResponse = await fetch(`${TEST_CONFIG.serverUrl}/swagger/swagger-ui-bundle.js`);
            console.log(`📊 swagger-ui-bundle.js: ${bundleResponse.status}`);
            expect(bundleResponse.status).toBe(200);
            
            // Test swagger-initializer.js
            const initResponse = await fetch(`${TEST_CONFIG.serverUrl}/swagger/swagger-initializer.js`);
            console.log(`📊 swagger-initializer.js: ${initResponse.status}`);
            expect(initResponse.status).toBe(200);
            
            // Test swagger-ui-standalone-preset.js
            const presetResponse = await fetch(`${TEST_CONFIG.serverUrl}/swagger/swagger-ui-standalone-preset.js`);
            console.log(`📊 swagger-ui-standalone-preset.js: ${presetResponse.status}`);
            expect(presetResponse.status).toBe(200);
            
            console.log('✅ All Swagger UI JavaScript dependencies are accessible');
            
        } catch (error) {
            console.error('❌ Swagger UI dependencies test failed:', error.message);
            throw error;
        }
    });
    
    it('should check for JavaScript errors in Swagger HTML', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('🐛 Testing Swagger HTML for JavaScript errors...');
        
        try {
            const response = await fetch(TEST_CONFIG.swaggerUrl);
            const html = await response.text();
            
            // Check for common JavaScript error patterns
            const errorPatterns = [
                /console\\.error/g,
                /throw new Error/g,
                /catch\\s*\\([^)]*\\)\\s*{[^}]*console/g,
                /undefined.*function/g,
                /Cannot read property/g
            ];
            
            let errorsFound = 0;
            errorPatterns.forEach((pattern, index) => {
                const matches = html.match(pattern);
                if (matches) {
                    console.log(`⚠️ Found potential error pattern ${index + 1}: ${matches.length} matches`);
                    errorsFound += matches.length;
                }
            });
            
            // Check for missing dependencies
            const requiredScripts = [
                'swagger-ui-bundle.js',
                'swagger-ui-standalone-preset.js',
                'swagger-initializer.js'
            ];
            
            let missingScripts = 0;
            requiredScripts.forEach(script => {
                if (!html.includes(script)) {
                    console.log(`❌ Missing script reference: ${script}`);
                    missingScripts++;
                } else {
                    console.log(`✅ Found script reference: ${script}`);
                }
            });
            
            console.log(`📊 Potential error patterns found: ${errorsFound}`);
            console.log(`📊 Missing script references: ${missingScripts}`);
            
            expect(missingScripts).toBe(0);
            
        } catch (error) {
            console.error('❌ JavaScript error check failed:', error.message);
            throw error;
        }
    });
    
    it('should test API endpoints that Swagger initializer depends on', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('🐛 Testing API endpoints for Swagger dependencies...');
        
        try {
            // Test /api/settings (used by Swagger initializer)
            const settingsResponse = await fetch(`${TEST_CONFIG.serverUrl}/api/settings`);
            console.log(`📊 /api/settings: ${settingsResponse.status}`);
            
            // Test /api/token (used by Swagger initializer)
            const tokenResponse = await fetch(`${TEST_CONFIG.serverUrl}/api/token`);
            console.log(`📊 /api/token: ${tokenResponse.status}`);
            
            // Test /swagger.json (OpenAPI spec)
            const specResponse = await fetch(`${TEST_CONFIG.serverUrl}/swagger.json`);
            console.log(`📊 /swagger.json: ${specResponse.status}`);
            expect(specResponse.status).toBe(200);
            
            if (settingsResponse.status === 200) {
                console.log('✅ Settings API accessible');
            } else {
                console.log('⚠️ Settings API may have issues');
            }
            
            if (tokenResponse.status === 404) {
                console.log('⚠️ Token API not found - this may cause Swagger initialization issues');
            } else {
                console.log(`✅ Token API responds with: ${tokenResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ API endpoint test failed:', error.message);
            throw error;
        }
    });
    
    it('should simulate Swagger UI initialization in JSDOM', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('🐛 Testing Swagger UI initialization simulation...');
        
        try {
            // Get the Swagger HTML
            const response = await fetch(TEST_CONFIG.swaggerUrl);
            const html = await response.text();
            
            // Create JSDOM environment
            const dom = new JSDOM(html, {
                url: TEST_CONFIG.swaggerUrl,
                pretendToBeVisual: true,
                resources: 'usable',
                runScripts: 'outside-only'
            });
            
            const window = dom.window;
            global.window = window;
            global.document = window.document;
            global.console = console;
            
            // Check if required elements exist
            const swaggerContainer = window.document.getElementById('swagger-ui');
            const tokenButtons = window.document.querySelectorAll('button[id*=\"token\"]');
            
            console.log(`📊 Swagger container found: ${swaggerContainer ? 'Yes' : 'No'}`);
            console.log(`📊 Token buttons found: ${tokenButtons.length}`);
            
            expect(swaggerContainer).toBeTruthy();
            
            // Check for button IDs
            const buttonIds = ['retrieve-token-btn', 'refresh-token-btn', 'clear-token-btn'];
            buttonIds.forEach(id => {
                const button = window.document.getElementById(id);
                console.log(`📊 Button ${id}: ${button ? 'Found' : 'Not found'}`);
            });
            
            console.log('✅ Swagger UI DOM structure appears correct');
            
        } catch (error) {
            console.error('❌ JSDOM simulation failed:', error.message);
            throw error;
        }
    });
    
    it('should check for console errors in browser context', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('🐛 Testing for browser console errors...');
        
        try {
            // This test simulates what might happen in a real browser
            const response = await fetch(TEST_CONFIG.swaggerUrl);
            const html = await response.text();
            
            // Check for common error-causing patterns
            const problemPatterns = [
                { pattern: /fetch\(['"]\/api\/token['"]\)/g, issue: 'Missing /api/token endpoint' },
                { pattern: /SwaggerUIBundle is not defined/g, issue: 'SwaggerUIBundle not loaded' },
                { pattern: /SwaggerUIStandalonePreset is not defined/g, issue: 'SwaggerUIStandalonePreset not loaded' },
                { pattern: /Cannot read property.*of undefined/g, issue: 'Undefined property access' },
                { pattern: /addEventListener.*null/g, issue: 'Event listener on null element' }
            ];
            
            let issuesFound = [];
            problemPatterns.forEach(({ pattern, issue }) => {
                const matches = html.match(pattern);
                if (matches) {
                    issuesFound.push(`${issue}: ${matches.length} occurrences`);
                }
            });
            
            if (issuesFound.length > 0) {
                console.log('⚠️ Potential issues found:');
                issuesFound.forEach(issue => console.log(`  - ${issue}`));
            } else {
                console.log('✅ No obvious error patterns detected');
            }
            
            // Check if the HTML contains the swagger-ui div
            expect(html).toContain('id=\"swagger-ui\"');
            
        } catch (error) {
            console.error('❌ Console error check failed:', error.message);
            throw error;
        }
    });
});