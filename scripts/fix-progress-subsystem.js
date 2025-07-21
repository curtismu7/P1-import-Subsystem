// File: scripts/fix-progress-subsystem.js
// Description: Fix for progress subsystem to support all operation types
// This script ensures the progress UI works for all operation types

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

/**
 * Fix the progress subsystem
 */
async function fixProgressSubsystem() {
  console.log('🔧 Fixing progress subsystem...');
  
  try {
    // Update the enhanced progress subsystem initialization in app.js
    const appPath = path.join(projectRoot, 'src', 'client', 'app.js');
    
    // Read the current file
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Check if the file already has our fix
    if (appContent.includes('// Fixed progress subsystem initialization')) {
      console.log('✅ Progress subsystem fix already applied to app.js');
    } else {
      // Find the enhanced progress subsystem initialization
      const progressInitRegex = /this\.enhancedProgressSubsystem = new EnhancedProgressSubsystem\([^;]*;/s;
      const progressInitMatch = appContent.match(progressInitRegex);
      
      if (!progressInitMatch) {
        console.error('❌ Could not find enhanced progress subsystem initialization in app.js');
        return false;
      }
      
      // Create the updated initialization with proper parameters
      const updatedInit = `// Fixed progress subsystem initialization
        this.enhancedProgressSubsystem = new EnhancedProgressSubsystem(
            this.logger.child({ subsystem: 'enhanced-progress' }),
            this.uiManager,
            this.eventBus,
            this.subsystems.realtimeManager
        );`;
      
      // Replace the initialization in the file
      const updatedAppContent = appContent.replace(progressInitRegex, updatedInit);
      
      // Write the updated file
      fs.writeFileSync(appPath, updatedAppContent);
      
      console.log('✅ Updated app.js with fixed progress subsystem initialization');
    }
    
    // Now create a CSS file for the enhanced progress UI
    const cssPath = path.join(projectRoot, 'public', 'css', 'enhanced-progress.css');
    
    // Create the CSS content
    const cssContent = `/**
 * Enhanced Progress UI Styles
 * 
 * Improved styling for progress UI with better colors and visual feedback
 */

.enhanced-progress {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    margin: 20px 0;
    overflow: hidden;
    border: 1px solid #e9ecef;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.enhanced-progress .progress-header {
    background: #f8f9fa;
    padding: 12px 16px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.enhanced-progress .progress-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #495057;
    display: flex;
    align-items: center;
    gap: 8px;
}

.enhanced-progress .progress-header h3 i {
    color: #007bff;
}

.enhanced-progress .close-progress-btn {
    background: none;
    border: none;
    color: #6c757d;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.enhanced-progress .close-progress-btn:hover {
    background: #e9ecef;
    color: #495057;
}

.enhanced-progress .progress-content {
    padding: 16px;
}

.enhanced-progress .progress-bar-container {
    margin-bottom: 16px;
    position: relative;
}

.enhanced-progress .progress-bar {
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.enhanced-progress .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #0056b3);
    border-radius: 4px;
    transition: width 0.3s ease;
    width: 0%;
}

.enhanced-progress .progress-percentage {
    position: absolute;
    right: 0;
    top: -20px;
    font-size: 12px;
    font-weight: 600;
    color: #495057;
}

.enhanced-progress .progress-status {
    margin-bottom: 16px;
}

.enhanced-progress .status-message {
    font-size: 14px;
    font-weight: 600;
    color: #212529;
    margin-bottom: 4px;
}

.enhanced-progress .progress-text {
    font-size: 13px;
    color: #6c757d;
    margin-bottom: 4px;
}

.enhanced-progress .status-details {
    font-size: 12px;
    color: #6c757d;
    font-style: italic;
}

.enhanced-progress .progress-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
    background: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
}

.enhanced-progress .stat-item {
    display: flex;
    flex-direction: column;
    min-width: 60px;
}

.enhanced-progress .stat-label {
    font-size: 11px;
    color: #6c757d;
    margin-bottom: 2px;
}

.enhanced-progress .stat-value {
    font-size: 14px;
    font-weight: 600;
    color: #212529;
}

.enhanced-progress .stat-value.success {
    color: #28a745;
}

.enhanced-progress .stat-value.failed {
    color: #dc3545;
}

.enhanced-progress .stat-value.skipped {
    color: #ffc107;
}

.enhanced-progress .progress-timing {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    font-size: 12px;
    color: #6c757d;
}

.enhanced-progress .time-elapsed,
.enhanced-progress .time-remaining {
    display: flex;
    align-items: center;
    gap: 4px;
}

.enhanced-progress .time-elapsed i,
.enhanced-progress .time-remaining i {
    font-size: 12px;
    color: #6c757d;
}

.enhanced-progress .elapsed-value,
.enhanced-progress .eta-value {
    font-weight: 600;
    color: #495057;
}

.enhanced-progress .progress-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

/* Operation-specific styling */

/* Import operation */
.enhanced-progress[id="import-progress-container"] .progress-bar-fill {
    background: linear-gradient(90deg, #007bff, #0056b3);
}

.enhanced-progress[id="import-progress-container"] .progress-header h3 i {
    color: #007bff;
}

/* Export operation */
.enhanced-progress[id="export-progress-container"] .progress-bar-fill {
    background: linear-gradient(90deg, #28a745, #20c997);
}

.enhanced-progress[id="export-progress-container"] .progress-header h3 i {
    color: #28a745;
}

/* Delete operation */
.enhanced-progress[id="delete-progress-container"] .progress-bar-fill {
    background: linear-gradient(90deg, #dc3545, #c82333);
}

.enhanced-progress[id="delete-progress-container"] .progress-header h3 i {
    color: #dc3545;
}

/* Modify operation */
.enhanced-progress[id="modify-progress-container"] .progress-bar-fill {
    background: linear-gradient(90deg, #fd7e14, #e65c00);
}

.enhanced-progress[id="modify-progress-container"] .progress-header h3 i {
    color: #fd7e14;
}

/* Responsive design */
@media (max-width: 768px) {
    .enhanced-progress .progress-header {
        padding: 10px 12px;
    }
    
    .enhanced-progress .progress-header h3 {
        font-size: 14px;
    }
    
    .enhanced-progress .progress-content {
        padding: 12px;
    }
    
    .enhanced-progress .progress-stats {
        gap: 8px;
        padding: 8px;
    }
    
    .enhanced-progress .stat-item {
        min-width: 50px;
    }
    
    .enhanced-progress .stat-label {
        font-size: 10px;
    }
    
    .enhanced-progress .stat-value {
        font-size: 12px;
    }
}

/* Animation for loading state */
@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Accessibility focus styles */
.enhanced-progress .close-progress-btn:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
}

/* Print styles */
@media print {
    .enhanced-progress {
        box-shadow: none;
        border: 1px solid #000;
    }
    
    .enhanced-progress .progress-actions {
        display: none;
    }
}`;
    
    // Write the CSS file
    fs.writeFileSync(cssPath, cssContent);
    
    console.log('✅ Created enhanced-progress.css');
    
    // Update the index.html to include the new CSS file
    const indexPath = path.join(projectRoot, 'public', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check if the CSS is already included
    if (indexContent.includes('enhanced-progress.css')) {
      console.log('✅ Enhanced progress CSS already included in index.html');
    } else {
      // Find the position to insert the CSS link
      const insertPosition = indexContent.indexOf('<!-- Progress UI CSS -->');
      
      if (insertPosition === -1) {
        console.error('❌ Could not find position to insert CSS link in index.html');
        return false;
      }
      
      // Create the updated content with the new CSS link
      const updatedIndexContent = indexContent.slice(0, insertPosition + 23) + 
        '\n    <link rel="stylesheet" href="/css/enhanced-progress.css">' + 
        indexContent.slice(insertPosition + 23);
      
      // Write the updated file
      fs.writeFileSync(indexPath, updatedIndexContent);
      
      console.log('✅ Updated index.html to include enhanced-progress.css');
    }
    
    console.log('✅ Progress subsystem fix applied successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing progress subsystem:', error);
    return false;
  }
}

// Run the fix
fixProgressSubsystem()
  .then(success => {
    if (success) {
      console.log('✅ Progress subsystem fix completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Progress subsystem fix failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });