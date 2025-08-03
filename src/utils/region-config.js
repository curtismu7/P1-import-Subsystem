/**
 * Region Configuration Utility
 * Provides centralized region management with clear precedence hierarchy
 * and validation for PingOne Import Tool
 */

/**
 * Valid PingOne regions with their mappings
 */
export const REGION_MAPPINGS = {
    // Standard region codes (preferred format)
    'NA': {
        code: 'NA',
        name: 'North America',
        authDomain: 'auth.pingone.com',
        apiDomain: 'api.pingone.com'
    },
    'EU': {
        code: 'EU', 
        name: 'Europe',
        authDomain: 'auth.pingone.eu',
        apiDomain: 'api.pingone.eu'
    },
    'AP': {
        code: 'AP',
        name: 'Asia Pacific', 
        authDomain: 'auth.pingone.asia',
        apiDomain: 'api.pingone.asia'
    },
    'CA': {
        code: 'CA',
        name: 'Canada',
        authDomain: 'auth.pingone.ca',
        apiDomain: 'api.pingone.ca'
    },
    
    // Legacy format mappings (for backward compatibility)
    'NorthAmerica': {
        code: 'NA',
        name: 'North America',
        authDomain: 'auth.pingone.com',
        apiDomain: 'api.pingone.com'
    },
    'Europe': {
        code: 'EU',
        name: 'Europe', 
        authDomain: 'auth.pingone.eu',
        apiDomain: 'api.pingone.eu'
    },
    'AsiaPacific': {
        code: 'AP',
        name: 'Asia Pacific',
        authDomain: 'auth.pingone.asia', 
        apiDomain: 'api.pingone.asia'
    },
    'Canada': {
        code: 'CA',
        name: 'Canada',
        authDomain: 'auth.pingone.ca',
        apiDomain: 'api.pingone.ca'
    }
};

/**
 * Default region code (preferred format)
 */
export const DEFAULT_REGION = 'NA';

/**
 * Valid region codes (preferred format)
 */
export const VALID_REGIONS = ['NA', 'EU', 'AP', 'CA'];

/**
 * Legacy region codes (for backward compatibility)
 */
export const LEGACY_REGIONS = ['NorthAmerica', 'Europe', 'AsiaPacific', 'Canada'];

/**
 * Get region configuration with clear precedence hierarchy:
 * 1. .env PINGONE_REGION
 * 2. localStorage 'pingone_region' 
 * 3. settings.json region
 * 4. fallback default 'NA'
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.settings - Settings object from settings.json
 * @param {string} options.envRegion - Region from environment variables
 * @param {string} options.storageRegion - Region from localStorage
 * @returns {Object} Region configuration with validation
 */
export function getRegionConfig(options = {}) {
    const { settings = {}, envRegion, storageRegion } = options;
    
    // Precedence hierarchy
    let region = envRegion || 
                 storageRegion || 
                 settings.region || 
                 DEFAULT_REGION;
    
    // Normalize region (convert legacy to standard format)
    region = normalizeRegion(region);
    
    // Validate region
    const isValid = validateRegion(region);
    if (!isValid) {
        console.warn(`⚠️ Invalid region '${region}', using default '${DEFAULT_REGION}'`);
        region = DEFAULT_REGION;
    }
    
    // Get region mapping
    const regionConfig = REGION_MAPPINGS[region];
    
    return {
        region: regionConfig.code,
        name: regionConfig.name,
        authDomain: regionConfig.authDomain,
        apiDomain: regionConfig.apiDomain,
        isValid,
        source: getRegionSource(options),
        precedence: {
            env: envRegion,
            localStorage: storageRegion, 
            settings: settings.region,
            default: DEFAULT_REGION
        }
    };
}

/**
 * Normalize region code from legacy format to standard format
 * @param {string} region - Region code to normalize
 * @returns {string} Normalized region code
 */
export function normalizeRegion(region) {
    if (!region) return DEFAULT_REGION;
    
    // If already in standard format, return as-is
    if (VALID_REGIONS.includes(region)) {
        return region;
    }
    
    // Convert legacy format to standard format
    const mapping = REGION_MAPPINGS[region];
    if (mapping) {
        return mapping.code;
    }
    
    // Fallback to default if unknown
    return DEFAULT_REGION;
}

/**
 * Validate region code
 * @param {string} region - Region code to validate
 * @returns {boolean} True if valid
 */
export function validateRegion(region) {
    return VALID_REGIONS.includes(region) || LEGACY_REGIONS.includes(region);
}

/**
 * Get auth domain for region
 * @param {string} region - Region code
 * @returns {string} Auth domain
 */
export function getAuthDomain(region) {
    const normalizedRegion = normalizeRegion(region);
    return REGION_MAPPINGS[normalizedRegion]?.authDomain || REGION_MAPPINGS[DEFAULT_REGION].authDomain;
}

/**
 * Get API domain for region  
 * @param {string} region - Region code
 * @returns {string} API domain
 */
export function getApiDomain(region) {
    const normalizedRegion = normalizeRegion(region);
    return REGION_MAPPINGS[normalizedRegion]?.apiDomain || REGION_MAPPINGS[DEFAULT_REGION].apiDomain;
}

/**
 * Determine the source of the region configuration
 * @param {Object} options - Configuration options
 * @returns {string} Source of region configuration
 */
function getRegionSource(options) {
    const { settings = {}, envRegion, storageRegion } = options;
    
    if (envRegion) return 'environment';
    if (storageRegion) return 'localStorage';
    if (settings.region) return 'settings.json';
    return 'default';
}

/**
 * Log region configuration for debugging
 * @param {Object} regionConfig - Region configuration object
 */
export function logRegionConfig(regionConfig) {
    console.log('🌍 Region Configuration:', {
        region: regionConfig.region,
        name: regionConfig.name,
        source: regionConfig.source,
        authDomain: regionConfig.authDomain,
        apiDomain: regionConfig.apiDomain,
        precedence: regionConfig.precedence
    });
    
    // Warning if using non-preferred source
    if (regionConfig.source !== 'environment') {
        console.warn(`⚠️ Region not set in .env file, using ${regionConfig.source} source`);
    }
    
    // Warning for mismatched regions
    const { precedence } = regionConfig;
    const sources = [precedence.env, precedence.localStorage, precedence.settings].filter(Boolean);
    const uniqueSources = [...new Set(sources.map(normalizeRegion))];
    
    if (uniqueSources.length > 1) {
        console.warn('⚠️ Region mismatch detected across sources:', precedence);
    }
}

/**
 * Update region in localStorage
 * @param {string} region - Region to store
 */
export function setRegionInStorage(region) {
    const normalizedRegion = normalizeRegion(region);
    if (validateRegion(normalizedRegion)) {
        localStorage.setItem('pingone_region', normalizedRegion);
        console.log(`✅ Region '${normalizedRegion}' saved to localStorage`);
    } else {
        console.error(`❌ Cannot save invalid region '${region}' to localStorage`);
    }
}

/**
 * Get region from localStorage
 * @returns {string|null} Region from localStorage or null
 */
export function getRegionFromStorage() {
    try {
        return localStorage.getItem('pingone_region');
    } catch (error) {
        console.warn('⚠️ Cannot access localStorage for region:', error.message);
        return null;
    }
}

/**
 * Clear region from localStorage
 */
export function clearRegionFromStorage() {
    try {
        localStorage.removeItem('pingone_region');
        console.log('✅ Region cleared from localStorage');
    } catch (error) {
        console.warn('⚠️ Cannot clear region from localStorage:', error.message);
    }
}
