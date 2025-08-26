import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Update disclaimer agreement timestamp in app-config.json
 */
router.post('/disclaimer-agreement', async (req, res) => {
  try {
    const { lastAgreedAt } = req.body;
    
    if (!lastAgreedAt) {
      return res.status(400).json({ 
        success: false, 
        error: 'lastAgreedAt timestamp is required' 
      });
    }

    const configPath = path.join(__dirname, '../../data/app-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Update the disclaimer agreement timestamp
    if (!config.disclaimer) {
      config.disclaimer = {};
    }
    config.disclaimer.lastAgreedAt = lastAgreedAt;
    config.lastUpdated = new Date().toISOString();

    // Write the updated config back to file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    res.json({ 
      success: true, 
      message: 'Disclaimer agreement timestamp updated successfully',
      lastAgreedAt 
    });

  } catch (error) {
    console.error('❌ Error updating disclaimer agreement:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update disclaimer agreement timestamp' 
    });
  }
});

export default router;
