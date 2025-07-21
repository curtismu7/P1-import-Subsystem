/**
 * Global setup for integration tests
 */

module.exports = async () => {
  console.log('🚀 Setting up integration test environment...');
  
  // Check if required environment variables are set
  const requiredEnvVars = [
    'PINGONE_CLIENT_ID',
    'PINGONE_CLIENT_SECRET', 
    'PINGONE_ENVIRONMENT_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Integration tests will be skipped - missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('');
    console.log('To run integration tests, set these environment variables:');
    console.log('export PINGONE_CLIENT_ID="your-client-id"');
    console.log('export PINGONE_CLIENT_SECRET="your-client-secret"');
    console.log('export PINGONE_ENVIRONMENT_ID="your-environment-id"');
    console.log('export PINGONE_REGION="NA"  # Optional, defaults to NA');
  } else {
    console.log('✅ All required environment variables are set');
    console.log(`   Environment ID: ${process.env.PINGONE_ENVIRONMENT_ID}`);
    console.log(`   Region: ${process.env.PINGONE_REGION || 'NA'}`);
  }
  
  console.log('🎯 Integration test setup complete\n');
};