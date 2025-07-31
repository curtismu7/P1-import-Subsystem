// Simple test script to verify the authentication module
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the auth module directly
const authModule = await import('./src/auth/index.js');
const { initAuth } = authModule;

async function testAuth() {
  console.log('🔍 Testing PingOne Authentication...');

  try {
    // Get credentials from environment
    const config = {
      environmentId: process.env.PINGONE_ENVIRONMENT_ID,
      clientId: process.env.PINGONE_CLIENT_ID,
      clientSecret: process.env.PINGONE_CLIENT_SECRET,
      region: process.env.PINGONE_REGION || 'NorthAmerica'
    };

    console.log('\n🔑 Using Configuration:');
    console.log('- Environment ID:', config.environmentId);
    console.log('- Client ID:', config.clientId);
    console.log('- Region:', config.region);

    // Initialize auth
    console.log('\n🚀 Initializing auth...');
    const auth = initAuth(config);
    console.log('✅ Auth initialized');

    // Get token
    console.log('\n🔑 Getting token...');
    const token = await auth.getToken();
    console.log('✅ Token received');
    console.log('Token:', token ? '***REDACTED***' : 'No token');

    // Test API request
    console.log('\n🌐 Testing API request...');
    try {
      const result = await auth.apiRequest('GET', '/populations');
      console.log('✅ API request successful');
      console.log(`Found ${result._embedded?.populations?.length || 0} populations`);
    } catch (apiError) {
      console.error('❌ API request failed:', apiError.message);
      console.log('This might be expected if the client lacks permissions');
    }

    console.log('\n🎉 Authentication test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAuth().catch(console.error);
