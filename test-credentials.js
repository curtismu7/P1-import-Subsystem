import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

async function testCredentials() {
  // Load .env file
  dotenv.config();
  
  // Get credentials from environment
  const envCredentials = {
    environmentId: process.env.PINGONE_ENVIRONMENT_ID,
    clientId: process.env.PINGONE_CLIENT_ID,
    clientSecret: process.env.PINGONE_CLIENT_SECRET ? '***REDACTED***' : undefined,
    region: process.env.PINGONE_REGION || 'NorthAmerica'
  };

  // Get credentials from settings file
  let fileCredentials = {};
  try {
    const settingsPath = path.resolve(process.cwd(), 'data/settings.json');
    const settingsFile = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(settingsFile);
    
    fileCredentials = {
      environmentId: settings.environmentId,
      clientId: settings.apiClientId,
      clientSecret: settings.apiSecret ? '***REDACTED***' : undefined,
      region: settings.region || 'NorthAmerica'
    };
  } catch (error) {
    console.error('Error reading settings file:', error.message);
  }

  console.log('Environment Variables:');
  console.log(JSON.stringify(envCredentials, null, 2));
  console.log('\nSettings File:');
  console.log(JSON.stringify(fileCredentials, null, 2));
  
  // Check if credentials are present
  const hasEnvCreds = envCredentials.environmentId && envCredentials.clientId && process.env.PINGONE_CLIENT_SECRET;
  const hasFileCreds = fileCredentials.environmentId && fileCredentials.clientId && fileCredentials.clientSecret;
  
  console.log('\nStatus:');
  console.log(`- Environment variables: ${hasEnvCreds ? '✅ Present' : '❌ Missing'}`);
  console.log(`- Settings file: ${hasFileCreds ? '✅ Present' : '❌ Missing'}`);
  
  if (!hasEnvCreds && !hasFileCreds) {
    console.error('\n❌ Error: No valid credentials found in any source!');
    process.exit(1);
  }
  
  return hasEnvCreds ? envCredentials : fileCredentials;
}

testCredentials().catch(console.error);
