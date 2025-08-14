import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRegionConfig, normalizeRegion, validateRegion, DEFAULT_REGION } from '../../src/utils/region-config.js';
import { STANDARD_KEYS, standardizeConfigKeys, createBackwardCompatibleConfig, migrateConfigurationFile } from '../../src/utils/config-standardization.js';
import { asyncHandler } from '../../server/middleware/error-handler.js';
import { validateBody, schemas } from '../../server/middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

/**
 * Validate PingOne credentials
 * @param {Object} credentials - Credentials to validate
 * @returns {Object} Validation result
 */
function validateCredentials(credentials) {
    const errors = [];
    const warnings = [];
    
    // Validate environment ID (UUID format)
    if (!credentials[STANDARD_KEYS.ENVIRONMENT_ID]) {
        errors.push('Environment ID is required');
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials[STANDARD_KEYS.ENVIRONMENT_ID])) {
        errors.push('Environment ID must be a valid UUID format');
    }
    
    // Validate client ID (UUID format)
    if (!credentials[STANDARD_KEYS.CLIENT_ID]) {
        errors.push('Client ID is required');
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials[STANDARD_KEYS.CLIENT_ID])) {
        errors.push('Client ID must be a valid UUID format');
    }
    
    // Validate client secret (non-empty, alphanumeric with special chars)
    if (!credentials[STANDARD_KEYS.CLIENT_SECRET]) {
        errors.push('Client Secret is required');
    } else {
        const secret = credentials[STANDARD_KEYS.CLIENT_SECRET];
        if (secret.length < 10) {
            errors.push('Client Secret must be at least 10 characters long');
        }
        if (!/^[A-Za-z0-9.~_-]+$/.test(secret)) {
            warnings.push('Client Secret contains unusual characters - ensure it\'s valid');
        }
    }
    
    // Validate region
    if (!credentials[STANDARD_KEYS.REGION]) {
        warnings.push('Region not specified, will use default');
    } else if (!validateRegion(credentials[STANDARD_KEYS.REGION])) {
        errors.push('Invalid region specified');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        hasWarnings: warnings.length > 0
    };
}

/**
 * Clean and de-duplicate settings by removing legacy keys
 * @param {Object} settings - Settings object to clean
 * @returns {Object} Cleaned settings with only standard keys
 */
function cleanAndDeduplicateSettings(settings) {
    const standardized = standardizeConfigKeys(settings, {
        logLegacyUsage: true,
        preserveLegacyKeys: false // Remove legacy keys
    });
    
    // Keep only standard keys and application preferences
    const cleaned = {
        // PingOne credentials (standard keys only)
        [STANDARD_KEYS.ENVIRONMENT_ID]: standardized[STANDARD_KEYS.ENVIRONMENT_ID] || '',
        [STANDARD_KEYS.CLIENT_ID]: standardized[STANDARD_KEYS.CLIENT_ID] || '',
        [STANDARD_KEYS.CLIENT_SECRET]: standardized[STANDARD_KEYS.CLIENT_SECRET] || '',
        [STANDARD_KEYS.REGION]: standardized[STANDARD_KEYS.REGION] || DEFAULT_REGION,
        [STANDARD_KEYS.POPULATION_ID]: standardized[STANDARD_KEYS.POPULATION_ID] || '',
        
        // Application settings
        rateLimit: standardized.rateLimit || 100,
        showDisclaimerModal: standardized.showDisclaimerModal !== false,
        showCredentialsModal: standardized.showCredentialsModal !== false,
        showSwaggerPage: standardized.showSwaggerPage === true,
        autoRefreshToken: standardized.autoRefreshToken !== false,
        lastUpdated: new Date().toISOString()
    };
    
    // Remove empty values to keep file clean
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === '' && !['rateLimit', 'lastUpdated'].includes(key)) {
            // Keep empty strings for credential fields to maintain structure
            // but remove completely undefined values
        }
    });
    
    return cleaned;
}

/**
 * Get current settings
 * GET /api/settings
 */
