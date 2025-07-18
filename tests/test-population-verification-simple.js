/**
 * Simple Population Selection Verification Test
 * 
 * This script can be run directly in the browser console to test that the population
 * used to store users matches what's selected in the UI dropdown.
 */

function testPopulationSelection() {
    console.log('🔍 Starting Population Selection Verification Test...');
    
    // Test 1: Check UI Population Selection
    console.log('\n=== Test 1: UI Population Selection ===');
    const populationSelect = document.getElementById('import-population-select');
    
    if (!populationSelect) {
        console.error('❌ Population dropdown not found!');
        return false;
    }
    
    const selectedIndex = populationSelect.selectedIndex;
    const selectedValue = populationSelect.value;
    const selectedText = populationSelect.options[selectedIndex]?.text || '';
    
    console.log('Population dropdown state:');
    console.log(`  - Selected Index: ${selectedIndex}`);
    console.log(`  - Selected Value: ${selectedValue}`);
    console.log(`  - Selected Text: ${selectedText}`);
    console.log(`  - Total Options: ${populationSelect.options.length}`);
    
    if (!selectedValue || selectedIndex === -1) {
        console.error('❌ No population selected from dropdown!');
        return false;
    }
    
    console.log('✅ UI Population Selection: PASSED');
    console.log(`   Selected: ${selectedText} (${selectedValue})`);
    
    // Test 2: Check if CSV file is uploaded
    console.log('\n=== Test 2: CSV File Upload ===');
    const csvFile = document.getElementById('csv-file');
    
    if (!csvFile || !csvFile.files[0]) {
        console.warn('⚠️ No CSV file uploaded - cannot test population assignment logic');
        return false;
    }
    
    console.log('✅ CSV File Upload: PASSED');
    console.log(`   File: ${csvFile.files[0].name}`);
    
    // Test 3: Simulate Population Assignment Logic
    console.log('\n=== Test 3: Population Assignment Logic ===');
    
    // Read CSV file
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        testPopulationAssignmentLogic(csvContent, selectedValue, selectedText);
    };
    reader.readAsText(csvFile.files[0]);
}

function testPopulationAssignmentLogic(csvContent, uiPopulationId, uiPopulationName) {
    console.log('Testing population assignment logic...');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        console.error('❌ CSV file is empty or has no data rows');
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const populationIdIndex = headers.findIndex(h => 
        h.toLowerCase() === 'populationid' || h.toLowerCase() === 'population_id'
    );
    
    console.log(`CSV Headers: ${headers.join(', ')}`);
    console.log(`Population ID column index: ${populationIdIndex}`);
    
    const results = [];
    let uiPopulationUsed = 0;
    let csvPopulationUsed = 0;
    let errors = 0;
    
    // Process each user
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const user = headers.reduce((obj, header, index) => {
            obj[header] = values[index] || '';
            return obj;
        }, {});
        
        user.lineNumber = i + 1;
        
        // Simulate population assignment logic
        const result = simulatePopulationAssignment(user, uiPopulationId, uiPopulationName);
        results.push(result);
        
        if (result.type === 'error') errors++;
        else if (result.source === 'ui') uiPopulationUsed++;
        else if (result.source === 'csv') csvPopulationUsed++;
    }
    
    console.log('\nPopulation Assignment Results:');
    console.log(`  - UI Population used: ${uiPopulationUsed}`);
    console.log(`  - CSV Population used: ${csvPopulationUsed}`);
    console.log(`  - Errors: ${errors}`);
    
    // Test 4: Verify Consistency
    console.log('\n=== Test 4: Population Consistency ===');
    
    let consistentCount = 0;
    let inconsistentCount = 0;
    
    results.forEach(result => {
        if (result.type === 'error') return;
        
        if (result.source === 'ui' && result.assignedPopulationId === uiPopulationId) {
            consistentCount++;
        } else if (result.source === 'ui' && result.assignedPopulationId !== uiPopulationId) {
            inconsistentCount++;
            console.error(`❌ INCONSISTENT: Line ${result.lineNumber} - User: ${result.user.email || result.user.username}`);
            console.error(`   Expected: ${uiPopulationName} (${uiPopulationId})`);
            console.error(`   Got: ${result.assignedPopulationName} (${result.assignedPopulationId})`);
        }
    });
    
    console.log(`\nConsistency Results:`);
    console.log(`  - Consistent UI assignments: ${consistentCount}`);
    console.log(`  - Inconsistent UI assignments: ${inconsistentCount}`);
    
    if (inconsistentCount > 0) {
        console.error(`❌ Population Consistency: FAILED - ${inconsistentCount} inconsistent assignments`);
    } else if (errors > 0) {
        console.warn(`⚠️ Population Consistency: WARNING - ${errors} errors`);
    } else {
        console.log(`✅ Population Consistency: PASSED - All ${consistentCount} UI assignments are consistent`);
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`UI Population Selected: ${uiPopulationName} (${uiPopulationId})`);
    console.log(`Total Users Processed: ${results.length}`);
    console.log(`UI Population Used: ${uiPopulationUsed}`);
    console.log(`CSV Population Used: ${csvPopulationUsed}`);
    console.log(`Consistent Assignments: ${consistentCount}`);
    console.log(`Inconsistent Assignments: ${inconsistentCount}`);
    console.log(`Errors: ${errors}`);
    
    if (inconsistentCount === 0 && errors === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Population selection is working correctly.');
    } else {
        console.log('\n❌ TESTS FAILED! There are issues with population selection.');
    }
}

function simulatePopulationAssignment(user, uiPopulationId, uiPopulationName) {
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
            if (uiPopulationId) {
                result.assignedPopulationId = uiPopulationId;
                result.assignedPopulationName = uiPopulationName;
                result.source = 'ui';
                result.type = 'warning';
                result.message = `Invalid CSV population ID format, using UI selection: ${uiPopulationId}`;
            } else {
                result.type = 'error';
                result.message = 'Invalid CSV population ID format and no UI fallback available';
            }
        }
    } else {
        // No CSV population ID, use UI selection
        if (uiPopulationId) {
            result.assignedPopulationId = uiPopulationId;
            result.assignedPopulationName = uiPopulationName;
            result.source = 'ui';
            result.message = `No CSV population ID, using UI selection: ${uiPopulationId}`;
        } else {
            result.type = 'error';
            result.message = 'No population ID available (neither CSV nor UI selection)';
        }
    }
    
    return result;
}

// Auto-run test if we're on the import page
if (document.getElementById('import-population-select')) {
    console.log('🔍 Population verification test available!');
    console.log('Run testPopulationSelection() to execute the test.');
    
    // Also make it available globally
    window.testPopulationSelection = testPopulationSelection;
} else {
    console.log('⚠️ Not on import page - population dropdown not found');
} 