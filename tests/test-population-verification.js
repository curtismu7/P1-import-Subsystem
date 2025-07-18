/**
 * Population Selection Verification Test
 * 
 * This script tests that the population used to store users matches what's selected in the UI dropdown.
 * It simulates the population assignment logic and verifies consistency.
 */

class PopulationVerificationTest {
    constructor() {
        this.testResults = [];
        this.logs = [];
    }

    /**
     * Log a test message with timestamp
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, type };
        this.logs.push(logEntry);
        console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    }

    /**
     * Add a test result
     */
    addTestResult(testName, type, message, details = null) {
        this.testResults.push({ testName, type, message, details });
    }

    /**
     * Test 1: Verify UI population selection is captured correctly
     */
    testUIPopulationSelection() {
        this.log('=== Testing UI Population Selection ===', 'info');
        
        // Get the population dropdown element
        const populationSelect = document.getElementById('import-population-select');
        if (!populationSelect) {
            this.addTestResult('UI Population Selection', 'error', 'Population dropdown element not found');
            return false;
        }

        // Get selected population details
        const selectedIndex = populationSelect.selectedIndex;
        const selectedValue = populationSelect.value;
        const selectedText = populationSelect.options[selectedIndex]?.text || '';

        this.log(`Population dropdown state:`, 'info');
        this.log(`  - Selected Index: ${selectedIndex}`, 'info');
        this.log(`  - Selected Value: ${selectedValue}`, 'info');
        this.log(`  - Selected Text: ${selectedText}`, 'info');
        this.log(`  - Total Options: ${populationSelect.options.length}`, 'info');

        // Verify we have a valid selection
        if (!selectedValue || selectedIndex === -1) {
            this.addTestResult('UI Population Selection', 'error', 'No population selected from dropdown');
            return false;
        }

        // Store for comparison
        this.uiSelectedPopulationId = selectedValue;
        this.uiSelectedPopulationName = selectedText;

        this.addTestResult('UI Population Selection', 'success', 
            `Population selected: ${selectedText} (${selectedValue})`);
        
        return true;
    }

