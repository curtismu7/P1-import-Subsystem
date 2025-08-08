import { test, expect } from '@playwright/test';

test.describe('Settings Page Save Test', () => {
  test('should test Settings page save functionality and client secret handling', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForSelector('#main-content', { timeout: 10000 });
    
    // Navigate to Settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    
    // Wait for settings page to load
    await page.waitForTimeout(2000);
    
    // Check if form fields are populated
    const environmentIdField = page.locator('#settings-environment-id');
    const clientIdField = page.locator('#settings-client-id');
    const clientSecretField = page.locator('#settings-client-secret');
    const regionField = page.locator('#settings-region');
    
    console.log('🔍 Checking form field values...');
    
    // Check environment ID
    const envIdValue = await environmentIdField.inputValue();
    console.log('Environment ID value:', envIdValue);
    expect(envIdValue).toBeTruthy();
    
    // Check client ID
    const clientIdValue = await clientIdField.inputValue();
    console.log('Client ID value:', clientIdValue);
    expect(clientIdValue).toBeTruthy();
    
    // Check client secret (should be masked)
    const clientSecretValue = await clientSecretField.inputValue();
    console.log('Client Secret value (masked):', clientSecretValue);
    expect(clientSecretValue).toBeTruthy();
    
    // Check region
    const regionValue = await regionField.inputValue();
    console.log('Region value:', regionValue);
    expect(regionValue).toBeTruthy();
    
    // Test client secret toggle
    const toggleSecretBtn = page.locator('#settings-toggle-secret');
    if (await toggleSecretBtn.isVisible()) {
      console.log('✅ Testing client secret toggle...');
      
      // Click to show secret
      await toggleSecretBtn.click();
      await page.waitForTimeout(500);
      
      // Check if secret is now visible
      const secretType = await clientSecretField.getAttribute('type');
      console.log('Secret field type after toggle:', secretType);
      
      // Get the actual value (should be unmasked now)
      const actualSecretValue = await clientSecretField.inputValue();
      console.log('Client Secret actual value:', actualSecretValue);
      
      // Toggle back to hide
      await toggleSecretBtn.click();
      await page.waitForTimeout(500);
      
      // Check if it's masked again
      const maskedValue = await clientSecretField.inputValue();
      console.log('Client Secret masked value:', maskedValue);
    }
    
    // Test Save button
    const saveBtn = page.locator('#save-settings');
    if (await saveBtn.isVisible()) {
      console.log('✅ Testing Save button...');
      
      // Click save button
      await saveBtn.click();
      console.log('✅ Save button clicked');
      
      // Wait for potential response
      await page.waitForTimeout(3000);
      
      // Check for success/error messages
      const successMessages = page.locator('.success-message, .alert-success, .text-success');
      const errorMessages = page.locator('.error-message, .alert-error, .text-error');
      const validationMessages = page.locator('.validation-error, .validation-message');
      
      const successCount = await successMessages.count();
      const errorCount = await errorMessages.count();
      const validationCount = await validationMessages.count();
      
      console.log('Success messages found:', successCount);
      console.log('Error messages found:', errorCount);
      console.log('Validation messages found:', validationCount);
      
      if (successCount > 0) {
        const successText = await successMessages.first().textContent();
        console.log('Success message:', successText);
      }
      
      if (errorCount > 0) {
        const errorText = await errorMessages.first().textContent();
        console.log('Error message:', errorText);
      }
      
      if (validationCount > 0) {
        const validationText = await validationMessages.first().textContent();
        console.log('Validation message:', validationText);
      }
      
      // Check if any fields are highlighted as errors
      const highlightedFields = page.locator('.form-control[style*="border-color"], .form-control[style*="background-color"]');
      const highlightedCount = await highlightedFields.count();
      console.log('Highlighted error fields:', highlightedCount);
      
      if (highlightedCount > 0) {
        for (let i = 0; i < highlightedCount; i++) {
          const field = highlightedFields.nth(i);
          const fieldId = await field.getAttribute('id');
          console.log('Highlighted field:', fieldId);
        }
      }
    } else {
      console.log('❌ Save button not found');
    }
    
    // Test form validation by clearing required fields
    console.log('✅ Testing form validation...');
    
    // Clear environment ID
    await environmentIdField.clear();
    console.log('✅ Cleared Environment ID');
    
    // Try to save again
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      
      // Check for validation errors
      const validationErrors = page.locator('.error-message, .alert-error, .text-error, .validation-error');
      const validationErrorCount = await validationErrors.count();
      console.log('Validation errors after clearing field:', validationErrorCount);
      
      if (validationErrorCount > 0) {
        const errorText = await validationErrors.first().textContent();
        console.log('Validation error message:', errorText);
      }
    }
    
    // Restore the environment ID
    await environmentIdField.fill('b9817c16-9910-4415-b67e-4ac687da74d9');
    console.log('✅ Restored Environment ID');
    
    console.log('✅ Settings page save test completed');
  });
});
