import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { tokenService } from '../../server/services/token-service.js';
import { serverLogger as logger } from '../../server/winston-config.js';
import CredentialEncryptor from '../../auth-subsystem/server/credential-encryptor.js';

const router = express.Router();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize credential encryptor for decrypting secrets stored in settings.json
const encryptor = new CredentialEncryptor(logger);

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

// Normalize region variants into accepted short codes
function normalizeRegion(region) {
  const r = (region || '').toString();
  if (!r) return 'NA';
  if (/^NA$|^NorthAmerica$/i.test(r)) return 'NA';
  if (/^EU$|^Europe$/i.test(r)) return 'EU';
  if (/^APAC$|^AsiaPacific$/i.test(r)) return 'APAC';
  if (/^CA$|^Canada$/i.test(r)) return 'Canada';
  // Default to NA if unknown to avoid blowing up; caller may still validate downstream
  return 'NA';
}

// Decrypt pingone_client_secret if it is stored with the 'enc:' prefix
// On decryption failure, THROW a specific error so callers can surface a clear message
async function getDecryptedClientSecret(settings) {
  const secret = settings?.pingone_client_secret;
  if (secret == null || String(secret).trim() === '') return '';
  if (typeof secret === 'string' && secret.startsWith('enc:')) {
    try {
      return await encryptor.decrypt(secret);
    } catch (err) {
      logger.error('Failed to decrypt pingone_client_secret', { error: err.message });
      const e = new Error('Failed to decrypt pingone_client_secret');
      e.code = 'DECRYPTION_FAILED';
      throw e;
    }
  }
  return secret;
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
  } else if (status === 'DECRYPTION_FAILED' || err?.code === 'DECRYPTION_FAILED') {
    http = 500;
    code = 'DECRYPTION_FAILED';
    userMessage = 'Failed to decrypt stored client secret. Check AUTH_SUBSYSTEM_ENCRYPTION_KEY and re-save credentials.';
  }

  return { http, code, userMessage };
}

// Local-only guard: allow only requests originating from localhost
function ensureLocalOnly(req, res) {
  try {
    const ip = (req.ip || req.connection?.remoteAddress || '').toString();
    const xff = (req.headers['x-forwarded-for'] || '').toString();
    const candidate = (xff.split(',')[0] || ip).trim();
    const allowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].some(v => candidate.includes(v));
    if (!allowed) {
      return { ok: false, res: res.status(403).json({ success: false, error: 'Local access only', code: 'FORBIDDEN' }) };
    }
    return { ok: true };
  } catch (e) {
    logger.error('Local-only guard check failed', { error: e.message });
    return { ok: false, res: res.status(500).json({ success: false, error: 'Guard error', code: 'INTERNAL' }) };
  }
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
          clientSecret: await getDecryptedClientSecret(settings),
          region: normalizeRegion(settings.pingone_region)
        });
        status = tokenService.getTokenStatus();
      } catch (warmErr) {
        logger.warn('Token warm-up during status failed', { error: warmErr.message, code: warmErr.code });
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

// Local helper: GET /api/token/refresh-dev - CSRF-exempt (GET) and restricted to localhost-only.
let refreshInFlight = false;
router.get('/refresh-dev', async (req, res) => {
  try {
    // Local-only guard
    const guard = ensureLocalOnly(req, res);
    if (!guard.ok) return; // response already sent

    // Concurrency guard: avoid overlapping refreshes
    if (refreshInFlight) {
      const status = tokenService.getTokenStatus?.() || {};
      return res.status(202).json({ success: true, message: 'Refresh in progress', data: status });
    }

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

    refreshInFlight = true;
    try {
      await tokenService.getToken({
        environmentId: settings.pingone_environment_id,
        clientId: settings.pingone_client_id,
        clientSecret: await getDecryptedClientSecret(settings),
        region: normalizeRegion(settings.pingone_region)
      });
    } finally {
      refreshInFlight = false;
    }
    const status = tokenService.getTokenStatus();
    return res.json({ success: true, message: 'Token refreshed (dev)', data: status });
  } catch (error) {
    logger.error('Token refresh-dev failed', { error: error.message });
    const mapped = mapTokenErrorToResponse(error);
    return res.status(mapped.http).json({ success: false, error: mapped.userMessage, code: mapped.code });
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
      clientSecret: await getDecryptedClientSecret(settings),
      region: normalizeRegion(settings.pingone_region)
    });
    const status = tokenService.getTokenStatus();
    return res.json({ success: true, message: 'Token refreshed', data: status });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message, stack: error.stack });
    const mapped = mapTokenErrorToResponse(error);
    return res.status(mapped.http).json({ success: false, error: mapped.userMessage, code: mapped.code });
  }
});

// GET /api/token/debug - Non-sensitive diagnostics: settings presence, secret type, decryption capability
router.get('/debug', async (req, res) => {
  try {
    const settings = await loadSettingsSafe();
    const missing = findMissingRequired(settings);
    const secret = settings?.pingone_client_secret;
    const secretType = !secret || String(secret).trim() === ''
      ? 'empty'
      : (typeof secret === 'string' && secret.startsWith('enc:') ? 'encrypted' : 'plain');

    let canDecrypt = null;
    if (secretType === 'encrypted') {
      try {
        await encryptor.decrypt(secret);
        canDecrypt = true;
      } catch {
        canDecrypt = false;
      }
    }

    const status = tokenService.getTokenStatus?.() || {};
    return res.json({
      success: true,
      message: 'Token debug diagnostics',
      data: {
        hasSettings: Object.keys(settings || {}).length > 0,
        missing,
        region: normalizeRegion(settings?.pingone_region),
        secretType,
        canDecrypt,
        token: {
          hasToken: !!status.hasToken,
          isValid: !!status.isValid,
          expiresIn: status.expiresIn ?? null
        }
      }
    });
  } catch (error) {
    logger.error('Token debug endpoint failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Debug endpoint failed' });
  }
});

export default router;
