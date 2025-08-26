#!/usr/bin/env node

// File: scripts/restart-server.js
// Description: Server restart script with port conflict resolution
//
// This script provides a robust way to restart the server by:
// - Checking for existing processes
// - Resolving port conflicts automatically
// - Providing clear feedback on the restart process
// - Supporting different restart modes

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import {
  isPortAvailable,
  getProcessesUsingPort,
  killProcessesUsingPort,
  checkPortStatus,
  resolvePortConflict
} from '../server/port-checker.js';

const execAsync = promisify(exec);

const DEFAULT_PORT = 4000;
const SERVER_SCRIPT = 'server.js';

/**
 * Get the current working directory
 */
function getCwd() {
  return process.cwd();
}

/**
 * Check if a process is running on a specific port
 */
async function isProcessRunning(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Kill all processes using a specific port
 */
async function killProcessesOnPort(port) {
  try {
    const processes = await getProcessesUsingPort(port);
    if (processes.length === 0) {
      console.log(`✅ No processes found on port ${port}`);
      return true;
    }

    console.log(`🔄 Found ${processes.length} process(es) on port ${port}:`);
    processes.forEach(process => {
      console.log(`   PID ${process.pid}: ${process.command}`);
    });

    const killed = await killProcessesUsingPort(port, true);
    if (killed) {
      console.log(`✅ Successfully killed processes on port ${port}`);
      return true;
    } else {
      console.log(`❌ Failed to kill processes on port ${port}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error killing processes on port ${port}:`, error.message);
    return false;
  }
}

/**
 * Wait for a port to become available
 */
async function waitForPortAvailable(port, timeout = 10000) {
  const startTime = Date.now();
  const interval = 500;

  while (Date.now() - startTime < timeout) {
    if (await isPortAvailable(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Start the server with port conflict resolution
 */
async function startServer(port = DEFAULT_PORT, options = {}) {
  const {
    autoKill = true,
    findAlternative = true,
    waitForPort = true
  } = options;

  console.log(`🚀 Starting server on port ${port}...`);

  // Check if port is available
  const portStatus = await checkPortStatus(port);

  if (!portStatus.isAvailable) {
    console.log(`\n⚠️  Port ${port} is not available`);
    console.log(portStatus.message);

    if (autoKill) {
      console.log(`\n🔄 Attempting to kill processes on port ${port}...`);
      const killed = await killProcessesOnPort(port);

      if (killed && waitForPort) {
        console.log(`⏳ Waiting for port ${port} to become available...`);
        const available = await waitForPortAvailable(port);

        if (!available) {
          console.log(`❌ Port ${port} is still not available after timeout`);
          if (findAlternative) {
            console.log('🔄 Looking for alternative port...');
            try {
              const alternativePort = await resolvePortConflict(port, {
                autoKill: false,
                findAlternative: true,
                maxAttempts: 5
              });
              console.log(`✅ Found alternative port: ${alternativePort}`);
              port = alternativePort;
            } catch (error) {
              console.log(`❌ Could not find alternative port: ${error.message}`);
              process.exit(1);
            }
          } else {
            process.exit(1);
          }
        } else {
          console.log(`✅ Port ${port} is now available`);
        }
      } else if (!killed) {
        if (findAlternative) {
          console.log('🔄 Looking for alternative port...');
          try {
            const alternativePort = await resolvePortConflict(port, {
              autoKill: false,
              findAlternative: true,
              maxAttempts: 5
            });
            console.log(`✅ Found alternative port: ${alternativePort}`);
            port = alternativePort;
          } catch (error) {
            console.log(`❌ Could not find alternative port: ${error.message}`);
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }
    } else if (findAlternative) {
      console.log('🔄 Looking for alternative port...');
      try {
        const alternativePort = await resolvePortConflict(port, {
          autoKill: false,
          findAlternative: true,
          maxAttempts: 5
        });
        console.log(`✅ Found alternative port: ${alternativePort}`);
        port = alternativePort;
      } catch (error) {
        console.log(`❌ Could not find alternative port: ${error.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } else {
    console.log(`✅ Port ${port} is available`);
  }

  // Start the server
  console.log(`\n🚀 Starting server on port ${port}...`);

  const serverProcess = spawn('node', [SERVER_SCRIPT], {
    cwd: getCwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString()
    }
  });

  serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
  });

  const healthCheckUrl = `http://localhost:${port}/api/health`;
  console.log(`🩺 Performing health check at ${healthCheckUrl}...`);
  await waitForServerReady(healthCheckUrl);

  return serverProcess;
}

/**
 * Wait for the server to be ready by polling the health check endpoint
 */
async function waitForServerReady(url, timeout = 30000) {
  const startTime = Date.now();
  const interval = 1000;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          console.log('✅ Server is healthy and ready!');
          return;
        }
      }
    } catch (error) {
      // Ignore connection errors and try again
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Server did not become ready in time.');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: DEFAULT_PORT,
    autoKill: true,
    findAlternative: true,
    waitForPort: true,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
    case '--port':
    case '-p':
      options.port = parseInt(args[++i]) || DEFAULT_PORT;
      break;
    case '--no-kill':
      options.autoKill = false;
      break;
    case '--no-alternative':
      options.findAlternative = false;
      break;
    case '--no-wait':
      options.waitForPort = false;
      break;
    case '--help':
    case '-h':
      options.help = true;
      break;
    }
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 Server Restart Script

Usage: node scripts/restart-server.js [options]

Options:
  --port, -p <number>     Port to use (default: ${DEFAULT_PORT})
  --no-kill              Don't automatically kill processes on port
  --no-alternative       Don't look for alternative ports
  --no-wait              Don't wait for port to become available
  --help, -h             Show this help message

Examples:
  node scripts/restart-server.js
  node scripts/restart-server.js --port 4001
  node scripts/restart-server.js --no-kill
  node scripts/restart-server.js --no-alternative

Features:
  ✅ Automatic port conflict detection
  ✅ Process killing with detailed feedback
  ✅ Alternative port finding
  ✅ Port availability waiting
  ✅ Clear status messages
`);
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🔄 Server Restart Script');
  console.log('='.repeat(50));
  console.log(`Port: ${options.port}`);
  console.log(`Auto-kill: ${options.autoKill ? 'Yes' : 'No'}`);
  console.log(`Find alternative: ${options.findAlternative ? 'Yes' : 'No'}`);
  console.log(`Wait for port: ${options.waitForPort ? 'Yes' : 'No'}`);
  console.log('='.repeat(50));

  try {
    await startServer(options.port, options);
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`❌ Script error: ${error.message}`);
    process.exit(1);
  });
}
