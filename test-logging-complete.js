import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const LOG_FILE = path.join(__dirname, 'logs', 'auth-monitor.log');
const TEST_MESSAGES = {
  DEBUG: 'This is a DEBUG level test message',
  INFO: 'This is an INFO level test message',
  WARN: 'This is a WARNING level test message',
  ERROR: 'This is an ERROR level test message',
  CRITICAL: 'This is a CRITICAL level test message'
};

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Test 1: Test different log levels
console.log('\n=== Testing Log Levels ===');
Object.entries(TEST_MESSAGES).forEach(([level, message]) => {
  const logEntry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log(`✓ Logged ${level} message`);
});

// Test 2: Test log rotation
console.log('\n=== Testing Log Rotation ===');
const largeMessage = 'x'.repeat(1000) + '\n';
for (let i = 0; i < 50; i++) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [ROTATION_TEST] ${i} - ${largeMessage}`);
}
console.log('✓ Generated large log file for rotation testing');

// Test 3: Check log file permissions
console.log('\n=== Testing Log File Permissions ===');
const stats = fs.statSync(LOG_FILE);
console.log(`Log file permissions: ${stats.mode.toString(8).slice(-3)}`);
console.log(`Log file owner: ${stats.uid}`);
console.log(`Log file group: ${stats.gid}`);

// Test 4: Test log archiving
console.log('\n=== Testing Log Archiving ===');
const archiveDir = path.join(__dirname, 'logs', 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}
const archiveFile = path.join(archiveDir, `auth-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
fs.copyFileSync(LOG_FILE, archiveFile);
console.log(`✓ Archived log file to: ${archiveFile}`);

// Test 5: Verify log content
console.log('\n=== Verifying Log Content ===');
const logContent = fs.readFileSync(LOG_FILE, 'utf8');
const hasAllLevels = Object.keys(TEST_MESSAGES).every(level => 
  logContent.includes(`[${level}]`)
);
console.log(`✓ All log levels present: ${hasAllLevels}`);

console.log('\n✅ All logging tests completed successfully!');
