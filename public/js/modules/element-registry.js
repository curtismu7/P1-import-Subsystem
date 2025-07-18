// ElementRegistry: Centralized DOM element lookup utility
// Provides safe, memoized access to all required UI elements with logging for missing elements
// Usage: import { ElementRegistry } from './element-registry.js';

const elementCache = {};

function getElement(selector, description, required = true) {
  // Input validation
  if (!selector || typeof selector !== 'string') {
    console.error(`[ElementRegistry] Invalid selector provided: ${selector}`);
    return null;
  }
  
  // Security: Prevent potential XSS through selector injection
  // Allow valid attribute selectors with quotes but prevent script injection
  if (selector.includes('<') || selector.includes('>') || 
      (selector.includes('"') && !selector.includes('[') && !selector.includes(']')) ||
      (selector.includes("'") && !selector.includes('[') && !selector.includes(']'))) {
    console.error(`[ElementRegistry] Potentially unsafe selector detected: ${selector}`);
    return null;
  }
  
  // Check cache first
  if (elementCache[selector]) {
    return elementCache[selector];
  }
  
  try {
    const el = document.querySelector(selector);
    
    if (!el && required) {
      console.warn(`[ElementRegistry] Missing required element: ${description} (${selector})`);
    } else if (!el) {
      console.info(`[ElementRegistry] Optional element not found: ${description} (${selector})`);
    } else {
      // Validate element is still in DOM
      if (!document.contains(el)) {
        console.warn(`[ElementRegistry] Element found but not in DOM: ${description} (${selector})`);
        elementCache[selector] = null;
        return null;
      }
    }
    
    elementCache[selector] = el;
    return el;
  } catch (error) {
    console.error(`[ElementRegistry] Error finding element: ${description} (${selector})`, error);
    elementCache[selector] = null;
    return null;
  }
}

export const ElementRegistry = {
  // Main UI elements
  importButton: () => getElement('#import-btn', 'Import Button'),
  fileInput: () => getElement('#csv-file', 'File Input'),
  dashboardTab: () => getElement('#dashboard-tab', 'Dashboard Tab'),
  dragDropArea: () => getElement('#drag-drop-area', 'Drag-and-Drop Area', false),
  
  // Notification and progress containers
  notificationContainer: () => getElement('#notification-area', 'Notification Container'),
  progressContainer: () => getElement('#progress-container', 'Progress Container'),
  
  // Token and connection status elements
  tokenStatus: () => getElement('#token-status-indicator', 'Token Status'),
  connectionStatus: () => getElement('#connection-status', 'Connection Status'),
  currentTokenStatus: () => getElement('#current-token-status', 'Current Token Status'),
  homeTokenStatus: () => getElement('#home-token-status', 'Home Token Status'),
  
  // File handling elements
  fileInfo: () => getElement('#file-info', 'File Info'),
  previewContainer: () => getElement('#dashboard-preview', 'Preview Container'),
  fileInputLabel: () => getElement('label[for="csv-file"]', 'File Input Label'),
  deleteFileInput: () => getElement('#delete-csv-file', 'Delete File Input'),
  deleteFileInputLabel: () => getElement('label[for="delete-csv-file"]', 'Delete File Input Label'),
  modifyFileInput: () => getElement('#modify-csv-file', 'Modify File Input'),
  modifyFileInputLabel: () => getElement('label[for="modify-csv-file"]', 'Modify File Input Label'),
  
  // Population selection elements
  importPopulationSelect: () => getElement('#import-population-select', 'Import Population Select'),
  deletePopulationSelect: () => getElement('#delete-population-select', 'Delete Population Select'),
  modifyPopulationSelect: () => getElement('#modify-population-select', 'Modify Population Select'),
  dashboardPopulationSelect: () => getElement('#dashboard-population-select', 'Dashboard Population Select'),
  
  // Import buttons
  startImportBtn: () => getElement('#start-import', 'Start Import Button'),
  startImportBtnBottom: () => getElement('#bottom-start-import', 'Bottom Start Import Button'),
  
  // Settings elements
  settingsSaveStatus: () => getElement('#settings-save-status', 'Settings Save Status'),
  
  // Import status elements
  importStatus: () => getElement('#import-status', 'Import Status'),
  
  // Population checkboxes
  useDefaultPopulationCheckbox: () => getElement('#use-default-population', 'Use Default Population Checkbox'),
  useCsvPopulationIdCheckbox: () => getElement('#use-csv-population-id', 'Use CSV Population ID Checkbox'),
  
          // Get Token button
        getTokenBtn: () => getElement('#get-token-quick', 'Get Token Button'),
  
  // Population ID form field
  populationIdField: () => getElement('#population-id', 'Population ID Field'),
}; 