router.get('/', asyncHandler(async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const rawSettings = JSON.parse(settingsContent);
        
        // Clean and de-duplicate settings on read
        const cleanedSettings = cleanAndDeduplicateSettings(rawSettings);
        
        // If settings were cleaned, save the cleaned version
        const originalKeys = Object.keys(rawSettings);
        const cleanedKeys = Object.keys(cleanedSettings);
        const hasLegacyKeys = originalKeys.some(key => 
            !cleanedKeys.includes(key) && 
            !['lastUpdated'].includes(key)
        );
        
        if (hasLegacyKeys) {
            console.log('🧹 Cleaning duplicate credential keys from settings.json');
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(cleanedSettings, null, 2));
        }
        
        // Validate credentials (for informational purposes)
        const validation = validateCredentials(cleanedSettings);
        
        // Don't send sensitive data like secrets
        const publicSettings = {
            // Standardized keys (primary)
            [STANDARD_KEYS.ENVIRONMENT_ID]: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            [STANDARD_KEYS.REGION]: cleanedSettings[STANDARD_KEYS.REGION] || '',
            [STANDARD_KEYS.CLIENT_ID]: cleanedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            [STANDARD_KEYS.POPULATION_ID]: cleanedSettings[STANDARD_KEYS.POPULATION_ID] || '',
            
            // Application preferences
            rateLimit: cleanedSettings.rateLimit || 100,
            showDisclaimerModal: cleanedSettings.showDisclaimerModal !== false,
            showCredentialsModal: cleanedSettings.showCredentialsModal !== false,
            showSwaggerPage: cleanedSettings.showSwaggerPage === true,
            autoRefreshToken: cleanedSettings.autoRefreshToken !== false,
            
            // Legacy keys for backward compatibility
            environmentId: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            region: cleanedSettings[STANDARD_KEYS.REGION] || '',
            apiClientId: cleanedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            populationId: cleanedSettings[STANDARD_KEYS.POPULATION_ID] || '',
            
            // Metadata
            lastUpdated: cleanedSettings.lastUpdated || null,
            credentialsValid: validation.isValid,
            credentialsWarnings: validation.warnings
        };
        
        res.success(publicSettings, 'Settings retrieved successfully');
        
    } catch (error) {
        console.error('Error reading settings:', error);
        
        // Return default settings if file doesn't exist
        const defaultSettings = {
            [STANDARD_KEYS.ENVIRONMENT_ID]: '',
            [STANDARD_KEYS.REGION]: DEFAULT_REGION,
            [STANDARD_KEYS.CLIENT_ID]: '',
            [STANDARD_KEYS.POPULATION_ID]: '',
            rateLimit: 100,
            showDisclaimerModal: true,
            showSwaggerPage: false,
            autoRefreshToken: true,
            environmentId: '',
            region: DEFAULT_REGION,
            apiClientId: '',
            populationId: '',
            lastUpdated: null,
            credentialsValid: false,
            credentialsWarnings: ['Settings file not found or invalid']
        };
        
        res.success(defaultSettings, 'Default settings returned (settings file not found)');
    }
}));

/**
 * Save settings
 * POST /api/settings
 */
