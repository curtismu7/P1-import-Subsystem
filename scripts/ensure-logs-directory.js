// File: scripts/ensure-logs-directory.js
// Description: Ensures the logs directory exists and has proper permissions
// This script runs at server startup to prevent logging issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory (2 levels up from scripts/)
const projectRoot = path.resolve(__dirname, '../');
const logsDir = path.join(projectRoot, 'logs');

/**
 * Ensures the logs directory exists and has proper permissions
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function ensureLogsDirectory() {
  try {
    console.log(`Ensuring logs directory exists: ${logsDir}`);
    
    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      console.log('Logs directory does not exist, creating it...');
      fs.mkdirSync(logsDir, { recursive: true });
      console.log('Logs directory created successfully');
    }
    
    // Check if logs directory is writable
    try {
      const testFile = path.join(logsDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('Logs directory is writable');
    } catch (writeError) {
      console.error('Logs directory is not writable:', writeError.message);
      return false;
    }
    
    // Create an empty readable.log file if it doesn't exist
    const readableLogPath = path.join(logsDir, 'readable.log');
    if (!fs.existsSync(readableLogPath)) {
      console.log('Creating empty readable.log file');
      fs.writeFileSync(readableLogPath, '');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to ensure logs directory:', error.message);
    return false;
  }
}

// Run the function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureLogsDirectory()
    .then(success => {
      if (success) {
        console.log('Logs directory setup completed successfully');
        process.exit(0);
      } else {
        console.error('Failed to set up logs directory');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error setting up logs directory:', error);
      process.exit(1);
    });
}