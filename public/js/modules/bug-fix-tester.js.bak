
/**
 * Bug Fix Test Suite
 * 
 * Tests all critical bug fixes to ensure they're working properly
 */

class BugFixTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }
    
    async runAllTests() {
        console.log('🧪 Running Bug Fix Tests...');
        
        const tests = [
            () => this.testGlobalErrorHandler(),
            () => this.testResourceManager(),
            () => this.testSafeAPI(),
            () => this.testSecurityUtils()
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('Test failed:', error);
            }
        }
        
        this.printResults();
    }
    
    testGlobalErrorHandler() {
        const test = 'Global Error Handler';
        try {
            if (typeof window.globalErrorHandler === 'undefined') {
                throw new Error('Global error handler not loaded');
            }
            
            // Test error handling (this should be caught)
            setTimeout(() => {
                throw new Error('Test error - should be caught by global handler');
            }, 100);
            
            this.results.push({ test, status: 'PASS', message: 'Global error handler available' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testResourceManager() {
        const test = 'Resource Manager';
        try {
            if (typeof window.resourceManager === 'undefined') {
                throw new Error('Resource manager not loaded');
            }
            
            // Test resource tracking
            const testElement = document.createElement('div');
            const listenerId = window.resourceManager.addEventListener(testElement, 'click', () => {});
            
            if (!listenerId) {
                throw new Error('Resource manager not tracking event listeners');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Resource manager working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testSafeAPI() {
        const test = 'Safe API';
        try {
            if (typeof window.SafeAPI === 'undefined') {
                throw new Error('Safe API not loaded');
            }
            
            // Test safe JSON parsing
            const result = window.SafeAPI.parseJSON('{"test": true}');
            if (!result || result.test !== true) {
                throw new Error('Safe JSON parsing failed');
            }
            
            // Test safe element access
            const element = window.SafeAPI.getElement('body');
            if (!element) {
                throw new Error('Safe element access failed');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Safe API working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    testSecurityUtils() {
        const test = 'Security Utils';
        try {
            if (typeof window.SecurityUtils === 'undefined') {
                throw new Error('Security utils not loaded');
            }
            
            // Test sensitive data masking
            const testData = { password: 'secret123', username: 'test' };
            const masked = window.SecurityUtils.maskSensitiveData(testData);
            
            if (masked.password === 'secret123') {
                throw new Error('Sensitive data not masked');
            }
            
            this.results.push({ test, status: 'PASS', message: 'Security utils working' });
        } catch (error) {
            this.results.push({ test, status: 'FAIL', message: error.message });
        }
    }
    
    printResults() {
        console.group('🧪 Bug Fix Test Results');
        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        console.groupEnd();
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const total = this.results.length;
        console.log(`📊 Tests: ${passed}/${total} passed`);
    }
}

// Make available globally
window.bugFixTester = new BugFixTester();
window.testBugFixes = () => window.bugFixTester.runAllTests();
