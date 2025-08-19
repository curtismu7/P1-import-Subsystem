import { test, expect } from '@playwright/test';

test.describe('Settings Page Focus Test', () => {
  test('should test Settings page token section functionality', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForSelector('#main-content', { timeout: 10000 });
    
    // Navigate to Settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    
    // Wait for settings page to load
    await page.waitForTimeout(2000);
    
    // Check if token information section exists (support legacy and new structures)
    const tokenSection = page.locator('#token-information-section, #token-info');
    await expect(tokenSection.first()).toBeVisible();
    
    // Check token status elements
    const tokenIndicator = page.locator('#settings-page #settings-token-indicator, #settings-page #token-indicator');
    const tokenText = page.locator('#settings-page #settings-token-text, #settings-page #token-text');
    const tokenExpires = page.locator('#settings-page #settings-token-expires, #settings-page #token-expires');
    const tokenTime = page.locator('#settings-page #settings-token-time, #settings-page #token-time');
    
    console.log('🔍 Checking token elements...');
    console.log('Token indicator visible:', await tokenIndicator.isVisible());
    console.log('Token text visible:', await tokenText.isVisible());
    console.log('Token expires visible:', await tokenExpires.isVisible());
    console.log('Token time visible:', await tokenTime.isVisible());
    
    // Check token buttons
    const refreshTokenBtn = page.locator('#refresh-token');
    const clearTokenBtn = page.locator('#clear-token');
    
    console.log('🔍 Checking token buttons...');
    console.log('Refresh token button visible:', await refreshTokenBtn.isVisible());
    console.log('Clear token button visible:', await clearTokenBtn.isVisible());
    
    // Test clicking refresh token button
    if (await refreshTokenBtn.isVisible()) {
      console.log('✅ Refresh token button found, testing click...');
      await refreshTokenBtn.click();
      
      // Wait for potential loading state
      await page.waitForTimeout(2000);
      
      // Check if any error messages appear
      const errorMessages = page.locator('.error-message, .alert-error, .text-error');
      const errorCount = await errorMessages.count();
      console.log('Error messages found:', errorCount);
      
      if (errorCount > 0) {
        const errorText = await errorMessages.first().textContent();
        console.log('Error message:', errorText);
      }
    } else {
      console.log('❌ Refresh token button not found');
    }
    
    // Test clicking clear token button
    if (await clearTokenBtn.isVisible()) {
      console.log('✅ Clear token button found, testing click...');
      await clearTokenBtn.click();
      
      // Wait for potential confirmation dialog
      await page.waitForTimeout(1000);
      
      // Check if confirmation dialog appears
      const dialog = page.locator('dialog, .modal, .confirm-dialog');
      if (await dialog.isVisible()) {
        console.log('✅ Confirmation dialog appeared');
        // Accept the dialog
        const confirmBtn = dialog.locator('button:has-text("OK"), button:has-text("Yes"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    } else {
      console.log('❌ Clear token button not found');
    }
    
    // Check current token status if visible
    if (await tokenText.isVisible()) {
      const currentTokenText = await tokenText.textContent();
      console.log('Current token status:', currentTokenText);
    } else {
      console.log('ℹ️ Token text not visible on settings page, skipping status read.');
    }
    
    // Check if token indicator has proper styling when present
    if (await tokenIndicator.isVisible()) {
      const indicatorClasses = await tokenIndicator.getAttribute('class');
      console.log('Token indicator classes:', indicatorClasses);
    } else {
      console.log('ℹ️ Token indicator not visible on settings page, skipping class check.');
    }
    
    // Test form interactions
    const environmentIdField = page.locator('#settings-environment-id');
    if (await environmentIdField.isVisible()) {
      console.log('✅ Environment ID field found');
      
      // Test focus on the field
      await environmentIdField.focus();
      console.log('✅ Environment ID field focused');
      
      // Test typing in the field
      await environmentIdField.fill('test-environment-id');
      console.log('✅ Environment ID field filled');
      
      // Check if the value was set
      const fieldValue = await environmentIdField.inputValue();
      console.log('Environment ID field value:', fieldValue);
    } else {
      console.log('❌ Environment ID field not found');
    }
    
    // Test client ID field
    const clientIdField = page.locator('#settings-client-id');
    if (await clientIdField.isVisible()) {
      console.log('✅ Client ID field found');
      await clientIdField.focus();
      await clientIdField.fill('test-client-id');
      console.log('✅ Client ID field filled');
    } else {
      console.log('❌ Client ID field not found');
    }
    
    // Test save settings button
    const saveSettingsBtn = page.locator('#save-settings');
    if (await saveSettingsBtn.isVisible()) {
      console.log('✅ Save settings button found');
      
      // Test clicking the save button
      await saveSettingsBtn.click();
      console.log('✅ Save settings button clicked');
      
      // Wait for potential response
      await page.waitForTimeout(2000);
      
      // Check for success/error messages
      const messages = page.locator('.success-message, .error-message, .alert-success, .alert-error');
      const messageCount = await messages.count();
      console.log('Messages found after save:', messageCount);
      
      if (messageCount > 0) {
        const messageText = await messages.first().textContent();
        console.log('Message text:', messageText);
      }
    } else {
      console.log('❌ Save settings button not found');
    }
  });
});
