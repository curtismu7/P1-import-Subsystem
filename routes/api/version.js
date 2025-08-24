import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_VERSION, getVersionInfo } from '../../src/shared/app-version.js';

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

    // Backward-compatible top-level version + standardized wrapper with data
    const payload = {
      version: APP_VERSION, // top-level for legacy clients/tests
      name: packageJson.name,
      description: packageJson.description,
      timestamp: new Date().toISOString(),
      buildDate: versionInfo.buildDate,
    };

    res.json({
      success: true,
      message: 'Operation completed successfully',
      data: payload,
      // Also include top-level fields for compatibility
      ...payload,
    });
  } catch (error) {
    console.error('Error getting version information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read version information',
      error: 'Failed to read version information',
      version: APP_VERSION || 'unknown',
    });
  }
});

export default router;
