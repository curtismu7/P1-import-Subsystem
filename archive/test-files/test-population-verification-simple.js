// Simple Population Verification Functions
// This file provides additional verification functions for testing population selection

/**
 * Verify that the correct population is being used during import
 * @param {string} selectedPopulationId - The population ID that should be used
 * @param {string} selectedPopulationName - The population name that should be used
 * @returns {Promise<Object>} Verification result
 */
async function verifyPopulationSelection(selectedPopulationId, selectedPopulationName) {
    console.log(`Verifying population selection: ${selectedPopulationName} (${selectedPopulationId})`);
    
    try {
        // First, check what populations are available
        const populationsResponse = await fetch('/api/populations');
        const data = await populationsResponse.json();
        const populations = data.populations || [];
        
        console.log('Available populations:', populations);
        
        // Find the default population
        const defaultPopulation = populations.find(p => p.default);
        console.log('Default population:', defaultPopulation);
        
        // Check if our selected population is the default
        const isDefault = defaultPopulation && defaultPopulation.id === selectedPopulationId;
        console.log(`Selected population is default: ${isDefault}`);
        
        // Create a test import request
        const testData = new FormData();
        testData.append('populationId', selectedPopulationId);
        testData.append('populationName', selectedPopulationName);
        testData.append('totalUsers', '1');
        
        // Add a simple test file
        const testFile = new File(['username,email,firstName,lastName\ntestuser,test@example.com,Test,User'], 'test.csv', { type: 'text/csv' });
        testData.append('file', testFile);
        
        const importResponse = await fetch('/api/import', {
            method: 'POST',
            body: testData
        });
        
        const importResult = await importResponse.json();
        console.log('Import result:', importResult);
        
        // Verify the population used matches what we selected
        const populationMatch = importResult.populationId === selectedPopulationId;
        
        return {
            success: populationMatch,
            selectedPopulation: { id: selectedPopulationId, name: selectedPopulationName },
            usedPopulation: { id: importResult.populationId, name: importResult.populationName },
            isDefault,
            match: populationMatch,
            importResult
        };
        
    } catch (error) {
        console.error('Verification error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Test the population selection with different scenarios
 */
async function runPopulationTests() {
    console.log('Starting population selection tests...');
    
    // Get available populations
    const populationsResponse = await fetch('/api/populations');
    const data = await populationsResponse.json();
    const populations = data.populations || [];
    
    const results = [];
    
    // Test 1: Use the first non-default population
    const nonDefaultPopulation = populations.find(p => !p.default);
    if (nonDefaultPopulation) {
        console.log(`Test 1: Using non-default population: ${nonDefaultPopulation.name}`);
        const result1 = await verifyPopulationSelection(nonDefaultPopulation.id, nonDefaultPopulation.name);
        results.push({ test: 'Non-default population', result: result1 });
    }
    
    // Test 2: Use the default population
    const defaultPopulation = populations.find(p => p.default);
    if (defaultPopulation) {
        console.log(`Test 2: Using default population: ${defaultPopulation.name}`);
        const result2 = await verifyPopulationSelection(defaultPopulation.id, defaultPopulation.name);
        results.push({ test: 'Default population', result: result2 });
    }
    
    // Test 3: Use the first population (regardless of default status)
    if (populations.length > 0) {
        const firstPopulation = populations[0];
        console.log(`Test 3: Using first population: ${firstPopulation.name}`);
        const result3 = await verifyPopulationSelection(firstPopulation.id, firstPopulation.name);
        results.push({ test: 'First population', result: result3 });
    }
    
    console.log('All test results:', results);
    return results;
}

// Export functions for use in test pages
if (typeof window !== 'undefined') {
    window.verifyPopulationSelection = verifyPopulationSelection;
    window.runPopulationTests = runPopulationTests;
} 