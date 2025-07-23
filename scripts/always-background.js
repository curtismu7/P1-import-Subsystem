#!/usr/bin/env node

/**
 * Always Background Starter
 * 
 * This script ensures the server always starts in background mode
 * by intercepting the standard start command and redirecting to
 * the background start process.
 * 
 * It serves as a wrapper around the start-background.js script
 * to make background mode the default behavior.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

/**
 * Main function to start the server in background mode
 */
async function startInBackground() {
  console.log(`${colors.blue}🚀 PingOne Import Tool - Always Background Mode${colors.reset}`);
  console.log('==================================================');
  console.log('');
  
  // Check if --foreground flag is provided
  const args = process.argv.slice(2);
  if (args.includes('--foreground')) {
    console.log(`${colors.yellow}⚠️ Foreground mode requested - starting in standard mode${colors.reset}`);
    startInForeground();
    return;
  }
  
  console.log(`${colors.blue}Starting server in background mode...${colors.reset}`);
  
  // Path to the background starter script
  const backgroundScript = path.join(__dirname, 'start-background.js');
  
  // Start the background process
  const backgroundProcess = spawn('node', [
    backgroundScript,
    'start'
  ], {
    stdio: 'inherit'
  });
  
  // Handle process events
  backgroundProcess.on('error', (error) => {
    console.error(`${colors.red}❌ Failed to start background process:${colors.reset}`, error.message);
    process.exit(1);
  });
  
  backgroundProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}❌ Background process exited with code ${code}${colors.reset}`);
      process.exit(code);
    }
  });
}

/**
 * Start the server in foreground mode (standard behavior)
 */
function startInForeground() {
  console.log(`${colors.blue}Starting server in foreground mode...${colors.reset}`);
  
  // Path to the server script
  const serverScript = path.join(process.cwd(), 'server.js');
  
  // Start the server process
  const serverProcess = spawn('node', [
    '--experimental-modules',
    '--experimental-json-modules',
    serverScript
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      FOREGROUND_MODE: 'true'
    }
  });
  
  // Handle process events
  serverProcess.on('error', (error) => {
    console.error(`${colors.red}❌ Failed to start server:${colors.reset}`, error.message);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    process.exit(code);
  });
}

// Run the main function
startInBackground().catch(error => {
  console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error.message);
  process.exit(1);
});