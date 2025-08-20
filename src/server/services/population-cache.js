import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep pathing consistent with existing settings path usage in settings.js
const CACHE_PATH = join(__dirname, "../data/populations-cache.json");

const DEFAULT_TTL_MS = parseInt(process.env.POPULATIONS_CACHE_TTL_MS || '86400000', 10); // 24h

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeCache(obj) {
  const dir = dirname(CACHE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

function now() { return Date.now(); }

function isExpired(entry, ttlMs = DEFAULT_TTL_MS) {
  if (!entry || !entry.timestamp) return true;
  return (now() - entry.timestamp) > ttlMs;
}

function makeKey({ environmentId, clientId, region }) {
  return `${environmentId}|${clientId}|${region || 'NA'}`;
}

export async function getPopulation({ environmentId, clientId, region }, ttlMs = DEFAULT_TTL_MS) {
  const key = makeKey({ environmentId, clientId, region });
  const cache = await readCache();
  const entry = cache[key];
  if (!entry || isExpired(entry, ttlMs)) return null;
  return entry.populationId || null;
}

export async function setPopulation({ environmentId, clientId, region }, populationId) {
  const key = makeKey({ environmentId, clientId, region });
  const cache = await readCache();
  cache[key] = {
    populationId,
    timestamp: now()
  };
  await writeCache(cache);
  return true;
}

export default {
  getPopulation,
  setPopulation,
  DEFAULT_TTL_MS
};
