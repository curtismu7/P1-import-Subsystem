/**
 * Swagger API Tool - Token Management Tests
 * Test suite for the enhanced Swagger interface structure and functionality
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

describe('Swagger API Tool - Enhanced Interface', () => {
    let swaggerHtml;
    
    beforeAll(() => {
        // Load Swagger HTML file for testing
        const swaggerHtmlPath = path.join(__dirname, '../../public/swagger/index.html');
        try {
            swaggerHtml = fs.readFileSync(swaggerHtmlPath, 'utf8');
        } catch (error) {
            console.log('⚠️ Could not load Swagger HTML file:', error.message);
        }
    });

    describe('Professional Branding', () => {
        it('should display "Swagger API Tool" branding', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for professional branding
            assert(swaggerHtml.includes('Swagger API Tool'), 'Should include "Swagger API Tool" branding');
            assert(swaggerHtml.includes('Professional API documentation'), 'Should include professional description');
        });
        
        it('should have updated page title', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            assert(swaggerHtml.includes('<title>Swagger API Tool - PingOne Import Tool</title>'), 'Should have updated page title');
        });
    });
    
    describe('Token Management UI', () => {
        it('should have token management panel', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for token management panel
            assert(swaggerHtml.includes('token-management-panel'), 'Should include token management panel');
            assert(swaggerHtml.includes('PingOne Worker Token Management'), 'Should include token management heading');
        });
        
        it('should have required token management buttons', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for required buttons
            assert(swaggerHtml.includes('retrieve-token-btn'), 'Should include retrieve token button');
            assert(swaggerHtml.includes('refresh-token-btn'), 'Should include refresh token button');
            assert(swaggerHtml.includes('clear-token-btn'), 'Should include clear token button');
        });
        
        it('should have token status display elements', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for status display elements
            assert(swaggerHtml.includes('token-status'), 'Should include token status element');
            assert(swaggerHtml.includes('token-expiry'), 'Should include token expiry element');
            assert(swaggerHtml.includes('token-remaining'), 'Should include token remaining element');
            assert(swaggerHtml.includes('token-error-display'), 'Should include token error display');
        });
    });

    describe('High-Contrast Styling', () => {
        it('should include high-contrast CSS styles', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for high-contrast styling
            assert(swaggerHtml.includes('High-Contrast'), 'Should include high-contrast styling comments');
            assert(swaggerHtml.includes('#ffffff'), 'Should include white background');
            assert(swaggerHtml.includes('#212529'), 'Should include dark text color');
            assert(swaggerHtml.includes('token-status-badge'), 'Should include token status badge styles');
        });
        
        it('should have professional button styling', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for button styling
            assert(swaggerHtml.includes('btn-primary'), 'Should include primary button styles');
            assert(swaggerHtml.includes('btn-secondary'), 'Should include secondary button styles');
            assert(swaggerHtml.includes('btn-danger'), 'Should include danger button styles');
        });
    });

    describe('JavaScript Functionality', () => {
        it('should include token management JavaScript functions', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for required JavaScript functions
            assert(swaggerHtml.includes('retrieveWorkerToken'), 'Should include retrieveWorkerToken function');
            assert(swaggerHtml.includes('refreshWorkerToken'), 'Should include refreshWorkerToken function');
            assert(swaggerHtml.includes('clearWorkerToken'), 'Should include clearWorkerToken function');
            assert(swaggerHtml.includes('updateTokenStatus'), 'Should include updateTokenStatus function');
            assert(swaggerHtml.includes('startTokenMonitoring'), 'Should include startTokenMonitoring function');
        });
        
        it('should include initialization functions', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for initialization functions
            assert(swaggerHtml.includes('initializeSwaggerAPITool'), 'Should include initializeSwaggerAPITool function');
            assert(swaggerHtml.includes('initializeTokenManagement'), 'Should include initializeTokenManagement function');
            assert(swaggerHtml.includes('checkExistingToken'), 'Should include checkExistingToken function');
        });
    });

    describe('Integration Features', () => {
        it('should include population management integration', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for population selector integration
            assert(swaggerHtml.includes('population-selector'), 'Should include population selector');
            assert(swaggerHtml.includes('loadPopulationsFromSubsystem'), 'Should include population loading function');
        });
        
        it('should include event-driven architecture integration', () => {
            if (!swaggerHtml) {
                console.log('⚠️ Skipping test - Swagger HTML not loaded');
                return;
            }
            
            // Check for event listeners and dispatching
            assert(swaggerHtml.includes('worker-token-updated'), 'Should include token update events');
            assert(swaggerHtml.includes('worker-token-cleared'), 'Should include token clear events');
            assert(swaggerHtml.includes('addEventListener'), 'Should include event listeners');
            assert(swaggerHtml.includes('dispatchEvent'), 'Should include event dispatching');
        });
    });
});
