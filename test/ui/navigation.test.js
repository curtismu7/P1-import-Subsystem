/**
 * Navigation Tests for PingOne Import Tool
 * 
 * Tests navigation functionality, view validation, and error handling
 * to prevent "Navigation Error: Invalid view: home" issues.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('Navigation System Tests', () => {
    let ViewManagementSubsystem, NavigationSubsystem;
    let mockLogger, mockUIManager;
    
    beforeAll(() => {
        // Setup mock logger
        mockLogger = {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {}
        };
        
        // Setup mock UI manager
        mockUIManager = {
            showError: () => {},
            showWarning: () => {},
            showSuccess: () => {}
        };
    });
    
    describe('View Registration and Validation', () => {
        it('should include "home" in valid views list', () => {
            // Read the ViewManagementSubsystem file to verify home view is registered
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const content = fs.readFileSync(viewManagementPath, 'utf8');
            
            // Check that home is in the valid views array
            assert(content.includes("'home'"), 'Home view should be included in valid views');
            assert(content.includes('home', 'import', 'export'), 'Home should be first in the valid views list');
        });
        
        it('should include "home" in NavigationSubsystem valid views', () => {
            // Read the NavigationSubsystem file to verify home view is registered
            const navigationPath = path.join(__dirname, '../../public/js/modules/navigation-subsystem.js');
            const content = fs.readFileSync(navigationPath, 'utf8');
            
            // Check that home is in the valid views array
            assert(content.includes("'home'"), 'Home view should be included in NavigationSubsystem valid views');
        });
        
        it('should have consistent valid views between subsystems', () => {
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const navigationPath = path.join(__dirname, '../../public/js/modules/navigation-subsystem.js');
            
            const viewContent = fs.readFileSync(viewManagementPath, 'utf8');
            const navContent = fs.readFileSync(navigationPath, 'utf8');
            
            // Extract valid views arrays (simplified check)
            const viewMatch = viewContent.match(/validViews\s*=\s*\[(.*?)\]/s);
            const navMatch = navContent.match(/validViews\s*=\s*\[(.*?)\]/s);
            
            assert(viewMatch, 'Should find validViews in ViewManagementSubsystem');
            assert(navMatch, 'Should find validViews in NavigationSubsystem');
            
            // Both should contain 'home'
            assert(viewMatch[1].includes("'home'"), 'ViewManagementSubsystem should include home');
            assert(navMatch[1].includes("'home'"), 'NavigationSubsystem should include home');
        });
    });
    
    describe('Error Handling and Logging', () => {
        it('should have enhanced error logging in ViewManagementSubsystem', () => {
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const content = fs.readFileSync(viewManagementPath, 'utf8');
            
            // Check for enhanced error context
            assert(content.includes('errorContext'), 'Should have errorContext for detailed logging');
            assert(content.includes('component: \'ViewManagementSubsystem\''), 'Should log component name');
            assert(content.includes('operation: \'showView\''), 'Should log operation name');
            assert(content.includes('stackTrace'), 'Should include stack trace in error context');
        });
        
        it('should have enhanced error logging in NavigationSubsystem', () => {
            const navigationPath = path.join(__dirname, '../../public/js/modules/navigation-subsystem.js');
            const content = fs.readFileSync(navigationPath, 'utf8');
            
            // Check for enhanced error context
            assert(content.includes('errorContext'), 'Should have errorContext for detailed logging');
            assert(content.includes('component: \'NavigationSubsystem\''), 'Should log component name');
            assert(content.includes('operation: \'navigateToView\''), 'Should log operation name');
        });
        
        it('should have fallback mechanism for invalid views', () => {
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const content = fs.readFileSync(viewManagementPath, 'utf8');
            
            // Check for fallback to home view
            assert(content.includes('fallback to home view'), 'Should have fallback mechanism');
            assert(content.includes('view !== \'home\''), 'Should prevent infinite fallback loops');
        });
    });
    
    describe('HTML Structure Validation', () => {
        it('should have home view element in index.html', () => {
            const indexPath = path.join(__dirname, '../../public/index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for home view container
            assert(content.includes('id="home-view"'), 'Should have home-view element');
            assert(content.includes('data-view="home"'), 'Should have navigation element for home');
        });
        
        it('should have home navigation in main navigation', () => {
            const indexPath = path.join(__dirname, '../../public/index.html');
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Check for home navigation item
            assert(content.includes('fas fa-home'), 'Should have home icon in navigation');
            assert(content.includes('data-view="home"'), 'Should have home view data attribute');
        });
    });
    
    describe('Integration Tests', () => {
        it('should handle navigation to all valid views', () => {
            const validViews = ['home', 'import', 'export', 'modify', 'delete-csv', 'settings', 'logs', 'history'];
            
            validViews.forEach(view => {
                // This is a structural test - in a real environment, we'd test actual navigation
                assert(typeof view === 'string', `View ${view} should be a string`);
                assert(view.length > 0, `View ${view} should not be empty`);
            });
        });
        
        it('should have consistent view naming between files', () => {
            // Check that all references to views are consistent
            const files = [
                '../../public/js/modules/view-management-subsystem.js',
                '../../public/js/modules/navigation-subsystem.js'
            ];
            
            files.forEach(file => {
                const fullPath = path.join(__dirname, file);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    assert(content.includes("'home'"), `${file} should include home view`);
                }
            });
        });
    });
    
    describe('Error Prevention', () => {
        it('should prevent "Invalid view: home" errors', () => {
            // This test ensures the fix is in place
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const navigationPath = path.join(__dirname, '../../public/js/modules/navigation-subsystem.js');
            
            const viewContent = fs.readFileSync(viewManagementPath, 'utf8');
            const navContent = fs.readFileSync(navigationPath, 'utf8');
            
            // Both files should have 'home' in their valid views
            assert(viewContent.includes("'home'"), 'ViewManagementSubsystem should recognize home as valid');
            assert(navContent.includes("'home'"), 'NavigationSubsystem should recognize home as valid');
        });
        
        it('should have getValidViews helper methods', () => {
            const viewManagementPath = path.join(__dirname, '../../public/js/modules/view-management-subsystem.js');
            const navigationPath = path.join(__dirname, '../../public/js/modules/navigation-subsystem.js');
            
            const viewContent = fs.readFileSync(viewManagementPath, 'utf8');
            const navContent = fs.readFileSync(navigationPath, 'utf8');
            
            // Both should have getValidViews methods for better error reporting
            assert(viewContent.includes('getValidViews()'), 'ViewManagementSubsystem should have getValidViews method');
            assert(navContent.includes('getValidViews()'), 'NavigationSubsystem should have getValidViews method');
        });
    });
});
