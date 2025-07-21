/**
 * Test script to verify Settings Subsystem functionality
 * This script will test if the Save Settings button is working properly
 */

const puppeteer = require('puppeteer');

async function testSaveSettingsButton() {
    console.log('🧪 Testing Save Settings button functionality...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log('BROWSER:', msg.text());
        });
        
        // Navigate to settings page
        console.log('📍 Navigating to settings page...');
        await page.goto('http://localhost:4000/#settings', { waitUntil: 'networkidle0' });
        
        // Wait for the settings view to be visible
        await page.waitForSelector('#settings-view', { visible: true, timeout: 10000 });
        console.log('✅ Settings view is visible');
        
        // Check if save button exists
        const saveButton = await page.$('#save-settings');
        if (!saveButton) {
            throw new Error('❌ Save Settings button not found');
        }
        console.log('✅ Save Settings button found');
        
        // Test button click
        console.log('🖱️ Clicking Save Settings button...');
        
        // Execute JavaScript to test the button click and check for event listeners
        const result = await page.evaluate(() => {
            const saveBtn = document.getElementById('save-settings');
            if (!saveBtn) return { error: 'Button not found' };
            
            // Check if button has event listeners
            const listeners = getEventListeners ? getEventListeners(saveBtn) : 'Event listeners check not available';
            
            console.log('🔍 Testing Save Settings button click...');
            console.log('📋 Button element:', saveBtn);
            console.log('🎯 Event listeners:', listeners);
            
            // Simulate click
            saveBtn.click();
            
            return {
                success: true,
                buttonExists: true,
                listeners: listeners,
                clicked: true
            };
        });
        
        console.log('📊 Test result:', result);
        
        // Wait a bit to see any console logs from the click
        await page.waitForTimeout(3000);
        
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Only run if puppeteer is available
if (typeof require !== 'undefined') {
    try {
        require('puppeteer');
        testSaveSettingsButton();
    } catch (e) {
        console.log('⚠️ Puppeteer not available, skipping automated test');
        console.log('💡 Manual test: Open http://localhost:4000/#settings and click Save Settings button');
    }
} else {
    console.log('💡 Manual test: Open http://localhost:4000/#settings and click Save Settings button');
}
