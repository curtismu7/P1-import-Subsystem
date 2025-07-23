import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

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
        const publicSettings = {
            environmentId: settings.environmentId || '',
            region: settings.region || '',
            apiClientId: settings.apiClientId || '',
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

export default router;
