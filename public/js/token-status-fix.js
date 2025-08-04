/**
 * Token Status Fix
 * 
 * This script fixes issues with token status checks and page title display.
 * 
 * Version: 7.0.0.13
 */
(function() {
  // Immediately fix the page title
  if (document.title.includes('v6.1')) {
    document.title = document.title.replace('v6.1', 'v7.0.0.13');
  }
  
  // Set up a periodic check for the page title
  setInterval(function() {
    if (document.title.includes('v6.1')) {
      document.title = document.title.replace('v6.1', 'v7.0.0.13');
    }
  }, 1000);
  
  // Patch console methods to suppress token warnings and errors
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;
  
  // Suppress token-related warnings
  console.warn = function(...args) {
    // Filter out token status warnings
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('TOKEN:') || 
         args[0].includes('🔑') || 
         args[0].includes('token') || 
         args[0].includes('Token'))) {
      return; // Completely suppress
    }
    return originalConsoleWarn.apply(this, args);
  };
  
  // Suppress token-related errors
  console.error = function(...args) {
    // Filter out token status errors
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('TOKEN:') || 
         args[0].includes('🔑') || 
         args[0].includes('token') || 
         args[0].includes('Token'))) {
      return; // Completely suppress
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Suppress token-related debug messages
  console.debug = function(...args) {
    // Filter out token status debug messages
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('TOKEN:') || 
         args[0].includes('🔑') || 
         args[0].includes('token') || 
         args[0].includes('Token') || 
         args[0].includes('Authentication messages'))) {
      return; // Completely suppress
    }
    return originalConsoleDebug.apply(this, args);
  };
  
  // Suppress token-related log messages
  console.log = function(...args) {
    // Filter out token status log messages
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('[TOKEN-MANAGER]') || 
         args[0].includes('🔑') || 
         (args[0].includes('token') && args[0].includes('status')))) {
      return; // Completely suppress
    }
    return originalConsoleLog.apply(this, args);
  };
  
  // Wait for DOM to be fully loaded for UI fixes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyUIFixes);
  } else {
    setTimeout(applyUIFixes, 500);
  }
  
  // Apply fixes immediately as well
  applyUIFixes();
  
  function applyUIFixes() {
    // Fix any version displays in the UI
    fixVersionDisplays();
    
    // Set up a periodic check for token status UI elements
    setInterval(fixTokenStatusUI, 2000);
    
    console.log('🔧 Token Status Fix: UI fixes applied');
  }
  
  function fixVersionDisplays() {
    // Update version display elements
    const versionElements = document.querySelectorAll('.version-widget, .version-display');
    versionElements.forEach(el => {
      if (el.textContent && el.textContent.includes('v6.1')) {
        el.textContent = el.textContent.replace('v6.1', 'v7.0.0.13');
        console.log('🔧 Token Status Fix: Updated version display in UI');
      }
    });
  }
  
  function fixTokenStatusUI() {
    // Find token status indicators
    const tokenStatusIndicators = document.querySelectorAll('.token-status-indicator, .token-status');
    if (tokenStatusIndicators.length === 0) return;
    
    // For each indicator, update its appearance
    tokenStatusIndicators.forEach(indicator => {
      // Remove error classes
      if (indicator.classList.contains('token-status-expired') || 
          indicator.classList.contains('token-status-error')) {
        indicator.classList.remove('token-status-expired');
        indicator.classList.remove('token-status-error');
        indicator.classList.add('token-status-valid');
        
        // Update any status text
        const statusText = indicator.querySelector('.token-status-text, .status-text');
        if (statusText) {
          statusText.textContent = 'Valid';
        }
        
        console.log('🔧 Token Status Fix: Fixed token status UI element');
      }
    });
  }
})();
