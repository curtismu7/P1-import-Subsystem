/**
 * Region Mapper Utility
 * 
 * Provides consistent mapping between user-friendly region names and API region codes
 * - UI Display: Shows user-friendly names like "North America" or "Canada"
 * - API Calls: Uses standardized 2-letter codes like "NA" or "CA"
 * 
 * @version 1.0.0
 */

// Region mapping for display and API use
const REGION_MAPPING = {
  // Standard region codes (for API calls)
  'NA': {
    displayName: 'North America',
    apiCode: 'NA',
    legacyNames: ['NorthAmerica', 'North America', 'US', 'USA']
  },
  'EU': {
    displayName: 'Europe',
    apiCode: 'EU',
    legacyNames: ['Europe', 'EU Region']
  },
  'CA': {
    displayName: 'Canada',
    apiCode: 'CA',
    legacyNames: ['Canada']
  },
  'AP': {
    displayName: 'Asia Pacific',
    apiCode: 'AP',
    legacyNames: ['APAC', 'Asia Pacific', 'AsiaPacific', 'AP Region']
  }
};

/**
 * Converts any region format to the standardized API code
 * @param {string} region - Region in any format (code, name, legacy name)
 * @returns {string} - Standardized API code (NA, EU, CA, AP)
 */
export function toApiCode(region) {
  if (!region) return 'NA'; // Default to NA if no region provided
  
  // If it's already a standard code, return it
  if (REGION_MAPPING[region]) {
    return region;
  }
  
  // Normalize input for case-insensitive comparison
  const normalizedRegion = region.toLowerCase().replace(/[^a-z]/g, '');
  
  // Search through all mappings
  for (const [code, details] of Object.entries(REGION_MAPPING)) {
    // Check if it matches the display name
    if (details.displayName.toLowerCase().replace(/[^a-z]/g, '') === normalizedRegion) {
      return code;
    }
    
    // Check if it matches any legacy names
    if (details.legacyNames.some(name => 
      name.toLowerCase().replace(/[^a-z]/g, '') === normalizedRegion)) {
      return code;
    }
  }
  
  // If no match found, return default
  console.warn(`⚠️ Unknown region "${region}" - defaulting to NA`);
  return 'NA';
}

/**
 * Converts any region format to a user-friendly display name
 * @param {string} region - Region in any format (code, name, legacy name)
 * @returns {string} - User-friendly display name
 */
export function toDisplayName(region) {
  const apiCode = toApiCode(region);
  return REGION_MAPPING[apiCode].displayName;
}

/**
 * Gets all available regions for UI display
 * @returns {Array<{code: string, name: string}>} - Array of region objects with code and name
 */
export function getAllRegions() {
  return Object.entries(REGION_MAPPING).map(([code, details]) => ({
    code,
    name: details.displayName
  }));
}

/**
 * Validates if a region code is valid for API calls
 * @param {string} region - Region code to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidApiCode(region) {
  return !!REGION_MAPPING[region];
}

export default {
  toApiCode,
  toDisplayName,
  getAllRegions,
  isValidApiCode,
  REGION_MAPPING
};
