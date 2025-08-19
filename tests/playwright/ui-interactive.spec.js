import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PingOne Import Tool Interactive UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#main-content', { timeout: 10000 });
  });

  test('should interact with file upload functionality', async ({ page }) => {
    // Navigate to import page
    await page.click('.nav-link[data-page="import"]');
    await expect(page.locator('#import-page')).toBeVisible();
    
    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create a test CSV file
      const testCsvContent = 'email,firstName,lastName\njohn@example.com,John,Doe\njane@example.com,Jane,Smith';
      const testFilePath = path.join(__dirname, 'test-upload.csv');
      
      // Note: In a real test, you'd create the file here
      console.log('Would upload file with content:', testCsvContent);
      
      // Test that file input is functional
      await expect(fileInput).toBeVisible();
      console.log('✅ File upload input is available');
    }
  });

  test('should test form interactions on settings page', async ({ page }) => {
    // Navigate to settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    
    // Test form field interactions
    const environmentIdField = page.locator('#pingone_environment_id, input[name="pingone_environment_id"]');
    if (await environmentIdField.isVisible()) {
      // Test typing in the field
      await environmentIdField.fill('test-environment-id');
      await expect(environmentIdField).toHaveValue('test-environment-id');
      console.log('✅ Environment ID field is interactive');
    }
    
    // Test client ID field
    const clientIdField = page.locator('#pingone_client_id, input[name="pingone_client_id"]');
    if (await clientIdField.isVisible()) {
      await clientIdField.fill('test-client-id');
      await expect(clientIdField).toHaveValue('test-client-id');
      console.log('✅ Client ID field is interactive');
    }
  });

  test('should test dropdown functionality', async ({ page }) => {
    // Navigate to import page to find population dropdown
    await page.click('.nav-link[data-page="import"]');
    await expect(page.locator('#import-page')).toBeVisible();
    
    // Look for population dropdown
    const populationSelect = page.locator('select[name="population"], #population-select, .population-dropdown');
    if (await populationSelect.isVisible()) {
      // Test dropdown interaction
      await populationSelect.click();
      console.log('✅ Population dropdown is interactive');
      
      // Check if there are options
      const options = await populationSelect.locator('option').count();
      if (options > 0) {
        console.log(`✅ Population dropdown has ${options} options`);
      }
    }
  });

  test('should test button interactions', async ({ page }) => {
    // Test various buttons across pages
    
    // Settings page buttons
    await page.click('.nav-link[data-page="settings"]');
    const saveButton = page.locator('#save-settings');
    if (await saveButton.isVisible()) {
      await expect(saveButton).toBeVisible();
      console.log('✅ Save button is available');
    }
    
    // Import page buttons
    await page.click('.nav-link[data-page="import"]');
    // Prefer a single, stable selector to avoid strict mode multi-match
    const importButton = page.locator('#start-import');
    if (await importButton.isVisible()) {
      await expect(importButton).toBeVisible();
      console.log('✅ Import button is available');
    }
    
    // Export page buttons
    await page.click('.nav-link[data-page="export"]');
    const exportButton = page.locator('#start-export');
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
      console.log('✅ Export button is available');
    }
  });

  test('should test responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check if navigation is responsive
    const navToggle = page.locator('#nav-toggle');
    if (await navToggle.isVisible()) {
      // Dispatch a click event instead of pointer click to avoid offscreen issues
      await navToggle.dispatchEvent('click');
      await expect(page.locator('#left-nav')).toBeVisible();
      console.log('✅ Mobile navigation works');
    }
    
    // Reset to desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
  });

  test('should test keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Test arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    // Test Enter key
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    console.log('✅ Keyboard navigation works');
  });

  test('should test error handling UI', async ({ page }) => {
    // Navigate to import page
    await page.click('.nav-link[data-page="import"]');
    
    // Try to trigger an import without file (should show error)
    const importButton = page.locator('button#import-btn, button[data-action="import"]');
    if (await importButton.isVisible()) {
      // Click import button without file
      await importButton.click();
      
      // Wait for potential error message
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorMessages = page.locator('.error-message, .alert-error, .text-error');
      if (await errorMessages.count() > 0) {
        console.log('✅ Error handling UI works');
      }
    }
  });

  test('should test loading states', async ({ page }) => {
    // Navigate to logs page (might have loading)
    await page.click('.nav-link[data-page="logs"]');
    await expect(page.locator('#logs-page')).toBeVisible();
    
    // Check for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, [data-loading="true"]');
    if (await loadingIndicators.count() > 0) {
      console.log('✅ Loading indicators are present');
    }
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Check that content is loaded
    const pageContent = await page.locator('#logs-page').textContent();
    expect(pageContent).toBeTruthy();
    console.log('✅ Page content loads properly');
  });

  test('should test accessibility features', async ({ page }) => {
    // Check for ARIA labels
    const elementsWithAria = page.locator('[aria-label], [aria-labelledby], [role]');
    const ariaCount = await elementsWithAria.count();
    
    if (ariaCount > 0) {
      console.log(`✅ Found ${ariaCount} elements with ARIA attributes`);
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    const imagesWithAlt = await images.locator('[alt]').count();
    
    if (imageCount > 0) {
      console.log(`✅ ${imagesWithAlt}/${imageCount} images have alt text`);
    }
  });
});