router.post('/', 
    validateBody(schemas.settingsUpdate),
    asyncHandler(async (req, res) => {
        const newSettings = req.validatedBody;
        
        // Read existing settings
        let existingSettings = {};
        try {
            const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
            existingSettings = JSON.parse(settingsContent);
        } catch (error) {
            // File doesn't exist or is invalid, start with empty settings
            console.log('Creating new settings file');
        }
        
        // Standardize incoming settings
        const standardizedNewSettings = standardizeConfigKeys(newSettings);
        
        // Merge with existing settings, preserving non-credential fields
        const mergedSettings = {
            ...existingSettings,
            [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedNewSettings[STANDARD_KEYS.ENVIRONMENT_ID] || existingSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            [STANDARD_KEYS.REGION]: standardizedNewSettings[STANDARD_KEYS.REGION] || existingSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION,
            [STANDARD_KEYS.CLIENT_ID]: standardizedNewSettings[STANDARD_KEYS.CLIENT_ID] || existingSettings[STANDARD_KEYS.CLIENT_ID] || '',
            [STANDARD_KEYS.CLIENT_SECRET]: standardizedNewSettings[STANDARD_KEYS.CLIENT_SECRET] || existingSettings[STANDARD_KEYS.CLIENT_SECRET] || '',
            [STANDARD_KEYS.POPULATION_ID]: standardizedNewSettings[STANDARD_KEYS.POPULATION_ID] || existingSettings[STANDARD_KEYS.POPULATION_ID] || '',
            
            // Application preferences
            rateLimit: standardizedNewSettings.rateLimit || existingSettings.rateLimit || 100,
            showDisclaimerModal: standardizedNewSettings.showDisclaimerModal !== undefined ? standardizedNewSettings.showDisclaimerModal : (existingSettings.showDisclaimerModal !== false),
            showCredentialsModal: standardizedNewSettings.showCredentialsModal !== undefined ? standardizedNewSettings.showCredentialsModal : (existingSettings.showCredentialsModal !== false),
            showSwaggerPage: standardizedNewSettings.showSwaggerPage !== undefined ? standardizedNewSettings.showSwaggerPage : (existingSettings.showSwaggerPage === true),
            autoRefreshToken: standardizedNewSettings.autoRefreshToken !== undefined ? standardizedNewSettings.autoRefreshToken : (existingSettings.autoRefreshToken !== false)
        };
        
        // Clean and de-duplicate settings (removes legacy keys)
        const cleanedSettings = cleanAndDeduplicateSettings(mergedSettings);
        
        // Validate credentials
        const validation = validateCredentials(cleanedSettings);
        
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials provided',
                details: validation.errors,
                warnings: validation.warnings
            });
        }
        
        // Log warnings if any
        if (validation.hasWarnings) {
            console.warn('⚠️ Credential validation warnings:', validation.warnings);
        }
        
        // Ensure data directory exists
        const dataDir = path.dirname(SETTINGS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Save cleaned settings (no legacy keys)
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(cleanedSettings, null, 2));
        
        console.log('✅ Settings saved successfully with validation');
        
        // Return success without sensitive data
        const responseData = {
            // Standardized keys (primary)
            [STANDARD_KEYS.ENVIRONMENT_ID]: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID],
            [STANDARD_KEYS.REGION]: cleanedSettings[STANDARD_KEYS.REGION],
            [STANDARD_KEYS.CLIENT_ID]: cleanedSettings[STANDARD_KEYS.CLIENT_ID],
            [STANDARD_KEYS.POPULATION_ID]: cleanedSettings[STANDARD_KEYS.POPULATION_ID],
            
            // Application preferences
            rateLimit: cleanedSettings.rateLimit,
            showDisclaimerModal: cleanedSettings.showDisclaimerModal,
            showCredentialsModal: cleanedSettings.showCredentialsModal,
            showSwaggerPage: cleanedSettings.showSwaggerPage,
            autoRefreshToken: cleanedSettings.autoRefreshToken,
            
            // Legacy keys for backward compatibility
            environmentId: cleanedSettings[STANDARD_KEYS.ENVIRONMENT_ID],
            region: cleanedSettings[STANDARD_KEYS.REGION],
            apiClientId: cleanedSettings[STANDARD_KEYS.CLIENT_ID],
            populationId: cleanedSettings[STANDARD_KEYS.POPULATION_ID],
            
            // Metadata
            lastUpdated: cleanedSettings.lastUpdated,
            credentialsValid: validation.isValid,
            credentialsWarnings: validation.warnings
        };
        
        res.success(responseData, 'Settings saved and validated successfully');
    }));

/**
 * Validate credentials without saving
 * POST /api/settings/validate
 */
