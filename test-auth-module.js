import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { initAuth, getAuth } from './src/auth/index.js';

// Load environment variables
dotenv.config();

async function testAuthModule() {
  console.log('🔍 Testing PingOne Auth Module...');

  try {
    // Initialize auth with environment variables
    const auth = initAuth({
      environmentId: process.env.PINGONE_ENVIRONMENT_ID,
      clientId: process.env.PINGONE_CLIENT_ID,
      clientSecret: process.env.PINGONE_CLIENT_SECRET,
      region: process.env.PINGONE_REGION || 'NorthAmerica',
    }, {
      autoRefresh: true,
      refreshThreshold: 300 // 5 minutes
    });

    console.log('✅ Auth module initialized');

    // Test getting a token
    console.log('\n🔑 Getting access token...');
    const token = await auth.getToken();
    console.log('✅ Successfully obtained access token');
    console.log('Token:', token ? '***REDACTED***' : 'No token received');

    // Test API request
    console.log('\n🌐 Testing API request to list populations...');
    try {
      const populations = await auth.apiRequest('GET', '/populations');
      console.log('✅ Successfully retrieved populations');
      console.log(`Found ${populations._embedded?.populations?.length || 0} populations`);
      
      if (populations._embedded?.populations?.length > 0) {
        console.log('First population:', {
          id: populations._embedded.populations[0].id,
          name: populations._embedded.populations[0].name
        });
      }
    } catch (error) {
      console.error('❌ Error making API request:', error.message);
      console.error('This might be due to missing API permissions for the client');
    }

    // Test token refresh
    console.log('\n🔄 Testing token refresh...');
    const newToken = await auth.refreshToken();
    console.log('✅ Successfully refreshed token');
    console.log('New token:', newToken ? '***REDACTED***' : 'No token received');

  } catch (error) {
    console.error('\n❌ Auth module test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAuthModule().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});
