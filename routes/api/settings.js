import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRegionConfig, normalizeRegion, validateRegion, DEFAULT_REGION } from '../../src/utils/region-config.js';
import { STANDARD_KEYS, standardizeConfigKeys, createBackwardCompatibleConfig } from '../../src/utils/config-standardization.js';
import { asyncHandler } from '../../server/middleware/error-handler.js';
import { validateBody, schemas } from '../../server/middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

/**
 * Get current settings
 * GET /api/settings
 */
router.get('/', asyncHandler(async (req, res) => {
    const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
    const rawSettings = JSON.parse(settingsContent);
    
    // Standardize configuration keys
    const standardizedSettings = standardizeConfigKeys(rawSettings);
    
    // Don't send sensitive data like secrets
    const publicSettings = {
        // Standardized keys (primary)
        [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
        [STANDARD_KEYS.REGION]: standardizedSettings[STANDARD_KEYS.REGION] || '',
        [STANDARD_KEYS.CLIENT_ID]: standardizedSettings[STANDARD_KEYS.CLIENT_ID] || '',
        [STANDARD_KEYS.POPULATION_ID]: standardizedSettings[STANDARD_KEYS.POPULATION_ID] || '',
        
        // Legacy keys for backward compatibility
        environmentId: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
        region: standardizedSettings[STANDARD_KEYS.REGION] || '',
        apiClientId: standardizedSettings[STANDARD_KEYS.CLIENT_ID] || '',
        populationId: standardizedSettings[STANDARD_KEYS.POPULATION_ID] || '',
        
        // Don't send apiSecret for security
        lastUpdated: rawSettings.lastUpdated || null
    };
    
    res.success('Settings retrieved successfully', publicSettings);
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
        
        // Create backward compatible settings (includes both standard and legacy keys)
        const updatedSettings = createBackwardCompatibleConfig({
            ...existingSettings,
            [STANDARD_KEYS.ENVIRONMENT_ID]: standardizedNewSettings[STANDARD_KEYS.ENVIRONMENT_ID],
            [STANDARD_KEYS.REGION]: standardizedNewSettings[STANDARD_KEYS.REGION],
            [STANDARD_KEYS.CLIENT_ID]: standardizedNewSettings[STANDARD_KEYS.CLIENT_ID],
            [STANDARD_KEYS.CLIENT_SECRET]: standardizedNewSettings[STANDARD_KEYS.CLIENT_SECRET],
            [STANDARD_KEYS.POPULATION_ID]: standardizedNewSettings[STANDARD_KEYS.POPULATION_ID],
            lastUpdated: new Date().toISOString()
        });
        
        // Ensure data directory exists
        const dataDir = path.dirname(SETTINGS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Save settings
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
        
        console.log('Settings saved successfully');
        
        // Return success without sensitive data
        const responseData = {
            // Standardized keys (primary)
            [STANDARD_KEYS.ENVIRONMENT_ID]: updatedSettings[STANDARD_KEYS.ENVIRONMENT_ID],
            [STANDARD_KEYS.REGION]: updatedSettings[STANDARD_KEYS.REGION],
            [STANDARD_KEYS.CLIENT_ID]: updatedSettings[STANDARD_KEYS.CLIENT_ID],
            [STANDARD_KEYS.POPULATION_ID]: updatedSettings[STANDARD_KEYS.POPULATION_ID],
            
            // Legacy keys for backward compatibility
            environmentId: updatedSettings[STANDARD_KEYS.ENVIRONMENT_ID],
            region: updatedSettings[STANDARD_KEYS.REGION],
            apiClientId: updatedSettings[STANDARD_KEYS.CLIENT_ID],
            populationId: updatedSettings[STANDARD_KEYS.POPULATION_ID],
            
            lastUpdated: updatedSettings.lastUpdated
        };
        
        res.success('Settings saved successfully', responseData);
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
        const rawCredentials = {
            environmentId: standardizedSettings[STANDARD_KEYS.ENVIRONMENT_ID] || '',
            clientId: standardizedSettings[STANDARD_KEYS.CLIENT_ID] || '',
            clientSecret: standardizedSettings[STANDARD_KEYS.CLIENT_SECRET] || '',
            region: standardizedSettings[STANDARD_KEYS.REGION] || DEFAULT_REGION
        };
        
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
        
        // Validate that all required credentials are present
        if (!credentials.environmentId || !credentials.clientId || !credentials.clientSecret) {
            return res.status(400).json({
                success: false,
                error: 'Missing required credentials',
                missing: {
                    environmentId: !credentials.environmentId,
                    clientId: !credentials.clientId,
                    clientSecret: !credentials.clientSecret
                }
            });
        }
        
        res.success('Credentials retrieved successfully', credentials);
        
    } catch (error) {
        console.error('Error reading credentials:', error);
        res.error('Failed to read credentials', { code: 'SETTINGS_READ_ERROR', message: error.message }, 500);
    }
}));

export default router;
