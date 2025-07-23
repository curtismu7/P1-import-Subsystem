import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

/**
 * Get application version from package.json
 * GET /api/version
 */
router.get('/', async (req, res) => {
    try {
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        
        res.json({
            version: packageJson.version,
            name: packageJson.name,
            description: packageJson.description,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error reading package.json:', error);
        res.status(500).json({
            error: 'Failed to read version information',
            version: 'unknown'
        });
    }
});

export default router;
