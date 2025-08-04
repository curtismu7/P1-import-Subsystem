/**
 * Region Code Fix
 * 
 * This script ensures all API calls use standardized region codes (NA, EU, CA, AP)
 * instead of legacy region names (NorthAmerica, Europe, etc.)
 * 
 * Version: 7.0.0.12
 */
(function() {
  console.log('🔧 Region Code Fix: Initializing...');
  
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Override the fetch function to intercept API calls
  window.fetch = function(url, options) {
    // Only process string URLs
    if (typeof url === 'string') {
      // Check if this is a call to an API endpoint with a region parameter
      if (url.includes('/api/pingone/') && url.includes('region=')) {
        // Replace legacy region names with standardized codes
        url = url.replace('region=NorthAmerica', 'region=NA')
                 .replace('region=Europe', 'region=EU')
                 .replace('region=Canada', 'region=CA')
                 .replace('region=AsiaPacific', 'region=AP');
                 
        console.log('🔧 Region Code Fix: Standardized region code in URL:', url);
      }
    }
    
    // Call the original fetch with possibly modified URL
    return originalFetch.apply(this, arguments);
  };
  
  // Also fix any global region variables
  if (window.pingoneRegion === 'NorthAmerica') window.pingoneRegion = 'NA';
  if (window.pingoneRegion === 'Europe') window.pingoneRegion = 'EU';
  if (window.pingoneRegion === 'Canada') window.pingoneRegion = 'CA';
  if (window.pingoneRegion === 'AsiaPacific') window.pingoneRegion = 'AP';
  
  // Fix localStorage region if needed
  const storedRegion = localStorage.getItem('pingoneRegion');
  if (storedRegion) {
    let standardizedRegion = storedRegion;
    
    // Convert legacy names to standardized codes
    if (storedRegion === 'NorthAmerica') standardizedRegion = 'NA';
    if (storedRegion === 'Europe') standardizedRegion = 'EU';
    if (storedRegion === 'Canada') standardizedRegion = 'CA';
    if (storedRegion === 'AsiaPacific') standardizedRegion = 'AP';
    
    // Update localStorage if needed
    if (standardizedRegion !== storedRegion) {
      console.log(`🔧 Region Code Fix: Converting localStorage region from ${storedRegion} to ${standardizedRegion}`);
      localStorage.setItem('pingoneRegion', standardizedRegion);
    }
  }
  
  console.log('🔧 Region Code Fix: Initialized');
})();
