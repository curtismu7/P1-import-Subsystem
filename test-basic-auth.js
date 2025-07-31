import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

// Load environment variables
dotenv.config();

async function testBasicAuth() {
  console.log('🔍 Testing PingOne API with Basic Auth...');
  
  const credentials = {
    environmentId: process.env.PINGONE_ENVIRONMENT_ID || 'b9817c16-9910-4415-b67e-4ac687da74d9',
    clientId: process.env.PINGONE_CLIENT_ID || '26e7f07c-11a4-402a-b064-07b55aee189e',
    clientSecret: process.env.PINGONE_CLIENT_SECRET || '9p3hLItWFzw5BxKjH3.~TIGVPP~uj4os6fY93170dMvXadn1GEsWTP2lHSTAoevq',
    region: process.env.PINGONE_REGION || 'NorthAmerica'
  };

  console.log('\n🔑 Using Credentials:');
  console.log(`- Environment ID: ${credentials.environmentId}`);
  console.log(`- Client ID: ${credentials.clientId}`);
  console.log(`- Client Secret: ${credentials.clientSecret ? '***REDACTED***' : '❌ MISSING'}`);
  console.log(`- Region: ${credentials.region}`);

  // Get auth domain based on region
  const authDomain = {
    'NorthAmerica': 'auth.pingone.com',
    'Europe': 'auth.eu.pingone.com',
    'Canada': 'auth.ca.pingone.com',
    'Asia': 'auth.apsoutheast.pingone.com',
    'Australia': 'auth.aus.pingone.com',
    'US': 'auth.pingone.com',
    'EU': 'auth.eu.pingone.com',
    'AP': 'auth.apsoutheast.pingone.com'
  }[credentials.region] || 'auth.pingone.com';

  const tokenUrl = `https://${authDomain}/${credentials.environmentId}/as/token`; // Note: Using /token instead of /token.oauth2
  
  console.log('\n🌐 Using Token URL:', tokenUrl);

  // Create Basic Auth header
  const authHeader = 'Basic ' + Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  
  console.log('\n🔑 Using Authorization Header:', `Basic ${credentials.clientId}:***REDACTED***`);

  // Prepare form data
  const formData = new URLSearchParams();
  formData.append('grant_type', 'client_credentials');
  
  console.log('\n📤 Request Body:', formData.toString());
  console.log('\n🔍 Sending token request...');
  
  try {
    const startTime = Date.now();
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'PingOne-Import-Tool/1.0',
        'Cache-Control': 'no-cache'
      },
      body: formData.toString(),
      redirect: 'manual',
      timeout: 10000
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log('\n📡 Response Status:', response.status, response.statusText);
    console.log('⏱️  Response Time:', responseTime, 'ms');
    console.log('📦 Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('📄 Response Body:', JSON.stringify(responseData, null, 2));
      
      if (response.ok) {
        console.log('\n✅ Authentication successful!');
        console.log('🔑 Access Token:', responseData.access_token ? '***REDACTED***' : 'Not found');
        console.log('⏱️  Expires In:', responseData.expires_in ? `${responseData.expires_in} seconds` : 'Not specified');
        console.log('🔄 Token Type:', responseData.token_type || 'Not specified');
      } else {
        console.error('\n❌ Authentication failed with error:', responseData);
      }
    } catch (e) {
      console.error('\n⚠️  Failed to parse response as JSON:', responseText);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    console.error('\n🔍 Full Error:', error);
  }
}

// Run the test
testBasicAuth().catch(console.error);
