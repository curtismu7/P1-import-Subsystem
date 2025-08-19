// server/services/settings-loader.js
// Centralized settings loader that reads data/settings.json and decrypts secrets

import path from 'path';
import { promises as fs } from 'fs';
import CredentialEncryptor from '../../auth-subsystem/server/credential-encryptor.js';
import regionMapper from '../../src/utils/region-mapper.js';

const { toApiCode } = regionMapper;

export async function loadSettings(logger = console) {
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  let json;
  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    json = JSON.parse(raw || '{}');
  } catch (error) {
    const msg = `settings-loader: Unable to read ${settingsPath}. Ensure the file exists.`;
    (logger || console).error(msg, { error: error.message });
    throw new Error(msg);
  }

  // Prefer standardized PINGONE_* keys, but support legacy keys for backward compatibility
  const environmentId = json.PINGONE_ENVIRONMENT_ID || json.environmentId || json['environment-id'] || json.pingone_environment_id;
  const clientId = json.PINGONE_CLIENT_ID || json.apiClientId || json['api-client-id'] || json.pingone_client_id;
  const rawSecret = json.PINGONE_CLIENT_SECRET || json.apiSecret || json['api-secret'] || json.pingone_client_secret;
  const rawRegion = json.PINGONE_REGION || json.region || json.pingone_region || 'NA';
  const region = toApiCode(rawRegion || 'NA');

  // Validate presence
  const missing = [];
  if (!environmentId) missing.push('environmentId');
  if (!clientId) missing.push('apiClientId');
  if (!rawSecret) missing.push('apiSecret');
  if (!region) missing.push('region');
  if (missing.length) {
    const msg = `settings-loader: Missing required fields in data/settings.json: ${missing.join(', ')}`;
    (logger || console).error(msg);
    throw new Error(msg);
  }

  let clientSecret = rawSecret;
  if (typeof clientSecret === 'string' && clientSecret.startsWith('enc:')) {
    const encryptor = new CredentialEncryptor(logger);
    clientSecret = await encryptor.decrypt(clientSecret);
    if (!clientSecret) {
      const msg = 'settings-loader: Failed to decrypt apiSecret from data/settings.json. Check AUTH_SUBSYSTEM_ENCRYPTION_KEY.';
      (logger || console).error(msg);
      throw new Error(msg);
    }
  }

  return { environmentId, clientId, clientSecret, region };
}

export default { loadSettings };
