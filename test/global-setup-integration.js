/**
 * Global setup for integration tests
 */

export default async () => {
  // Setup any global test configuration here
  console.log('Setting up global integration test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use random port for testing
  
  console.log('Global integration test setup complete');
};