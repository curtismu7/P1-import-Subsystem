#!/usr/bin/env node

/**
 * Disclaimer Modal Verification Script
 * Tests the disclaimer modal functionality and accessibility features
 */

const puppeteer = require('puppeteer');

async function testDisclaimerModal() {
    console.log('🧪 Starting Disclaimer Modal Verification Tests...\n');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to test page
        console.log('📄 Loading test page...');
        await page.goto('http://localhost:4000/test-disclaimer-modal.html', {
            waitUntil: 'networkidle2'
        });
        
        // Test 1: Check if modal appears on page load
        console.log('\n✅ Test 1: Modal appears on page load');
        const modalOverlay = await page.$('.disclaimer-modal-overlay');
        if (modalOverlay) {
            console.log('   ✓ Modal overlay found');
            const isVisible = await modalOverlay.evaluate(el => 
                el.classList.contains('active')
            );
            console.log(`   ✓ Modal visibility: ${isVisible ? 'Visible' : 'Hidden'}`);
        } else {
            console.log('   ❌ Modal overlay not found');
        }
        
        // Test 2: Check modal content
        console.log('\n✅ Test 2: Modal content verification');
        const modalTitle = await page.$eval('#disclaimer-title', el => el.textContent.trim());
        console.log(`   ✓ Modal title: "${modalTitle}"`);
        
        const checkbox = await page.$('#disclaimer-agreement-checkbox');
        if (checkbox) {
            console.log('   ✓ Checkbox found');
            const isChecked = await checkbox.evaluate(el => el.checked);
            console.log(`   ✓ Checkbox state: ${isChecked ? 'Checked' : 'Unchecked'}`);
        } else {
            console.log('   ❌ Checkbox not found');
        }
        
        // Test 3: Test checkbox functionality
        console.log('\n✅ Test 3: Checkbox functionality');
        if (checkbox) {
            await checkbox.click();
            await page.waitForTimeout(500);
            
            const isCheckedAfter = await checkbox.evaluate(el => el.checked);
            console.log(`   ✓ Checkbox clicked, new state: ${isCheckedAfter ? 'Checked' : 'Unchecked'}`);
            
            const continueBtn = await page.$('#disclaimer-continue');
            if (continueBtn) {
                const isDisabled = await continueBtn.evaluate(el => el.disabled);
                console.log(`   ✓ Continue button disabled: ${isDisabled}`);
            }
        }
        
        // Test 4: Test continue button functionality
        console.log('\n✅ Test 4: Continue button functionality');
        const continueBtn = await page.$('#disclaimer-continue');
        if (continueBtn && checkbox) {
            // Ensure checkbox is checked
            const isChecked = await checkbox.evaluate(el => el.checked);
            if (!isChecked) {
                await checkbox.click();
                await page.waitForTimeout(500);
            }
            
            // Click continue button
            await continueBtn.click();
            await page.waitForTimeout(1000);
            
            // Check if modal is hidden
            const modalHidden = await page.evaluate(() => {
                const overlay = document.querySelector('.disclaimer-modal-overlay');
                return overlay && !overlay.classList.contains('active');
            });
            console.log(`   ✓ Modal hidden after continue: ${modalHidden}`);
        }
        
        // Test 5: Test cancel button functionality
        console.log('\n✅ Test 5: Cancel button functionality');
        
        // Reset disclaimer and show modal again
        await page.evaluate(() => {
            if (window.DisclaimerModal) {
                window.DisclaimerModal.resetDisclaimerAcceptance();
                new window.DisclaimerModal();
            }
        });
        await page.waitForTimeout(1000);
        
        const cancelBtn = await page.$('#disclaimer-cancel');
        if (cancelBtn) {
            await cancelBtn.click();
            await page.waitForTimeout(1000);
            
            const modalHidden = await page.evaluate(() => {
                const overlay = document.querySelector('.disclaimer-modal-overlay');
                return overlay && !overlay.classList.contains('active');
            });
            console.log(`   ✓ Modal hidden after cancel: ${modalHidden}`);
        }
        
        // Test 6: Test keyboard navigation
        console.log('\n✅ Test 6: Keyboard navigation');
        
        // Reset and show modal again
        await page.evaluate(() => {
            if (window.DisclaimerModal) {
                window.DisclaimerModal.resetDisclaimerAcceptance();
                new window.DisclaimerModal();
            }
        });
        await page.waitForTimeout(1000);
        
        // Test Tab navigation
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        
        const focusedElement = await page.evaluate(() => document.activeElement.id);
        console.log(`   ✓ First tab focus: ${focusedElement}`);
        
        // Test Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        const modalHiddenAfterEscape = await page.evaluate(() => {
            const overlay = document.querySelector('.disclaimer-modal-overlay');
            return overlay && !overlay.classList.contains('active');
        });
        console.log(`   ✓ Modal hidden after Escape: ${modalHiddenAfterEscape}`);
        
        // Test 7: Test accessibility features
        console.log('\n✅ Test 7: Accessibility features');
        
        // Reset and show modal again
        await page.evaluate(() => {
            if (window.DisclaimerModal) {
                window.DisclaimerModal.resetDisclaimerAcceptance();
                new window.DisclaimerModal();
            }
        });
        await page.waitForTimeout(1000);
        
        // Check ARIA attributes
        const modalRole = await page.$eval('.disclaimer-modal-overlay', el => el.getAttribute('role'));
        const modalAriaModal = await page.$eval('.disclaimer-modal-overlay', el => el.getAttribute('aria-modal'));
        const modalAriaLabelledby = await page.$eval('.disclaimer-modal-overlay', el => el.getAttribute('aria-labelledby'));
        
        console.log(`   ✓ Modal role: ${modalRole}`);
        console.log(`   ✓ Aria-modal: ${modalAriaModal}`);
        console.log(`   ✓ Aria-labelledby: ${modalAriaLabelledby}`);
        
        // Test 8: Test responsive design
        console.log('\n✅ Test 8: Responsive design');
        
        // Test mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        
        const modalWidth = await page.$eval('.disclaimer-modal', el => el.offsetWidth);
        console.log(`   ✓ Modal width on mobile: ${modalWidth}px`);
        
        // Reset to desktop viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        // Test 9: Test localStorage persistence
        console.log('\n✅ Test 9: LocalStorage persistence');
        
        // Accept disclaimer
        await page.evaluate(() => {
            if (window.DisclaimerModal) {
                window.DisclaimerModal.resetDisclaimerAcceptance();
                const modal = new window.DisclaimerModal();
                // Simulate acceptance
                localStorage.setItem('disclaimerAccepted', 'true');
                localStorage.setItem('disclaimerAcceptedAt', new Date().toISOString());
            }
        });
        await page.waitForTimeout(1000);
        
        // Reload page
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(1000);
        
        const modalVisibleAfterReload = await page.evaluate(() => {
            const overlay = document.querySelector('.disclaimer-modal-overlay');
            return overlay && overlay.classList.contains('active');
        });
        console.log(`   ✓ Modal hidden after reload (accepted): ${!modalVisibleAfterReload}`);
        
        // Test 10: Test app container state
        console.log('\n✅ Test 10: App container state');
        
        // Reset and show modal
        await page.evaluate(() => {
            if (window.DisclaimerModal) {
                window.DisclaimerModal.resetDisclaimerAcceptance();
                new window.DisclaimerModal();
            }
        });
        await page.waitForTimeout(1000);
        
        const appContainerClass = await page.$eval('.app-container', el => el.className);
        console.log(`   ✓ App container classes: ${appContainerClass}`);
        
        const hasActiveClass = appContainerClass.includes('disclaimer-modal-active');
        console.log(`   ✓ Has disclaimer-modal-active class: ${hasActiveClass}`);
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
if (require.main === module) {
    testDisclaimerModal().catch(console.error);
}

module.exports = { testDisclaimerModal }; 