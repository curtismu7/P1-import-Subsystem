#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Test environment variables
const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  PORT: '4001',
  JWT_SECRET: 'test-jwt-secret',
  TEST_DATABASE_URI: 'mongodb://localhost:27017/pingone-import-test',
  PINGONE_CLIENT_ID: 'test-client-id',
  PINGONE_CLIENT_SECRET: 'test-client-secret',
  PINGONE_ENVIRONMENT_ID: 'test-env-id',
  PINGONE_REGION: 'NorthAmerica',
  SESSION_SECRET: 'test-session-secret',
  ENABLE_ANALYTICS: 'false',
  TEST_MODE: 'true'
};

// Create test directory if it doesn't exist
const testDir = path.join(rootDir, 'test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
  console.log(chalk.green('✓ Created test directory'));
}

// Create .env.test file
const envPath = path.join(rootDir, '.env.test');
const envContent = Object.entries(testEnv)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(envPath, envContent);
console.log(chalk.green('✓ Created .env.test file'));

// Create test data directory
const testDataDir = path.join(testDir, 'data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
  console.log(chalk.green('✓ Created test data directory'));
}

// Create test mocks directory
const testMocksDir = path.join(testDir, 'mocks');
if (!fs.existsSync(testMocksDir)) {
  fs.mkdirSync(testMocksDir, { recursive: true });
  console.log(chalk.green('✓ Created test mocks directory'));
}

// Create test fixtures directory
const testFixturesDir = path.join(testDir, 'fixtures');
if (!fs.existsSync(testFixturesDir)) {
  fs.mkdirSync(testFixturesDir, { recursive: true });
  
  // Create sample test data
  const sampleUsers = [
    { id: 'user1', username: 'testuser1@example.com', status: 'ENABLED' },
    { id: 'user2', username: 'testuser2@example.com', status: 'ENABLED' }
  ];
  
  fs.writeFileSync(
    path.join(testFixturesDir, 'users.json'),
    JSON.stringify(sampleUsers, null, 2)
  );
  
  console.log(chalk.green('✓ Created test fixtures directory with sample data'));
}

console.log(chalk.green('\nTest environment setup complete!\n'));
console.log(chalk.blue('Next steps:'));
console.log('1. Run tests with: ', chalk.cyan('npm test'));
console.log('2. Run specific test suite: ', chalk.cyan('npm run test:unit'));
console.log('3. Run with coverage: ', chalk.cyan('npm run test:coverage'));

process.exit(0);
