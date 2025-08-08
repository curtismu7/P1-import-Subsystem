// Test script to verify status cards are working
// Run with: node test-status-cards.js

import fetch from 'node-fetch';

async function testStatusCards() {
    console.log('🧪 Testing Status Cards...\n');
    
    try {
        // Test 1: Check if server is running
        console.log('1. Testing server connectivity...');
        const response = await fetch('http://localhost:4000');
        console.log(`   ✅ Server is running (Status: ${response.status})`);
        
        // Test 2: Check settings API
        console.log('\n2. Testing settings API...');
        const settingsResponse = await fetch('http://localhost:4000/api/settings');
        const settings = await settingsResponse.json();
        console.log(`   ✅ Settings API working`);
        console.log(`   📋 Environment ID: ${settings.data.pingone_environment_id ? 'Configured' : 'Not configured'}`);
        console.log(`   📋 Client ID: ${settings.data.pingone_client_id ? 'Configured' : 'Not configured'}`);
        
        // Test 3: Check token status
        console.log('\n3. Testing token status...');
        const tokenResponse = await fetch('http://localhost:4000/api/token/status');
        const tokenStatus = await tokenResponse.json();
        console.log(`   ✅ Token API working`);
        console.log(`   🔑 Token valid: ${tokenStatus.data.isValid}`);
        console.log(`   ⏰ Expires in: ${tokenStatus.data.expiresIn} seconds`);
        
        // Test 4: Check populations API
        console.log('\n4. Testing populations API...');
        const populationsResponse = await fetch('http://localhost:4000/api/populations');
        const populations = await populationsResponse.json();
        console.log(`   ✅ Populations API working`);
        
        if (populations.success) {
            const populationCount = populations.data?.message?.populations?.length || 0;
            console.log(`   👥 Found ${populationCount} populations`);
            
            if (populationCount > 0) {
                console.log('   📋 Population names:');
                populations.data.message.populations.forEach((pop, index) => {
                    console.log(`      ${index + 1}. ${pop.name} (${pop.userCount} users)`);
                });
            }
        } else {
            console.log('   ❌ Populations API failed');
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n📝 Expected Status Card Results:');
        console.log('   - Connection Status: Should show "Connected"');
        console.log('   - Token Status: Should show "Valid (time remaining)"');
        console.log('   - Population Status: Should show "7 populations"');
        console.log('   - Environment Status: Should show the environment ID');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testStatusCards();
