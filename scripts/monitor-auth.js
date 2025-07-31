#!/usr/bin/env node

import HealthCheck from '../src/health/health-check.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { program } from 'commander';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON = join(__dirname, '../package.json');

// Parse command line arguments
program
  .version(JSON.parse(await readFile(PACKAGE_JSON, 'utf8')).version)
  .option('-i, --interval <seconds>', 'Check interval in seconds', '300')
  .option('-l, --log-file <path>', 'Path to log file', 'logs/auth-monitor.log')
  .option('-e, --email <address>', 'Email address for alerts')
  .parse(process.argv);

const options = program.opts();
const CHECK_INTERVAL = parseInt(options.interval, 10) * 1000; // Convert to ms

// Set up logging with simplified approach
let logStream = null;
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const logDir = path.dirname(options.logFile);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Create or append to log file
  logStream = fs.createWriteStream(options.logFile, { 
    flags: 'a',
    encoding: 'utf8'
  });
  
  // Handle stream errors
  logStream.on('error', (err) => {
    console.error('Log stream error:', err);
  });
  
  console.log(`Logging to: ${options.logFile}`);
} catch (error) {
  console.error('Failed to set up log file:', error.message);
  logStream = null;
}

// Log function that writes to both console and file
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Color console output
  let coloredMessage;
  switch (level) {
    case 'error':
      coloredMessage = chalk.red(logMessage);
      break;
    case 'warn':
      coloredMessage = chalk.yellow(logMessage);
      break;
    case 'success':
      coloredMessage = chalk.green(logMessage);
      break;
    default:
      coloredMessage = logMessage;
  }
  
  console.log(coloredMessage);
  
  // Write to log file
  if (logStream && logStream.writable) {
    try {
      logStream.write(`${logMessage}\n`);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }
}

// Send alert (placeholder for email/slack/webhook)
async function sendAlert(message, details) {
  log(`ALERT: ${message}`, 'error');
  log(`Details: ${JSON.stringify(details, null, 2)}`, 'error');
  
  // In a real implementation, you would send an email, Slack message, etc.
  if (options.email) {
    log(`Would send email to ${options.email} with message: ${message}`, 'info');
  }
}

// Format check results for display
function formatCheckResults(results) {
  let output = '\n' + chalk.bold('=== PingOne Authentication Health Check ===\n');
  
  Object.entries(results.checks).forEach(([name, check]) => {
    let status;
    switch (check.status) {
      case 'healthy':
        status = chalk.green('✓');
        break;
      case 'unhealthy':
        status = chalk.yellow('!');
        break;
      case 'critical':
        status = chalk.red('✗');
        break;
      default:
        status = chalk.gray('?');
    }
    
    output += `[${status}] ${chalk.bold(name)}: ${check.message}\n`;
    
    if (check.details) {
      output += `    ${JSON.stringify(check.details, null, 2).replace(/\n/g, '\n    ')}\n`;
    }
  });
  
  // Add overall status
  let statusText;
  switch (results.status) {
    case 'healthy':
      statusText = chalk.bgGreen.black(' HEALTHY ');
      break;
    case 'unhealthy':
      statusText = chalk.bgYellow.black(' UNHEALTHY ');
      break;
    case 'critical':
      statusText = chalk.bgRed.white(' CRITICAL ');
      break;
    default:
      statusText = chalk.bgGray.white(' UNKNOWN ');
  }
  
  output += `\nOverall Status: ${statusText}\n`;
  
  return output;
}

// Main monitoring loop
async function monitor() {
  log('Starting PingOne authentication monitor...', 'info');
  
  let consecutiveFailures = 0;
  let lastStatus = null;
  
  // Initial check
  await runCheck();
  
  // Set up interval for periodic checks
  const intervalId = setInterval(async () => {
    await runCheck();
  }, CHECK_INTERVAL);
  
  // Handle process termination
  process.on('SIGINT', async () => {
    clearInterval(intervalId);
    log('Monitoring stopped by user', 'info');
    if (logStream) {
      await logStream.end();
    }
    process.exit(0);
  });
  
  async function runCheck() {
    try {
      log('Running health check...', 'info');
      const results = await HealthCheck.runChecks();
      
      // Log results
      log(formatCheckResults(results));
      
      // Check for status changes
      if (lastStatus && lastStatus !== results.status) {
        log(`Status changed from ${lastStatus.toUpperCase()} to ${results.status.toUpperCase()}`, 'warn');
      }
      
      // Check for critical issues
      if (results.status === 'critical') {
        const criticalIssues = Object.entries(results.checks)
          .filter(([_, check]) => check.status === 'critical')
          .map(([name, check]) => `${name}: ${check.message}`);
        
        await sendAlert(
          `CRITICAL: PingOne authentication issues detected`,
          { issues: criticalIssues, details: results }
        );
        
        consecutiveFailures++;
        
        // If we have multiple consecutive critical failures, consider restarting the app
        if (consecutiveFailures >= 3) {
          log('Multiple consecutive critical failures detected. Consider restarting the application.', 'error');
          // In a real implementation, you might want to restart the app here
        }
      } else if (results.status === 'unhealthy') {
        const unhealthyIssues = Object.entries(results.checks)
          .filter(([_, check]) => check.status === 'unhealthy')
          .map(([name, check]) => `${name}: ${check.message}`);
        
        await sendAlert(
          `WARNING: PingOne authentication issues detected`,
          { issues: unhealthyIssues, details: results }
        );
        
        consecutiveFailures = 0; // Reset counter on recovery
      } else {
        log('All systems operational', 'success');
        consecutiveFailures = 0; // Reset counter on success
      }
      
      lastStatus = results.status;
      
    } catch (error) {
      log(`Error during health check: ${error.message}`, 'error');
      log(error.stack, 'error');
      
      consecutiveFailures++;
      
      if (consecutiveFailures >= 3) {
        await sendAlert(
          'CRITICAL: Failed to run health check multiple times',
          { error: error.message, stack: error.stack }
        );
      }
    }
  }
}

// Start monitoring
monitor().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  log(error.stack, 'error');
  process.exit(1);
});
