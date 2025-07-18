// Delete Page Test Script
// Run this in the browser console while on the Delete page

console.log('🧪 Starting Delete Page Test...');

function testDeletePage() {
    const results = [];
    
    // Test 1: Check if we're on the delete page
    const deleteView = document.getElementById('delete-csv-view');
    results.push({
        test: 'Delete View Present',
        pass: !!deleteView,
        details: deleteView ? 'Found delete-csv-view element' : 'delete-csv-view element missing - not on delete page?'
    });
    
    // Test 2: Check delete sections
    const fileSec = document.getElementById('delete-file-section');
    const popSec = document.getElementById('delete-population-section');
    const envSec = document.getElementById('delete-environment-section');
    results.push({
        test: 'Delete Sections',
        pass: !!(fileSec && popSec && envSec),
        details: `File section: ${!!fileSec}, Population section: ${!!popSec}, Environment section: ${!!envSec}`
    });
    
    // Test 3: Check form elements
    const startBtn = document.getElementById('start-delete');
    const fileInput = document.getElementById('delete-csv-file');
    const popSelect = document.getElementById('delete-population-select');
    const confirmStd = document.getElementById('confirm-delete');
    results.push({
        test: 'Form Elements',
        pass: !!(startBtn && fileInput && popSelect && confirmStd),
        details: `Start button: ${!!startBtn}, File input: ${!!fileInput}, Population select: ${!!popSelect}, Confirm checkbox: ${!!confirmStd}`
    });
    
    // Test 4: Check Delete Manager
    const hasDeleteManager = window.deleteManager !== undefined;
    const hasDeleteManagerClass = typeof DeleteManager !== 'undefined';
    results.push({
        test: 'Delete Manager',
        pass: hasDeleteManager || hasDeleteManagerClass,
        details: `Global deleteManager: ${hasDeleteManager}, DeleteManager class: ${hasDeleteManagerClass}`
    });
    
    // Test 5: Check event listeners
    const radioButtons = document.querySelectorAll('input[name="delete-type"]');
    results.push({
        test: 'Delete Type Radios',
        pass: radioButtons.length >= 3,
        details: `Found ${radioButtons.length} delete type radio buttons (expected 3: file, population, environment)`
    });
    
    // Test 6: Check button state
    const buttonDisabled = startBtn ? startBtn.disabled : null;
    results.push({
        test: 'Button Validation',
        pass: buttonDisabled === true,
        details: `Start button disabled: ${buttonDisabled} (should be true initially)`
    });
    
    // Display results
    console.log('\n📊 DELETE PAGE TEST RESULTS:');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(result => {
        const status = result.pass ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${result.test}`);
        console.log(`   ${result.details}`);
        
        if (result.pass) passed++;
        else failed++;
    });
    
    console.log('=' .repeat(50));
    console.log(`📈 SUMMARY: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Delete page appears to be working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Delete page has issues that need fixing.');
    }
    
    // Test API if we're on the right page
    if (deleteView) {
        console.log('\n🔌 Testing Delete API...');
        testDeleteAPI();
    }
    
    return { passed, failed, results };
}

async function testDeleteAPI() {
    try {
        const response = await fetch('/api/delete-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'population', populationId: 'test-id' })
        });
        
        const data = await response.json();
        
        console.log(`API Response: ${response.status} ${response.statusText}`);
        console.log('Response data:', data);
        
        if (response.status === 401 || response.status === 400 || response.status === 403) {
            console.log('✅ API Test: Expected error response (this is normal for test data)');
        } else if (response.ok) {
            console.log('✅ API Test: Success response');
        } else {
            console.log('⚠️  API Test: Unexpected response');
        }
    } catch (error) {
        console.log('❌ API Test: Network error -', error.message);
    }
}

// Run the test
testDeletePage();