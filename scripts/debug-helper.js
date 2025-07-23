#!/usr/bin/env node

/**
 * Debug Helper Script
 * 
 * Comprehensive debugging utility for the PingOne Import Tool.
 * Provides various debugging commands and utilities.
 */

import { debugLog, perfMonitor, errorTracker, DEBUG_CATEGORIES } from '../src/shared/debug-utils.js';
import configManager from '../src/shared/config-manager.js';

const COMMANDS = {
  'config': 'Show current configuration',
  'stats': 'Show debug statistics',
  'memory': 'Show memory usage',
  'errors': 'Show error statistics',
  'test-logging': 'Test logging functionality',
  'clear-stats': 'Clear debug statistics',
  'health': 'Show application health'
};

class DebugHelper {
  constructor() {
    this.command = process.argv[2];
    this.args = process.argv.slice(3);
  }
  
  async run() {
    if (!this.command || this.command === 'help') {
      this.showHelp();
      return;
    }
    
    try {
      await configManager.init();
      
      switch (this.command) {
        case 'config':
          this.showConfig();
          break;
        case 'stats':
          this.showStats();
          break;
        case 'memory':
          this.showMemory();
          break;
        case 'errors':
          this.showErrors();
          break;
        case 'test-logging':
          this.testLogging();
          break;
        case 'clear-stats':
          this.clearStats();
          break;
        case 'health':
          await this.showHealth();
          break;
        default:
          console.log(`Unknown command: ${this.command}`);
          this.showHelp();
      }
    } catch (error) {
      console.error('Debug helper failed:', error.message);
      process.exit(1);
    }
  }
  
  showHelp() {
    console.log('🐛 Debug Helper - PingOne Import Tool\n');
    console.log('Usage: node scripts/debug-helper.js <command>\n');
    console.log('Available commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(15)} - ${desc}`);
    });
    console.log('\nExamples:');
    console.log('  node scripts/debug-helper.js config');
    console.log('  node scripts/debug-helper.js stats');
    console.log('  node scripts/debug-helper.js test-logging');
  }
} 
 
  showConfig() {
    console.log('📋 Current Configuration:\n');
    const config = configManager.getSanitized();
    console.log(JSON.stringify(config, null, 2));
  }
  
  showStats() {
    console.log('📊 Debug Statistics:\n');
    const stats = errorTracker.stats();
    console.log(JSON.stringify(stats, null, 2));
  }
  
  showMemory() {
    console.log('💾 Memory Usage:\n');
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    
    console.log(`RSS:         ${formatBytes(memUsage.rss)}`);
    console.log(`Heap Total:  ${formatBytes(memUsage.heapTotal)}`);
    console.log(`Heap Used:   ${formatBytes(memUsage.heapUsed)}`);
    console.log(`External:    ${formatBytes(memUsage.external)}`);
    console.log(`Heap Usage:  ${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`);
  }
  
  showErrors() {
    console.log('❌ Error Statistics:\n');
    const stats = errorTracker.stats();
    
    if (Object.keys(stats.errorCounts).length === 0) {
      console.log('No errors recorded.');
      return;
    }
    
    Object.entries(stats.errorCounts).forEach(([error, count]) => {
      console.log(`${error}: ${count} occurrences`);
    });
  }
  
  testLogging() {
    console.log('🧪 Testing logging functionality...\n');
    
    debugLog.trace('This is a trace message', { test: true }, DEBUG_CATEGORIES.API);
    debugLog.debug('This is a debug message', { test: true }, DEBUG_CATEGORIES.API);
    debugLog.info('This is an info message', { test: true }, DEBUG_CATEGORIES.API);
    debugLog.warn('This is a warning message', { test: true }, DEBUG_CATEGORIES.API);
    debugLog.error('This is an error message', { test: true }, DEBUG_CATEGORIES.API);
    
    console.log('Logging test completed. Check logs for output.');
  }
  
  clearStats() {
    errorTracker.reset();
    console.log('✅ Debug statistics cleared.');
  }
  
  async showHealth() {
    console.log('🏥 Application Health:\n');
    
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: configManager.isInitialized ? 'initialized' : 'not initialized',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    };
    
    console.log(JSON.stringify(health, null, 2));
  }
}

// Run the debug helper
const helper = new DebugHelper();
helper.run().catch(console.error);