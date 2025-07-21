/**
 * Import API Fix
 * 
 * This script fixes the import API endpoint issue by redirecting to the correct endpoint.
 */
(function() {
  console.log('🔧 Import API Fix: Initializing...');
  
  // Patch the fetch function to intercept calls to /api/import
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options) {
    // Check if this is a POST request to /api/import
    if (typeof url === 'string' && url === '/api/import' && options && options.method === 'POST') {
      console.log('🔧 Import API Fix: Redirecting /api/import to /api/import/start');
      
      // Redirect to the correct endpoint
      return originalFetch('/api/import/start', options);
    }
    
    // Otherwise, use the original fetch
    return originalFetch.apply(this, arguments);
  };
  
  console.log('🔧 Import API Fix: Initialized');
})();