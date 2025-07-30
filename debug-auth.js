import dotenv from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';
import { URLSearchParams } from 'url';

// Enable debug logging for all modules
process.env.DEBUG = 'pingone*';

// Load environment variables
dotenv.config();

async function testPingOneAuth() {
  console.log('🔍 Testing PingOne API Authentication...');
  
  // Explicitly get credentials from environment
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
  const getAuthDomain = (region) => ({
    'NorthAmerica': 'auth.pingone.com',
    'Europe': 'auth.eu.pingone.com',
    'Canada': 'auth.ca.pingone.com',
    'Asia': 'auth.apsoutheast.pingone.com',
    'Australia': 'auth.aus.pingone.com',
    'US': 'auth.pingone.com',
    'EU': 'auth.eu.pingone.com',
    'AP': 'auth.apsoutheast.pingone.com'
  })[region] || 'auth.pingone.com';

  const authDomain = getAuthDomain(credentials.region);
  const tokenUrl = `https://${authDomain}/${credentials.environmentId}/as/token.oauth2`;
  
  console.log('\n🌐 Using Token URL:', tokenUrl);

  // Prepare the request body
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', credentials.clientId);
  params.append('client_secret', credentials.clientSecret);

  console.log('\n📤 Request Body:');
  console.log(params.toString().replace(credentials.clientSecret, '***REDACTED***'));

  // Create a custom agent to capture the raw request
  const httpsAgent = new https.Agent({
    rejectUnauthorized: true,
    // Enable debug for the actual TLS handshake
    // This will show the full TLS handshake and request/response
    // Look for 'CLIENT_HANDSHAKE' and 'SERVER_HANDSHAKE' in the logs
    // and any certificate verification errors
    debug: true
  });

  console.log('\n🔍 Sending token request...');
  
  try {
    const startTime = Date.now();
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'PingOne-Import-Tool/1.0',
        'Cache-Control': 'no-cache',
        'Ping-Client-Id': credentials.clientId
      },
      body: params.toString(),
      agent: httpsAgent,
      // Disable redirects to see if we're being redirected
      redirect: 'manual',
      // Add timeout
      timeout: 10000 // 10 seconds
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
      console.error('Raw response:', responseText);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    
    if (error.code) console.error('Error Code:', error.code);
    if (error.type) console.error('Error Type:', error.type);
    
    // Log additional info for common error types
    if (error.code === 'ETIMEDOUT') {
      console.error('\n🔌 Connection timed out. Check your network connection and try again.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS lookup failed. Check your internet connection and the auth domain.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🚫 Connection refused. The server may be down or the port may be blocked.');
    } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      console.error('\n⚠️  SSL Certificate error. There may be an issue with the server\'s SSL certificate.');
    }
    
    // Log the full error for debugging
    console.error('\n🔍 Full Error:', error);
  }
}

// Run the test
testPingOneAuth().catch(error => {
  console.error('\n❌ Unhandled error in test:', error);
  process.exit(1);
});
