import fs from 'fs';
import path from 'path';

const logFile = 'logs/auth-monitor.log';
const logDir = path.dirname(logFile);

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created directory: ${logDir}`);
}

// Test writing to the log file
try {
  const timestamp = new Date().toISOString();
  const testMessage = `[${timestamp}] [TEST] This is a test log message\n`;
  
  fs.appendFileSync(logFile, testMessage);
  console.log(`Successfully wrote to: ${logFile}`);
  console.log(`File contents:\n${fs.readFileSync(logFile, 'utf8')}`);
} catch (error) {
  console.error('Error writing to log file:', error.message);
  console.error('Error details:', error);
  
  // Debug: Check directory permissions
  try {
    const stats = fs.statSync(logDir);
    console.log(`Directory permissions: 0${(stats.mode & 0o777).toString(8)}`);
  } catch (e) {
    console.error('Could not check directory stats:', e.message);
  }
}
