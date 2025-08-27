/**
 * Export API Routes
 *
 * Provides endpoints for export operations and status monitoring.
 * These endpoints support the ExportSubsystem and related UI components.
 */

import express from 'express';
import fetch from 'node-fetch';
import workerTokenManager from '../../auth/workerTokenManager.js';
import { apiLogger, apiLogHelpers, exportLogger, logSeparator, logTag } from '../../server/winston-config.js';
const router = express.Router();

// In-memory storage for export status (in production, use database)
let exportStatus = {
  isRunning: false,
  progress: 0,
  total: 0,
  processed: 0,
  errors: 0,
  warnings: 0,
  ignoredUsers: 0,
  startTime: null,
  endTime: null,
  currentPopulation: null,
  sessionId: null,
  status: 'idle', // idle, running, completed, failed, cancelled
  outputFile: null,
  downloadUrl: null
};

// Internal timer for driving progress when backend worker is not yet wired
let exportInterval = null;

function stopProgressTimer() {
  if (exportInterval) {
    clearInterval(exportInterval);
    exportInterval = null;
  }
}

function startProgressTimer() {
  stopProgressTimer();
  exportInterval = setInterval(() => {
    try {
      if (!exportStatus.isRunning || exportStatus.status !== 'running') {
        stopProgressTimer();
        return;
      }
      const total = Number(exportStatus.total || 0);
      // If total is unknown, don't drive progress
      if (!Number.isFinite(total) || total <= 0) {return;}
      // Increment by ~2% of total per tick (every 500ms)
      const step = Math.max(1, Math.ceil(total * 0.02));
      exportStatus.processed = Math.min(total, exportStatus.processed + step);
      if (exportStatus.processed >= total) {
        exportStatus.isRunning = false;
        exportStatus.endTime = Date.now();
        exportStatus.status = 'completed';
        stopProgressTimer();
      }
    } catch (_) {}
  }, 500);
}

// Simple in-memory cache for discovered attributes
let attributesCache = {
  data: null,
  cachedAt: 0,
  ttlMs: 10 * 60 * 1000 // 10 minutes
};

// Region to API base URL map (keep consistent with pingone-proxy-fixed.js)
const PINGONE_API_BASE_URLS = {
  'NorthAmerica': 'https://api.pingone.com',
  'Europe': 'https://api.eu.pingone.com',
  'Canada': 'https://api.ca.pingone.com',
  'Asia': 'https://api.apsoutheast.pingone.com',
  'Australia': 'https://api.aus.pingone.com',
  'US': 'https://api.pingone.com',
  'EU': 'https://api.eu.pingone.com',
  'AP': 'https://api.apsoutheast.pingone.com',
  'default': 'https://api.pingone.com'
};

/**
 * GET /api/export/attributes
 * Discover available user attributes (standard + custom) from PingOne
 * Strategy: fetch a single user and introspect fields, including custom attributes
 */
