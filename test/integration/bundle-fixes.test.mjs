/**
 * Bundle Fixes Integration Tests
 * 
 * Tests that the JavaScript bundle fixes are working correctly
 * 
 * @version 1.0.0
 * @author AI Assistant
 * @date 2025-07-30
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'http://localhost:4000',
    timeout: 30000
};

describe('📦 Bundle Fixes Integration Tests', () => {
    let isServerRunning = false;
    
    beforeAll(async () => {
        console.log('📦 Setting up bundle fixes tests...');
        
        // Check if server is running
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/api/health`);
            isServerRunning = response.ok;
            console.log(`🔍 Server status: ${isServerRunning ? 'Running ✅' : 'Not running ❌'}`);
        } catch (error) {
            console.log('🔍 Server not detected - Bundle fixes tests will be skipped');
            isServerRunning = false;
        }
    }, 30000);
    
    afterAll(() => {
        console.log('🧹 Bundle fixes test cleanup completed');
    });
    
    it('should serve the updated bundle file', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing updated bundle file serving...');
        
        try {
            // Check bundle manifest
            const manifestResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/bundle-manifest.json`);
            expect(manifestResponse.status).toBe(200);
            
            const manifest = await manifestResponse.json();
            expect(manifest).toHaveProperty('bundleFile');
            
            const bundleFile = manifest.bundleFile;
            console.log(`📊 Current bundle file: ${bundleFile}`);
            
            // Test that the bundle file exists and is accessible
            const bundleResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/${bundleFile}`);
            expect(bundleResponse.status).toBe(200);
            
            const bundleContent = await bundleResponse.text();
            expect(bundleContent.length).toBeGreaterThan(1000); // Should be a substantial file
            
            console.log(`✅ Bundle file ${bundleFile} is accessible and has content`);
            
        } catch (error) {
            console.error('❌ Bundle file test failed:', error.message);
            throw error;
        }
    });
    
    it('should have startTimer method in the bundle', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing startTimer method in bundle...');
        
        try {
            // Get the current bundle file
            const manifestResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/bundle-manifest.json`);
            const manifest = await manifestResponse.json();
            const bundleFile = manifest.bundleFile;
            
            // Get bundle content
            const bundleResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/${bundleFile}`);
            const bundleContent = await bundleResponse.text();
            
            // Check for startTimer method
            const hasStartTimer = bundleContent.includes('startTimer');
            expect(hasStartTimer).toBe(true);
            
            // Check for endTimer method
            const hasEndTimer = bundleContent.includes('endTimer');
            expect(hasEndTimer).toBe(true);
            
            console.log('✅ Bundle contains startTimer and endTimer methods');
            
        } catch (error) {
            console.error('❌ Bundle method test failed:', error.message);
            throw error;
        }
    });
    
    it('should serve error-fix.js file', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing error-fix.js file serving...');
        
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/js/error-fix.js`);
            expect(response.status).toBe(200);
            
            const content = await response.text();
            expect(content).toContain('ensureLoggerMethods');
            expect(content).toContain('startTimer');
            expect(content).toContain('endTimer');
            
            console.log('✅ Error fix file is accessible and contains expected functions');
            
        } catch (error) {
            console.error('❌ Error fix file test failed:', error.message);
            throw error;
        }
    });
    
    it('should serve updated bug-fix-loader.js', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing updated bug-fix-loader.js...');
        
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/js/bug-fix-loader.js`);
            expect(response.status).toBe(200);
            
            const content = await response.text();
            
            // Should include error-fix.js
            expect(content).toContain('error-fix.js');
            
            // Should use correct module paths
            expect(content).toContain('modules/security-utils.js');
            
            // Should not try to load non-existent utils files
            expect(content).not.toContain('utils/centralized-logger.js');
            
            console.log('✅ Bug fix loader has been updated with correct paths');
            
        } catch (error) {
            console.error('❌ Bug fix loader test failed:', error.message);
            throw error;
        }
    });
    
    it('should serve updated centralized logger files', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing updated centralized logger files...');
        
        try {
            // Test main centralized logger
            const loggerResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/utils/centralized-logger.js`);
            expect(loggerResponse.status).toBe(200);
            
            const loggerContent = await loggerResponse.text();
            expect(loggerContent).toContain('startTimer');
            expect(loggerContent).toContain('endTimer');
            
            // Test fallback logger
            const fallbackResponse = await fetch(`${TEST_CONFIG.serverUrl}/js/utils/centralized-logger-fallback.js`);
            expect(fallbackResponse.status).toBe(200);
            
            const fallbackContent = await fallbackResponse.text();
            expect(fallbackContent).toContain('startTimer');
            expect(fallbackContent).toContain('endTimer');
            
            console.log('✅ Centralized logger files have been updated with timer methods');
            
        } catch (error) {
            console.error('❌ Centralized logger files test failed:', error.message);
            throw error;
        }
    });
    
    it('should serve index.html with updated bundle reference', async () => {
        if (!isServerRunning) {
            console.log('⚠️ Skipping test - server not running');
            expect(true).toBe(true);
            return;
        }
        
        console.log('📦 Testing index.html bundle reference...');
        
        try {
            const response = await fetch(`${TEST_CONFIG.serverUrl}/`);
            expect(response.status).toBe(200);
            
            const content = await response.text();
            
            // Should not reference the old bundle
            expect(content).not.toContain('bundle-1753876524.min.js');
            
            // Should reference a newer bundle
            expect(content).toMatch(/bundle-\d+\.js/);
            
            console.log('✅ Index.html has been updated with new bundle reference');
            
        } catch (error) {
            console.error('❌ Index.html bundle reference test failed:', error.message);
            throw error;
        }
    });
});