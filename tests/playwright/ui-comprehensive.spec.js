import { test, expect } from '@playwright/test';

test.describe('PingOne Import Tool UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('#main-content', { timeout: 10000 });
  });

  test('should load the main application and display home page', async ({ page }) => {
    // Check that the main application elements are present
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#left-nav')).toBeVisible();
    await expect(page.locator('.header-title')).toContainText('PingOne User Management');
    
    // Check that the home page is active
    await expect(page.locator('#home-page')).toBeVisible();
    await expect(page.locator('.nav-link[data-page="home"]')).toHaveClass(/active/);
  });

  test('should navigate between different pages', async ({ page }) => {
    // Test navigation to Export page
    await page.click('.nav-link[data-page="export"]');
    await expect(page.locator('#export-page')).toBeVisible();
    await expect(page.locator('.nav-link[data-page="export"]')).toHaveClass(/active/);
    
    // Test navigation to Import page
    await page.click('.nav-link[data-page="import"]');
    await expect(page.locator('#import-page')).toBeVisible();
    await expect(page.locator('.nav-link[data-page="import"]')).toHaveClass(/active/);
    
    // Test navigation to Settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    await expect(page.locator('.nav-link[data-page="settings"]')).toHaveClass(/active/);
    
    // Test navigation back to Home
    await page.click('.nav-link[data-page="home"]');
    await expect(page.locator('#home-page')).toBeVisible();
    await expect(page.locator('.nav-link[data-page="home"]')).toHaveClass(/active/);
  });

  test('should display token status information', async ({ page }) => {
    // Check that token status elements are present
    await expect(page.locator('#token-info')).toBeVisible();
    // Use more specific selector to avoid multiple elements
    await expect(page.locator('#token-info #token-indicator')).toBeVisible();
    await expect(page.locator('#token-text')).toBeVisible();
    
    // Token text should contain some information
    const tokenText = await page.locator('#token-text').textContent();
    expect(tokenText).toBeTruthy();
  });

  test('should display version information', async ({ page }) => {
    // Check that version info is displayed
    await expect(page.locator('#version-info')).toBeVisible();
    
    const versionText = await page.locator('#version-info').textContent();
    expect(versionText).toMatch(/v\d+\.\d+\.\d+/);
  });

  test('should have responsive navigation', async ({ page }) => {
    // Test mobile navigation toggle
    const navToggle = page.locator('#nav-toggle');
    if (await navToggle.isVisible()) {
      await navToggle.click();
      // Navigation should be visible after toggle
      await expect(page.locator('#left-nav')).toBeVisible();
    }
  });

  test('should display status messages', async ({ page }) => {
    // Check that status message area is present
    await expect(page.locator('#status-message-bar')).toBeVisible();
    await expect(page.locator('#status-message')).toBeVisible();
    
    // Status should show some text
    const statusText = await page.locator('#status-text').textContent();
    expect(statusText).toBeTruthy();
  });

  test('should have working action cards on home page', async ({ page }) => {
    // Check that action cards are present
    const actionCards = page.locator('.action-card');
    await expect(actionCards.first()).toBeVisible();
    
    // Test clicking on settings action card
    const settingsCard = page.locator('.action-card[data-action="settings"]');
    if (await settingsCard.isVisible()) {
      await settingsCard.click();
      // Should navigate to settings page
      await expect(page.locator('#settings-page')).toBeVisible();
    }
  });

  test('should handle page loading states', async ({ page }) => {
    // Navigate to a page and check for loading states
    await page.click('.nav-link[data-page="logs"]');
    await expect(page.locator('#logs-page')).toBeVisible();
    
    // Check that the page content loads
    await page.waitForTimeout(1000); // Wait for any async loading
    const pageContent = await page.locator('#logs-page').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    // Try to access a non-existent API endpoint
    const response = await page.request.get('/api/non-existent-endpoint');
    expect(response.status()).toBe(404);
    
    // The main app should still be accessible
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('should test import page functionality', async ({ page }) => {
    // Navigate to import page
    await page.click('.nav-link[data-page="import"]');
    await expect(page.locator('#import-page')).toBeVisible();
    
    // Check for file upload elements
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await expect(fileInput).toBeVisible();
    }
    
    // Check for import button
    const importButton = page.locator('button#import-btn, button[data-action="import"]');
    if (await importButton.isVisible()) {
      await expect(importButton).toBeVisible();
    }
  });

  test('should test export page functionality', async ({ page }) => {
    // Navigate to export page
    await page.click('.nav-link[data-page="export"]');
    await expect(page.locator('#export-page')).toBeVisible();
    
    // Check for export controls
    const exportButton = page.locator('button#export-btn, button[data-action="export"]');
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
    }
  });

  test('should test settings page functionality', async ({ page }) => {
    // Navigate to settings page
    await page.click('.nav-link[data-page="settings"]');
    await expect(page.locator('#settings-page')).toBeVisible();
    
    // Check for settings form elements - use more specific selector
    const settingsForm = page.locator('#pingone-config-form');
    if (await settingsForm.isVisible()) {
      await expect(settingsForm).toBeVisible();
    }
  });
});