router.get('/attributes', async (req, res) => {
  try {
    // Serve from cache unless forceRefresh requested
    const forceRefresh = String(req.query.forceRefresh || 'false').toLowerCase() === 'true';
    const now = Date.now();
    if (!forceRefresh && attributesCache.data && (now - attributesCache.cachedAt) < attributesCache.ttlMs) {
      return res.success('Export attributes retrieved (cache)', { attributes: attributesCache.data, cache: true });
    }

    const environmentId = process.env.PINGONE_ENVIRONMENT_ID;
    const region = process.env.PINGONE_REGION || 'NorthAmerica';
    if (!environmentId) {
      return res.error('Environment ID not configured', { code: 'ENV_NOT_CONFIGURED' }, 400);
    }

    // Acquire token via shared token manager
    const accessToken = await workerTokenManager.getAccessToken({
      apiClientId: process.env.PINGONE_CLIENT_ID,
      apiSecret: process.env.PINGONE_CLIENT_SECRET,
      environmentId,
      region
    });

    const baseUrl = PINGONE_API_BASE_URLS[region] || PINGONE_API_BASE_URLS.default;

    // Helper: fetch PingOne core User schema (preferred per user request)
    const fetchCoreUserSchema = async () => {
      const url = `${baseUrl}/v1/environments/${environmentId}/schemas/user`;
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (!r.ok) {
        return null;
      }
      try {
        const body = await r.json();
        return body && Array.isArray(body.attributes) ? body : null;
      } catch (_) {
        return null;
      }
    };

    // Flatten PingOne core schema attributes to keys array (dot notation for complex)
    const flattenCoreAttributes = (schema) => {
      const out = [];
      const seen = new Set();
      const add = (key) => { if (key && !seen.has(key)) { seen.add(key); out.push({ key, label: key.split('.').pop(), group: 'standard' }); } };
      const walk = (prefix, attr) => {
        const path = prefix ? `${prefix}.${attr.name}` : attr.name;
        add(path);
        if (Array.isArray(attr.subAttributes)) {
          for (const sub of attr.subAttributes) { walk(path, sub); }
        }
      };
      try {
        for (const a of schema.attributes) { walk('', a); }
      } catch (_) {}
      return out;
    };

    // Helper: fetch SCIM schema (fallback)
    const fetchScimUserSchema = async () => {
      const coreUserUrn = 'urn:ietf:params:scim:schemas:core:2.0:User';
      const schemasTry = [
        `${baseUrl}/v1/environments/${environmentId}/scim/v2/Schemas/${encodeURIComponent(coreUserUrn)}`,
        `${baseUrl}/v1/environments/${environmentId}/scim/v2/Schemas`
      ];

      for (const scimUrl of schemasTry) {
        const r = await fetch(scimUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/scim+json, application/json'
          }
        });
        if (!r.ok) { continue; }
        const body = await r.json();
        // If we fetched the single schema, return it directly
        if (body && body.id === coreUserUrn && Array.isArray(body.attributes)) { return { list: [body] }; }
        // If we fetched list, try to find the User schema + extensions
        if (Array.isArray(body.Resources)) { return { list: body.Resources }; }
      }
      return { list: [] };
    };

    // Helper: flatten SCIM attributes into key list
    const flattenScimAttributes = (schemas) => {
      const out = [];
      const seen = new Set();
      const add = (key, label, group = 'standard', required = false, type = 'string') => {
        if (!key || seen.has(key)) { return; }
        seen.add(key);
        out.push({ key, label, group, required, type });
      };
      const walk = (prefix, attr, owningSchemaId) => {
        const path = prefix ? `${prefix}.${attr.name}` : attr.name;
        const isMeta = path.startsWith('meta.') || ['id','userName','username'].includes(path);
        const isName = path.startsWith('name.');
        const isRelations = ['groups','roles'].some(k => path.startsWith(k));
        const isCustomSchema = owningSchemaId && !owningSchemaId.includes(':core:2.0:User');
        const group = isName ? 'name' : isRelations ? 'relations' : (isMeta ? 'metadata' : (isCustomSchema ? 'custom' : 'standard'));
        const label = (attr.displayName || path.split('.').pop() || attr.name).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        add(path, label, group, Boolean(attr.required), attr.type || 'string');
        if (Array.isArray(attr.subAttributes)) {
          for (const sub of attr.subAttributes) { walk(path, sub, owningSchemaId); }
        }
      };
      for (const schema of schemas) {
        if (!Array.isArray(schema.attributes)) { continue; }
        for (const a of schema.attributes) { walk('', a, schema.id); }
      }
      // Normalize SCIM userName to username for UI consistency
      if (seen.has('userName') && !seen.has('username')) { add('username', 'Username', 'standard', true, 'string'); }
      return out;
    };

    // Preferred path: Core schema discovery (returns names), fallback to SCIM
    let attributes = [];
    try {
      const core = await fetchCoreUserSchema();
      if (core) {
        attributes = flattenCoreAttributes(core);
      }
    } catch (ignoredError) {
      // Intentional ignore
    }

    if (!attributes.length) {
      try {
        const scim = await fetchScimUserSchema();
        if (scim.list && scim.list.length) {
          attributes = flattenScimAttributes(scim.list);
        }
      } catch (ignoredError) {
        // fall back below
      }
    }

    // Fallback: sample user introspection (legacy)
    if (!attributes.length) {
      const url = `${baseUrl}/v1/environments/${environmentId}/users?limit=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const text = await response.text();
        return res.error('Failed to query PingOne users for attribute discovery', { code: 'PINGONE_USERS_ERROR', status: response.status, details: text }, 502);
      }
      const data = await response.json();
      const sampleUser = data?._embedded?.users?.[0] || {};
      // Build normalized attributes list
      attributes = [];
      const seen = new Set();
      const addAttr = (key, label, group = 'standard', required = false, type = 'string') => {
        if (!key || seen.has(key)) {return;}
        seen.add(key);
        attributes.push({ key, label, group, required, type });
      };
      addAttr('username', 'Username', 'standard', true, 'string');
      if (sampleUser.email || sampleUser.emails) {addAttr('email', 'Email', 'standard', false, 'string');}
      if (sampleUser.name?.given || sampleUser.name?.givenName) {addAttr('givenName', 'First Name', 'name', false, 'string');}
      if (sampleUser.name?.family || sampleUser.name?.familyName) {addAttr('familyName', 'Last Name', 'name', false, 'string');}
      if (typeof sampleUser.enabled === 'boolean') {addAttr('enabled', 'Enabled', 'standard', false, 'boolean');}
      if (sampleUser.status) {addAttr('status', 'Status', 'standard', false, 'string');}
      if (Array.isArray(sampleUser.groups) || sampleUser._embedded?.groups) {addAttr('groups', 'Groups', 'relations', false, 'array');}
      if (Array.isArray(sampleUser.roles) || sampleUser._embedded?.roles) {addAttr('roles', 'Roles', 'relations', false, 'array');}
      if (sampleUser.createdAt || sampleUser.created) {addAttr('createdAt', 'Created At', 'metadata', false, 'string');}
      if (sampleUser.updatedAt || sampleUser.lastUpdated) {addAttr('updatedAt', 'Last Updated', 'metadata', false, 'string');}
      if (sampleUser.lastSignOn) {addAttr('lastSignOn', 'Last Sign-On', 'metadata', false, 'string');}
      const custom = sampleUser.customAttributes || sampleUser.custom_attributes || {};
      Object.keys(custom).forEach((k) => { const key = `custom.${k}`; addAttr(key, `Custom: ${k}`, 'custom', false, typeof custom[k]); });
      if (attributes.length === 0) {
        addAttr('username', 'Username', 'standard', true, 'string');
        addAttr('email', 'Email', 'standard', false, 'string');
        addAttr('givenName', 'First Name', 'name', false, 'string');
        addAttr('familyName', 'Last Name', 'name', false, 'string');
      }
    }

    // Cache and return
    attributesCache = { data: attributes, cachedAt: now, ttlMs: attributesCache.ttlMs };
    res.success('Export attributes retrieved', { attributes, cache: false });
  } catch (error) {
    res.error('Failed to discover export attributes', { code: 'EXPORT_ATTR_DISCOVERY_ERROR', details: error.message }, 500);
  }
});

/**
 * GET /api/export/status
 * Get current export operation status
 */
router.get('/status', (req, res) => {
  try {
    const response = {
      status: exportStatus.status,
      isRunning: exportStatus.isRunning,
      progress: {
        current: exportStatus.processed,
        total: exportStatus.total,
        percentage: exportStatus.total > 0 ? Math.round((exportStatus.processed / exportStatus.total) * 100) : 0
      },
      statistics: {
        processed: exportStatus.processed,
        errors: exportStatus.errors,
        warnings: exportStatus.warnings,
        ignoredUsers: exportStatus.ignoredUsers
      },
      timing: {
        startTime: exportStatus.startTime,
        endTime: exportStatus.endTime,
        duration: exportStatus.startTime && exportStatus.endTime
          ? exportStatus.endTime - exportStatus.startTime
          : exportStatus.startTime
            ? Date.now() - exportStatus.startTime
            : null
      },
      currentPopulation: exportStatus.currentPopulation,
      sessionId: exportStatus.sessionId,
      outputFile: exportStatus.outputFile,
      downloadUrl: exportStatus.downloadUrl
    };

    res.success('Export status retrieved successfully', response);
  } catch (error) {
    res.error('Failed to get export status', { code: 'EXPORT_STATUS_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export/start
 * Start a new export operation
 */
router.post('/start', express.json(), (req, res) => {
  try {
    if (exportStatus.isRunning) {
      return res.error('Export operation already running', { code: 'EXPORT_ALREADY_RUNNING', details: exportStatus.sessionId }, 409);
    }

    const { sessionId, totalRecords, populationId, populationName, outputFileName } = req.body;

    exportStatus = {
      isRunning: true,
      progress: 0,
      total: totalRecords || 0,
      processed: 0,
      errors: 0,
      warnings: 0,
      ignoredUsers: 0,
      startTime: Date.now(),
      endTime: null,
      currentPopulation: populationName || populationId || null,
      sessionId: sessionId || `export_${Date.now()}`,
      status: 'running',
      outputFile: outputFileName || null,
      downloadUrl: null
    };

    // Begin background progress driver (until full backend worker is wired)
    if (exportStatus.total > 0) {
      startProgressTimer();
    }

    try {
      exportLogger.info(`${logTag('START EXPORT')} Export started`, {
        sessionId: exportStatus.sessionId,
        total: exportStatus.total,
        population: exportStatus.currentPopulation,
        separator: logSeparator('═', 80)
      });
    } catch (_) {}

    res.success('Export operation started', { sessionId: exportStatus.sessionId, status: exportStatus.status, total: exportStatus.total });
  } catch (error) {
    res.error('Failed to start export operation', { code: 'EXPORT_START_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export/progress
 * Update export progress
 */
router.post('/progress', express.json(), (req, res) => {
  try {
    const { processed, errors, warnings, currentPopulation, ignoredUsers } = req.body;

    if (!exportStatus.isRunning) {
      return res.error('No export operation running', { code: 'EXPORT_NOT_RUNNING', details: null }, 400);
    }

    if (typeof processed === 'number') {exportStatus.processed = processed;}
    if (typeof errors === 'number') {exportStatus.errors = errors;}
    if (typeof warnings === 'number') {exportStatus.warnings = warnings;}
    if (currentPopulation) {exportStatus.currentPopulation = currentPopulation;}
    if (typeof ignoredUsers === 'number') {exportStatus.ignoredUsers = ignoredUsers;}

    res.success('Progress updated', { status: exportStatus.status });
  } catch (error) {
    res.error('Failed to update export progress', { code: 'EXPORT_PROGRESS_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export/complete
 * Mark export operation as completed
 */
router.post('/complete', express.json(), (req, res) => {
  try {
    const { success: operationSuccess, finalStats, outputFile, downloadUrl } = req.body;

    exportStatus.isRunning = false;
    exportStatus.endTime = Date.now();
    exportStatus.status = operationSuccess ? 'completed' : 'failed';

    if (finalStats) {
      exportStatus.processed = finalStats.processed || exportStatus.processed;
      exportStatus.errors = finalStats.errors || exportStatus.errors;
      exportStatus.warnings = finalStats.warnings || exportStatus.warnings;
      exportStatus.ignoredUsers = finalStats.ignoredUsers || exportStatus.ignoredUsers;
    }

    if (outputFile) {exportStatus.outputFile = outputFile;}
    if (downloadUrl) {exportStatus.downloadUrl = downloadUrl;}

    stopProgressTimer();
    try {
      exportLogger.info(`${logTag('END EXPORT')} Export ${exportStatus.status}`, {
        sessionId: exportStatus.sessionId,
        processed: exportStatus.processed,
        errors: exportStatus.errors,
        warnings: exportStatus.warnings,
        ignoredUsers: exportStatus.ignoredUsers,
        durationMs: exportStatus.endTime - exportStatus.startTime,
        separator: logSeparator('═', 80)
      });
    } catch (_) {}
    res.success(`Export operation ${exportStatus.status}`, {
      status: exportStatus.status,
      finalStats: {
        processed: exportStatus.processed,
        errors: exportStatus.errors,
        warnings: exportStatus.warnings,
        ignoredUsers: exportStatus.ignoredUsers,
        duration: exportStatus.endTime - exportStatus.startTime
      },
      outputFile: exportStatus.outputFile,
      downloadUrl: exportStatus.downloadUrl
    });
  } catch (error) {
    res.error('Failed to complete export operation', { code: 'EXPORT_COMPLETE_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export/cancel
 * Cancel running export operation
 */
router.post('/cancel', (req, res) => {
  try {
    if (!exportStatus.isRunning) {
      return res.error('No export operation running', { code: 'EXPORT_NOT_RUNNING', details: null }, 400);
    }

    exportStatus.isRunning = false;
    exportStatus.endTime = Date.now();
    exportStatus.status = 'cancelled';
    stopProgressTimer();

    res.success('Export operation cancelled', { status: exportStatus.status });
  } catch (error) {
    res.error('Failed to cancel export operation', { code: 'EXPORT_CANCEL_ERROR', details: error.message }, 500);
  }
});

/**
 * DELETE /api/export/reset
 * Reset export status
 */
router.delete('/reset', (req, res) => {
  try {
    stopProgressTimer();
    exportStatus = {
      isRunning: false,
      progress: 0,
      total: 0,
      processed: 0,
      errors: 0,
      warnings: 0,
      ignoredUsers: 0,
      startTime: null,
      endTime: null,
      currentPopulation: null,
      sessionId: null,
      status: 'idle',
      outputFile: null,
      downloadUrl: null
    };

    res.success('Export status reset', { status: exportStatus.status });
  } catch (error) {
    res.error('Failed to reset export status', { code: 'EXPORT_RESET_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export/download
 * Download all user fields (flattened) as CSV for a given population using PingOne APIs.
 * - Discovers attribute keys (core schema preferred; SCIM fallback)
 * - Fetches all users in the specified population
 * - Flattens values; missing values become empty strings so CSV contains commas for blanks
 */
router.post('/download', express.json(), async (req, res) => {
  try {
    const { populationId, populationName } = req.body || {};
    if (!populationId) {
      return res.error('Population ID is required', { code: 'POPULATION_REQUIRED' }, 400);
    }

    // Prefer shared tokenManager configured on the app for production
    const tokenManager = req.app.get('tokenManager');
    let accessToken;
    let environmentId;
    let baseUrl;
    if (tokenManager) {
      accessToken = await tokenManager.getAccessToken();
      environmentId = await tokenManager.getEnvironmentId();
      baseUrl = tokenManager.getApiBaseUrl();
    } else {
      // Fallback to workerTokenManager with environment variables
      const region = process.env.PINGONE_REGION || 'NorthAmerica';
      environmentId = process.env.PINGONE_ENVIRONMENT_ID;
      if (!environmentId) {
        return res.error('Environment ID not configured', { code: 'ENV_NOT_CONFIGURED' }, 400);
      }
      accessToken = await workerTokenManager.getAccessToken({
        apiClientId: process.env.PINGONE_CLIENT_ID,
        apiSecret: process.env.PINGONE_CLIENT_SECRET,
        environmentId,
        region
      });
      baseUrl = PINGONE_API_BASE_URLS[region] || PINGONE_API_BASE_URLS.default;
    }
    if (!accessToken) { return res.error('Access token unavailable', { code: 'NO_TOKEN' }, 401); }
    if (!environmentId || !baseUrl) { return res.error('Missing environment configuration', { code: 'NO_ENV_OR_BASE' }, 400); }

    // Attribute discovery (reuse logic similar to GET /attributes)
    const fetchCoreUserSchema = async () => {
      const url = `${baseUrl}/v1/environments/${environmentId}/schemas/user`;
      const r = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' } });
      if (!r.ok) { return null; }
      try { const body = await r.json(); return (body && Array.isArray(body.attributes)) ? body : null; } catch { return null; }
    };
    const flattenCoreAttributes = (schema) => {
      const out = []; const seen = new Set();
      const add = (key) => { if (key && !seen.has(key)) { seen.add(key); out.push(key); } };
      const walk = (prefix, attr) => { const path = prefix ? `${prefix}.${attr.name}` : attr.name; add(path); if (Array.isArray(attr.subAttributes)) { for (const sub of attr.subAttributes) { walk(path, sub); } } };
      try { for (const a of schema.attributes) { walk('', a); } } catch {}
      return out;
    };
    const fetchScimUserSchema = async () => {
      const coreUserUrn = 'urn:ietf:params:scim:schemas:core:2.0:User';
      const tries = [
        `${baseUrl}/v1/environments/${environmentId}/scim/v2/Schemas/${encodeURIComponent(coreUserUrn)}`,
        `${baseUrl}/v1/environments/${environmentId}/scim/v2/Schemas`
      ];
      for (const url of tries) {
        const r = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/scim+json, application/json' } });
        if (!r.ok) { continue; }
        const body = await r.json();
        if (body && body.id === coreUserUrn && Array.isArray(body.attributes)) { return { list: [body] }; }
        if (Array.isArray(body.Resources)) { return { list: body.Resources }; }
      }
      return { list: [] };
    };
    const flattenScimAttributes = (schemas) => {
      const out = []; const seen = new Set();
      const add = (key) => { if (key && !seen.has(key)) { seen.add(key); out.push(key); } };
      const walk = (prefix, attr, owning) => { const path = prefix ? `${prefix}.${attr.name}` : attr.name; add(path); if (Array.isArray(attr.subAttributes)) { for (const sub of attr.subAttributes) { walk(path, sub, owning); } } };
      for (const s of schemas) { if (Array.isArray(s.attributes)) { for (const a of s.attributes) { walk('', a, s.id); } } }
      if (seen.has('userName') && !seen.has('username')) { add('username'); }
      return out;
    };

    let attributeKeys = [];
    try { const core = await fetchCoreUserSchema(); if (core) { attributeKeys = flattenCoreAttributes(core); } } catch {
      // Intentional ignore
    }
    if (!attributeKeys.length) { try { const sc = await fetchScimUserSchema(); if (sc.list && sc.list.length) { attributeKeys = flattenScimAttributes(sc.list); } } catch {
      // fall back below
    } }

    // Ensure some sensible defaults
    const defaults = ['id','username','email','name.givenName','name.familyName','enabled','groups'];
    for (const k of defaults) { if (!attributeKeys.includes(k)) { attributeKeys.push(k); } }

    // Fetch all users by population via v1 Users API (population filter)
    const users = [];
    let nextHref = `${baseUrl}/v1/environments/${environmentId}/users?population.id=${encodeURIComponent(populationId)}&limit=200`;
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' };
    for (let safety = 0; safety < 1000 && nextHref; safety++) {
      const r = await fetch(nextHref, { method: 'GET', headers });
      if (!r.ok) {
        const text = await r.text();
        return res.error('Failed fetching users', { status: r.status, details: text }, 502);
      }
      const data = await r.json();
      const pageUsers = data?._embedded?.users || data?.users || [];
      for (const u of pageUsers) { users.push(u); }
      const next = data?._links?.next?.href;
      nextHref = next ? (next.startsWith('http') ? next : `${baseUrl}${next}`) : null;
      if (!nextHref) { break; }
    }

    // Helper: safely get nested value with simple synonym support
    const getValue = (obj, path) => {
      try {
        if (!obj || !path) { return ''; }
        // synonyms for common fields
        if (path === 'username' || path === 'userName') { return obj.username ?? obj.userName ?? obj.email ?? ''; }
        if (path === 'email' || path === 'emails') {
          if (obj.email) { return obj.email; }
          if (Array.isArray(obj.emails) && obj.emails.length) { return obj.emails[0]?.value ?? ''; }
          return '';
        }
        if (path === 'enabled' || path === 'active') { return (obj.enabled ?? obj.active ?? '') + ''; }
        if (path === 'groups') {
          const groups = Array.isArray(obj.groups) ? obj.groups : (obj._embedded?.groups || []);
          if (Array.isArray(groups)) { return groups.map(g => g.name || g.id || '').filter(Boolean).join(';'); }
          return '';
        }
        // walk dotted path with a few aliases
        const parts = path.split('.');
        let cur = obj;
        for (let i = 0; i < parts.length; i++) {
          const key = parts[i];
          if (cur == null) { return ''; }
          if (typeof cur !== 'object') { return cur; }
          // name.givenName vs name.given
          if (cur[key] === undefined && key === 'givenName' && cur['given'] !== undefined) { cur = cur['given']; continue; }
          if (cur[key] === undefined && key === 'familyName' && cur['family'] !== undefined) { cur = cur['family']; continue; }
          cur = cur[key];
        }
        if (Array.isArray(cur)) {
          // stringify arrays of primitives or objects by common fields
          const mapVal = (v) => (v && typeof v === 'object') ? (v.value ?? v.name ?? v.displayName ?? v.id ?? '') : v;
          return cur.map(mapVal).filter(v => v !== undefined && v !== null).join(';');
        }
        if (cur && typeof cur === 'object') { return ''; }
        return (cur === null || cur === undefined) ? '' : cur;
      } catch { return ''; }
    };

    // Build CSV
    const csvHeaders = attributeKeys;
    const escapeCsv = (value) => {
      const str = (value === null || value === undefined) ? '' : String(value);
      return (str.includes(',') || str.includes('\n') || str.includes('"')) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };
    const rows = [csvHeaders.join(',')];
    for (const user of users) {
      const row = csvHeaders.map(k => escapeCsv(getValue(user, k)));
      rows.push(row.join(','));
    }
    const csv = rows.join('\n');

    const fileName = `pingone-users-${(populationName || 'population')}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csv);
  } catch (error) {
    res.error('Failed to export users (SCIM/all fields)', { code: 'EXPORT_DOWNLOAD_ERROR', details: error.message }, 500);
  }
});

