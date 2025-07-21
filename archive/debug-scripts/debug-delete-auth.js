// Debug script to test delete authentication
const fetch = require('node-fetch');

async function testDeleteAuth() {
    console.log('🔍 Testing Delete Authentication...');
    
    try {
        // First, get a token directly
        console.log('1. Getting token directly...');
        const tokenResponse = await fetch('https://auth.pingone.com/b9817c16-9910-4415-b67e-4ac687da74d9/as/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from('26e7f07c-11a4-402a-b064-07b55aee189e:9p3hLItWFzw5BxKjH3.~TIGVPP~uj4os6fY93170dMvXadn1GEsWTP2lHSTAoevq').toString('base64')
            },
            body: 'grant_type=client_credentials'
        });
        
        const tokenData = await tokenResponse.json();
        console.log('✅ Token obtained:', tokenData.access_token ? 'SUCCESS' : 'FAILED');
        
        if (!tokenData.access_token) {
            console.log('❌ Token error:', tokenData);
            return;
        }
        
        // Test the delete API with the token
        console.log('2. Testing delete API with token...');
        const deleteResponse = await fetch('http://localhost:4000/api/delete-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify({
                type: 'population',
                populationId: 'test-population-id'
            })
        });
        
        const deleteData = await deleteResponse.json();
        console.log('Delete API Response:', deleteResponse.status, deleteData);
        
        // Test server's token manager
        console.log('3. Testing server token manager...');
        const healthResponse = await fetch('http://localhost:4000/api/health');
        const healthData = await healthResponse.json();
        console.log('Server health:', healthData.status);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDeleteAuth();