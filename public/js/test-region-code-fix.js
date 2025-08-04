/**
 * Region Code Fix Test Script
 * 
 * This script tests the region code fix by making API calls with legacy region codes
 * and logging the results to the console.
 * 
 * Version: 7.0.0.13
 */
(function() {
  console.log('🧪 Region Code Fix Test: Starting tests...');
  
  // Test function to make API calls with different region codes
  async function testRegionCodeFix() {
    const testCases = [
      { name: 'NorthAmerica to NA', url: '/api/pingone/test-connection?region=NorthAmerica' },
      { name: 'Europe to EU', url: '/api/pingone/test-connection?region=Europe' },
      { name: 'Canada to CA', url: '/api/pingone/test-connection?region=Canada' },
      { name: 'AsiaPacific to AP', url: '/api/pingone/test-connection?region=AsiaPacific' },
      { name: 'Already standardized NA', url: '/api/pingone/test-connection?region=NA' }
    ];
    
    console.log('🧪 Region Code Fix Test: Running ' + testCases.length + ' test cases...');
    
    for (const test of testCases) {
      console.log(`🧪 Testing: ${test.name} - Original URL: ${test.url}`);
      try {
        // This should trigger our region code fix
        const response = await fetch(test.url);
        console.log(`🧪 ${test.name} - Response status: ${response.status}`);
      } catch (error) {
        console.error(`🧪 ${test.name} - Error:`, error);
      }
    }
    
    console.log('🧪 Region Code Fix Test: All tests completed');
  }
  
  // Run tests when the page is fully loaded
  if (document.readyState === 'complete') {
    testRegionCodeFix();
  } else {
    window.addEventListener('load', testRegionCodeFix);
  }
  
  console.log('🧪 Region Code Fix Test: Test script initialized');
})();
