import { readFile } from 'fs/promises';
import fetch from 'node-fetch';

async function verifySettings() {
  try {
    // Read settings file
    const settings = JSON.parse(await readFile('./data/settings.json', 'utf-8'));
    
    console.log('🔍 Verifying settings.json...');
    console.log('Environment ID:', settings.environmentId);
    console.log('Client ID:', settings.apiClientId);
    console.log('Region:', settings.region);
    
    // Test authentication
    const authUrl = `https://auth.pingone.com/${settings.environmentId}/as/token`;
    const authHeader = 'Basic ' + Buffer.from(`${settings.apiClientId}:${settings.apiSecret}`).toString('base64');
    
    console.log('\n🔑 Testing authentication...');
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: 'grant_type=client_credentials'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Authentication successful!');
      console.log('Token type:', result.token_type);
      console.log('Expires in:', result.expires_in, 'seconds');
    } else {
      console.error('❌ Authentication failed:', result);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifySettings();
