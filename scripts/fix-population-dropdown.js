// File: scripts/fix-population-dropdown.js
// Description: Fixes population dropdown loading issues
// This script ensures that population dropdowns are properly populated across all views

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

/**
 * Create a client-side script to fix population dropdowns
 */
function createPopulationDropdownFix() {
  console.log('Creating population dropdown fix script...');
  
  const scriptContent = `
/**
 * Population Dropdown Fix
 * 
 * This script ensures that population dropdowns are properly populated across all views.
 * It runs after the page loads and checks all population dropdowns, loading data if needed.
 */
(function() {
  // Configuration
  const DROPDOWN_IDS = [
    'import-population-select',
    'export-population-select',
    'delete-population-select',
    'modify-population-select'
  ];
  
  // Debug mode - set to false to reduce console logs
  const DEBUG = false;
  
  // Log function that only logs when debug is enabled
  function log(message, ...args) {
    if (DEBUG) {
      console.log(message, ...args);
    }
  }
  
  log('🔧 Population Dropdown Fix: Initializing...');
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeDropdownFix);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeDropdownFix, 100);
  }
  
  /**
   * Initialize the dropdown fix
   */
  function initializeDropdownFix() {
    log('🔧 Population Dropdown Fix: Initialized');
    
    // Check dropdowns immediately
    checkDropdowns();
    
    // Set up periodic checks - less frequent to reduce noise
    setInterval(checkDropdowns, 30000);
    
    // Listen for view changes
    document.addEventListener('view-changed', checkDropdowns);
    
    // Listen for navigation events
    document.querySelectorAll('.nav-item, .feature-card').forEach(item => {
      item.addEventListener('click', () => {
        setTimeout(checkDropdowns, 500);
      });
    });
  }
  
  /**
   * Check all population dropdowns and load data if needed
   */
  function checkDropdowns() {
    log('🔧 Population Dropdown Fix: Checking dropdowns...');
    
    DROPDOWN_IDS.forEach(id => {
      const dropdown = document.getElementById(id);
      if (!dropdown) return;
      
      log(\`🔧 Population Dropdown Fix: Checking \${id}...\`);
      
      // Check if dropdown needs population data
      if (dropdown.options.length <= 1 || dropdown.options[0].text.includes('Loading') || dropdown.options[0].text.includes('Error')) {
        log(\`🔧 Population Dropdown Fix: \${id} needs population data\`);
        loadPopulationsForDropdown(id);
      } else {
        log(\`🔧 Population Dropdown Fix: \${id} already has \${dropdown.options.length} options\`);
      }
    });
  }
  
  /**
   * Load populations for a specific dropdown
   */
  async function loadPopulationsForDropdown(dropdownId) {
    try {
      log(\`🔧 Population Dropdown Fix: Loading populations for \${dropdownId}...\`);
      
      // Fetch populations from API
      const response = await fetch('/api/pingone/populations');
      if (!response.ok) {
        throw new Error(\`Failed to load populations: \${response.status} \${response.statusText}\`);
      }
      
      const data = await response.json();
      
      // Extract populations from response
      let populations = [];
      if (data._embedded && data._embedded.populations) {
        populations = data._embedded.populations;
      } else if (Array.isArray(data.populations)) {
        populations = data.populations;
      } else if (Array.isArray(data)) {
        populations = data;
      }
      
      log(\`🔧 Population Dropdown Fix: Loaded \${populations.length} populations\`);
      
      // Populate the dropdown
      populateDropdown(dropdownId, populations);
      
    } catch (error) {
      console.error(\`🔧 Population Dropdown Fix: Error loading populations for \${dropdownId}\`, error);
      
      // Show error in dropdown
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.innerHTML = \`<option value="">Error loading populations: \${error.message}</option>\`;
      }
    }
  }
  
  /**
   * Populate a dropdown with populations
   */
  function populateDropdown(dropdownId, populations) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select a population';
    dropdown.appendChild(emptyOption);
    
    // Add population options
    populations.forEach(population => {
      const option = document.createElement('option');
      option.value = population.id;
      option.textContent = population.name;
      option.dataset.populationId = population.id;
      option.dataset.populationName = population.name;
      dropdown.appendChild(option);
    });
    
    log(\`🔧 Population Dropdown Fix: Successfully populated \${dropdownId}\`);
    
    // Trigger change event to update any dependent UI
    const event = new Event('change');
    dropdown.dispatchEvent(event);
  }
})();
`;

  // Write the script to the public/js directory
  const outputPath = path.join(projectRoot, 'public', 'js', 'population-dropdown-fix.js');
  fs.writeFileSync(outputPath, scriptContent);
  
  console.log(`Population dropdown fix script created at: ${outputPath}`);
  
  return outputPath;
}

/**
 * Update index.html to include the population dropdown fix script
 */
function updateIndexHtml(scriptPath) {
  const indexPath = path.join(projectRoot, 'public', 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check if the script is already included
  if (indexContent.includes('population-dropdown-fix.js')) {
    console.log('Script already included in index.html');
    return;
  }
  
  // Find the position to insert the script tag (before the closing body tag)
  const insertPosition = indexContent.lastIndexOf('</body>');
  if (insertPosition === -1) {
    throw new Error('Could not find </body> tag in index.html');
  }
  
  // Create the script tag
  const scriptTag = `
    <!-- Population Dropdown Fix Script -->
    <script src="/js/population-dropdown-fix.js"></script>
`;
  
  // Insert the script tag
  const updatedContent = indexContent.slice(0, insertPosition) + scriptTag + indexContent.slice(insertPosition);
  
  // Write the updated content back to index.html
  fs.writeFileSync(indexPath, updatedContent);
  
  console.log('Updated index.html to include the population dropdown fix script');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting population dropdown fix...');
    
    // Create the population dropdown fix script
    const scriptPath = createPopulationDropdownFix();
    
    // Update index.html to include the script
    updateIndexHtml(scriptPath);
    
    console.log('Population dropdown fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing population dropdown:', error);
  }
}

// Run the main function
main();