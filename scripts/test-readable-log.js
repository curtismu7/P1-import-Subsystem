// File: scripts/test-readable-log.js
// Description: Test script to verify readable.log creation and writing
// This script tests the Winston logger configuration to ensure readable.log is created

import { createWinstonLogger } from '../src/server/services/winston-config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');
const logsDir = path.join(projectRoot, 'logs');
const readableLogPath = path.join(logsDir, 'readable.log');

/**
 * Test readable.log creation and writing
 */
async function testReadableLog() {
  console.log('Testing readable.log creation and writing...');
  
  // Create logger
  const logger = createWinstonLogger({
    service: 'test-readable-log',
    env: 'development',
    enableFileLogging: true
  });
  
  // Write test messages
  console.log('Writing test messages to logs...');
  logger.info('Test info message for readable.log');
  logger.warn('Test warning message for readable.log');
  logger.error('Test error message for readable.log');
  logger.debug('Test debug message for readable.log');
  
  // Wait for file operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if readable.log exists
  const exists = fs.existsSync(readableLogPath);
  console.log(`readable.log exists: ${exists ? 'YES ✅' : 'NO ❌'}`);
  
  if (exists) {
    // Check file size
    const stats = fs.statSync(readableLogPath);
    console.log(`readable.log size: ${stats.size} bytes`);
    
    // Read last few lines
    const content = fs.readFileSync(readableLogPath, 'utf8');
    const lines = content.split('\n').slice(-20).join('\n');
    console.log('\nLast few lines of readable.log:');
    console.log('----------------------------------------');
    console.log(lines);
    console.log('----------------------------------------');
    
    return true;
  } else {
    console.error('❌ readable.log was not created!');
    return false;
  }
}

// Run the test
testReadableLog()
  .then(success => {
    if (success) {
      console.log('✅ readable.log test completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ readable.log test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
  });