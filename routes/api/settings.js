import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRegionConfig, normalizeRegion, validateRegion, DEFAULT_REGION } from '../../src/utils/region-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

/**
 * Get current settings
 * GET /api/settings
 */
router.get('/', async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(settingsContent);
        
        // Don't send sensitive data like secrets
        // Handle both camelCase and kebab-case keys from settings.json
        const publicSettings = {
            environmentId: settings.environmentId || settings['environment-id'] || '',
            region: settings.region || '',
            apiClientId: settings.apiClientId || settings['api-client-id'] || '',
            // Don't send apiSecret for security
            lastUpdated: settings.lastUpdated || null
        };
        
        res.json(publicSettings);
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({
            error: 'Failed to read settings',
            message: error.message
        });
    }
});

/**
 * Save settings
 * POST /api/settings
 */
router.post('/', async (req, res) => {
    try {
        const newSettings = req.body;
        
        // Validate required fields
        if (!newSettings.environmentId || !newSettings.apiClientId || !newSettings.apiSecret || !newSettings.region) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['environmentId', 'apiClientId', 'apiSecret', 'region']
            });
        }
        
        // Read existing settings
        let existingSettings = {};
        try {
            const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
            existingSettings = JSON.parse(settingsContent);
        } catch (error) {
            // File doesn't exist or is invalid, start with empty settings
            console.log('Creating new settings file');
        }
        
        // Merge settings
        const updatedSettings = {
            ...existingSettings,
            environmentId: newSettings.environmentId,
            region: newSettings.region,
            apiClientId: newSettings.apiClientId,
            apiSecret: newSettings.apiSecret,
            lastUpdated: new Date().toISOString()
        };
        
        // Ensure data directory exists
        const dataDir = path.dirname(SETTINGS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Save settings
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
        
        console.log('Settings saved successfully');
        
        // Return success without sensitive data
        res.json({
            success: true,
            message: 'Settings saved successfully',
            environmentId: updatedSettings.environmentId,
            region: updatedSettings.region,
            apiClientId: updatedSettings.apiClientId,
            lastUpdated: updatedSettings.lastUpdated
        });
        
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({
            error: 'Failed to save settings',
            message: error.message
        });
    }
});

/**
 * Get complete credentials for internal token acquisition
 * GET /api/settings/credentials
 * This endpoint includes the API secret and should only be used internally
 */
router.get('/credentials', async (req, res) => {
    try {
        const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(settingsContent);
        
        // Return complete credentials including secret for internal use
        // Handle both camelCase and kebab-case keys from settings.json
        const rawCredentials = {
            environmentId: settings.environmentId || settings['environment-id'] || '',
            clientId: settings.apiClientId || settings['api-client-id'] || '',
            clientSecret: settings.apiSecret || settings['api-secret'] || '',
            region: settings.region || DEFAULT_REGION
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
        
        res.json({
            success: true,
            credentials: credentials
        });
        
    } catch (error) {
        console.error('Error reading credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read credentials',
            message: error.message
        });
    }
});

export default router;
