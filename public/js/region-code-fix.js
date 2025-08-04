/**
 * Region Code Fix
 * 
 * This script ensures all API calls use standardized region codes (NA, EU, CA, AP)
 * instead of legacy region names (NorthAmerica, Europe, etc.)
 * 
 * Version: 7.0.0.13
 */
(function() {
  console.log('🔧 Region Code Fix: Initializing...');
  
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Function to standardize region code in a URL string
  function standardizeRegionInUrl(urlString) {
    if (urlString.includes('/api/pingone/') && urlString.includes('region=')) {
      // Replace legacy region names with standardized codes
      const standardized = urlString.replace('region=NorthAmerica', 'region=NA')
               .replace('region=Europe', 'region=EU')
               .replace('region=Canada', 'region=CA')
               .replace('region=AsiaPacific', 'region=AP');
               
      if (standardized !== urlString) {
        console.log('🔧 Region Code Fix: Standardized region code in URL:', standardized);
      }
      return standardized;
    }
    return urlString;
  }
  
  // Override the fetch function to intercept API calls
  window.fetch = function(resource, options) {
    // Handle string URLs
    if (typeof resource === 'string') {
      resource = standardizeRegionInUrl(resource);
    }
    // Handle Request objects
    else if (resource instanceof Request) {
      const url = new URL(resource.url);
      if (url.searchParams.has('region')) {
        const region = url.searchParams.get('region');
        if (region === 'NorthAmerica') url.searchParams.set('region', 'NA');
        if (region === 'Europe') url.searchParams.set('region', 'EU');
        if (region === 'Canada') url.searchParams.set('region', 'CA');
        if (region === 'AsiaPacific') url.searchParams.set('region', 'AP');
        
        // Create a new request with the modified URL
        resource = new Request(url.toString(), resource);
        console.log('🔧 Region Code Fix: Standardized region code in Request object:', url.toString());
      }
    }
    
    // Call the original fetch with possibly modified resource
    return originalFetch.call(this, resource, options);
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
