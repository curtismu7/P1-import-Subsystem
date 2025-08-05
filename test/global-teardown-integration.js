/**
 * Global teardown for integration tests
 */

export default async () => {
  console.log('\n🧹 Cleaning up integration test environment...');
  
  // Any global cleanup can go here
  // For now, just log completion
  
  console.log('✅ Integration test cleanup complete');
};