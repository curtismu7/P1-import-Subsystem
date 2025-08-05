import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_VERSION, getVersionInfo } from '../../src/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

/**
 * Get application version from centralized version source
 * GET /api/version
 */
router.get('/', async (req, res) => {
    try {
        // Get version info from centralized source
        const versionInfo = getVersionInfo();
        
        // Also read package.json for additional metadata
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        
        res.json({
            version: APP_VERSION,
            name: packageJson.name,
            description: packageJson.description,
            timestamp: new Date().toISOString(),
            buildDate: versionInfo.buildDate
        });
    } catch (error) {
        console.error('Error getting version information:', error);
        res.status(500).json({
            error: 'Failed to read version information',
            version: APP_VERSION || 'unknown' // Fallback to APP_VERSION constant if available
        });
    }
});

export default router;
