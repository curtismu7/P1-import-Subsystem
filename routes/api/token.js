import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { tokenService } from '../../server/services/token-service.js';
import { serverLogger as logger } from '../../server/winston-config.js';

const router = express.Router();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load settings.json safely
async function loadSettingsSafe() {
  try {
    const settingsPath = path.join(__dirname, '../../data', 'settings.json');
    const raw = await fs.readFile(settingsPath, 'utf8');
    const json = JSON.parse(raw || '{}');
    return json || {};
  } catch (e) {
    return {};
  }
}

function findMissingRequired(settings) {
  const required = ['pingone_environment_id', 'pingone_client_id', 'pingone_client_secret'];
  const missing = [];
  for (const key of required) {
    const val = settings?.[key];
    if (!val || String(val).trim() === '') missing.push(key);
  }
  return missing;
}

function mapTokenErrorToResponse(err) {
  // Try to parse HTTP status from error message produced by tokenService
  const msg = err?.message || '';
  const m = msg.match(/status\s(\d{3})/i);
  const status = m ? Number(m[1]) : (err.status || err.code);

  // Defaults
  let http = 500;
  let code = 'TOKEN_REFRESH_FAILED';
  let userMessage = 'Failed to refresh token. Please try again.';

  if (status === 400 || status === 401) {
    http = 401;
    code = 'INVALID_CREDENTIALS';
    userMessage = 'Invalid PingOne credentials. Please update settings.json and try again.';
  } else if (status === 403) {
    http = 403;
    code = 'FORBIDDEN_ACCESS';
    userMessage = 'Access forbidden for the provided credentials. Check environment and app permissions.';
  } else if (status === 429) {
    http = 429;
    code = 'RATE_LIMIT';
    userMessage = 'Too many requests. Please wait and try again.';
  } else if (status === 408) {
    http = 408;
    code = 'TIMEOUT';
    userMessage = 'Request timed out. Please try again.';
  } else if (/network|fetch|ENOTFOUND|ECONN/i.test(msg)) {
    http = 503;
    code = 'NETWORK_ERROR';
    userMessage = 'Network error contacting PingOne. Please check connectivity.';
  }

  return { http, code, userMessage };
}

// GET /api/token/status - return current token status (no secrets)
router.get('/status', async (req, res) => {
  try {
    // Check settings first
    const settings = await loadSettingsSafe();
    const missing = findMissingRequired(settings);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Settings incomplete. Please update settings.json.',
        code: 'SETTINGS_INCOMPLETE',
        details: { missing }
      });
    }

    let status = tokenService.getTokenStatus();

    // Attempt a one-time warm-up if invalid/expired using settings
    if (!status.isValid || !status.hasToken) {
      try {
        await tokenService.getToken({
          environmentId: settings.pingone_environment_id,
          clientId: settings.pingone_client_id,
          clientSecret: settings.pingone_client_secret,
          region: settings.pingone_region || 'NA'
        });
        status = tokenService.getTokenStatus();
      } catch (warmErr) {
        logger.warn('Token warm-up during status failed', { error: warmErr.message });
      }
    }

    return res.json({
      success: true,
      message: status.isValid ? 'Token is valid' : 'Token is invalid or expired',
      data: status
    });
  } catch (error) {
    logger.warn('Failed to get token status', { error: error.message });
    return res.status(200).json({ success: true, data: { hasToken: false, isValid: false, expiresIn: 0 } });
  }
});

// POST /api/token/refresh - ensure a valid token exists by attempting acquisition
router.post('/refresh', async (req, res) => {
  try {
    const settings = await loadSettingsSafe();
    const missing = findMissingRequired(settings);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Settings incomplete. Please update settings.json.',
        code: 'SETTINGS_INCOMPLETE',
        details: { missing }
      });
    }

    await tokenService.getToken({
      environmentId: settings.pingone_environment_id,
      clientId: settings.pingone_client_id,
      clientSecret: settings.pingone_client_secret,
      region: settings.pingone_region || 'NA'
    });
    const status = tokenService.getTokenStatus();
    return res.json({ success: true, message: 'Token refreshed', data: status });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message, stack: error.stack });
    const mapped = mapTokenErrorToResponse(error);
    return res.status(mapped.http).json({ success: false, error: mapped.userMessage, code: mapped.code });
  }
});

export default router;
