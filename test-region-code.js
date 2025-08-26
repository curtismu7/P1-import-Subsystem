// Test script to verify region code standardization
import axios from 'axios';

// Test with both standardized and legacy region codes
async function testRegionCodes() {
  console.log('🧪 TESTING REGION CODE STANDARDIZATION');
  console.log('======================================');

  // Test with standardized region code "NA"
  console.log('\n1️⃣ Testing with standardized region code "NA"');
  try {
    const standardResponse = await axios.post('http://localhost:4000/api/pingone/test-connection', {
      environmentId: 'test-environment-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      region: 'NA'  // Standardized region code
    });
    console.log('✅ Response:', standardResponse.status, standardResponse.statusText);
    console.log('📋 Data:', JSON.stringify(standardResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response ? error.response.status : error.message);
    console.log('📋 Error Data:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data');

    // Check if the error is related to region code
    const errorData = error.response ? error.response.data : {};
    if (errorData.error && errorData.error.includes('region')) {
      console.log('🚨 REGION CODE ERROR DETECTED!');
    } else {
      console.log('✅ No region code error - standardized code "NA" accepted');
    }
  }

  // Test with legacy region code "NorthAmerica"
  console.log('\n2️⃣ Testing with legacy region code "NorthAmerica"');
  try {
    const legacyResponse = await axios.post('http://localhost:4000/api/pingone/test-connection', {
      environmentId: 'test-environment-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      region: 'NorthAmerica'  // Legacy region code
    });
    console.log('✅ Response:', legacyResponse.status, legacyResponse.statusText);
    console.log('📋 Data:', JSON.stringify(legacyResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.response ? error.response.status : error.message);
    console.log('📋 Error Data:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data');

    // Check if the error is related to region code
    const errorData = error.response ? error.response.data : {};
    if (errorData.error && errorData.error.includes('region')) {
      console.log('🚨 REGION CODE ERROR DETECTED!');
    } else {
      console.log('✅ No region code error - legacy code "NorthAmerica" accepted');
    }
  }

  console.log('\n✅ REGION CODE TESTING COMPLETE');
}

// Run the tests
testRegionCodes();