    /**
     * Test 2: Verify CSV parsing and population ID extraction
     */
    testCsvPopulationExtraction() {
        this.log('=== Testing CSV Population Extraction ===', 'info');
        
        // Get the current CSV data from the app
        const csvFile = document.getElementById('csv-file');
        if (!csvFile || !csvFile.files[0]) {
            this.addTestResult('CSV Population Extraction', 'error', 'No CSV file uploaded');
            return false;
        }

        // Parse CSV to extract population IDs
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvContent = e.target.result;
            this.parseCsvForPopulationIds(csvContent);
        };
        reader.readAsText(csvFile.files[0]);
    }

    /**
     * Parse CSV content to extract population IDs
     */
    parseCsvForPopulationIds(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            this.addTestResult('CSV Population Extraction', 'error', 'CSV file is empty or has no data rows');
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const populationIdIndex = headers.findIndex(h => 
            h.toLowerCase() === 'populationid' || h.toLowerCase() === 'population_id'
        );

        this.log(`CSV Headers: ${headers.join(', ')}`, 'info');
        this.log(`Population ID column index: ${populationIdIndex}`, 'info');

        if (populationIdIndex === -1) {
            this.log('No population ID column found in CSV', 'warning');
            this.addTestResult('CSV Population Extraction', 'warning', 'No population ID column found in CSV');
            return;
        }

        // Extract population IDs from CSV
        const csvPopulationIds = [];
        const csvUsers = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const user = headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {});
            
            user.lineNumber = i + 1; // +1 for header row
            csvUsers.push(user);

            if (user.populationId && user.populationId.trim() !== '') {
                csvPopulationIds.push({
                    lineNumber: i + 1,
                    populationId: user.populationId,
                    user: user.email || user.username || `User ${i}`
                });
            }
        }

        this.log(`Found ${csvPopulationIds.length} users with population IDs in CSV`, 'info');
        this.csvPopulationIds = csvPopulationIds;
        this.csvUsers = csvUsers;

        this.addTestResult('CSV Population Extraction', 'success', 
            `Extracted ${csvPopulationIds.length} population IDs from ${csvUsers.length} users`);

        // Log first few population IDs for verification
        csvPopulationIds.slice(0, 3).forEach(item => {
            this.log(`Line ${item.lineNumber}: ${item.user} -> Population ID: ${item.populationId}`, 'info');
        });
    }

    /**
     * Test 3: Simulate population assignment logic
     */
    testPopulationAssignmentLogic() {
        this.log('=== Testing Population Assignment Logic ===', 'info');
        
        if (!this.csvUsers || !this.uiSelectedPopulationId) {
            this.addTestResult('Population Assignment Logic', 'error', 'Missing CSV users or UI population selection');
            return;
        }

        const assignmentResults = [];
        let uiPopulationUsed = 0;
        let csvPopulationUsed = 0;
        let errors = 0;

        this.csvUsers.forEach(user => {
            const result = this.simulatePopulationAssignment(user);
            assignmentResults.push(result);

            if (result.type === 'error') errors++;
            else if (result.source === 'ui') uiPopulationUsed++;
            else if (result.source === 'csv') csvPopulationUsed++;
        });

        this.log(`Population assignment results:`, 'info');
        this.log(`  - UI Population used: ${uiPopulationUsed}`, 'info');
        this.log(`  - CSV Population used: ${csvPopulationUsed}`, 'info');
        this.log(`  - Errors: ${errors}`, 'info');

        this.assignmentResults = assignmentResults;

        const type = errors > 0 ? 'error' : 'success';
        this.addTestResult('Population Assignment Logic', type,
            `UI Population: ${uiPopulationUsed}, CSV Population: ${csvPopulationUsed}, Errors: ${errors}`);
    }

    /**
     * Simulate the population assignment logic from pingone-client.js
     */
    simulatePopulationAssignment(user) {
        const result = {
            user: user,
            assignedPopulationId: null,
            assignedPopulationName: null,
            source: null,
            type: 'success',
            message: '',
            lineNumber: user.lineNumber
        };

        // Check if user has populationId in CSV
        if (user.populationId && user.populationId.trim() !== '') {
            // Validate UUID format
            const isValidPopulationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.populationId);
            
            if (isValidPopulationId) {
                // Use CSV population ID
                result.assignedPopulationId = user.populationId;
                result.assignedPopulationName = `CSV Population (${user.populationId})`;
                result.source = 'csv';
                result.message = `Using CSV population ID: ${user.populationId}`;
            } else {
                // Invalid format, fall back to UI selection
                if (this.uiSelectedPopulationId) {
                    result.assignedPopulationId = this.uiSelectedPopulationId;
                    result.assignedPopulationName = this.uiSelectedPopulationName;
                    result.source = 'ui';
                    result.type = 'warning';
                    result.message = `Invalid CSV population ID format, using UI selection: ${this.uiSelectedPopulationId}`;
                } else {
                    result.type = 'error';
                    result.message = 'Invalid CSV population ID format and no UI fallback available';
                }
            }
        } else {
            // No CSV population ID, use UI selection
            if (this.uiSelectedPopulationId) {
                result.assignedPopulationId = this.uiSelectedPopulationId;
                result.assignedPopulationName = this.uiSelectedPopulationName;
                result.source = 'ui';
                result.message = `No CSV population ID, using UI selection: ${this.uiSelectedPopulationId}`;
            } else {
                result.type = 'error';
                result.message = 'No population ID available (neither CSV nor UI selection)';
            }
        }

        return result;
    }

    /**
     * Test 4: Verify consistency between UI selection and assigned populations
     */
    testPopulationConsistency() {
        this.log('=== Testing Population Assignment Consistency ===', 'info');
        
        if (!this.assignmentResults) {
            this.addTestResult('Population Consistency', 'error', 'No assignment results to check');
            return;
        }

        let consistentCount = 0;
        let inconsistentCount = 0;
        let csvUsedCount = 0;
        let errors = 0;

        const consistencyResults = this.assignmentResults.map(result => {
            if (result.type === 'error') {
                errors++;
                return { ...result, consistency: 'error' };
            }

            if (result.source === 'csv') {
                csvUsedCount++;
                return { ...result, consistency: 'csv-used' };
            }

            // Check if UI-assigned population matches UI selection
            if (result.source === 'ui' && result.assignedPopulationId === this.uiSelectedPopulationId) {
                consistentCount++;
                return { ...result, consistency: 'consistent' };
            } else if (result.source === 'ui' && result.assignedPopulationId !== this.uiSelectedPopulationId) {
                inconsistentCount++;
                return { ...result, consistency: 'inconsistent' };
            }

            return { ...result, consistency: 'unknown' };
        });

        this.log(`Consistency results:`, 'info');
        this.log(`  - Consistent UI assignments: ${consistentCount}`, 'info');
        this.log(`  - Inconsistent UI assignments: ${inconsistentCount}`, 'info');
        this.log(`  - CSV population used: ${csvUsedCount}`, 'info');
        this.log(`  - Errors: ${errors}`, 'info');

        // Log inconsistent assignments
        consistencyResults.filter(r => r.consistency === 'inconsistent').forEach(result => {
            this.log(`INCONSISTENT: Line ${result.lineNumber} - User: ${result.user.email || result.user.username}`, 'error');
            this.log(`  Expected: ${this.uiSelectedPopulationName} (${this.uiSelectedPopulationId})`, 'error');
            this.log(`  Got: ${result.assignedPopulationName} (${result.assignedPopulationId})`, 'error');
        });

        if (inconsistentCount > 0) {
            this.addTestResult('Population Consistency', 'error', 
                `${inconsistentCount} users have inconsistent population assignment`);
        } else if (errors > 0) {
            this.addTestResult('Population Consistency', 'warning', 
                `${errors} users had assignment errors`);
        } else {
            this.addTestResult('Population Consistency', 'success', 
                `All ${consistentCount} UI-assigned users have consistent population assignment`);
        }

        // Create detailed report
        this.createConsistencyReport(consistencyResults);
    }

    /**
     * Create a detailed consistency report
     */
    createConsistencyReport(results) {
        this.log('=== Detailed Consistency Report ===', 'info');
        
        const report = {
            total: results.length,
            consistent: results.filter(r => r.consistency === 'consistent').length,
            inconsistent: results.filter(r => r.consistency === 'inconsistent').length,
            csvUsed: results.filter(r => r.consistency === 'csv-used').length,
            errors: results.filter(r => r.consistency === 'error').length
        };

        this.log(`Total users: ${report.total}`, 'info');
        this.log(`Consistent UI assignments: ${report.consistent}`, 'info');
        this.log(`Inconsistent UI assignments: ${report.inconsistent}`, 'info');
        this.log(`CSV population used: ${report.csvUsed}`, 'info');
        this.log(`Errors: ${report.errors}`, 'info');

        // Log sample assignments for verification
        this.log('Sample assignments:', 'info');
        results.slice(0, 5).forEach(result => {
            this.log(`  Line ${result.lineNumber}: ${result.user.email || result.user.username} -> ${result.assignedPopulationName} (${result.source})`, 'info');
        });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        this.log('🚀 Starting Population Selection Verification Tests', 'info');
        
        // Test 1: UI Population Selection
        const uiTestPassed = this.testUIPopulationSelection();
        
        // Test 2: CSV Population Extraction
        this.testCsvPopulationExtraction();
        
        // Wait a bit for CSV parsing to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Population Assignment Logic
        this.testPopulationAssignmentLogic();
        
        // Test 4: Population Consistency
        this.testPopulationConsistency();
        
        // Summary
        this.log('=== Test Summary ===', 'info');
        this.testResults.forEach(result => {
            const icon = result.type === 'success' ? '✅' : result.type === 'warning' ? '⚠️' : '❌';
            this.log(`${icon} ${result.testName}: ${result.message}`, result.type);
        });
        
        const passedTests = this.testResults.filter(r => r.type === 'success').length;
        const totalTests = this.testResults.length;
        
        this.log(`\n🎯 Final Result: ${passedTests}/${totalTests} tests passed`, 
            passedTests === totalTests ? 'success' : 'error');
        
        return {
            passed: passedTests,
            total: totalTests,
            results: this.testResults,
            logs: this.logs
        };
    }

    /**
     * Export test results
     */
    exportResults() {
        return {
            timestamp: new Date().toISOString(),
            uiSelectedPopulation: {
                id: this.uiSelectedPopulationId,
                name: this.uiSelectedPopulationName
            },
            csvPopulationIds: this.csvPopulationIds || [],
            assignmentResults: this.assignmentResults || [],
            testResults: this.testResults,
            logs: this.logs
        };
    }
}

// Global function to run the test
window.runPopulationVerificationTest = async function() {
    const test = new PopulationVerificationTest();
    const results = await test.runAllTests();
    
    // Store results globally for inspection
    window.populationTestResults = test.exportResults();
    
    console.log('📊 Test results stored in window.populationTestResults');
    return results;
};

// Auto-run test when page loads (if on import page)
if (document.getElementById('import-population-select')) {
    console.log('🔍 Population verification test available. Run window.runPopulationVerificationTest() to execute.');
} 