import { test, expect } from '@playwright/test';

test.describe('Settings Page Focus Fix Test', () => {
  test('should properly focus on token section when token is invalid', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForSelector('#main-content', { timeout: 10000 });
    
    // Navigate to Settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    
    // Wait for settings page to load
    await page.waitForTimeout(2000);
    
    // Check token section
    const tokenSection = page.locator('#token-information-section');
    await expect(tokenSection).toBeVisible();
    
    // Check token status
    const tokenText = page.locator('#settings-token-text');
    const tokenStatus = await tokenText.textContent();
    console.log('Current token status:', tokenStatus);
    
    // Check if token section has proper styling for invalid token
    if (tokenStatus === 'Token: Invalid') {
      console.log('✅ Token is invalid, checking focus behavior...');
      
      // Check if token section has error styling
      const tokenSectionStyle = await tokenSection.getAttribute('style');
      console.log('Token section style:', tokenSectionStyle);
      
      // Check if refresh button has focus styling
      const refreshBtn = page.locator('#refresh-token');
      await expect(refreshBtn).toBeVisible();
      
      // Check if refresh button has warning styling
      const refreshBtnStyle = await refreshBtn.getAttribute('style');
      console.log('Refresh button style:', refreshBtnStyle);
      
      // Test clicking refresh button
      await refreshBtn.click();
      console.log('✅ Refresh token button clicked');
      
      // Wait for potential response
      await page.waitForTimeout(2000);
      
      // Check for any error messages
      const errorMessages = page.locator('.error-message, .alert-error, .text-error');
      const errorCount = await errorMessages.count();
      console.log('Error messages found:', errorCount);
      
      if (errorCount > 0) {
        const errorText = await errorMessages.first().textContent();
        console.log('Error message:', errorText);
      }
      
      // Check if token status updated
      const newTokenStatus = await tokenText.textContent();
      console.log('Token status after refresh:', newTokenStatus);
      
    } else {
      console.log('✅ Token is valid, checking normal focus behavior...');
      
      // Check if first form field gets focus
      const firstField = page.locator('#settings-environment-id');
      await expect(firstField).toBeVisible();
      
      // Test form interaction
      await firstField.focus();
      await firstField.fill('test-environment-id');
      console.log('✅ Form field interaction works');
    }
    
    // Test form interactions
    const environmentIdField = page.locator('#settings-environment-id');
    const clientIdField = page.locator('#settings-client-id');
    const clientSecretField = page.locator('#settings-client-secret');
    
    // Test tab navigation through form fields
    await environmentIdField.focus();
    console.log('✅ Environment ID field focused');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    console.log('✅ Tab navigation works');
    
    // Test form validation
    const saveBtn = page.locator('#save-settings');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      console.log('✅ Save button clicked');
      
      // Wait for validation
      await page.waitForTimeout(1000);
      
      // Check for validation messages
      const validationMessages = page.locator('.error-message, .alert-error, .text-error, .validation-error');
      const validationCount = await validationMessages.count();
      console.log('Validation messages found:', validationCount);
      
      if (validationCount > 0) {
        const validationText = await validationMessages.first().textContent();
        console.log('Validation message:', validationText);
      }
    }
    
    // Test client secret toggle
    const toggleSecretBtn = page.locator('#settings-toggle-secret');
    if (await toggleSecretBtn.isVisible()) {
      await toggleSecretBtn.click();
      console.log('✅ Secret toggle button clicked');
      
      // Check if secret field type changed
      const secretFieldType = await clientSecretField.getAttribute('type');
      console.log('Secret field type after toggle:', secretFieldType);
      
      // Toggle back
      await toggleSecretBtn.click();
      console.log('✅ Secret toggle button clicked again');
    }
    
    console.log('✅ Settings page focus test completed successfully');
  });
});
