#!/usr/bin/env node
/**
 * Re-encrypt PingOne client secret into data/settings.json using AUTH_SUBSYSTEM_ENCRYPTION_KEY
 *
 * Usage options:
 *  - Provide plaintext via env: PLAINTEXT_CLIENT_SECRET="..." node scripts/re-encrypt-client-secret.js
 *  - Or ensure data/settings.json has pingone_client_secret as a plain (non-enc:) string
 *
 * Requirements:
 *  - Set AUTH_SUBSYSTEM_ENCRYPTION_KEY in environment (the new desired key)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import CredentialEncryptor from '../auth-subsystem/server/credential-encryptor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const logger = console;
  const encryptor = new CredentialEncryptor(logger);
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

  // Validate encryption key presence
  const key = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
  if (!key || String(key).trim() === '') {
    console.error('ERROR: AUTH_SUBSYSTEM_ENCRYPTION_KEY is not set. Set it in your environment and retry.');
    process.exit(1);
  }

  // Read settings
  let settingsRaw = '{}';
  try {
    settingsRaw = await fs.readFile(settingsPath, 'utf8');
  } catch (e) {
    console.error(`ERROR: Could not read ${settingsPath}:`, e.message);
    process.exit(1);
  }

  let settings;
  try {
    settings = JSON.parse(settingsRaw || '{}');
  } catch (e) {
    console.error('ERROR: settings.json is not valid JSON:', e.message);
    process.exit(1);
  }

  const envId = settings.pingone_environment_id || '(missing)';
  const clientId = settings.pingone_client_id || '(missing)';

  // Determine plaintext secret source
  let plaintext = process.env.PLAINTEXT_CLIENT_SECRET;
  const current = settings.pingone_client_secret;

  if (!plaintext) {
    if (current && typeof current === 'string' && !current.startsWith('enc:')) {
      plaintext = current;
    }
  }

  if (!plaintext || String(plaintext).trim() === '') {
    console.error('ERROR: No plaintext secret available. Set PLAINTEXT_CLIENT_SECRET or set settings.pingone_client_secret to a plain (non-enc:) value and rerun.');
    process.exit(1);
  }

  // Encrypt and write back
  try {
    const encrypted = await encryptor.encrypt(String(plaintext));
    const now = new Date().toISOString();
    const updated = { ...settings, pingone_client_secret: encrypted, lastUpdated: now };
    await fs.writeFile(settingsPath, JSON.stringify(updated, null, 2), 'utf8');

    // Mask helpers
    const mask = (val) => !val ? '' : `${String(val).slice(0,4)}...${String(val).slice(-4)}`;
    console.log('SUCCESS: Secret encrypted and saved to data/settings.json');
    console.log('Summary:', {
      environmentId: mask(envId),
      clientId: mask(clientId),
      secretType: 'encrypted',
      lastUpdated: now
    });
    console.log('Next: restart server and verify /api/token/debug shows canDecrypt: true and secretType: encrypted.');
  } catch (e) {
    console.error('ERROR: Failed to encrypt and save secret:', e.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