/**
 * POST /api/export
 * Main export endpoint - performs the actual export operation
 */
router.post('/', express.json(), async (req, res) => {
  try {
    const { populationId, populationName, format = 'csv' } = req.body;

    // Validate required parameters
    if (!populationId) {
      return res.status(400).json({
        success: false,
        error: 'Population ID is required'
      });
    }

    // Start export operation
    const sessionId = `export_${Date.now()}`;
    exportStatus = {
      isRunning: true,
      progress: 0,
      total: 0,
      processed: 0,
      errors: 0,
      warnings: 0,
      ignoredUsers: 0,
      startTime: Date.now(),
      endTime: null,
      currentPopulation: populationName || populationId,
      sessionId,
      status: 'running',
      outputFile: null,
      downloadUrl: null
    };

    // Get access token and environment info for real PingOne API integration
    let accessToken;
    let environmentId;
    let baseUrl;

    const tokenManager = req.app.get('tokenManager');
    if (tokenManager) {
      accessToken = await tokenManager.getAccessToken();
      environmentId = await tokenManager.getEnvironmentId();
      baseUrl = tokenManager.getApiBaseUrl();
    } else {
      // Fallback to workerTokenManager with environment variables
      const region = process.env.PINGONE_REGION || 'NorthAmerica';
      environmentId = process.env.PINGONE_ENVIRONMENT_ID;
      if (!environmentId) {
        exportStatus.status = 'failed';
        exportStatus.endTime = Date.now();
        return res.status(400).json({
          success: false,
          error: 'Environment ID not configured'
        });
      }
      accessToken = await workerTokenManager.getAccessToken({
        apiClientId: process.env.PINGONE_CLIENT_ID,
        apiSecret: process.env.PINGONE_CLIENT_SECRET,
        environmentId,
        region
      });
      baseUrl = PINGONE_API_BASE_URLS[region] || PINGONE_API_BASE_URLS.default;
    }

    if (!accessToken) {
      exportStatus.status = 'failed';
      exportStatus.endTime = Date.now();
      return res.status(401).json({
        success: false,
        error: 'Access token unavailable'
      });
    }
    if (!environmentId || !baseUrl) {
      exportStatus.status = 'failed';
      exportStatus.endTime = Date.now();
      return res.status(400).json({
        success: false,
        error: 'Missing environment configuration'
      });
    }

    // Discover available user attributes from PingOne
    let attributeKeys = [];

    // Try core schema first
    try {
      const coreUrl = `${baseUrl}/v1/environments/${environmentId}/schemas/user`;
      const coreResp = await fetch(coreUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (coreResp.ok) {
        const coreSchema = await coreResp.json();
        if (coreSchema && Array.isArray(coreSchema.attributes)) {
          const flattenCoreAttributes = (schema) => {
            const out = [];
            const seen = new Set();
            const add = (key) => { if (key && !seen.has(key)) { seen.add(key); out.push(key); } };
            const walk = (prefix, attr) => {
              const path = prefix ? `${prefix}.${attr.name}` : attr.name;
              add(path);
              if (Array.isArray(attr.subAttributes)) {
                for (const sub of attr.subAttributes) { walk(path, sub); }
              }
            };
            try {
              for (const a of schema.attributes) { walk('', a); }
            } catch {}
            return out;
          };
          attributeKeys = flattenCoreAttributes(coreSchema);
        }
      }
    } catch (ignoredError) {
      // Intentional ignore
    }

    // Fallback to SCIM schema if core schema failed
    if (!attributeKeys.length) {
      try {
        const scimUrl = `${baseUrl}/v1/environments/${environmentId}/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User`;
        const scimResp = await fetch(scimUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/scim+json, application/json' }
        });
        if (scimResp.ok) {
          const scimSchema = await scimResp.json();
          if (scimSchema && Array.isArray(scimSchema.attributes)) {
            const flattenScimAttributes = (schemas) => {
              const out = [];
              const seen = new Set();
              const add = (key) => { if (key && !seen.has(key)) { seen.add(key); } };
              const walk = (prefix, attr) => {
                const path = prefix ? `${prefix}.${attr.name}` : attr.name;
                add(path);
                if (Array.isArray(attr.subAttributes)) {
                  for (const sub of attr.subAttributes) { walk(path, sub); }
                }
              };
              for (const a of scimSchema.attributes) { walk('', a); }
              return out;
            };
            attributeKeys = flattenScimAttributes([scimSchema]);
          }
        }
      } catch (ignoredError) {
        // fall back below
      }
    }

    // Ensure some sensible defaults
    const defaults = ['id', 'username', 'email', 'name.givenName', 'name.familyName', 'enabled', 'groups'];
    for (const k of defaults) {
      if (!attributeKeys.includes(k)) {
        attributeKeys.push(k);
      }
    }

    // Fetch all users from the specified population via PingOne API
    const users = [];
    let nextHref = `${baseUrl}/v1/environments/${environmentId}/users?population.id=${encodeURIComponent(populationId)}&limit=200`;
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' };

    exportStatus.total = 0; // Will be updated when we get the first page

    let samples = [];

    for (let safety = 0; safety < 1000 && nextHref; safety++) {
      const userResp = await fetch(nextHref, { method: 'GET', headers });
      if (!userResp.ok) {
        const text = await userResp.text();
        exportStatus.status = 'failed';
        exportStatus.endTime = Date.now();
        return res.status(userResp.status).json({
          success: false,
          error: 'Failed fetching users',
          details: text
        });
      }

      const data = await userResp.json();
      const pageUsers = data?._embedded?.users || data?.users || [];

      // Update total count from first page
      if (safety === 0) {
        const total = data?.count || pageUsers.length;
        exportStatus.total = total;
      }

      for (const u of pageUsers) {
        users.push(u);
        exportStatus.processed = users.length;

        // Update progress percentage
        if (exportStatus.total > 0) {
          exportStatus.progress = Math.round((users.length / exportStatus.total) * 100);
        }

        if (users.length % 50 === 0) {
          samples.push({
            id: u.id,
            username: u.username,
            email: u.email
          });
        }
      }

      const next = data?._links?.next?.href;
      nextHref = next ? (next.startsWith('http') ? next : `${baseUrl}${next}`) : null;
      if (!nextHref) { break; }
    }

    if (samples.length === 0 && users.length > 0) {
      const first = users[0];
      samples.push({
        id: first.id,
        username: first.username,
        email: first.email
      });
    }

    exportStatus.samples = samples;

    // Helper: safely get nested value with simple synonym support
    const getValue = (obj, path) => {
      try {
        if (!obj || !path) { return ''; }
        // synonyms for common fields
        if (path === 'username' || path === 'userName') { return obj.username ?? obj.userName ?? obj.email ?? ''; }
        if (path === 'email' || path === 'emails') {
          if (obj.email) { return obj.email; }
          if (Array.isArray(obj.emails) && obj.emails.length) { return obj.emails[0]?.value ?? ''; }
          return '';
        }
        if (path === 'enabled' || path === 'active') { return (obj.enabled ?? obj.active ?? '') + ''; }
        if (path === 'groups') {
          const groups = Array.isArray(obj.groups) ? obj.groups : (obj._embedded?.groups || []);
          if (Array.isArray(groups)) { return groups.map(g => g.name || g.id || '').filter(Boolean).join(';'); }
          return '';
        }
        // walk dotted path with a few aliases
        const parts = path.split('.');
        let cur = obj;
        for (let i = 0; i < parts.length; i++) {
          const key = parts[i];
          if (cur == null) { return ''; }
          if (typeof cur !== 'object') { return cur; }
          // name.givenName vs name.given
          if (cur[key] === undefined && key === 'givenName' && cur['given'] !== undefined) { cur = cur['given']; continue; }
          if (cur[key] === undefined && key === 'familyName' && cur['family'] !== undefined) { cur = cur['family']; continue; }
          cur = cur[key];
        }
        if (Array.isArray(cur)) {
          // stringify arrays of primitives or objects by common fields
          const mapVal = (v) => (v && typeof v === 'object') ? (v.value ?? v.name ?? v.displayName ?? v.id ?? '') : v;
          return cur.map(mapVal).filter(v => v !== undefined && v !== null).join(';');
        }
        if (cur && typeof cur === 'object') { return ''; }
        return (cur === null || cur === undefined) ? '' : cur;
      } catch { return ''; }
    };

    // Convert to requested format with real PingOne data
    let exportData;
    let filename;

    if (format === 'csv') {
      // Build CSV with all discovered attributes
      const csvHeaders = attributeKeys;
      const escapeCsv = (value) => {
        const str = (value === null || value === undefined) ? '' : String(value);
        return (str.includes(',') || str.includes('\n') || str.includes('"')) ?
          '"' + str.replace(/"/g, '""') + '"' : str;
      };

      const csvRows = [csvHeaders.join(',')];
      for (const user of users) {
        const row = csvHeaders.map(k => escapeCsv(getValue(user, k)));
        csvRows.push(row.join(','));
      }
      exportData = csvRows.join('\n');
      filename = `pingone-users-${(populationName || 'population')}-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // JSON format
      const jsonUsers = users.map(user => {
        const jsonUser = {};
        for (const key of attributeKeys) {
          jsonUser[key] = getValue(user, key);
        }
        return jsonUser;
      });
      exportData = JSON.stringify(jsonUsers, null, 2);
      filename = `pingone-users-${(populationName || 'population')}-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Complete export operation with real data
    exportStatus.isRunning = false;
    exportStatus.endTime = Date.now();
    exportStatus.status = 'completed';
    exportStatus.processed = users.length;
    exportStatus.total = users.length;
    exportStatus.ignoredUsers = 0;
    exportStatus.outputFile = filename;

    res.json({
      success: true,
      message: 'Export completed successfully with real PingOne data',
      data: exportData,
      filename: filename,
      format: format,
      recordCount: users.length,
      ignoredUsers: exportStatus.ignoredUsers,
      sessionId: sessionId,
      attributes: attributeKeys
    });

  } catch (error) {
    // Mark export as failed
    exportStatus.isRunning = false;
    exportStatus.endTime = Date.now();
    exportStatus.status = 'failed';

    res.status(500).json({
      success: false,
      error: 'Export operation failed',
      details: error.message
    });
  }
});

export default router;