router.post('/validate', 
    validateBody(schemas.settingsUpdate),
    asyncHandler(async (req, res) => {
        const credentials = req.validatedBody;
        
        // Standardize incoming credentials
        const standardizedCredentials = standardizeConfigKeys(credentials);
        
        // Validate credentials
        const validation = validateCredentials(standardizedCredentials);
        
        // Test connection if credentials are valid
        let connectionTest = null;
        if (validation.isValid) {
            try {
                // Import token service for testing
                const { tokenService } = await import('../../server/services/token-service.js');
                
                const testCredentials = {
                    environmentId: standardizedCredentials[STANDARD_KEYS.ENVIRONMENT_ID],
                    clientId: standardizedCredentials[STANDARD_KEYS.CLIENT_ID],
                    clientSecret: standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET],
                    region: standardizedCredentials[STANDARD_KEYS.REGION] || DEFAULT_REGION
                };
                
                const accessToken = await tokenService.getToken(testCredentials);
                const tokenStatus = tokenService.getTokenStatus();
                
                connectionTest = {
                    success: !!(accessToken && tokenStatus.isValid),
                    message: accessToken ? 'Connection successful - token acquired' : 'Connection failed - no token received',
                    tokenValid: !!(accessToken && tokenStatus.isValid),
                    tokenStatus: {
                        hasToken: tokenStatus.hasToken,
                        isValid: tokenStatus.isValid,
                        expiresIn: tokenStatus.expiresIn
                    }
                };
                
            } catch (error) {
                connectionTest = {
                    success: false,
                    message: `Connection test failed: ${error.message}`,
                    tokenValid: false
                };
            }
        }
        
        const response = {
            credentialsValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            connectionTest,
            credentials: {
                [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedCredentials[STANDARD_KEYS.ENVIRONMENT_ID] || '',
                [STANDARD_KEYS.CLIENT_ID]: standardizedCredentials[STANDARD_KEYS.CLIENT_ID] || '',
                [STANDARD_KEYS.REGION]: standardizedCredentials[STANDARD_KEYS.REGION] || DEFAULT_REGION,
                // Don't return the secret for security
                hasSecret: !!(standardizedCredentials[STANDARD_KEYS.CLIENT_SECRET])
            }
        };
        
        if (validation.isValid && connectionTest?.success) {
            res.success(response, 'Credentials validated and connection test successful');
        } else if (validation.isValid) {
            res.success(response, 'Credentials format valid but connection test failed');
        } else {
            res.status(400).json({
                success: false,
                error: 'Credential validation failed',
                ...response
            });
        }
    }));

/**
 * Get complete credentials for internal token acquisition
 * GET /api/settings/credentials
 * This endpoint includes the API secret and should only be used internally
 */
router.get('/credentials', asyncHandler(async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const rawSettings = JSON.parse(settingsContent);
        
        // Standardize configuration keys
        const standardizedSettings = standardizeConfigKeys(rawSettings);
        
        // Return complete credentials including secret for internal use
        let rawCredentials = {
            environmentId: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            clientId: standardizedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            clientSecret: standardizedSettings[STANDARD_KEYS.CLIENT_SECRET] || '',
            region: standardizedSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION
        };

        // Note: settings-real.json fallback removed for security
        
        // Apply region configuration with precedence hierarchy
        const regionConfig = getRegionConfig({
            settings: rawCredentials,
            envRegion: process.env.PINGONE_REGION,
            storageRegion: null // localStorage not available server-side
        });
        
        // Use validated and normalized region
        const credentials = {
            ...rawCredentials,
            region: regionConfig.region
        };
        
        console.log('🌍 Region configuration applied:', {
            originalRegion: rawCredentials.region,
            finalRegion: credentials.region,
            source: regionConfig.source,
            precedence: regionConfig.precedence
        });
        
        // Always return what we have; client decides how to display/invalidate
        res.success(credentials, 'Credentials retrieved successfully');
        
    } catch (error) {
        console.error('Error reading credentials:', error);
        res.error('Failed to read credentials', { code: 'SETTINGS_READ_ERROR', message: error.message }, 500);
    }
}));

/**
 * Get public settings (non-sensitive information)
 * GET /api/settings/public
 * This endpoint returns public settings without sensitive credentials
 */
router.get('/public', asyncHandler(async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const rawSettings = JSON.parse(settingsContent);
        
        // Standardize configuration keys
        const standardizedSettings = standardizeConfigKeys(rawSettings);
        
        // Return only public, non-sensitive information
        const publicSettings = {
            environmentId: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            region: standardizedSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION,
            rateLimit: rawSettings.rateLimit || 100,
            showDisclaimerModal: rawSettings.showDisclaimerModal || false,
            showCredentialsModal: rawSettings.showCredentialsModal || false,
            showSwaggerPage: rawSettings.showSwaggerPage || false,
            autoRefreshToken: rawSettings.autoRefreshToken !== false,
            lastUpdated: rawSettings.lastUpdated || null,
            hasCredentials: !!(standardizedSettings[STANDARD_KEYS.CLIENT_ID] && standardizedSettings[STANDARD_KEYS.CLIENT_SECRET])
        };
        
        res.success(publicSettings, 'Public settings retrieved successfully');
        
    } catch (error) {
        console.error('Error reading public settings:', error);
        res.error('Failed to read public settings', { code: 'SETTINGS_READ_ERROR', message: error.message }, 500);
    }
}));

export default router;
