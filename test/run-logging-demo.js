/**
 * Logging Demo Runner
 *
 * This script runs the logging demonstration to showcase
 * the enhanced logging features.
 */

import runLoggingDemo from './logging-demo.js';

// Set up error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the demonstration
async function main() {
  try {
    console.log('🚀 Starting enhanced logging demonstration');
    await runLoggingDemo();
    console.log('✅ Logging demonstration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running logging demonstration:', error);
    process.exit(1);
  }
}

main();
