// Debug token format
import fetch from 'node-fetch';

async function debugToken() {
    console.log('🔍 Debugging token format...');
    
    try {
        // Test the server's token endpoint
        const response = await fetch('http://localhost:4000/api/health');
        const data = await response.json();
        console.log('Server health:', data.status);
        
        // Test token generation directly
        const tokenResponse = await fetch('https://auth.pingone.com/b9817c16-9910-4415-b67e-4ac687da74d9/as/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from('26e7f07c-11a4-402a-b064-07b55aee189e:9p3hLItWFzw5BxKjH3.~TIGVPP~uj4os6fY93170dMvXadn1GEsWTP2lHSTAoevq').toString('base64')
            },
            body: 'grant_type=client_credentials'
        });
        
        const tokenData = await tokenResponse.json();
        console.log('Direct token request:', tokenResponse.status);
        
        if (tokenData.access_token) {
            console.log('Token length:', tokenData.access_token.length);
            console.log('Token starts with:', tokenData.access_token.substring(0, 20) + '...');
            console.log('Token ends with:', '...' + tokenData.access_token.substring(tokenData.access_token.length - 20));
            
            // Test the token with PingOne API directly
            const testResponse = await fetch('https://api.pingone.com/v1/environments/b9817c16-9910-4415-b67e-4ac687da74d9/populations', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Direct API test:', testResponse.status);
            if (!testResponse.ok) {
                const errorText = await testResponse.text();
                console.log('Direct API error:', errorText);
            }
        }
        
    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

debugToken();