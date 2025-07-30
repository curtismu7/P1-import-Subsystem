import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

async function getSettings() {
  // Try environment variables first
  if (process.env.PINGONE_ENVIRONMENT_ID && process.env.PINGONE_CLIENT_ID && process.env.PINGONE_CLIENT_SECRET) {
    return {
      environmentId: process.env.PINGONE_ENVIRONMENT_ID,
      clientId: process.env.PINGONE_CLIENT_ID,
      clientSecret: process.env.PINGONE_CLIENT_SECRET,
      region: process.env.PINGONE_REGION || 'NorthAmerica'
    };
  }

  // Fall back to settings file
  try {
    const settingsPath = path.resolve(process.cwd(), 'data/settings.json');
    const settingsFile = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsFile);
    
    return {
      environmentId: settings.environmentId,
      clientId: settings.apiClientId,
      clientSecret: settings.apiSecret,
      region: settings.region || 'NorthAmerica'
    };
  } catch (error) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }
}

async function testPingOneAuth() {
  console.log('🔍 Testing PingOne API Authentication...');
  
  try {
    // Get settings
    const settings = await getSettings();
    console.log('✅ Loaded credentials from:', process.env.PINGONE_ENVIRONMENT_ID ? 'environment variables' : 'settings file');
    
    // Get auth domain based on region
    const getAuthDomain = (region) => {
      const domainMap = {
        'NorthAmerica': 'auth.pingone.com',
        'Europe': 'auth.eu.pingone.com',
        'Canada': 'auth.ca.pingone.com',
        'Asia': 'auth.apsoutheast.pingone.com',
        'Australia': 'auth.aus.pingone.com',
        'US': 'auth.pingone.com',
        'EU': 'auth.eu.pingone.com',
        'AP': 'auth.apsoutheast.pingone.com'
      };
      return domainMap[region] || 'auth.pingone.com';
    };

    const authDomain = getAuthDomain(settings.region);
    const tokenUrl = `https://${authDomain}/${settings.environmentId}/as/token.oauth2`;
    
    console.log('\n🔑 Authentication Details:');
    console.log(`- Environment ID: ${settings.environmentId}`);
    console.log(`- Client ID: ${settings.clientId}`);
    console.log(`- Region: ${settings.region}`);
    console.log(`- Auth Domain: ${authDomain}`);
    console.log(`- Token URL: ${tokenUrl}`);
    
    // Prepare token request
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', settings.clientId);
    params.append('client_secret', settings.clientSecret);
    
    console.log('\n🔍 Sending token request...');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    console.log('\n📡 Response Status:', response.status, response.statusText);
    console.log('📦 Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    if (!response.ok) {
      console.error('❌ Authentication failed with error:', responseData);
      
      if (response.status === 403) {
        console.error('\n🔒 403 Forbidden: The credentials are invalid or the client application is not properly configured.');
        console.error('Please check the following:');
        console.error('1. The Client ID and Secret are correct');
        console.error('2. The application is enabled in the PingOne Admin Console');
        console.error('3. The application has the correct API scopes/permissions');
        console.error('4. The environment ID is correct');
      } else if (response.status === 400) {
        console.error('\n⚠️ 400 Bad Request: The request was malformed or missing required parameters');
        console.error('Please check the following:');
        console.error('1. The Client ID and Secret are correctly formatted');
        console.error('2. The environment ID is correctly formatted');
      }
      
      process.exit(1);
    }
    
    console.log('\n✅ Authentication successful!');
    console.log('🔑 Access Token:', responseData.access_token ? '***REDACTED***' : 'Not found');
    console.log('⏱️  Expires In:', responseData.expires_in ? `${responseData.expires_in} seconds` : 'Not specified');
    console.log('🔄 Token Type:', responseData.token_type || 'Not specified');
    
    return responseData;
  } catch (error) {
    console.error('\n❌ Error during authentication test:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS Lookup Failed: Could not resolve the authentication domain.');
      console.error('Please check your internet connection and verify the region is correct.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 Connection Refused: Could not connect to the authentication server.');
      console.error('Please check if the authentication URL is correct and the service is available.');
    }
    
    process.exit(1);
  }
}

// Run the test
testPingOneAuth();
