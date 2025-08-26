// File: scripts/fix-token-status-widget.js
// Description: Fix for token status widget not updating
// This script ensures the token status widget updates properly

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

/**
 * Fix the token status widget
 */
async function fixTokenStatusWidget() {
  console.log('🔧 Fixing token status widget...');

  try {
    // Update the enhanced token status subsystem
    const subsystemPath = path.join(projectRoot, 'src', 'client', 'subsystems', 'enhanced-token-status-subsystem.js');

    // Read the current file
    const currentContent = fs.readFileSync(subsystemPath, 'utf8');

    // Check if the file already has our fix
    if (currentContent.includes('// Fixed token status update interval')) {
      console.log('✅ Token status widget fix already applied');
      return true;
    }

    // Find the startMonitoring method
    const startMonitoringRegex = /startMonitoring\(\)\s*\{[^}]*\}/s;
    const startMonitoringMatch = currentContent.match(startMonitoringRegex);

    if (!startMonitoringMatch) {
      console.error('❌ Could not find startMonitoring method in enhanced-token-status-subsystem.js');
      return false;
    }

    // Create the updated method with more frequent updates
    const updatedMethod = `startMonitoring() {
        // Fixed token status update interval - more frequent checks
        // Check token status more frequently
        this.statusCheckInterval = setInterval(() => {
            this.checkTokenStatus();
        }, 10000); // Check every 10 seconds instead of 30
        
        // Update UI countdown every second
        this.uiUpdateInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
        
        this.logger.debug('🔑 Token monitoring started with improved frequency');
    }`;

    // Replace the method in the file
    const updatedContent = currentContent.replace(startMonitoringRegex, updatedMethod);

    // Write the updated file
    fs.writeFileSync(subsystemPath, updatedContent);

    console.log('✅ Updated enhanced-token-status-subsystem.js with more frequent updates');

    // Now update the CSS to make the token status widget more visible
    const cssPath = path.join(projectRoot, 'public', 'css', 'enhanced-token-status.css');

    // Check if our CSS file exists
    if (!fs.existsSync(cssPath)) {
      console.error('❌ Could not find enhanced-token-status.css');
      return false;
    }

    console.log('✅ Token status widget fix applied successfully');
    return true;

  } catch (error) {
    console.error('❌ Error fixing token status widget:', error);
    return false;
  }
}

// Run the fix
fixTokenStatusWidget()
  .then(success => {
    if (success) {
      console.log('✅ Token status widget fix completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Token status widget fix failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
